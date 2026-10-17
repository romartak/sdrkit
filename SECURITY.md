# Security Policy

## Supported versions

Only the latest release receives fixes. Updating is one command: `sudo sdrkit update`.

| Version | Supported |
|---------|-----------|
| 3.x     | ✅ |
| < 3.0   | ❌ |

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's
[private vulnerability reporting](https://github.com/romartak/sdrkit/security/advisories/new) and include the
version (`sdrkit version`), what an attacker can do, and steps to reproduce. You will get an answer within a
few days; fixes are released as soon as they are ready and credited to you unless you prefer otherwise.

## Security model

SDR-Kit is designed for a **trusted local network**: its own WPA2 hotspot in the field, your home WiFi, or a
private Tailscale tailnet.

- The web panel requires the password set during installation (`ADMIN_PASSWORD`); sessions use an
  `HttpOnly`, `SameSite=Lax` cookie. Traffic is plain HTTP inside your LAN/tailnet.
- **Never expose the panel directly to the internet** (no port forwarding). For remote access use Tailscale.
- The hotspot password and panel password are stored only on the Pi, in `/etc/sdrkit/sdrkit.conf`
  (readable by root only) — never in this repository.
- Updates are fetched from this GitHub repository over HTTPS; a failed update rolls back automatically.
- The radio is receive-only. SDR-Kit never decrypts encrypted traffic.
