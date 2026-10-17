"""Smoke test of the web server in demo mode (fake SDR, no hardware)."""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

import pytest

from conftest import FILES


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def server(tmp_path_factory):
    port = _free_port()
    env = dict(os.environ, SDRKIT_STATE=str(tmp_path_factory.mktemp("state")))
    p = subprocess.Popen([sys.executable, "sdrkit_server.py", "--demo", "--port", str(port), "--bind", "127.0.0.1",
                          "--conf", "/nonexistent"], cwd=FILES, env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = "http://127.0.0.1:%d" % port
    for _ in range(100):
        try:
            urllib.request.urlopen(base + "/api/status", timeout=1)
            break
        except OSError:
            time.sleep(0.2)
    else:
        p.kill()
        pytest.fail("the demo server did not start")
    yield base
    p.terminate()
    p.wait(timeout=10)


def get(base, path):
    with urllib.request.urlopen(base + path, timeout=10) as r:
        body = r.read()
        return r.status, r.headers.get("Content-Type", ""), body


def post(base, path, data):
    req = urllib.request.Request(base + path, json.dumps(data).encode(), {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def test_status(server):
    code, ctype, body = get(server, "/api/status")
    s = json.loads(body)
    assert code == 200 and "json" in ctype
    assert s["demo"] is True
    for key in ("mode", "version"):
        assert key in s


def test_panel_and_translations_are_served(server):
    code, ctype, html = get(server, "/")
    assert code == 200 and "text/html" in ctype
    html = html.decode()
    assert "/i18n.js" in html
    scripts = [part.split('"')[0] for part in html.split('<script src="/')[1:]]
    assert scripts, "no scripts referenced"
    for name in scripts:
        code, ctype, body = get(server, "/" + name)
        assert code == 200 and "javascript" in ctype and body, name


def test_login_page(server):
    code, _, body = get(server, "/login")
    assert code == 200 and b"<form" in body


def test_switch_to_radio_and_tune(server):
    code, _ = post(server, "/api/mode", {"mode": "radio"})
    assert code == 200
    code, _ = post(server, "/api/radio", {"freq": 433475000, "mod": "nfm"})
    assert code == 200
    code, _, body = get(server, "/api/radio")
    assert json.loads(body)["params"]["freq"] == 433475000


def test_bad_input_is_rejected(server):
    code, body = post(server, "/api/mode", {"mode": "nonsense"})
    assert code == 400 and body.get("error")


def test_unknown_paths_404(server):
    for path in ("/nope.js", "/../etc/passwd", "/api/nothing-here"):
        try:
            code = get(server, path)[0]
        except urllib.error.HTTPError as e:
            code = e.code
        assert code == 404, path


def _start(tmp_path, *extra, conf_text=None):
    port = _free_port()
    conf = tmp_path / "sdrkit.conf"
    conf.write_text(conf_text or "")
    env = dict(os.environ, SDRKIT_STATE=str(tmp_path))
    p = subprocess.Popen([sys.executable, "sdrkit_server.py", "--port", str(port), "--bind", "127.0.0.1",
                          "--conf", str(conf), *extra], cwd=FILES, env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return p, "http://127.0.0.1:%d" % port


def test_refuses_to_start_without_password(tmp_path):
    p, _ = _start(tmp_path)
    assert p.wait(timeout=15) == 1
    assert b"ADMIN_PASSWORD" in p.stderr.read()


def test_login_lockout_after_repeated_failures(tmp_path):
    p, base = _start(tmp_path, "--demo", conf_text='ADMIN_PASSWORD="correct-horse"\n')
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(base + "/login", timeout=1)
                break
            except OSError:
                time.sleep(0.2)
        codes = []
        for _ in range(7):
            req = urllib.request.Request(base + "/login", data=b"password=wrong", method="POST")
            try:
                codes.append(urllib.request.urlopen(req, timeout=5).status)
            except urllib.error.HTTPError as e:
                codes.append(e.code)
        assert codes[:5] == [200] * 5 and codes[5:] == [429, 429]
    finally:
        p.terminate()
