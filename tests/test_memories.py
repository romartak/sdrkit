"""Example memories created on first start follow the region and the configured language."""
import sdrkit_radio as radio


def test_language_of_seeded_memories(monkeypatch):
    monkeypatch.delenv("SDRKIT_LANG", raising=False)
    monkeypatch.setenv("LANG", "es_MX.UTF-8")
    assert radio.ui_lang({}) == "es"
    assert radio.ui_lang({"SDRKIT_LANG": "en"}) == "en"
    monkeypatch.setenv("LANG", "en_GB.UTF-8")
    assert radio.ui_lang({}) == "en"
    en = radio.default_memories("americas", "en")
    es = radio.default_memories("americas", "es")
    assert [m["freq"] for m in en] == [m["freq"] for m in es]
    assert any(m["group"] == "Marine VHF" for m in en)
    assert any(m["group"] == "Marina VHF" for m in es)


def test_region_changes_the_walkie_talkie_band():
    eu = radio.default_memories("europa", "en")
    am = radio.default_memories("americas", "en")
    assert eu[0]["group"] == "PMR446" and abs(eu[0]["freq"] - 446006250) < 2
    assert am[0]["group"] == "FRS/GMRS" and am[0]["freq"] == 462562500
    assert len({m["id"] for m in am}) == len(am)


def test_repeater_memories_keep_tone_and_offset(tmp_path):
    store = radio.MemoryStore(str(tmp_path / "m.json"), "americas", "es")
    rep = store.upsert({"freq": 146.94e6, "name": "Cerro", "group": "Repetidoras DO", "tone": "100", "offset": -600})
    assert rep["tone"] == "100.0" and rep["offset"] == -600
    assert store.upsert({"freq": 442.1e6, "tone": "d023"})["tone"] == "D023N"
    assert store.upsert({"freq": 442.2e6, "tone": "D754I"})["tone"] == "D754I"
    plain = store.upsert({"freq": 146.52e6, "tone": "hola", "offset": "x"})
    assert "tone" not in plain and "offset" not in plain
    assert "tone" not in store.upsert({"freq": 146.53e6, "tone": "12"})  # códigos de walkie se traducen en el panel
    again = radio.MemoryStore(str(tmp_path / "m.json"), "americas", "es")
    assert any(m.get("tone") == "100.0" and m.get("offset") == -600 for m in again.list())
