#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SDR-Kit — panel web + analizador de espectro estilo tinySA
para Raspberry Pi Zero 2 W + RTL-SDR (o HackRF) + OpenWebRX+.

Uso:
  sudo python3 sdrkit_server.py                 # servicio normal (lo arranca systemd)
  python3 sdrkit_server.py --demo --port 8080   # demo en tu PC, sin hardware (requiere numpy)
  sudo python3 sdrkit_server.py --seed-owrx     # escribe los perfiles de bandas en OpenWebRX+

Sólo usa la biblioteca estándar de Python + numpy (paquete python3-numpy).
"""

import argparse
import collections
import ctypes
import ctypes.util
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import select
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import traceback
import tempfile
import urllib.request
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

try:
    import numpy as np
except ImportError:  # el motor nativo necesita numpy; sin él se usa rtl_power
    np = None

HERE = os.path.dirname(os.path.abspath(__file__))


def _read_version():
    for f in (os.path.join(HERE, "VERSION"), os.path.join(HERE, "..", "VERSION")):
        try:
            with open(f, encoding="utf-8") as fh:
                v = fh.read().strip()
                if v:
                    return v
        except OSError:
            pass
    return "3.5.0"


VERSION = _read_version()
UPDATER = os.path.join(HERE, "sdrkit-update.sh")
sys.path.insert(0, HERE)
import sdrkit_radio as radio_mod  # noqa: E402
import sdrkit_decoders as dec_mod  # noqa: E402
CONF_PATH = os.environ.get("SDRKIT_CONF", "/etc/sdrkit/sdrkit.conf")
WEB_DIR = os.environ.get("SDRKIT_WEB", os.path.join(HERE, "web"))
STATE_DIR = os.environ.get("SDRKIT_STATE", "/var/lib/sdrkit")
OWRX_SETTINGS = os.environ.get("SDRKIT_OWRX_SETTINGS", "/var/lib/openwebrx/settings.json")
OWRX_CONFIG_VERSION = 8
TARGET_PROFILE = "sdrkit-target"

FS = 2400000  # frecuencia de muestreo del motor nativo (estable en cualquier RTL-SDR)
ZFS = 960000  # muestreo del span cero
ZCHUNK = 65536  # muestras por lectura en span cero (múltiplo de 256 para USB)
RTL_MIN_HZ, RTL_MAX_HZ = 100e3, 1766e6
HACKRF_MIN_HZ, HACKRF_MAX_HZ = 1e6, 6000e6

DEFAULTS = {
    "PANEL_PORT": "80",
    "ADMIN_PASSWORD": "",
    "OWRX_PORT": "8073",
    "DEFAULT_MODE": "last",
    "SWEEP_ENGINE": "auto",
    "SWEEP_IDLE_STOP": "20",
    "SWEEP_MAX_FPS": "12",
    "RTL_DEVICE_INDEX": "0",
    "RTL_PPM": "0",
    "RTL_MODEL": "v4",
    "BIAS_TEE": "no",
    "LEVEL_OFFSET_DB": "0",
    "HOTSPOT_CON": "sdrkit-hotspot",
    "HOTSPOT_SSID": "SDR-Pi",
    "HOTSPOT_IP": "192.168.4.1",
    "WIFI_IFACE": "wlan0",
    "REGION": "americas",
    "RECEIVER_NAME": "SDR-Kit",
}


# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------

try:
    import pwd  # POSIX only: the demo also runs on Windows without it
except ImportError:  # pragma: no cover
    pwd = None


def log(*args):
    print(time.strftime("%H:%M:%S"), *args, flush=True)


def load_conf(path):
    """Lee un archivo KEY="valor". Mismas reglas que el lector en bash del instalador:
    el valor entre comillas se toma literal (sin expandir $ ni \\)."""
    conf = dict(DEFAULTS)
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for raw in f:
                m = re.match(r"^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$", raw.rstrip("\r\n"))
                if not m:
                    continue
                key, val = m.group(1), m.group(2)
                mm = re.match(r'^"([^"]*)"\s*(#.*)?$', val) or re.match(r"^'([^']*)'\s*(#.*)?$", val)
                conf[key] = mm.group(1) if mm else val.split("#", 1)[0].strip()
    except FileNotFoundError:
        pass
    return conf


def cbool(v):
    return str(v).strip().lower() in ("1", "yes", "si", "sí", "true", "on", "y", "s")


def cint(v, default=0):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def cfloat(v, default=0.0):
    try:
        f = float(v)
        return f if math.isfinite(f) else default
    except (TypeError, ValueError):
        return default


def run(cmd, timeout=15, input_text=None):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, input=input_text)
        return p.returncode, p.stdout, p.stderr
    except FileNotFoundError:
        return 127, "", "%s: no encontrado" % cmd[0]
    except subprocess.TimeoutExpired:
        return 124, "", "tiempo agotado"


def nm_split(line):
    """Divide una línea de `nmcli -t` respetando los ':' escapados."""
    out, cur, esc = [], [], False
    for ch in line:
        if esc:
            cur.append(ch)
            esc = False
        elif ch == "\\":
            esc = True
        elif ch == ":":
            out.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    out.append("".join(cur))
    return out


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return None


def write_json_atomic(path, data, owner=None, mode=0o644):
    tmp = path + ".tmp-sdrkit"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.chmod(tmp, mode)
    if owner:
        try:
            if pwd is None:
                raise KeyError(owner)
            pw = pwd.getpwnam(owner)
            os.chown(tmp, pw.pw_uid, pw.pw_gid)
        except (KeyError, PermissionError):
            pass
    os.replace(tmp, path)


def notify(conf, msg):
    """Aviso al celular por internet con ntfy.sh (opcional: NTFY_TOPIC en sdrkit.conf)."""
    topic = (conf.get("NTFY_TOPIC") or "").strip()
    if not topic:
        return
    url = (conf.get("NTFY_SERVER") or "https://ntfy.sh").rstrip("/") + "/" + quote(topic)

    def job():
        try:
            req = urllib.request.Request(url, data=msg.encode("utf-8"), method="POST", headers={"Title": "SDR-Kit"})
            urllib.request.urlopen(req, timeout=10).read()
        except Exception as e:
            log("ntfy:", e)

    threading.Thread(target=job, daemon=True).start()


def usb_devices():
    """Lista dispositivos SDR conocidos leyendo /sys (no necesita lsusb)."""
    known = {
        ("0bda", "2838"): "RTL-SDR (RTL2832U)",
        ("0bda", "2832"): "RTL-SDR (RTL2832U)",
        ("1d50", "6089"): "HackRF One",
        ("1d50", "60a1"): "Airspy",
        ("1df7", "3000"): "SDRplay",
    }
    found = []
    base = "/sys/bus/usb/devices"
    try:
        entries = os.listdir(base)
    except OSError:
        return found
    for e in entries:
        p = os.path.join(base, e)
        try:
            with open(os.path.join(p, "idVendor")) as f:
                vid = f.read().strip()
            with open(os.path.join(p, "idProduct")) as f:
                pid = f.read().strip()
        except OSError:
            continue
        if (vid, pid) in known:
            prod = ""
            try:
                with open(os.path.join(p, "product")) as f:
                    prod = f.read().strip()
            except OSError:
                pass
            found.append({"id": "%s:%s" % (vid, pid), "name": known[(vid, pid)], "product": prod})
    return found


# ----------------------------------------------------------------------------
# Acceso al RTL-SDR (librtlsdr vía ctypes) + simulador para la demo
# ----------------------------------------------------------------------------

class SdrError(Exception):
    pass


TUNERS = {0: "desconocido", 1: "E4000", 2: "FC0012", 3: "FC0013", 4: "FC2580", 5: "R820T/R820T2", 6: "R828D"}


class RtlSdr:
    _lib = None

    @classmethod
    def lib(cls):
        if cls._lib is not None:
            return cls._lib
        names = []
        found = ctypes.util.find_library("rtlsdr")
        if found:
            names.append(found)
        names += ["librtlsdr.so.0", "librtlsdr.so.2", "librtlsdr.so", "librtlsdr.dylib"]
        lib = None
        for n in names:
            try:
                lib = ctypes.CDLL(n)
                break
            except OSError:
                continue
        if lib is None:
            raise SdrError("No se encontró librtlsdr (instala el paquete rtl-sdr).")
        P = ctypes.c_void_p
        sigs = {
            "rtlsdr_get_device_count": (ctypes.c_uint32, []),
            "rtlsdr_get_device_usb_strings": (ctypes.c_int, [ctypes.c_uint32, P, P, P]),
            "rtlsdr_open": (ctypes.c_int, [ctypes.POINTER(P), ctypes.c_uint32]),
            "rtlsdr_close": (ctypes.c_int, [P]),
            "rtlsdr_set_sample_rate": (ctypes.c_int, [P, ctypes.c_uint32]),
            "rtlsdr_set_center_freq": (ctypes.c_int, [P, ctypes.c_uint32]),
            "rtlsdr_set_freq_correction": (ctypes.c_int, [P, ctypes.c_int]),
            "rtlsdr_set_tuner_gain_mode": (ctypes.c_int, [P, ctypes.c_int]),
            "rtlsdr_set_tuner_gain": (ctypes.c_int, [P, ctypes.c_int]),
            "rtlsdr_get_tuner_gains": (ctypes.c_int, [P, ctypes.POINTER(ctypes.c_int)]),
            "rtlsdr_get_tuner_type": (ctypes.c_int, [P]),
            "rtlsdr_set_agc_mode": (ctypes.c_int, [P, ctypes.c_int]),
            "rtlsdr_set_direct_sampling": (ctypes.c_int, [P, ctypes.c_int]),
            "rtlsdr_reset_buffer": (ctypes.c_int, [P]),
            "rtlsdr_read_sync": (ctypes.c_int, [P, P, ctypes.c_int, ctypes.POINTER(ctypes.c_int)]),
            "rtlsdr_set_bias_tee": (ctypes.c_int, [P, ctypes.c_int]),
        }
        for name, (res, args) in sigs.items():
            try:
                fn = getattr(lib, name)
            except AttributeError:
                continue
            fn.restype = res
            fn.argtypes = args
        cls._lib = lib
        return lib

    def __init__(self, index=0):
        lib = self.lib()
        count = lib.rtlsdr_get_device_count()
        if count == 0:
            raise SdrError("No se detecta ningún RTL-SDR. Revisa el adaptador OTG (puerto USB, no PWR) y la energía.")
        if index >= count:
            index = 0
        dev = ctypes.c_void_p()
        r = lib.rtlsdr_open(ctypes.byref(dev), index)
        if r < 0 or not dev.value:
            raise SdrError("No se pudo abrir el RTL-SDR (código %d). Puede estar en uso por el receptor "
                           "OpenWebRX u otro programa." % r)
        self.dev = dev
        self.name = "RTL-SDR"
        try:
            bufs = [ctypes.create_string_buffer(256) for _ in range(3)]
            if lib.rtlsdr_get_device_usb_strings(index, *bufs) == 0:
                txt = " ".join(b.value.decode("utf-8", "replace").strip() for b in bufs[:2]).strip()
                if txt:
                    self.name = txt
        except Exception:
            pass
        self.tuner = lib.rtlsdr_get_tuner_type(dev)
        self.gains = []
        n = lib.rtlsdr_get_tuner_gains(dev, None)
        if n and n > 0:
            arr = (ctypes.c_int * n)()
            lib.rtlsdr_get_tuner_gains(dev, arr)
            self.gains = [g / 10.0 for g in arr]
        self.min_hz = 0.5e6 if self.tuner == 6 else (RTL_MIN_HZ if self.tuner == 5 else 24e6)
        self.max_hz = RTL_MAX_HZ
        self._buf = None
        self._buflen = 0
        self._ds = 0

    def setup(self, fs, ppm=0, bias=False):
        lib = self._lib
        if lib.rtlsdr_set_sample_rate(self.dev, int(fs)) < 0:
            raise SdrError("El RTL-SDR no aceptó la frecuencia de muestreo.")
        if ppm:
            lib.rtlsdr_set_freq_correction(self.dev, int(ppm))
        if hasattr(lib, "rtlsdr_set_agc_mode"):
            lib.rtlsdr_set_agc_mode(self.dev, 0)
        if bias and hasattr(lib, "rtlsdr_set_bias_tee"):
            lib.rtlsdr_set_bias_tee(self.dev, 1)
        lib.rtlsdr_reset_buffer(self.dev)

    def set_gain(self, gain):
        lib = self._lib
        if gain == "auto" or not self.gains:
            lib.rtlsdr_set_tuner_gain_mode(self.dev, 0)
            return "auto"
        g = min(self.gains, key=lambda x: abs(x - float(gain)))
        lib.rtlsdr_set_tuner_gain_mode(self.dev, 1)
        lib.rtlsdr_set_tuner_gain(self.dev, int(round(g * 10)))
        return g

    def tune(self, freq):
        lib = self._lib
        # RTL-SDR V3 (R820T): HF por muestreo directo (rama Q) por debajo de 24 MHz.
        want = 2 if (self.tuner == 5 and freq < 24e6) else 0
        if want != self._ds and hasattr(lib, "rtlsdr_set_direct_sampling"):
            lib.rtlsdr_set_direct_sampling(self.dev, want)
            self._ds = want
        return lib.rtlsdr_set_center_freq(self.dev, int(round(freq))) >= 0

    def read(self, nbytes):
        if self._buflen != nbytes:
            self._buf = (ctypes.c_ubyte * nbytes)()
            self._buflen = nbytes
        got = ctypes.c_int(0)
        r = self._lib.rtlsdr_read_sync(self.dev, self._buf, nbytes, ctypes.byref(got))
        if r < 0:
            raise SdrError("Error leyendo el RTL-SDR (%d). ¿Se desconectó o le falta energía?" % r)
        return np.frombuffer(self._buf, dtype=np.uint8, count=got.value)

    def close(self):
        if self.dev:
            try:
                self._lib.rtlsdr_close(self.dev)
            finally:
                self.dev = None


class FakeTx:
    """Transmisor simulado con modulación continua (voz, subtonos CTCSS/DCS, DTMF, música FM)."""

    WAVE_RATE = 48000

    def __init__(self, freq, mod, level, period, on, phase=0.0, ctcss=None, dcs=None, dtmf=None, seed=0.0,
                 waves=None):
        self.freq, self.mod, self.amp = float(freq), mod, 10 ** (level / 20.0)
        self.period, self.on, self.phase = period, on, phase
        self.waves = waves or []  # modo "data": desviación (Hz) muestreada a 48 kHz, una por transmisión
        self.ctcss, self.dtmf, self.seed = ctcss, dtmf, seed
        self.dcs_word = None
        if dcs is not None:
            import sdrkit_radio
            self.dcs_word = sdrkit_radio.dcs_word(dcs)
        self.ph = 0.0

    def active(self, t):
        return ((t + self.phase) % self.period) < self.on

    @staticmethod
    def _frac(x):
        return x - np.floor(x)

    def _voice(self, t):
        syl = np.floor(t / 0.16 + self.seed)
        f1 = 350 + 600 * self._frac(np.sin(syl * 12.9898 + self.seed) * 43758.5453)
        f2 = 900 + 1400 * self._frac(np.sin(syl * 78.233 + self.seed) * 12345.678)
        env = 0.3 + 0.7 * np.abs(np.sin(np.pi * self._frac(t / 0.16)))
        word = self._frac(np.sin(np.floor(t / 0.8 + self.seed) * 3.1) * 999.0) > 0.15
        return env * word * (0.6 * np.sin(2 * np.pi * f1 * t) + 0.4 * np.sin(2 * np.pi * f2 * t))

    def baseband(self, t, fc, fs):
        """Señal compleja (centrada en fc) para el vector de tiempos t."""
        rel = self.freq - fc
        if self.mod == "ook":
            # control remoto: cada 1 s, 4 repeticiones de 24 bits (1 = pulso largo, 0 = corto)
            tt = t % 1.0
            rep_i = np.floor(tt / 0.04)
            u = tt - rep_i * 0.04
            bit_i = np.floor(u / 0.0012).astype(np.int64)
            frac = (u % 0.0012) / 0.0012
            bits = (0xA5C3F0 >> np.clip(23 - bit_i, 0, 23)) & 1
            on = (rep_i < 4) & (bit_i < 24) & (frac < np.where(bits == 1, 0.75, 0.25))
            amp = self.amp * on
            ph = self.ph + 2 * np.pi * rel * (np.arange(len(t)) + 1) / fs
            self.ph = float(ph[-1] % (2 * np.pi))
            return amp * np.exp(1j * ph)
        if self.mod == "data":
            cyc = np.floor((t + self.phase) / self.period).astype(np.int64)
            tt = (t + self.phase) % self.period
            idx = (tt * self.WAVE_RATE).astype(np.int64)
            m = np.zeros(len(t))
            live = np.zeros(len(t), dtype=bool)
            for k, w in enumerate(self.waves):
                sel = (cyc % len(self.waves) == k) & (idx < len(w))
                if sel.any():
                    m[sel] = w[idx[sel]]
                    live |= sel
            inst = rel + m
            amp = self.amp * live
        elif self.mod == "wfm":
            m = (0.35 * np.sin(2 * np.pi * 440 * t) + 0.25 * np.sin(2 * np.pi * 660 * t) +
                 0.2 * np.sin(2 * np.pi * 880 * t) * np.sin(2 * np.pi * 0.5 * t) + 0.09 * np.sin(2 * np.pi * 19000 * t))
            inst = rel + 75000 * m
            amp = self.amp
        elif self.mod == "am":
            inst = np.full_like(t, rel)
            amp = self.amp * (1 + 0.7 * self._voice(t))
        else:
            tt = (t + self.phase) % self.period
            m = 2000 * self._voice(t)
            if self.dtmf:
                import sdrkit_radio as R
                k = np.floor(tt / 0.14).astype(int)
                in_tone = (k < len(self.dtmf)) & ((tt % 0.14) < 0.08)
                if in_tone.any():
                    m = np.where(in_tone, 0.0, m)
                    for i, key in enumerate(self.dtmf):
                        r = next(r for r, row in enumerate(R.DTMF_KEYS) if key in row)
                        c = R.DTMF_KEYS[r].index(key)
                        sel = in_tone & (k == i)
                        m = np.where(sel, 1250 * (np.sin(2 * np.pi * R.DTMF_LOW[r] * t) +
                                                  np.sin(2 * np.pi * R.DTMF_HIGH[c] * t)), m)
            if self.ctcss:
                m = m + 650 * np.sin(2 * np.pi * self.ctcss * t)
            if self.dcs_word is not None:
                bit = (np.floor(t * 134.4) % 23).astype(np.int64)
                m = m + 650 * np.where((self.dcs_word >> bit) & 1, 1.0, -1.0)
            inst = rel + m
            amp = self.amp
        ph = self.ph + 2 * np.pi * np.cumsum(inst) / fs
        self.ph = float(ph[-1] % (2 * np.pi))
        return amp * np.exp(1j * ph)


def demo_data_tx():
    """Buscapersonas POCSAG y APRS de prueba, codificados de verdad (multimon-ng los decodifica)."""
    r = FakeTx.WAVE_RATE

    def pocsag(ric, text):
        bits = np.asarray(dec_mod.pocsag_bits(ric, text))
        spb = r / 1200.0
        idx = np.minimum((np.arange(int(len(bits) * spb)) / spb).astype(int), len(bits) - 1)
        return np.where(bits[idx] == 1, -4500.0, 4500.0)  # 1 = frecuencia baja

    pages = [pocsag(1234567, "SDR-Kit: POCSAG 1200 test page"),
             pocsag(200016, "UNIT 12 RETURN TO BASE 15:30"),
             pocsag(1500003, "Server room 41C - temperature alarm")]
    aprs = [3000.0 * dec_mod.aprs_afsk(src, "APRS", ["WIDE1-1", "WIDE2-1"], info, r).astype(np.float64)
            for src, info in (("N0CALL-9", "!1829.17N/06955.87W>SDR-Kit mobile 72 km/h"),
                              ("XE1ABC-7", ">Testing APRS from the simulator"),
                              ("HI8XYZ", "=1828.50N/06956.20W-Home station"))]
    dur = lambda ws: max(len(w) for w in ws) / r + 0.05  # noqa: E731
    m17 = []
    sym = os.path.join(HERE, "demo_m17.sym")
    if os.path.exists(sym):  # M17 de verdad: el modo «Digital» la decodifica con voz e indicativo
        w = [dec_mod.demo_m17_wave(sym, r)]
        m17 = [FakeTx(433.475e6, "data", -29, 8, dur(w), 3.0, waves=w)]
    dmr = [dec_mod.fsk_wave(4800, 4, 1944, 4.0, r, seed=7)]      # parecida a DMR / P25 / Fusion
    nxdn = [dec_mod.fsk_wave(2400, 4, 1050, 3.0, r, seed=8)]     # parecida a NXDN48 / dPMR
    return [FakeTx(152.84e6, "data", -28, 9, dur(pages), 1.0, waves=pages),
            FakeTx(144.39e6, "data", -30, 11, dur(aprs), 4.0, waves=aprs),
            FakeTx(443.45e6, "data", -27, 10, dur(dmr), 2.0, waves=dmr),
            FakeTx(451.0125e6, "data", -31, 12, dur(nxdn), 5.0, waves=nxdn)] + m17


class FakeSdr:
    """Simulador de señales para probar el panel sin hardware (--demo)."""

    def __init__(self, seed=1):
        rng = np.random.default_rng(seed)
        self.rng = np.random.default_rng(seed + 1)
        sig = []  # (frecuencia, nivel dBFS, ancho de banda, tipo)
        for f in np.arange(88.1e6, 108e6, 0.2e6):
            if rng.random() < 0.35 and abs(f - 98.1e6) > 1e5:
                sig.append((f, rng.uniform(-48, -14), 160e3, "fm"))
        for f in np.arange(530e3, 1700e3, 10e3):
            if rng.random() < 0.25:
                sig.append((f, rng.uniform(-60, -25), 9e3, "am"))
        for f in np.arange(5.9e6, 6.2e6, 5e3):
            if rng.random() < 0.15:
                sig.append((f, rng.uniform(-62, -35), 9e3, "am"))
        sig += [
            (27.185e6, -40, 6e3, "nb"), (121.5e6, -45, 6e3, "nb"),
            (126.9e6, -38, 6e3, "nb"), (145.5e6, -28, 10e3, "nb"), (146.94e6, -24, 10e3, "nb"),
            (1090e6, -42, 2.0e6, "wide"), (1575.42e6, -70, 2.0e6, "wide"),
        ]
        for c in (473e6, 485e6, 521e6, 563e6, 599e6):  # TV digital: bloques planos de 6 MHz
            sig.append((c, -52, 5.6e6, "wide"))
        for c in np.arange(869.2e6, 894e6, 0.6e6):  # celular 850
            if rng.random() < 0.5:
                sig.append((c, rng.uniform(-60, -40), 1.2e6, "wide"))
        self.sig = sig
        self.name = "Simulador (modo demo)"
        self.tuner = 6
        self.gains = [0.0, 0.9, 1.4, 2.7, 3.7, 7.7, 8.7, 12.5, 14.4, 15.7, 16.6, 19.7, 20.7, 22.9,
                      25.4, 28.0, 29.7, 32.8, 33.8, 36.4, 37.2, 38.6, 40.2, 42.1, 43.4, 43.9, 44.5, 48.0, 49.6]
        self.min_hz, self.max_hz = 0.5e6, RTL_MAX_HZ
        self.fs = FS
        self.fc = 100e6
        self.gain = 29.7
        self.t0 = 0.0
        self.tx = [
            FakeTx(462.5625e6, "nfm", -32, 12, 5, 0.0, ctcss=88.5, seed=1),
            FakeTx(462.6125e6, "nfm", -38, 15, 5, 6.0, dcs=0o023, seed=2),
            FakeTx(146.52e6, "nfm", -30, 16, 6, 3.0, ctcss=100.0, dtmf="*123#", seed=3),
            FakeTx(118.7e6, "am", -34, 10, 4, 2.0, seed=4),
            FakeTx(98.1e6, "wfm", -25, 1, 1),
            FakeTx(156.8e6, "nfm", -36, 14, 3, 9.0, seed=5),
            FakeTx(446.00625e6, "nfm", -40, 13, 4, 5.0, ctcss=67.0, seed=6),
            FakeTx(433.92e6, "ook", -18, 1, 1),
        ]
        self.tx += demo_data_tx()

    def setup(self, fs, ppm=0, bias=False):
        self.fs = fs

    def set_gain(self, gain):
        if gain == "auto":
            self.gain = 29.7
            return "auto"
        self.gain = min(self.gains, key=lambda x: abs(x - float(gain)))
        return self.gain

    def tune(self, freq):
        if freq < self.min_hz or freq > self.max_hz:
            return False
        self.fc = float(freq)
        return True

    def read(self, nbytes):
        n = nbytes // 2
        time.sleep(n / self.fs)  # ritmo realista de USB
        g = 10 ** ((self.gain - 30) / 20)
        f = self.fc + np.fft.fftfreq(n, 1.0 / self.fs)
        sigma = 0.012 * g + 0.004
        X = (self.rng.standard_normal(n) + 1j * self.rng.standard_normal(n)) * (math.sqrt(n) * sigma / math.sqrt(2))
        half = self.fs / 2
        for (sf, lvl, bw, kind) in self.sig:
            if sf + bw / 2 < self.fc - half or sf - bw / 2 > self.fc + half:
                continue
            amp = n * (10 ** (lvl / 20)) * g
            if kind == "nb" or kind == "am":
                k = int(np.argmin(np.abs(f - sf)))
                X[k] += amp * np.exp(2j * math.pi * self.rng.random())
                if kind == "am":
                    for side in (-1, 1):
                        k2 = int(np.argmin(np.abs(f - (sf + side * 2.5e3))))
                        X[k2] += amp * 0.25 * np.exp(2j * math.pi * self.rng.random())
            else:
                m = np.abs(f - sf) < bw / 2
                cnt = int(m.sum())
                if cnt:
                    shape = 1.0
                    if kind == "fm":
                        shape = np.exp(-((f[m] - sf) / (bw / 3.2)) ** 2)
                    X[m] += amp / math.sqrt(cnt) * shape * np.exp(2j * math.pi * self.rng.random(cnt)) * 1.6
        x = np.fft.ifft(X) + (0.012 + 0.008j)  # pequeño desplazamiento de DC, como un RTL real
        t = self.t0 + np.arange(n) / self.fs
        for tx in self.tx:
            if abs(tx.freq - self.fc) < self.fs / 2 - 60e3 and tx.active(self.t0):
                x = x + tx.baseband(t, self.fc, self.fs) * g
        self.t0 += n / self.fs
        iq = np.empty(2 * n, dtype=np.float32)
        iq[0::2] = x.real
        iq[1::2] = x.imag
        return np.clip(np.round(iq * 127.5 + 127.5), 0, 255).astype(np.uint8)

    def close(self):
        pass


# ----------------------------------------------------------------------------
# Motor de barrido
# ----------------------------------------------------------------------------

def place(disp, start, disp_bin, fk, db, e0=None, e1=None):
    """Coloca mediciones (fk, db) en el vector de pantalla.
    Si la medición es más fina que la pantalla usa detector de pico (como un analizador real);
    si es más gruesa, interpola."""
    n = disp.shape[0]
    if fk.size == 0:
        return
    step = float(fk[1] - fk[0]) if fk.size > 1 else disp_bin
    lo_f = float(fk[0]) - step / 2
    hi_f = float(fk[-1]) + step / 2
    if e0 is not None:
        lo_f = max(lo_f, e0)
        hi_f = min(hi_f, e1)
    d0 = max(0, int(math.ceil((lo_f - start) / disp_bin - 0.5)))
    d1 = min(n, int(math.floor((hi_f - start) / disp_bin - 0.5)) + 1)
    if d1 <= d0:
        return
    centers = start + (np.arange(d0, d1) + 0.5) * disp_bin
    if step < disp_bin * 0.999:
        idx = np.floor((fk - start) / disp_bin).astype(np.int64)
        ok = (idx >= d0) & (idx < d1)
        vals = np.full(d1 - d0, -np.inf, dtype=np.float32)
        np.maximum.at(vals, idx[ok] - d0, db[ok])
        miss = ~np.isfinite(vals)
        if miss.all():
            vals = np.interp(centers, fk, db).astype(np.float32)
        elif miss.any():
            vals[miss] = np.interp(centers[miss], fk, db)
    else:
        vals = np.interp(centers, fk, db).astype(np.float32)
    disp[d0:d1] = vals


def place_max(acc, start, disp_bin, fk, db, lo, gap, det="peak"):
    """Suma un salto al barrido en curso. Los saltos se solapan: cada punto se queda con el máximo
    medido y nunca se usa lo que cae en el hueco de DC del salto (así ninguna señal queda oculta).
    det: detector de cada punto de pantalla — "peak" (pico), "avg" (promedio de potencia) o "sample"."""
    n = acc.shape[0]
    if fk.size == 0:
        return
    step = float(fk[1] - fk[0]) if fk.size > 1 else disp_bin
    lo_f = float(fk[0]) - step / 2
    hi_f = float(fk[-1]) + step / 2
    d0 = max(0, int(math.ceil((lo_f - start) / disp_bin - 0.5)))
    d1 = min(n, int(math.floor((hi_f - start) / disp_bin - 0.5)) + 1)
    if d1 <= d0:
        return
    centers = start + (np.arange(d0, d1) + 0.5) * disp_bin
    if step < disp_bin * 0.999:
        idx = np.floor((fk - start) / disp_bin).astype(np.int64)
        ok = (idx >= d0) & (idx < d1)
        if det == "avg":
            lin = np.zeros(d1 - d0, dtype=np.float64)
            cnt = np.zeros(d1 - d0, dtype=np.float64)
            np.add.at(lin, idx[ok] - d0, 10.0 ** (db[ok] / 10.0))
            np.add.at(cnt, idx[ok] - d0, 1.0)
            valid = cnt > 0
            vals = np.full(d1 - d0, -np.inf, dtype=np.float32)
            vals[valid] = 10.0 * np.log10(lin[valid] / cnt[valid])
        elif det == "sample":
            vals = np.interp(centers, fk, db).astype(np.float32)
            valid = np.bincount(idx[ok] - d0, minlength=d1 - d0) > 0
        else:
            vals = np.full(d1 - d0, -np.inf, dtype=np.float32)
            np.maximum.at(vals, idx[ok] - d0, db[ok])
            valid = np.isfinite(vals)
    else:
        vals = np.interp(centers, fk, db).astype(np.float32)
        valid = np.abs(centers - lo) >= gap
    seg = acc[d0:d1]
    cur = seg[valid]
    seg[valid] = np.where(np.isnan(cur), vals[valid], np.maximum(cur, vals[valid]))


def fill_gaps(arr, maxrun=4):
    """Rellena huecos cortos (redondeos en los bordes); los tramos largos sin medir quedan vacíos."""
    miss = np.isnan(arr)
    if not miss.any() or miss.all():
        return
    x = np.arange(arr.shape[0])
    edges = np.diff(np.concatenate(([0], miss.view(np.int8), [0])))
    starts, ends = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)
    short = np.zeros_like(miss)
    for a, b in zip(starts, ends):
        if b - a <= maxrun:
            short[a:b] = True
    if short.any():
        arr[short] = np.interp(x[short], x[~miss], arr[~miss])


class SweepPlan:
    """Calcula cómo recorrer [start, stop] con saltos de sintonía de ~1.9 MHz."""

    AVG = {"fast": (8192, 4096), "normal": (32768, 16384), "slow": (131072, 65536)}

    def __init__(self, start, stop, points, avg="normal"):
        self.start, self.stop = float(start), float(stop)
        span = self.stop - self.start
        self.n = int(points)
        self.disp_bin = span / self.n
        exp = math.ceil(math.log2(FS / max(self.disp_bin, 1.0)))
        self.nfft = 1 << max(6, min(13, exp))
        self.binw = FS / self.nfft
        self.gap = max(1.5 * self.binw, 1500.0)  # hueco alrededor de DC que no se usa
        half = 0.45 * FS                          # zona plana del filtro del RTL2832
        center = (self.start + self.stop) / 2
        if span <= 0.35 * FS:
            # Ventana angosta: una sola sintonía desplazada, el DC queda fuera de pantalla.
            lo = center - 0.25 * FS
            if lo < 0.5e6:
                lo = center + 0.25 * FS
            self.kind = "single"
            self.hops = [lo]
        else:
            # Saltos solapados cada (0.45·FS − hueco): el hueco de DC de cada salto lo cubre el vecino.
            self.kind = "hop"
            sp = half - self.gap
            self.hops = [self.start + half - self.gap]
            while self.hops[-1] + half < self.stop or len(self.hops) < 2:
                self.hops.append(self.hops[-1] + sp)
        single_s, hop_s = self.AVG.get(avg, self.AVG["normal"])
        samples = max(single_s if self.kind == "single" else hop_s, 2 * self.nfft)
        self.navg = samples // self.nfft
        self.nbytes = self.nfft * self.navg * 2
        self.window = np.hanning(self.nfft).astype(np.float32)
        self.wnorm = float(self.window.sum()) ** 2
        self.rel = (np.arange(self.nfft) - self.nfft // 2) * self.binw
        self.sel = (np.abs(self.rel) <= half) & (np.abs(self.rel) >= self.gap)

    def measure(self, raw, lo, level_offset=0.0):
        nfft = self.nfft
        nav = min(self.navg, raw.size // (2 * nfft))
        if nav < 1:
            raise SdrError("Lectura incompleta del SDR.")
        iq = raw[: 2 * nfft * nav].astype(np.float32)
        iq -= 127.5
        iq /= 127.5
        c = np.empty(nfft * nav, dtype=np.complex64)
        c.real = iq[0::2]
        c.imag = iq[1::2]
        c -= c.mean()
        spec = np.fft.fft(c.reshape(nav, nfft) * self.window, axis=1)
        p = (spec.real ** 2 + spec.imag ** 2).mean(axis=0)
        p = np.fft.fftshift(p) / self.wnorm
        db = 10.0 * np.log10(p + 1e-12) + level_offset
        return lo + self.rel[self.sel], db[self.sel].astype(np.float32)


class Hub:
    """Distribuye cuadros del analizador a todos los navegadores conectados (SSE)."""

    def __init__(self):
        self.cv = threading.Condition()
        self.seq = 0
        self.payload = None
        self.status_seq = 0
        self.status_payload = None
        self.last_status = None
        self.clients = 0
        self.last_client = 0.0

    def publish(self, obj):
        data = ("event: frame\ndata: " + json.dumps(obj, separators=(",", ":")) + "\n\n").encode()
        with self.cv:
            self.seq += 1
            self.payload = data
            self.cv.notify_all()

    def status(self, msg, level="info"):
        obj = {"msg": msg, "level": level, "t": time.time()}
        data = ("event: status\ndata: " + json.dumps(obj) + "\n\n").encode()
        with self.cv:
            self.status_seq += 1
            self.status_payload = data
            self.last_status = obj
            self.cv.notify_all()
        log("[analizador]", level, msg)

    def wanted(self, idle_stop):
        return self.clients > 0 or (time.time() - self.last_client) < idle_stop


class SweepManager:
    def __init__(self, conf, hub, state, demo=False):
        self.conf = conf
        self.hub = hub
        self.state = state
        self.demo = demo
        self.idle_stop = cfloat(conf.get("SWEEP_IDLE_STOP"), 20.0)
        self.max_fps = max(1.0, cfloat(conf.get("SWEEP_MAX_FPS"), 12.0))
        self.level_offset = cfloat(conf.get("LEVEL_OFFSET_DB"), 0.0)
        self.cv = threading.Condition()
        self.enabled = False
        self.version = 0
        self.engine = self._choose_engine()
        p = {"start": 88e6, "stop": 108e6, "gain": 29.7, "avg": "normal", "points": 800, "det": "peak",
             "mode": "sweep", "zf": 433.92e6, "zrbw": 30000, "zt": 0.1, "ztrig": "free", "zlevel": -40.0}
        p.update(state.get("sweep") or {})
        self.params = self._validate(p)
        self.cal = state.get("cal")  # calibración a dBm: {"k": ...}
        self.monitor = {"enabled": False, "limit": None, "fmin": None, "fmax": None, "every": 60,
                        "cooldown": 30, "notify": False}
        self.monitor.update({k: v for k, v in (state.get("monitor") or {}).items() if k in self.monitor})
        self.mon_rows = collections.deque(maxlen=1440)
        self.mon_meta = None
        self.alarms = collections.deque(maxlen=300)
        self._acc = None
        self._last_alarm = 0.0
        self._fs = None
        self.dev = None
        self.proc = None
        self.closed = threading.Event()
        self.closed.set()
        self.info = {"engine": self.engine, "device": None, "gains": [], "min_hz": RTL_MIN_HZ,
                     "max_hz": HACKRF_MAX_HZ if self.engine == "hackrf" else RTL_MAX_HZ,
                     "running": False, "rbw": None}
        self.disp = None
        self.plan = None
        self._applied = None
        self._tuned = None
        threading.Thread(target=self._worker, name="sweep", daemon=True).start()

    # -- configuración -------------------------------------------------------

    def _choose_engine(self):
        want = str(self.conf.get("SWEEP_ENGINE", "auto")).lower()
        if self.demo:
            return "native"
        if want in ("native", "rtl_power", "hackrf"):
            return want
        if any(d["id"] == "1d50:6089" for d in usb_devices()) and shutil.which("hackrf_sweep"):
            return "hackrf"
        if np is not None:
            return "native"
        return "rtl_power"

    def _validate(self, p):
        lo = HACKRF_MIN_HZ if self.engine == "hackrf" else RTL_MIN_HZ
        hi = HACKRF_MAX_HZ if self.engine == "hackrf" else RTL_MAX_HZ
        start = min(max(cfloat(p.get("start"), 88e6), lo), hi - 10e3)
        stop = min(max(cfloat(p.get("stop"), 108e6), start + 10e3), hi)
        if self.engine == "hackrf":  # hackrf_sweep trabaja en MHz enteros
            start = math.floor(start / 1e6) * 1e6
            stop = max(math.ceil(stop / 1e6) * 1e6, start + 1e6)
        g = p.get("gain", 29.7)
        gain = "auto" if str(g).lower() == "auto" else min(max(cfloat(g, 29.7), 0.0), 60.0)
        avg = p.get("avg") if p.get("avg") in SweepPlan.AVG else "normal"
        points = int(min(max(cint(p.get("points"), 800), 200), 2400))
        det = p.get("det") if p.get("det") in ("peak", "avg", "sample") else "peak"
        mode = "zspan" if p.get("mode") == "zspan" and self.engine == "native" else "sweep"
        zf = min(max(cfloat(p.get("zf"), 433.92e6), 0.5e6), RTL_MAX_HZ)
        zrbw = min(max(cfloat(p.get("zrbw"), 30000), 1000), 200000)
        zt = min(max(cfloat(p.get("zt"), 0.1), 0.002), 2.0)
        ztrig = "level" if p.get("ztrig") == "level" else "free"
        zlevel = min(max(cfloat(p.get("zlevel"), -40.0), -130.0), 10.0)
        return {"start": start, "stop": stop, "gain": gain, "avg": avg, "points": points, "det": det,
                "mode": mode, "zf": zf, "zrbw": zrbw, "zt": zt, "ztrig": ztrig, "zlevel": zlevel}

    def set_params(self, p):
        merged = dict(self.params)
        merged.update({k: v for k, v in p.items() if k in ("start", "stop", "gain", "avg", "points", "det", "mode",
                                                           "zf", "zrbw", "zt", "ztrig", "zlevel")})
        with self.cv:
            self.params = self._validate(merged)
            self.version += 1
            self.cv.notify_all()
        if self.proc is not None:
            self._kill_proc()
        self.state.update(sweep=self.params)
        return self.params

    def enable(self):
        with self.cv:
            self.enabled = True
            self.cv.notify_all()

    def disable(self, wait=8.0):
        with self.cv:
            self.enabled = False
            self.cv.notify_all()
        if self.proc is not None:
            self._kill_proc()
        return self.closed.wait(wait)

    def poke(self):
        with self.cv:
            self.cv.notify_all()

    # -- ciclo principal -------------------------------------------------------

    def _wanted(self):
        # con la vigilancia activa el barrido sigue aunque nadie tenga el panel abierto
        return self.hub.wanted(self.idle_stop) or bool(self.monitor.get("enabled"))

    def _should_stop(self, ver):
        return (not self.enabled) or self.version != ver or not self._wanted()

    def _worker(self):
        last_err = None
        while True:
            with self.cv:
                while not (self.enabled and self._wanted()):
                    self._close()
                    self.closed.set()
                    self.cv.wait(1.0)
                self.closed.clear()
                ver = self.version
                params = dict(self.params)
            try:
                if self.engine == "native":
                    self._native_cycle(ver, params)
                else:
                    self._csv_cycle(ver, params)
                last_err = None
            except SdrError as e:
                self._close()
                if str(e) != last_err:
                    self.hub.status(str(e), "error")
                    last_err = str(e)
                self._nap(3.0)
            except Exception as e:  # nunca dejar morir el hilo
                traceback.print_exc()
                self._close()
                self.hub.status("Error interno del analizador: %s" % e, "error")
                self._nap(3.0)

    def _nap(self, secs):
        with self.cv:
            self.cv.wait(secs)

    def _close(self):
        if self.dev is not None:
            try:
                self.dev.close()
            except Exception:
                pass
            self.dev = None
            self._fs = None
            self.hub.status("Analizador en pausa (dongle liberado).", "info")
        if self.proc is not None:
            self._kill_proc()
            self.hub.status("Analizador en pausa (dongle liberado).", "info")
        self._applied = None
        self._tuned = None
        self.info["running"] = False

    def _new_display(self, params):
        self.disp = np.full(params["points"], np.nan, dtype=np.float32)

    def _emit(self, params, complete, pos=1.0, sweep_ms=None, rbw=None, kind=None, hops=1):
        vals = np.round(self.disp.astype(np.float64), 1).tolist()
        vals = [None if v != v else v for v in vals]
        self.hub.publish({
            "f0": params["start"], "f1": params["stop"], "n": len(vals), "complete": complete,
            "pos": round(pos, 4), "sweep_ms": sweep_ms, "rbw": rbw, "kind": kind, "hops": hops,
            "gain": params["gain"], "engine": self.engine, "db": vals, "det": params.get("det", "peak"),
            "mode": "sweep",
        })

    # -- motor nativo (librtlsdr + numpy) ----------------------------------------

    def _native_cycle(self, ver, params):
        if np is None:
            raise SdrError("Falta numpy (sudo apt install python3-numpy).")
        if self.dev is None:
            dev = FakeSdr() if self.demo else RtlSdr(cint(self.conf.get("RTL_DEVICE_INDEX"), 0))
            self.dev = dev
            self._fs = None
            self.info.update(device=dev.name, gains=dev.gains, min_hz=dev.min_hz, max_hz=dev.max_hz,
                             tuner=TUNERS.get(dev.tuner, str(dev.tuner)), tuner_id=dev.tuner)
            self.hub.status("Analizador activo: %s (sintonizador %s)" % (dev.name, self.info["tuner"]), "ok")
        dev = self.dev
        self.info["running"] = True
        if params["mode"] == "zspan":
            return self._zspan_cycle(ver, params)
        if self._fs != FS:
            self._setup_rate(FS)
            self._applied = None
        if self._applied != ver:
            self.plan = SweepPlan(params["start"], params["stop"], params["points"], params["avg"])
            dev.set_gain(params["gain"])
            self._new_display(params)
            self._applied = ver
            self._tuned = None
            self.info["rbw"] = self.plan.binw * 1.5
        plan = self.plan
        rbw = plan.binw * 1.5  # ancho de banda equivalente de la ventana Hann
        acc = np.full(plan.n, np.nan, dtype=np.float32)
        if plan.kind == "single":
            lo = plan.hops[0]
            if self._tuned != lo:
                if not dev.tune(lo):
                    raise SdrError("El dongle no puede sintonizar %.3f MHz." % (lo / 1e6))
                time.sleep(0.005)
                dev.read(4096)
                self._tuned = lo
            t0 = time.monotonic()
            fk, db = plan.measure(dev.read(plan.nbytes), lo, self.level_offset)
            place_max(acc, plan.start, plan.disp_bin, fk, db, lo, plan.gap, params["det"])
            fill_gaps(acc)
            self.disp = acc
            self._emit(params, True, 1.0, (time.monotonic() - t0) * 1000, rbw, plan.kind, 1)
            self._monitor_frame(params)
            wait = 1.0 / self.max_fps - (time.monotonic() - t0)
            if wait > 0:
                time.sleep(wait)
            return
        t0 = time.monotonic()
        last = t0
        nh = len(plan.hops)
        for i, lo in enumerate(plan.hops):
            if self._should_stop(ver):
                return
            if not dev.tune(lo):
                continue  # fuera del rango del sintonizador: esos puntos quedan vacíos
            time.sleep(0.005)
            dev.read(4096)  # descarta muestras mientras el PLL se estabiliza
            fk, db = plan.measure(dev.read(plan.nbytes), lo, self.level_offset)
            place_max(acc, plan.start, plan.disp_bin, fk, db, lo, plan.gap, params["det"])
            now = time.monotonic()
            if now - last > 0.25:
                m = ~np.isnan(acc)
                self.disp[m] = acc[m]
                self._emit(params, False, (i + 1) / nh, None, rbw, plan.kind, nh)
                last = now
        if not np.isnan(acc).all():
            fill_gaps(acc)
        self.disp = acc
        self._emit(params, True, 1.0, (time.monotonic() - t0) * 1000, rbw, plan.kind, nh)
        self._monitor_frame(params)

    def _setup_rate(self, fs):
        self.dev.setup(fs, cint(self.conf.get("RTL_PPM"), 0), cbool(self.conf.get("BIAS_TEE")))
        self._fs = fs
        self._tuned = None

    # -- span cero: potencia en una frecuencia vs. tiempo (como el tinySA) ----------------

    def _zspan_cycle(self, ver, params):
        dev = self.dev
        if self._fs != ZFS:
            self._setup_rate(ZFS)
            self._applied = None
        if self._applied != ver:
            dev.set_gain(params["gain"])
            f = params["zf"]
            lo, sign = (f - ZFS / 4, -1) if f - ZFS / 4 >= 0.5e6 else (f + ZFS / 4, 1)
            if not dev.tune(lo):
                raise SdrError("El dongle no puede sintonizar %.3f MHz." % (f / 1e6))
            time.sleep(0.005)
            dev.read(8192)
            self._zmix = np.tile(np.exp(sign * 0.5j * np.pi * np.arange(4)).astype(np.complex64), ZCHUNK // 4)
            self._applied = ver
            self.info["rbw"] = params["zrbw"]
            self.disp = np.full(params["points"], np.nan, dtype=np.float32)
            self._zwait = 0.0
            self._zhit = 0.0
        zt, rbw, npts = params["zt"], params["zrbw"], params["points"]
        trig = params["ztrig"] == "level"
        need = int(zt * ZFS * (2 if trig else 1)) + ZCHUNK
        s1 = radio_mod.FirDecim(radio_mod.lowpass(31, min(110e3, max(2.5 * rbw, 12e3)), ZFS), 4)
        pieces, got = [], 0
        t0 = time.monotonic()
        while got < need:
            if self._should_stop(ver):
                return
            raw = dev.read(ZCHUNK * 2)
            if raw.size < ZCHUNK * 2:
                raise SdrError("Lectura incompleta del SDR.")
            iq = raw.astype(np.float32)
            iq -= 127.5
            iq *= 1.0 / 127.5
            c = np.empty(ZCHUNK, dtype=np.complex64)
            c.real = iq[0::2]
            c.imag = iq[1::2]
            c *= self._zmix
            pieces.append(s1(c))
            got += ZCHUNK
        y = np.concatenate(pieces)
        rate = ZFS / 4
        n_box = max(1, int(round(rate / rbw)))
        if n_box > 1:  # dos promedios móviles en cascada = filtro RBW triangular
            for _ in range(2):
                cs = np.concatenate(([0], np.cumsum(y)))
                y = (cs[n_box:] - cs[:-n_box]) / n_box
        pdb = 10.0 * np.log10(y.real ** 2 + y.imag ** 2 + 1e-15) + self.level_offset
        win = int(zt * rate)
        start = 0
        if trig:
            pre = int(0.1 * win)
            hits = np.flatnonzero(pdb[pre:len(pdb) - win + pre] >= params["zlevel"])
            if hits.size == 0:
                now = time.monotonic()
                if now - self._zwait > 1.0 and now - self._zhit > 2.5:  # sin disparos recientes
                    self._zwait = now
                    self.hub.status("Span cero: esperando una señal por encima del nivel de disparo…", "info")
                return
            start = int(hits[0])
            self._zhit = time.monotonic()
        seg = pdb[start:start + win]
        if seg.size < npts:
            seg = np.interp(np.linspace(0, seg.size - 1, npts), np.arange(seg.size), seg)
        else:
            seg = seg[: (seg.size // npts) * npts].reshape(npts, -1).max(axis=1)
        self.disp = seg.astype(np.float32)
        vals = np.round(self.disp.astype(np.float64), 1).tolist()
        self.hub.publish({"f0": 0.0, "f1": zt, "n": len(vals), "complete": True, "pos": 1.0,
                          "sweep_ms": (time.monotonic() - t0) * 1000, "rbw": rbw, "kind": "zspan", "hops": 1,
                          "gain": params["gain"], "engine": self.engine, "db": vals, "det": "peak", "mode": "zspan",
                          "zf": params["zf"], "trig": trig, "zlevel": params["zlevel"]})
        wait = 1.0 / self.max_fps - (time.monotonic() - t0)
        if wait > 0:
            time.sleep(wait)

    # -- calibración y vigilancia ------------------------------------------------------

    def set_cal(self, k, gain=None):
        if k is not None and not -200.0 < cfloat(k, 999.0) < 200.0:
            raise ValueError("Calibración fuera de rango.")
        self.cal = None if k is None else {"k": round(cfloat(k), 2), "gain": gain, "t": time.time()}
        self.state.update(cal=self.cal)
        return self.cal

    def set_monitor(self, cfg):
        m = dict(self.monitor)
        for k in ("enabled", "notify"):
            if k in cfg:
                m[k] = bool(cfg[k])
        for k in ("limit", "fmin", "fmax"):
            if k in cfg:
                m[k] = None if cfg[k] in (None, "", "off") else cfloat(cfg[k], 0.0)
        if "every" in cfg:
            m["every"] = int(min(max(cint(cfg["every"], 60), 5), 3600))
        if "cooldown" in cfg:
            m["cooldown"] = int(min(max(cint(cfg["cooldown"], 30), 0), 3600))
        self.monitor = m
        self.state.update(monitor=m)
        self.poke()
        return m

    def _monitor_frame(self, params):
        if not self.monitor.get("enabled") or self.disp is None:
            return
        d = self.disp
        now = time.time()
        meta = (params["start"], params["stop"], len(d))
        if self.mon_meta != meta:
            self.mon_meta = meta
            self.mon_rows.clear()
            self._acc = None
        finite = d[np.isfinite(d)]
        if finite.size == 0:
            return
        lim = self.monitor.get("limit")
        thr = lim if lim is not None else float(np.median(finite)) + 10.0
        if self._acc is None:
            self._acc = {"t0": now, "max": np.full(len(d), -np.inf, dtype=np.float32),
                         "above": np.zeros(len(d), dtype=np.int32), "n": 0}
        a = self._acc
        dd = np.where(np.isfinite(d), d, -np.inf)
        a["max"] = np.maximum(a["max"], dd)
        a["above"] += (dd > thr)
        a["n"] += 1
        if now - a["t0"] >= self.monitor.get("every", 60):
            mx = np.where(np.isfinite(a["max"]), np.round(a["max"]), np.nan)
            row = {"t": round(a["t0"]), "max": [None if v != v else int(v) for v in mx.tolist()],
                   "occ": np.round(100.0 * a["above"] / max(1, a["n"])).astype(int).tolist()}
            self.mon_rows.append(row)
            self._acc = None
            try:
                with open(os.path.join(STATE_DIR, "ocupacion.jsonl"), "a", encoding="utf-8") as f:
                    f.write(json.dumps({"f0": meta[0], "f1": meta[1], "n": meta[2], **row}) + "\n")
            except OSError:
                pass
        if lim is None:
            return
        n = len(d)
        f = params["start"] + (np.arange(n) + 0.5) * (params["stop"] - params["start"]) / n
        band = np.ones(n, dtype=bool)
        if self.monitor.get("fmin"):
            band &= f >= self.monitor["fmin"]
        if self.monitor.get("fmax"):
            band &= f <= self.monitor["fmax"]
        cand = np.where(band & np.isfinite(d), d, -np.inf)
        i = int(np.argmax(cand))
        if cand[i] > lim and now - self._last_alarm >= self.monitor.get("cooldown", 30):
            self._last_alarm = now
            ev = {"t": now, "freq": float(f[i]), "level": round(float(cand[i]), 1), "limit": lim}
            self.alarms.append(ev)
            try:
                with open(os.path.join(STATE_DIR, "alarmas.jsonl"), "a", encoding="utf-8") as fh:
                    fh.write(json.dumps(ev) + "\n")
            except OSError:
                pass
            self.hub.status("⚠ Alarma: %.4f MHz a %.1f dB (límite %.0f dB)" % (ev["freq"] / 1e6, ev["level"], lim), "error")
            if self.monitor.get("notify"):
                notify(self.conf, "SDR-Kit: señal en %.4f MHz (%.1f dB)" % (ev["freq"] / 1e6, ev["level"]))

    # -- motores externos: rtl_power / hackrf_sweep --------------------------------

    def _kill_proc(self):
        p = self.proc
        if p is None:
            return
        try:
            p.terminate()
            p.wait(timeout=3)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass
        self.proc = None

    def _csv_command(self, params):
        start, stop = params["start"], params["stop"]
        bin_hz = max(1, int((stop - start) / params["points"]))
        if self.engine == "hackrf":
            if not shutil.which("hackrf_sweep"):
                raise SdrError("No está instalado hackrf_sweep (sudo apt install hackrf).")
            bin_hz = min(max(bin_hz, 2445), 5000000)
            cmd = ["hackrf_sweep", "-f", "%d:%d" % (int(start / 1e6), int(stop / 1e6)), "-w", str(bin_hz),
                   "-l", "32", "-g", str(int(params["gain"]) if params["gain"] != "auto" else 20)]
            if cbool(self.conf.get("BIAS_TEE")):
                cmd += ["-p", "1"]
            return cmd
        if not shutil.which("rtl_power"):
            raise SdrError("No está instalado rtl_power (sudo apt install rtl-sdr).")
        cmd = ["rtl_power", "-f", "%d:%d:%d" % (int(start), int(stop), bin_hz), "-i", "1", "-c", "25%",
               "-d", str(cint(self.conf.get("RTL_DEVICE_INDEX"), 0))]
        if params["gain"] != "auto":
            cmd += ["-g", "%.1f" % float(params["gain"])]
        ppm = cint(self.conf.get("RTL_PPM"), 0)
        if ppm:
            cmd += ["-p", str(ppm)]
        cmd.append("-")
        return cmd

    def _csv_cycle(self, ver, params):
        if np is None:
            raise SdrError("Falta numpy (sudo apt install python3-numpy).")
        if self.proc is None or self._applied != ver:
            self._kill_proc()
            cmd = self._csv_command(params)
            self.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self._new_display(params)
            self._applied = ver
            self._csv_buf = b""
            self._csv_first = None
            self._csv_lines = 0
            self._csv_t0 = time.monotonic()
            self._csv_last_emit = 0.0
            self._csv_err = []
            threading.Thread(target=self._drain_stderr, args=(self.proc,), daemon=True).start()
            self.info.update(device="hackrf_sweep" if self.engine == "hackrf" else "rtl_power", running=True)
            self.hub.status("Analizador activo con %s" % self.info["device"], "ok")
        proc = self.proc
        if proc is None:
            return
        disp_bin = (params["stop"] - params["start"]) / params["points"]
        fd = proc.stdout.fileno()
        deadline = time.monotonic() + 0.5
        while time.monotonic() < deadline:
            if self._should_stop(ver):
                return
            r, _, _ = select.select([fd], [], [], 0.3)
            if not r:
                if self._csv_lines and self.engine == "rtl_power":
                    self._csv_complete(params)
                break
            try:
                chunk = os.read(fd, 65536)
            except OSError:
                chunk = b""
            if not chunk:
                if self._should_stop(ver):
                    return  # lo detuvimos nosotros (cambio de parámetros o de modo)
                err = " ".join(self._csv_err[-3:]) or "el proceso terminó"
                self._kill_proc()
                raise SdrError("%s se detuvo: %s" % (self.info["device"], err))
            self._csv_buf += chunk
            *lines, self._csv_buf = self._csv_buf.split(b"\n")
            for line in lines:
                parts = line.decode("ascii", "ignore").split(",")
                if len(parts) < 7:
                    continue
                try:
                    low, high, step = float(parts[2]), float(parts[3]), float(parts[4])
                    vals = np.array([float(x) for x in parts[6:] if x.strip() not in ("", "nan", "-nan")],
                                    dtype=np.float32)
                except ValueError:
                    continue
                if vals.size == 0 or step <= 0:
                    continue
                if self._csv_first is None:
                    self._csv_first = low
                elif abs(low - self._csv_first) < 1.0 and self._csv_lines:
                    self._csv_complete(params)
                fk = low + (np.arange(vals.size) + 0.5) * step
                place(self.disp, params["start"], disp_bin, fk, vals + self.level_offset)
                self._csv_lastf = float(fk[-1])
                self._csv_lines += 1
                self.info["rbw"] = step
            now = time.monotonic()
            if now - self._csv_last_emit > 0.3 and self._csv_lines:
                span = params["stop"] - params["start"]
                lastf = getattr(self, "_csv_lastf", params["stop"])
                pos = 1.0 if self.engine == "rtl_power" else max(0.0, min(1.0, (lastf - params["start"]) / span))
                self._emit(params, False, pos, None, self.info["rbw"], "hop", 0)
                self._csv_last_emit = now

    def _csv_complete(self, params):
        now = time.monotonic()
        if now - getattr(self, "_csv_last_complete", 0.0) >= 1.0 / self.max_fps:
            self._emit(params, True, 1.0, (now - self._csv_t0) * 1000, self.info["rbw"], "hop", self._csv_lines)
            self._csv_last_complete = now
            self._monitor_frame(params)
        self._csv_t0 = now
        self._csv_lines = 0
        self._csv_last_emit = now

    def _drain_stderr(self, proc):
        try:
            for line in proc.stderr:
                txt = line.decode("utf-8", "replace").strip()
                if txt:
                    self._csv_err = (getattr(self, "_csv_err", []) + [txt])[-10:]
        except Exception:
            pass


# ----------------------------------------------------------------------------
# OpenWebRX+ (receptor para escuchar)
# ----------------------------------------------------------------------------

def guess_mod(freq):
    f = freq / 1e6
    if 87.5 <= f <= 108.0:
        return "wfm"
    if 108.0 < f < 137.0 or f < 1.8 or 26.9 <= f <= 27.5 or 2.3 <= f <= 26.1:
        return "am"
    if 1.8 <= f < 30.0:
        return "usb" if f > 10.0 else "lsb"
    return "nfm"


def owrx_profiles(region, model):
    """Perfiles de bandas listos para usar (cada uno cubre ~2.4 MHz)."""
    P = {}
    europe = str(region).lower().startswith("eu")

    def add(pid, name, center, sr, start, mod, step, **extra):
        P[pid] = dict(name=name, center_freq=int(round(center)), samp_rate=int(sr), start_freq=int(round(start)),
                      start_mod=mod, tuning_step=str(step), **extra)

    for i in range(10):  # FM comercial en tramos de 2 MHz (87.8–108.2)
        c = 89.0 + 2 * i
        add("fm%02d" % (i + 1), "FM comercial %.1f–%.1f MHz" % (c - 1.2, c + 1.2), c * 1e6, 2400000,
            (c - 0.3) * 1e6, "wfm", 50000)
    step_air = 8330 if europe else 25000
    for i, c in enumerate([119.2, 121.6, 124.0, 126.4, 128.8, 131.2, 133.6, 136.0]):
        name = "Aviación %.1f–%.1f MHz (AM)" % (c - 1.2, c + 1.2)
        start = 121.5 if c == 121.6 else c - 0.5
        if c == 121.6:
            name += " · 121.5 emergencia"
        add("air%d" % (i + 1), name, c * 1e6, 2400000, start * 1e6, "am", step_air)
    if europe:
        add("ham2m", "Radioaficionados 2 m (144–146 MHz)", 145.2e6, 2400000, 145.5e6, "nfm", 12500)
    else:
        add("ham2m_a", "Radioaficionados 2 m (144–146.4)", 145.2e6, 2400000, 145.0e6, "nfm", 5000)
        add("ham2m_b", "Radioaficionados 2 m (146–148.4) repetidoras", 147.2e6, 2400000, 146.52e6, "nfm", 5000)
    add("marine", "Marina VHF (155.8–158.2 · canal 16)", 157.0e6, 2400000, 156.8e6, "nfm", 25000)
    add("uhf433", "ISM 433 MHz + 70 cm (432.8–435.2)", 434.0e6, 2400000, 433.92e6, "nfm", 12500)
    if europe:
        add("pmr446", "PMR446 walkie-talkies", 446.6e6, 2400000, 446.00625e6, "nfm", 6250)
    else:
        add("frs", "FRS/GMRS walkie-talkies (461.4–463.8)", 462.6e6, 2400000, 462.5625e6, "nfm", 12500)
    add("adsb", "ADS-B aviones 1090 MHz", 1090e6, 2400000, 1090e6, "nfm", 25000)
    model = str(model).lower()
    if model in ("v4", "v3"):
        hf = {"direct_sampling": 2} if model == "v3" else {}
        add("am_mw", "AM onda media (0–2.4 MHz)", 1.2e6, 2400000, 1.0e6, "am", 5000, **hf)
        add("sw49", "Onda corta 49 m (5.8–6.3 MHz)", 6.05e6, 1024000, 6.0e6, "am", 5000, **hf)
        add("cb27", "Banda ciudadana CB 27 MHz", 27.2e6, 1024000, 27.185e6, "am", 5000, **hf)
    return P


def owrx_seed(conf, path=OWRX_SETTINGS, force=False):
    s = read_json(path)
    if not isinstance(s, dict):
        s = {}
    if s.get("sdrs") and not force:
        return False
    if "version" not in s:
        s["version"] = OWRX_CONFIG_VERSION
    europe = str(conf.get("REGION", "americas")).lower().startswith("eu")
    s.update({
        "receiver_name": conf.get("RECEIVER_NAME") or "SDR-Kit",
        "receiver_location": conf.get("RECEIVER_LOCATION", ""),
        "receiver_admin": "",
        "photo_title": "SDR-Kit · Raspberry Pi Zero 2 W",
        "max_clients": 3,
        "max_clients_per_ip": 3,
        "allow_center_freq_changes": True,
        "magic_key": "",
        "wfm_deemphasis_tau": 50e-6 if europe else 75e-6,
    })
    dev = {
        "name": "RTL-SDR",
        "type": "rtl_sdr",
        "enabled": True,
        "rf_gain": 30,
        "always-on": False,
        "services": False,
        "profiles": owrx_profiles(conf.get("REGION"), conf.get("RTL_MODEL", "v4")),
    }
    ppm = cint(conf.get("RTL_PPM"), 0)
    if ppm:
        dev["ppm"] = ppm
    if cbool(conf.get("BIAS_TEE")):
        dev["bias_tee"] = True
    s["sdrs"] = {"rtlsdr": dev}
    write_json_atomic(path, s, owner="openwebrx")
    return True


def owrx_write_target(conf, freq, mod, tuner=None, path=OWRX_SETTINGS):
    s = read_json(path)
    if not isinstance(s, dict) or not isinstance(s.get("sdrs"), dict) or not s["sdrs"]:
        owrx_seed(conf, path, force=True)
        s = read_json(path)
    sdrs = s["sdrs"]
    rtl_types = ("rtl_sdr", "rtl_sdr_soapy", "rtl_tcp")
    dev_id = next((k for k, v in sdrs.items() if isinstance(v, dict) and v.get("type") in rtl_types
                   and v.get("enabled", True)), None) or next(iter(sdrs))
    dev = sdrs[dev_id]
    profiles = dev.get("profiles") or {}
    profiles.pop(TARGET_PROFILE, None)
    sr = 2400000 if mod == "wfm" else 2048000
    center = freq + 0.25 * sr  # la señal queda fuera del pico de DC del centro
    if center > RTL_MAX_HZ:
        center = freq - 0.25 * sr
    step = {"wfm": 50000, "am": 5000, "nfm": 5000}.get(mod, 1000)
    tgt = {"name": "📍 Desde el analizador: %.4f MHz" % (freq / 1e6), "center_freq": int(round(center)),
           "samp_rate": sr, "start_freq": int(round(freq)), "start_mod": mod, "tuning_step": str(step)}
    if tuner == 5 and freq < 24e6:
        tgt["direct_sampling"] = 2
    dev["profiles"] = dict([(TARGET_PROFILE, tgt)] + list(profiles.items()))
    write_json_atomic(path, s, owner="openwebrx")
    return dev_id


class Receiver:
    def __init__(self, conf, managed):
        self.conf = conf
        self.port = cint(conf.get("OWRX_PORT"), 8073)
        self.managed = managed

    def installed(self):
        return os.path.exists("/usr/bin/openwebrx") or os.path.exists("/lib/systemd/system/openwebrx.service")

    def active(self):
        if not self.managed:
            return False
        rc, out, _ = run(["systemctl", "is-active", "openwebrx"], timeout=5)
        return out.strip() in ("active", "activating")

    def ready(self):
        try:
            with socket.create_connection(("127.0.0.1", self.port), timeout=0.4):
                return True
        except OSError:
            return False

    def start(self, restart=False):
        if self.managed:
            run(["systemctl", "restart" if restart else "start", "openwebrx"], timeout=90)

    def stop(self):
        if self.managed:
            run(["systemctl", "stop", "openwebrx"], timeout=60)


# ----------------------------------------------------------------------------
# Estado persistente y modos (Analizador / Receptor)
# ----------------------------------------------------------------------------

class State:
    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        self.data = read_json(path) or {}

    def get(self, key, default=None):
        return self.data.get(key, default)

    def update(self, **kw):
        with self.lock:
            self.data.update(kw)
            try:
                os.makedirs(os.path.dirname(self.path), exist_ok=True)
                write_json_atomic(self.path, self.data)
            except OSError as e:
                log("No se pudo guardar el estado:", e)


class ModeManager:
    """Un solo dueño del dongle a la vez: analizador, radio (propio) o receptor OpenWebRX+."""

    def __init__(self, conf, sweep, receiver, state, hub, radio=None, sensors=None, adsb=None):
        self.conf = conf
        self.sweep = sweep
        self.radio = radio
        self.sensors = sensors
        self.adsb = adsb
        self.rx = receiver
        self.state = state
        self.hub = hub
        self.lock = threading.Lock()
        self.mode = "idle"
        self.busy = False
        self.msg = ""

    def boot(self):
        dm = str(self.conf.get("DEFAULT_MODE", "last")).lower()
        mode = self.state.get("mode", "sweep") if dm == "last" else dm
        if mode not in ("sweep", "radio", "sensors", "adsb", "receiver", "idle"):
            mode = "sweep"
        self.switch(mode, background=True)

    def switch(self, mode, freq=None, mod=None, background=True):
        if background:
            threading.Thread(target=self._switch, args=(mode, freq, mod), daemon=True).start()
            return True
        return self._switch(mode, freq, mod)

    def _switch(self, mode, freq, mod):
        engines = {"sweep": self.sweep, "radio": self.radio, "sensors": self.sensors, "adsb": self.adsb}
        with self.lock:
            self.busy = True
            try:
                if mode in engines and engines[mode] is not None:
                    self.msg = "Liberando el dongle…"
                    for name, eng in engines.items():
                        if name != mode and eng is not None:
                            eng.disable()
                    self.rx.stop()
                    if mode == "radio" and freq:
                        self.radio.set_params({"freq": float(freq), "mod": mod if mod in radio_mod.MODES else guess_mod(float(freq))})
                    engines[mode].enable()
                elif mode == "receiver":
                    for eng in engines.values():
                        if eng is not None:
                            eng.disable()
                    restart = False
                    if freq:
                        mod = mod if mod in ("wfm", "nfm", "am", "usb", "lsb", "cw", "sam") else guess_mod(freq)
                        try:
                            owrx_write_target(self.conf, float(freq), mod, self.sweep.info.get("tuner_id"))
                            restart = True
                        except Exception as e:
                            log("No se pudo escribir el perfil en OpenWebRX:", e)
                    self.msg = "Iniciando receptor OpenWebRX+…"
                    self.rx.start(restart=restart)
                else:
                    for eng in engines.values():
                        if eng is not None:
                            eng.disable()
                    self.rx.stop()
                self.mode = mode
                self.state.update(mode=mode)
                self.msg = ""
                return True
            finally:
                self.busy = False


# ----------------------------------------------------------------------------
# Sistema y red
# ----------------------------------------------------------------------------

class SysInfo:
    def __init__(self):
        self._cpu_prev = None
        self.cpu = 0.0
        self._thr = (0, None)
        self._ts = (0, None)
        threading.Thread(target=self._cpu_loop, daemon=True).start()

    def _cpu_loop(self):
        while True:
            try:
                with open("/proc/stat") as f:
                    vals = [int(x) for x in f.readline().split()[1:]]
                idle, total = vals[3] + (vals[4] if len(vals) > 4 else 0), sum(vals)
                if self._cpu_prev:
                    di, dt = idle - self._cpu_prev[0], total - self._cpu_prev[1]
                    self.cpu = round(100.0 * (1 - di / dt), 1) if dt > 0 else 0.0
                self._cpu_prev = (idle, total)
            except (OSError, ValueError, IndexError):
                pass
            time.sleep(2)

    @staticmethod
    def temp():
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                return round(int(f.read().strip()) / 1000.0, 1)
        except (OSError, ValueError):
            return None

    def throttled(self):
        now = time.time()
        if now - self._thr[0] < 5:
            return self._thr[1]
        res = None
        if shutil.which("vcgencmd"):
            rc, out, _ = run(["vcgencmd", "get_throttled"], timeout=3)
            m = re.search(r"0x([0-9a-fA-F]+)", out)
            if m:
                v = int(m.group(1), 16)
                res = {"raw": hex(v), "undervoltage_now": bool(v & 1), "capped_now": bool(v & 2),
                       "throttled_now": bool(v & 4), "templimit_now": bool(v & 8),
                       "undervoltage_past": bool(v & 0x10000), "throttled_past": bool(v & 0x40000)}
        self._thr = (now, res)
        return res

    def tailscale_ip(self):
        now = time.time()
        if now - self._ts[0] < 30:
            return self._ts[1]
        ip = None
        if shutil.which("tailscale"):
            rc, out, _ = run(["tailscale", "ip", "-4"], timeout=4)
            if rc == 0 and out.strip():
                ip = out.strip().splitlines()[0]
        self._ts = (now, ip)
        return ip

    def snapshot(self):
        mem_total = mem_avail = 0
        try:
            with open("/proc/meminfo") as f:
                for line in f:
                    k, v = line.split(":", 1)
                    if k == "MemTotal":
                        mem_total = int(v.split()[0]) * 1024
                    elif k == "MemAvailable":
                        mem_avail = int(v.split()[0]) * 1024
        except (OSError, ValueError):
            pass
        try:
            du = shutil.disk_usage("/")
            disk = (du.used, du.total)
        except OSError:
            disk = (0, 0)
        try:
            with open("/proc/uptime") as f:
                up = float(f.read().split()[0])
        except (OSError, ValueError):
            up = 0
        return {"temp": self.temp(), "cpu": self.cpu, "load": [round(x, 2) for x in os.getloadavg()],
                "mem_used": mem_total - mem_avail, "mem_total": mem_total, "disk_used": disk[0],
                "disk_total": disk[1], "uptime": int(up), "throttled": self.throttled()}


def local_ips():
    rc, out, _ = run(["ip", "-4", "-o", "addr", "show"], timeout=3)
    ips = []
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 4 and parts[1] != "lo":
            ips.append({"iface": parts[1], "ip": parts[3].split("/")[0]})
    return ips


class WiFi:
    def __init__(self, conf, demo=False):
        self.conf = conf
        self.iface = conf.get("WIFI_IFACE", "wlan0")
        self.hs = conf.get("HOTSPOT_CON", "sdrkit-hotspot")
        self.demo = demo
        self.available = bool(shutil.which("nmcli")) and not demo
        self.modefile = "/run/sdrkit/netmode"
        self._cache = (0, None)

    def forced(self):
        try:
            with open(self.modefile) as f:
                return f.read().strip() or "auto"
        except OSError:
            return "auto"

    def _set_forced(self, mode):
        try:
            os.makedirs(os.path.dirname(self.modefile), exist_ok=True)
            with open(self.modefile, "w") as f:
                f.write(mode + "\n")
        except OSError as e:
            log("No se pudo escribir", self.modefile, e)

    def summary(self, fresh=False):
        now = time.time()
        if not fresh and now - self._cache[0] < 3 and self._cache[1]:
            return self._cache[1]
        if not self.available:
            res = {"mode": "client", "ssid": "Red de demostración", "connection": "demo", "stations": 0,
                   "forced": "auto", "available": False}
        else:
            rc, out, _ = run(["nmcli", "-t", "-f", "GENERAL.STATE,GENERAL.CONNECTION", "device", "show", self.iface])
            state, con = "", ""
            for line in out.splitlines():
                k, _, v = line.partition(":")
                if k == "GENERAL.STATE":
                    state = v
                elif k == "GENERAL.CONNECTION":
                    con = v
            connected = state.startswith("100")
            if connected and con == self.hs:
                mode = "hotspot"
            elif connected:
                mode = "client"
            elif state.split(" ")[0] in ("40", "50", "60", "70", "80", "90"):
                mode = "connecting"
            else:
                mode = "none"
            ssid = self.conf.get("HOTSPOT_SSID") if mode == "hotspot" else ""
            if mode == "client" and con:
                rc, o2, _ = run(["nmcli", "-g", "802-11-wireless.ssid", "connection", "show", con])
                ssid = o2.strip() or con
            stations = 0
            if mode == "hotspot" and shutil.which("iw"):
                rc, o3, _ = run(["iw", "dev", self.iface, "station", "dump"], timeout=3)
                stations = sum(1 for line in o3.splitlines() if line.startswith("Station"))
            res = {"mode": mode, "ssid": ssid, "connection": con, "stations": stations,
                   "forced": self.forced(), "available": True}
        self._cache = (now, res)
        return res

    def saved(self):
        if not self.available:
            return [{"name": "HomeWiFi", "uuid": "demo-1", "ssid": "HomeWiFi", "priority": 10, "autoconnect": True}]
        rc, out, _ = run(["nmcli", "-t", "-f", "NAME,UUID,TYPE,AUTOCONNECT,AUTOCONNECT-PRIORITY", "connection", "show"])
        res = []
        for line in out.splitlines():
            f = nm_split(line)
            if len(f) < 5 or f[2] != "802-11-wireless" or f[0] == self.hs:
                continue
            rc, o2, _ = run(["nmcli", "-g", "802-11-wireless.ssid,802-11-wireless.mode", "connection", "show", f[1]])
            lines = o2.splitlines()
            ssid = lines[0] if lines else f[0]
            mode = lines[1] if len(lines) > 1 else ""
            if mode == "ap":
                continue
            res.append({"name": f[0], "uuid": f[1], "ssid": ssid, "autoconnect": f[3] == "yes",
                        "priority": cint(f[4], 0)})
        res.sort(key=lambda x: -x["priority"])
        return res

    def scan(self):
        if not self.available:
            return [{"ssid": "HomeWiFi", "signal": 80, "security": "WPA2"}, {"ssid": "Neighbor-5G", "signal": 35, "security": "WPA2"}]
        if self.summary(fresh=True)["mode"] == "hotspot":
            raise ValueError("En modo hotspot la Raspberry no puede buscar redes. Escribe el nombre de la red a mano.")
        run(["nmcli", "device", "wifi", "rescan", "ifname", self.iface], timeout=20)
        time.sleep(2)
        rc, out, _ = run(["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "list", "ifname", self.iface])
        best = {}
        for line in out.splitlines():
            f = nm_split(line)
            if len(f) < 3 or not f[0]:
                continue
            sig = cint(f[1], 0)
            if f[0] not in best or best[f[0]]["signal"] < sig:
                best[f[0]] = {"ssid": f[0], "signal": sig, "security": f[2] or "abierta"}
        return sorted(best.values(), key=lambda x: -x["signal"])

    def add(self, ssid, password, hidden=False):
        ssid = (ssid or "").strip()
        if not ssid or len(ssid.encode()) > 32:
            raise ValueError("Nombre de red inválido.")
        if password and not (8 <= len(password) <= 63):
            raise ValueError("La clave WiFi debe tener entre 8 y 63 caracteres.")
        if not self.available:
            return "demo"
        name = "sdrkit-" + re.sub(r"[^A-Za-z0-9_.-]", "_", ssid)[:40]
        for c in self.saved():
            if c["ssid"] == ssid:
                run(["nmcli", "connection", "delete", "uuid", c["uuid"]])
        cmd = ["nmcli", "connection", "add", "type", "wifi", "ifname", self.iface, "con-name", name,
               "ssid", ssid, "connection.autoconnect", "yes", "connection.autoconnect-priority", "20",
               "802-11-wireless.hidden", "yes" if hidden else "no"]
        if password:
            cmd += ["wifi-sec.key-mgmt", "wpa-psk", "wifi-sec.psk", password]
        rc, out, err = run(cmd, timeout=20)
        if rc != 0:
            raise ValueError("nmcli: " + (err.strip() or out.strip()))
        rc, out, _ = run(["nmcli", "-g", "connection.uuid", "connection", "show", name])
        return out.strip()

    def delete(self, uuid):
        if not self.available:
            return
        if not re.match(r"^[0-9a-fA-F-]{36}$", uuid or ""):
            raise ValueError("Conexión inválida.")
        run(["nmcli", "connection", "delete", "uuid", uuid])

    def connect(self, uuid):
        if not self.available:
            return
        if not re.match(r"^[0-9a-fA-F-]{36}$", uuid or ""):
            raise ValueError("Conexión inválida.")
        self._set_forced("auto")

        def job():
            time.sleep(1.5)  # deja que la respuesta HTTP llegue al teléfono
            run(["nmcli", "connection", "down", self.hs], timeout=20)
            rc, out, err = run(["nmcli", "--wait", "40", "connection", "up", "uuid", uuid, "ifname", self.iface],
                               timeout=60)
            log("Conexión WiFi:", rc, out.strip(), err.strip())
            # si falla, sdrkit-netwatch vuelve a levantar el hotspot automáticamente

        threading.Thread(target=job, daemon=True).start()

    def set_mode(self, mode):
        if mode not in ("auto", "hotspot"):
            raise ValueError("Modo inválido.")
        if not self.available:
            return
        self._set_forced(mode)

        def job():
            time.sleep(1.5)
            if mode == "hotspot":
                run(["nmcli", "connection", "up", self.hs], timeout=40)
            else:
                run(["nmcli", "connection", "down", self.hs], timeout=20)
                # NetworkManager se conectará solo a una red conocida; si no hay, netwatch reactiva el hotspot

        threading.Thread(target=job, daemon=True).start()


# ----------------------------------------------------------------------------
# Servidor web
# ----------------------------------------------------------------------------

class App:
    def __init__(self, conf, demo=False):
        self.conf = conf
        self.demo = demo
        os.makedirs(STATE_DIR, exist_ok=True)
        self.state = State(os.path.join(STATE_DIR, "state.json"))
        self.hub = Hub()
        self.sweep = SweepManager(conf, self.hub, self.state, demo)
        managed = (not demo) and bool(shutil.which("systemctl")) and os.geteuid() == 0
        self.receiver = Receiver(conf, managed)
        if demo:
            open_dev = FakeSdr
        else:
            open_dev = lambda: RtlSdr(cint(conf.get("RTL_DEVICE_INDEX"), 0))  # noqa: E731
        self.radio = radio_mod.RadioManager(conf, self.state, open_dev, SdrError, STATE_DIR, demo)
        self.sensors = dec_mod.SensorsManager(conf, self.state, STATE_DIR, demo)
        self.adsb = dec_mod.AdsbManager(conf, self.state, STATE_DIR, demo)
        self.modes = ModeManager(conf, self.sweep, self.receiver, self.state, self.hub, self.radio,
                                 self.sensors, self.adsb)
        self.sys = SysInfo()
        self.wifi = WiFi(conf, demo)
        self.password = conf.get("ADMIN_PASSWORD", "")
        self._login_fails = {}
        self._login_lock = threading.Lock()
        self.secret = self._secret()
        self.started = time.time()

    def _secret(self):
        path = os.path.join(STATE_DIR, "secret")
        try:
            with open(path, "rb") as f:
                s = f.read()
                if len(s) >= 32:
                    return s
        except OSError:
            pass
        s = secrets.token_bytes(32)
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "wb") as f:
                f.write(s)
        except OSError:
            pass
        return s

    # -- límite de intentos de login (por IP, en memoria) --
    LOGIN_MAX_FAILS = 5
    LOGIN_WINDOW = 300

    def login_locked(self, ip):
        """Segundos que faltan para poder reintentar, o 0 si la IP puede probar."""
        now = time.time()
        with self._login_lock:
            fails = [t for t in self._login_fails.get(ip, []) if now - t < self.LOGIN_WINDOW]
            self._login_fails[ip] = fails
            if len(fails) >= self.LOGIN_MAX_FAILS:
                return max(1, int(self.LOGIN_WINDOW - (now - fails[0])))
        return 0

    def login_failed(self, ip):
        with self._login_lock:
            self._login_fails.setdefault(ip, []).append(time.time())

    def login_ok(self, ip):
        with self._login_lock:
            self._login_fails.pop(ip, None)

    def token(self):
        return hmac.new(self.secret, ("v1:" + self.password).encode(), hashlib.sha256).hexdigest()

    # -- actualizaciones desde GitHub ------------------------------------------
    def commit(self):
        try:
            with open(os.path.join(STATE_DIR, "commit"), encoding="utf-8") as f:
                return f.read().strip()[:7] or None
        except OSError:
            return None

    def update_check(self):
        if self.demo:
            return {"ok": True, "online": True, "demo": True, "current": VERSION, "latest": VERSION, "behind": 0,
                    "changes": [], "current_commit": "demo", "latest_commit": "demo"}
        if not os.path.exists(UPDATER):
            return {"ok": False, "online": None, "error": "Falta el actualizador: reinstala el kit."}
        rc, out, err = run(["bash", UPDATER, "--buscar", "--json"], timeout=60)
        try:
            return json.loads(out.strip().splitlines()[-1])
        except (ValueError, IndexError):
            return {"ok": False, "online": None, "error": (err or out or "sin respuesta").strip()[-300:]}

    def update_apply(self):
        if self.demo:
            return {"ok": True, "demo": True}
        if not os.path.exists(UPDATER):
            raise ValueError("Falta el actualizador: reinstala el kit.")
        if run(["systemctl", "is-active", "--quiet", "sdrkit-update"], timeout=5)[0] == 0:
            raise ValueError("Ya hay una actualización en curso.")
        # copia en /run y corre en su propia unidad: sobrevive al reinicio del panel durante la actualización
        shutil.copy(UPDATER, "/run/sdrkit-update.sh")
        rc, out, err = run(["systemd-run", "--unit=sdrkit-update", "--collect", "--description=Actualizar SDR-Kit",
                            "/bin/bash", "/run/sdrkit-update.sh", "--si"], timeout=15)
        if rc != 0:
            raise ValueError("No se pudo iniciar la actualización: %s" % (err or out).strip())
        return {"ok": True}

    def update_log(self):
        if self.demo:
            return "Modo demo: aquí verías el avance de la actualización."
        try:
            with open("/var/log/sdrkit-update.log", encoding="utf-8", errors="replace") as f:
                return "".join(f.readlines()[-40:])
        except OSError:
            return ""

    def status(self):
        info = dict(self.sweep.info)
        info["clients"] = self.hub.clients
        net = self.wifi.summary()
        return {
            "version": VERSION, "commit": self.commit(), "hostname": socket.gethostname(), "demo": self.demo,
            "mode": self.modes.mode, "switching": self.modes.busy, "mode_msg": self.modes.msg,
            "owrx": {"installed": self.receiver.installed() or self.demo, "active": self.receiver.active(),
                     "ready": self.receiver.ready(), "port": self.receiver.port},
            "sweep": info, "params": self.sweep.params, "sys": self.sys.snapshot(),
            "net": dict(net, ips=local_ips(), tailscale=self.sys.tailscale_ip(),
                        hotspot_ssid=self.conf.get("HOTSPOT_SSID"), hotspot_ip=self.conf.get("HOTSPOT_IP")),
            "usb": usb_devices(), "region": self.conf.get("REGION", "americas"),
            "auth": bool(self.password),
            "radio": {"running": self.radio.info.get("running"), "error": self.radio.info.get("error"),
                      "monitoring": self.radio.monitoring(), "params": self.radio.params},
            "sensors": {"running": self.sensors.info.get("running"), "error": self.sensors.info.get("error")},
            "adsb": {"running": self.adsb.info.get("running"), "error": self.adsb.info.get("error")},
            "monitor": self.sweep.monitor,
        }


LOGIN_HTML = """<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>SDR-Kit · Entrar</title>
<style>
:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0e12;
color:#e8edf2;font:16px system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
form{width:min(340px,calc(100vw - 32px));background:#141a21;border:1px solid #243040;border-radius:14px;padding:24px}
h1{font-size:20px;margin:0 0 4px}p{color:#8a98a8;margin:0 0 18px;font-size:14px}
input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #2c3a4b;background:#0b0e12;
color:inherit;font-size:16px}button{margin-top:14px;width:100%;padding:12px;border:0;border-radius:10px;
background:#ffd400;color:#111;font-weight:700;font-size:16px}.e{color:#ff6b6b;font-size:14px;margin-top:10px}
</style></head><body><form method="post" action="/login"><h1>SDR-Kit</h1>
<p data-en="Enter the panel password (ADMIN_PASSWORD).">Escribe la clave del panel (ADMIN_PASSWORD).</p>
<input type="password" name="password" autocomplete="current-password" autofocus placeholder="Clave"
data-en-ph="Password">
<button type="submit" data-en="Sign in">Entrar</button>__ERR__</form>
<script>
/* idioma: ?lang= → localStorage sdrkit.lang (el mismo que usa el panel) → idioma del navegador */
(function () {
  var l = "", q = /[?&]lang=(es|en)\\b/.exec(location.search);
  try { l = localStorage.getItem("sdrkit.lang") || ""; } catch (e) {}
  if (q) { l = q[1]; try { localStorage.setItem("sdrkit.lang", l); } catch (e) {} }
  if (l !== "es" && l !== "en") {
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    l = /^es\\b/i.test(n) ? "es" : "en";
  }
  document.documentElement.lang = l;
  if (l !== "en") return;
  document.title = "SDR-Kit \\u00b7 Sign in";
  var els = document.querySelectorAll("[data-en]");
  for (var i = 0; i < els.length; i++) els[i].textContent = els[i].getAttribute("data-en");
  els = document.querySelectorAll("[data-en-ph]");
  for (i = 0; i < els.length; i++) els[i].setAttribute("placeholder", els[i].getAttribute("data-en-ph"));
})();
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    server_version = "SDRKit/" + VERSION
    app = None  # se asigna en main()

    def log_message(self, fmt, *args):
        pass

    # -- utilidades --
    def _send(self, code, body, ctype="application/json; charset=utf-8", headers=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "same-origin")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json_body(self):
        n = cint(self.headers.get("Content-Length"), 0)
        if n <= 0 or n > 65536:
            return {}
        raw = self.rfile.read(n)
        ctype = self.headers.get("Content-Type", "")
        if "application/x-www-form-urlencoded" in ctype:
            return {k: v[0] for k, v in parse_qs(raw.decode("utf-8", "replace")).items()}
        try:
            d = json.loads(raw.decode("utf-8"))
            return d if isinstance(d, dict) else {}
        except ValueError:
            return {}

    def _same_origin(self):
        """Defensa contra CSRF: si el navegador manda Origin, debe coincidir con el Host del panel."""
        origin = self.headers.get("Origin")
        if not origin or origin == "null":
            return origin is None
        return urlparse(origin).netloc.lower() == (self.headers.get("Host") or "").lower()

    def _authed(self):
        app = self.app
        if not app.password:
            return True
        cookie = self.headers.get("Cookie", "")
        for part in cookie.split(";"):
            k, _, v = part.strip().partition("=")
            if k == "sdrkit_auth" and hmac.compare_digest(v, app.token()):
                return True
        return False

    # -- rutas --
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        u = urlparse(self.path)
        path = u.path
        if path == "/login":
            return self._send(200, LOGIN_HTML.replace("__ERR__", ""), "text/html; charset=utf-8")
        if path == "/logout":
            return self._send(302, "", headers={"Location": "/login",
                                                "Set-Cookie": "sdrkit_auth=; Path=/; Max-Age=0; SameSite=Lax"})
        if path in ("/favicon.svg", "/icon.svg", "/manifest.webmanifest"):
            return self._static(path.lstrip("/"))
        if not self._authed():
            if path.startswith("/api/"):
                return self._send(401, {"error": "auth"})
            return self._send(302, "", headers={"Location": "/login"})
        if path in ("/", "/index.html"):
            return self._static("index.html")
        if re.match(r"^/[a-z0-9_-]+\.(js|css)$", path):
            return self._static(path.lstrip("/"))
        q = parse_qs(u.query)
        app = self.app
        if path == "/api/radio":
            return self._send(200, {"params": app.radio.params, "info": app.radio.info, "live": app.radio.live,
                                    "modes": radio_mod.MODE_NAMES, "usage": app.radio.recorder.usage()})
        if path == "/api/radio/stream":
            return self._radio_stream()
        if path == "/api/radio/audio":
            return self._audio()
        if path == "/api/memories":
            return self._send(200, {"items": app.radio.memories.list()})
        if path == "/api/recordings":
            return self._send(200, {"items": app.radio.recorder.list(), "usage": app.radio.recorder.usage()})
        if path == "/api/recordings/file":
            fp = app.radio.recorder.path_of((q.get("f") or [""])[0])
            if not fp:
                return self._send(404, {"error": "no encontrado"})
            return self._send_file(fp, "audio/wav", os.path.basename(fp) if q.get("dl") else None)
        if path == "/api/recordings/zip":
            return self._zip(q.get("f") or [])
        if path == "/api/activity":
            return self._send(200, {"items": app.radio.activity.list(cint((q.get("n") or ["300"])[0], 300))})
        if path == "/api/activity.csv":
            return self._activity_csv()
        if path == "/api/monitor":
            sw = app.sweep
            return self._send(200, {"config": sw.monitor, "alarms": list(sw.alarms)[-60:][::-1], "rows": len(sw.mon_rows),
                                    "meta": sw.mon_meta, "cal": sw.cal,
                                    "ntfy": bool(app.conf.get("NTFY_TOPIC"))})
        if path == "/api/monitor/data":
            return self._send(200, self._monitor_data(cint((q.get("cols") or ["400"])[0], 400)))
        if path == "/api/monitor.csv":
            return self._monitor_csv()
        if path == "/api/sensors":
            return self._send(200, app.sensors.snapshot())
        if path == "/api/adsb":
            return self._send(200, app.adsb.snapshot())
        if path == "/api/decoders":
            st = dec_mod.status()
            st["kinds"] = {k: v[0] for k, v in dec_mod.MULTIMON_KINDS.items()}
            return self._send(200, st)
        if path == "/api/decoded":
            return self._send(200, {"items": app.radio.decoded.list(cint((q.get("n") or ["300"])[0], 300))})
        if path == "/api/decoded.csv":
            rows = ["fecha,hora,frecuencia_mhz,tipo,direccion,texto"]
            for a in app.radio.decoded.list(5000)[::-1]:
                t = time.localtime(a.get("t", 0))
                vals = [time.strftime("%Y-%m-%d", t), time.strftime("%H:%M:%S", t), "%.5f" % (a.get("freq", 0) / 1e6),
                        a.get("kind", ""), a.get("address", a.get("from", "")), a.get("msg", a.get("text", ""))]
                rows.append(",".join('"%s"' % str(v).replace('"', "'") for v in vals))
            return self._send(200, ("\ufeff" + "\n".join(rows) + "\n").encode("utf-8"), "text/csv; charset=utf-8",
                              {"Content-Disposition": "attachment; filename=mensajes-%s.csv" % time.strftime("%Y-%m-%d")})
        if path == "/api/status":
            return self._send(200, self.app.status())
        if path == "/api/sweep":
            s = self.app.sweep
            return self._send(200, {"params": s.params, "info": s.info, "cal": s.cal})
        if path == "/api/stream":
            return self._stream()
        if path == "/api/wifi":
            w = self.app.wifi
            return self._send(200, {"status": w.summary(fresh=True), "saved": w.saved(),
                                    "hotspot_ssid": self.app.conf.get("HOTSPOT_SSID"),
                                    "hotspot_ip": self.app.conf.get("HOTSPOT_IP")})
        if path == "/api/system/update":
            return self._send(200, self.app.update_check())
        if path == "/api/system/update/log":
            return self._send(200, self.app.update_log(), "text/plain; charset=utf-8")
        if path == "/api/logs":
            if self.app.demo or not shutil.which("journalctl"):
                return self._send(200, "Modo demo: aquí verías los registros del sistema.", "text/plain; charset=utf-8")
            rc, out, err = run(["journalctl", "-u", "sdrkit", "-u", "sdrkit-netwatch", "-u", "openwebrx",
                                "-n", "200", "--no-pager", "-o", "short-iso"], timeout=10)
            return self._send(200, out or err, "text/plain; charset=utf-8")
        return self._send(404, {"error": "no encontrado"})

    def do_POST(self):
        u = urlparse(self.path)
        path = u.path
        if not self._same_origin():
            return self._send(403, {"error": "origin"})
        body = self._json_body()
        app = self.app
        if path == "/login":
            pw = str(body.get("password", ""))
            ip = self.client_address[0]
            wait = app.login_locked(ip)
            if wait:
                err = '<div class="e" data-en="Too many attempts. Try again in a few minutes.">Demasiados intentos. Prueba de nuevo en unos minutos.</div>'
                return self._send(429, LOGIN_HTML.replace("__ERR__", err), "text/html; charset=utf-8",
                                  headers={"Retry-After": str(wait)})
            if app.password and hmac.compare_digest(pw.encode(), app.password.encode()):
                app.login_ok(ip)
                cookie = "sdrkit_auth=%s; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax" % app.token()
                return self._send(303, "", headers={"Location": "/", "Set-Cookie": cookie})
            app.login_failed(ip)
            time.sleep(1.0)
            err = '<div class="e" data-en="Wrong password.">Clave incorrecta.</div>'
            return self._send(200, LOGIN_HTML.replace("__ERR__", err), "text/html; charset=utf-8")
        if not self._authed():
            return self._send(401, {"error": "auth"})
        try:
            if path == "/api/mode":
                mode = body.get("mode")
                if mode not in ("sweep", "radio", "sensors", "adsb", "receiver", "idle"):
                    raise ValueError("Modo inválido.")
                freq = cfloat(body.get("freq"), 0.0) or None
                if mode == "receiver" and not (app.receiver.installed() or app.demo):
                    raise ValueError("OpenWebRX+ no está instalado.")
                if app.modes.busy:
                    raise ValueError("Ya hay un cambio de modo en curso.")
                app.modes.switch(mode, freq, body.get("mod"))
                return self._send(200, {"ok": True})
            if path == "/api/sweep":
                return self._send(200, {"ok": True, "params": app.sweep.set_params(body)})
            if path == "/api/radio":
                params = app.radio.set_params(body)
                if body.get("activate") and app.modes.mode != "radio" and not app.modes.busy:
                    app.modes.switch("radio")
                return self._send(200, {"ok": True, "params": params})
            if path == "/api/radio/record":
                meta = app.radio.record(bool(body.get("on")))
                return self._send(200, {"ok": True, "saved": meta})
            if path == "/api/radio/scan":
                action = body.get("action")
                if action == "stop":
                    app.radio.scan_stop()
                    return self._send(200, {"ok": True})
                if action == "skip":
                    app.radio.scan_skip(cint(body.get("minutes"), 0))
                    return self._send(200, {"ok": True})
                chans = []
                if isinstance(body.get("channels"), list):  # lista libre (servicios: PMR, marina, CB…)
                    for c in body["channels"][:4000]:
                        f = cfloat(c.get("freq") if isinstance(c, dict) else None, 0.0)
                        if f > 0:
                            mod = c.get("mod") if c.get("mod") in radio_mod.MODES else guess_mod(f)
                            chans.append({"freq": f, "mod": mod, "name": str(c.get("name") or "")[:40]})
                elif body.get("range"):
                    r = body["range"]
                    a0, b0, st = cfloat(r.get("start")), cfloat(r.get("stop")), cfloat(r.get("step"), 12500)
                    if not (b0 > a0 and st >= 1000):
                        raise ValueError("Rango inválido (paso mínimo 1 kHz).")
                    nch = int((b0 - a0) / st) + 1
                    if nch > 4000:
                        raise ValueError("Demasiados canales: usa un paso mayor o un rango menor.")
                    mod = r.get("mod") if r.get("mod") in radio_mod.MODES else guess_mod(a0)
                    chans = [{"freq": a0 + i * st, "mod": mod, "name": ""} for i in range(nch)]
                else:
                    group, ids = body.get("group"), set(body.get("ids") or [])
                    chans = [m for m in app.radio.memories.list()
                             if (group and m.get("group") == group) or m.get("id") in ids]
                res = app.radio.scan_start(chans, body.get("squelch"), bool(body.get("once")), bool(body.get("down")))
                if app.modes.mode != "radio" and not app.modes.busy:
                    app.modes.switch("radio")
                return self._send(200, dict(res, ok=True))
            if path == "/api/memories":
                return self._send(200, {"ok": True, "item": app.radio.memories.upsert(body)})
            if path == "/api/memories/delete":
                app.radio.memories.delete(body.get("ids") or [])
                return self._send(200, {"ok": True})
            if path == "/api/memories/import":
                items = body.get("items")
                if not isinstance(items, list):
                    raise ValueError("Archivo de memorias inválido.")
                if body.get("replace"):
                    app.radio.memories.replace_all(items)
                else:
                    for it in items:
                        it = dict(it)
                        it.pop("id", None)
                        app.radio.memories.upsert(it)
                return self._send(200, {"ok": True, "count": len(app.radio.memories.list())})
            if path == "/api/recordings/delete":
                n = app.radio.recorder.delete(body.get("files") or [])
                return self._send(200, {"ok": True, "deleted": n})
            if path == "/api/activity/clear":
                app.radio.activity.clear()
                return self._send(200, {"ok": True})
            if path == "/api/decoded/clear":
                app.radio.decoded.clear()
                return self._send(200, {"ok": True})
            if path == "/api/sweep/cal":
                return self._send(200, {"ok": True, "cal": app.sweep.set_cal(body.get("k"), body.get("gain"))})
            if path == "/api/monitor":
                cfg = app.sweep.set_monitor(body)
                if cfg.get("enabled") and app.modes.mode != "sweep" and not app.modes.busy:
                    app.modes.switch("sweep")
                return self._send(200, {"ok": True, "config": cfg})
            if path == "/api/monitor/clear":
                app.sweep.alarms.clear()
                app.sweep.mon_rows.clear()
                return self._send(200, {"ok": True})
            if path == "/api/sensors":
                prm = app.sensors.set_params(body)
                if body.get("activate") and app.modes.mode != "sensors" and not app.modes.busy:
                    app.modes.switch("sensors")
                return self._send(200, {"ok": True, "params": prm})
            if path == "/api/sensors/clear":
                app.sensors.clear()
                return self._send(200, {"ok": True})
            if path == "/api/adsb":
                prm = app.adsb.set_params(body) if "gain" in body else app.adsb.params
                if body.get("activate") and app.modes.mode != "adsb" and not app.modes.busy:
                    app.modes.switch("adsb")
                return self._send(200, {"ok": True, "params": prm})
            if path == "/api/location":
                return self._send(200, {"ok": True, "location": app.adsb.set_location(body.get("lat"), body.get("lon"))})
            if path == "/api/wifi/scan":
                return self._send(200, {"ok": True, "networks": app.wifi.scan()})
            if path == "/api/wifi/add":
                uuid = app.wifi.add(body.get("ssid"), body.get("password", ""), bool(body.get("hidden")))
                if body.get("connect") and uuid:
                    app.wifi.connect(uuid)
                return self._send(200, {"ok": True, "uuid": uuid})
            if path == "/api/wifi/delete":
                app.wifi.delete(body.get("uuid"))
                return self._send(200, {"ok": True})
            if path == "/api/wifi/connect":
                app.wifi.connect(body.get("uuid"))
                return self._send(200, {"ok": True})
            if path == "/api/wifi/mode":
                app.wifi.set_mode(body.get("mode"))
                return self._send(200, {"ok": True})
            if path == "/api/system/update":
                return self._send(200, app.update_apply())
            if path in ("/api/system/reboot", "/api/system/poweroff"):
                if app.demo:
                    return self._send(200, {"ok": True, "demo": True})
                action = "reboot" if path.endswith("reboot") else "poweroff"

                def later():
                    time.sleep(1.5)
                    app.sweep.disable(3)
                    run(["systemctl", action], timeout=30)

                threading.Thread(target=later, daemon=True).start()
                return self._send(200, {"ok": True})
        except ValueError as e:
            return self._send(400, {"ok": False, "error": str(e)})
        return self._send(404, {"error": "no encontrado"})

    def _static(self, name):
        types = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                 ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
                 ".webmanifest": "application/manifest+json"}
        ext = os.path.splitext(name)[1]
        if ext not in types or not re.match(r"^[a-z0-9_.-]+$", name):
            return self._send(404, {"error": "no encontrado"})
        try:
            with open(os.path.join(WEB_DIR, name), "rb") as f:
                data = f.read()
        except OSError:
            return self._send(404, {"error": "no encontrado"})
        return self._send(200, data, types[ext])

    def _send_file(self, path, ctype, download_name=None):
        """Envía un archivo con soporte de rangos (necesario para reproducir audio en iPhone)."""
        try:
            size = os.path.getsize(path)
        except OSError:
            return self._send(404, {"error": "no encontrado"})
        start, end, code = 0, size - 1, 200
        m = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", "") or "")
        if m and (m.group(1) or m.group(2)):
            if m.group(1):
                start = int(m.group(1))
                end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
            else:
                start = max(0, size - int(m.group(2)))
            if start > end or start >= size:
                self.send_response(416)
                self.send_header("Content-Range", "bytes */%d" % size)
                self.end_headers()
                return
            code = 206
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Cache-Control", "no-store")
        if code == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        if download_name:
            self.send_header("Content-Disposition", "attachment; filename*=UTF-8''%s" % quote(download_name))
        self.end_headers()
        if self.command == "HEAD":
            return
        with open(path, "rb") as f:
            f.seek(start)
            left = end - start + 1
            while left > 0:
                chunk = f.read(min(65536, left))
                if not chunk:
                    break
                self.wfile.write(chunk)
                left -= len(chunk)

    def _zip(self, files):
        rec = self.app.radio.recorder
        paths = [p for p in (rec.path_of(f) for f in files) if p] if files else \
            [rec.path_of(m["file"]) for m in rec.list(2000)]
        paths = [p for p in paths if p]
        if not paths:
            return self._send(404, {"error": "No hay grabaciones."})
        fd, tmp = tempfile.mkstemp(suffix=".zip", dir=STATE_DIR)
        os.close(fd)
        try:
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_STORED) as z:
                for p in paths:
                    arc = os.path.relpath(p, rec.folder)
                    z.write(p, arc)
                    if os.path.exists(p[:-4] + ".json"):
                        z.write(p[:-4] + ".json", arc[:-4] + ".json")
            return self._send_file(tmp, "application/zip", "grabaciones-%s.zip" % time.strftime("%Y-%m-%d_%H-%M"))
        finally:
            try:
                os.remove(tmp)
            except OSError:
                pass

    def _monitor_data(self, cols):
        sw = self.app.sweep
        rows = list(sw.mon_rows)
        meta = sw.mon_meta
        if not rows or not meta:
            return {"meta": meta, "rows": []}
        n = meta[2]
        cols = max(50, min(cols, n))
        idx = np.linspace(0, n, cols + 1).astype(int)

        def red(arr, fn):
            a = np.array([np.nan if v is None else v for v in arr], dtype=np.float64)
            out = []
            for i in range(cols):
                seg = a[idx[i]:max(idx[i] + 1, idx[i + 1])]
                seg = seg[np.isfinite(seg)]
                out.append(None if seg.size == 0 else int(round(fn(seg))))
            return out

        return {"meta": {"f0": meta[0], "f1": meta[1], "n": cols},
                "rows": [{"t": r["t"], "max": red(r["max"], np.max), "occ": red(r["occ"], np.max)} for r in rows]}

    def _monitor_csv(self):
        sw = self.app.sweep
        meta = sw.mon_meta
        lines = []
        if meta:
            n = meta[2]
            freqs = [meta[0] + (i + 0.5) * (meta[1] - meta[0]) / n for i in range(n)]
            lines.append("hora," + ",".join("%.4f" % (f / 1e6) for f in freqs))
            for r in sw.mon_rows:
                lines.append(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(r["t"])) + "," +
                             ",".join("" if v is None else str(v) for v in r["max"]))
        data = ("\n".join(lines) + "\n").encode("utf-8")
        return self._send(200, data, "text/csv; charset=utf-8",
                          {"Content-Disposition": "attachment; filename=ocupacion-%s.csv" % time.strftime("%Y-%m-%d")})

    def _activity_csv(self):
        rows = ["fecha,hora,frecuencia_mhz,modo,nombre,duracion_s,pico_db,ctcss_hz,dcs,dtmf,grabacion"]
        for a in self.app.radio.activity.list(5000)[::-1]:
            t = time.localtime(a.get("t", 0))
            vals = [time.strftime("%Y-%m-%d", t), time.strftime("%H:%M:%S", t), "%.5f" % (a.get("freq", 0) / 1e6),
                    radio_mod.MODE_NAMES.get(a.get("mod"), a.get("mod", "")), a.get("name", ""), a.get("dur", ""),
                    a.get("peak_db", ""), a.get("ctcss", ""), a.get("dcs", ""), a.get("dtmf", ""), a.get("file", "")]
            rows.append(",".join('"%s"' % str(v).replace('"', "'") for v in vals))
        data = ("\ufeff" + "\n".join(rows) + "\n").encode("utf-8")
        return self._send(200, data, "text/csv; charset=utf-8",
                          {"Content-Disposition": "attachment; filename=actividad-%s.csv" % time.strftime("%Y-%m-%d")})

    def _radio_stream(self):
        radio = self.app.radio
        hub = radio.events
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        with hub.cv:
            hub.clients += 1
            seen = hub.seq
            first = hub.payload
        radio.poke()
        try:
            self.wfile.write(b"retry: 3000\n\n")
            if first:
                self.wfile.write(first)
            self.wfile.flush()
            while True:
                with hub.cv:
                    hub.cv.wait_for(lambda: hub.seq != seen, timeout=15)
                    out = hub.payload if hub.seq != seen else b": ping\n\n"
                    seen = hub.seq
                self.wfile.write(out)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with hub.cv:
                hub.clients -= 1
                hub.last_client = time.time()

    def _audio(self):
        """Audio en vivo: PCM 16 bits, 24 kHz, mono (el navegador lo reproduce con Web Audio)."""
        radio = self.app.radio
        hub = radio.audio
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Audio-Rate", str(radio_mod.AUDIO_RATE))
        self.end_headers()
        with hub.cv:
            hub.clients += 1
            seq = hub.seq
        radio.poke()
        silence = bytes(2 * radio_mod.AUDIO_RATE // 10)
        try:
            while True:
                with hub.cv:
                    hub.cv.wait_for(lambda: hub.seq != seq, timeout=3)
                    items = hub.since(seq)
                if not items:
                    self.wfile.write(silence)  # mantiene viva la conexión si el radio está en pausa
                    continue
                seq = items[-1][0]
                for _, d in items:
                    self.wfile.write(d)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with hub.cv:
                hub.clients -= 1
                hub.last_client = time.time()

    def _stream(self):
        hub = self.app.hub
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        with hub.cv:
            hub.clients += 1
        self.app.sweep.poke()
        try:
            self.wfile.write(b"retry: 3000\n\n")
            with hub.cv:
                seen, seen_st = hub.seq, hub.status_seq
                first = [x for x in (hub.status_payload, hub.payload) if x]
            for chunk in first:
                self.wfile.write(chunk)
            self.wfile.flush()
            while True:
                with hub.cv:
                    hub.cv.wait_for(lambda: hub.seq != seen or hub.status_seq != seen_st, timeout=15)
                    out = []
                    if hub.status_seq != seen_st:
                        out.append(hub.status_payload)
                        seen_st = hub.status_seq
                    if hub.seq != seen:
                        out.append(hub.payload)
                        seen = hub.seq
                if not out:
                    out = [b": ping\n\n"]
                for chunk in out:
                    self.wfile.write(chunk)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with hub.cv:
                hub.clients -= 1
                hub.last_client = time.time()


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    global STATE_DIR
    ap = argparse.ArgumentParser(description="SDR-Kit: panel web + analizador de espectro")
    ap.add_argument("--conf", default=CONF_PATH)
    ap.add_argument("--port", type=int, default=None)
    ap.add_argument("--bind", default="0.0.0.0")
    ap.add_argument("--demo", action="store_true", help="simula un SDR (para probar sin hardware)")
    ap.add_argument("--seed-owrx", action="store_true", help="escribe los perfiles de bandas en OpenWebRX+")
    ap.add_argument("--force", action="store_true", help="con --seed-owrx: reemplaza perfiles existentes")
    args = ap.parse_args()

    conf = load_conf(args.conf)
    if args.seed_owrx:
        done = owrx_seed(conf, OWRX_SETTINGS, force=args.force)
        print("Perfiles de OpenWebRX+ escritos en %s" % OWRX_SETTINGS if done
              else "OpenWebRX+ ya tenía dispositivos configurados (usa --force para reemplazarlos).")
        return 0
    if args.demo:
        if np is None:
            print("El modo demo necesita numpy:  pip install numpy")
            return 1
        STATE_DIR = os.environ.get("SDRKIT_STATE", os.path.join(os.path.expanduser("~"), ".sdrkit-demo"))
        conf.setdefault("ADMIN_PASSWORD", "")
    port = args.port or cint(conf.get("PANEL_PORT"), 80)
    if not args.demo and not conf.get("ADMIN_PASSWORD"):
        print("ADMIN_PASSWORD is empty: refusing to start an unprotected panel. "
              "Set it in %s (or run: sudo sdrkit password).\n"
              "ADMIN_PASSWORD está vacía: no se inicia un panel sin protección. "
              "Defínela en %s (o ejecuta: sudo sdrkit clave)." % (args.conf, args.conf), file=sys.stderr)
        return 1

    app = App(conf, demo=args.demo)
    Handler.app = app
    httpd = Server((args.bind, port), Handler)
    log("SDR-Kit %s escuchando en http://%s:%d  (motor: %s%s)" % (
        VERSION, args.bind, port, app.sweep.engine, ", DEMO" if args.demo else ""))
    app.modes.boot()

    def stop(*_):
        log("Deteniendo…")
        threading.Thread(target=httpd.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        httpd.serve_forever(poll_interval=0.5)
    finally:
        app.sweep.disable(3)
    return 0


if __name__ == "__main__":
    sys.exit(main())
