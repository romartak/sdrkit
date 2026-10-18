# Configuration

All settings live in **`/etc/sdrkit/sdrkit.conf`** on the Pi (permissions `600`: it contains passwords). The repository's [`sdrkit.conf`](../sdrkit.conf) is the template with every key and its default.

```sh
sudo sdrkit config      # opens the file in nano (or $EDITOR), keeps a .bak copy,
                        # then restarts sdrkit-netwatch and the panel
```

- [Syntax](#syntax)
- [When changes take effect](#when-changes-take-effect)
- [Keys](#keys): [general](#general) · [hotspot](#hotspot) · [panel password](#panel-password) · [WiFi networks](#wifi-networks) · [network behaviour](#network-behaviour) · [radio](#radio) · [recordings](#recordings) · [digital voice and decoders](#digital-voice-and-decoders) · [phone alerts](#phone-alerts-ntfy) · [updates](#updates) · [extras](#extras)
- [Advanced keys (not in the template)](#advanced-keys-not-in-the-template)
- [Environment variables](#environment-variables)

## Syntax

```sh
KEY="value"            # comment
```

| Rule | Details |
|---|---|
| Quotes | Write values in double quotes. A quoted value is taken **literally**: `$`, `\` and spaces are safe |
| Forbidden | A double quote (`"`) inside a value — passwords cannot contain `"` |
| Comments | `#` starts a comment, also after a value |
| Line endings | Windows line endings (CRLF) from Notepad are accepted |
| Booleans | `yes`, `y`, `si`, `sí`, `s`, `true`, `1`, `on` (any case) mean *true*; anything else, including empty, means *false* |
| Never `source` it | SDR-Kit parses the file without executing it (`sdrkit_load_conf` in bash, `load_conf` in Python) |

Updates **never change your values**: keys introduced by a new version are appended at the end under a dated comment. See [Updating](updating.md#what-is-preserved).

## When changes take effect

| Group | Applied by | After editing |
|---|---|---|
| Panel keys (radio, recordings, alerts, port, analyzer) | `sdrkit` service | `sudo sdrkit restart` (automatic after `sudo sdrkit config`) |
| Network watchdog keys (`BOOT_WAIT`, `HOME_RETRY_MIN`…) | `sdrkit-netwatch` service | `sudo sdrkit restart` (automatic after `sudo sdrkit config`) |
| Install-time keys (hotspot, extra networks, driver, packages, Bluetooth, Tailscale…) | The installer | Re-run it: `sudo bash /opt/sdrkit-src/install.sh` (GitHub install) or `sudo bash /boot/firmware/sdrkit/install.sh` (microSD install) |
| OpenWebRX+ profile keys (`REGION`, `RTL_MODEL`, `RECEIVER_NAME`…) | Seeded once into OpenWebRX+ | `sudo sdrkit profiles` rewrites the band profiles |
| Update keys (`SDRKIT_REPO`, `SDRKIT_BRANCH`) | The updater | Next `sudo sdrkit update` |

The **Applied** column in the tables below uses: **panel**, **netwatch**, **installer**, **OWRX** (OpenWebRX+ profiles), **updater**.

## Keys

### General

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `sdrkit backup` / `restore` | — | CLI | `sudo sdrkit backup [file]` saves `/etc/sdrkit` and `/var/lib/sdrkit` (settings, memories; not recordings) to a `.tar.gz`; `sudo sdrkit restore file` brings them back |
| `SDRKIT_LANG` | `""` | installer, CLI, panel | Language of the installer, updater and `sdrkit` command, and of the example memories the panel creates on first start: `en` or `es`. Empty = the installer asks first. When unset, the system language (`LANG`) decides; a `SDRKIT_LANG` environment variable overrides it. Configurations from versions before this key existed are set to `es` on update. The web panel chooses its language per browser ([Language](user-guide.md#language)) |

### Hotspot

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `HOTSPOT_SSID` | `"SDR-Pi"` | installer | Name of the WiFi network the Pi creates when no known network is around |
| `HOTSPOT_PASSWORD` | `""` | installer | WPA2 password, **8 characters minimum**. Empty = asked by the installer. Change later with `sudo sdrkit hotspot-password` |
| `HOTSPOT_CHANNEL` | `"6"` | installer | 2.4 GHz channel: `1`, `6` or `11` (the Zero 2 W has no 5 GHz) |
| `HOTSPOT_IP` | `"192.168.4.1"` | installer | Pi address on the hotspot (`/24`, DHCP for clients). The panel is at `http://<HOTSPOT_IP>` |

### Panel password

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `ADMIN_PASSWORD` | `""` | panel, installer | Password of the web panel and of the OpenWebRX+ `admin` user. The installer asks for one (4+ characters). Change it with `sudo sdrkit password`, which updates both |

> [!WARNING]
> If `ADMIN_PASSWORD` is empty, the panel runs **without a login**. The installer always sets one; do not clear it on a kit that joins shared networks.

### WiFi networks

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `WIFI_NETWORKS` | `""` | installer | Extra known networks, `"SSID1|password1;SSID2|password2"` (no password for open networks). Typical use: your phone's hotspot. Your home WiFi is already configured by Raspberry Pi Imager. Add networks later with **More → WiFi** or `sudo sdrkit wifi "SSID" "password"` |
| `WIFI_COUNTRY` | `""` | installer | Two-letter WiFi country code (`US`, `MX`, `ES`…). Empty = leave unchanged |

Networks added by SDR-Kit get NetworkManager autoconnect priority 20. List them with `sdrkit networks`.

### Network behaviour

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `BOOT_WAIT` | `"45"` | netwatch | Seconds to wait at boot for a known WiFi before starting the hotspot |
| `HOME_RETRY_MIN` | `"5"` | netwatch | With the hotspot on and **nobody connected**, how often (minutes) to look for known networks again. `0` = never |

### Radio

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `REGION` | `"americas"` | panel, OWRX | `americas` or `europa`/`europe` (any value starting with `eu` selects Europe). Sets WFM de-emphasis (75 µs / 50 µs), the default radio frequency, the first set of memories (FRS/GMRS vs PMR446, NOAA weather), the default sensor bands (`433+315` vs `433+868`), region filtering in Channels and the Frequency guide, and the OpenWebRX+ profiles (airband step 25 kHz vs 8.33 kHz, 2 m and walkie-talkie profiles) |
| `RTL_MODEL` | `"v4"` | OWRX | `v4`, `v3` or anything else. Adds the medium-wave, 49 m and CB profiles to OpenWebRX+ for `v3`/`v4` (with direct sampling for `v3`). The panel itself detects the tuner automatically |
| `RTLSDR_DRIVER` | `"auto"` | installer | `auto` builds the RTL-SDR Blog driver only on Bookworm (whose driver lacks V4 support); `blog` always builds it; `distro` keeps the distribution driver |
| `BIAS_TEE` | `"no"` | panel, OWRX | Boolean. Powers an LNA or active antenna through the coax (V3/V4). Used by the analyzer, radio, `hackrf_sweep` and OpenWebRX+; not by `rtl_433`, `dump1090` or `rtl_power` |
| `RTL_PPM` | `"0"` | panel, OWRX | Frequency correction in ppm. The V3/V4 have a TCXO: leave `0`. Used by the analyzer, radio, `rtl_power` and OpenWebRX+ |
| `DEFAULT_MODE` | `"last"` | panel | Dongle mode at boot: `last` (the last one used), `sweep` (analyzer), `radio`, `sensors`, `adsb` (aircraft), `receiver` (starts OpenWebRX+) or `idle` |
| `RECEIVER_NAME` | `"SDR-Kit"` | OWRX | Receiver name shown by OpenWebRX+ |
| `RECEIVER_LOCATION` | `""` | OWRX | Free-text location shown by OpenWebRX+, e.g. `"Santo Domingo, RD"` |
| `RECEIVER_LAT` | `""` | panel | Latitude in decimal degrees (e.g. `18.4861`): centre of the aircraft radar and reference for distances. Takes precedence over a location saved from the panel |
| `RECEIVER_LON` | `""` | panel | Longitude in decimal degrees (e.g. `-69.9312`) |

### Recordings

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `REC_DIR` | `""` | panel | Recordings folder. Empty = `/var/lib/sdrkit/grabaciones`, one subfolder per day |
| `REC_MAX_MB` | `"2000"` | panel | Maximum space for recordings. When exceeded, the oldest are deleted down to 90 % |
| `REC_MIN_SEC` | `"1"` | panel | Recordings shorter than this (seconds) are discarded |
| `REPLAY_SEC` | `"30"` | panel | Instant replay (Radio → **⏪ What did they say?**): seconds of heard audio kept in RAM, never on the card. `0` turns it off; maximum `120` (≈ 2.9 MB of RAM per minute) |

Independently of these limits, a recording does not start with less than 300 MB free on the card.

### Digital voice and decoders

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `INSTALL_DSD` | `""` | installer | `yes` builds DSD-FME + mbelib (digital voice in the panel; **patented AMBE/IMBE codecs**, see [Digital voice](digital-voice.md)). Empty = the installer asks; `no` = do not install |
| `AMBE_TTY` | `""` | installer | Serial device of an AMBE3000 USB dongle (ThumbDV, DVstick 30), e.g. `"/dev/ttyUSB0"`: configures licensed digital voice in OpenWebRX+ via codecserver |
| `AMBE_BAUD` | `"921600"` | installer | Dongle baud rate; older ThumbDV units use `"460800"` |
| `INSTALL_WSJTX` | `"no"` | installer | `yes` adds WSJT-X and JS8Call to OpenWebRX+ (FT8, FT4, WSPR, JS8…; about 300 MB more) |

### Phone alerts (ntfy)

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `NTFY_TOPIC` | `""` | panel | Topic for [24/7 monitor](user-guide.md#247-monitor-and-occupancy) alarms. Pick something hard to guess (`"sdrkit-home-7f3k9"`): anyone who knows the topic can read it. Install the **ntfy** app and subscribe to it |
| `NTFY_SERVER` | `"https://ntfy.sh"` | panel | ntfy server; change it if you self-host ntfy. Needs internet on the Pi |

Alarms are POSTed to `<NTFY_SERVER>/<NTFY_TOPIC>` with the title *SDR-Kit* and a body with the frequency and level, e.g. `SDR-Kit: señal en 433.9200 MHz (-31.5 dB)` (the server writes this text in Spanish).

### Updates

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `SDRKIT_REPO` | `""` | updater | Git URL to update from. Empty = origin of `/opt/sdrkit-src`, else `https://github.com/romartak/sdrkit.git`. Set automatically by a GitHub install |
| `SDRKIT_BRANCH` | `""` | updater | Branch to follow. Empty = `main` (stable). Example: `pruebas` to test changes |

### Extras

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `INSTALL_TAILSCALE` | `"si"` (yes) | installer | Install Tailscale for secure remote access |
| `TAILSCALE_AUTHKEY` | `""` | installer | Optional `tskey-auth-…` key to link Tailscale without opening a browser |
| `DISABLE_BLUETOOTH` | `"si"` (yes) | installer | Disable Bluetooth (unused; shares the radio chip with WiFi) |
| `REDUCE_SD_WRITES` | `"si"` (yes) | installer | Keep the system journal in RAM (24 MB) to extend microSD life |
| `UPGRADE_SYSTEM` | `"no"` | installer | `yes` runs a full system upgrade before installing (slower) |
| `PANEL_PORT` | `"80"` | panel | HTTP port of the panel |

## Advanced keys (not in the template)

These keys are read by the code with built-in defaults. Add them to `sdrkit.conf` only if you need to change them.

| Key | Default | Applied | Meaning |
|---|---|---|---|
| `OWRX_PORT` | `8073` | panel | Port where the panel expects OpenWebRX+ |
| `SWEEP_ENGINE` | `auto` | panel | Analyzer engine: `auto` (HackRF One if connected and `hackrf_sweep` is installed, else the native librtlsdr engine, else `rtl_power`), `native`, `rtl_power` or `hackrf` |
| `SWEEP_IDLE_STOP` | `20` | panel | Seconds the analyzer keeps sweeping after the last viewer leaves (the 24/7 monitor overrides it) |
| `SWEEP_MAX_FPS` | `12` | panel | Maximum analyzer frames per second |
| `RTL_DEVICE_INDEX` | `0` | panel | Which RTL-SDR to use when several are connected (analyzer, radio, rtl_433, dump1090) |
| `LEVEL_OFFSET_DB` | `0` | panel | Constant dB offset added to every level reading (analyzer, zero span, radio meter, squelch, scanner) |
| `HOTSPOT_CON` | `sdrkit-hotspot` | panel, netwatch, CLI | NetworkManager connection name of the hotspot |
| `WIFI_IFACE` | `wlan0` | panel, netwatch, installer | WiFi interface |
| `LOST_GRACE` | `40` | netwatch | Seconds without any network before the watchdog starts the hotspot |

## Environment variables

For development and special setups. The systemd service does not set them.

| Variable | Default | Used by | Meaning |
|---|---|---|---|
| `SDRKIT_CONF` | `/etc/sdrkit/sdrkit.conf` | server | Configuration file (also `--conf`) |
| `SDRKIT_STATE` | `/var/lib/sdrkit` (`~/.sdrkit-demo` in demo mode) | server | State and data folder |
| `SDRKIT_WEB` | `<server dir>/web` | server | Folder with the panel's static files |
| `SDRKIT_OWRX_SETTINGS` | `/var/lib/openwebrx/settings.json` | server | OpenWebRX+ settings file to seed and update |
| `SDRKIT_REPO`, `SDRKIT_BRANCH` | official repo, `main` | `get.sh` | Repository and branch for the first install |
| `SDRKIT_LANG` | — | installer, CLI | Overrides the configured language for one command, e.g. `SDRKIT_LANG=en sdrkit status` |
