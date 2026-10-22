"""Listen-only user: VIEWER_PASSWORD gives a second login that can see and listen to everything but change nothing."""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import pytest

from conftest import FILES

ADMIN, VIEWER = "admin-pass-123", "viewer-pass-456"


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _start(tmp_path, conf_text):
    port = _free_port()
    conf = tmp_path / "sdrkit.conf"
    conf.write_text(conf_text)
    env = dict(os.environ, SDRKIT_STATE=str(tmp_path / "state"))
    p = subprocess.Popen([sys.executable, "sdrkit_server.py", "--demo", "--port", str(port), "--bind", "127.0.0.1",
                          "--conf", str(conf)], cwd=FILES, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = "http://127.0.0.1:%d" % port
    for _ in range(100):
        try:
            urllib.request.urlopen(base + "/login", timeout=1)
            return p, base
        except OSError:
            time.sleep(0.2)
    p.kill()
    pytest.fail("the demo server did not start")


@pytest.fixture(scope="module")
def srv(tmp_path_factory):
    p, base = _start(tmp_path_factory.mktemp("v"), 'ADMIN_PASSWORD="%s"\nVIEWER_PASSWORD="%s"\n' % (ADMIN, VIEWER))
    yield base
    p.terminate()
    p.wait(timeout=10)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def login(base, password):
    """Returns the cookie header for the password, or None if it was refused."""
    req = urllib.request.Request(base + "/login", urllib.parse.urlencode({"password": password}).encode(),
                                 {"Content-Type": "application/x-www-form-urlencoded"})
    try:
        urllib.request.build_opener(NoRedirect).open(req, timeout=10)
    except urllib.error.HTTPError as e:
        c = e.headers.get("Set-Cookie")
        return c.split(";")[0] if c else None
    return None


def call(base, path, cookie, data=None):
    headers = {"Cookie": cookie} if cookie else {}
    body = None
    if data is not None:
        body, headers["Content-Type"] = json.dumps(data).encode(), "application/json"
    try:
        with urllib.request.urlopen(urllib.request.Request(base + path, body, headers), timeout=10) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def test_both_passwords_log_in_and_a_wrong_one_does_not(srv):
    assert login(srv, ADMIN) and login(srv, VIEWER)
    assert login(srv, VIEWER) != login(srv, ADMIN)
    assert login(srv, "nope-nope-nope") is None


def test_roles_in_status(srv):
    a, v = login(srv, ADMIN), login(srv, VIEWER)
    assert json.loads(call(srv, "/api/status", a)[1])["role"] == "admin"
    assert json.loads(call(srv, "/api/status", v)[1])["role"] == "viewer"
    assert call(srv, "/api/status", None)[0] == 401


def test_viewer_can_look_and_listen(srv):
    v = login(srv, VIEWER)
    for path in ("/", "/api/radio", "/api/memories", "/api/recordings", "/api/activity", "/api/activity/stats", "/api/adsb",
                 "/api/ais", "/api/sensors", "/api/decoded", "/api/monitor", "/api/sweep", "/api/decoders"):
        assert call(srv, path, v)[0] == 200, path


def test_viewer_cannot_change_anything(srv):
    v, a = login(srv, VIEWER), login(srv, ADMIN)
    for path, data in (("/api/mode", {"mode": "radio"}), ("/api/radio", {"freq": 100e6}), ("/api/recordings/delete", {"files": ["x.wav"]}),
                       ("/api/activity/clear", {}), ("/api/sweep", {"start": 88e6}), ("/api/memories", {"freq": 1}), ("/api/ais", {"activate": True})):
        code, body = call(srv, path, v, data)
        assert code == 403 and json.loads(body)["error"].startswith("Modo de solo escucha"), path
    # the admin still can, and nothing happened to the radio because of the viewer
    assert call(srv, "/api/ais", a, {"gain": "auto"})[0] == 200


def test_viewer_does_not_see_wifi_logs_or_updates(srv):
    v, a = login(srv, VIEWER), login(srv, ADMIN)
    for path in ("/api/wifi", "/api/logs", "/api/system/update", "/api/system/update/log"):
        assert call(srv, path, v)[0] == 403, path
    assert call(srv, "/api/logs", a)[0] == 200


@pytest.mark.parametrize("name,conf,viewer_works", [
    ("admin_only", 'ADMIN_PASSWORD="%s"\n' % ADMIN, False),
    ("same_as_admin", 'ADMIN_PASSWORD="%s"\nVIEWER_PASSWORD="%s"\n' % (ADMIN, ADMIN), False),
])
def test_viewer_is_off_unless_set_and_different(tmp_path, name, conf, viewer_works):
    p, base = _start(tmp_path, conf)
    try:
        assert login(base, VIEWER) is None
        a = login(base, ADMIN)
        assert a and json.loads(call(base, "/api/status", a)[1])["role"] == "admin"
    finally:
        p.terminate()
        p.wait(timeout=10)


def test_without_admin_password_the_panel_stays_open(tmp_path):
    p, base = _start(tmp_path, 'VIEWER_PASSWORD="%s"\n' % VIEWER)
    try:
        assert json.loads(call(base, "/api/status", None)[1])["role"] == "admin"
    finally:
        p.terminate()
        p.wait(timeout=10)
