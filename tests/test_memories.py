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
