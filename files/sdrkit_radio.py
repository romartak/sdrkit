# -*- coding: utf-8 -*-
"""
SDR-Kit · Radio
Receptor de audio (FM estrecha, FM ancha, AM, USB, LSB) con:
  - decodificación de subtonos CTCSS y DCS, y de tonos DTMF
  - grabación manual o automática por transmisión (WAV en carpetas por fecha)
  - escáner rápido de canales (mide varios canales a la vez con FFT)
  - registro de actividad y memorias (favoritos)
Sólo usa numpy y la biblioteca estándar.
"""

import collections
import json
import math
import os
import re
import shutil
import threading
import time
import uuid
import wave

import numpy as np

try:
    import sdrkit_decoders as dec_mod
except ImportError:  # pragma: no cover
    dec_mod = None

RFS = 960000            # muestreo del radio: 960 kS/s
OFFSET = RFS // 4       # se sintoniza 240 kHz al lado: la señal queda lejos del pico de DC
AUDIO_RATE = 24000      # audio que llega al celular y a las grabaciones
BLOCK = 48640           # muestras por bloque (~50.7 ms): múltiplo de 256 (USB) y de 40 (diezmados)
SUB_RATE = 1000         # audio sub-audible (CTCSS/DCS)

CTCSS = [67.0, 69.3, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4, 100.0, 103.5, 107.2, 110.9,
         114.8, 118.8, 123.0, 127.3, 131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 159.8, 162.2, 165.5, 167.9, 171.3,
         173.8, 177.3, 179.9, 183.5, 186.2, 189.9, 192.8, 196.6, 199.5, 203.5, 206.5, 210.7, 218.1, 225.7, 229.1,
         233.6, 241.8, 250.3, 254.1]

# 104 códigos DCS estándar (en octal)
DCS_CODES = [0o023, 0o025, 0o026, 0o031, 0o032, 0o036, 0o043, 0o047, 0o051, 0o053, 0o054, 0o065, 0o071, 0o072,
             0o073, 0o074, 0o114, 0o115, 0o116, 0o122, 0o125, 0o131, 0o132, 0o134, 0o143, 0o145, 0o152, 0o155,
             0o156, 0o162, 0o165, 0o172, 0o174, 0o205, 0o212, 0o223, 0o225, 0o226, 0o243, 0o244, 0o245, 0o246,
             0o251, 0o252, 0o255, 0o261, 0o263, 0o265, 0o266, 0o271, 0o274, 0o306, 0o311, 0o315, 0o325, 0o331,
             0o332, 0o343, 0o346, 0o351, 0o356, 0o364, 0o365, 0o371, 0o411, 0o412, 0o413, 0o423, 0o431, 0o432,
             0o445, 0o446, 0o452, 0o454, 0o455, 0o462, 0o464, 0o465, 0o466, 0o503, 0o506, 0o516, 0o523, 0o526,
             0o532, 0o546, 0o565, 0o606, 0o612, 0o624, 0o627, 0o631, 0o632, 0o654, 0o662, 0o664, 0o703, 0o712,
             0o723, 0o731, 0o732, 0o734, 0o743, 0o754]

DTMF_LOW = [697, 770, 852, 941]
DTMF_HIGH = [1209, 1336, 1477, 1633]
DTMF_KEYS = ["123A", "456B", "789C", "*0#D"]

MODES = ("nfm", "nfmw", "wfm", "am", "usb", "lsb", "dsd")
MODE_NAMES = {"nfm": "FM", "nfmw": "FM ancha", "wfm": "WFM", "am": "AM", "usb": "USB", "lsb": "LSB",
              "dsd": "Digital (DMR, P25, D-Star, YSF, NXDN, dPMR, M17)"}
# short names for recording files (no spaces, commas or parentheses) · nombres cortos para los archivos de grabación
FILE_MODE_NAMES = {"nfmw": "FM-ancha", "dsd": "Digital"}


# ----------------------------------------------------------------------------
# Códigos DCS (Golay 23,12) — mismo cálculo que el firmware abierto del Quansheng UV-K5
# ----------------------------------------------------------------------------

def dcs_word(code):
    """Palabra de 23 bits de un código DCS (se transmite empezando por el bit 0)."""
    data = code | 0x800
    w = data
    for _ in range(12):
        w <<= 1
        if w & 0x1000:
            w ^= 0x08EA
    return data | ((w & 0x0FFE) << 11)


def _rotations(word):
    out = set()
    for r in range(23):
        out.add(((word >> r) | (word << (23 - r))) & 0x7FFFFF)
    return out


def _build_dcs_tables():
    rows, labels = [], []
    for code in DCS_CODES:
        w = dcs_word(code)
        for r in range(23):
            rot = ((w >> r) | (w << (23 - r))) & 0x7FFFFF
            rows.append([1.0 if (rot >> i) & 1 else -1.0 for i in range(23)])
            labels.append(code)
    equiv = {}
    words = {c: dcs_word(c) for c in DCS_CODES}
    for x in DCS_CODES:
        inv = _rotations(~words[x] & 0x7FFFFF)
        for y in DCS_CODES:
            if words[y] in inv:
                equiv[x] = y
                break
    return np.array(rows, dtype=np.float32), np.array(labels), equiv


DCS_MATRIX, DCS_LABELS, DCS_EQUIV = _build_dcs_tables()


def dcs_name(code, inverted):
    """Texto para mostrar, con su equivalente (023N y 047I son la misma señal)."""
    if not inverted:
        eq = DCS_EQUIV.get(code)
        return "D%03oN" % code + (" ≡ D%03oI" % eq if eq is not None else "")
    eq = DCS_EQUIV.get(code)
    if eq is not None:
        return "D%03oN ≡ D%03oI" % (eq, code)
    return "D%03oI" % code


# ----------------------------------------------------------------------------
# Bloques DSP
# ----------------------------------------------------------------------------

def lowpass(ntaps, cutoff, fs):
    n = np.arange(ntaps) - (ntaps - 1) / 2.0
    h = np.sinc(2.0 * cutoff / fs * n) * np.blackman(ntaps)
    return (h / h.sum()).astype(np.float32)


def fir_from_response(ntaps, fs, resp):
    """FIR de fase lineal a partir de una respuesta de amplitud deseada resp(f) (muestreo en frecuencia)."""
    nfft = 8192
    f = np.fft.rfftfreq(nfft, 1.0 / fs)
    h = np.fft.irfft(resp(f), nfft)
    h = np.roll(h, ntaps // 2)[:ntaps] * np.blackman(ntaps)
    return h.astype(np.float32)


class FirDecim:
    """Filtro FIR + diezmado que conserva estado y fase entre bloques de cualquier tamaño."""

    def __init__(self, taps, decim, dtype=np.complex64):
        self.h = np.asarray(taps, dtype=np.float32)
        self.D = int(decim)
        self.L = len(self.h)
        self.state = np.zeros(self.L - 1, dtype=dtype)
        self.pos = 0  # posición (en la entrada) de la próxima muestra de salida

    def __call__(self, x):
        L, D = self.L, self.D
        buf = np.concatenate((self.state, x))
        first = self.pos + L - 1
        n_out = (len(buf) - 1 - first) // D + 1 if len(buf) - 1 >= first else 0
        y = np.zeros(n_out, dtype=buf.dtype)
        span = n_out * D
        for k in range(L):
            s = first - k
            y += self.h[k] * buf[s:s + span:D]
        self.pos = self.pos + span - len(x)
        self.state = buf[len(buf) - (L - 1):]
        return y


class Chain:
    """Cadena completa de un modo: canal → demodulación → audio a 24 kHz (+ sub-audible para FM)."""

    def __init__(self, mod, region="americas"):
        self.mod = mod
        self.want_disc = False
        self.last_disc = None
        self.prev = np.complex64(1)
        self.agc = 0.05
        self.dc = 0.0
        if mod == "wfm":
            self.s1 = FirDecim(lowpass(63, 105000, RFS), 4)          # 960k → 240k
            self.ch_rate = 240000
            tau = 50e-6 if str(region).lower().startswith("eu") else 75e-6
            resp = lambda f: (1.0 / np.sqrt(1 + (2 * np.pi * f * tau) ** 2)) / np.sqrt(1 + (f / 11500.0) ** 24)
            self.aud = FirDecim(fir_from_response(255, 240000, resp), 10, np.float32)  # 240k → 24k
            self.s2 = None
            return
        self.s1 = FirDecim(lowpass(31, 42000, RFS), 5)               # 960k → 192k
        cutoff = {"nfm": 7500, "nfmw": 11000, "am": 5500, "usb": 3200, "lsb": 3200, "dsd": 8000}[mod]
        self.s2 = FirDecim(lowpass(63, cutoff, 192000), 4)           # 192k → 48k
        self.ch_rate = 48000
        self.last_hz = None
        if mod == "dsd":  # voz digital: el discriminador va crudo a dsd-fme; el audio lo devuelve dsd-fme
            return
        if mod in ("nfm", "nfmw"):
            # 300 Hz–3.4 kHz con deénfasis de 750 µs: quita el subtono del audio, como un radio real
            de = lambda f: np.sqrt(1 + (1000 / 212.0) ** 2) / np.sqrt(1 + (f / 212.0) ** 2)
            resp = lambda f: de(f) / np.sqrt(1 + (300.0 / np.maximum(f, 1.0)) ** 8) / np.sqrt(1 + (f / 3400.0) ** 12)
            self.aud = FirDecim(fir_from_response(255, 48000, resp), 2, np.float32)
            # camino sub-audible para CTCSS/DCS: 48k → 6k → 1k
            self.sub1 = FirDecim(lowpass(63, 1000, 48000), 8, np.float32)
            self.sub2 = FirDecim(lowpass(127, 300, 6000), 6, np.float32)
            # audio plano (sin deénfasis ni filtro de 300 Hz) para multimon-ng
            self.disc = FirDecim(lowpass(63, 6000, 48000), 2, np.float32)
        else:
            lo, hi = (200.0, 4000.0) if mod == "am" else (250.0, 2800.0)
            resp = lambda f: 1 / np.sqrt(1 + (lo / np.maximum(f, 1.0)) ** 8) / np.sqrt(1 + (f / hi) ** 12)
            self.aud = FirDecim(fir_from_response(255, 48000, resp), 2, np.float32)
        if mod in ("usb", "lsb"):
            n = np.arange(BLOCK // 20)
            sgn = -1 if mod == "usb" else 1
            self.ssb_in = np.exp(sgn * 2j * np.pi * 1500 * n / 48000).astype(np.complex64)
            self.ssb_out = np.conj(self.ssb_in)
            self.ssb_f = FirDecim(lowpass(127, 1400, 48000), 1)

    def _fm(self, x):
        z = np.concatenate(([self.prev], x))
        self.prev = x[-1]
        return np.angle(z[1:] * np.conj(z[:-1])).astype(np.float32)

    def process(self, c):
        """c: bloque complejo ya mezclado (la señal en 0 Hz). Devuelve (audio, potencia, sub, espectro_iq)."""
        x1 = self.s1(c)
        x = x1 if self.s2 is None else self.s2(x1)
        p = float(np.mean(x.real ** 2 + x.imag ** 2)) + 1e-15
        sub = None
        if self.mod == "wfm":
            dev = self._fm(x) * (self.ch_rate / (2 * np.pi) / 75000.0)
            audio = self.aud(dev) * 1.2
        elif self.mod == "dsd":
            self.last_hz = self._fm(x) * (self.ch_rate / (2 * np.pi))
            audio = np.zeros(len(x) // 2, dtype=np.float32)
        elif self.mod in ("nfm", "nfmw"):
            hz = self._fm(x) * (self.ch_rate / (2 * np.pi))
            self.last_hz = hz
            full = 5000.0 if self.mod == "nfmw" else 3000.0
            audio = self.aud(hz / full)
            sub = self.sub2(self.sub1(hz))  # desviación en Hz, a 1 kS/s
            self.last_disc = self.disc(hz / 6000.0) if self.want_disc else None
        elif self.mod == "am":
            env = np.abs(x)
            self.dc = 0.9 * self.dc + 0.1 * float(env.mean())
            a = self.aud((env - self.dc).astype(np.float32))
            audio = self._agc(a)
        else:
            y = self.ssb_f(x * self.ssb_in) * self.ssb_out
            audio = self._agc(self.aud(y.real.astype(np.float32)))
        return np.clip(audio, -1.0, 1.0), 10.0 * math.log10(p), sub, x1

    def _agc(self, a):
        peak = float(np.max(np.abs(a))) + 1e-9
        target = peak if peak > self.agc else self.agc * 0.97 + peak * 0.03
        self.agc = max(target, 1e-4)
        return a * (0.5 / self.agc)


# ----------------------------------------------------------------------------
# Decodificadores
# ----------------------------------------------------------------------------

def detect_ctcss(x, fs=SUB_RATE):
    """x: ~2 s de desviación sub-audible en Hz. Devuelve (tono, frecuencia medida, desviación Hz, snr dB) o None."""
    x = np.asarray(x, dtype=np.float64)
    x = x - x.mean()
    n = len(x)
    if n < fs:
        return None
    w = np.hanning(n)
    nfft = 16384
    X = np.abs(np.fft.rfft(x * w, nfft)) ** 2
    f = np.fft.rfftfreq(nfft, 1.0 / fs)
    band = (f >= 60) & (f <= 262)
    idx = np.flatnonzero(band)
    i = idx[np.argmax(X[idx])]
    peak = X[i]
    med = float(np.median(X[idx])) + 1e-12
    snr = 10 * math.log10(peak / med)
    if snr < 18:
        return None
    a, b, c = math.log(X[i - 1] + 1e-12), math.log(peak + 1e-12), math.log(X[i + 1] + 1e-12)
    den = a - 2 * b + c
    delta = 0.5 * (a - c) / den if den != 0 else 0.0
    fest = f[i] + delta * (f[1] - f[0])
    tone = min(CTCSS, key=lambda t: abs(t - fest))
    if abs(tone - fest) > max(1.0, 0.008 * tone):
        return None
    dev = 2.0 * math.sqrt(peak) / w.sum()
    return tone, round(fest, 1), round(dev), round(snr, 1)


def detect_dcs(x, fs=SUB_RATE):
    """x: ~2 s de desviación sub-audible. Correlación con los 104 códigos en sus 23 rotaciones,
    promediando todas las repeticiones (muy robusto con ruido). Devuelve (código, invertido, calidad) o None."""
    x = np.asarray(x, dtype=np.float64)
    x = x - 0.5 * (np.percentile(x, 90) + np.percentile(x, 10))  # punto medio entre los dos niveles
    sd = float(np.std(x)) + 1e-9
    spb = fs / 134.4
    nbits = int((len(x) - 2 * spb) / spb)
    reps = nbits // 23
    if reps < 3:
        return None
    nb = reps * 23
    pos = np.arange(len(x))
    best = (0.0, None)
    for ph in np.linspace(0, spb, 12, endpoint=False):
        t = ph + spb * (np.arange(nb) + 0.5)
        soft = np.tanh(np.interp(t, pos, x) / sd)
        folded = soft.reshape(reps, 23).mean(axis=0)
        norm = float(np.linalg.norm(folded)) * math.sqrt(23) + 1e-9
        corr = DCS_MATRIX @ folded / norm
        kp, kn = int(np.argmax(corr)), int(np.argmin(corr))
        # 023N y 047I son la misma señal: ante empate se prefiere la polaridad normal
        k = kp if corr[kp] >= -corr[kn] - 1e-6 else kn
        if abs(corr[k]) > abs(best[0]) + 1e-6:
            best = (float(corr[k]), k)
    q, k = best
    if k is None or abs(q) < 0.88:
        return None
    return int(DCS_LABELS[k]), q < 0, round(abs(q), 2)


class DtmfDecoder:
    """DTMF con ventanas de 30 ms solapadas, 3 confirmaciones seguidas y verificación de que cada tono
    está justo en su frecuencia (la voz rara vez cumple las tres cosas)."""

    def __init__(self, fs=AUDIO_RATE, frame=720, hop=360):
        self.frame, self.hop = frame, hop
        t = np.arange(frame) / fs
        win = np.hanning(frame)
        fr = np.array(DTMF_LOW + DTMF_HIGH, dtype=np.float64)
        allf = np.concatenate((fr, fr * 0.965, fr * 1.035))
        self.E = np.exp(-2j * np.pi * allf[:, None] * t[None, :]) * win[None, :]
        self.wpow = float((win ** 2).sum())
        self.buf = np.zeros(0, dtype=np.float32)
        self.last = None
        self.count = 0
        self.gap = 0
        self.pows = []
        self.digits = ""
        self.last_t = 0.0

    def feed(self, audio):
        self.buf = np.concatenate((self.buf, audio))
        out = ""
        while len(self.buf) >= self.frame:
            k = self._frame(self.buf[:self.frame])
            self.buf = self.buf[self.hop:]
            if k is None:
                self.gap += 1
                if self.gap >= 2:
                    self.last, self.count = None, 0
                continue
            self.gap = 0
            key, pw = k
            if key == self.last:
                self.count += 1
                self.pows.append(pw)
                # un tono DTMF tiene volumen constante; la voz sube y baja
                if self.count == 3 and max(self.pows[-3:]) < 2.0 * min(self.pows[-3:]):
                    out += key
            else:
                self.last, self.count, self.pows = key, 1, [pw]
        if out:
            if time.time() - self.last_t > 6:
                self.digits = ""
            self.digits = (self.digits + out)[-40:]
            self.last_t = time.time()
        return out

    def _frame(self, fr):
        energy = float(np.dot(fr * fr, np.hanning(self.frame) ** 2)) + 1e-12
        p = np.abs(self.E @ fr) ** 2 * (2.0 / self.wpow)
        main, below, above = p[:8], p[8:16], p[16:]
        lo, hi = main[:4], main[4:]
        i, j = int(np.argmax(lo)), 4 + int(np.argmax(hi))
        if (main[i] + main[j]) < 0.6 * energy:
            return None
        if np.sort(lo)[-2] * 8 > lo[i] or np.sort(hi)[-2] * 8 > main[j]:
            return None
        for k in (i, j):  # el tono debe estar en la frecuencia exacta, no al lado
            if below[k] * 1.6 > main[k] or above[k] * 1.6 > main[k]:
                return None
        twist = main[i] / (main[j] + 1e-12)
        if not (0.1 < twist < 10):
            return None
        return DTMF_KEYS[i][j - 4], float(main[i] + main[j])


# ----------------------------------------------------------------------------
# Grabaciones, actividad y memorias
# ----------------------------------------------------------------------------

def safe_name(s, n=30):
    s = re.sub(r"[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ_.-]+", "-", str(s)).strip("-")
    return s[:n]


class Recorder:
    def __init__(self, folder, max_mb=2000, min_sec=1.0, hang=2.0, preroll=0.6):
        self.folder = folder
        self.max_bytes = int(max_mb) * 1024 * 1024
        self.min_sec = float(min_sec)
        self.hang = float(hang)
        self.pre = collections.deque(maxlen=max(1, int(preroll * AUDIO_RATE / (BLOCK // 40))))
        self.lock = threading.Lock()
        self.manual = None
        self.auto = None
        self.auto_enabled = False
        self.last_open = 0.0
        os.makedirs(folder, exist_ok=True)

    # -- archivos --
    def _open(self, kind, info):
        self._make_room()
        st = shutil.disk_usage(self.folder)
        if st.free < 300 * 1024 * 1024:
            return None
        now = time.localtime()
        day = os.path.join(self.folder, time.strftime("%Y-%m-%d", now))
        os.makedirs(day, exist_ok=True)
        parts = [time.strftime("%H-%M-%S", now), "%.4fMHz" % (info["freq"] / 1e6), FILE_MODE_NAMES.get(info["mod"]) or MODE_NAMES.get(info["mod"], info["mod"])]
        if info.get("name"):
            parts.append(safe_name(info["name"]))
        base = os.path.join(day, "_".join(parts).replace(" ", ""))
        path = base + ".wav"
        k = 2
        while os.path.exists(path):
            path = "%s_%d.wav" % (base, k)
            k += 1
        w = wave.open(path, "wb")
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(AUDIO_RATE)
        meta = {"file": os.path.relpath(path, self.folder), "kind": kind, "freq": info["freq"], "mod": info["mod"],
                "name": info.get("name", ""), "start": time.time(), "samples": 0, "peak_db": -200.0}
        return {"w": w, "path": path, "meta": meta}

    def _write(self, rec, pcm):
        rec["w"].writeframes(pcm.tobytes())
        rec["meta"]["samples"] += len(pcm)

    def _close(self, rec, info, keep=True):
        try:
            rec["w"].close()
        except Exception:
            pass
        meta = rec["meta"]
        meta["duration"] = round(meta["samples"] / AUDIO_RATE, 1)
        meta.update({k: info.get(k) for k in ("ctcss", "dcs", "dtmf") if info.get(k)})
        if not keep or meta["duration"] < self.min_sec:
            for p in (rec["path"], rec["path"][:-4] + ".json"):
                try:
                    os.remove(p)
                except OSError:
                    pass
            return None
        try:
            with open(rec["path"][:-4] + ".json", "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False)
        except OSError:
            pass
        return meta

    def _make_room(self):
        files = []
        total = 0
        for root, _, names in os.walk(self.folder):
            for nm in names:
                if nm.endswith(".wav"):
                    p = os.path.join(root, nm)
                    try:
                        s = os.stat(p)
                    except OSError:
                        continue
                    files.append((s.st_mtime, s.st_size, p))
                    total += s.st_size
        if total <= self.max_bytes:
            return
        for _, size, p in sorted(files):
            for q in (p, p[:-4] + ".json"):
                try:
                    os.remove(q)
                except OSError:
                    pass
            total -= size
            if total <= self.max_bytes * 0.9:
                break

    # -- control --
    def start_manual(self, info):
        with self.lock:
            if self.manual is None:
                self.manual = self._open("manual", info)
            return self.manual is not None

    def stop_manual(self, info):
        with self.lock:
            rec, self.manual = self.manual, None
            return self._close(rec, info) if rec else None

    def close_auto(self, info):
        with self.lock:
            rec, self.auto = self.auto, None
            m = self._close(rec, info) if rec else None
            return [m] if m else []

    def stop_all(self, info):
        with self.lock:
            out = []
            for attr in ("manual", "auto"):
                rec = getattr(self, attr)
                setattr(self, attr, None)
                if rec:
                    out.append(self._close(rec, info))
            return [m for m in out if m]

    def feed(self, pcm, sq_open, info):
        """Recibe cada bloque de audio. Devuelve la lista de grabaciones terminadas (metadatos)."""
        done = []
        now = time.time()
        with self.lock:
            if self.manual:
                self._write(self.manual, pcm)
                self.manual["meta"]["peak_db"] = max(self.manual["meta"]["peak_db"], info.get("db", -200))
            if self.auto_enabled:
                if sq_open:
                    self.last_open = now
                    if self.auto is None:
                        self.auto = self._open("auto", info)
                        if self.auto:
                            for chunk in self.pre:
                                self._write(self.auto, chunk)
                    if self.auto:
                        self.auto["meta"]["peak_db"] = max(self.auto["meta"]["peak_db"], info.get("db", -200))
                if self.auto:
                    self._write(self.auto, pcm)
                    if not sq_open and now - self.last_open > self.hang:
                        m = self._close(self.auto, info)
                        self.auto = None
                        if m:
                            done.append(m)
            elif self.auto:
                m = self._close(self.auto, info)
                self.auto = None
                if m:
                    done.append(m)
            self.pre.append(pcm)
        return done

    def status(self):
        with self.lock:
            r = self.manual or self.auto
            if not r:
                return None
            return {"file": r["meta"]["file"], "kind": r["meta"]["kind"], "secs": round(r["meta"]["samples"] / AUDIO_RATE, 1)}

    def list(self, limit=500):
        out = []
        for root, _, names in os.walk(self.folder):
            for nm in names:
                if not nm.endswith(".wav"):
                    continue
                p = os.path.join(root, nm)
                rel = os.path.relpath(p, self.folder)
                if self.manual and self.manual["path"] == p or self.auto and self.auto["path"] == p:
                    continue
                meta = None
                try:
                    with open(p[:-4] + ".json", encoding="utf-8") as f:
                        meta = json.load(f)
                except (OSError, ValueError):
                    pass
                try:
                    st = os.stat(p)
                except OSError:
                    continue
                if not meta:
                    meta = {"file": rel, "start": st.st_mtime, "duration": round(max(0, st.st_size - 44) / 2 / AUDIO_RATE, 1)}
                meta["file"] = rel
                meta["size"] = st.st_size
                out.append(meta)
        out.sort(key=lambda m: -m.get("start", 0))
        return out[:limit]

    def path_of(self, rel):
        p = os.path.realpath(os.path.join(self.folder, rel))
        root = os.path.realpath(self.folder)
        if not p.startswith(root + os.sep) or not p.endswith(".wav") or not os.path.isfile(p):
            return None
        return p

    def delete(self, rels):
        n = 0
        for rel in rels:
            p = self.path_of(rel)
            if not p:
                continue
            for q in (p, p[:-4] + ".json"):
                try:
                    os.remove(q)
                except OSError:
                    pass
            n += 1
            try:
                os.rmdir(os.path.dirname(p))  # borra la carpeta del día si quedó vacía
            except OSError:
                pass
        return n

    def usage(self):
        total = 0
        count = 0
        for root, _, names in os.walk(self.folder):
            for nm in names:
                if nm.endswith(".wav"):
                    try:
                        total += os.path.getsize(os.path.join(root, nm))
                        count += 1
                    except OSError:
                        pass
        st = shutil.disk_usage(self.folder)
        return {"bytes": total, "count": count, "max_bytes": self.max_bytes, "disk_free": st.free, "folder": self.folder}


class ActivityLog:
    def __init__(self, path, keep=1000):
        self.path = path
        self.lock = threading.Lock()
        self.items = collections.deque(maxlen=keep)
        try:
            with open(path, encoding="utf-8") as f:
                for line in f.readlines()[-keep:]:
                    try:
                        self.items.append(json.loads(line))
                    except ValueError:
                        pass
        except OSError:
            pass

    def add(self, item):
        with self.lock:
            self.items.append(item)
            try:
                with open(self.path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(item, ensure_ascii=False) + "\n")
                if os.path.getsize(self.path) > 2 * 1024 * 1024:  # recorta el archivo si crece mucho
                    with open(self.path, "w", encoding="utf-8") as f:
                        for it in self.items:
                            f.write(json.dumps(it, ensure_ascii=False) + "\n")
            except OSError:
                pass

    def list(self, limit=300):
        with self.lock:
            return list(self.items)[-limit:][::-1]

    def clear(self):
        with self.lock:
            self.items.clear()
            try:
                open(self.path, "w").close()
            except OSError:
                pass


def ui_lang(conf=None):
    """Idioma de los textos que crea el servidor (memorias de ejemplo): SDRKIT_LANG o el idioma del sistema."""
    v = str((conf or {}).get("SDRKIT_LANG") or os.environ.get("SDRKIT_LANG") or "").lower()
    if v in ("es", "en"):
        return v
    return "es" if os.environ.get("LANG", "").lower().startswith("es") else "en"


def default_memories(region, lang="es"):
    eu = str(region).lower().startswith("eu")
    en = lang == "en"
    m = []

    def L(es, english):
        return english if en else es

    def add(group, name, mhz, mod="nfm"):
        m.append({"id": uuid.uuid4().hex[:8], "group": group, "name": name, "freq": int(round(mhz * 1e6)), "mod": mod})

    if eu:
        for i in range(16):
            add("PMR446", "PMR %d" % (i + 1), 446.00625 + 0.0125 * i)
    else:
        frs = [462.5625, 462.5875, 462.6125, 462.6375, 462.6625, 462.6875, 462.7125, 467.5625, 467.5875, 467.6125,
               467.6375, 467.6625, 467.6875, 467.7125, 462.5500, 462.5750, 462.6000, 462.6250, 462.6500, 462.6750,
               462.7000, 462.7250]
        for i, f in enumerate(frs):
            add("FRS/GMRS", L("Canal %d", "Channel %d") % (i + 1), f)
    for ch, f in [(L("16 socorro", "16 distress"), 156.800), (L("06 seguridad", "06 safety"), 156.300),
                  (L("09 llamada", "09 calling"), 156.450), (L("13 puente", "13 bridge-to-bridge"), 156.650),
                  ("22A", 157.100), ("68", 156.425), ("69", 156.475), ("71", 156.575), ("72", 156.625), ("77", 156.875)]:
        add(L("Marina VHF", "Marine VHF"), L("Canal ", "Channel ") + ch, f)
    air = L("Aviación", "Airband")
    add(air, L("Emergencia 121.5", "Emergency 121.5"), 121.5, "am")
    add(air, L("Aire-aire 123.45", "Air-to-air 123.45"), 123.45, "am")
    add(air, L("Planeadores/ultraligeros 122.75", "Gliders/ultralights 122.75"), 122.75, "am")
    ham = L("Radioaficionados", "Ham radio")
    if eu:
        add(ham, L("2 m llamada 145.500", "2 m calling 145.500"), 145.5)
        add(ham, L("70 cm llamada 433.500", "70 cm calling 433.500"), 433.5)
        add(ham, "APRS 144.800", 144.8)
    else:
        add(ham, L("2 m llamada 146.520", "2 m calling 146.520"), 146.52)
        add(ham, "2 m simplex 146.550", 146.55)
        add(ham, L("70 cm llamada 446.000", "70 cm calling 446.000"), 446.0)
        add(ham, "APRS 144.390", 144.39)
    add(ham, L("Estación Espacial ISS (voz)", "International Space Station (voice)"), 145.8)
    add("CB 27 MHz", L("Canal 9 emergencia", "Channel 9 emergency"), 27.065, "am")
    add("CB 27 MHz", L("Canal 19 carretera", "Channel 19 highway"), 27.185, "am")
    if not eu:
        for i, f in enumerate([162.400, 162.425, 162.450, 162.475, 162.500, 162.525, 162.550]):
            add(L("Clima NOAA (EE. UU./Canadá)", "NOAA Weather (US/Canada)"), "WX%d" % (i + 1), f)
    add(L("Radio FM", "FM radio"), L("Ejemplo FM 98.1", "Example FM 98.1"), 98.1, "wfm")
    return m


def clean_tone(v):
    """Subtono de una memoria: CTCSS en Hz ("100.0") o DCS ("D023N"); cualquier otra cosa se descarta."""
    v = str(v or "").strip().upper()
    m = re.match(r"^D([0-7]{3})([NI]?)$", v)
    if m:
        return "D%s%s" % (m.group(1), m.group(2) or "N")
    try:
        hz = float(v)
    except ValueError:
        return None
    return "%.1f" % hz if 60 <= hz <= 260 else None


class MemoryStore:
    def __init__(self, path, region, lang="es"):
        self.path = path
        self.lock = threading.Lock()
        try:
            with open(path, encoding="utf-8") as f:
                self.items = json.load(f)
            if not isinstance(self.items, list):
                raise ValueError
        except (OSError, ValueError):
            self.items = default_memories(region, lang)
            self._save()

    def _save(self):
        tmp = self.path + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.items, f, ensure_ascii=False, indent=1)
            os.replace(tmp, self.path)
        except OSError:
            pass

    def list(self):
        with self.lock:
            return list(self.items)

    def upsert(self, item):
        freq = float(item.get("freq", 0))
        if not (100e3 <= freq <= 6e9):
            raise ValueError("Frecuencia inválida.")
        mod = item.get("mod") if item.get("mod") in MODES else "nfm"
        clean = {"id": str(item.get("id") or uuid.uuid4().hex[:8])[:12], "freq": int(round(freq)), "mod": mod,
                 "name": str(item.get("name", ""))[:40] or "%.4f MHz" % (freq / 1e6),
                 "group": str(item.get("group", ""))[:30] or "Favoritos"}
        # repetidoras: subtono para abrirla y desplazamiento de su entrada (kHz)
        tone = clean_tone(item.get("tone"))
        if tone:
            clean["tone"] = tone
        try:
            offset = int(round(float(item.get("offset") or 0)))
        except (TypeError, ValueError):
            offset = 0
        if offset and abs(offset) <= 50000:
            clean["offset"] = offset
        with self.lock:
            for i, it in enumerate(self.items):
                if it.get("id") == clean["id"]:
                    self.items[i] = clean
                    break
            else:
                self.items.append(clean)
            self._save()
        return clean

    def delete(self, ids):
        with self.lock:
            self.items = [it for it in self.items if it.get("id") not in set(ids)]
            self._save()

    def replace_all(self, items):
        with self.lock:
            self.items = []
        for it in items:
            try:
                self.upsert(it)
            except (ValueError, TypeError):
                pass


# ----------------------------------------------------------------------------
# Distribución en vivo (eventos SSE y audio)
# ----------------------------------------------------------------------------

class EventHub:
    def __init__(self):
        self.cv = threading.Condition()
        self.seq = 0
        self.payload = None
        self.clients = 0
        self.last_client = 0.0

    def publish(self, obj, event="radio"):
        data = ("event: %s\ndata: %s\n\n" % (event, json.dumps(obj, separators=(",", ":"), ensure_ascii=False))).encode()
        with self.cv:
            self.seq += 1
            self.payload = data
            self.cv.notify_all()


class AudioHub:
    def __init__(self):
        self.cv = threading.Condition()
        self.seq = 0
        self.chunks = collections.deque(maxlen=64)
        self.clients = 0
        self.last_client = 0.0

    def publish(self, data):
        with self.cv:
            self.seq += 1
            self.chunks.append((self.seq, data))
            self.cv.notify_all()

    def since(self, seq):
        return [(s, d) for (s, d) in self.chunks if s > seq]


# ----------------------------------------------------------------------------
# Gestor del radio
# ----------------------------------------------------------------------------

class SdrBusy(Exception):
    pass


class RadioManager:
    def __init__(self, conf, state, open_device, error_cls, folder, demo=False):
        self.conf = conf
        self.state = state
        self.open_device = open_device
        self.error_cls = error_cls
        self.demo = demo
        self.region = conf.get("REGION", "americas")
        self.level_offset = float(conf.get("LEVEL_OFFSET_DB", 0) or 0)
        self.idle_stop = 20.0
        self.events = EventHub()
        self.audio = AudioHub()
        self.recorder = Recorder(os.path.join(folder, "grabaciones") if not conf.get("REC_DIR") else conf["REC_DIR"],
                                 max_mb=float(conf.get("REC_MAX_MB", 2000) or 2000),
                                 min_sec=float(conf.get("REC_MIN_SEC", 1.0) or 1.0))
        self.activity = ActivityLog(os.path.join(folder, "actividad.jsonl"))
        self.decoded = ActivityLog(os.path.join(folder, "decodificados.jsonl"), keep=2000)
        self._dec = None
        self._dsd = None
        self._cls_buf = []
        self._dec_seq = 0
        self._dec_recent = collections.deque(maxlen=8)
        self.memories = MemoryStore(os.path.join(folder, "memorias.json"), self.region, ui_lang(conf))
        p = {"freq": 462.5625e6 if not str(self.region).lower().startswith("eu") else 446.00625e6,
             "mod": "nfm", "squelch": -45.0, "gain": 29.7, "autorec": False, "name": "", "data": [], "dsd": "auto"}
        p.update(state.get("radio") or {})
        self.params = self._validate(p)
        self.recorder.auto_enabled = bool(self.params["autorec"])
        self.cv = threading.Condition()
        self.enabled = False
        self.version = 0
        self.dev = None
        self.closed = threading.Event()
        self.closed.set()
        self.manual_rec = False
        self.scan = None
        self.info = {"running": False, "device": None, "error": None, "gains": []}
        self.live = {"db": -120.0, "noise": -120.0, "sq": False, "ctcss": None, "dcs": None, "dtmf": "", "digital": None}
        self._applied = None
        self._tx = None
        self._tx_dtmf = ""
        threading.Thread(target=self._worker, name="radio", daemon=True).start()

    # -- parámetros ----------------------------------------------------------
    def _validate(self, p):
        freq = float(p.get("freq") or 100e6)
        freq = min(max(freq, 100e3), 1766e6)
        mod = p.get("mod") if p.get("mod") in MODES else "nfm"
        sq = p.get("squelch")
        sq = None if sq in (None, "off", "") else min(max(float(sq), -130.0), 0.0)
        g = p.get("gain", 29.7)
        gain = "auto" if str(g).lower() == "auto" else min(max(float(g), 0.0), 60.0)
        kinds = dec_mod.MULTIMON_KINDS if dec_mod else {}
        data = [k for k in (p.get("data") or []) if k in kinds]
        dsd = p.get("dsd") if dec_mod and p.get("dsd") in dec_mod.DSD_MODES else "auto"
        return {"freq": round(freq), "mod": mod, "squelch": sq, "gain": gain, "autorec": bool(p.get("autorec")),
                "name": str(p.get("name") or "")[:40], "data": data, "dsd": dsd}

    def set_params(self, p, from_scan=False):
        merged = dict(self.params)
        merged.update({k: v for k, v in p.items() if k in ("freq", "mod", "squelch", "gain", "autorec", "name", "data",
                                                           "dsd")})
        if "freq" in p and "name" not in p:
            merged["name"] = ""
        with self.cv:
            old = self.params
            self.params = self._validate(merged)
            if (old["freq"], old["mod"], old["gain"], old["data"], old["dsd"]) != (
                    self.params["freq"], self.params["mod"], self.params["gain"], self.params["data"], self.params["dsd"]):
                self.version += 1
            if not from_scan and ("freq" in p or "mod" in p) and self.scan:
                self.scan = None
            self.recorder.auto_enabled = self.params["autorec"]
            self.cv.notify_all()
        self.state.update(radio=self.params)
        return self.params

    def enable(self):
        with self.cv:
            self.enabled = True
            self.cv.notify_all()

    def disable(self, wait=8.0):
        with self.cv:
            self.enabled = False
            self.cv.notify_all()
        return self.closed.wait(wait)

    def poke(self):
        with self.cv:
            self.cv.notify_all()

    def monitoring(self):
        return bool(self.params["autorec"] or self.manual_rec or self.scan or self.params.get("data"))

    def _on_dsd_meta(self, meta):
        if self._tx:
            for k in ("sync", "tg", "src", "cc", "nac"):
                if meta.get(k):
                    self._tx["dsd_" + k] = meta[k]
            if meta.get("enc"):
                self._tx["dsd_enc"] = True

    def _on_decoded(self, line):
        item = dec_mod.parse_multimon(line)
        self._dec_seq += 1
        item.update(id=self._dec_seq, t=time.time(), freq=self.params["freq"], name=self.params.get("name", ""))
        self._dec_recent.append(item)
        self.decoded.add(item)

    def wanted(self):
        now = time.time()
        if self.monitoring():
            return True
        return (self.events.clients > 0 or self.audio.clients > 0 or
                now - max(self.events.last_client, self.audio.last_client) < self.idle_stop)

    def info_dict(self):
        c, d = self.live.get("ctcss"), self.live.get("dcs")
        return {"freq": self.params["freq"], "mod": self.params["mod"], "name": self.params.get("name", ""),
                "db": self.live["db"], "ctcss": c["tone"] if c else None, "dcs": d["text"] if d else None,
                "dtmf": self._tx_dtmf}

    # -- grabación y escáner --------------------------------------------------
    def record(self, on):
        if on:
            ok = self.recorder.start_manual(self.info_dict())
            self.manual_rec = ok
            self.poke()
            if not ok:
                raise ValueError("No se pudo empezar a grabar (¿poco espacio en la microSD?).")
            return None
        self.manual_rec = False
        return self.recorder.stop_manual(self.info_dict())

    def scan_start(self, chans, squelch=None, once=False, down=False):
        """Escanea canales. once=True: se detiene en la primera señal (botones «Buscar»)."""
        chans = sorted([c for c in chans if 100e3 <= float(c["freq"]) <= 1766e6], key=lambda c: c["freq"])
        if not chans:
            raise ValueError("No hay canales para escanear.")
        if len(chans) > 4000:
            raise ValueError("Demasiados canales (máx. 4000).")
        windows = []
        i = 0
        half = 0.42 * RFS
        while i < len(chans):
            lo = chans[i]["freq"] + 0.40 * RFS
            members = []
            j = i
            while j < len(chans) and chans[j]["freq"] <= lo + half - 8000:
                members.append(j)
                j += 1
            if any(abs(chans[k]["freq"] - lo) < 12000 for k in members):
                lo -= 25000
            windows.append({"lo": lo, "idx": members})
            i = j
        if down:
            windows.reverse()
        with self.cv:
            if squelch is not None:
                self.params["squelch"] = float(squelch)
            if self.params["squelch"] is None:
                self.params["squelch"] = -45.0
            self.scan = {"chans": chans, "windows": windows, "wi": 0, "state": "search", "lock": None,
                         "lockout": {}, "hits": 0, "closed_since": None, "cycle_t": time.time(), "cycle_ms": None,
                         "once": bool(once), "down": bool(down)}
            self.version += 1
            self.cv.notify_all()
        return {"channels": len(chans), "windows": len(windows)}

    def scan_stop(self):
        with self.cv:
            self.scan = None
            self.version += 1
            self.cv.notify_all()

    def scan_skip(self, minutes=0):
        with self.cv:
            s = self.scan
            if s and s["state"] == "listen":
                if minutes:
                    s["lockout"][s["lock"]] = time.time() + 60 * minutes
                s["state"] = "search"
                s["wi"] = (s["wi"] + 1) % len(s["windows"])
                s["cycle_t"] = time.time()
                self.version += 1
                self.cv.notify_all()

    # -- ciclo principal ------------------------------------------------------
    def _worker(self):
        last_err = None
        while True:
            with self.cv:
                while not (self.enabled and self.wanted()):
                    self._close()
                    self.closed.set()
                    self.cv.wait(1.0)
                self.closed.clear()
            try:
                if self.dev is None:
                    self._open()
                if self._applied != self.version:
                    self._configure()
                s = self.scan
                if s and s["state"] == "search":
                    self._scan_step(s)
                else:
                    self._demod_block()
                last_err = None
                self.info["error"] = None
            except self.error_cls as e:
                self._close()
                self.info["error"] = str(e)
                if str(e) != last_err:
                    self.events.publish({"error": str(e)}, "radio_error")
                    last_err = str(e)
                with self.cv:
                    self.cv.wait(3.0)
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._close()
                self.info["error"] = "Error interno del radio: %s" % e
                with self.cv:
                    self.cv.wait(3.0)

    def _open(self):
        dev = self.open_device()
        try:
            dev.setup(RFS, int(float(self.conf.get("RTL_PPM", 0) or 0)),
                      str(self.conf.get("BIAS_TEE", "no")).lower() in ("si", "sí", "yes", "1", "true"))
        except Exception:
            dev.close()
            raise
        self.dev = dev
        self.info.update(running=True, device=dev.name, gains=dev.gains)
        self._applied = None
        self._lo = None
        self._tx = None
        self._tx_dtmf = ""
        self._noise = collections.deque(maxlen=200)
        self._sub = collections.deque(maxlen=int(2.4 * SUB_RATE))
        self._open_since = None
        self._close_since = None
        self._last_eval = 0.0
        self._last_key = None
        self._last_pub = 0.0
        self._spec_tick = 0

    def _close(self):
        if self.dev is not None:
            info = self.info_dict()
            for m in self.recorder.stop_all(info):
                self._log_recording(m)
            self.manual_rec = False
            self._end_tx()
            if self._dec:
                self._dec.close()
                self._dec = None
            if self._dsd:
                self._dsd.close()
                self._dsd = None
            try:
                self.dev.close()
            except Exception:
                pass
            self.dev = None
        self.info["running"] = False

    def _configure(self):
        with self.cv:
            ver = self.version
            p = dict(self.params)
        self.dev.set_gain(p["gain"])
        f = p["freq"]
        if f - OFFSET >= 0.5e6:
            lo, sign = f - OFFSET, -1
        else:
            lo, sign = f + OFFSET, 1
        n = np.arange(4)
        self.mix = np.tile(np.exp(sign * 0.5j * np.pi * n).astype(np.complex64), BLOCK // 4)
        if not self.dev.tune(lo):
            raise self.error_cls("El dongle no puede sintonizar %.4f MHz." % (f / 1e6))
        time.sleep(0.005)
        self.dev.read(8192)
        self._lo = lo
        for m in self.recorder.close_auto(self.info_dict()):  # cada frecuencia en su propio archivo
            self._log_recording(m)
        self._end_tx()
        self.chain = Chain(p["mod"], self.region)
        self.dtmf = DtmfDecoder()
        if self._dec:
            self._dec.close()
            self._dec = None
        if self._dsd:
            self._dsd.close()
            self._dsd = None
        if p["mod"] == "dsd" and dec_mod:
            self._dsd = dec_mod.DigitalVoice(p.get("dsd", "auto"), self._on_dsd_meta)
        self._cls_buf = []
        self.live["digital"] = None
        self.info["data_error"] = None
        if p.get("data") and dec_mod:
            self._dec = dec_mod.DataDecoder(p["data"], self._on_decoded)
            self.info["data_error"] = self._dec.error
            self.chain.want_disc = p["mod"] in ("nfm", "nfmw")
        self._sub.clear()
        self._last_key = None
        self.live.update(ctcss=None, dcs=None, sq=False)
        self._open_since = None
        self._close_since = time.time()
        self._applied = ver

    # -- un bloque de audio --------------------------------------------------
    def _demod_block(self):
        raw = self.dev.read(BLOCK * 2)
        if raw.size < BLOCK * 2:
            raise self.error_cls("Lectura incompleta del SDR.")
        iq = raw.astype(np.float32)
        iq -= 127.5
        iq *= 1.0 / 127.5
        c = np.empty(BLOCK, dtype=np.complex64)
        c.real = iq[0::2]
        c.imag = iq[1::2]
        c -= c.mean()
        c *= self.mix
        audio, pdb, sub, x1 = self.chain.process(c)
        if self._dsd is not None:
            self._dsd.feed(self.chain.last_hz)
            audio = self._dsd.pull(len(audio))
        db = pdb + self.level_offset
        now = time.time()
        p = self.params
        self._noise.append(db)
        noise = float(np.percentile(self._noise, 15)) if len(self._noise) > 10 else db
        sq = p["squelch"]
        was = self.live["sq"]
        if sq is None:
            is_open = True
        else:
            is_open = db > (sq - 2.0 if was else sq)
        if is_open:
            self._close_since = None
            if self._open_since is None:
                self._open_since = now
                self._start_tx(db)
        else:
            if self._close_since is None:
                self._close_since = now
            self._open_since = None
        hang_open = is_open or (self._close_since is not None and now - self._close_since < 0.25)
        out = audio if hang_open else np.zeros_like(audio)
        pcm = (out * 26000).astype(np.int16)
        self.audio.publish(pcm.tobytes())
        if self._tx:
            self._tx["peak_db"] = max(self._tx["peak_db"], round(db, 1))
        # decodificadores
        if sub is not None and is_open:
            self._sub.extend(sub.tolist())
            if self._open_since and now - self._open_since > 1.3 and now - self._last_eval > 0.5:
                self._last_eval = now
                arr = np.array(self._sub)
                c_res = detect_ctcss(arr)
                d_res = None if c_res else detect_dcs(arr)
                # sólo se muestra un tono cuando sale igual en dos análisis seguidos
                key = ("c", c_res[0]) if c_res else (("d", d_res[0], d_res[1]) if d_res else None)
                confirmed = key is not None and key == self._last_key
                self._last_key = key
                if not confirmed:
                    c_res = d_res = None
                if c_res:
                    self.live["ctcss"] = {"tone": c_res[0], "measured": c_res[1], "dev": c_res[2], "snr": c_res[3]}
                    self.live["dcs"] = None
                elif d_res:
                    self.live["dcs"] = {"code": "%03o" % d_res[0], "inverted": d_res[1], "quality": d_res[2],
                                        "text": dcs_name(d_res[0], d_res[1])}
                    self.live["ctcss"] = None
                if self._tx:
                    if self.live["ctcss"]:
                        self._tx["ctcss"] = self.live["ctcss"]["tone"]
                    if self.live["dcs"]:
                        self._tx["dcs"] = self.live["dcs"]["text"]
        elif not is_open:
            self._sub.clear()
        if self._dec:
            src = self.chain.last_disc if self.chain.last_disc is not None else audio
            self._dec.feed(src)
        # ¿es una señal digital? (cada ~0.7 s de señal abierta, en FM o en modo digital)
        if is_open and self.chain.last_hz is not None and dec_mod:
            self._cls_buf.append(self.chain.last_hz)
            if sum(len(b) for b in self._cls_buf) >= 33000:
                res = dec_mod.classify_digital(np.concatenate(self._cls_buf))
                self._cls_buf = []
                if res:
                    res["t"] = now
                    self.live["digital"] = res
                    if self._tx:
                        self._tx["digital"] = res["guess"].split(":")[0]
        elif not is_open:
            self._cls_buf = []
        if is_open and p["mod"] != "wfm":
            got = self.dtmf.feed(audio)
            if got:
                self._tx_dtmf = (self._tx_dtmf + got)[-40:]
                if self._tx:
                    self._tx["dtmf"] = self._tx_dtmf
        self.live.update(db=round(db, 1), noise=round(noise, 1), sq=is_open)
        info = self.info_dict()
        info["db"] = db
        for m in self.recorder.feed(pcm, is_open, info):
            self._log_recording(m)
        # fin de transmisión
        if not is_open and self._tx and self._close_since and now - self._close_since > 1.2:
            self._end_tx()
        # escáner: volver a buscar cuando la señal se va
        s = self.scan
        if s and s["state"] == "listen":
            if not is_open and self._close_since and now - self._close_since > 2.0:
                with self.cv:
                    if self.scan is s:
                        s["state"] = "search"
                        s["wi"] = (s["wi"] + 1) % len(s["windows"])
                        s["cycle_t"] = time.time()
                        self.version += 1
        if now - self._last_pub > 0.12:
            self._last_pub = now
            self._spec_tick += 1
            self._publish(x1 if self._spec_tick % 2 == 0 else None)

    def _start_tx(self, db):
        self._tx_dtmf = ""
        self.live.update(ctcss=None, dcs=None)
        self.dtmf.digits = ""
        self._tx = {"t": time.time(), "freq": self.params["freq"], "mod": self.params["mod"],
                    "name": self.params.get("name", ""), "peak_db": round(db, 1)}

    def _end_tx(self):
        tx, self._tx = getattr(self, "_tx", None), None
        if not tx:
            return
        tx["dur"] = round(time.time() - tx["t"] - 1.2, 1)
        if tx["dur"] < 0.3:
            return
        if self.recorder.auto and self.recorder.auto["meta"]["start"] <= tx["t"] + 1:
            tx["file"] = self.recorder.auto["meta"]["file"]
        self.activity.add(tx)

    def _log_recording(self, meta):
        self.events.publish({"saved": meta}, "radio_saved")

    def _publish(self, x1):
        s = self.scan
        obj = {"freq": self.params["freq"], "mod": self.params["mod"], "name": self.params.get("name", ""),
               "db": self.live["db"], "noise": self.live["noise"], "sq": self.live["sq"],
               "squelch": self.params["squelch"], "ctcss": self.live["ctcss"], "dcs": self.live["dcs"],
               "dtmf": self._tx_dtmf, "rec": self.recorder.status(), "autorec": self.params["autorec"],
               "scan": self._scan_info(s), "device": self.info.get("device"),
               "data": self.params.get("data", []), "data_error": self.info.get("data_error"),
               "decoded": list(self._dec_recent), "digital": self.live.get("digital"),
               "dsd": self._dsd.status() if self._dsd else None}
        if x1 is not None:
            n = 512
            m = len(x1) // n
            seg = x1[: m * n].reshape(m, n) * np.hanning(n).astype(np.float32)
            ps = (np.abs(np.fft.fft(seg, axis=1)) ** 2).mean(axis=0)
            ps = np.fft.fftshift(ps) / (np.hanning(n).sum() ** 2)
            dbs = 10 * np.log10(ps.reshape(256, 2).max(axis=1) + 1e-15) + self.level_offset
            obj["spec"] = np.round(dbs).astype(int).tolist()
            obj["spec_span"] = self.chain.ch_rate if self.chain.s2 is None else 192000
        self.events.publish(obj)

    def _scan_info(self, s):
        if not s:
            return None
        w = s["windows"][s["wi"] % len(s["windows"])]
        chans = s["chans"]
        return {"state": s["state"], "hits": s["hits"], "channels": len(chans),
                "range": [chans[w["idx"][0]]["freq"], chans[w["idx"][-1]]["freq"]] if w["idx"] else None,
                "lock": chans[s["lock"]] if s["lock"] is not None and s["state"] == "listen" else None,
                "cycle_ms": s.get("cycle_ms")}

    # -- un paso del escáner --------------------------------------------------
    def _scan_step(self, s):
        w = s["windows"][s["wi"]]
        if not self.dev.tune(w["lo"]):
            s["wi"] = (s["wi"] + 1) % len(s["windows"])
            return
        time.sleep(0.004)
        self.dev.read(4096)
        raw = self.dev.read(16384)
        iq = raw.astype(np.float32)
        iq -= 127.5
        iq *= 1.0 / 127.5
        c = (iq[0::2] + 1j * iq[1::2]).astype(np.complex64)
        c -= c.mean()
        nfft = 1024
        m = len(c) // nfft
        win = np.hanning(nfft).astype(np.float32)
        ps = (np.abs(np.fft.fft(c[: m * nfft].reshape(m, nfft) * win, axis=1)) ** 2).mean(axis=0)
        ps = np.fft.fftshift(ps) / (nfft * float((win ** 2).sum()))
        binw = RFS / nfft
        sq = self.params["squelch"] if self.params["squelch"] is not None else -45.0
        best = None
        now = time.time()
        for k in w["idx"]:
            ch = s["chans"][k]
            if s["lockout"].get(k, 0) > now:
                continue
            bw = 25000.0 if ch.get("mod") in ("nfmw", "am") else (180000.0 if ch.get("mod") == "wfm" else 12500.0)
            center = (ch["freq"] - w["lo"]) / binw + nfft / 2
            a, b = int(round(center - bw / 2 / binw)), int(round(center + bw / 2 / binw)) + 1
            pdb = 10 * math.log10(float(ps[max(a, 0):min(b, nfft)].sum()) + 1e-15) + self.level_offset
            if pdb > sq and (best is None or pdb > best[1]):
                best = (k, pdb)
        if best and s.get("once"):  # búsqueda: quedarse en la primera señal y terminar
            ch = s["chans"][best[0]]
            with self.cv:
                if self.scan is s:
                    self.scan = None
            self.set_params({"freq": ch["freq"], "mod": ch.get("mod") or self.params["mod"],
                             "name": ch.get("name", "")}, from_scan=True)
            self.events.publish({"msg": "Señal encontrada en %.4f MHz (%.0f dB)." % (ch["freq"] / 1e6, best[1])}, "radio_note")
            return
        if best:
            k = best[0]
            ch = s["chans"][k]
            s["state"] = "listen"
            s["lock"] = k
            s["hits"] += 1
            self.set_params({"freq": ch["freq"], "mod": ch.get("mod") or self.params["mod"],
                             "name": ch.get("name", "")}, from_scan=True)
            return
        s["wi"] += 1
        if s["wi"] >= len(s["windows"]) and s.get("once"):
            with self.cv:
                if self.scan is s:
                    self.scan = None
                    self.version += 1
            self.events.publish({"msg": "No hay señales por encima del squelch en ese tramo. Baja el squelch o prueba más lejos."}, "radio_note")
            return
        if s["wi"] >= len(s["windows"]):
            s["wi"] = 0
            s["cycle_ms"] = round((now - s["cycle_t"]) * 1000)
            s["cycle_t"] = now
        if now - self._last_pub > 0.2:
            self._last_pub = now
            self.live.update(sq=False)
            self._publish(None)
