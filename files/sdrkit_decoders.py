# -*- coding: utf-8 -*-
"""
SDR-Kit · Decodificadores
  - SensorsManager: rtl_433 (estaciones meteorológicas, sensores de llantas TPMS, timbres, controles…)
  - AdsbManager:    dump1090-fa (aviones: posición, altura, velocidad) con radar sin internet
  - AisManager:     AIS-catcher / rtl_ais (barcos AIS) con decodificador NMEA propio y mapa sin internet
  - DataDecoder:    multimon-ng sobre el audio del radio (POCSAG/FLEX, APRS, EAS, Morse, selcall…)
  - status():       qué decodificadores están instalados (propios y de OpenWebRX+)
"""

import collections
import json
import math
import os
import queue
import re
import select
import shutil
import subprocess
import threading
import time

import numpy as np

MULTIMON_KINDS = {
    "pocsag": ("Buscapersonas POCSAG", ["POCSAG512", "POCSAG1200", "POCSAG2400"]),
    "flex": ("Buscapersonas FLEX", ["FLEX"]),
    "aprs": ("APRS / packet 1200", ["AFSK1200"]),
    "eas": ("Alertas EAS (EE. UU.)", ["EAS"]),
    "selcall": ("Selcall ZVEI / CCIR / EEA", ["ZVEI1", "ZVEI2", "ZVEI3", "CCIR", "EEA", "EIA"]),
    "cw": ("Morse (CW)", ["MORSE_CW"]),
    "fms": ("FMS / FSK de servicios", ["FMSFSK"]),
}


def which(*names):
    for n in names:
        p = shutil.which(n)
        if p:
            return p
    return None


class Resampler:
    """Remuestreo lineal continuo (24000 → 22050 Hz para multimon-ng)."""

    def __init__(self, fin, fout):
        self.step = fin / float(fout)
        self.pos = 0.0
        self.last = np.zeros(1, dtype=np.float32)

    def __call__(self, x):
        buf = np.concatenate((self.last, x))
        n = int((len(buf) - 1 - self.pos) / self.step) + 1
        if n <= 0:
            self.last = buf[-1:]
            self.pos -= len(x)
            return np.zeros(0, dtype=np.float32)
        t = self.pos + self.step * np.arange(n)
        y = np.interp(t, np.arange(len(buf)), buf).astype(np.float32)
        self.pos = t[-1] + self.step - (len(buf) - 1)
        self.last = buf[-1:]
        return y


class DataDecoder:
    """multimon-ng en segundo plano, alimentado con audio del radio."""

    def __init__(self, kinds, on_line, rate=24000):
        self.kinds = [k for k in kinds if k in MULTIMON_KINDS]
        self.on_line = on_line
        self.error = None
        self.proc = None
        self.q = queue.Queue(maxsize=80)
        self.rs = Resampler(rate, 22050)
        exe = which("multimon-ng")
        if not exe:
            self.error = "multimon-ng no está instalado (sudo apt install multimon-ng)."
            return
        cmd = [exe, "-t", "raw", "-c"]
        for k in self.kinds:
            for d in MULTIMON_KINDS[k][1]:
                cmd += ["-a", d]
        cmd.append("-")  # leer de la entrada estándar
        try:
            self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                         stderr=subprocess.DEVNULL, bufsize=0)
        except OSError as e:
            self.error = "No se pudo iniciar multimon-ng: %s" % e
            return
        threading.Thread(target=self._writer, daemon=True).start()
        threading.Thread(target=self._reader, daemon=True).start()

    def feed(self, audio):
        if not self.proc:
            return
        y = self.rs(np.asarray(audio, dtype=np.float32))
        pcm = (np.clip(y, -1, 1) * 30000).astype("<i2").tobytes()
        try:
            self.q.put_nowait(pcm)
        except queue.Full:
            pass  # si multimon-ng se atrasa, se descarta audio en vez de trabar el radio

    def _writer(self):
        p = self.proc
        while p and p.poll() is None:
            try:
                data = self.q.get(timeout=1)
            except queue.Empty:
                continue
            if data is None:
                break
            try:
                p.stdin.write(data)
            except (BrokenPipeError, OSError, ValueError):
                break

    def _reader(self):
        p = self.proc
        pending = None  # AFSK1200 imprime la cabecera y el contenido en dos líneas
        try:
            for raw in p.stdout:
                line = raw.decode("utf-8", "replace").rstrip()
                if not line or line.startswith("multimon-ng") or line.startswith("Enabled demod"):
                    continue
                if line.startswith("AFSK1200: fm "):
                    if pending:
                        self.on_line(pending)
                    pending = line
                    continue
                if pending:
                    line, pending = pending + "\n" + line, None
                self.on_line(line)
        except (OSError, ValueError):
            pass

    def close(self):
        p, self.proc = self.proc, None
        if not p:
            return
        try:
            self.q.put_nowait(None)
        except queue.Full:
            pass
        try:
            p.terminate()
            p.wait(timeout=2)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass


def parse_multimon(line):
    """Separa el tipo y el contenido de una línea de multimon-ng."""
    if line.startswith("FLEX"):
        if line.startswith("FLEX|"):  # FLEX|fecha|baud/nivel/fase|ciclo.trama|capcode|tipo|mensaje
            f = line.split("|", 6)
            cap, msg = (f[4] if len(f) > 4 else "?"), (f[6] if len(f) > 6 else f[-1])
        else:  # FLEX: fecha hora baud/... ciclo.trama [capcode] ALN mensaje
            m = re.search(r"\[(\d+)\]\s+\S+\s?(.*)$", line)
            cap, msg = (m.group(1), m.group(2)) if m else ("?", line[5:].strip())
        return {"kind": "FLEX", "address": cap.strip(), "msg": msg.strip(),
                "text": "Capcode %s · %s" % (cap.strip(), msg.strip() or "(solo tono)")}
    kind, _, rest = line.partition(":")
    kind = kind.strip()
    item = {"kind": kind, "text": (rest.strip() or line).replace("\n", " ")}
    if kind.startswith("POCSAG"):
        parts = rest.split()
        try:
            item["address"] = parts[parts.index("Address:") + 1]
        except (ValueError, IndexError):
            pass
        for key in ("Alpha:", "Numeric:", "Skyper:"):
            if key in rest:
                msg = rest.split(key, 1)[1].strip()
                for junk in ("<EOT>", "<NUL>", "<ETX>"):
                    msg = msg.replace(junk, "")
                item["msg"] = msg.strip()
                item["text"] = "RIC %s · %s" % (item.get("address", "?"), item["msg"] or "(solo tono)")
    elif kind == "AFSK1200":
        head, _, payload = rest.partition("\n")
        w = head.split()
        try:
            src = re.sub(r"-0$", "", w[w.index("fm") + 1])
            dst = re.sub(r"-0$", "", w[w.index("to") + 1])
            via = w[w.index("via") + 1] if "via" in w else ""
            payload = payload.strip()
            item.update({"kind": "APRS", "from": src, "address": src, "msg": payload,
                         "text": "%s>%s%s: %s" % (src, dst, ("," + via) if via else "", payload)})
            pos = aprs_position(payload)
            if pos:
                item.update(lat=pos[0], lon=pos[1])
        except (ValueError, IndexError):
            pass
    return item


_APRS_POS = re.compile(r"(\d{2})(\d{2}\.\d+)([NS]).(\d{3})(\d{2}\.\d+)([EW])")


def aprs_position(payload):
    """Posición APRS sin comprimir (!, =, / o @) → (lat, lon) en grados, o None."""
    if not payload or payload[0] not in "!=/@":
        return None
    m = _APRS_POS.search(payload[:40])
    if not m:
        return None
    lat = int(m.group(1)) + float(m.group(2)) / 60.0
    lon = int(m.group(4)) + float(m.group(5)) / 60.0
    if m.group(3) == "S":
        lat = -lat
    if m.group(6) == "W":
        lon = -lon
    if abs(lat) > 90 or abs(lon) > 180:
        return None
    return round(lat, 5), round(lon, 5)


# ----------------------------------------------------------------------------
# Procesos externos que usan el dongle (rtl_433, dump1090)
# ----------------------------------------------------------------------------

class _ProcEngine:
    """Base: un programa externo que necesita el dongle sólo mientras su modo está activo."""

    name = "decodificador"

    def __init__(self, conf, state, folder, demo):
        self.conf = conf
        self.state = state
        self.folder = folder
        self.demo = demo
        self.cv = threading.Condition()
        self.enabled = False
        self.version = 0
        self.proc = None
        self.closed = threading.Event()
        self.closed.set()
        self.info = {"running": False, "error": None, "started": None}
        threading.Thread(target=self._worker, name=self.name, daemon=True).start()

    def enable(self):
        with self.cv:
            self.enabled = True
            self.cv.notify_all()

    def disable(self, wait=8.0):
        with self.cv:
            self.enabled = False
            self.cv.notify_all()
        self._kill()
        return self.closed.wait(wait)

    def restart(self):
        with self.cv:
            self.version += 1
            self.cv.notify_all()
        self._kill()

    def _kill(self):
        p, self.proc = self.proc, None
        if p is None:
            return
        try:
            p.terminate()
            p.wait(timeout=4)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass

    def _worker(self):
        while True:
            with self.cv:
                while not self.enabled:
                    self._kill()
                    self.info["running"] = False
                    self.closed.set()
                    self.cv.wait(1.0)
                self.closed.clear()
                ver = self.version
            try:
                self.info.update(running=True, error=None, started=time.time())
                if self.demo:
                    self._demo_loop(ver)
                else:
                    self._run(ver)
            except Exception as e:
                self.info["error"] = str(e)
            self._kill()
            self.info["running"] = False
            with self.cv:
                if self.enabled and self.version == ver:
                    self.cv.wait(4.0)  # el proceso terminó solo: reintento en unos segundos

    def _alive(self, ver):
        return self.enabled and self.version == ver


class SensorsManager(_ProcEngine):
    name = "sensores"
    PRESETS = {
        "433": ["433.92M"], "315": ["315M"], "868": ["868.3M"], "915": ["915M"], "345": ["345M"],
        "433+868": ["433.92M", "868.3M"], "433+315": ["433.92M", "315M"], "433+915": ["433.92M", "915M"],
    }

    def __init__(self, conf, state, folder, demo=False):
        self.devices = {}
        self.events = collections.deque(maxlen=300)
        self.lock = threading.Lock()
        self.logpath = os.path.join(folder, "sensores.jsonl")
        p = {"preset": "433+315" if not str(conf.get("REGION", "")).lower().startswith("eu") else "433+868",
             "hop": 30, "gain": "auto"}
        p.update(state.get("sensors") or {})
        self.params = self._validate(p)
        super().__init__(conf, state, folder, demo)

    def _validate(self, p):
        preset = p.get("preset") if p.get("preset") in self.PRESETS else "433"
        hop = int(min(max(int(float(p.get("hop") or 30)), 10), 600))
        g = p.get("gain", "auto")
        gain = "auto" if str(g).lower() == "auto" else min(max(float(g), 0.0), 50.0)
        return {"preset": preset, "hop": hop, "gain": gain}

    def set_params(self, p):
        self.params = self._validate(dict(self.params, **{k: v for k, v in p.items() if k in ("preset", "hop", "gain")}))
        self.state.update(sensors=self.params)
        self.restart()
        return self.params

    def clear(self):
        with self.lock:
            self.devices.clear()
            self.events.clear()

    def snapshot(self):
        with self.lock:
            devs = sorted(self.devices.values(), key=lambda d: -d["last"])
            return {"params": self.params, "devices": devs, "events": list(self.events)[-120:][::-1],
                    "info": self.info, "presets": list(self.PRESETS)}

    def _ingest(self, d):
        now = time.time()
        model = str(d.get("model", "?"))
        key = "%s|%s|%s" % (model, d.get("id", ""), d.get("channel", ""))
        skip = {"time", "model", "id", "channel", "mic", "mod", "freq", "freq1", "freq2", "rssi", "snr", "noise", "protocol"}
        fields = {k: v for k, v in d.items() if k not in skip}
        with self.lock:
            dev = self.devices.get(key) or {"key": key, "model": model, "id": d.get("id"), "channel": d.get("channel"),
                                             "first": now, "count": 0}
            dev.update(last=now, fields=fields, rssi=d.get("rssi"), snr=d.get("snr"), freq=d.get("freq"),
                       protocol=d.get("protocol"))
            dev["count"] += 1
            self.devices[key] = dev
            ev = {"t": now, "model": model, "id": d.get("id"), "fields": fields, "rssi": d.get("rssi")}
            self.events.append(ev)
        try:
            with open(self.logpath, "a", encoding="utf-8") as f:
                f.write(json.dumps(ev, ensure_ascii=False) + "\n")
            if os.path.getsize(self.logpath) > 4 * 1024 * 1024:
                os.replace(self.logpath, self.logpath + ".1")
        except OSError:
            pass

    def _run(self, ver):
        exe = which("rtl_433")
        if not exe:
            raise RuntimeError("rtl_433 no está instalado (sudo apt install rtl-433).")
        freqs = self.PRESETS[self.params["preset"]]
        cmd = [exe, "-d", str(int(float(self.conf.get("RTL_DEVICE_INDEX", 0) or 0))), "-F", "json",
               "-M", "time:unix", "-M", "level", "-M", "protocol"]
        for f in freqs:
            cmd += ["-f", f]
        if len(freqs) > 1:
            cmd += ["-H", str(self.params["hop"])]
        if any(f.startswith(("868", "915")) for f in freqs):
            cmd += ["-s", "1024k"]
        if self.params["gain"] != "auto":
            cmd += ["-g", str(self.params["gain"])]
        self.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        err = collections.deque(maxlen=5)
        threading.Thread(target=lambda p=self.proc: [err.append(l.decode("utf-8", "replace").strip()) for l in p.stderr],
                         daemon=True).start()
        fd = self.proc.stdout.fileno()
        buf = b""
        while self._alive(ver) and self.proc and self.proc.poll() is None:
            r, _, _ = select.select([fd], [], [], 1.0)
            if not r:
                continue
            chunk = os.read(fd, 65536)
            if not chunk:
                break
            buf += chunk
            *lines, buf = buf.split(b"\n")
            for line in lines:
                try:
                    d = json.loads(line)
                except ValueError:
                    continue
                if isinstance(d, dict) and "model" in d:
                    self._ingest(d)
        if self._alive(ver):
            msg = " ".join(e for e in err if e)[-300:]
            raise RuntimeError("rtl_433 se detuvo. " + (msg or "¿El dongle está conectado?"))

    def _demo_loop(self, ver):
        rng = np.random.default_rng(3)
        fake = [
            {"model": "Acurite-Tower", "id": 1234, "channel": "A", "battery_ok": 1, "temperature_C": 24.0, "humidity": 61},
            {"model": "LaCrosse-TX141THBv2", "id": 77, "channel": 0, "battery_ok": 1, "temperature_C": 19.5, "humidity": 48},
            {"model": "Toyota", "type": "TPMS", "id": "a1b2c3d4", "pressure_kPa": 230.0, "temperature_C": 31.0},
            {"model": "Honeywell-ActivLink", "id": 51234, "event": "doorbell"},
            {"model": "Oregon-THGR122N", "id": 201, "channel": 1, "battery_ok": 0, "temperature_C": 8.3, "humidity": 80},
        ]
        while self._alive(ver):
            d = dict(fake[int(rng.integers(len(fake)))])
            for k in ("temperature_C", "humidity", "pressure_kPa"):
                if k in d:
                    d[k] = round(d[k] + float(rng.normal(0, 0.4)), 1)
            d.update(rssi=round(float(rng.uniform(-18, -2)), 1), snr=round(float(rng.uniform(8, 25)), 1),
                     freq=433.92, protocol=40)
            self._ingest(d)
            with self.cv:
                self.cv.wait(float(rng.uniform(1.5, 4.0)))


class AdsbManager(_ProcEngine):
    name = "aviones"

    def __init__(self, conf, state, folder, demo=False):
        self.lock = threading.Lock()
        self.data = {"now": 0, "aircraft": [], "messages": 0}
        self.seen_today = {}
        self.jsondir = "/run/sdrkit/adsb" if not demo else os.path.join(folder, "adsb")
        p = {"gain": 49.6}
        p.update(state.get("adsb") or {})
        self.params = p
        loc = state.get("location") or {}
        try:
            if conf.get("RECEIVER_LAT") and conf.get("RECEIVER_LON"):
                loc = {"lat": float(conf["RECEIVER_LAT"]), "lon": float(conf["RECEIVER_LON"]), "source": "config"}
        except ValueError:
            pass
        self.location = loc if loc.get("lat") is not None else None
        super().__init__(conf, state, folder, demo)

    def set_params(self, p):
        g = p.get("gain", self.params.get("gain"))
        self.params = {"gain": "auto" if str(g).lower() == "auto" else min(max(float(g), 0.0), 50.0)}
        self.state.update(adsb=self.params)
        self.restart()
        return self.params

    def set_location(self, lat, lon):
        lat, lon = float(lat), float(lon)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("Coordenadas inválidas.")
        self.location = {"lat": lat, "lon": lon, "source": "manual"}
        self.state.update(location=self.location)
        self.restart()
        return self.location

    def snapshot(self):
        with self.lock:
            d = dict(self.data)
        ac = d.get("aircraft", [])
        loc = self.location
        if not loc:
            pts = [(a["lat"], a["lon"]) for a in ac if a.get("lat") is not None]
            if pts:
                loc = {"lat": sum(p[0] for p in pts) / len(pts), "lon": sum(p[1] for p in pts) / len(pts),
                       "source": "estimada"}
        if loc:
            for a in ac:
                if a.get("lat") is not None:
                    a["dist_km"], a["bearing"] = _dist_bearing(loc["lat"], loc["lon"], a["lat"], a["lon"])
        today = time.strftime("%Y-%m-%d")
        return {"aircraft": ac, "messages": d.get("messages", 0), "now": d.get("now", 0), "location": loc,
                "info": self.info, "params": self.params,
                "today": len([1 for k, v in self.seen_today.items() if v == today])}

    def _store(self, d):
        keep = ("hex", "flight", "alt_baro", "alt_geom", "gs", "track", "lat", "lon", "seen", "seen_pos", "rssi",
                "squawk", "category", "baro_rate", "messages", "emergency")
        ac = []
        today = time.strftime("%Y-%m-%d")
        for a in d.get("aircraft", []):
            if a.get("seen", 99) > 60:
                continue
            ac.append({k: a[k] for k in keep if k in a})
            self.seen_today[a.get("hex")] = today
        ac.sort(key=lambda a: (a.get("lat") is None, a.get("seen", 99)))
        with self.lock:
            self.data = {"now": d.get("now", time.time()), "aircraft": ac, "messages": d.get("messages", 0)}

    def _run(self, ver):
        exe = which("dump1090-fa", "dump1090")
        if not exe:
            raise RuntimeError("dump1090 no está instalado (sudo apt install dump1090-fa-minimal).")
        os.makedirs(self.jsondir, exist_ok=True)
        cmd = [exe, "--device-type", "rtlsdr", "--device", str(int(float(self.conf.get("RTL_DEVICE_INDEX", 0) or 0))),
               "--write-json", self.jsondir, "--write-json-every", "1", "--quiet"]
        if self.params.get("gain") not in (None, "auto"):
            cmd += ["--gain", str(self.params["gain"])]
        if self.location:
            cmd += ["--lat", "%.5f" % self.location["lat"], "--lon", "%.5f" % self.location["lon"]]
        self.proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        path = os.path.join(self.jsondir, "aircraft.json")
        while self._alive(ver) and self.proc and self.proc.poll() is None:
            try:
                with open(path, encoding="utf-8") as f:
                    self._store(json.load(f))
            except (OSError, ValueError):
                pass
            with self.cv:
                self.cv.wait(1.0)
        if self._alive(ver):
            err = b""
            try:
                err = self.proc.stderr.read()[-300:] if self.proc else b""
            except Exception:
                pass
            raise RuntimeError("dump1090 se detuvo. " + (err.decode("utf-8", "replace").strip() or "¿El dongle está conectado?"))

    def _demo_loop(self, ver):
        lat0, lon0 = (self.location or {}).get("lat", 19.43), (self.location or {}).get("lon", -99.13)
        rng = np.random.default_rng(9)
        planes = []
        for i in range(9):
            planes.append({"hex": "%06x" % int(rng.integers(0x100000, 0xffffff)),
                           "flight": ["AMX%03d" % rng.integers(100, 999), "VOI%04d" % rng.integers(100, 9999),
                                      "UAL%04d" % rng.integers(100, 9999), "DAL%03d" % rng.integers(10, 999)][i % 4],
                           "lat": lat0 + float(rng.uniform(-1.2, 1.2)), "lon": lon0 + float(rng.uniform(-1.2, 1.2)),
                           "alt_baro": int(rng.integers(30, 390)) * 100, "gs": float(rng.uniform(140, 480)),
                           "track": float(rng.uniform(0, 360)), "squawk": "%04d" % rng.integers(1000, 7477),
                           "rssi": float(rng.uniform(-30, -5)), "category": "A3"})
        planes[0]["squawk"] = "7700"
        msgs = 0
        while self._alive(ver):
            for p in planes:
                d = p["gs"] * 0.514 / 111000.0
                p["lat"] += d * math.cos(math.radians(p["track"]))
                p["lon"] += d * math.sin(math.radians(p["track"])) / max(0.2, math.cos(math.radians(p["lat"])))
                p["seen"] = float(rng.uniform(0, 2))
            msgs += int(rng.integers(40, 120))
            self._store({"now": time.time(), "messages": msgs, "aircraft": [dict(p) for p in planes]})
            with self.cv:
                self.cv.wait(1.0)


def _dist_bearing(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    dist = 2 * r * math.asin(min(1.0, math.sqrt(a)))
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return round(dist, 1), round((math.degrees(math.atan2(y, x)) + 360) % 360)


# ----------------------------------------------------------------------------
# Barcos AIS (161.975 / 162.025 MHz): decodificador NMEA propio + AIS-catcher / rtl_ais
# ----------------------------------------------------------------------------

def nmea_checksum(body):
    c = 0
    for ch in body:
        c ^= ord(ch)
    return "%02X" % c


def _ais_bits(payload, pad=0):
    bits = []
    for ch in payload:
        v = ord(ch) - 48
        if v > 40:
            v -= 8
        if not 0 <= v < 64:
            raise ValueError("carácter AIS inválido")
        bits.extend((v >> i) & 1 for i in range(5, -1, -1))
    return bits[:len(bits) - pad] if pad else bits


def _u(bits, a, n):
    v = 0
    for b in bits[a:a + n]:
        v = (v << 1) | b
    return v if len(bits) >= a + n else None


def _s(bits, a, n):
    v = _u(bits, a, n)
    if v is None:
        return None
    return v - (1 << n) if v & (1 << (n - 1)) else v


def _text(bits, a, n):
    out = []
    for i in range(a, a + n, 6):
        if i + 6 > len(bits):
            break
        v = _u(bits, i, 6)
        out.append(chr(v + 64) if v < 32 else chr(v))
    return "".join(out).split("@")[0].strip()


def _lonlat(bits, lon_at, lon_n, lat_at, lat_n):
    lon, lat = _s(bits, lon_at, lon_n), _s(bits, lat_at, lat_n)
    if lon is None or lat is None or abs(lon) > 180 * 600000 or abs(lat) > 90 * 600000:
        return None, None  # 181° / 91° = «sin posición»
    return round(lat / 600000.0, 5), round(lon / 600000.0, 5)


def ais_kind(code):
    """Categoría para colorear el barco a partir del código «tipo de barco» de AIS."""
    c = int(code or 0)
    if c == 30:
        return "fishing"
    if c in (31, 32, 52):
        return "tug"
    if c in (35, 55):
        return "military"
    if c == 36:
        return "sailing"
    if c == 37:
        return "pleasure"
    if 60 <= c <= 69:
        return "passenger"
    if 70 <= c <= 79:
        return "cargo"
    if 80 <= c <= 89:
        return "tanker"
    if c in (50, 51, 53, 54, 58) or 40 <= c <= 49:
        return "service"
    return "other"


class AisParser:
    """Frases NMEA !AIVDM → barcos. Verifica el checksum y junta las frases de varios fragmentos."""

    def __init__(self, keep=2000):
        self.lock = threading.Lock()
        self.ships = {}
        self.frag = {}
        self.keep = keep
        self.count = 0

    def feed(self, line, now=None):
        """Procesa una línea; devuelve el MMSI actualizado o None si no era AIS válido."""
        line = line.strip()
        if not (line.startswith("!AIVDM") or line.startswith("!AIVDO")):
            return None
        body, _, chk = line[1:].partition("*")
        if chk[:2].upper() != nmea_checksum(body):
            return None
        f = body.split(",")
        try:
            total, num, seq, payload, pad = int(f[1]), int(f[2]), f[3], f[5], int(f[6] or 0)
        except (IndexError, ValueError):
            return None
        if total > 1:
            key = (seq, f[4])
            parts = self.frag.setdefault(key, {})
            parts[num] = (payload, pad)
            if len(parts) < total:
                if len(self.frag) > 20:
                    self.frag.pop(next(iter(self.frag)))
                return None
            del self.frag[key]
            payload, pad = "".join(parts[i][0] for i in sorted(parts)), parts[max(parts)][1]
        try:
            bits = _ais_bits(payload, pad)
        except ValueError:
            return None
        return self._message(bits, time.time() if now is None else now)

    def _message(self, b, now):
        t, mmsi = _u(b, 0, 6), _u(b, 8, 30)
        if t is None or not mmsi:
            return None
        upd = {}
        if t in (1, 2, 3) and len(b) >= 137:
            sog, cog, hd = _u(b, 50, 10), _u(b, 116, 12), _u(b, 128, 9)
            lat, lon = _lonlat(b, 61, 28, 89, 27)
            upd = {"cls": "A", "status": _u(b, 38, 4), "lat": lat, "lon": lon,
                   "sog": None if sog == 1023 else sog / 10.0, "cog": None if cog >= 3600 else cog / 10.0,
                   "heading": None if hd == 511 else hd}
        elif t in (18, 19) and len(b) >= 133:
            sog, cog, hd = _u(b, 46, 10), _u(b, 112, 12), _u(b, 124, 9)
            lat, lon = _lonlat(b, 57, 28, 85, 27)
            upd = {"cls": "B", "lat": lat, "lon": lon, "sog": None if sog == 1023 else sog / 10.0,
                   "cog": None if cog >= 3600 else cog / 10.0, "heading": None if hd == 511 else hd}
            if t == 19 and len(b) >= 271:
                upd.update(name=_text(b, 143, 120), shiptype=_u(b, 263, 8))
        elif t == 5 and len(b) >= 422:
            upd = {"cls": "A", "imo": _u(b, 40, 30) or None, "callsign": _text(b, 70, 42), "name": _text(b, 112, 120),
                   "shiptype": _u(b, 232, 8), "length": (_u(b, 240, 9) or 0) + (_u(b, 249, 9) or 0) or None,
                   "beam": (_u(b, 258, 6) or 0) + (_u(b, 264, 6) or 0) or None,
                   "draught": (_u(b, 294, 8) or 0) / 10.0 or None, "dest": _text(b, 302, 120)}
        elif t == 24 and len(b) >= 160:
            if _u(b, 38, 2) == 0:
                upd = {"cls": "B", "name": _text(b, 40, 120)}
            elif len(b) >= 162:
                upd = {"cls": "B", "shiptype": _u(b, 40, 8), "callsign": _text(b, 90, 42),
                       "length": (_u(b, 132, 9) or 0) + (_u(b, 141, 9) or 0) or None,
                       "beam": (_u(b, 150, 6) or 0) + (_u(b, 156, 6) or 0) or None}
        elif t == 21 and len(b) >= 219:
            lat, lon = _lonlat(b, 164, 28, 192, 27)
            upd = {"cls": "AtoN", "name": _text(b, 43, 120), "lat": lat, "lon": lon, "shiptype": 0}
        elif t == 4 and len(b) >= 134:
            lat, lon = _lonlat(b, 79, 28, 107, 27)
            upd = {"cls": "base", "lat": lat, "lon": lon}
        else:
            return None
        with self.lock:
            s = self.ships.get(mmsi)
            if s is None:
                if len(self.ships) >= self.keep:
                    self.ships.pop(min(self.ships, key=lambda k: self.ships[k]["last"]))
                s = self.ships[mmsi] = {"mmsi": mmsi, "count": 0, "first": now}
            for k, v in upd.items():
                if v is not None and v != "":
                    s[k] = v
            if "lat" in upd and upd["lat"] is None:
                s.pop("lat", None), s.pop("lon", None)
            s.update(last=now, count=s["count"] + 1)
            s["kind"] = ais_kind(s.get("shiptype"))
            self.count += 1
        return mmsi

    def snapshot(self, max_age=1800.0, now=None):
        now = time.time() if now is None else now
        with self.lock:
            out = [dict(s, seen=round(now - s["last"], 1)) for s in self.ships.values() if now - s["last"] <= max_age]
            for k in [k for k, s in self.ships.items() if now - s["last"] > 6 * max_age]:
                del self.ships[k]
        out.sort(key=lambda s: (s.get("lat") is None, s["seen"]))
        return out


def ais_emergency(s):
    """Señal de socorro: estado «AIS-SART activo» o MMSI de baliza (970 SART, 972 hombre al agua, 974 EPIRB)."""
    return s.get("status") == 14 or str(s.get("mmsi", "")).startswith(("970", "972", "974"))


# --- Codificador (lo usa el modo demo y las pruebas para generar frases reales, bit a bit)

def _pack(fields):
    bits = []
    for v, n in fields:
        v = int(v) & ((1 << n) - 1)
        bits.extend((v >> i) & 1 for i in range(n - 1, -1, -1))
    return bits


def _ptext(s, n):
    s = (s.upper() + "@" * n)[:n]
    return [(ord(c) - 64) if 64 <= ord(c) < 96 else ord(c) for c in s]


def _armor(bits):
    pad = (-len(bits)) % 6
    bits = bits + [0] * pad
    out = ""
    for i in range(0, len(bits), 6):
        v = int("".join(map(str, bits[i:i + 6])), 2)
        out += chr(v + 48 if v < 40 else v + 56)
    return out, pad


def _sentences(bits, channel="A", seq="1"):
    payload, pad = _armor(bits)
    chunks = [payload[i:i + 60] for i in range(0, len(payload), 60)] or [""]
    out = []
    for i, c in enumerate(chunks, 1):
        body = "AIVDM,%d,%d,%s,%s,%s,%d" % (len(chunks), i, seq if len(chunks) > 1 else "", channel, c, pad if i == len(chunks) else 0)
        out.append("!%s*%s" % (body, nmea_checksum(body)))
    return out


def ais_encode_position(mmsi, lat, lon, sog=0.0, cog=0.0, heading=511, status=0, msg=1):
    f = [(msg, 6), (0, 2), (mmsi, 30), (status, 4), (128, 8), (round(sog * 10), 10), (0, 1),
         (round(lon * 600000), 28), (round(lat * 600000), 27), (round(cog * 10), 12), (heading, 9), (60, 6), (0, 3), (0, 1), (0, 19)]
    return _sentences(_pack(f))


def ais_encode_class_b(mmsi, lat, lon, sog=0.0, cog=0.0, heading=511):
    f = [(18, 6), (0, 2), (mmsi, 30), (0, 8), (round(sog * 10), 10), (0, 1), (round(lon * 600000), 28), (round(lat * 600000), 27),
         (round(cog * 10), 12), (heading, 9), (60, 6), (0, 14)]
    return _sentences(_pack(f))


def ais_encode_static(mmsi, name, shiptype, callsign="", dest="", length=0, beam=0, draught=0.0, imo=0):
    bow, port = int(length * 0.8), int(beam / 2)
    f = [(5, 6), (0, 2), (mmsi, 30), (0, 2), (imo, 30)]
    bits = _pack(f)
    for s, n in ((callsign, 7), (name, 20)):
        bits += _pack([(c, 6) for c in _ptext(s, n)])
    bits += _pack([(shiptype, 8), (bow, 9), (int(length) - bow, 9), (port, 6), (int(beam) - port, 6), (1, 4), (0, 20), (round(draught * 10), 8)])
    bits += _pack([(c, 6) for c in _ptext(dest, 20)])
    bits += _pack([(0, 1), (0, 1)])
    return _sentences(bits)


class AisManager(_ProcEngine):
    name = "barcos"

    def __init__(self, conf, state, folder, demo=False, location=None):
        self.parser = AisParser()
        self.get_location = location or (lambda: None)
        self.seen_today = {}
        p = {"gain": "auto"}
        p.update(state.get("ais") or {})
        self.params = p
        self.tail = collections.deque(maxlen=6)
        super().__init__(conf, state, folder, demo)

    def set_params(self, p):
        g = p.get("gain", self.params.get("gain"))
        self.params = {"gain": "auto" if str(g).lower() == "auto" else min(max(float(g), 0.0), 50.0)}
        self.state.update(ais=self.params)
        self.restart()
        return self.params

    def snapshot(self):
        ships = self.parser.snapshot()
        loc = self.get_location()
        if not loc:
            pts = [(s["lat"], s["lon"]) for s in ships if s.get("lat") is not None]
            if pts:
                loc = {"lat": sum(p[0] for p in pts) / len(pts), "lon": sum(p[1] for p in pts) / len(pts), "source": "estimada"}
        today = time.strftime("%Y-%m-%d")
        for s in ships:
            self.seen_today[s["mmsi"]] = today
            s["emerg"] = ais_emergency(s)
            if loc and s.get("lat") is not None:
                s["dist_km"], s["bearing"] = _dist_bearing(loc["lat"], loc["lon"], s["lat"], s["lon"])
        return {"ships": ships, "messages": self.parser.count, "now": time.time(), "location": loc, "info": self.info,
                "params": self.params, "today": len([1 for v in self.seen_today.values() if v == today])}

    def _run(self, ver):
        exe = which("AIS-catcher", "ais-catcher", "rtl_ais")
        if not exe:
            raise RuntimeError("Falta un decodificador AIS (sudo apt install rtl-ais, o instala AIS-catcher).")
        idx = str(int(float(self.conf.get("RTL_DEVICE_INDEX", 0) or 0)))
        gain = self.params.get("gain")
        if os.path.basename(exe).lower() == "rtl_ais":
            cmd = [exe, "-n", "-d", idx] + (["-g", str(gain)] if gain not in (None, "auto") else [])
        else:
            cmd = [exe, "-d", idx, "-o", "1"] + (["-gr", "TUNER", str(gain), "RTLAGC", "off"] if gain not in (None, "auto") else [])
        self.tail.clear()
        # rtl_ais escribe las frases por stderr y AIS-catcher por stdout: se leen las dos juntas
        self.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace", bufsize=1)
        for line in self.proc.stdout:
            if not self._alive(ver):
                break
            if self.parser.feed(line) is None and line.strip():
                self.tail.append(line.strip())
        if self._alive(ver):
            raise RuntimeError("El decodificador AIS se detuvo. " + (" ".join(list(self.tail)[-2:])[-300:] or "¿El dongle está conectado?"))

    def _demo_loop(self, ver):
        loc = self.get_location() or {}
        lat0, lon0 = loc.get("lat", 18.44), loc.get("lon", -69.90)
        rng = np.random.default_rng(21)
        kinds = [(70, "CARIBBEAN TRADER", 190, 28, "SANTO DOMINGO"), (80, "PETROMAR UNO", 228, 36, "HAINA"),
                 (60, "ISLA CATALINA", 120, 22, "LA ROMANA"), (30, "DON PEPE", 24, 7, ""), (36, "VIENTO SUR", 14, 4, "BOCA CHICA"),
                 (52, "REMOLCADOR 7", 32, 10, "HAINA"), (37, "SEA LION", 18, 5, ""), (70, "ATLANTIC STAR", 240, 32, "MIAMI")]
        ships = []
        for i, (st, name, length, beam, dest) in enumerate(kinds):
            ships.append({"mmsi": 366000000 + 1137 * (i + 1), "name": name, "st": st, "length": length, "beam": beam, "dest": dest,
                          "lat": lat0 - float(rng.uniform(0.02, 0.35)), "lon": lon0 + float(rng.uniform(-0.45, 0.45)),
                          "sog": 0.0 if st == 30 and i == 3 else float(rng.uniform(3, 17)), "cog": float(rng.uniform(0, 360)),
                          "cls": "B" if st in (30, 36, 37) else "A", "tick": 0})
        sos = {"mmsi": 970123456, "lat": lat0 - 0.18, "lon": lon0 + 0.1}
        tick = 0
        while self._alive(ver):
            for s in ships:
                d = s["sog"] * 0.514 * 2.0 / 111000.0
                s["lat"] += d * math.cos(math.radians(s["cog"]))
                s["lon"] += d * math.sin(math.radians(s["cog"])) / max(0.2, math.cos(math.radians(s["lat"])))
                s["cog"] = (s["cog"] + float(rng.normal(0, 1.5))) % 360
                lines = []
                if tick % 15 == 0:
                    lines += ais_encode_static(s["mmsi"], s["name"], s["st"], "HI%04d" % (s["mmsi"] % 10000), s["dest"], s["length"], s["beam"], 5.5)
                if s["cls"] == "A":
                    lines += ais_encode_position(s["mmsi"], s["lat"], s["lon"], s["sog"], s["cog"], int(s["cog"]), 0 if s["sog"] > 0.5 else 5)
                else:
                    lines += ais_encode_class_b(s["mmsi"], s["lat"], s["lon"], s["sog"], s["cog"], int(s["cog"]))
                for ln in lines:
                    self.parser.feed(ln)
            if tick == 6:  # una baliza de socorro de ejemplo (AIS-SART)
                for ln in ais_encode_position(sos["mmsi"], sos["lat"], sos["lon"], 0.0, 0.0, 511, 14):
                    self.parser.feed(ln)
            tick += 1
            with self.cv:
                self.cv.wait(2.0)


# ----------------------------------------------------------------------------
# Qué está instalado
# ----------------------------------------------------------------------------

CATALOG = [
    # (clave, nombre, dónde, binarios requeridos, nota)
    ("pocsag", "Buscapersonas POCSAG / FLEX", "panel", ["multimon-ng"], "Radio → Mensajes"),
    ("aprs", "APRS / packet 1200", "panel", ["multimon-ng"], "Radio → Mensajes · también en el receptor avanzado"),
    ("eas", "Alertas de emergencia EAS", "panel", ["multimon-ng"], "NOAA Weather Radio (EE. UU.)"),
    ("selcall", "Selcall ZVEI / CCIR / EEA", "panel", ["multimon-ng"], ""),
    ("cw", "Morse (CW)", "panel", ["multimon-ng"], "también CW Decoder/Skimmer en el receptor avanzado"),
    ("ctcss", "Subtono CTCSS / DCS y DTMF", "panel", [], "integrado en el Radio"),
    ("dsd", "Voz digital en el panel: DMR · P25 · D-Star · Fusion · NXDN · dPMR · M17", "panel", ["dsd-fme"],
     "Radio → modo «Digital» (opcional: INSTALL_DSD)"),
    ("digid", "Identificador automático de señales digitales", "panel", [], "Radio: avisa qué tipo de señal es"),
    ("sensors", "Sensores ISM (rtl_433): clima, llantas TPMS, timbres…", "panel", ["rtl_433"], "Decodificar → Sensores"),
    ("adsb", "Aviones ADS-B (radar sin internet)", "panel", ["dump1090-fa|dump1090"], "Decodificar → Aviones"),
    ("ais", "Barcos AIS (mapa sin internet)", "panel", ["AIS-catcher|ais-catcher|rtl_ais"], "Decodificar → Barcos"),
    ("dmr", "Voz digital DMR · D-Star · YSF · NXDN · P25", "owrx", ["codecserver"], "requiere códec AMBE (llave USB AMBE3000)"),
    ("m17", "Voz digital M17", "owrx", ["m17-demod"], "códec abierto"),
    ("freedv", "Voz digital FreeDV (HF)", "owrx", ["freedv_rx"], ""),
    ("tetra", "TETRA (sin cifrar)", "owrx", ["tetrarx"], ""),
    ("dab", "Radio digital DAB+ (Europa)", "owrx", ["dablin"], "exigente para la Zero 2 W"),
    ("hdradio", "HD Radio (EE. UU.)", "owrx", ["nrsc5"], ""),
    ("drm", "DRM (onda corta digital)", "owrx", ["dream"], ""),
    ("rds", "RDS de emisoras FM", "owrx", ["redsea"], ""),
    ("acars", "Aviación ACARS / VDL2 / HFDL", "owrx", ["acarsdec", "dumpvdl2", "dumphfdl"], ""),
    ("uat", "UAT 978 MHz (EE. UU.)", "owrx", ["dump978-fa"], ""),
    ("sonde", "Radiosondas meteorológicas", "owrx", ["rs41mod|dfm09mod|rs41ecc"], ""),
    ("lora", "LoRa APRS / Meshtastic / MeshCom", "owrx", ["lorarx"], ""),
    ("ft8", "FT8 · FT4 · WSPR · JT65 · Q65", "owrx", ["jt9"], "requiere WSJT-X (opcional, pesado)"),
    ("js8", "JS8Call", "owrx", ["js8"], "requiere JS8Call (opcional, pesado)"),
    ("hfdata", "RTTY · PSK31 · NAVTEX · DSC · SITOR · SSTV · FAX", "owrx", [], "integrados en OpenWebRX+"),
    ("wxsat", "Satélites Meteor-M (imágenes)", "owrx", ["satdump"], "requiere SatDump (no incluido)"),
]


def status():
    out = []
    for key, name, where, bins, note in CATALOG:
        ok = all(any(shutil.which(b) for b in alt.split("|")) for alt in bins) if bins else True
        out.append({"key": key, "name": name, "where": where, "available": ok, "note": note, "needs": bins})
    owrx = os.path.exists("/usr/bin/openwebrx")
    for o in out:
        if o["where"] == "owrx" and not owrx:
            o["available"] = False
    ambe = False
    try:
        with open("/etc/codecserver/codecserver.conf", encoding="utf-8") as f:
            ambe = any(l.strip().startswith("[device:") for l in f)
    except OSError:
        pass
    for o in out:
        if o["key"] == "dmr":
            o["available"] = o["available"] and ambe
    return {"items": out, "openwebrx": owrx, "ambe": ambe}


# ----------------------------------------------------------------------------
# Señales de prueba para el modo demo (codificadores reales, bit a bit)
# ----------------------------------------------------------------------------

POCSAG_SYNC = 0x7CD215D8
POCSAG_IDLE = 0x7A89C197


def _pocsag_cw(data21):
    """Palabra de 32 bits: 21 bits de datos + BCH(31,21) + paridad par."""
    v = data21 << 10
    for i in range(30, 9, -1):
        if v & (1 << i):
            v ^= 0x769 << (i - 10)
    cw = ((data21 << 10) | v) << 1
    return cw | (bin(cw).count("1") & 1)


def pocsag_bits(ric, text, func=3):
    """Mensaje alfanumérico POCSAG (preámbulo + lotes) como lista de bits, MSB primero."""
    chars = [ord(c) & 0x7F for c in text] + [0x04]  # EOT
    bits = []
    for c in chars:
        bits += [(c >> i) & 1 for i in range(7)]  # 7 bits, LSB primero
    while len(bits) % 20:
        bits.append(0)
    words = [(ric >> 3) << 2 | func]  # dirección: 18 bits altos del RIC + función
    words = [_pocsag_cw(words[0])]
    for i in range(0, len(bits), 20):
        chunk = 0
        for b in bits[i:i + 20]:
            chunk = (chunk << 1) | b
        words.append(_pocsag_cw((1 << 20) | chunk))
    slot = (ric & 7) * 2
    stream = [POCSAG_IDLE] * slot + words
    while len(stream) % 16:
        stream.append(POCSAG_IDLE)
    stream += [POCSAG_IDLE] * 16  # un lote de reposo al final
    out = [1, 0] * 288  # preámbulo de 576 bits
    for b in range(0, len(stream), 16):
        for w in [POCSAG_SYNC] + stream[b:b + 16]:
            out += [(w >> (31 - i)) & 1 for i in range(32)]
    return out


def _crc16_x25(data):
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ 0x8408 if crc & 1 else crc >> 1
    return crc ^ 0xFFFF


def _ax25_addr(call, last=False):
    name, _, ssid = call.partition("-")
    b = [ord(c) << 1 for c in name.upper().ljust(6)[:6]]
    b.append(0x60 | ((int(ssid or 0) & 15) << 1) | (1 if last else 0))
    return b


def aprs_afsk(src, dst, path, info, rate=48000):
    """Trama APRS (AX.25 + HDLC + NRZI) modulada en AFSK 1200 (Bell 202), como audio ±1."""
    calls = [dst, src] + list(path)
    frame = []
    for i, c in enumerate(calls):
        frame += _ax25_addr(c, i == len(calls) - 1)
    frame += [0x03, 0xF0] + list(info.encode("ascii", "replace"))
    fcs = _crc16_x25(frame)
    frame += [fcs & 0xFF, fcs >> 8]
    bits, ones = [], 0
    for byte in frame:
        for i in range(8):
            b = (byte >> i) & 1
            bits.append(b)
            ones = ones + 1 if b else 0
            if ones == 5:
                bits.append(0)
                ones = 0
    flag = [0, 1, 1, 1, 1, 1, 1, 0]
    raw = flag * 40 + bits + flag * 4
    tones, cur = [], 1200.0
    for b in raw:
        if b == 0:  # NRZI: un 0 cambia de tono
            cur = 2200.0 if cur == 1200.0 else 1200.0
        tones.append(cur)
    spb = rate / 1200.0
    n = int(len(tones) * spb)
    f = np.asarray(tones)[np.minimum((np.arange(n) / spb).astype(int), len(tones) - 1)]
    return np.sin(2 * np.pi * np.cumsum(f) / rate).astype(np.float32)


# ----------------------------------------------------------------------------
# Voz digital con DSD-FME (DMR, P25, D-Star, YSF, NXDN, dPMR, M17…)
# ----------------------------------------------------------------------------

# clave: (opción de dsd-fme, canales de audio que entrega, nombre)
DSD_MODES = {
    "auto": ("-fa", 2, "Automático: DMR, P25 fase 1, D-Star, YSF, X2-TDMA"),
    "dmr": ("-fs", 2, "DMR / MotoTRBO / Hytera (Tier I-II)"),
    "p25": ("-f1", 1, "P25 fase 1 (APCO-25)"),
    "dstar": ("-fd", 1, "D-Star (Icom)"),
    "ysf": ("-fy", 1, "Yaesu System Fusion (C4FM)"),
    "nxdn48": ("-fi", 1, "NXDN 6.25 kHz / IDAS / NXDN48"),
    "nxdn96": ("-fn", 1, "NXDN 12.5 kHz / NXDN96"),
    "dpmr": ("-fm", 1, "dPMR / dPMR446"),
    "m17": ("-fz", 1, "M17 (radioafición, códec abierto)"),
    "provoice": ("-fp", 1, "ProVoice / EDACS"),
}
_ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


class DigitalVoice:
    """dsd-fme en segundo plano: entra discriminador FM (48 kHz), sale voz (8 kHz) + datos de la llamada."""

    def __init__(self, kind, on_meta=None):
        self.kind = kind if kind in DSD_MODES else "auto"
        flag, self.channels, self.title = DSD_MODES[self.kind]
        self.on_meta = on_meta
        self.error = None
        self.proc = None
        self.q = queue.Queue(maxsize=60)
        self.out = collections.deque()
        self.out_len = 0
        self.lock = threading.Lock()
        self.rs = Resampler(8000, 24000)
        self.meta = {"sync": None, "tg": None, "src": None, "cc": None, "nac": None, "enc": False, "slot": None,
                     "alias": None, "t": None}
        self.lines = collections.deque(maxlen=14)
        exe = which("dsd-fme")
        if not exe:
            self.error = ("DSD-FME no está instalado. Actívalo con INSTALL_DSD=\"si\" en sdrkit.conf y vuelve a "
                          "ejecutar el instalador (lee el aviso de patentes en la guía).")
            return
        cmd = [exe, "-i", "-", "-o", "-", flag, "-g", "0"]
        try:
            self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                         bufsize=0)
        except OSError as e:
            self.error = "No se pudo iniciar dsd-fme: %s" % e
            return
        for fn in (self._writer, self._reader, self._log):
            threading.Thread(target=fn, daemon=True).start()

    def feed(self, hz48):
        """Desviación instantánea en Hz a 48 kHz → s16le, como la salida de discriminador de un escáner."""
        if not self.proc:
            return
        pcm = (np.clip(np.asarray(hz48, dtype=np.float32) / 4000.0, -1, 1) * 16000).astype("<i2").tobytes()
        try:
            self.q.put_nowait(pcm)
        except queue.Full:
            pass

    def pull(self, n):
        """n muestras de voz a 24 kHz (float −1…1); silencio si todavía no llegó nada."""
        out = np.zeros(n, dtype=np.float32)
        with self.lock:
            k = 0
            while k < n and self.out:
                a = self.out[0]
                take = min(len(a), n - k)
                out[k:k + take] = a[:take]
                if take == len(a):
                    self.out.popleft()
                else:
                    self.out[0] = a[take:]
                k += take
                self.out_len -= take
        return out

    def _writer(self):
        p = self.proc
        while p and p.poll() is None:
            try:
                data = self.q.get(timeout=1)
            except queue.Empty:
                continue
            if data is None:
                break
            try:
                p.stdin.write(data)
            except (BrokenPipeError, OSError, ValueError):
                break

    def _reader(self):
        p = self.proc
        frame = 2 * self.channels
        buf = b""
        try:
            while True:
                chunk = p.stdout.read(1600 * self.channels)
                if not chunk:
                    break
                buf += chunk
                n = len(buf) // frame * frame
                if not n:
                    continue
                s = np.frombuffer(buf[:n], dtype="<i2").astype(np.float32) / 32768.0
                buf = buf[n:]
                if self.channels == 2:  # dos ranuras TDMA (DMR): se mezclan
                    s = s.reshape(-1, 2).sum(axis=1) * 0.7
                y = self.rs(s)
                with self.lock:
                    self.out.append(y)
                    self.out_len += len(y)
                    while self.out_len > 24000 * 2 and self.out:  # no acumular más de 2 s de retraso
                        self.out_len -= len(self.out.popleft())
        except (OSError, ValueError):
            pass

    def _log(self):
        p = self.proc
        try:
            for raw in p.stderr:
                line = _ANSI.sub("", raw.decode("utf-8", "replace")).strip()
                if (not line or line.startswith(("Build", "MBElib", "CODEC2", "Audio", "Decoding", "Press", "DSD", "Notice",
                                                  "Use ", "Enabling")) or any(c in line for c in "█╚╔═║")):
                    continue
                self._parse(line)
        except (OSError, ValueError):
            pass

    def _parse(self, line):
        m = self.meta
        changed = False
        for key, rx in (("tg", r"\b(?:TGT|DST|TG)[=:]\s*([A-Za-z0-9/.@-]+)"), ("src", r"\bSRC[=:]\s*([A-Za-z0-9/.-]+)"),
                        ("cc", r"Color Code[=:]?\s*(\d+)"),
                        ("nac", r"NAC[=:]?\s*(0x[0-9A-Fa-f]+|[0-9A-Fa-f]{3})"), ("alias", r"Talker Alias[:=]\s*(.+)$")):
            g = re.search(rx, line)
            if g:
                m[key] = g.group(1).strip()
                changed = True
        g = re.search(r"Sync:\s*([+-]?\s*[A-Za-z0-9-]+)", line)
        if g:
            m["sync"] = g.group(1).replace(" ", "").lstrip("+-")
            changed = True
        g = re.search(r"\bslot\s*([12])", line, re.I)
        if g:
            m["slot"] = g.group(1)
        if re.search(r"\b(ENC|Encrypted|ALG ID|Enc Identifier)\b", line) and not re.search(r"\bClear\b", line):
            m["enc"] = True
            changed = True
        if changed:
            m["t"] = time.time()
        self.lines.append(line[:160])
        if self.on_meta and changed:
            self.on_meta(dict(m))

    def status(self):
        return {"kind": self.kind, "title": self.title, "error": self.error, "meta": dict(self.meta),
                "lines": list(self.lines)[-8:], "running": bool(self.proc and self.proc.poll() is None)}

    def close(self):
        p, self.proc = self.proc, None
        if not p:
            return
        try:
            self.q.put_nowait(None)
        except queue.Full:
            pass
        try:
            p.terminate()
            p.wait(timeout=2)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass


def classify_digital(hz, fs=48000):
    """Reconoce el tipo de señal digital a partir de ~0.6 s de discriminador FM (Hz).

    Busca la línea espectral de la velocidad de símbolos en |d/dt| y cuenta los niveles (2-FSK / 4-FSK).
    Devuelve dict(kind, rate, levels, guess, conf) o None si parece voz analógica / ruido.
    """
    x = np.asarray(hz, dtype=np.float64)
    if len(x) < fs // 3:
        return None
    x = x - np.median(x)
    # audio AFSK (APRS / packet 1200): tonos de 1200 y 2200 Hz en el audio demodulado
    n = 1 << int(math.log2(min(len(x), 32768)))
    w = np.hanning(n)
    X = np.abs(np.fft.rfft(x[:n] * w)) ** 2
    f = np.fft.rfftfreq(n, 1.0 / fs)

    def band(a, b):
        sel = (f >= a) & (f <= b)
        return float(X[sel].sum()) if sel.any() else 0.0
    tot = band(200, 6000) + 1e-12
    if band(900, 2500) / tot > 0.85 and band(1000, 1400) / tot > 0.15 and band(2000, 2400) / tot > 0.15:
        return {"kind": "afsk1200", "rate": 1200, "levels": 2, "guess": "AFSK 1200: APRS / packet", "conf": 0.8}
    # un tono fijo (portadora con tono, pitido de prueba) concentra la energía en una sola raya: es analógico
    sel = np.flatnonzero((f >= 200) & (f <= 6000))
    i = sel[int(np.argmax(X[sel]))]
    if float(X[max(sel[0], i - 4):i + 5].sum()) / tot > 0.35:
        return None
    # velocidad de símbolos: línea espectral de |dx/dt|. Hasta 4800 baudios se filtra a ~4.8 kHz (mucho menos
    # ruido: detecta NXDN/dPMR débiles); 6000 y 9600 necesitan ~12 kHz de banda
    smooth = {}
    scores = {}
    for k, rates in ((max(1, fs // 4800), (512, 1200, 1600, 2400, 3600, 4800)), (max(1, fs // 12000), (6000, 9600))):
        y = smooth[k] = np.convolve(x, np.ones(k) / k, mode="same")
        d = np.abs(np.diff(y))
        d = d - d.mean()
        m = 1 << int(math.log2(min(len(d), 65536)))
        D = np.abs(np.fft.rfft(d[:m] * np.hanning(m))) ** 2
        fd = np.fft.rfftfreq(m, 1.0 / fs)
        for rate in rates:
            sel = np.abs(fd - rate) < max(8.0, rate * 0.004)
            ref = (np.abs(fd - rate) > rate * 0.03) & (np.abs(fd - rate) < rate * 0.15)
            if sel.any() and ref.any():
                scores[rate] = float(D[sel].max()) / (float(np.median(D[ref])) + 1e-12)
    top = max(scores.values()) if scores else 0.0
    if top < 25:
        return None
    # la fundamental: la velocidad más baja con una línea fuerte (las demás son armónicas)
    best = min(r for r, v in scores.items() if v >= max(25.0, 0.2 * top))
    score = scores[best]
    y = smooth[max(1, fs // 4800) if best <= 4800 else max(1, fs // 12000)]
    # niveles: se muestrea en el centro de cada símbolo (la fase con el ojo más abierto) y se cuenta cuántas
    # muestras caen en los niveles interiores: en 4FSK (±1/3) son la mitad; en 2FSK/GMSK casi ninguna
    sps = fs / best
    z = y - 0.5 * (np.percentile(y, 95) + np.percentile(y, 5))
    nsym = int((len(z) - 2 * sps) / sps)
    if nsym < 64:
        return None
    pos = np.arange(len(z))
    eye, v = -1.0, None
    for ph in np.linspace(0, sps, 16, endpoint=False):
        s = np.interp(ph + sps * (np.arange(nsym) + 0.5), pos, z)
        e = float(np.mean(np.abs(s)))
        if e > eye:
            eye, v = e, s
    outer = float(np.percentile(np.abs(v), 90))
    if outer <= 0:
        return None
    inner = float(np.mean(np.abs(v) < 0.6 * outer))
    levels = 4 if inner > 0.38 and best <= 6000 else 2  # a 9600 baudios en FM casi siempre es GMSK (AIS, packet)
    span = float(np.percentile(y, 97) - np.percentile(y, 3)) / 2.0  # ≈ desviación máxima (Hz)
    names = {
        (4, 4800): "4FSK 4800 baudios: DMR, P25 fase 1, Yaesu Fusion (C4FM) o M17",
        (4, 2400): "4FSK 2400 baudios: NXDN 6.25 kHz o dPMR",
        (4, 6000): "4FSK 6000: P25 fase 2 (TDMA)",
        (2, 4800): "GMSK 4800: D-Star (o datos 4800)",
        (2, 9600): "GMSK 9600: AIS, packet 9600 o datos",
        (2, 2400): "2FSK 2400: POCSAG 2400 / datos",
        (2, 1200): "2FSK 1200: POCSAG 1200 / datos",
        (2, 1600): "2FSK 1600: FLEX (buscapersonas)",
        (4, 1600): "4FSK 1600: FLEX 3200",
        (2, 512): "2FSK 512: POCSAG 512",
    }
    guess = names.get((levels, best)) or "%d-FSK %d baudios (datos)" % (levels, best)
    return {"kind": "%dfsk%d" % (levels, best), "rate": best, "levels": levels, "guess": guess,
            "dev": round(span), "conf": round(min(1.0, score / 80.0), 2)}


def fsk_wave(rate, levels, dev, seconds, fs=48000, seed=0, beta=0.2):
    """Desviación (Hz) de una señal 2/4-FSK con filtro RRC: imita DMR, NXDN, D-Star… para el modo demo."""
    rng = np.random.default_rng(seed)
    sps = fs // rate
    n = int(seconds * fs)
    vals = (2 * rng.integers(0, levels, n // sps + 20) - (levels - 1)) / (levels - 1)
    up = np.zeros(len(vals) * sps)
    up[::sps] = vals * sps
    t = np.arange(-8 * sps, 8 * sps + 1) / sps
    with np.errstate(divide="ignore", invalid="ignore"):
        h = (np.sin(np.pi * t * (1 - beta)) + 4 * beta * t * np.cos(np.pi * t * (1 + beta))) / (
            np.pi * t * (1 - (4 * beta * t) ** 2))
    h[np.isclose(t, 0)] = 1 - beta + 4 * beta / np.pi
    bad = np.isclose(np.abs(4 * beta * t), 1)
    h[bad] = beta / np.sqrt(2) * ((1 + 2 / np.pi) * np.sin(np.pi / (4 * beta)) + (1 - 2 / np.pi) * np.cos(np.pi / (4 * beta)))
    y = np.convolve(up, h / h.sum(), mode="same")[:n]
    return (y / np.percentile(np.abs(y), 99) * dev).astype(np.float64)


def demo_m17_wave(path, fs=48000):
    """Transmisión M17 real (voz Codec2, indicativo XE1SDR) guardada como símbolos: desviación FM en Hz."""
    sym = np.fromfile(path, dtype=np.int8).astype(np.float64)
    sps, beta = fs // 4800, 0.5
    t = np.arange(-8 * sps, 8 * sps + 1) / sps
    with np.errstate(divide="ignore", invalid="ignore"):
        h = (np.sin(np.pi * t * (1 - beta)) + 4 * beta * t * np.cos(np.pi * t * (1 + beta))) / (
            np.pi * t * (1 - (4 * beta * t) ** 2))
    h[np.isclose(t, 0)] = 1 - beta + 4 * beta / np.pi
    bad = np.isclose(np.abs(4 * beta * t), 1)
    h[bad] = beta / np.sqrt(2) * ((1 + 2 / np.pi) * np.sin(np.pi / (4 * beta)) + (1 - 2 / np.pi) * np.cos(np.pi / (4 * beta)))
    up = np.zeros(len(sym) * sps)
    up[::sps] = sym
    return np.convolve(up, h / h.max(), mode="same") * 800.0
