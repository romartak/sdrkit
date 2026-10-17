# Contributing to SDR-Kit

Thanks for helping! SDR-Kit is small on purpose: plain Python + NumPy on the Pi, vanilla JavaScript in the
browser, Bash for installation. No build step, no framework, nothing that a Raspberry Pi Zero 2 W cannot run.

> [!TIP]
> You do **not** need a Raspberry Pi or an SDR to work on the panel — the demo mode simulates a dongle with
> real, decodable signals (POCSAG, APRS, M17 digital voice, DMR-like and NXDN-like 4FSK, FM broadcast…).

## Quick start

```bash
git clone https://github.com/romartak/sdrkit.git && cd sdrkit
pip install numpy pytest                       # multimon-ng is optional (apt install multimon-ng)
python3 files/sdrkit_server.py --demo --port 8080
# open http://localhost:8080  ·  ?lang=en or ?lang=es to force a language
```

## Before you open a pull request

```bash
pytest -v tests                                # DSP, decoders, server, config merge
node tests/i18n_check.mjs                      # every _t() string has English, catalogs are consistent
for f in files/web/*.js; do node --check "$f"; done
bash -n install.sh get.sh files/*.sh && shellcheck -S warning -x install.sh get.sh files/*.sh
```

CI runs the same checks plus an end-to-end decode and a browser smoke test in both languages.

## Guidelines

- **Keep it light.** Every feature must run on a Pi Zero 2 W (4 cores, 512 MB RAM) next to the SDR stream.
  Measure CPU when you touch DSP code.
- **Both languages.** The panel's source strings are Spanish; wrap new user-visible text in `_t("…")` and add
  the English to the matching `files/web/lang-en-*.js` catalog (see [docs/development.md](docs/development.md#translations)).
- **Receive only, legal by default.** No transmit features, no decryption of encrypted traffic, patented codecs
  stay opt-in.
- **Updates must be safe.** If you change system packages or install steps in `install.sh`, bump `INSTALL_REV`
  so updates run the full installer. User settings in `/etc/sdrkit/sdrkit.conf` must survive every update:
  add new settings to `sdrkit.conf` with a default and they are merged automatically.
- **Small, focused commits** with a clear message (imperative mood: "Add NXDN96 to the classifier").
- Add or update tests for behaviour you change, and a line in [CHANGELOG.md](CHANGELOG.md) under *Unreleased*.

## Reporting bugs and ideas

Use the [issue templates](https://github.com/romartak/sdrkit/issues/new/choose). For bugs, `sdrkit status`,
`sdrkit version` and `journalctl -u sdrkit -n 100` output help a lot. Security problems: see [SECURITY.md](SECURITY.md).

## Releasing (maintainers)

1. Update `VERSION` and move the *Unreleased* notes in `CHANGELOG.md` under the new version.
2. Commit, then tag: `git tag v$(cat VERSION) && git push --tags`.
3. The *Release* workflow publishes the GitHub release with the changelog notes. Pis pick it up with
   `sudo sdrkit update`.

By contributing you agree that your work is released under the [MIT License](LICENSE) and that you follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
