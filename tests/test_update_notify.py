"""New-version notices: off until the user chooses, and only a GitHub check (no data sent) when turned on."""
import json
import os
import subprocess
import sys
import time
import urllib.request

import pytest

from conftest import FILES
from test_server import _free_port, post


@pytest.fixture(scope="module")
def server(tmp_path_factory):
    """Demo server that pretends GitHub has a newer version (SDRKIT_DEMO_LATEST)."""
    port = _free_port()
    env = dict(os.environ, SDRKIT_STATE=str(tmp_path_factory.mktemp("state")), SDRKIT_DEMO_LATEST="99.0.0")
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


def update(base):
    with urllib.request.urlopen(base + "/api/status", timeout=10) as r:
        return json.load(r)["update"]


def test_not_asked_yet_and_nothing_checked(server):
    u = update(server)
    assert u["notify"] is None, "the panel must ask before checking anything"
    assert "checked" not in u


def test_turning_it_on_checks_github_and_reports_the_new_version(server):
    code, body = post(server, "/api/system/autoupdate", {"on": True})
    assert code == 200 and body["notify"] is True
    for _ in range(30):
        u = update(server)
        if u.get("checked"):
            break
        time.sleep(0.2)
    assert u["notify"] is True and u["ok"] and u["latest"] == "99.0.0" and u["behind"] > 0
    assert isinstance(u["changes"], list)


def test_turning_it_off_is_remembered(server):
    code, body = post(server, "/api/system/autoupdate", {"on": False})
    assert code == 200 and body["notify"] is False
    assert update(server)["notify"] is False


def test_a_manual_check_also_updates_the_version_dot(server):
    with urllib.request.urlopen(server + "/api/system/update", timeout=10) as r:
        res = json.load(r)
    assert res["latest"] == "99.0.0"
    assert update(server)["latest"] == "99.0.0"
