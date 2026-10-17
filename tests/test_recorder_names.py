"""Recording file names must be short and free of spaces, commas and parentheses."""
import os

import sdrkit_radio as radio


def _open(tmp_path, mod, name=""):
    rec = radio.Recorder(str(tmp_path))
    item = rec._open("manual", {"freq": 446.00625e6, "mod": mod, "name": name})
    item["w"].close()
    return os.path.basename(item["path"])


def test_digital_name_is_short(tmp_path):
    fname = _open(tmp_path, "dsd")
    assert fname.endswith("_446.0063MHz_Digital.wav")
    assert not any(c in fname for c in " (),")


def test_wide_fm_has_no_space(tmp_path):
    assert " " not in _open(tmp_path, "nfmw")


def test_name_is_appended(tmp_path):
    assert _open(tmp_path, "nfm", "PMR 1").endswith("_FM_PMR-1.wav")


def test_aar_channel_count():
    js = open(os.path.join(os.path.dirname(__file__), "..", "files", "web", "canales.js"), encoding="utf-8").read()
    start, stop, step = 160.215, 161.565, 0.015
    assert round((stop - start) / step) + 1 == 91
    assert "91 canales AAR" in js and "97 canales" not in js
