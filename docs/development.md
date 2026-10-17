# Development

SDR-Kit is small on purpose: Python 3 + numpy on the Pi, vanilla JavaScript in the browser, Bash for installation. No build step, no framework, nothing a Raspberry Pi Zero 2 W cannot run. You do **not** need a Pi or an SDR to work on the panel: the demo mode simulates a dongle with real, decodable signals.

- [Repository layout](#repository-layout)
- [Running the demo server](#running-the-demo-server)
- [Tests](#tests)
- [Continuous integration](#continuous-integration)
- [Coding conventions](#coding-conventions)
- [Translations](#translations)
- [Release process](#release-process)
- [Contributing](#contributing)

## Repository layout

```text
.
├── install.sh              Installer: interactive stage + 11-step background stage; --panel = quick update
├── get.sh                  One-line bootstrap: clone into /opt/sdrkit-src and run install.sh
├── sdrkit.conf             Configuration template (every key with its default)
├── VERSION                 Version shown by the panel and the CLI
├── CHANGELOG.md            Keep a Changelog format
├── README.md, README.es.md Project front pages (English, Spanish)
├── LICENSE                 MIT
├── CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
├── docs/                   This documentation (+ docs/es/, docs/media/screenshots/)
├── files/
│   ├── sdrkit_server.py    HTTP server, API, analyzer engine, mode manager, OpenWebRX+, WiFi, system, demo SDR
│   ├── sdrkit_radio.py     Radio DSP, squelch, CTCSS/DCS/DTMF, recorder, activity, memories, scanner
│   ├── sdrkit_decoders.py  multimon-ng, rtl_433, dump1090, DSD-FME, classifier, catalog, demo encoders
│   ├── demo_m17.sym        Recorded M17 symbols (voice + callsign) for the demo
│   ├── sdrkit-cli.sh       The `sdrkit` command
│   ├── sdrkit-update.sh    Updater / rollback
│   ├── sdrkit-lib.sh       Shared shell functions: config parser and merge, hotspot, CLI language
│   ├── sdrkit-netwatch.sh  WiFi / hotspot watchdog
│   ├── sdrkit.service, sdrkit-netwatch.service
│   └── web/                The panel (served as-is)
│       ├── index.html, app.css, favicon.svg, icon.svg, manifest.webmanifest
│       ├── app.js          Core (SDR object, tabs, status), advanced receiver, WiFi, system, updates
│       ├── analyzer.js, radio.js, decode.js, recs.js, canales.js, guia.js, antenas.js, help.js
│       ├── i18n.js         Translation engine
│       └── lang-en-*.js    English catalogs: html, app, analyzer, radio, help, server
├── tests/                  pytest suites + Node checks
├── tools/screenshots.mjs   Regenerates docs/media/screenshots from the demo server
└── .github/                CI and release workflows, issue/PR templates, Dependabot
```

How the pieces fit at runtime is described in [Architecture](architecture.md).

## Running the demo server

```sh
git clone https://github.com/romartak/sdrkit.git && cd sdrkit
pip install numpy
python3 files/sdrkit_server.py --demo --port 8080
```

Open <http://localhost:8080>. Append `?lang=en` or `?lang=es` to force a language.

| Option | Meaning |
|---|---|
| `--demo` | Simulated SDR (needs numpy). Sensors, aircraft and WiFi are simulated; update, reboot and power-off do nothing; OpenWebRX+ is not available |
| `--port N` | Listen port (default `PANEL_PORT`, 80) |
| `--bind ADDR` | Listen address (default `0.0.0.0`) |
| `--conf PATH` | Configuration file (default `/etc/sdrkit/sdrkit.conf`). Use `--conf /nonexistent` for a clean default configuration with **no password** |
| `--seed-owrx [--force]` | Write the band profiles into OpenWebRX+ settings and exit (used by the installer and `sdrkit profiles`) |

The demo keeps its state in `~/.sdrkit-demo` (override with `SDRKIT_STATE`). `SDRKIT_LANG=en` makes the example memories English.

Optional tools make the demo more complete: **multimon-ng** decodes the simulated POCSAG and APRS traffic, and **dsd-fme** decodes the recorded M17 transmission. rtl_433 and dump1090 are not needed (their output is simulated).

### Demo signals

| Signal | Frequency | Details |
|---|---|---|
| Walkie-talkie with CTCSS | 462.5625 MHz | NFM voice-like audio, 88.5 Hz tone |
| Walkie-talkie with DCS | 462.6125 MHz | DCS 023 |
| Repeater with DTMF | 146.52 MHz | CTCSS 100.0 Hz + DTMF `*123#` |
| PMR446 | 446.00625 MHz | CTCSS 67.0 Hz |
| Marine channel 16 | 156.8 MHz | NFM |
| Airband AM | 118.7 MHz | AM voice-like audio |
| FM broadcast | 98.1 MHz | WFM tones with a 19 kHz pilot, plus random stations across 88–108 MHz |
| **POCSAG pagers** | 152.84 MHz | Real POCSAG 1200 bursts (RICs 1234567, 200016, 1500003) |
| **APRS** | 144.39 MHz | Real AX.25/AFSK 1200 frames (N0CALL-9, XE1ABC-7, HI8XYZ), with positions |
| DMR-like 4FSK | 443.45 MHz | 4800 baud, RRC-filtered (exercises the classifier) |
| NXDN-like 4FSK | 451.0125 MHz | 2400 baud |
| **M17** | 433.475 MHz | Real recorded transmission, Codec2 voice, callsign XE1SDR |
| 433 MHz remote | 433.92 MHz | OOK, 24 bits repeated 4× every second (try zero span) |
| Carriers and wideband blocks | — | AM broadcast, 49 m shortwave, CB 27.185, 121.5, 126.9, 145.5, 146.94 MHz, ADS-B 1090 MHz, GPS L1, digital TV, cellular 850 |
| Sensors | — | Five rtl_433-style devices (weather stations, TPMS, doorbell) |
| Aircraft | — | Nine aircraft around the receiver location, one squawking 7700 |

The POCSAG and APRS signals are produced by real encoders in `sdrkit_decoders.py` (`pocsag_bits`, `aprs_afsk`), so multimon-ng decodes them exactly as it would off the air.

## Tests

Everything runs on a normal PC.

```sh
pip install numpy pytest
sudo apt install multimon-ng        # optional: enables the round-trip tests
pytest -v tests
node tests/i18n_check.mjs
for f in files/web/*.js; do node --check "$f"; done
bash -n install.sh get.sh files/*.sh && shellcheck -S warning -x install.sh get.sh files/*.sh
```

| Suite | Covers |
|---|---|
| `tests/test_tones.py` | CTCSS detection of standard tones and noise rejection; DCS Golay words, normal and inverted codes, equivalents; DTMF keys and rejection of single tones and voice-like audio |
| `tests/test_decoders.py` | POCSAG BCH codewords and framing, CRC-16/X.25, POCSAG and APRS round trips through multimon-ng, multimon-ng line parsing, APRS positions |
| `tests/test_classifier.py` | Digital-signal classifier: 2/4-FSK families at several SNRs, POCSAG, APRS, the M17 capture; analogue audio and noise are not reported as digital |
| `tests/test_server.py` | Demo server API: status, panel and catalogs served, login page, mode switch and tuning, input validation, 404s |
| `tests/test_conf_merge.py` | Configuration merge keeps user values and appends new keys |
| `tests/test_memories.py` | Example memories follow region and language |
| `tests/i18n_check.mjs` | Every literal `_t()`/`_tn()` string has an English entry; catalog entries keep placeholders, HTML tags and element ids; patterns are anchored; no interpolated template literals passed to `_t()` |
| `tests/ui_smoke.mjs <url>` | Playwright smoke test of the panel at a phone viewport in English and Spanish (tab names, page errors) |

The multimon-ng tests are skipped when the binary is missing. To run the browser test:

```sh
npm install --no-save playwright && npx playwright install chromium
python3 files/sdrkit_server.py --demo --port 8080 --conf /nonexistent &
node tests/ui_smoke.mjs http://127.0.0.1:8080
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

| Job | Steps |
|---|---|
| **Python** (3.11 and 3.13 — Raspberry Pi OS Bookworm and Trixie) | Install multimon-ng; `ruff check --select E9,F63,F7,F82`; `py_compile`; `pytest -v tests` |
| **Web panel** | `node --check` on every script; `node tests/i18n_check.mjs` |
| **Shell** | `bash -n` and `shellcheck -S warning -x` on the installer, `get.sh` and `files/*.sh` |
| **End to end** | Start the demo server; check `/`, `/api/status`, `/api/decoders`; decode a **POCSAG** page and an **APRS** packet through the whole radio → multimon-ng chain; Playwright smoke test in both languages |

`.github/workflows/release.yml` runs when a `v*` tag is pushed: it checks that the tag matches `VERSION`, extracts that version's notes from `CHANGELOG.md`, builds a source tarball with `git archive` and publishes the GitHub release.

> [!TIP]
> A red CI check means "do not update the Pi yet". Installed kits update from the branch head, not from releases.

## Coding conventions

| Area | Conventions |
|---|---|
| **General** | UTF-8, LF, final newline (`.editorconfig`). Keep CPU and memory in mind: everything runs on 4 × Cortex-A53 with 512 MB next to a 2.4 MS/s sample stream |
| **Python** | Standard library + numpy only (installed from apt as `python3-numpy`); must run on 3.11 and 3.13; 4-space indent, lines ≤ 120. Hot paths are vectorised numpy; filters keep state across blocks (`FirDecim`). Long-running work lives in daemon threads that never die on exceptions. Validate and clamp every API parameter; raise `ValueError` for user errors (becomes `400`) |
| **JavaScript** | Vanilla ES2017+, `"use strict"`, no dependencies, no CDN (the panel must work offline in the field). One IIFE module per file registered in `SDR.modules` with optional `init`, `onShow`, `onHide`, `onStatus`, `onVisibility` hooks. Use `SDR.api()` for requests, `SDR.esc()` for any text inserted as HTML, `$`/`$$` for queries |
| **Shell** | Bash with `set -o pipefail`; clean under `shellcheck -S warning`. Read configuration with `sdrkit_load_conf` (never `source` it), write it with `sdrkit_set_conf`. Bilingual messages with `L "English" "Español"` |
| **Configuration** | Every new key goes into `sdrkit.conf` with a safe default and a comment; existing kits receive it through the merge on update. Booleans accept yes/si |
| **Strings** | User-visible panel text is written in **Spanish** and wrapped in `_t()`; English goes into the catalogs (see below). Code comments in the existing files are mostly Spanish; new comments may be English |
| **Commits** | Small and focused, imperative subject ("Add NXDN96 to the classifier"); the updater shows commit subjects to users |

Design rules that are not negotiable: **receive only**, **no decryption**, patented codecs stay **opt-in**, and **updates must never lose user settings**.

## Translations

The panel was written in Spanish, so **Spanish strings are the source** (the message ids) and English catalogs map them to English. The engine is `files/web/i18n.js`.

### How it works

1. `i18n.js` picks the language: `?lang=` in the URL → `localStorage["sdrkit.lang"]` → browser language (`es*` → Spanish, otherwise English).
2. The `lang-en-*.js` catalogs register translations:

   | Call | Use |
   |---|---|
   | `I18N.add({"Texto": "Text"})` | Exact strings (whitespace-normalised) |
   | `I18N.addPatterns([[/^Hay (\d+) señales$/, "$1 signals"]])` | Anchored regexes for composed or server messages; the replacement may be a function |
   | `I18N.addHtml({"Toca <b>Iniciar</b>.": "Tap <b>Start</b>."})` | Whole `innerHTML` of static rich elements in `index.html` |
   | `I18N.data.<module>` | Structured English data (help sheets, frequency guide, antenna designs) read directly by `help.js`, `guia.js`, `antenas.js` |

3. Before the panel scripts run, `I18N.start()` translates the static page; a `MutationObserver` then translates text added later (server messages, anything a module did not wrap). In English mode the page stays hidden until translated (2 s fail-safe).
4. Modules wrap their strings:

   ```js
   SDR.toast(_t("Guardada en «{g}».", {g: name}));          // translated + interpolated
   _tn(n, "1 señal", "{n} señales");                        // plural, then _t()
   ```

   Always use `{placeholders}`; never pass an interpolated template literal to `_t()` (the check rejects it).
5. Elements with `translate="no"` (and `<code>`, `<pre>`, scripts) are never translated. Number and date formatting uses `I18N.locale`.

| Catalog | Strings from |
|---|---|
| `lang-en-html.js` | `index.html` |
| `lang-en-app.js` | `app.js` |
| `lang-en-analyzer.js` | `analyzer.js` |
| `lang-en-radio.js` | `radio.js`, `decode.js`, `recs.js`, `canales.js` |
| `lang-en-help.js` | `help.js`, `guia.js`, `antenas.js` (`I18N.data.help`, `.guia`, `.antenas`) |
| `lang-en-server.js` | Messages produced by the Python server (errors, status lines, decoder names) |

Outside the panel: the login page carries inline English (`data-en` attributes) and follows the same `sdrkit.lang` setting; the installer, updater and CLI use `L "English" "Español"` with `SDRKIT_LANG`.

### Adding or changing a string

1. Write the Spanish text in the code wrapped in `_t()` (or plain in `index.html`).
2. Add the English to the catalog that owns that file.
3. Run `node tests/i18n_check.mjs`.
4. Check both languages in the demo (`?lang=en`, `?lang=es`), or with `?i18n=debug` and `I18N.missing` in the browser console to list untranslated Spanish text.

### Adding a language

The engine currently has one target language. To add, for example, Portuguese:

1. Add `pt: "Português"` to `LANGS` in `i18n.js`, extend the browser auto-detection and `I18N.locale`.
2. Create `lang-pt-*.js` catalogs mirroring the English ones (same keys, placeholders, tags and ids).
3. Make only the active language's catalogs register: `index.html` loads `lang-en-*.js` unconditionally and `I18N.add()` fills a single Spanish → target dictionary, so guard each catalog with `if (I18N.lang === "pt")` (and the English ones with `"en"`), or extend `add()` with a language code.
4. Update the places that test `I18N.lang === "en"` to use the structured data (`help.js`, `guia.js`, `antenas.js`, `lang-en-server.js`).
5. Extend `tests/i18n_check.mjs` and `tests/ui_smoke.mjs` to the new catalogs.

The login page, installer and CLI are bilingual by construction (English/Spanish pairs) and need their own changes for a third language.

## Release process

| Step | Details |
|---|---|
| 1. Code | Keep `CHANGELOG.md` updated under *Unreleased* as you go |
| 2. System changes? | If `install.sh` needs new packages or system steps, **increase `INSTALL_REV`**. Installed kits then run the full installer on update instead of the quick panel copy |
| 3. New settings? | Add them to `sdrkit.conf` with a default; the merge adds them to existing kits |
| 4. Version | Update `VERSION` and move the notes to a new `## [x.y.z] - date` section (Semantic Versioning) |
| 5. Push | Wait for a green CI |
| 6. Tag | `git tag v$(cat VERSION) && git push --tags` — the Release workflow publishes the GitHub release |
| 7. Pis | `sudo sdrkit update` (or the panel button). Test risky changes first on a branch with `SDRKIT_BRANCH` ([Updating](updating.md#testing-a-branch)) |

### Screenshots

Documentation screenshots live in `docs/media/screenshots/` and are regenerated from the demo server:

```sh
SDRKIT_LANG=en python3 files/sdrkit_server.py --demo --port 8080 --conf /nonexistent &
node tools/screenshots.mjs http://127.0.0.1:8080 docs/media/screenshots
```

## Contributing

- Read `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` in the repository root; report vulnerabilities as described in `SECURITY.md`.
- Use the issue templates for bugs and ideas; include `sdrkit version`, `sdrkit status` and recent `journalctl -u sdrkit` output.
- Open pull requests against `main` with tests for the behaviour you change, both languages updated, and a CHANGELOG entry.
- By contributing you agree that your work is released under the [MIT License](../LICENSE).
