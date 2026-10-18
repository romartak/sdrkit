"""Voice-inversion "scrambler" support: VoiceInverter mirrors the voice band and undoes itself."""
import numpy as np
import pytest

import sdrkit_radio as radio

FS = radio.AUDIO_RATE


def peak_hz(x):
    x = x[2000:]  # skip the filters' start-up
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    return np.fft.rfftfreq(len(x), 1 / FS)[np.argmax(spec)]


def tone(f, secs=1.0):
    return (0.5 * np.sin(2 * np.pi * f * np.arange(int(FS * secs)) / FS)).astype(np.float32)


def blocks(inv, x, n=480):
    """Feed the audio in radio-sized blocks, as the live chain does."""
    return np.concatenate([inv(x[i:i + n]) for i in range(0, len(x), n)])


@pytest.mark.parametrize("f_inv", [2632, 3000, 3300])
def test_tone_is_mirrored(f_inv):
    for f in (500, 1000, 2000):
        assert abs(peak_hz(blocks(radio.VoiceInverter(f_inv), tone(f))) - (f_inv - f)) < 15


def test_inverting_twice_restores_the_voice():
    rng = np.random.default_rng(1)
    t = np.arange(FS) / FS
    voice = sum(a * np.sin(2 * np.pi * f * t + p) for a, f, p in zip(rng.uniform(.1, .3, 6), (450, 820, 1230, 1630, 2050, 2600), rng.uniform(0, 6, 6)))
    voice = voice.astype(np.float32)
    back = blocks(radio.VoiceInverter(3000), blocks(radio.VoiceInverter(3000), voice))
    once = blocks(radio.VoiceInverter(3000), voice)

    def spectrum(x):  # what the ear hears: the energy at each frequency (the phase does not matter)
        x = x[4000:]
        return np.abs(np.fft.rfft(x * np.hanning(len(x))))[:3400]

    def similar(x, y):
        return float(np.dot(x, y) / np.sqrt(np.dot(x, x) * np.dot(y, y)))

    assert similar(spectrum(back), spectrum(voice)) > 0.95       # inverting twice gives the voice back
    assert similar(spectrum(once), spectrum(voice)) < 0.3        # inverting once really scrambles it
    assert 0.8 < np.std(back[4000:]) / np.std(voice[4000:]) < 1.2


def test_radio_param_is_validated():
    v = None
    for cls in vars(radio).values():
        if isinstance(cls, type) and hasattr(cls, "_validate") and hasattr(cls, "set_params"):
            v = cls._validate
    assert v is not None
    base = {"freq": 462.5625e6, "mod": "nfm"}
    assert v(None, dict(base, inv=3300))["inv"] == 3300
    assert v(None, dict(base, inv="2632.4"))["inv"] == 2632
    for bad in (0, None, "", "x", 100, 9000):
        assert v(None, dict(base, inv=bad))["inv"] == 0
