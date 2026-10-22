"""The roadmap shown in the panel (files/web/roadmap.js) must match ROADMAP.md, and have an English version."""
import os
import re

from conftest import ROOT

STATUS = {"☐": "todo", "◐": "part", "✅": "done"}


def markdown_rows():
    rows = {}
    with open(os.path.join(ROOT, "ROADMAP.md"), encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^\|\s*(\d+)\s*\|\s*(\S+)[^|]*\|\s*\*\*(.+?)\*\*[^|]*\|", line)
            if m:
                rows[int(m.group(1))] = (STATUS[m.group(2)], m.group(3).strip())
    return rows


def panel_items():
    with open(os.path.join(ROOT, "files", "web", "roadmap.js"), encoding="utf-8") as f:
        src = f.read()
    return {int(n): (st, name) for n, st, name in re.findall(r'^\s*\[(\d+), "(done|part|todo)", "([^"]+)", "', src, re.M)}


def test_panel_roadmap_matches_roadmap_md():
    md, js = markdown_rows(), panel_items()
    assert md, "no rows parsed from ROADMAP.md"
    assert sorted(md) == list(range(1, len(md) + 1)), "ROADMAP.md numbers must be 1..N without gaps"
    assert js == md, "files/web/roadmap.js is out of sync with ROADMAP.md (number, status or name)"


def test_every_item_has_an_english_translation():
    with open(os.path.join(ROOT, "files", "web", "lang-en-roadmap.js"), encoding="utf-8") as f:
        src = f.read()
    items = {int(n) for n in re.findall(r'^\s*(\d+): \["', src, re.M)}
    assert items == set(markdown_rows())
    phases = re.search(r"phases: \{(.*?)\},\s*items:", src, re.S).group(1)
    assert len(re.findall(r"\d+: \"", phases)) == 8


def test_unified_server_is_on_the_roadmap_as_opt_in():
    with open(os.path.join(ROOT, "ROADMAP.md"), encoding="utf-8") as f:
        text = f.read()
    row = next(line for line in text.splitlines() if line.startswith("| 32 |"))
    assert "Servidor unificado" in row and "Opt-in" in row and "apagado por defecto" in row
