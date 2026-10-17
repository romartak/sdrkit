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


def test_cli_has_doctor_backup_restore_in_both_languages():
    cli = open(os.path.join(FILES, "sdrkit-cli.sh"), encoding="utf-8").read()
    for word in ("doctor|diagnóstico", "backup|copia", "restore|restaurar"):
        assert word in cli


def test_version_matches_server():
    root = os.path.dirname(FILES)
    ver = open(os.path.join(root, "VERSION")).read().strip()
    assert 'return "%s"' % ver in open(os.path.join(FILES, "sdrkit_server.py"), encoding="utf-8").read()
