"""Automatic recognition of digital signals from the FM discriminator output."""
import numpy as np
import pytest

import sdrkit_decoders as dec

FS = 48000


def _gmsk(rate, dev, seconds, bt=0.5, seed=1):
    """2-level GMSK deviation, like D-Star (4800, BT 0.5) or AIS / packet 9600."""
    rng = np.random.default_rng(seed)
    sps = FS // rate
    up = np.repeat(2 * rng.integers(0, 2, int(seconds * FS) // sps + 20) - 1, sps).astype(np.float64)
    t = np.arange(-2 * sps, 2 * sps + 1) / sps
    g = np.exp(-t ** 2 / (2 * (np.sqrt(np.log(2)) / (2 * np.pi * bt)) ** 2))
    return np.convolve(up, g / g.sum(), mode="same")[:int(seconds * FS)] * dev


SIGNALS = {
    "4fsk4800": lambda: dec.fsk_wave(4800, 4, 1944, 0.7, FS, seed=7),   # DMR / P25 phase 1 / Fusion
    "4fsk2400": lambda: dec.fsk_wave(2400, 4, 1050, 0.7, FS, seed=8),   # NXDN48 / dPMR
    "2fsk4800": lambda: _gmsk(4800, 2400, 0.7),                         # D-Star
    "2fsk9600": lambda: _gmsk(9600, 2400, 0.7),                         # AIS / packet 9600
    "2fsk2400": lambda: dec.fsk_wave(2400, 2, 2400, 0.7, FS, seed=3),   # 2-level RRC data
}


@pytest.mark.parametrize("kind", sorted(SIGNALS))
@pytest.mark.parametrize("snr", [None, 0.1, 0.3])
def test_fsk_family(kind, snr):
    """Recognized cleanly and with white noise of 10 % / 30 % of the peak deviation."""
    x = SIGNALS[kind]()
    if snr:
        x = x + np.random.default_rng(7).normal(0, snr * np.percentile(np.abs(x), 99), len(x))
    r = dec.classify_digital(x)
    assert r is not None
    assert r["kind"] == kind
    assert r["levels"] == int(kind[0]) and r["rate"] == int(kind[4:])
    assert 0 < r["conf"] <= 1


def test_pocsag_nrz_is_2fsk1200():
    bits = np.asarray(dec.pocsag_bits(1234567, "classifier test message"))
    spb = FS / 1200.0
    idx = np.minimum((np.arange(int(len(bits) * spb)) / spb).astype(int), len(bits) - 1)
    r = dec.classify_digital(np.where(bits[idx] == 1, -4500.0, 4500.0)[FS // 2:FS // 2 + int(0.7 * FS)])
    assert r is not None and r["kind"] == "2fsk1200"


def test_aprs_audio_is_afsk1200():
    audio = 3000.0 * dec.aprs_afsk("N0CALL", "APRS", [], "!1829.17N/06955.87W>test " * 4, FS)
    r = dec.classify_digital(audio[:int(0.7 * FS)])
    assert r is not None and r["kind"] == "afsk1200"


def test_m17_capture_is_4fsk4800():
    import os
    sym = os.path.join(os.path.dirname(dec.__file__), "demo_m17.sym")
    r = dec.classify_digital(dec.demo_m17_wave(sym, FS)[FS:FS + int(0.7 * FS)])
    assert r is not None and r["kind"] == "4fsk4800"


@pytest.mark.parametrize("make", [
    lambda t: np.random.default_rng(0).normal(0, 1500, len(t)),                            # noise
    lambda t: 2500 * np.sin(2 * np.pi * 1000 * t) + np.random.default_rng(1).normal(0, 200, len(t)),  # test tone
    lambda t: 2500 * np.sin(2 * np.pi * 440 * t) * (1 + 0.5 * np.sin(2 * np.pi * 3 * t)),  # warbling tone
    lambda t: 1500 * np.sin(2 * np.pi * 770 * t) + 1500 * np.sin(2 * np.pi * 1336 * t),     # DTMF "5"
    lambda t: sum(a * np.sin(2 * np.pi * f * t + p) for a, f, p in                          # vowel-like harmonics
                  [(1500, 180, 0), (900, 360, 1), (600, 540, 2), (400, 720, .5), (300, 1100, 1.2)])
    * (1 + 0.8 * np.sin(2 * np.pi * 4 * t)),
], ids=["noise", "tone", "warble", "dtmf", "vowel"])
def test_analog_and_noise_are_not_digital(make):
    t = np.arange(int(0.7 * FS)) / FS
    assert dec.classify_digital(make(t)) is None


def test_noise_never_triggers():
    rng = np.random.default_rng(42)
    hits = [dec.classify_digital(rng.normal(0, 1500, int(0.7 * FS))) for _ in range(40)]
    assert hits == [None] * 40


def test_short_input_returns_none():
    assert dec.classify_digital(np.zeros(1000)) is None
