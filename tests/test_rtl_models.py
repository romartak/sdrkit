"""RTL-SDR Blog V3 and V4 support, checked against a fake librtlsdr (tests/fake_librtlsdr.c).

The panel's real driver code (RtlSdr in sdrkit_server.py) talks to a library that reports the
V3's R820T tuner or the V4's R828D, so these tests catch a change that breaks either dongle."""
import ctypes
import ctypes.util
import os
import shutil
import subprocess

import numpy as np
import pytest

import sdrkit_server as srv

HERE = os.path.dirname(os.path.abspath(__file__))


@pytest.fixture(scope="module")
def fake_lib(tmp_path_factory):
    cc = shutil.which("cc") or shutil.which("gcc")
    if not cc:
        pytest.skip("no C compiler to build the fake librtlsdr")
    so = str(tmp_path_factory.mktemp("rtl") / "librtlsdr.so.0")
    subprocess.run([cc, "-shared", "-fPIC", "-O2", "-o", so, os.path.join(HERE, "fake_librtlsdr.c"), "-lm"], check=True)
    return so


@pytest.fixture
def dongle(fake_lib, monkeypatch):
    """Open the fake dongle with the panel's own RtlSdr class; model = "v3" or "v4"."""
    def open_(model):
        monkeypatch.setenv("FAKE_RTL_TUNER", "6" if model == "v4" else "5")
        monkeypatch.setattr(ctypes.util, "find_library", lambda name: fake_lib if name == "rtlsdr" else None)
        monkeypatch.setattr(srv.RtlSdr, "_lib", None)
        dev = srv.RtlSdr()
        dev.setup(2048000)
        return dev, ctypes.CDLL(fake_lib)
    return open_


def test_v3_is_detected(dongle):
    dev, _ = dongle("v3")
    assert dev.tuner == 5 and srv.TUNERS[dev.tuner] == "R820T/R820T2"
    assert dev.name == "RTLSDRBlog Blog V3"
    assert dev.min_hz == srv.RTL_MIN_HZ and dev.max_hz == 1766e6
    assert len(dev.gains) == 29 and max(dev.gains) == 49.6
    assert dev.set_gain(29.7) == 29.7


def test_v3_uses_direct_sampling_below_24_mhz(dongle):
    dev, lib = dongle("v3")
    assert dev.tune(146.52e6) and lib.fake_direct_sampling() == 0
    assert dev.tune(7.15e6) and lib.fake_direct_sampling() == 2       # HF: Q-branch direct sampling
    assert lib.fake_center_freq() == 7150000
    assert dev.tune(6.0e6) and lib.fake_direct_sampling_calls() == 1   # stays on, no needless re-switching
    assert dev.tune(24e6) and lib.fake_direct_sampling() == 0         # 24 MHz and up: normal tuner again
    assert dev.tune(1090e6) and lib.fake_direct_sampling() == 0


def test_v3_delivers_samples(dongle):
    dev, _ = dongle("v3")
    dev.tune(98.1e6)
    iq = dev.read(16384)
    assert iq.dtype == np.uint8 and iq.size == 16384 and 100 < iq.mean() < 155


def test_v4_never_uses_direct_sampling(dongle):
    dev, lib = dongle("v4")
    assert dev.tuner == 6 and dev.name == "RTLSDRBlog Blog V4" and dev.min_hz == 0.5e6
    for f in (7.15e6, 27.185e6, 146.52e6):
        assert dev.tune(f)
    assert lib.fake_direct_sampling_calls() == 0   # the V4 reaches HF through its own upconverter


def test_advanced_receiver_hf_profiles_follow_the_model():
    hf = ("am_mw", "sw49", "cb27")
    v3, v4 = srv.owrx_profiles("americas", "v3"), srv.owrx_profiles("americas", "v4")
    for name in hf:
        key3 = next(k for k in v3 if k.endswith(name))
        key4 = next(k for k in v4 if k.endswith(name))
        assert v3[key3].get("direct_sampling") == 2
        assert "direct_sampling" not in v4[key4]
