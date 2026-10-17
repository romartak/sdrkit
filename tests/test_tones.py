"""Sub-audible tone squelch (CTCSS, DCS) and DTMF detection."""
import numpy as np
import pytest

import sdrkit_radio as radio

FS = radio.SUB_RATE


def _noise(n, sd, seed=1):
    return np.random.default_rng(seed).normal(0, sd, n)


@pytest.mark.parametrize("tone", [67.0, 88.5, 100.0, 123.0, 151.4, 192.8, 250.3])
def test_ctcss_detects_standard_tones(tone):
    t = np.arange(int(2.5 * FS)) / FS
    x = 600 * np.sin(2 * np.pi * tone * t) + _noise(len(t), 250)
    r = radio.detect_ctcss(x)
    assert r is not None, "no tone found"
    found, measured, dev, snr = r
    assert found == tone
    assert abs(measured - tone) < 1.0
    assert 400 < dev < 800
    assert snr > 18


def test_ctcss_ignores_noise():
    assert radio.detect_ctcss(_noise(int(2.5 * FS), 300)) is None


def _dcs_wave(code, inverted=False, seconds=2.5, start_bit=7, dev=600.0, noise=150.0):
    word = radio.dcs_word(code)
    bits = [(word >> ((start_bit + i) % 23)) & 1 for i in range(int(seconds * 134.4) + 30)]
    spb = FS / 134.4
    n = int(seconds * FS)
    idx = np.minimum((np.arange(n) / spb).astype(int), len(bits) - 1)
    x = np.where(np.asarray(bits)[idx] == 1, dev, -dev).astype(np.float64)
    if inverted:
        x = -x
    return x + _noise(n, noise, seed=code)


def test_dcs_words_are_unique_golay_codewords():
    words = {radio.dcs_word(c) for c in radio.DCS_CODES}
    assert len(words) == len(radio.DCS_CODES) == 104
    for c in radio.DCS_CODES:
        w = radio.dcs_word(c)
        assert w < (1 << 23)
        assert w & 0x1FF == c          # the 9 code bits are sent first
        assert (w >> 9) & 0b111 == 0b100  # then the fixed "100" marker


@pytest.mark.parametrize("code", [0o023, 0o047, 0o125, 0o244, 0o411, 0o754])
def test_dcs_detects_normal_codes(code):
    r = radio.detect_dcs(_dcs_wave(code))
    assert r is not None
    found, inverted, quality = r
    # 023N and 047I are the same bit stream: accept the documented equivalent
    assert (found, inverted) == (code, False) or radio.DCS_EQUIV.get(found) == code
    assert quality >= 0.88


def test_dcs_inverted_polarity():
    r = radio.detect_dcs(_dcs_wave(0o125, inverted=True))
    assert r is not None
    found, inverted, _ = r
    assert inverted or radio.DCS_EQUIV.get(found) is not None


def test_dcs_name_shows_equivalent():
    assert radio.dcs_name(0o023, False).startswith("D023N")
    assert "≡" in radio.dcs_name(0o023, False)


def test_dcs_ignores_noise():
    assert radio.detect_dcs(_noise(int(2.5 * FS), 500)) is None


def _dtmf(keys, fs=radio.AUDIO_RATE, on=0.09, off=0.07):
    out = []
    for k in keys:
        row = next(i for i, r in enumerate(radio.DTMF_KEYS) if k in r)
        col = radio.DTMF_KEYS[row].index(k)
        t = np.arange(int(on * fs)) / fs
        out.append(0.3 * np.sin(2 * np.pi * radio.DTMF_LOW[row] * t) + 0.3 * np.sin(2 * np.pi * radio.DTMF_HIGH[col] * t))
        out.append(np.zeros(int(off * fs)))
    x = np.concatenate(out) + np.random.default_rng(3).normal(0, 0.01, sum(len(o) for o in out))
    return x.astype(np.float32)


def test_dtmf_decodes_all_keys():
    keys = "123A456B789C*0#D"
    dec = radio.DtmfDecoder()
    x = _dtmf(keys)
    got = "".join(dec.feed(x[i:i + 1200]) for i in range(0, len(x), 1200))
    assert got == keys


def test_dtmf_rejects_single_tones_and_voice_like_audio():
    dec = radio.DtmfDecoder()
    fs = radio.AUDIO_RATE
    t = np.arange(fs) / fs
    sweep = 0.5 * np.sin(2 * np.pi * (300 + 900 * t) * t)  # a gliding tone, like a whistle
    single = 0.5 * np.sin(2 * np.pi * 770 * t)
    assert dec.feed(np.concatenate((sweep, single)).astype(np.float32)) == ""
