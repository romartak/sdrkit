"""POCSAG / APRS encoders (used by the demo transmitters) and the multimon-ng output parser."""
import subprocess

import numpy as np
import pytest

import sdrkit_decoders as dec

MM_RATE = 22050


def _bch_ok(cw):
    """POCSAG codeword check: BCH(31,21) remainder 0 and even parity."""
    if bin(cw).count("1") % 2:
        return False
    v = cw >> 1
    for i in range(30, 9, -1):
        if v & (1 << i):
            v ^= 0x769 << (i - 10)
    return v == 0


def _words(bits):
    body = bits[576:]  # after the preamble
    return [int("".join(map(str, body[i:i + 32])), 2) for i in range(0, len(body) - 31, 32)]


def test_pocsag_codewords_are_valid():
    bits = dec.pocsag_bits(1234567, "SDR-Kit test")
    assert bits[:576] == [1, 0] * 288
    words = _words(bits)
    assert words[0] == dec.POCSAG_SYNC
    for i, w in enumerate(words):
        if i % 17 == 0:
            assert w == dec.POCSAG_SYNC, "every batch starts with the sync word"
        else:
            assert _bch_ok(w), "bad codeword %d: %08x" % (i, w)


def test_pocsag_address_lands_in_its_frame():
    ric = 200016
    words = _words(dec.pocsag_bits(ric, "X"))
    slot = (ric & 7) * 2
    addr = words[1 + slot]
    assert addr >> 31 == 0  # address codeword flag
    assert (addr >> 13) & 0x3FFFF == ric >> 3


def test_crc16_x25_reference_vector():
    assert dec._crc16_x25(b"123456789") == 0x906E


def _run_multimon(exe, demod, audio):
    pcm = (np.clip(audio, -1, 1) * 30000).astype("<i2").tobytes()
    p = subprocess.run([exe, "-t", "raw", "-a", demod, "-"], input=pcm, capture_output=True, timeout=60)
    return p.stdout.decode("utf-8", "replace")


@pytest.mark.multimon
def test_pocsag_round_trip_through_multimon(multimon):
    text = "UNIT 12 RETURN TO BASE 15:30"
    bits = np.asarray(dec.pocsag_bits(1234567, text))
    spb = MM_RATE / 1200.0
    idx = np.minimum((np.arange(int(len(bits) * spb)) / spb).astype(int), len(bits) - 1)
    audio = np.where(bits[idx] == 1, -0.5, 0.5)  # FM discriminator: bit 1 = lower frequency
    lines = [ln for ln in _run_multimon(multimon, "POCSAG1200", audio).splitlines() if ln.startswith("POCSAG")]
    assert lines, "multimon-ng decoded nothing"
    item = dec.parse_multimon(lines[0])
    assert item["kind"] == "POCSAG1200"
    assert item["address"] == "1234567"
    assert item["msg"] == text


@pytest.mark.multimon
def test_aprs_round_trip_through_multimon(multimon):
    info = "!1829.17N/06955.87W>SDR-Kit mobile 72 km/h"
    audio = 0.6 * dec.aprs_afsk("N0CALL-9", "APRS", ["WIDE1-1", "WIDE2-1"], info, MM_RATE)
    out = [ln for ln in _run_multimon(multimon, "AFSK1200", audio).splitlines() if ln.strip()]
    head = next(i for i, ln in enumerate(out) if ln.startswith("AFSK1200: fm "))
    item = dec.parse_multimon(out[head] + "\n" + out[head + 1])  # header + payload, as DataDecoder joins them
    assert item["kind"] == "APRS"
    assert item["from"] == "N0CALL-9"
    assert item["msg"] == info
    assert item["lat"] == pytest.approx(18.48617, abs=1e-4)
    assert item["lon"] == pytest.approx(-69.93117, abs=1e-4)


@pytest.mark.parametrize("line, kind, address, msg", [
    ("POCSAG1200: Address: 1234567  Function: 3  Alpha:   HELLO WORLD<EOT><NUL>", "POCSAG1200", "1234567", "HELLO WORLD"),
    ("POCSAG512: Address:  200016  Function: 0  Numeric: 555-0199", "POCSAG512", "200016", "555-0199"),
    ("FLEX|2026-10-16 10:00:00|1600/2/K/A|07.105|001234567|ALN|TEST MESSAGE", "FLEX", "001234567", "TEST MESSAGE"),
    ("FLEX: 2026-10-16 10:00:00 1600/2/A 07.105 [001234567] ALN TEST MESSAGE", "FLEX", "001234567", "TEST MESSAGE"),
])
def test_parse_multimon_pagers(line, kind, address, msg):
    item = dec.parse_multimon(line)
    assert item["kind"] == kind
    assert item["address"] == address
    assert item["msg"] == msg


def test_parse_multimon_passes_other_lines_through():
    item = dec.parse_multimon("EAS: ZCZC-WXR-TOR-012057+0030-1231234-KTBW/NWS-")
    assert item["kind"] == "EAS"
    assert "ZCZC" in item["text"]


@pytest.mark.parametrize("payload, expected", [
    ("!1829.17N/06955.87W>moving", (18.48617, -69.93117)),
    ("=4903.50N/07201.75W-fixed", (49.05833, -72.02917)),
    ("@092345z3355.00S/01825.00E_wx", (-33.91667, 18.41667)),
    (">status text only", None),
    ("", None),
])
def test_aprs_position(payload, expected):
    pos = dec.aprs_position(payload)
    if expected is None:
        assert pos is None
    else:
        assert pos == pytest.approx(expected, abs=1e-4)
