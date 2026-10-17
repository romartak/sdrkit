# Related projects and learning resources

SDR-Kit stands on a lot of open-source work. This page collects **receive-only** projects and learning material
that pair well with it. SDR-Kit never transmits, so transmitters, fake base stations and attack tooling are
intentionally left out.

> **Credit.** Many of the SDR software, spectrum and signal-analysis projects below were found through
> [**RFSec-ToolKit**](https://github.com/cn0xroot/RFSec-ToolKit) by [@cn0xroot](https://github.com/cn0xroot)
> (雪碧 / 0x0root, [Twitter @0x0root](https://twitter.com/0X0root)), a long-running curated collection of SDR and
> RF-protocol resources. Thank you for keeping that map of the field. The descriptions here are our own; go to
> that repository for the much larger original list. Links were taken from there and may have moved since.

## Receivers and SDR applications

| Project | What it is | Why it matters here |
|---|---|---|
| [OpenWebRX+](https://github.com/luarvique/openwebrx) | Multi-user web SDR receiver | Powers SDR-Kit's *advanced receiver* (40+ modes). Its origin is [OpenWebRX](https://github.com/simonyiszk/openwebrx) |
| [Gqrx](https://github.com/csete/gqrx) | Desktop SDR receiver (GNU Radio + Qt) | Great for the same dongle on a PC |
| [CubicSDR](https://github.com/cjcliffe/CubicSDR) | Cross-platform SDR application | Easy desktop alternative |
| [SDRangel](https://github.com/f4exb/sdrangel) | Many-device SDR suite | For power users with several radios |
| [ShinySDR](https://github.com/kpreid/shinysdr) | Web-based receiver on GNU Radio | Another take on a browser UI |
| [GNU Radio](https://github.com/gnuradio/gnuradio) | Signal-processing toolkit | The standard way to prototype your own decoder |

## Spectrum analysis

| Project | What it is |
|---|---|
| [qspectrumanalyzer](https://github.com/xmikos/qspectrumanalyzer) | Desktop spectrum analyzer front-end for `rtl_power`, `hackrf_sweep` and others |
| [spektrum](https://github.com/pavels/spektrum) | Spectrum analyzer software for RTL-SDR |
| [gr-fosphor](https://github.com/osmocom/gr-fosphor) | GPU-accelerated spectrum/waterfall block for GNU Radio |
| [tinySA](https://tinysa.org) | The pocket hardware analyzer that inspired SDR-Kit |

## Decoders (the kind SDR-Kit wraps or complements)

| Project | What it decodes |
|---|---|
| [rtl_433](https://github.com/merbanan/rtl_433) | 433/868/915 MHz sensors, weather stations, TPMS |
| [multimon-ng](https://github.com/EliasOenal/multimon-ng) | POCSAG/FLEX pagers, APRS, EAS and more |
| [dump1090](https://github.com/flightaware/dump1090) | ADS-B aircraft at 1090 MHz |
| [gr-air-modes](https://github.com/bistromath/gr-air-modes) | Mode S / ADS-B with GNU Radio |
| [gr-ais](https://github.com/bistromath/gr-ais) | AIS ship positions |
| [gr-rds](https://github.com/bastibl/gr-rds) | FM RDS data |
| [DSD-FME](https://github.com/lwvmobile/dsd-fme) | Digital voice (DMR, P25, NXDN, …) — optional in SDR-Kit, see [digital voice](digital-voice.md) |

## Analyzing recorded signals

| Project | What it is |
|---|---|
| [Inspectrum](https://github.com/miek/inspectrum) | Look at captured IQ files and measure symbols |
| [Universal Radio Hacker](https://github.com/jopohl/urh) | Investigate unknown protocols from recordings |
| [Audacity](https://www.audacityteam.org) | Handy for inspecting the audio SDR-Kit records |

## Learning

Channels and talks recommended in the RFSec-ToolKit list, useful if you are new to SDR: the
[Software Defined Radio Academy](https://www.youtube.com/channel/UC1GAlgAQrkjeeLmIkCB8pgQ), Michael Ossmann's
HackRF course, [GRCon](https://www.youtube.com/channel/UCceoapZVEDCQ4s8y16M7Fng) talks and the
GNU Radio tutorial series. Also worth a look: [rtl-sdr.com](https://www.rtl-sdr.com) and the
[Wikipedia list of software-defined radios](https://en.wikipedia.org/wiki/List_of_software-defined_radios).

## Adding a project

Open a pull request with a one-line description in your own words and a note on why it fits a receive-only kit.
