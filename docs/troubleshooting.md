# Troubleshooting

Find the symptom, check the likely cause, apply the fix. Two commands answer most questions:

```sh
sdrkit status     # services, network, IPs, SDR on USB, power and temperature
sdrkit doctor     # full check-up: ✔/✖ per item and what to do about each failure
sdrkit logs       # live logs of the panel, the network watchdog and OpenWebRX+
```

- [Hardware and power](#hardware-and-power)
- [Network and access](#network-and-access)
- [Analyzer](#analyzer)
- [Radio and digital voice](#radio-and-digital-voice)
- [Decoders](#decoders)
- [Recordings](#recordings)
- [Advanced receiver (OpenWebRX+)](#advanced-receiver-openwebrx)
- [Installation](#installation)
- [Updates](#updates)
- [Passwords](#passwords)
- [Collecting information for a bug report](#collecting-information-for-a-bug-report)

## Hardware and power

| Symptom | Likely cause | Fix |
|---|---|---|
| **⚡ Undervoltage** chip, red *Power* tile, `throttled=0x50005` | Long/thin cable, weak power bank | Short, thick micro-USB cable into **PWR IN**; power bank rated **5 V / 2.4 A** or more |
| *No RTL-SDR detected. Check the OTG adapter (USB port, not PWR) and the power* | OTG adapter in the wrong port, loose cable, or not enough power | Plug the OTG adapter into the port labelled **USB**. `lsusb` must list `0bda:2838`. Then `sudo sdrkit test-sdr` |
| *Could not open the RTL-SDR (code …)* | Another program owns the dongle (OpenWebRX+, rtl_433, dump1090, a manual `rtl_test`) | Switch modes from the panel, or `sudo sdrkit restart`. The installer blacklists the kernel DVB driver; if you reinstalled the OS, re-run the installer |
| *Error reading the RTL-SDR … Was it unplugged or short of power?* | USB dropout, usually power | Fix the power supply; use a USB extension with ferrite |
| `sudo sdrkit test-sdr` does not show *Found 1 device(s)* | Dongle, adapter or cable failure | Try another OTG adapter and cable; try the dongle on a PC |
| V4 detected but cannot tune / poor HF on **Bookworm** | Distribution `librtlsdr` 0.6 lacks V4 support | Set `RTLSDR_DRIVER="blog"` (default `auto` already does this on Bookworm) and re-run the installer |
| Temperature tile red (> 75 °C), *CPU throttled by heat* | No heatsink, closed case | Add a heatsink; ventilate the case |
| Pi reboots under load | Power bank output drops | Better power bank and cable |

## Network and access

| Symptom | Likely cause | Fix |
|---|---|---|
| WiFi **`SDR-Pi`** does not appear | The Pi joined a known network, or is still waiting `BOOT_WAIT` (45 s) for one | Wait 1–2 minutes. At home, use `http://sdrpi.local`. Force it with `sudo sdrkit hotspot` (`sudo sdrkit auto` to undo) |
| Connected to `SDR-Pi` but the page does not open | Typed `https://`, or the phone routes traffic over mobile data | Open **`http://192.168.4.1`**; accept "stay connected" when the phone says there is no internet; turn mobile data off briefly |
| `http://sdrpi.local` does not resolve | mDNS not supported by the client (some Android versions) or different network | Use the Pi's IP (router client list, or `sdrkit status`) |
| The Pi does not see your phone's hotspot | The Zero 2 W is 2.4 GHz only | iPhone: enable **Maximize Compatibility**. Android: use 2.4 GHz |
| Phone loses the panel after changing WiFi in **More → WiFi** | Expected: the Pi moved to another network | Join the same network and reopen the panel. If the Pi could not connect, the hotspot comes back on its own |
| **Scan** in More → WiFi fails | The Pi cannot scan while it is the hotspot | Type the network name by hand |
| `http://sdrpi` does not work remotely | Tailscale not linked, or MagicDNS off | `sudo tailscale up` on the Pi; use the Tailscale IP shown in **More → System → Access addresses** |
| Audio stutters | Weak WiFi, many listeners | Move closer; 1–2 listeners is the comfortable limit. WiFi power saving is already disabled by the installer |

## Analyzer

| Symptom | Likely cause | Fix |
|---|---|---|
| Overlay *Another mode is using the dongle* | Radio, sensors, aircraft or OpenWebRX+ has it | Tap **Use the analyzer** |
| *Analyzer paused (dongle released)* | Nobody was viewing for 20 s (`SWEEP_IDLE_STOP`) | Normal; it resumes when you open the tab. Enable the 24/7 monitor to keep sweeping |
| Peaks everywhere, "ghost" signals | Overload: gain too high, strong FM stations, USB noise | Lower the gain; move the dongle away on a USB extension; use an FM band-stop filter |
| Levels in dBm look wrong | Not calibrated, or calibrated at another gain | Calibrate with a known signal at the gain you use ([how](user-guide.md#units-calibration-and-converter)) |
| Zero span shows *waiting for a signal above the trigger level* | Trigger level above the signal | Lower **Trigger level** or use **Free run** |
| Zero span unavailable | HackRF or `rtl_power` engine | Zero span needs the native RTL-SDR engine (`SWEEP_ENGINE="auto"` or `"native"`) |
| HackRF presets missing | `hackrf_sweep` not installed | `sudo apt install hackrf`, then `sudo sdrkit restart` |
| No phone alerts from the monitor | `NTFY_TOPIC` empty, no internet on the Pi, *Phone alert* unchecked | Set `NTFY_TOPIC`, subscribe in the ntfy app, give the Pi internet |

## Radio and digital voice

| Symptom | Likely cause | Fix |
|---|---|---|
| No sound on iPhone/iPad | Audio needs a tap to start; silent switch on | Press **▶ Listen on this phone**; turn off silent mode |
| No sound anywhere | Squelch closed, wrong mode, volume | Press **Open** on the squelch, check the mode, raise the volume slider |
| Constant noise | Squelch open | Press **Auto** (noise + 8 dB) or drag the slider just above the noise |
| No CTCSS/DCS shown | Not FM, too short, or no tone in use | Tones need FM and ~2 s of speech |
| *DSD-FME is not installed* | Optional component | `sudo sdrkit install-dsd`, or set `INSTALL_DSD="yes"` with `sudo sdrkit config` and run `sudo bash /opt/sdrkit-src/install.sh` |
| Digital mode, no voice | Wrong system; signal below squelch | Try another system: **NXDN, dPMR and M17 are not auto-detected**. Check the signal opens the squelch |
| *Encrypted call* | Encryption | Cannot be heard (by design and by law) |
| Seek finds nothing: *No signals above the squelch…* | Squelch too high or band empty | Lower the squelch; try farther away |
| *The dongle cannot tune …* | Frequency outside the tuner range | V4: 0.5–1766 MHz; other tuners start at 24 MHz |
| HF stations not heard (V4) | Antenna too short | Use a long-wire antenna (10–20 m); see [Antennas](antennas.md) |

## Decoders

| Symptom | Likely cause | Fix |
|---|---|---|
| *multimon-ng is not installed* | Package missing | `sudo apt install multimon-ng` |
| No POCSAG/APRS messages | Off-frequency, weak signal, wrong mode | Exact frequency, **FM**, signal well above the noise; check *Digital data on this frequency* is on |
| *rtl_433 is not installed* / *dump1090 is not installed* | Package missing | `sudo apt install rtl-433` / `sudo apt install dump1090-fa-minimal` |
| *rtl_433 stopped* / *dump1090 stopped* | Dongle unplugged or busy | Check `sdrkit status`, switch modes, `sudo sdrkit restart` |
| No sensors | Wrong band, nothing nearby | Try `433+315` (Americas) or `433+868` (Europe); wait a few minutes; vertical antenna |
| Radar empty | Antenna, gain, location | Vertical 6.5–6.9 cm antenna, high and clear; wait a minute; try another gain |
| **📍 Phone GPS** does nothing | Browsers only allow geolocation on `https` pages | Type latitude/longitude, or set `RECEIVER_LAT`/`RECEIVER_LON` |
| A decoder shows "missing" in **All modes** | Its package is not installed | `sdrkit decoders` lists what is missing; install it with `apt` |

## Recordings

| Symptom | Likely cause | Fix |
|---|---|---|
| *Could not start recording (low space on the microSD?)* | Less than 300 MB free | Delete recordings or other files; lower `REC_MAX_MB` |
| Old recordings disappear | `REC_MAX_MB` (2000 MB) reached: oldest are deleted | Download them (ZIP) or raise `REC_MAX_MB` |
| Very short transmissions not saved | Shorter than `REC_MIN_SEC` | Lower `REC_MIN_SEC` |

## Advanced receiver (OpenWebRX+)

| Symptom | Likely cause | Fix |
|---|---|---|
| *OpenWebRX+ is not installed* | Installation step 4 failed | Re-run the installer and read `/var/log/sdrkit-install.log` |
| *The receiver is slow to respond* | First start takes time on a Zero 2 W | Try again after a few seconds |
| Band profiles missing or wrong region | Settings existed before SDR-Kit seeded them | `sudo sdrkit profiles` rewrites them (from `REGION`, `RTL_MODEL`) |
| Cannot log in to settings | Password changed outside SDR-Kit | `sudo sdrkit password` resets both panel and `admin` passwords |
| DMR/D-Star voice silent in OpenWebRX+ | No licensed codec | Needs an AMBE3000 dongle (`AMBE_TTY`); see [Digital voice](digital-voice.md#level-3-licensed-path-ambe3000-dongle) |

## Installation

| Symptom | Likely cause | Fix |
|---|---|---|
| *This kit is for Raspberry Pi OS Bookworm or Trixie* | Other OS release | Flash Raspberry Pi OS Lite (64-bit), Trixie or Bookworm |
| *NetworkManager (nmcli) is missing* | Old or non-standard image | Use a current Raspberry Pi OS Lite image |
| `apt update` fails | No internet | Check the Pi's WiFi; `ping github.com` |
| SSH dropped during installation | Normal: the installer runs in the background | `tail -f /var/log/sdrkit-install.log` |
| *An installation is already running* | A previous run is still going | The installer shows its progress; wait |
| Any `✖ ERROR` | See the last lines of the log | Fix the cause and run the installer again — it is safe to repeat |
| `sudo sdrkit install-dsd` says it cannot find the kit folder | It looks for the kit on the boot partition | On GitHub installs use `INSTALL_DSD="yes"` + `sudo bash /opt/sdrkit-src/install.sh` |

## Updates

| Symptom | Likely cause | Fix |
|---|---|---|
| *No internet* | The Pi is on its own hotspot | Connect it to home WiFi or your phone's hotspot |
| *Could not reach GitHub (repo, branch)* | Wrong `SDRKIT_REPO`/`SDRKIT_BRANCH`, private repository | Check them with `sdrkit version`; fix with `sudo sdrkit config` |
| *An update is already running* | Another update in progress | Wait; check `systemctl status sdrkit-update` |
| *The new panel did not respond in 60 s* + `↩` | Automatic rollback | You are back on the previous version; read `/var/log/sdrkit-update.log` |
| Something is odd after an update | Regression | `sudo sdrkit rollback` |

## Passwords

| Forgot | Fix |
|---|---|
| Panel / OpenWebRX+ `admin` password | `sudo sdrkit password` |
| Hotspot password | `sudo sdrkit hotspot-password` (applies the next time the hotspot starts) |
| Linux user password (SSH) | Not managed by SDR-Kit: reset it with a keyboard and screen on the Pi, or re-flash the card and reinstall |

## Collecting information for a bug report

```sh
sdrkit version
sdrkit status
sdrkit decoders
journalctl -u sdrkit -n 200 --no-pager
tail -n 100 /var/log/sdrkit-update.log /var/log/sdrkit-install.log
```

Remove passwords and network names before sharing output.
