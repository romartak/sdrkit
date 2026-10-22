# Changelog

All notable changes to SDR-Kit are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).
Update an installed kit with `sudo sdrkit update`.

## [Unreleased]

## [3.11.0] - 2026-10-22

### Added
- **Business panel** (Recordings → **Panel del negocio / Business panel**): charts of how much the radio is used — transmissions
  per hour of the day and per day, total airtime, the busiest hour, the five busiest channels and the longest transmission —
  for Today, 7 or 30 days, computed from the activity log. New API `GET /api/activity/stats?days=N`. The activity log now
  keeps the last 5000 transmissions (was 1000). Demo mode shows sample data (in memory only). Covered by
  `tests/test_activity_stats.py`; help sheet ⓘ and English translation included.

## [3.10.0] - 2026-10-18

### Changed
- **"Instrumento" look for the whole panel** (`files/web/app.css`, a CSS-only layer, no logic touched): deeper graphite
  surfaces with hairline borders and soft depth, rounder cards, tuned buttons and segmented controls, a glowing yellow
  active indicator on the tab bar, custom sliders, tabular numbers on every readout, blurred header, tab bar and sheets,
  and a short fade between tabs. System fonts only, so it still works fully offline.
- **Premium sign-in page**: logo and tagline, glass card with a labelled password field, show/hide button, Caps Lock hint,
  loading state on the button, shake and focus on a wrong password, and a quiet animated spectrum in the background
  (stops with "reduce motion"). Still a single self-contained page with no external requests; Spanish/English as before.

## [3.9.0] - 2026-10-18

### Added
- **Roadmap inside the panel**: the welcome tour has a "Where it is heading" step (progress, what is next, the big vision)
  and **More → System → About SDR-Kit → 🗺 Roadmap** lists all 35 planned features by phase with their status
  (`files/web/roadmap.js`, English in `lang-en-roadmap.js`; `tests/test_roadmap.py` keeps it identical to `ROADMAP.md`).
- **Rate and share**: 1–5 stars (kept only on the device, nothing is sent; 4–5 suggests a ⭐ on GitHub, 1–3 opens a GitHub
  issue to say what to improve) and share options — the phone's share sheet, WhatsApp, Telegram, X, Facebook, email and
  copy the link. In the welcome tour and in the About card.
- `ROADMAP.md`: new **#35 Unified server (SDR-Kit Network)** — a long-term idea: connect your Pi to a server and listen to
  Pis all over the world. Opt-in, off by default, public/license-free channels only, to be designed first.

## [3.8.0] - 2026-10-18

### Added
- **Welcome tour** the first time the panel is opened: what SDR-Kit is, what each tab does, the new-version notices
  question and a link to support the project on GitHub. **More → System → About SDR-Kit** shows it again.
- **New-version notices** (optional, asked on the first visit, off until the user says yes): while the Pi is on a WiFi
  network (not its own hotspot) it checks GitHub when it connects and every 6 hours; when a new version is out a notice
  shows the changes with **Update now** / **Later**. Only the notice is automatic — installing always needs a tap — and
  no data is sent (only public repository information is read). Setting in **More → System → Updates**;
  API `POST /api/system/autoupdate`, `update` in `/api/status`.
- **Version in the header** next to "SDR-Kit", with a dot: green = up to date, orange = new version, grey = not checked.
  Tap it for details, the last check time and the repository link.
- `SDRKIT_DEMO_LATEST` simulates a newer version in demo mode; `&nointro=1` skips the tour (used by the screenshot tools).
  Covered by `tests/test_update_notify.py` and the browser smoke test.

## [3.7.0] - 2026-10-18

### Added
- **Instant replay** (Radio → **⏪ What did they say?**): the radio always keeps the last 30 s of what was heard (squelch
  open, silences cut to a short pause) in RAM. One tap plays it back on the phone (the live audio pauses meanwhile);
  **💾 Save** keeps that same clip as a recording, tagged **⏪ replay** in Recordings. Nothing is written to the card until
  you save. New setting `REPLAY_SEC` (0 = off, max 120) and API `GET /api/radio/replay.wav`, `POST /api/radio/replay`.
  Covered by `tests/test_replay.py` and the browser smoke test; works in demo mode.

## [3.6.0] - 2026-10-18

### Added
- **Voice descrambler** (Radio → Scrambled voice): undoes the frequency-inversion "scrambler" / "voice privacy" of many
  cheap walkie-talkies. Pick the inversion point (2600–3500 Hz, 2632 and 3300 are common); recordings and the scanner get the
  descrambled voice. Covered by `tests/test_voice_inverter.py`. It does not defeat digital encryption or rolling scramblers.
- RTL-SDR Blog **V3 support is now tested in CI**: `tests/test_rtl_models.py` runs the panel's driver code against a fake
  librtlsdr that reports a V3 (R820T) or a V4 (R828D) and checks detection, gains, direct sampling below 24 MHz on the V3
  only, sample delivery and the advanced receiver's HF profiles. The README says the V3 works.
- README (EN/ES): "Monitor your business from anywhere" use case — leave the kit at a business that runs on
  walkie-talkies and listen, record and check the activity log from abroad over Tailscale (needs internet at the business).

## [3.5.0] - 2026-10-17

### Added
- **Tone decoder** card in More → Channels: enter a frequency, tap "Listen and detect" and it shows the CTCSS tone or DCS code
  live with its walkie-talkie code (1–38); "Use in My repeaters" copies frequency and tone into the country's repeater form.
- Analyzer: **🔎 Decode the signals on screen** hands every active signal of the sweep to the radio scanner, which stops on each
  one that transmits and decodes its CTCSS/DCS tone, DTMF and digital voice type (all logged in the activity log).
- Country search box: type part of the name (accents optional) to filter the list; a single match is chosen automatically.

### Fixed
- The shut-down button used a power symbol (⏻) that many phones cannot draw; it now uses 🔴.

## [3.4.0] - 2026-10-17

### Added
- Animated demo GIFs in the README (analyzer, radio, aircraft radar, pagers), recorded with `tools/gifs.mjs` + `tools/make_gifs.py`.
- **More → Channels → Your country**: pick any of 244 countries and see its license-free walkie-talkie services, ham bands,
  repeater output segments with their usual offset and tones, regulator, call-sign prefixes and national association.
  "Search" scans the repeater outputs; "My repeaters" saves repeaters with their CTCSS/DCS tone and offset (memories now keep
  `tone` and `offset`). The country also orders the service list and filters the frequency guide.
- Walkie-talkie tone codes 1–38: the Radio shows the code that matches the detected CTCSS tone, and the tone field accepts a code.
- Channel plans for UHF CB 477 MHz (Australia / New Zealand) and China's 409 MHz public walkie-talkies.
- The Release workflow can be run by hand from the Actions tab; it publishes a SHA-256 checksum next to the tarball.

## [3.3.1] - 2026-10-17

### Security
- The server refuses to start without `ADMIN_PASSWORD` (except `--demo`); minimum password length is now 8 (installer and `sdrkit password`).
- Login lockout: 5 wrong passwords lock the client IP for 5 minutes (HTTP 429).
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- Cross-site request protection: `POST` requests whose `Origin` does not match the panel's `Host` are rejected (HTTP 403).
- The OpenWebRX+ apt key is stored in its own keyring (`/etc/apt/keyrings`) instead of the global trusted keys.

### Changed
- New `docs/resources.md` with related receive-only projects, credited to RFSec-ToolKit by @cn0xroot; `.github/CODEOWNERS` added.
- The demo server no longer needs the POSIX-only `pwd` module at import time.
- Added a `Dockerfile` (demo mode) and `requirements.txt`.
- Documentation screenshots added; removed unused files (`GUIA.md` at the root, `profile/`).

## [3.3.0] - 2026-10-17

### Added
- `sdrkit doctor`: a full check-up (service, panel, RTL-SDR/HackRF, power, temperature, disk, network) with ✔/✖/! per item and the fix for each failure.
- `sdrkit backup` / `sdrkit restore`: save and recover your settings and memories (recordings excluded); restore refuses archives with paths outside SDR-Kit.

### Changed
- Redesigned README in English and Spanish.

## [3.2.0] - 2026-10-16

### Added
- **English and Spanish everywhere.** The web panel, help sheets, frequency guide, antenna tools, login page,
  installer, updater and CLI speak both languages. The panel follows the browser language and can be switched
  from the header (`EN`/`ES`) or *More → System*; the installer asks first and stores `SDRKIT_LANG`.
- English CLI commands alongside the Spanish ones: `update`, `rollback`, `status`, `networks`, `password`,
  `hotspot-password`, `profiles`, `test-sdr`, `decoders`, `install-dsd`, `help`…
- Test suite (`tests/`): CTCSS/DCS/DTMF detection, POCSAG BCH codewords, POCSAG and APRS round trips through
  multimon-ng, the digital-signal classifier, demo-server API, configuration merging, translation catalogs and
  a browser smoke test in both languages.
- CI on Python 3.11 and 3.13, end-to-end POCSAG **and** APRS decoding in demo mode, and a release workflow that
  publishes tagged versions.
- Complete English documentation in [`docs/`](docs/README.md) (hardware, installation, user guide, digital
  voice, antennas, updating, troubleshooting, architecture, HTTP API, configuration, development, FAQ, legal);
  the Spanish guide moved to [`docs/es/`](docs/es/README.md).
- Community files (contributing guide, code of conduct,
  security policy, issue and pull-request templates) and the MIT license.

### Fixed
- `sudo sdrkit update` on a full update (new packages) now runs the same panel health check as a quick update and
  **rolls back by itself** if the panel does not answer; the Pi only reboots once it does.
- `sdrkit update --check` works without `sudo`.
- The installer installs the `hackrf` tools, so a HackRF is detected without a manual `apt install`.
- Recordings made in Digital mode got names like `Digital(DMR,P25,…)`; they are now `…_Digital.wav`.
- The railway AAR service has 91 channels, not 97.

### Changed
- Digital-signal classifier: a steady tone (test tone, warbling beacon, DTMF) is no longer reported as a
  digital mode, 2-level signals with heavy filtering (GMSK/D-Star, AIS) are no longer mistaken for 4FSK, and
  weak NXDN/dPMR signals are still recognized with about 2.5× more noise than before. Levels are now measured at
  the symbol centres instead of on a raw histogram.

## [3.1.0] - 2026-10-16

### Added
- One-command install from GitHub (`get.sh`).
- `sudo sdrkit update` fetches the latest version, shows what changed, keeps a backup and **rolls back
  automatically** if the new version does not start; `sudo sdrkit rollback` goes back by hand.
- *Update* button in *More → System*.
- The configuration is preserved on every update and receives new options automatically.
- Automated checks on GitHub for every change.

## 3.0.0

### Added
- Professional analyzer: tuner without touching the graph (−/+, slider, jump to the next signal), 4 markers
  with delta and tracking, measurements (channel power, OBW, ACPR, −3/−6/−20/−26 dB bandwidth, SNR, counter,
  harmonics, pulses), triggered zero span, max/min/average/persistence/reference traces, calibrated units,
  converter offset, limit line, 24/7 monitor with occupancy map and phone alerts.
- Digital voice in the panel with DSD-FME (DMR, P25, D-Star, Fusion, NXDN, dPMR, M17) and automatic
  recognition of digital signals.
- *Decode* tab: POCSAG/FLEX/APRS/EAS messages, 433 MHz sensors (rtl_433) and an offline aircraft radar (dump1090).
- Complete services and channel lists (PMR446, FRS/GMRS, marine, airband, CB…) to listen to or scan.
- ⓘ help on every part of the panel.

## 2.0.0

### Added
- Radio on the phone with CTCSS/DCS tones and DTMF, per-transmission recording, scanner, memories, fox-hunt
  mode, antenna tools and a frequency guide.

## 1.0.0

### Added
- tinySA-style spectrum analyzer, automatic hotspot, OpenWebRX+ and Tailscale.

[3.6.0]: https://github.com/romartak/sdrkit/releases/tag/v3.6.0
[3.5.0]: https://github.com/romartak/sdrkit/releases/tag/v3.5.0
[3.4.0]: https://github.com/romartak/sdrkit/releases/tag/v3.4.0
[3.3.1]: https://github.com/romartak/sdrkit/releases/tag/v3.3.1
[3.2.0]: https://github.com/romartak/sdrkit/releases/tag/v3.2.0
[3.1.0]: https://github.com/romartak/sdrkit/tree/v3.1.0
