"""Instant replay ("⏪ What did they say?"): the radio keeps the last seconds heard in RAM and can save them."""
import io
import json
import threading
import time
import urllib.error
import urllib.request
import wave

import numpy as np

import sdrkit_radio as radio
from test_server import post, server  # noqa: F401  (the demo server fixture)

FS = radio.AUDIO_RATE
BLK = radio.BLOCK // 40   # audio samples per radio block


def info(freq=462562500, **kw):
    return dict({"freq": freq, "mod": "nfm", "name": "", "db": -40.0}, **kw)


def feed(buf, secs, audible=True, value=1000, **kw):
    for _ in range(int(secs * FS / BLK)):
        buf.feed(np.full(BLK, value, dtype=np.int16), audible, info(**kw))


def test_keeps_only_the_last_seconds():
    buf = radio.ReplayBuffer(secs=2)
    feed(buf, 5)
    assert 1.9 <= buf.secs() <= 2.0
    pcm, meta = buf.snapshot()
    assert len(pcm) <= 2 * FS and meta["secs"] == buf.secs()
    assert len(meta["tx"]) == 1 and meta["tx"][0]["freq"] == 462562500


def test_silence_is_skipped_and_transmissions_are_separated():
    buf = radio.ReplayBuffer(secs=30, gap=0.5)
    feed(buf, 1.0, value=1000)
    feed(buf, 3.0, audible=False)          # squelch closed: nothing is kept
    feed(buf, 1.0, value=2000, ctcss=88.5)
    pcm, meta = buf.snapshot()
    one = int(FS / BLK) * BLK / FS         # ~1 s in whole radio blocks
    assert abs(meta["secs"] - (2 * one + 0.5)) <= 0.05   # 1 s + 0.5 s pause + 1 s
    assert [t.get("ctcss") for t in meta["tx"]] == [None, 88.5]
    assert pcm[0] == 1000 and pcm[-1] == 2000
    assert not pcm[int(1.1 * FS):int(1.4 * FS)].any()


def test_a_new_frequency_starts_a_new_transmission():
    buf = radio.ReplayBuffer(secs=30)
    feed(buf, 1.0, freq=446006250)
    feed(buf, 1.0, freq=446018750)
    _, meta = buf.snapshot()
    assert [t["freq"] for t in meta["tx"]] == [446006250, 446018750]


def test_no_leading_pause_after_trimming():
    buf = radio.ReplayBuffer(secs=1.2, gap=0.5)
    feed(buf, 1.0, value=1000)
    feed(buf, 0.2, audible=False)
    feed(buf, 1.0, value=2000)
    pcm, meta = buf.snapshot()
    assert pcm[0] != 0, "the replay must not start with the pause between transmissions"
    assert len(meta["tx"]) == 1


def test_zero_turns_it_off():
    buf = radio.ReplayBuffer(secs=0)
    feed(buf, 2)
    assert buf.secs() == 0 and len(buf.snapshot()[0]) == 0


def test_saved_as_a_recording(tmp_path):
    rec = radio.Recorder(str(tmp_path), min_sec=5.0)
    pcm = np.full(FS // 2, 500, dtype=np.int16)   # shorter than REC_MIN_SEC: kept anyway, the user asked for it
    meta = rec.save_clip(pcm, info(ctcss=88.5), when=time.time() - 20)
    assert meta["kind"] == "replay" and meta["duration"] == 0.5 and meta["ctcss"] == 88.5
    with wave.open(str(tmp_path / meta["file"])) as w:
        assert w.getframerate() == FS and w.getnframes() == len(pcm)
    assert [m["file"] for m in rec.list()] == [meta["file"]]


def test_replay_end_to_end(server):  # noqa: F811
    """Demo walkie-talkie: listen for a few seconds, fetch the replay WAV and save it to Recordings."""
    assert post(server, "/api/radio", {"freq": 462562500, "mod": "nfm", "squelch": -45, "activate": True})[0] == 200
    stop = threading.Event()

    def listen():   # an open audio stream keeps the radio running, as a phone listening would
        try:
            with urllib.request.urlopen(server + "/api/radio/audio", timeout=20) as r:
                while not stop.is_set() and r.read(4800):
                    pass
        except OSError:
            pass

    t = threading.Thread(target=listen, daemon=True)
    t.start()
    wav = None
    for _ in range(60):
        time.sleep(0.5)
        try:
            with urllib.request.urlopen(server + "/api/radio/replay.wav", timeout=10) as r:
                if float(r.headers["X-Replay-Secs"]) >= 2:
                    wav, clip_id = r.read(), int(r.headers["X-Replay-Id"])
                    break
        except urllib.error.HTTPError as e:
            assert e.code == 404 and "error" in json.loads(e.read())
    stop.set()
    assert wav, "the replay buffer stayed empty"
    with wave.open(io.BytesIO(wav)) as w:
        assert w.getframerate() == FS and w.getnframes() >= 1.9 * FS   # X-Replay-Secs is rounded to 0.1 s
        assert np.abs(np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)).max() > 1000
    code, body = post(server, "/api/radio/replay", {"id": clip_id})
    assert code == 200 and body["saved"]["kind"] == "replay" and body["saved"]["duration"] >= 1.9
    with urllib.request.urlopen(server + "/api/recordings", timeout=10) as r:
        files = [m["file"] for m in json.load(r)["items"] if m.get("kind") == "replay"]
    assert body["saved"]["file"] in files
