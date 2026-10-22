"""Business panel: summary of the activity log (per hour, per day, busiest channels, longest transmission)."""
import json
import time
import urllib.request

import sdrkit_radio as radio
from test_server import server  # noqa: F401  (the demo server fixture)

NOON = time.mktime((2026, 10, 18, 12, 0, 0, 0, 0, -1))


def tx(day_offset, hour, dur, name="Taxi", freq=151625000):
    t = time.mktime((2026, 10, 18 - day_offset, hour, 30, 0, 0, 0, -1))
    return {"t": t, "freq": freq, "mod": "nfm", "name": name, "dur": dur}


def test_counts_per_hour_day_and_channel():
    items = [tx(0, 9, 4.0), tx(0, 9, 6.0, "Obra", 462562500), tx(1, 22, 30.0), tx(0, 10, 2.0)]
    s = radio.activity_stats(items, days=7, now=NOON)
    assert s["total"] == 4 and s["secs"] == 42.0
    assert s["hours"][9]["n"] == 2 and s["hours"][22]["n"] == 1 and s["hours"][3]["n"] == 0
    assert [d["n"] for d in s["per_day"]][-2:] == [1, 3] and len(s["per_day"]) == 7
    assert s["top"][0]["name"] == "Taxi" and s["top"][0]["n"] == 3
    assert s["longest"]["dur"] == 30.0


def test_ignores_old_and_broken_entries():
    items = [tx(9, 9, 5.0), {"t": "x", "dur": 3}, {"freq": 1}, tx(0, 8, 1.0, "", 462562500)]
    s = radio.activity_stats(items, days=7, now=NOON)
    assert s["total"] == 1 and s["top"][0]["name"] == "" and s["top"][0]["freq"] == 462562500


def test_empty_log():
    s = radio.activity_stats([], days=3, now=NOON)
    assert s["total"] == 0 and s["longest"] is None and s["top"] == [] and len(s["per_day"]) == 3


def test_days_are_clamped():
    assert radio.activity_stats([], days=0, now=NOON)["days"] == 1
    assert radio.activity_stats([], days=9999, now=NOON)["days"] == 90


def test_demo_data_fills_the_panel():
    s = radio.activity_stats(radio.demo_activity(NOON), days=7, now=NOON)
    assert s["total"] > 50 and s["top"] and s["longest"] and sum(h["n"] for h in s["hours"]) == s["total"]


def test_endpoint_in_demo_mode(server):  # noqa: F811
    with urllib.request.urlopen(server + "/api/activity/stats?days=7", timeout=10) as r:
        s = json.loads(r.read())
    assert s["days"] == 7 and len(s["hours"]) == 24 and s["total"] > 0
