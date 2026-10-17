# Changelog

All notable changes to SDR-Kit are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).
Update an installed kit with `sudo sdrkit update`.

## [Unreleased]

### Security
- The server refuses to start without `ADMIN_PASSWORD` (except `--demo`); minimum password length is now 8 (installer and `sdrkit password`).
- Login lockout: 5 wrong passwords lock the client IP for 5 minutes (HTTP 429).
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
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

[3.2.0]: https://github.com/romartak/sdrkit/releases/tag/v3.2.0
[3.1.0]: https://github.com/romartak/sdrkit/tree/v3.1.0
