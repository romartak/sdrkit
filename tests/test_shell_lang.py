"""The shell helpers (installer, update and sdrkit command) pick the language from SDRKIT_LANG or the system."""
import os
import subprocess

from conftest import FILES

LIB = os.path.join(FILES, "sdrkit-lib.sh")


def _say(env_extra):
    env = {"PATH": os.environ["PATH"], **env_extra}
    cmd = 'source "%s"; sdrkit_lang_init; L "Hello" "Hola"' % LIB
    return subprocess.run(["bash", "-c", cmd], env=env, capture_output=True, text=True).stdout.strip()


def test_explicit_language_wins():
    assert _say({"SDRKIT_LANG": "es", "LANG": "en_US.UTF-8"}) == "Hola"
    assert _say({"SDRKIT_LANG": "en", "LANG": "es_MX.UTF-8"}) == "Hello"


def test_system_language_fallback():
    assert _say({"LANG": "es_MX.UTF-8"}) == "Hola"
    assert _say({"LANG": "C"}) == "Hello"


def test_scripts_have_valid_syntax():
    for name in ("sdrkit-lib.sh", "sdrkit-cli.sh", "sdrkit-update.sh", "sdrkit-netwatch.sh"):
        assert subprocess.run(["bash", "-n", os.path.join(FILES, name)]).returncode == 0
    root = os.path.dirname(FILES)
    for name in ("install.sh", "get.sh"):
        assert subprocess.run(["bash", "-n", os.path.join(root, name)]).returncode == 0
