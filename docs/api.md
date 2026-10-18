# HTTP API

The panel is a single-page app on top of a small JSON API served by `sdrkit_server.py`. Everything the panel does is available to scripts. This reference is generated from the routes in [`files/sdrkit_server.py`](../files/sdrkit_server.py).

- [Conventions](#conventions)
- [Authentication](#authentication)
- [Status and modes](#status-and-modes)
- [Analyzer](#analyzer)
- [24/7 monitor](#247-monitor)
- [Radio](#radio)
- [Scanner](#scanner)
- [Memories](#memories)
- [Recordings and activity](#recordings-and-activity)
- [Decoders](#decoders)
- [WiFi](#wifi)
- [System and updates](#system-and-updates)
- [Static files](#static-files)
- [Route index](#route-index)

## Conventions

| Aspect | Rule |
|---|---|
| Base URL | `http://sdrpi.local` (port `PANEL_PORT`, default 80) |
| Requests | `GET` for reads; `POST` with a JSON body (`Content-Type: application/json`) for actions. `HEAD` is accepted wherever `GET` is |
| Body size | Up to 64 KiB; larger bodies are ignored (treated as `{}`) |
| Frequencies | Hz (integers or floats); levels in dB (dBFS plus `LEVEL_OFFSET_DB`) |
| Success | `200` with JSON; most `POST`s return `{"ok": true, …}` |
| Errors | `400 {"ok": false, "error": "…"}` for invalid input · `401 {"error": "auth"}` without a valid session · `404 {"error": "no encontrado"}` for unknown routes |
| Language | Human-readable strings from the server (errors, status messages, decoder names, mode names) are **Spanish**; the panel translates them client-side |
| Caching | Every response carries `Cache-Control: no-store` |

Examples below assume a cookie jar in `jar.txt` (see [Authentication](#authentication)) and:

```sh
PI=http://sdrpi.local
```

## Authentication

When `ADMIN_PASSWORD` is set, every route except `/login`, `/logout`, `/favicon.svg`, `/icon.svg` and `/manifest.webmanifest` needs the `sdrkit_auth` cookie. Without it, `/api/*` returns `401` and pages redirect to `/login`.

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/login` | — | Login page (HTML) |
| `POST` | `/login` | form `password=…` or JSON `{"password": "…"}` | `303` to `/` with `Set-Cookie: sdrkit_auth=…; Max-Age=2592000; HttpOnly; SameSite=Lax`. Wrong password: `200` login page with an error after a 1 s delay |
| `GET` | `/logout` | — | `302` to `/login`, clears the cookie |

```sh
curl -s -c jar.txt -o /dev/null -w '%{http_code}\n' -d 'password=YOUR_PASSWORD' $PI/login   # 303
curl -s -b jar.txt $PI/api/status | python3 -m json.tool
```

The cookie value is an HMAC of the password: it stays valid for 30 days and until the password changes. See [Architecture → Security model](architecture.md#security-model).

## Status and modes

### `GET /api/status`

Snapshot used by the panel every 3 s.

| Field | Contents |
|---|---|
| `version`, `commit`, `hostname`, `demo` | Installed version, short commit, host name, demo flag |
| `mode`, `switching`, `mode_msg` | Current dongle owner (`sweep`, `radio`, `sensors`, `adsb`, `receiver`, `idle`), switch in progress, progress message |
| `owrx` | `{installed, active, ready, port}` for OpenWebRX+ |
| `sweep` | Analyzer engine info: `engine` (`native`, `rtl_power`, `hackrf`), `device`, `tuner`, `tuner_id`, `gains[]`, `min_hz`, `max_hz`, `running`, `rbw`, `clients` |
| `params` | Current analyzer parameters (see [`POST /api/sweep`](#post-apisweep)) |
| `sys` | `temp` (°C), `cpu` (%), `load[3]`, `mem_used`, `mem_total`, `disk_used`, `disk_total`, `uptime` (s), `throttled` (`raw`, `undervoltage_now`, `capped_now`, `throttled_now`, `templimit_now`, `undervoltage_past`, `throttled_past`, or `null` without `vcgencmd`) |
| `net` | `mode` (`client`, `hotspot`, `connecting`, `none`), `ssid`, `connection`, `stations`, `forced` (`auto`/`hotspot`), `available`, `ips[{iface, ip}]`, `tailscale`, `hotspot_ssid`, `hotspot_ip` |
| `usb` | Detected SDRs `[{id, name, product}]` |
| `region`, `auth` | `REGION`; whether a password is configured |
| `radio`, `sensors`, `adsb` | `{running, error}` (radio adds `monitoring` and `params`) |
| `monitor` | 24/7 monitor configuration |

### `POST /api/mode`

Gives the dongle to another engine. The switch happens in the background; poll `/api/status` until `switching` is false.

| Field | Type | Notes |
|---|---|---|
| `mode` | string | `sweep`, `radio`, `sensors`, `adsb`, `receiver`, `idle` |
| `freq` | Hz, optional | `radio`: tune there. `receiver`: write a target profile into OpenWebRX+ and restart it |
| `mod` | string, optional | Modulation for `freq` (guessed from the band when missing) |

Errors: `Modo inválido.`, `OpenWebRX+ no está instalado.`, `Ya hay un cambio de modo en curso.`

```sh
curl -s -b jar.txt -H 'Content-Type: application/json' -d '{"mode":"radio","freq":146520000,"mod":"nfm"}' $PI/api/mode
```

## Analyzer

### `GET /api/sweep`

`{"params": {…}, "info": {…}, "cal": {"k": dB, "gain": …, "t": epoch} | null}`

### `POST /api/sweep`

Changes analyzer parameters (only the fields you send). Returns `{"ok": true, "params": {…}}` with the validated values.

| Field | Range / values | Default |
|---|---|---|
| `start`, `stop` | Hz, within the engine's range; HackRF rounds to whole MHz | 88 MHz – 108 MHz |
| `gain` | 0–60 dB (nearest tuner step) or `"auto"` | 29.7 |
| `avg` | `fast`, `normal`, `slow` | `normal` |
| `points` | 200–2400 | 800 |
| `det` | `peak`, `avg`, `sample` | `peak` |
| `mode` | `sweep` or `zspan` (native engine only) | `sweep` |
| `zf` | Zero-span frequency, Hz | 433.92 MHz |
| `zrbw` | 1000–200000 Hz | 30000 |
| `zt` | 0.002–2 s | 0.1 |
| `ztrig` | `free`, `level` | `free` |
| `zlevel` | −130 to 10 dB | −40 |

```sh
curl -s -b jar.txt -H 'Content-Type: application/json' \
  -d '{"start":430e6,"stop":440e6,"det":"avg","points":1200}' $PI/api/sweep
```

### `POST /api/sweep/cal`

Stores the dBm calibration: `{"k": offset_dB, "gain": gain_at_calibration}`; `{"k": null}` clears it. `|k|` must be below 200.

### `GET /api/stream` (Server-Sent Events)

Opening this stream keeps the analyzer running (it stops `SWEEP_IDLE_STOP` s after the last client leaves). `retry: 3000`; a `: ping` comment every 15 s.

| Event | Data |
|---|---|
| `status` | `{"msg", "level": "info" \| "ok" \| "error", "t"}` — engine messages and alarms |
| `frame` | Sweep: `{"f0", "f1", "n", "db": [n values or null], "complete", "pos", "sweep_ms", "rbw", "kind": "single" \| "hop", "hops", "gain", "engine", "det", "mode": "sweep"}`. Zero span: `f0 = 0`, `f1 = zt` (seconds), `kind: "zspan"`, plus `zf`, `trig`, `zlevel` |

Partial frames (`complete: false`, `pos` < 1) are sent every 250 ms during long sweeps.

```sh
curl -sN -b jar.txt $PI/api/stream | head -c 600
```

## 24/7 monitor

### `GET /api/monitor`

`{"config": {…}, "alarms": [latest 60, newest first: {"t", "freq", "level", "limit"}], "rows": n, "meta": [f0, f1, n] | null, "cal": …, "ntfy": bool}`

### `POST /api/monitor`

| Field | Values |
|---|---|
| `enabled` | bool — enabling switches the dongle to the analyzer |
| `notify` | bool — send alarms to ntfy (`NTFY_TOPIC` required) |
| `limit` | Alarm level in dB (raw, without calibration offset), `null` = no alarms |
| `fmin`, `fmax` | Hz, restrict alarms; `null` = whole range |
| `every` | Seconds per occupancy row, 5–3600 (default 60) |
| `cooldown` | Seconds between alarms, 0–3600 (default 30) |

### Other monitor routes

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/monitor/data?cols=400` | Occupancy map reduced to `cols` columns (50 to the sweep's points): `{"meta": {"f0", "f1", "n"}, "rows": [{"t", "max": […], "occ": […]}]}` |
| `GET` | `/api/monitor.csv` | CSV download: time + max level per frequency |
| `POST` | `/api/monitor/clear` | Clears alarms and occupancy rows in memory |

## Radio

### `GET /api/radio`

`{"params": {…}, "info": {"running", "device", "error", "gains"}, "live": {"db", "noise", "sq", "ctcss", "dcs", "dtmf", "digital"}, "modes": {code: name}, "usage": {recordings usage}}`

### `POST /api/radio`

Changes radio parameters (only the fields sent).

| Field | Values | Default |
|---|---|---|
| `freq` | 100 kHz – 1766 MHz (Hz) | 462.5625 MHz (Americas) / 446.00625 MHz (Europe) |
| `mod` | `nfm`, `nfmw`, `wfm`, `am`, `usb`, `lsb`, `dsd` | `nfm` |
| `squelch` | −130 to 0 dB, or `"off"`/`null` | −45 |
| `gain` | 0–60 dB or `"auto"` | 29.7 |
| `autorec` | bool — record every transmission | false |
| `name` | Label, up to 40 chars (cleared when `freq` changes without `name`) | `""` |
| `data` | Subset of `pocsag`, `flex`, `aprs`, `eas`, `selcall`, `cw`, `fms` | `[]` |
| `dsd` | `auto`, `dmr`, `p25`, `dstar`, `ysf`, `nxdn48`, `nxdn96`, `dpmr`, `m17`, `provoice` | `auto` |
| `activate` | bool — also switch the dongle to the radio | — |

A change of `freq`, `mod`, `gain`, `data` or `dsd` reconfigures the chain; changing `freq` or `mod` stops a running scan.

```sh
# Decode POCSAG on 152.84 MHz (this is what CI does in demo mode)
curl -s -b jar.txt -H 'Content-Type: application/json' \
  -d '{"freq":152840000,"mod":"nfm","data":["pocsag"],"activate":true}' $PI/api/radio
```

### `POST /api/radio/record`

`{"on": true}` starts a manual recording (`400` if it cannot, e.g. low space); `{"on": false}` stops it and returns `{"ok": true, "saved": {metadata} | null}`.

### Instant replay

`GET /api/radio/replay.wav` freezes the replay buffer (the last `REPLAY_SEC` seconds heard with the squelch open) and returns
it as a WAV file (16-bit mono, 24 kHz) with the headers `X-Replay-Id`, `X-Replay-Secs` and `X-Replay-Tx` (number of
transmissions in it). `404` with `{"error": "…"}` when nothing has been heard yet.

`POST /api/radio/replay` with `{"id": N}` saves that frozen clip as a recording (`kind: "replay"`) and returns
`{"ok": true, "saved": {metadata}}`; without a matching `id` it saves what the buffer holds now.

```sh
curl -s -b jar.txt -o replay.wav $PI/api/radio/replay.wav
```

### `GET /api/radio/stream` (Server-Sent Events)

Opening it keeps the radio running. Events:

| Event | Data |
|---|---|
| `radio` | `freq`, `mod`, `name`, `db`, `noise`, `sq` (open), `squelch`, `ctcss` (`{tone, measured, dev, snr}`), `dcs` (`{code, inverted, quality, text}`), `dtmf`, `rec` (`{file, kind, secs}`), `replay` (seconds in the replay buffer), `autorec`, `scan` (`{state, hits, channels, range, lock, cycle_ms}`), `device`, `data`, `data_error`, `decoded` (last 8 messages), `digital` (`{kind, rate, levels, guess, dev, conf, t}`), `dsd` (`{kind, title, error, meta: {sync, tg, src, cc, nac, enc, slot, alias, t}, lines, running}`), and on every other event `spec` (256 dB bins) with `spec_span` (Hz) |
| `radio_saved` | `{"saved": {recording metadata}}` |
| `radio_note` | `{"msg": "…"}` — e.g. seek results |
| `radio_error` | `{"error": "…"}` |

### `GET /api/radio/audio`

Live audio: an endless `application/octet-stream` of **signed 16-bit little-endian mono PCM**; the sample rate is in the `X-Audio-Rate` header (24000). Squelched audio is silence; if nothing is produced for 3 s, 100 ms of silence is sent to keep the connection alive.

```sh
curl -sN -b jar.txt $PI/api/radio/audio | aplay -f S16_LE -r 24000 -c 1
# or: … | ffplay -f s16le -ar 24000 -nodisp -
```

## Scanner

### `POST /api/radio/scan`

One endpoint, several actions. Starting a scan switches the dongle to the radio.

| Body | Effect |
|---|---|
| `{"channels": [{"freq", "mod", "name"}, …]}` | Scan a free list (up to 4000) |
| `{"range": {"start", "stop", "step", "mod"}}` | Scan a range; `step` ≥ 1000 Hz, at most 4000 channels |
| `{"group": "Marina VHF"}` or `{"ids": ["…"]}` | Scan memories by group or id |
| `+ "squelch": dB` | Optional squelch for the scan (default: current, or −45) |
| `+ "once": true` | Seek: stop on the first signal and end |
| `+ "down": true` | Scan windows in descending order |
| `{"action": "skip"}` | Leave the current channel and continue |
| `{"action": "skip", "minutes": 10}` | …and lock it out for N minutes |
| `{"action": "stop"}` | Stop scanning |

Start response: `{"ok": true, "channels": n, "windows": m}`.

```sh
curl -s -b jar.txt -H 'Content-Type: application/json' \
  -d '{"range":{"start":144e6,"stop":148e6,"step":12500,"mod":"nfm"}}' $PI/api/radio/scan
```

## Memories

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/memories` | — | `{"items": [{"id", "freq", "mod", "name", "group"}]}` |
| `POST` | `/api/memories` | `{"id"?, "freq", "mod", "name", "group"}` (100 kHz – 6 GHz; empty name → frequency; empty group → `Favoritos`) | `{"ok": true, "item": {…}}` — creates, or updates when `id` exists |
| `POST` | `/api/memories/delete` | `{"ids": ["…"]}` | `{"ok": true}` |
| `POST` | `/api/memories/import` | `{"items": [...], "replace": bool}` | `{"ok": true, "count": total}` |

The panel's export format is `{"sdrkit_memorias": 1, "items": [...]}`; import accepts that `items` list.

## Recordings and activity

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/recordings` | `{"items": [metadata, newest first, max 500], "usage": {"bytes", "count", "max_bytes", "disk_free", "folder"}}` |
| `GET` | `/api/recordings/file?f=<rel>[&dl=1]` | The WAV (`audio/wav`), with HTTP **Range** support (`206`); `dl=1` adds a download filename |
| `GET` | `/api/recordings/zip[?f=<rel>&f=…]` | ZIP of the given files (the 2000 most recent recordings when none are given) with their JSON sidecars |
| `POST` | `/api/recordings/delete` | Body `{"files": ["<rel>", …]}` → `{"ok": true, "deleted": n}` |
| `GET` | `/api/activity?n=300` | `{"items": [newest first]}` — transmissions: `t`, `freq`, `mod`, `name`, `dur`, `peak_db`, `ctcss`, `dcs`, `dtmf`, `digital`, `file`, `dsd_*` |
| `GET` | `/api/activity.csv` | CSV (UTF-8 with BOM, Spanish column names) |
| `POST` | `/api/activity/clear` | `{"ok": true}` |

`<rel>` is the `file` field of a recording, e.g. `2026-10-16/14-03-21_462.5625MHz_FM.wav`. Paths outside the recordings folder are rejected.

Recording metadata: `file`, `kind` (`manual`/`auto`), `freq`, `mod`, `name`, `start`, `samples`, `duration`, `peak_db`, `size`, and `ctcss`/`dcs`/`dtmf` when detected.

## Decoders

### Messages (multimon-ng)

Messages are produced by the radio's `data` decoders ([`POST /api/radio`](#post-apiradio)).

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/decoded?n=300` | `{"items": [newest first]}`: `id`, `t`, `freq`, `name`, `kind` (`POCSAG1200`, `FLEX`, `APRS`, `EAS`…), `text`, and when parsed `address` (RIC/capcode/callsign), `msg`, `from`, `lat`, `lon` (APRS) |
| `GET` | `/api/decoded.csv` | CSV of up to 5000 messages |
| `POST` | `/api/decoded/clear` | `{"ok": true}` |

### Sensors (rtl_433)

| Method | Path | Body / response |
|---|---|---|
| `GET` | `/api/sensors` | `{"params", "devices": [{key, model, id, channel, first, last, count, fields, rssi, snr, freq, protocol}], "events": [latest 120], "info", "presets"}` |
| `POST` | `/api/sensors` | `{"preset": "433" \| "315" \| "868" \| "915" \| "345" \| "433+868" \| "433+315" \| "433+915", "hop": 10–600, "gain": "auto" \| 0–50, "activate": bool}` → `{"ok": true, "params"}`. Restarts rtl_433 |
| `POST` | `/api/sensors/clear` | Clears the device list |

### Aircraft (dump1090)

| Method | Path | Body / response |
|---|---|---|
| `GET` | `/api/adsb` | `{"aircraft": [{hex, flight, alt_baro, alt_geom, gs, track, lat, lon, seen, seen_pos, rssi, squawk, category, baro_rate, messages, emergency, dist_km, bearing}], "messages", "now", "location": {lat, lon, source} \| null, "info", "params", "today"}` |
| `POST` | `/api/adsb` | `{"gain": "auto" \| 0–50, "activate": bool}` |
| `POST` | `/api/location` | `{"lat", "lon"}` in decimal degrees → `{"ok": true, "location"}`. `RECEIVER_LAT/LON` in the config take precedence at startup |

### Catalog

`GET /api/decoders` → `{"items": [{key, name, where: "panel" | "owrx", available, note, needs: [binaries]}], "openwebrx": bool, "ambe": bool, "kinds": {pocsag: name, …}}`

## WiFi

| Method | Path | Body | Response / effect |
|---|---|---|---|
| `GET` | `/api/wifi` | — | `{"status": {mode, ssid, connection, stations, forced, available}, "saved": [{name, uuid, ssid, autoconnect, priority}], "hotspot_ssid", "hotspot_ip"}` |
| `POST` | `/api/wifi/scan` | `{}` | `{"ok": true, "networks": [{ssid, signal, security}]}`; `400` while in hotspot mode |
| `POST` | `/api/wifi/add` | `{"ssid", "password" (8–63 or empty), "hidden": bool, "connect": bool}` | `{"ok": true, "uuid"}`; replaces a saved network with the same SSID |
| `POST` | `/api/wifi/connect` | `{"uuid"}` | Switches networks after 1.5 s (your client will lose the connection) |
| `POST` | `/api/wifi/delete` | `{"uuid"}` | Forgets the network |
| `POST` | `/api/wifi/mode` | `{"mode": "auto" \| "hotspot"}` | Pins or releases the hotspot |

## System and updates

| Method | Path | Response / effect |
|---|---|---|
| `GET` | `/api/system/update` | Runs the updater in check mode (up to 60 s): `{"ok", "online", "current", "current_commit", "latest", "latest_commit", "behind", "full", "changes": [subjects], "repo", "branch"}` or `{"ok": false, "online", "error"}` |
| `POST` | `/api/system/update` | Starts the update in the transient unit `sdrkit-update` → `{"ok": true}`; `400` if one is running |
| `POST` | `/api/system/autoupdate` | `{"on": true \| false}` — new-version notices (the panel asks on first visit) → `{"ok": true, "notify": bool}`; turning it on checks GitHub right away |
| `GET` | `/api/system/update/log` | Last 40 lines of `/var/log/sdrkit-update.log` (`text/plain`) |
| `GET` | `/api/logs` | Last 200 journal lines of `sdrkit`, `sdrkit-netwatch`, `openwebrx` (`text/plain`) |
| `POST` | `/api/system/reboot` | Reboots after 1.5 s |
| `POST` | `/api/system/poweroff` | Powers off after 1.5 s |

`GET /api/status` includes `update`: `{"notify": null | bool, "checked", "ok", "online", "current", "latest", "behind",
"full", "changes"}` — the last check (manual or automatic), used for the dot next to the version. `notify` is `null`
until the user answers.

In demo mode the update, reboot and power-off routes return `{"ok": true, "demo": true}` without doing anything.

```sh
curl -s -b jar.txt $PI/api/system/update | python3 -m json.tool
```

## Static files

| Path | Served |
|---|---|
| `/`, `/index.html` | The panel |
| `/<name>.js`, `/<name>.css` | Panel scripts and styles (`[a-z0-9_-]` names) |
| `/favicon.svg`, `/icon.svg`, `/manifest.webmanifest` | Public, no login needed |

## Route index

| Method | Path | Section |
|---|---|---|
| GET/POST | `/login` | [Authentication](#authentication) |
| GET | `/logout` | [Authentication](#authentication) |
| GET | `/api/status` | [Status and modes](#get-apistatus) |
| POST | `/api/mode` | [Status and modes](#post-apimode) |
| GET/POST | `/api/sweep` | [Analyzer](#analyzer) |
| POST | `/api/sweep/cal` | [Analyzer](#post-apisweepcal) |
| GET | `/api/stream` | [Analyzer](#get-apistream-server-sent-events) |
| GET/POST | `/api/monitor` | [24/7 monitor](#247-monitor) |
| GET | `/api/monitor/data`, `/api/monitor.csv` | [24/7 monitor](#other-monitor-routes) |
| POST | `/api/monitor/clear` | [24/7 monitor](#other-monitor-routes) |
| GET/POST | `/api/radio` | [Radio](#radio) |
| POST | `/api/radio/record` | [Radio](#post-apiradiorecord) |
| GET | `/api/radio/replay.wav` | [Radio](#instant-replay) |
| POST | `/api/radio/replay` | [Radio](#instant-replay) |
| GET | `/api/radio/stream` | [Radio](#get-apiradiostream-server-sent-events) |
| GET | `/api/radio/audio` | [Radio](#get-apiradioaudio) |
| POST | `/api/radio/scan` | [Scanner](#scanner) |
| GET/POST | `/api/memories` | [Memories](#memories) |
| POST | `/api/memories/delete`, `/api/memories/import` | [Memories](#memories) |
| GET | `/api/recordings`, `/api/recordings/file`, `/api/recordings/zip` | [Recordings](#recordings-and-activity) |
| POST | `/api/recordings/delete` | [Recordings](#recordings-and-activity) |
| GET | `/api/activity`, `/api/activity.csv` | [Recordings](#recordings-and-activity) |
| POST | `/api/activity/clear` | [Recordings](#recordings-and-activity) |
| GET | `/api/decoded`, `/api/decoded.csv` | [Decoders](#messages-multimon-ng) |
| POST | `/api/decoded/clear` | [Decoders](#messages-multimon-ng) |
| GET/POST | `/api/sensors` | [Decoders](#sensors-rtl_433) |
| POST | `/api/sensors/clear` | [Decoders](#sensors-rtl_433) |
| GET/POST | `/api/adsb` | [Decoders](#aircraft-dump1090) |
| POST | `/api/location` | [Decoders](#aircraft-dump1090) |
| GET | `/api/decoders` | [Decoders](#catalog) |
| GET | `/api/wifi` | [WiFi](#wifi) |
| POST | `/api/wifi/scan`, `/api/wifi/add`, `/api/wifi/connect`, `/api/wifi/delete`, `/api/wifi/mode` | [WiFi](#wifi) |
| GET/POST | `/api/system/update` | [System](#system-and-updates) |
| POST | `/api/system/autoupdate` | [System](#system-and-updates) |
| GET | `/api/system/update/log`, `/api/logs` | [System](#system-and-updates) |
| POST | `/api/system/reboot`, `/api/system/poweroff` | [System](#system-and-updates) |
