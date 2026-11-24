# Conmutador de laboratorio · Lab switch (Proxlafy ⇄ SDR-Kit)

> **ES** abajo · **EN** below.

Proxlafy y [SDR-Kit](https://github.com/romartak/sdrkit) pueden vivir en la **misma microSD**.
No corren a la vez porque comparten el **hotspot WiFi** y el **puerto 80**: el conmutador apaga uno
y enciende el otro **al instante, sin internet y sin reinstalar**.

## Instalar los dos (una sola vez)

En la Pi, con internet (tu WiFi de casa o el hotspot del celular):

```bash
# Proxlafy (RFID / Proxmark3)
curl -fsSL https://raw.githubusercontent.com/romartak/proxlafy/main/get.sh | sudo bash
# SDR-Kit (radio / SDR)
curl -fsSL https://raw.githubusercontent.com/romartak/sdrkit/main/get.sh | sudo bash
```

El instalador de cada proyecto **pausa automáticamente el otro** (lo deja instalado, solo detiene sus
servicios y su hotspot) para que no choquen. El último que instales queda activo.

## Cambiar entre proyectos

**Desde el panel (botón secreto):** mantén pulsado **≈1 segundo** el logo/nombre arriba a la izquierda,
o tócalo **tres veces** seguidas. Aparece una hoja para pasar el control al otro proyecto. Solo el rol
**admin** puede hacerlo.

Al cambiar, **la red WiFi cambia** (p. ej. de `Proxlafy` a `SDR-Pi`): reconéctate a la nueva red y abre
`http://192.168.4.1`. Puede tardar hasta un minuto.

**Desde la línea de comandos (SSH):**

```bash
sudo proxlafy switch          # pasar al otro proyecto (SDR-Kit)
sudo labswitch sdrkit         # pasar a uno concreto
sudo labswitch proxlafy
labswitch status              # ver qué está instalado y cuál está activo
```

Si el otro proyecto **no está instalado**, el botón (o `sudo labswitch install sdrkit`) lo **descarga e
instala desde GitHub** — para eso sí hace falta WiFi con internet.

## Cómo funciona

- Cada proyecto tiene sus servicios systemd (`proxlafy` + `proxlafy-netwatch`, `sdrkit` + `sdrkit-netwatch`)
  y su conexión de hotspot en NetworkManager (`proxlafy-hotspot`, `sdrkit-hotspot`).
- Cambiar = **desactivar+detener** los servicios del actual, bajar su hotspot, y **activar+iniciar** los
  del otro. Como se usa `systemctl enable`, la elección **sobrevive a reinicios**: al encender arranca el
  último activo.
- El cambio se lanza **desprendido** (con `systemd-run`) para que termine aunque el panel actual se apague
  a mitad.

---

# Lab switch (Proxlafy ⇄ SDR-Kit) — English

Proxlafy and [SDR-Kit](https://github.com/romartak/sdrkit) can live on the **same microSD**. They don't run
at the same time (they share the WiFi hotspot and port 80), so the switch turns one off and the other on —
**instantly, offline, with no reinstall**.

## Install both (once)

On the Pi, with internet:

```bash
curl -fsSL https://raw.githubusercontent.com/romartak/proxlafy/main/get.sh | sudo bash
curl -fsSL https://raw.githubusercontent.com/romartak/sdrkit/main/get.sh | sudo bash
```

Each installer **pauses the other** automatically (keeps it installed, just stops its services/hotspot) so
there's no clash. The last one you install stays active.

## Switch

**From the panel (secret button):** long-press the logo for **≈1 second**, or **triple-tap** it. A sheet lets
you hand control to the other project. **Admin** role only. The WiFi network changes (e.g. `Proxlafy` → `SDR-Pi`):
reconnect to the new network and open `http://192.168.4.1` (up to a minute).

**From the command line (SSH):**

```bash
sudo proxlafy switch          # hand over to the other project
sudo labswitch sdrkit         # or a specific one
labswitch status              # what's installed and which is active
```

If the other project **isn't installed**, the button (or `sudo labswitch install sdrkit`) **downloads and
installs it from GitHub** (needs internet).

## How it works

Each project has its own systemd services and NetworkManager hotspot connection. Switching disables+stops the
current one (and drops its hotspot), then enables+starts the other. Because it uses `systemctl enable`, the
choice **survives reboots**. The switch runs detached (`systemd-run`) so it finishes even as the current panel
shuts down.
