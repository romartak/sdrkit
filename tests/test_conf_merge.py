"""sdrkit_merge_conf (files/sdrkit-lib.sh): updates add new settings without touching the user's values."""
import subprocess

from conftest import FILES


def merge(tpl, dst):
    out = subprocess.run(["bash", "-c", 'source "$1/sdrkit-lib.sh" && sdrkit_merge_conf "$2" "$3"', "_", FILES, str(tpl), str(dst)],
                         capture_output=True, text=True, check=True)
    return int(out.stdout.strip().splitlines()[-1])


def test_new_keys_are_appended_and_user_values_kept(tmp_path):
    tpl = tmp_path / "new.conf"
    dst = tmp_path / "user.conf"
    tpl.write_text('# comment\nREGION="americas"\nADMIN_PASSWORD=""\nNEW_OPTION="1"\n  INDENTED_IS_IGNORED=1\nOTHER_NEW="x y"\n')
    dst.write_text('REGION="europe"\nADMIN_PASSWORD="secret"\n')
    assert merge(tpl, dst) == 2
    text = dst.read_text()
    assert 'REGION="europe"' in text and 'REGION="americas"' not in text
    assert 'ADMIN_PASSWORD="secret"' in text
    assert 'NEW_OPTION="1"' in text and 'OTHER_NEW="x y"' in text
    assert merge(tpl, dst) == 0, "a second merge must not add anything"


def test_missing_files_are_harmless(tmp_path):
    assert merge(tmp_path / "missing.conf", tmp_path / "also-missing.conf") == 0
