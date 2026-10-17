# Antennas

The antenna matters more than any setting in the panel. This page covers the telescopic antenna that comes with the RTL-SDR Blog kit, element lengths per band, placement, cable loss and the calculator built into the panel.

- [Quick rules](#quick-rules)
- [Telescopic and dipole antennas](#telescopic-and-dipole-antennas)
- [Element lengths per band](#element-lengths-per-band)
- [Which antenna for what](#which-antenna-for-what)
- [Placement](#placement)
- [Cable loss](#cable-loss)
- [In-panel calculator](#in-panel-calculator)

## Quick rules

1. **Height beats gain.** Raising an antenna by 5 m is worth more than any "magic" antenna. Outside and clear of obstacles.
2. **Match the polarisation.** Walkie-talkies, repeaters, airband, marine and ADS-B are **vertical**. Broadcast FM and some satellites are horizontal or circular.
3. **Keep the coax short**, especially in UHF. Put the dongle near the antenna and run a USB extension instead.
4. **Cut long, trim to fit.** Use the analyzer with **Max** hold while trimming: the best length is the one that leaves the signal highest.

## Telescopic and dipole antennas

The RTL-SDR Blog V4 is sold with a dipole kit made of telescopic elements and a mount. Each telescopic element is one **arm** of a dipole, or the radiator of a vertical whip.

- **As a dipole:** extend both elements to the **arm length** in the table below. Stand the dipole **vertically** for walkie-talkies, airband and ADS-B; lay it horizontally for broadcast FM.
- **As a whip:** extend one element to the quarter-wave length. It works much better on a metal surface (a magnetic base on a car roof).
- The connector on the dongle is **SMA female**: antennas need an SMA male plug or an adapter.

> [!TIP]
> The rule of thumb used throughout SDR-Kit: each dipole arm ≈ **71 / f(MHz)** metres. That is a quarter wavelength multiplied by 0.95 for thin wire or rod.

## Element lengths per band

λ = 299.79 / f(MHz) metres. The calculator applies a factor of **0.95** for wire and thin rods (0.97 for thick tube). The *free-space λ/4* column is the theoretical value; the 0.95 column is the length to start cutting from.

| Band | f (MHz) | λ/4 free space | Arm / whip (×0.95) | Dipole total (λ/2 ×0.95) |
|---|---|---|---|---|
| Shortwave 49 m | 6.0 | 12.49 m | 11.87 m | 23.73 m |
| CB 27 MHz | 27.185 | 2.76 m | 2.62 m | 5.24 m |
| FM broadcast | 100 | 75.0 cm | 71.2 cm | 1.42 m |
| Airband | 125 | 60.0 cm | 57.0 cm | 1.14 m |
| Weather satellites | 137.5 | 54.5 cm | 51.8 cm | 1.04 m |
| Amateur 2 m | 146 | 51.3 cm | 48.8 cm | 97.5 cm |
| Marine VHF | 157 | 47.7 cm | 45.4 cm | 90.7 cm |
| NOAA weather | 162.5 | 46.1 cm | 43.8 cm | 87.6 cm |
| ISM 433 | 433.92 | 17.3 cm | 16.4 cm | 32.8 cm |
| PMR446 | 446 | 16.8 cm | 16.0 cm | 31.9 cm |
| FRS / GMRS | 462.6 | 16.2 cm | 15.4 cm | 30.8 cm |
| ISM 868 | 868 | 8.6 cm | 8.2 cm | 16.4 cm |
| ISM 915 | 915 | 8.2 cm | 7.8 cm | 15.6 cm |
| ADS-B | 1090 | 6.9 cm | 6.5 cm | 13.1 cm |
| GPS L1 | 1575.42 | 4.8 cm | 4.5 cm | 9.0 cm |

For ADS-B, the panel's advice of a **6.9 cm** vertical is the free-space quarter wave; **6.5 cm** includes the 0.95 factor. Either works: start at 6.9 cm and trim.

## Which antenna for what

| For | Antenna | Position |
|---|---|---|
| FM broadcast | Telescopic or dipole (~71 cm per arm) | Any; horizontal is better |
| Airband 118–137 MHz | Vertical λ/4 with ground plane, or vertical dipole | Vertical, outside and high |
| Walkie-talkies and repeaters | J-pole or vertical λ/4 | Vertical |
| Weather satellites 137 MHz | V-dipole, arms at 120° (or QFH) | Horizontal, open sky |
| ADS-B 1090 MHz | Vertical λ/4 of 6.5 cm with 4 radials, short cable | Vertical, as high as possible |
| Listening to "everything" (scanner) | Discone (covers ~10× its lowest frequency) | Vertical, on the roof |
| Finding a transmitter | 3-element Yagi + [fox-hunt mode](user-guide.md#fox-hunt-mode) | Rotate to the maximum |
| 433 / 868 MHz sensors | λ/4 whip (16.4 cm / 8.2 cm) | Vertical |
| Shortwave / HF (V4) | Long wire 10–20 m + 9:1 unun | As high and long as possible |

## Placement

| Do | Why |
|---|---|
| Put the antenna **outside and high** | Line of sight dominates VHF/UHF range |
| Keep it away from the Pi, USB cables and chargers | They radiate broadband noise; a USB extension with ferrite helps |
| In a metal case, mount the antenna **outside** | The case is a shield |
| Use an **FM band-stop filter** near broadcast transmitters | Strong FM stations overload the dongle and create "ghosts" across the spectrum |
| Use the **bias-tee** only with antennas that are not DC-shorted | `BIAS_TEE="yes"` puts 4.5 V on the coax to power an LNA or active antenna |

## Cable loss

Thin coax loses a lot at UHF. Values used by the panel's calculator (dB per 100 m, typical datasheet figures):

| Cable | 30 MHz | 100 MHz | 150 MHz | 450 MHz | 900 MHz | 1500 MHz |
|---|---|---|---|---|---|---|
| RG-174 (thin) | 17 | 29 | 35 | 60 | 85 | 115 |
| RG-58 | 8 | 16 | 20 | 37 | 54 | 72 |
| RG-8X (mini-8) | 6.2 | 12 | 15 | 28 | 41 | 55 |
| RG-6 (TV cable, fine for receiving) | 3.6 | 6.6 | 8.2 | 15 | 20 | 27 |
| LMR-240 | 4.3 | 7.9 | 9.8 | 17.4 | 24.9 | 32.5 |
| LMR-400 | 2.2 | 4.1 | 4.9 | 8.9 | 12.8 | 16.7 |

Example: 10 m of RG-58 at 450 MHz loses 3.7 dB — less than half of the signal reaches the dongle. The calculator rates the result:

| Loss | Verdict |
|---|---|
| < 1 dB | Excellent |
| 1–3 dB | Acceptable |
| 3–6 dB | You lose a lot: shorten the cable or use a thicker one |
| > 6 dB | Too much: move the dongle next to the antenna and use a USB extension |

## In-panel calculator

![Antenna calculator](media/screenshots/antennas.png)

**More → Antennas** draws each design with its dimensions for any frequency between 0.1 and 6000 MHz. Type the frequency or tap a shortcut (FM 100, airband 125, satellites 137.5, 2 m 146, marine 157, 433.9, PMR446, FRS/GMRS 462.6, ADS-B 1090, GPS 1575.4), and choose the material factor (wire/thin rod ×0.95 or thick tube ×0.97).

| Design | Dimensions given | Notes |
|---|---|---|
| **Dipole λ/2** | Each arm (k·λ/4), total | ~2.1 dBi, bidirectional. Centre conductor to one arm, braid to the other |
| **Vertical λ/4 with ground plane** | Radiator k·λ/4; 4 radials 1.05·k·λ/4 at 45° down | ~2 dBi omnidirectional; ~50 Ω with drooping radials |
| **J-pole** | Long element 0.75·k·λ, stub 0.25·k·λ, spacing 0.02·λ, feed point ≈ 0.035·λ from the bottom | ~2.5 dBi, no radials; move the feed point for best signal |
| **Yagi, 3 elements** | Reflector 0.495·λ, driven 0.473·λ, director 0.440·λ; spacings 0.20·λ and 0.15·λ | ~7 dBi, directional; ideal for fox hunting |
| **V-dipole for satellites** | Each arm k·λ/4, 120° apart | Horizontal, arms pointing north and south |
| **Discone** | Cone side 0.25·λ, base 0.25·λ, disc 0.7 × 0.25·λ, 1–2 cm gap | Covers from f to ~10·f; disc to centre conductor, cone to braid |
| **Telescopic whip** | Rod k·λ/4; or two rods as a dipole | Better on a metal ground plane |

The page also has the **Coax cable loss** calculator (cable type, length, frequency) and the **Which antenna for what?** table above.
