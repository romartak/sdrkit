# Legal

SDR-Kit is a **receiver**. This page explains what that means in practice and lists the licenses of the software it installs.

> [!IMPORTANT]
> This is general information, not legal advice. Radio laws differ widely between countries. **You are responsible for knowing and following the law where you use SDR-Kit.**

- [Receive only](#receive-only)
- [Privacy of communications](#privacy-of-communications)
- [Encryption](#encryption)
- [Codec patents (AMBE/IMBE)](#codec-patents-ambeimbe)
- [Data that leaves the device](#data-that-leaves-the-device)
- [Licenses](#licenses)

## Receive only

- The RTL-SDR **only receives**. SDR-Kit has no transmit function and cannot interfere with anyone.
- Knowing a channel's CTCSS/DCS tone does **not** give you permission to transmit on it. To talk you need type-approved equipment and, depending on the band, a licence (amateur radio, GMRS, business radio…).
- Some countries restrict owning or using scanners or receivers for certain bands, or in vehicles. Check before you use it.

## Privacy of communications

In many countries **listening** to radio is legal, but **intercepting, recording, disclosing or using** the content of private communications is restricted or prohibited — for example medical pagers, telephony, security services or business radio.

SDR-Kit can record transmissions and log decoded messages (pagers, APRS, sensors). Treat that data with care:

- Do not publish or share recordings or decoded messages of private communications.
- Delete what you do not need (**Recordings → 🗑 Delete**, **Decode → Messages → Delete**, **Recordings → Clear log**).
- Remember that tyre-pressure sensors, utility meters and pagers can identify people and places.

## Encryption

- Encrypted communications **cannot and must not be decrypted**. SDR-Kit does not attempt it: digital voice marked as encrypted is shown as *encrypted call* and stays silent; no keys are ever passed to the decoder.
- Mobile phone networks (2G–5G), WiFi and Bluetooth contents are encrypted and out of scope.
- Encrypted public-safety systems (for example AES, ARC4 or TETRA with TEA) cannot be heard with SDR-Kit or any other receiver without the key.

## Codec patents (AMBE/IMBE)

DMR, P25, D-Star, Yaesu System Fusion, NXDN and dPMR use the **AMBE/IMBE** family of voice codecs developed by Digital Voice Systems, Inc. (DVSI). These codecs are **patented**.

| Path | Codec implementation | Status |
|---|---|---|
| **DSD-FME + mbelib** (panel, optional) | Software implementation in mbelib | Using it without a licence **may infringe patents in some countries**. Free software intended for study and personal use. Off by default; the installer asks only after showing the notice. Read <https://github.com/lwvmobile/mbelib#readme> |
| **AMBE3000 USB dongle** (advanced receiver, optional) | DVSI hardware vocoder | Licensed path |
| **M17, FreeDV** | Codec2 (open, royalty-free) | No codec patents involved |

SDR-Kit does not ship mbelib or DSD-FME in its repository: when you accept, the installer downloads and builds them from their upstream sources on your Pi.

## Data that leaves the device

By default nothing leaves the Pi. Outbound connections happen only when you configure or trigger them:

| Feature | Destination |
|---|---|
| Install and update | GitHub, Raspberry Pi OS / Debian repositories, the OpenWebRX+ repository, Tailscale's installer |
| Phone alerts | `NTFY_SERVER` (default `https://ntfy.sh`): frequency and level of each alarm, sent to your topic. Anyone who knows the topic name can read it |
| Remote access | Tailscale coordination servers (if installed and linked) |

The panel uses plain HTTP inside your network; see [Architecture → Security model](architecture.md#security-model).

## Licenses

### SDR-Kit

SDR-Kit is released under the **[MIT License](../LICENSE)**. The recorded M17 test transmission (`files/demo_m17.sym`) and the demo signal generators are part of the project.

### Third-party software

SDR-Kit does not bundle these programs; the installer installs them from distribution or project repositories, or builds them from source on the Pi. Each keeps its own license — check the upstream project for the authoritative text.

| Software | Used for | Installed from | License |
|---|---|---|---|
| [OpenWebRX+](https://github.com/luarvique/openwebrx) | Advanced receiver | OpenWebRX+ apt repository | AGPL-3.0 |
| [rtl-sdr / librtlsdr](https://osmocom.org/projects/rtl-sdr) and the [RTL-SDR Blog driver](https://github.com/rtlsdrblog/rtl-sdr-blog) | Dongle driver, `rtl_test`, `rtl_power` | Raspberry Pi OS; built from source on Bookworm | GPL-2.0 |
| [rtl_433](https://github.com/merbanan/rtl_433) | ISM sensors | apt (`rtl-433`) | GPL-2.0 |
| [dump1090-fa](https://github.com/flightaware/dump1090) | ADS-B aircraft | OpenWebRX+ repository (`dump1090-fa-minimal`) | GPL-2.0 or later |
| [multimon-ng](https://github.com/EliasOenal/multimon-ng) | POCSAG, FLEX, APRS, EAS, selcall, CW, FMS | apt | GPL-2.0 |
| [DSD-FME](https://github.com/lwvmobile/dsd-fme) | Digital voice in the panel (optional) | Built from source | See upstream repository |
| [mbelib](https://github.com/lwvmobile/mbelib) | AMBE/IMBE software vocoder for DSD-FME (optional) | Built from source | ISC (patent notice applies) |
| [Codec2](https://github.com/drowe67/codec2) | M17 / FreeDV voice | apt (`codec2`, `libcodec2-dev`) | LGPL-2.1 |
| [codecserver](https://github.com/jketterl/codecserver) | AMBE3000 dongle access for OpenWebRX+ (optional) | OpenWebRX+ repository | GPL-3.0 |
| [NumPy](https://numpy.org) | DSP in the panel | apt (`python3-numpy`) | BSD-3-Clause |
| [Tailscale](https://github.com/tailscale/tailscale) | Remote access (optional) | Tailscale installer | BSD-3-Clause (client) |
| [HackRF tools](https://github.com/greatscottgadgets/hackrf) | `hackrf_sweep` (optional, installed by you) | apt (`hackrf`) | GPL-2.0 |

Other decoders installed from the OpenWebRX+ repository (direwolf, digiham, acarsdec, dumpvdl2, dumphfdl, dump978, redsea, m17-demod, sonde decoders, dablin, nrsc5, and optionally WSJT-X and JS8Call) carry their own licenses.

Trademarks (Raspberry Pi, RTL-SDR Blog, HackRF, tinySA, Tailscale, AMBE…) belong to their owners and are used only to describe compatibility.
