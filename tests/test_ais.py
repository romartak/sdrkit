"""AIS ships: NMEA decoder (checksum, fragments, message types), the manager in demo mode and the API."""
import json
import time
import urllib.request

import sdrkit_decoders as dec
from test_server import post, server  # noqa: F401  (the demo server fixture)

# A well-known sample: type 1 position report, MMSI 477553000, near Hong Kong
KNOWN = "!AIVDM,1,1,,B,177KQJ5000G?tO`K>RA1wUbN0TKH,0*5C"


def test_decodes_a_known_position_report():
    p = dec.AisParser()
    assert p.feed(KNOWN) == 477553000
    s = p.snapshot()[0]
    assert s["mmsi"] == 477553000 and s["cls"] == "A" and s["status"] == 5
    assert abs(s["lat"] - 47.58283) < 1e-4 and abs(s["lon"] + 122.34583) < 1e-4
    assert s["sog"] == 0.0 and abs(s["cog"] - 51.0) < 0.05 and s["heading"] == 181


def test_rejects_bad_checksum_and_noise():
    p = dec.AisParser()
    assert p.feed(KNOWN[:-2] + "00") is None
    assert p.feed("hello world") is None
    assert p.feed("$GPGGA,1,2,3*00") is None
    assert p.snapshot() == []


def test_encoder_decoder_round_trip():
    p = dec.AisParser()
    for ln in dec.ais_encode_static(366123456, "Caribbean Trader", 70, "HI1234", "Haina", 190, 28, 6.5, imo=9876543):
        p.feed(ln)
    for ln in dec.ais_encode_position(366123456, 18.4321, -69.8765, 12.3, 271.5, 270):
        p.feed(ln)
    s = p.snapshot()[0]
    assert s["name"] == "CARIBBEAN TRADER" and s["callsign"] == "HI1234" and s["dest"] == "HAINA"
    assert s["shiptype"] == 70 and s["kind"] == "cargo" and s["length"] == 190 and s["beam"] == 28 and s["imo"] == 9876543
    assert abs(s["lat"] - 18.4321) < 1e-4 and abs(s["lon"] + 69.8765) < 1e-4
    assert s["sog"] == 12.3 and s["cog"] == 271.5 and s["heading"] == 270 and s["count"] == 2


def test_class_b_and_unavailable_position():
    p = dec.AisParser()
    for ln in dec.ais_encode_class_b(338123456, -33.9, 151.2, 5.5, 90.0, 88):
        p.feed(ln)
    s = p.snapshot()[0]
    assert s["cls"] == "B" and abs(s["lat"] + 33.9) < 1e-4 and abs(s["lon"] - 151.2) < 1e-4
    q = dec.AisParser()
    for ln in dec.ais_encode_position(366999999, 91.0, 181.0):
        q.feed(ln)
    assert "lat" not in q.snapshot()[0]


def test_fragments_arrive_out_of_order_noise_between():
    p = dec.AisParser()
    a, b = dec.ais_encode_static(366000001, "Two Parts", 80, "AB1", "X", 100, 15)
    assert p.feed(a) is None and p.feed("garbage") is None
    assert p.feed(b) == 366000001 and p.snapshot()[0]["name"] == "TWO PARTS"


def test_old_ships_are_dropped_and_emergency_flagged():
    p = dec.AisParser()
    for ln in dec.ais_encode_position(366000002, 10.0, -60.0):
        p.feed(ln, now=1000.0)
    assert len(p.snapshot(max_age=600, now=1500.0)) == 1 and p.snapshot(max_age=600, now=2000.0) == []
    assert dec.ais_emergency({"mmsi": 970123456}) and dec.ais_emergency({"mmsi": 1, "status": 14}) and not dec.ais_emergency({"mmsi": 366000002})


def test_ship_kinds():
    assert [dec.ais_kind(c) for c in (30, 52, 36, 37, 69, 79, 89, 35, 0, None, 51)] == \
        ["fishing", "tug", "sailing", "pleasure", "passenger", "cargo", "tanker", "military", "other", "other", "service"]


def test_demo_manager_fills_the_map(server):  # noqa: F811
    post(server, "/api/ais", {"activate": True})
    for _ in range(40):
        with urllib.request.urlopen(server + "/api/ais", timeout=10) as r:
            d = json.loads(r.read())
        if len(d["ships"]) >= 8 and any(s.get("emerg") for s in d["ships"]) and any(s.get("name") for s in d["ships"]):
            break
        time.sleep(0.5)
    assert len(d["ships"]) >= 8 and d["messages"] > 8
    assert any(s.get("emerg") for s in d["ships"]) and d["location"] and "dist_km" in d["ships"][0]
    assert {"cargo", "tanker"} <= {s["kind"] for s in d["ships"]}


def test_catalog_lists_ais():
    assert [i for i in dec.status()["items"] if i["key"] == "ais"][0]["where"] == "panel"
