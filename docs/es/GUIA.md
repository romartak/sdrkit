# SDR-Kit 3.1 · Analizador de espectro, radio y decodificador portátil
### Raspberry Pi Zero 2 W + RTL-SDR + power bank, controlado desde el celular

Inspirado en el **tinySA**, pero con superpoderes. Puedes **ver** el espectro con funciones de analizador de laboratorio: marcadores, mediciones, span cero, trazas, límites y vigilancia 24/7. Puedes **elegir** la frecuencia sin tocar el gráfico, con un sintonizador de botones, deslizador y salto a la siguiente señal activa, y **escucharla** al instante.

También **decodifica**:
- voz digital (DMR, P25, D-Star, Fusion, NXDN, dPMR, M17);
- subtonos, buscapersonas y APRS;
- sensores de 433 MHz;
- aviones.

Y además puede:
- **escanear** servicios completos (PMR, FRS, marina, aviación…);
- **grabar** cada transmisión;
- calcular **antenas**;
- usarse **a distancia**.

Cada parte del panel tiene un botón **ⓘ** que explica para qué sirve y cómo se usa.

```
                       ┌──────────────── Raspberry Pi Zero 2 W ─────────────────┐
  Antena ── RTL-SDR ──►│  Panel :80 → Analizador · Radio · Decodificar           │
     (USB OTG)         │              Grabaciones · Más (Canales, Antenas, WiFi…) │
                       │  Voz digital: DSD-FME (opcional) · multimon-ng · rtl_433 │
                       │  dump1090 (aviones) · OpenWebRX+ :8073 (receptor extra)   │
  Power bank ─────────►│  Hotspot propio o tu WiFi · Tailscale (acceso remoto)     │
                       └───────────────────────────┬─────────────────────────────┘
                                                   │ WiFi
                    ┌──────────────────────────────┼──────────────────────────────┐
             En el campo:                    En casa:                        Desde lejos:
     celular ↔ hotspot «SDR-Pi»     celular y Pi en tu WiFi          celular ↔ Tailscale ↔ Pi
       http://192.168.4.1          http://sdrpi.local                 http://sdrpi
```

---

## 1. Qué es y qué no es (honesto)

| | tinySA Ultra | Analizador de banco | **SDR-Kit 3 (RTL-SDR V4)** |
|---|---|---|---|
| Rango | 0.1–960 MHz (Ultra hasta 6 GHz) | según modelo | **0.5–1766 MHz** (con HackRF: 1–6000 MHz) |
| Marcadores, delta, seguir pico | Sí | Sí | **Sí (4 marcadores)** |
| Máx./mín. retenido, promedio, persistencia | Parcial | Sí | **Sí** |
| Detector pico / RMS / muestra | Sí | Sí | **Sí** |
| Mediciones: potencia de canal, OBW, ACPR, ancho a −3/−6/−20/−26 dB, SNR, contador, armónicos | Parcial | Sí | **Sí** |
| Span cero (pulsos en el tiempo) con disparo | Sí | Sí | **Sí** |
| Línea límite pasa/falla | Sí | Sí | **Sí, + alarma al celular** |
| Vigilancia 24/7 y mapa de ocupación | No | Opcional, caro | **Sí** |
| Normalizar con referencia (medir filtros/antenas con fuente de ruido) | Sí | Sí | **Sí** |
| dBm reales | Calibrado de fábrica | Calibrado | **Calibrable** con una señal conocida (±2–3 dB) |
| **Escuchar lo que ves** | No | No | **Sí** (FM, AM, WFM, USB/LSB y **digital**) |
| **Voz digital DMR/P25/D-Star/Fusion/NXDN/dPMR/M17** | No | No | **Sí** (DSD-FME, opcional) |
| **Identifica señales digitales** por su forma | No | Con software caro | **Sí** |
| **Subtonos CTCSS/DCS, DTMF, buscapersonas, APRS, sensores, aviones** | No | No | **Sí** |
| **Escáner** de servicios completos | No | No | **Sí** |
| Generador de señal / tracking generator | Sí | Opcional | **No**: el RTL-SDR sólo recibe |
| Pantalla | Propia | Propia | Tu celular, tablet o PC |
| Uso a distancia | No | Limitado | **Sí** (WiFi / Tailscale) |

**Lo imposible (con este o con cualquier receptor):**
- Escuchar comunicaciones **cifradas**: policía o militares con AES, ARC4 o TETRA con TEA.
- Escuchar **celulares** (2G/3G/4G/5G), WiFi o Bluetooth cifrados.
- **Transmitir**: el RTL-SDR sólo recibe.
- Medir por encima de 1766 MHz sin un HackRF.

**Límites prácticos de la Pi Zero 2 W:**
- El dongle hace **una cosa a la vez** (analizador, o radio, o sensores, o aviones). El panel lo cambia de modo solo.
- Para dos funciones simultáneas necesitas un segundo dongle.
- 1 o 2 personas escuchando a la vez está bien.

**¿Bluetooth o WiFi?** WiFi. Bluetooth no tiene ancho de banda para la cascada + audio, y el chip es compartido: el kit apaga el Bluetooth para mejorar el WiFi.

---

## 2. Lista de compras

**Imprescindible**

| Pieza | Recomendación | Por qué |
|---|---|---|
| SDR | **RTL-SDR Blog V4** (kit con antenas dipolo) | 0.5–1766 MHz (HF sin accesorios), TCXO estable, bias-tee, carcasa metálica |
| Computadora | Raspberry Pi Zero 2 W | 4 núcleos, suficiente para 1–2 usuarios |
| microSD | 32 GB, clase **A1/A2** (SanDisk/Samsung) | Rápida y fiable |
| Adaptador OTG | micro-USB macho → USB-A hembra, **corto** | La Zero sólo tiene micro-USB |
| Power bank | 10 000–20 000 mAh, **5 V / 2.4 A** o más | Pi + dongle ≈ 2.5–4 W |
| Cable de energía | micro-USB **corto y grueso** | Cables largos o finos = «bajo voltaje» |
| Disipador | Adhesivo de aluminio/cobre | Con voz digital la CPU trabaja más |

**Muy recomendable**
- **Extensión USB corta con ferrita** (15–30 cm) entre la Pi y el dongle: el espectro queda mucho más limpio.
- **Caja ventilada**. Si es metálica, la antena va por fuera.
- **Antena discone** (25–1300 MHz) para el escáner y el analizador, o el kit de dipolos del V4.

**Opcional (para llegar más lejos)**

| Pieza | Para qué |
|---|---|
| **Llave AMBE3000** (ThumbDV, DVstick 30) | Voz DMR, D-Star, Fusion, NXDN y P25 con códec **licenciado** en el receptor avanzado (`AMBE_TTY`) |
| **Segundo RTL-SDR** | Radar de aviones o sensores 24/7 mientras usas el analizador (requiere configuración manual) |
| **HackRF One** | Analizador de 1 MHz a 6 GHz: WiFi, Bluetooth, drones, celular. El panel lo detecta solo |
| **Fuente de ruido** (noise source) | Con «Normalizar»: medir filtros, duplexores y antenas como un analizador escalar |
| **Filtro rechaza-FM** | Si vives cerca de emisoras: evita saturación |
| **LNA** alimentado por bias-tee | Satélites, GPS, ADS-B lejanos |
| **Raspberry Pi 4/5** | Si quieres OpenWebRX+ con varios oyentes y decodificadores pesados (FT8, DAB) a la vez |

**Autonomía estimada:** con 10 000 mAh, **6 a 10 horas**; con 20 000 mAh, 12 a 20 horas.

---

## 3. Montaje físico

1. Pega el disipador sobre el procesador.
2. Conecta el **adaptador OTG al puerto «USB»** (el del centro). El de la esquina, «PWR IN», es sólo para la energía.
3. Une el dongle a la extensión USB y ésta al adaptador OTG. La antena va en el conector SMA del dongle.
4. Conecta el power bank, con el cable corto, al puerto **PWR IN**.

---

## 4. Paso 1 · Grabar la microSD

1. Instala **Raspberry Pi Imager**: <https://www.raspberrypi.com/software/>
2. Elige:
   - Dispositivo: **Raspberry Pi Zero 2 W**.
   - Sistema: **Raspberry Pi OS Lite (64-bit)**, que está en *Raspberry Pi OS (other)*. Se recomienda Trixie; Bookworm también sirve.
3. En **personalizar** (⚙) configura:
   - Nombre del equipo: **`sdrpi`**.
   - Usuario y contraseña.
   - **WiFi de tu casa** y su país.
   - Zona horaria.
   - **SSH activado**.
4. Graba la tarjeta.

---

## 5. Paso 2 · Copiar el kit a la microSD (sólo si NO instalas desde GitHub)

> **Recomendado:** instala desde GitHub con un solo comando (paso 4). Así puedes actualizar después con `sudo sdrkit actualizar`. Si usas GitHub, salta este paso.

1. Vuelve a meter la microSD en la PC. Aparece la unidad **`bootfs`**.
2. Copia la carpeta **`sdrkit`** completa dentro de `bootfs`.
3. Abre `bootfs/sdrkit/sdrkit.conf` con el Bloc de notas y revisa:
   - `WIFI_NETWORKS`: agrega el **hotspot de tu celular**, por ejemplo `"Mi Celular|clave"`.
   - `REGION`: `americas` o `europa`.
   - `RTL_MODEL`: `v4`.
   - `RECEIVER_LAT` / `RECEIVER_LON`: tu ubicación, que será el centro del radar de aviones. Es opcional.
   - `INSTALL_DSD`: déjalo vacío y el instalador te preguntará (ver sección 9).
   - `AMBE_TTY`: sólo si compraste una llave AMBE3000, por ejemplo `"/dev/ttyUSB0"`.
   - `NTFY_TOPIC`: un nombre difícil de adivinar, si quieres avisos de alarmas en el celular con la app gratuita «ntfy».
   - Deja vacías `HOTSPOT_PASSWORD` y `ADMIN_PASSWORD`: el instalador te las pide.
4. Expulsa la microSD.

---

## 6. Paso 3 · Primer encendido y SSH

1. Enciende la Pi con el dongle conectado y espera **2–3 minutos**.
2. Conéctate desde la PC con `ssh romartak@sdrpi.local`, o desde el celular con la app **Termius**.

---

## 7. Paso 4 · Instalar (un solo comando)

**Desde GitHub (recomendado; necesita internet en la Pi):**
```
curl -fsSL https://raw.githubusercontent.com/romartak/sdrkit/main/get.sh | sudo bash
```

**Desde la microSD (si copiaste el kit en el paso 2):**
```
sudo bash /boot/firmware/sdrkit/install.sh
```

Con GitHub, la configuración queda en `/etc/sdrkit/sdrkit.conf` con valores por defecto. Para cambiar la región, las redes WiFi o la ubicación: `sudo sdrkit config`.

1. El instalador te pide:
   - La **clave del hotspot**.
   - La **clave de administrador**.
   - Si quieres **voz digital en el panel (DSD-FME)**. Lee antes el aviso de la sección 9.
2. Después instala solo, en **11 pasos**:
   - Drivers.
   - **OpenWebRX+** con decodificadores (APRS, POCSAG, sensores, ADS-B, ACARS, VDL2, HFDL, radiosondas, M17, FreeDV, DAB, HD Radio…).
   - DSD-FME, si lo aceptaste.
   - El **panel**.
   - El **hotspot automático**.
   - Tailscale.
   - Ajustes de energía.
3. Tarda **20 a 45 minutos**, y unos **30 a 50 más** si compila DSD-FME.
4. Si se corta el SSH, la instalación **sigue sola**. Para ver el progreso: `tail -f /var/log/sdrkit-install.log`.
5. Al terminar, la Pi **se reinicia sola**.
6. Puedes repetir la instalación sin riesgo. Si más adelante quieres DSD-FME: `sudo sdrkit instalar-dsd`.

---

## 8. Paso 5 · Usarlo desde el celular y a distancia

- **En casa:** abre `http://sdrpi.local`. En Android, si no abre, usa la IP de la Pi.
- **En el campo:** conéctate a la WiFi **«SDR-Pi»** y abre **`http://192.168.4.1`**. Si el celular avisa que la red no tiene internet, elige «Mantener conexión».
- **Desde lejos (Tailscale):**
  1. Ejecuta `sudo tailscale up` en la Pi.
  2. Instala la app Tailscale en tu celular.
  3. Abre `http://sdrpi` desde cualquier lugar.
- **En la calle con el hotspot del celular:** en iPhone, activa «Maximizar compatibilidad» (la Pi sólo usa 2.4 GHz).
- **«Agregar a pantalla de inicio»** deja el panel como una app.

> **Apaga siempre desde Más → Sistema → Apagar** antes de desconectar la batería.

### Las 5 pestañas

- **Analizador:** espectro, cascada, sintonizador, marcadores, mediciones, span cero, límites y vigilancia.
- **Radio:** escuchar (también digital), buscar señal, subtonos, datos, grabar, escáner, memorias y modo cazador.
- **Decodificar:** mensajes (POCSAG/FLEX/APRS/EAS), sensores de 433 MHz, radar de aviones y la lista de todos los modos.
- **Grabaciones:** audios por día y el registro de actividad.
- **Más:**
  - **Canales**: todos los servicios.
  - Guía de frecuencias y tonos.
  - **Antenas**.
  - Receptor avanzado.
  - WiFi.
  - Sistema.

Toca **ⓘ** en cualquier tarjeta, o **?** arriba, para ver la explicación de esa parte.

---

## 9. Voz digital: DMR, P25, D-Star, Fusion, NXDN, dPMR y M17

Hay tres niveles.

**1. Identificar (siempre incluido).** Mientras escuchas en FM, el panel analiza la forma de la señal y te dice qué es:

| Lo que detecta | Probablemente es |
|---|---|
| 4FSK a 4800 baudios | DMR, P25 fase 1, Fusion o M17 |
| 4FSK a 2400 baudios | NXDN 6.25 kHz o dPMR |
| GMSK a 4800 baudios | D-Star |
| 2FSK a 1200 o 2400 baudios | POCSAG |
| AFSK 1200 | APRS o packet |

Te ofrece el botón para decodificarla.

**2. Escuchar la voz en el panel (DSD-FME, opcional).**
- **Cómo se usa:**
  1. En el Radio elige el modo **Digital** y el sistema. «Auto» reconoce DMR, P25, D-Star y Fusion; NXDN, dPMR y M17 hay que elegirlos.
  2. Verás el sistema, el **grupo o talkgroup** (destino), el **ID o indicativo** de quien habla y el color code o NAC.
  3. La voz sale por el celular y se puede **grabar**.
- **Comprobado:** una transmisión **M17 real** (voz Codec2, indicativo XE1SDR) se decodificó de punta a punta a través del radio del panel: la Pi recibe, DSD-FME decodifica y la voz llega al celular. En el modo demo está en 433.475 MHz.
- **⚠ Aviso de patentes:**
  - DSD-FME usa **mbelib**, que implementa los códecs AMBE/IMBE. Esos códecs están **patentados**: en algunos países usarlos sin licencia puede infringir patentes.
  - Es software libre pensado para estudio y uso personal. **Tú decides**; por eso el instalador pregunta y no viene activado.
  - Aviso completo: <https://github.com/lwvmobile/mbelib#readme>
- **Lo que DSD-FME no hace en este panel:** no se usa para descifrar nada. Las llamadas cifradas aparecen como «cifrada» y no se oyen.

**3. Camino con licencia.**
1. Consigue una **llave USB AMBE3000** (ThumbDV o DVstick 30).
2. Pon `AMBE_TTY="/dev/ttyUSB0"` en `sdrkit.conf` y reinstala.
3. OpenWebRX+ (Más → Receptor avanzado) decodifica entonces DMR, D-Star, Fusion, NXDN y P25 con el códec oficial.

**Dónde buscar señales digitales:**
- Repetidoras DMR de radioaficionados (430–450 MHz).
- Radios de empresas y seguridad (150–174 y 450–470 MHz).
- dPMR446 y DMR446 (446.0–446.2 MHz).
- M17 (433.475 MHz).
- D-Star y Fusion en 2 m y 70 cm.

Usa **Más → Canales** o el analizador: las señales digitales se ven como bloques de bordes rectos, y en el audio FM suenan a zumbido rítmico.

---

## 10. El analizador

### Sintonizador: elegir sin tocar el gráfico

Está justo debajo de la cascada.

| Control | Qué hace |
|---|---|
| **− / +** | Un paso. **Mantenlo pulsado** y avanza solo, cada vez más rápido |
| **Número grande** | Tócalo y escribe la frecuencia exacta. Si está fuera de la pantalla, la vista viaja a ella |
| **Deslizador** | Recorre todo lo visible, de paso en paso |
| **⏮ Señal / Señal ⏭** | Salta a la señal activa anterior o siguiente. Si no hay más en pantalla, mueve la vista |
| **Chips de señales activas** | Todas las señales que sobresalen del ruido; toca una para ir a ella |
| **Paso** | 12.5 kHz walkies/repetidoras · 25 kHz o 8.33 kHz aviación · 100 kHz FM · 10 kHz AM |
| **Modo** | Auto, FM, FM ancha, WFM, AM, USB, LSB, **Digital** |
| **Señal activa si** | Cuánto debe sobresalir del ruido (+6 dB encuentra hasta las débiles) |
| **🎧 Escuchar esta frecuencia** | Abre el Radio exactamente ahí |

En computadora: **← →** mueven un paso, **Mayús + ← →** saltan de señal en señal y **Enter** escucha.

### Marcadores y mediciones

- **4 marcadores** (M1–M4) con **Δ** (diferencia contra M1) y **⟳ Seguir**. Botones: ▲ Pico, ◀ Pico, Pico ▶ y Sig. pico.
- **Debajo del marcador** verás el ancho ocupado, el tipo de señal probable y la **banda** (ej. «Marina VHF», «ISM 433»).
- **Mediciones:**
  - Potencia de canal.
  - **OBW 99 %**.
  - Ancho a −3/−6/−20/−26 dB.
  - **ACPR** (canales adyacentes).
  - SNR y densidad de ruido.
  - **Contador de frecuencia**.
  - **Armónicos y THD**.
  - **Pulsos** (en span cero).
- Para potencias exactas usa el detector **Promedio**.

### Trazas, unidades y límites

- **Trazas:**
  - Máx., Mín. y Promedio.
  - **Persistencia**, que revela señales intermitentes escondidas.
  - **Referencia + Normalizar**, para comparar o medir filtros con una fuente de ruido.
  - Pausa y **Barrido único**.
  - Exportar imagen y CSV.
- **Unidades:**
  - dBFS (relativo) o, tras **calibrar** con una señal conocida, **dBm, dBµV y dBmV**.
  - **Convertidor:** si usas un up-converter o un LNB, el panel muestra las frecuencias reales.
- **Línea límite:** superior y/o inferior → **PASA / FALLA** con pitido opcional.

### Span cero

Muestra UNA frecuencia en el tiempo, con disparo por nivel. Sirve para ver los bits de un control remoto de 433 MHz, la cadencia de un radar o ráfagas de datos. Mide ancho de pulso, período y ciclo de trabajo.

### Vigilancia 24/7 y ocupación

- La Raspberry sigue barriendo aunque cierres el panel.
- Guarda cuánto se usa cada frecuencia y lo muestra en un **mapa de ocupación** tiempo × frecuencia (exportable a CSV).
- Anota **alarmas** y, con `NTFY_TOPIC`, te **avisa al celular**.

### Configuraciones guardadas

Guarda banda, unidades, mediciones y límites para volver a ellos con un toque.

Notas técnicas:
- El barrido usa saltos solapados para que ninguna señal quede oculta en el centro de sintonía.
- **Ganancia:** empieza con 29.7 dB. Si ves picos por todas partes, bájala.

---

## 11. El Radio

- **Frecuencia y pasos:**
  - Toca el número para escribirlo.
  - **− / +** mueven un paso. Mantenlos pulsados y avanzan solos.
  - **⏮ / ⏭ Buscar señal** funciona como el «seek» de un autorradio: va a la próxima frecuencia con actividad.
- **Modos:**
  - FM: walkies y repetidoras.
  - FM ancha: canales de 25 kHz.
  - WFM: emisoras comerciales.
  - AM: aviación, onda media, CB.
  - USB/LSB: radioafición en HF.
  - **Digital**: ver la sección 9.
- **Squelch:** «Auto» silencia el ruido y abre cuando alguien habla.
- **Panorama:** ±96 kHz alrededor de la frecuencia; tócalo para saltar.
- **Subtonos:** **CTCSS** (ej. `88.5 Hz`), **DCS** (ej. `D023N ≡ D047I`) y **DTMF** (ej. `*123#`). Es lo que configurarías en un walkie para ese grupo.
- **Datos digitales en esta frecuencia:** POCSAG, FLEX, APRS, EAS, Selcall, Morse y FMS. Funcionan aunque nadie escuche.
- **Grabar:**
  - Manual, o **automático por transmisión** (un archivo cada vez que alguien habla, aunque cierres el celular).
  - Se guarda en `/var/lib/sdrkit/grabaciones/AAAA-MM-DD/`.
- **Repetición instantánea «⏪ ¿Qué dijo?»:** repite los últimos 30 s de lo que se oyó (sólo con el squelch abierto), aunque
  no estuvieras grabando. **💾 Guardar** lo deja como una grabación más. Vive en la memoria RAM: no escribe en la microSD
  hasta que lo guardas. Se ajusta con `REPLAY_SEC` (0 = apagada).
- **Escáner:**
  - **Memorias**, **Servicio** (PMR, FRS, marina, aviación… con un toque) o **Rango**.
  - Revisa ~22 canales cercanos en ~40 ms.
  - Se detiene cuando alguien habla y sigue al terminar.
- **Memorias:** favoritas por grupos, con exportar e importar.
- **Modo cazador 🎯:** pitido que sube de tono al acercarte a un transmisor. Úsalo con una antena Yagi.

---

## 12. Escuchar todo: Más → Canales

Planes de canales completos. Toca un canal para escucharlo, o **Escanear** para recorrer el servicio entero:

| Servicio | Canales / rango |
|---|---|
| PMR446 (Europa) | 16 canales analógicos |
| dPMR446 / DMR446 | 32 canales digitales |
| FRS / GMRS (América) | 22 canales + entradas de repetidoras |
| MURS (EE. UU.) | 5 canales |
| LPD433 | 69 canales |
| CB 27 MHz | 40 canales (AM en América) |
| Marina VHF internacional | todos los canales (dúplex en la frecuencia costera) |
| AIS / DSC | datos de barcos |
| Aviación civil VHF | frecuencias clave + toda la banda 118–137 |
| Aviación militar UHF | 243.0 + banda 225–400 |
| NOAA Weather Radio | 7 canales |
| Radioaficionados 2 m y 70 cm | llamada, APRS, ISS, DMR, M17 + bandas completas |
| Satélites | NOAA APT, Meteor LRPT, ISS, SO-50 |
| Ferrocarril AAR | 91 canales |
| VHF y UHF de servicios | 148–174 y 450–470 MHz |
| Trunking 800 MHz | P25 |
| Buscapersonas | 929–932 MHz y VHF |
| FM y AM comercial, onda corta | bandas completas |

«★ Guardar como grupo» los pasa a tus memorias.

---

## 13. Decodificar

- **Mensajes (multimon-ng):**
  - Buscapersonas **POCSAG/FLEX**: hospitales, técnicos, alarmas.
  - **APRS**: posiciones, clima, mensajes. Las estaciones con posición aparecen en el radar.
  - **EAS**: alertas NOAA.
  - Selcall, Morse y FMS.
  - Exporta a CSV.
- **Sensores (rtl_433, +200 modelos):**
  - Estaciones meteorológicas y termómetros.
  - **Presión de llantas TPMS**.
  - Timbres, sensores de puertas y medidores.
- **Aviones (dump1090):** radar **sin internet** con vuelo, altitud, velocidad, rumbo y distancia. Las **emergencias** (squawk 7700/7600/7500) aparecen en rojo. Antena: vertical de 6.9 cm, lo más alta posible.
- **Todos los modos:** lista de todo lo que el equipo decodifica y si quedó instalado. Los de OpenWebRX+ se abren con un toque:
  - RDS, AIS, ACARS, VDL2, HFDL y UAT 978.
  - Radiosondas y LoRa/Meshtastic.
  - FT8 (opcional, `INSTALL_WSJTX`), SSTV, FAX, NAVTEX, RTTY y PSK31.
  - DRM, DAB+ y HD Radio.

---

## 14. Receptor avanzado (OpenWebRX+)

Se abre desde **Más → Receptor avanzado**: cascada grande y decenas de decodificadores. Trae perfiles listos:
- FM comercial con RDS.
- Aviación.
- Radioaficionados 2 m.
- Marina.
- ISM 433 y 70 cm.
- FRS/GMRS o PMR446.
- ADS-B.
- Con el V4: AM, onda corta y CB.

**Ajustes:** `http://IP:8073/settings`, usuario **admin**.

---

## 15. Antenas

**Más → Antenas** calcula medidas y dibuja la antena para tu frecuencia:
- Dipolo.
- Vertical con plano de tierra.
- J-pole.
- Yagi de 3 elementos.
- V-dipolo para satélites.
- Discone.
- Látigo.

También calcula la **pérdida del cable** y trae una tabla de qué antena usar para qué.

Dipolo del kit: cada brazo mide ≈ `71 / MHz` metros.
- FM: 71 cm.
- Aviación: 57 cm.
- 2 m / marina: 46–49 cm.
- 433 MHz: 16.5 cm.
- 446–462 MHz: 15.5 cm.
- ADS-B: 6.5 cm.

---

## 16. Actualizar el proyecto

Cuando haya una versión nueva en GitHub (porque mejoraste algo o salió una actualización):

1. Conecta la Raspberry a **internet**: el WiFi de casa o el hotspot de tu celular.
2. Por SSH ejecuta `sudo sdrkit actualizar`. También puedes usar el panel: **Más → Sistema → 🔎 Buscar actualizaciones → ⬇ Actualizar ahora**.

Qué hace:
- Muestra la versión nueva y la lista de cambios, y pide confirmación.
- Guarda una copia de la versión actual.
- Instala sólo el panel, en unos segundos. Si la versión nueva necesita paquetes nuevos (`INSTALL_REV`), hace la instalación completa y reinicia.
- **No toca** tu configuración, grabaciones, memorias ni registros. Las opciones nuevas se agregan solas a `sdrkit.conf`.
- Comprueba que el panel arranca. **Si no arranca, vuelve sola a la versión anterior.**

Otros comandos:
- `sudo sdrkit volver`: regresa a la versión anterior (y otra vez `volver` para ir a la nueva).
- `sdrkit actualizar --buscar`: sólo dice si hay algo nuevo.
- `sdrkit version`: versión y commit instalados.

**Si instalaste desde la microSD:** la primera vez que ejecutes `sudo sdrkit actualizar` descarga el proyecto desde GitHub. Necesitas haber puesto `SDRKIT_REPO` con `sudo sdrkit config`.

---

## 17. Comandos útiles (por SSH)

| Comando | Para qué |
|---|---|
| `sdrkit estado` | Servicios, red, IPs, SDR, energía |
| `sudo sdrkit actualizar` | Trae la última versión de GitHub |
| `sudo sdrkit volver` | Regresa a la versión anterior |
| `sudo sdrkit config` | Edita la configuración y la aplica |
| `sdrkit decodificadores` | Qué decodificadores quedaron instalados |
| `sudo sdrkit instalar-dsd` | Instala DSD-FME (voz digital en el panel) después |
| `sudo sdrkit hotspot` / `sudo sdrkit auto` | Forzar hotspot / volver a automático |
| `sudo sdrkit wifi "Red" "clave"` | Guardar una red WiFi |
| `sudo sdrkit clave` / `clave-hotspot` | Cambiar claves |
| `sdrkit diagnóstico` | Revisión completa con ✔/✖ y qué hacer si algo falla |
| `sudo sdrkit copia [archivo]` / `restaurar archivo` | Guardar / recuperar tu configuración y memorias (sin grabaciones) |
| `sudo sdrkit probar-sdr` | Probar el dongle |
| `sdrkit grabaciones` | Dónde están las grabaciones |
| `sdrkit logs` | Registros en vivo |

Configuración: `/etc/sdrkit/sdrkit.conf`. Después de editarla: `sudo sdrkit reiniciar`.

---

## 18. Solución de problemas

| Síntoma | Solución |
|---|---|
| No aparece «SDR-Pi» | Espera 1–2 min; en casa la Pi está en tu WiFi (`http://sdrpi.local`). `sudo sdrkit hotspot` |
| No abre la página | `http://192.168.4.1` (no https); apaga los datos móviles un momento |
| «No se detecta ningún RTL-SDR» | OTG en el puerto **USB**, no PWR. `lsusb` debe mostrar `0bda:2838` |
| ⚡ Bajo voltaje | Cable más corto/grueso, power bank de 2.4 A |
| Picos por todas partes | Baja la ganancia, aleja el dongle con la extensión, usa un filtro FM |
| «DSD-FME no está instalado» | `sudo sdrkit instalar-dsd` |
| Modo Digital sin voz | Prueba otro sistema (NXDN, dPMR y M17 no se autodetectan). Revisa que la señal pase el squelch. Si dice «cifrada», no se puede |
| No llegan mensajes POCSAG/APRS | Frecuencia exacta, modo FM, squelch abierto o bajo; la señal debe ser fuerte |
| Radar sin aviones | Antena vertical para 1090 MHz, alta y despejada; espera 1 min |
| No suena en el iPhone | Pulsa «▶ Escuchar», quita el modo silencio |
| Olvidé la clave | `sudo sdrkit clave` |
| «Sin internet» al actualizar | Conecta la Pi al WiFi de casa o al hotspot del celular |
| La actualización dejó algo raro | `sudo sdrkit volver` |

---

## 19. Probar el panel en tu PC (sin hardware)

```
python3 sdrkit/files/sdrkit_server.py --demo --port 8080
```

Abre `http://localhost:8080`. El SDR simulado incluye:

| Señal | Frecuencia |
|---|---|
| Walkies con subtono 88.5 Hz | 462.5625 MHz |
| Walkies con DCS 023 | 462.6125 MHz |
| Walkies con DTMF | 146.52 MHz |
| Aviación AM | 118.7 MHz |
| FM comercial | 98.1 MHz |
| Buscapersonas **POCSAG reales** | 152.84 MHz |
| **APRS real** | 144.39 MHz |
| Señal tipo **DMR** | 443.45 MHz |
| Señal tipo **NXDN** | 451.0125 MHz |
| **M17 real** (con DSD-FME instalado) | 433.475 MHz |
| Control remoto OOK | 433.92 MHz |

Además simula sensores y aviones.

---

## 20. Seguridad y legalidad

- El RTL-SDR **sólo recibe**: no transmite ni interfiere.
- Escuchar suele ser legal, pero **interceptar, grabar o divulgar comunicaciones privadas** (buscapersonas médicos, telefonía, seguridad) puede estar prohibido. Infórmate de la ley de tu país.
- Las comunicaciones **cifradas** no se pueden ni se deben intentar descifrar. El panel no lo hace.
- Códecs AMBE/IMBE: lee el aviso de la sección 9.
- Conocer el subtono no da permiso para transmitir. Para hablar necesitas un radio homologado y, según la banda, una licencia.
- No abras puertos del router hacia la Pi: usa Tailscale.

---

## 21. Ideas para crecer

- **HackRF One:** analizador de 1 MHz a 6 GHz.
- **Segundo dongle:** radar de aviones o sensores 24/7 en paralelo.
- **Discone en el techo + Tailscale:** estación de escucha remota con vigilancia 24/7 y avisos al celular.
- **Meteor-M (137 MHz):** imágenes del clima con SatDump en una Pi 4/5.
- **Pantalla OLED** con la IP y el modo.

---

### Qué instala el kit (para curiosos)

| Pieza | Dónde |
|---|---|
| Panel + analizador | `/opt/sdrkit/sdrkit_server.py` → servicio `sdrkit` (puerto 80) |
| Radio, subtonos, voz digital, escáner, grabación | `/opt/sdrkit/sdrkit_radio.py` |
| Decodificadores (multimon-ng, rtl_433, dump1090, DSD-FME, identificador digital) | `/opt/sdrkit/sdrkit_decoders.py` |
| DSD-FME + mbelib (opcional) | `/usr/local/bin/dsd-fme` (compilado desde el código fuente) |
| Datos | `/var/lib/sdrkit/` (grabaciones, memorias, actividad, mensajes, sensores, ocupación, alarmas) |
| Vigilante WiFi/hotspot | servicio `sdrkit-netwatch` |
| Receptor avanzado | OpenWebRX+ (repositorio de luarvique) → servicio `openwebrx` (puerto 8073) |
| Llave AMBE (opcional) | `/etc/codecserver/codecserver.conf` |
| Configuración | `/etc/sdrkit/sdrkit.conf` |
