# FAQ

## General

**What is SDR-Kit, in one sentence?**
A Raspberry Pi Zero 2 W + RTL-SDR + power bank that you control from your phone's browser as a tinySA-style spectrum analyzer, a multimode radio and a signal decoder.

**How does it compare with a tinySA?**
It shares the analyzer workflow — markers with delta, max/min hold, peak/RMS/sample detectors, channel power, OBW, ACPR, zero span with trigger, limit lines, normalisation with a reference — and adds listening (FM, AM, WFM, SSB, digital voice), decoders, a scanner, recordings and 24/7 monitoring with phone alerts. It has no signal generator or tracking generator (the RTL-SDR only receives), and levels are relative until you calibrate them (expect ±2–3 dB).

**What frequency range does it cover?**
0.5–1766 MHz with an RTL-SDR Blog V4 (about 100 kHz with a V3 in direct sampling; 24 MHz with other tuners). A HackRF One extends the **analyzer sweep** to 1–6000 MHz.

**Does it need internet?**
No. Everything runs on the Pi, including the aircraft radar. Internet is only used to install and update, for ntfy phone alerts, and for Tailscale remote access.

**Can several people use it at once?**
Yes, but the dongle does one job at a time, so everyone sees the same mode. 1–2 simultaneous listeners is comfortable on a Zero 2 W; OpenWebRX+ accepts up to 3.

**How long does the battery last?**
Roughly 6–10 hours with 10 000 mAh and 12–20 hours with 20 000 mAh. See [Hardware → Power](hardware.md#power).

**Why WiFi and not Bluetooth?**
Bluetooth does not have the bandwidth for the waterfall plus audio, and on the Zero 2 W it shares the radio chip with WiFi. The installer turns Bluetooth off to improve WiFi.

**Does it work on a Raspberry Pi 3, 4 or 5?**
The installer supports Raspberry Pi OS Bookworm and Trixie on any model and only warns when it is not a Zero 2 W. A Pi 4/5 has more headroom for OpenWebRX+ with heavy decoders (FT8, DAB) and several listeners.

**Which SDRs are supported?**
RTL2832U dongles for everything; HackRF One for the analyzer sweep only (install `hackrf`). Airspy and SDRplay are recognised in the System tab but not used.

## Using it

**Why does the analyzer stop when I switch to the Radio?**
One dongle can only be opened by one program. The panel moves it between analyzer, radio, sensors, aircraft and the advanced receiver automatically. A second dongle is needed to run two functions at once (manual setup).

**Can I keep monitoring while my phone is off?**
Yes. Turn on the [24/7 monitor](user-guide.md#247-monitor-and-occupancy) in the analyzer, or in the Radio enable auto-recording, the scanner or a data decoder — these keep running on the Pi without a browser.

**Are the dBm readings accurate?**
Only after calibration with a signal of known level, and only at the gain used for calibration. Expect ±2–3 dB.

**Can it follow trunked systems?**
No. P25 is decoded on a fixed channel; there is no control-channel tracking.

**Can it decode FT8, DAB+, AIS, ACARS, SSTV…?**
Yes, through the advanced receiver (OpenWebRX+). FT8/FT4/WSPR/JS8 need `INSTALL_WSJTX="yes"` (about 300 MB). **Decode → All modes** shows what is installed.

**Can it receive weather-satellite images?**
You can listen to NOAA APT and Meteor LRPT passes; decoding images needs SatDump, which is not included (better on a Pi 4/5).

**Can I use it without a password?**
Only by leaving `ADMIN_PASSWORD` empty, which leaves the panel open to anyone on the network. The installer always sets one.

## Digital voice

**Why is DSD-FME not installed by default?**
It uses mbelib, an implementation of patented AMBE/IMBE codecs. You decide whether to build it; the installer asks after showing the notice. See [Digital voice](digital-voice.md) and [Legal](legal.md#codec-patents-ambeimbe).

**Why can't I hear some digital channels?**
They may be encrypted (shown as such), on a system that is not auto-detected (NXDN, dPMR, M17 must be selected), or too weak.

**Can it decrypt encrypted radio?**
No, and it never will. Encrypted voice (AES, ARC4, TETRA with TEA) cannot be heard with SDR-Kit or any other receiver without the key, and attempting it is illegal in most places.

**Is there a licensed way to hear DMR/D-Star/YSF?**
Yes: an AMBE3000 USB dongle used by OpenWebRX+ (`AMBE_TTY`).

## Can it…?

| Question | Answer |
|---|---|
| Transmit? | No. The RTL-SDR is receive-only |
| Listen to mobile phones (2G–5G), WiFi or Bluetooth contents? | No — they are encrypted |
| Measure above 1766 MHz? | Only the analyzer, with a HackRF One, or with a downconverter/LNB and the converter offset |
| Run without a phone? | It runs headless; you need a browser to see it |
| Be reached from the internet? | Use Tailscale. Do not port-forward the panel |

## Updates and maintenance

**Will an update erase my settings or recordings?**
No. Configuration, recordings, memories and logs are preserved; new options are added to your configuration automatically. See [Updating](updating.md).

**What if an update breaks something?**
Quick updates check that the panel starts and roll back automatically. You can always run `sudo sdrkit rollback`.

**The panel is in the wrong language.**
Tap the **EN/ES** chip in the header. The choice is stored per browser.
