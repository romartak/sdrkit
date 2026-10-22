/* SDR-Kit · English catalog: server (Spanish source → English). See i18n.js.
 *
 * Text produced by the Python backend (sdrkit_server.py, sdrkit_radio.py, sdrkit_decoders.py)
 * and by sdrkit-update.sh that reaches the panel: API errors shown as toasts, the analyzer status
 * line, mode-change messages, radio notes/errors, decoder catalog, digital-signal guesses, default
 * memories, WiFi and update messages. The Python keeps its Spanish text; the panel shows it as-is
 * and this catalog translates it (exact strings + anchored patterns for composed messages).
 *
 * Exact entries are added "softly": if another catalog (loaded earlier) already translates the same
 * Spanish string, its wording wins, so shared msgids stay consistent across the panel.
 */
"use strict";
(() => {
  const live = typeof I18N.lookup === "function";   // false inside tests/i18n_check.mjs
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  // English for a server sub-string, or null when there is none
  const tr = (s) => (live ? I18N.lookup(norm(s)) : null);
  const or = (s) => { const r = tr(s); return r === null ? s : r; };
  let debug = false;
  try {
    debug = new URLSearchParams(location.search).get("i18n") === "debug" || localStorage.getItem("sdrkit.i18nDebug") === "1";
  } catch (e) { /* storage blocked */ }
  const SPANISH = /[áéíóúñ¿¡]|\b(el|la|los|las|del|que|para|con|una|sin|por|más|está|hay|toca|elige|señal|aquí|también|puede|activa|escuchar|grabar|buscar|guardar|abrir|cerrar|apagado|encendido|nada|todavía)\b/i;
  // fallbacks that keep the text unchanged still report it in I18N.missing (debug mode)
  const keep = (m) => { if (debug && live && I18N.missing && SPANISH.test(m)) I18N.missing.add(norm(m)); return m; };

  function addSoft(obj) {
    if (!live || I18N.lang === "es") { I18N.add(obj); return; }
    const out = {};
    for (const k in obj) {
      if (I18N.lookup(norm(k)) !== null) continue;       // another catalog already has it
      out[k] = obj[k];
      if (I18N.missing) I18N.missing.delete(norm(k));
    }
    I18N.add(out);
  }

  addSoft({
    // ---------------------------------------------------------------- dongle / analyzer (SdrError, status line)
    "No se encontró librtlsdr (instala el paquete rtl-sdr).": "librtlsdr not found (install the rtl-sdr package).",
    "No se detecta ningún RTL-SDR. Revisa el adaptador OTG (puerto USB, no PWR) y la energía.":
      "No RTL-SDR detected. Check the OTG adapter (USB port, not PWR) and the power supply.",
    "El RTL-SDR no aceptó la frecuencia de muestreo.": "The RTL-SDR rejected the sample rate.",
    "Lectura incompleta del SDR.": "Incomplete read from the SDR.",
    "Falta numpy (sudo apt install python3-numpy).": "numpy is missing (sudo apt install python3-numpy).",
    "No está instalado hackrf_sweep (sudo apt install hackrf).": "hackrf_sweep is not installed (sudo apt install hackrf).",
    "No está instalado rtl_power (sudo apt install rtl-sdr).": "rtl_power is not installed (sudo apt install rtl-sdr).",
    "el proceso terminó": "the process exited",
    "Analizador en pausa (dongle liberado).": "Analyzer paused (dongle released).",
    "Span cero: esperando una señal por encima del nivel de disparo…": "Zero span: waiting for a signal above the trigger level…",
    "Calibración fuera de rango.": "Calibration out of range.",
    "Simulador (modo demo)": "Simulator (demo mode)",
    "desconocido": "unknown",
    "no encontrado": "not found",
    "tiempo agotado": "timed out",

    // ---------------------------------------------------------------- mode switching (/api/status mode_msg, /api/mode)
    "Liberando el dongle…": "Releasing the dongle…",
    "Iniciando receptor OpenWebRX+…": "Starting the OpenWebRX+ receiver…",
    "Modo inválido.": "Invalid mode.",
    "OpenWebRX+ no está instalado.": "OpenWebRX+ is not installed.",
    "Ya hay un cambio de modo en curso.": "A mode change is already in progress.",

    // ---------------------------------------------------------------- radio, scanner, memories, recordings
    "FM ancha": "Wide FM",
    "Frecuencia inválida.": "Invalid frequency.",
    "No se pudo empezar a grabar (¿poco espacio en la microSD?).": "Could not start recording (low space on the microSD?).",
    "No se pudo guardar (¿poco espacio en la microSD?).": "Could not save (low space on the microSD?).",
    "Todavía no hay nada que repetir: se guarda lo que se oye con el squelch abierto.":
      "Nothing to replay yet: the radio keeps what you hear while the squelch is open.",
    "No hay canales para escanear.": "No channels to scan.",
    "Demasiados canales (máx. 4000).": "Too many channels (max. 4000).",
    "Rango inválido (paso mínimo 1 kHz).": "Invalid range (minimum step 1 kHz).",
    "Demasiados canales: usa un paso mayor o un rango menor.": "Too many channels: use a larger step or a smaller range.",
    "No hay señales por encima del squelch en ese tramo. Baja el squelch o prueba más lejos.":
      "No signals above the squelch in that range. Lower the squelch or search further.",
    "Archivo de memorias inválido.": "Invalid memories file.",
    "No hay grabaciones.": "No recordings.",
    // default memories (sdrkit_radio.default_memories): groups and names
    "Favoritos": "Favorites",
    "Marina VHF": "Marine VHF",
    "Aviación": "Airband",
    "Radioaficionados": "Ham radio",
    "Clima NOAA (EE. UU./Canadá)": "NOAA weather (US/Canada)",
    "Radio FM": "FM radio",
    "Canal 16 socorro": "Channel 16 distress",
    "Canal 06 seguridad": "Channel 06 safety",
    "Canal 09 llamada": "Channel 09 calling",
    "Canal 13 puente": "Channel 13 bridge-to-bridge",
    "Emergencia 121.5": "Emergency 121.5",
    "Aire-aire 123.45": "Air-to-air 123.45",
    "Planeadores/ultraligeros 122.75": "Gliders/ultralights 122.75",
    "Estación Espacial ISS (voz)": "ISS space station (voice)",
    "Canal 9 emergencia": "Channel 9 emergency",
    "Canal 19 carretera": "Channel 19 highway",
    "Ejemplo FM 98.1": "FM example 98.1",

    // ---------------------------------------------------------------- digital signals (classify_digital guesses, DSD-FME)
    "4FSK 4800 baudios: DMR, P25 fase 1, Yaesu Fusion (C4FM) o M17": "4FSK 4800 baud: DMR, P25 phase 1, Yaesu Fusion (C4FM) or M17",
    "4FSK 2400 baudios: NXDN 6.25 kHz o dPMR": "4FSK 2400 baud: NXDN 6.25 kHz or dPMR",
    "4FSK 6000: P25 fase 2 (TDMA)": "4FSK 6000: P25 phase 2 (TDMA)",
    "GMSK 4800: D-Star (o datos 4800)": "GMSK 4800: D-Star (or 4800 data)",
    "GMSK 9600: AIS, packet 9600 o datos": "GMSK 9600: AIS, packet 9600 or data",
    "2FSK 2400: POCSAG 2400 / datos": "2FSK 2400: POCSAG 2400 / data",
    "2FSK 1200: POCSAG 1200 / datos": "2FSK 1200: POCSAG 1200 / data",
    "2FSK 1600: FLEX (buscapersonas)": "2FSK 1600: FLEX (pagers)",
    "Automático: DMR, P25 fase 1, D-Star, YSF, X2-TDMA": "Automatic: DMR, P25 phase 1, D-Star, YSF, X2-TDMA",
    "P25 fase 1 (APCO-25)": "P25 phase 1 (APCO-25)",
    "M17 (radioafición, códec abierto)": "M17 (ham radio, open codec)",
    "DSD-FME no está instalado. Actívalo con INSTALL_DSD=\"si\" en sdrkit.conf y vuelve a ejecutar el instalador (lee el aviso de patentes en la guía).":
      "DSD-FME is not installed. Enable it with INSTALL_DSD=\"si\" in sdrkit.conf and run the installer again (read the patent notice in the guide).",

    // ---------------------------------------------------------------- data decoders (multimon-ng, rtl_433, dump1090)
    "Buscapersonas POCSAG": "POCSAG pagers",
    "Buscapersonas FLEX": "FLEX pagers",
    "Alertas EAS (EE. UU.)": "EAS alerts (US)",
    "FMS / FSK de servicios": "FMS / services FSK",
    "multimon-ng no está instalado (sudo apt install multimon-ng).": "multimon-ng is not installed (sudo apt install multimon-ng).",
    "(solo tono)": "(tone only)",
    "rtl_433 no está instalado (sudo apt install rtl-433).": "rtl_433 is not installed (sudo apt install rtl-433).",
    "dump1090 no está instalado (sudo apt install dump1090-fa-minimal).": "dump1090 is not installed (sudo apt install dump1090-fa-minimal).",
    "¿El dongle está conectado?": "Is the dongle connected?",
    "Coordenadas inválidas.": "Invalid coordinates.",
    // decoder catalog (/api/decoders): names
    "Buscapersonas POCSAG / FLEX": "POCSAG / FLEX pagers",
    "Alertas de emergencia EAS": "EAS emergency alerts",
    "Subtono CTCSS / DCS y DTMF": "CTCSS / DCS tones and DTMF",
    "Voz digital en el panel: DMR · P25 · D-Star · Fusion · NXDN · dPMR · M17": "Digital voice in the panel: DMR · P25 · D-Star · Fusion · NXDN · dPMR · M17",
    "Identificador automático de señales digitales": "Automatic digital signal identifier",
    "Sensores ISM (rtl_433): clima, llantas TPMS, timbres…": "ISM sensors (rtl_433): weather, TPMS tires, doorbells…",
    "Aviones ADS-B (radar sin internet)": "ADS-B aircraft (offline radar)",
    "Voz digital DMR · D-Star · YSF · NXDN · P25": "Digital voice DMR · D-Star · YSF · NXDN · P25",
    "Voz digital M17": "M17 digital voice",
    "Voz digital FreeDV (HF)": "FreeDV digital voice (HF)",
    "TETRA (sin cifrar)": "TETRA (unencrypted)",
    "Radio digital DAB+ (Europa)": "DAB+ digital radio (Europe)",
    "HD Radio (EE. UU.)": "HD Radio (US)",
    "DRM (onda corta digital)": "DRM (digital shortwave)",
    "RDS de emisoras FM": "RDS from FM stations",
    "Barcos AIS": "AIS ships",
    "Barcos AIS (mapa sin internet)": "AIS ships (offline map)",
    "Decodificar → Barcos": "Decode → Ships",
    "Falta un decodificador AIS (sudo apt install rtl-ais, o instala AIS-catcher).": "No AIS decoder installed (sudo apt install rtl-ais, or install AIS-catcher).",
    "Aviación ACARS / VDL2 / HFDL": "Airband ACARS / VDL2 / HFDL",
    "UAT 978 MHz (EE. UU.)": "UAT 978 MHz (US)",
    "Radiosondas meteorológicas": "Weather radiosondes",
    "Satélites Meteor-M (imágenes)": "Meteor-M satellites (images)",
    // decoder catalog: notes
    "Radio → Mensajes": "Radio → Messages",
    "Radio → Mensajes · también en el receptor avanzado": "Radio → Messages · also in the advanced receiver",
    "NOAA Weather Radio (EE. UU.)": "NOAA Weather Radio (US)",
    "también CW Decoder/Skimmer en el receptor avanzado": "also CW Decoder/Skimmer in the advanced receiver",
    "integrado en el Radio": "built into the Radio",
    "Radio → modo «Digital» (opcional: INSTALL_DSD)": "Radio → “Digital” mode (optional: INSTALL_DSD)",
    "Radio: avisa qué tipo de señal es": "Radio: tells you what kind of signal it is",
    "Decodificar → Sensores": "Decode → Sensors",
    "Decodificar → Aviones": "Decode → Aircraft",
    "requiere códec AMBE (llave USB AMBE3000)": "requires the AMBE codec (AMBE3000 USB stick)",
    "códec abierto": "open codec",
    "exigente para la Zero 2 W": "demanding for the Zero 2 W",
    "integrado en OpenWebRX+": "built into OpenWebRX+",
    "integrados en OpenWebRX+": "built into OpenWebRX+",
    "requiere WSJT-X (opcional, pesado)": "requires WSJT-X (optional, heavy)",
    "requiere JS8Call (opcional, pesado)": "requires JS8Call (optional, heavy)",
    "requiere SatDump (no incluido)": "requires SatDump (not included)",

    // ---------------------------------------------------------------- WiFi
    "Red de demostración": "Demo network",
    "abierta": "open",
    "En modo hotspot la Raspberry no puede buscar redes. Escribe el nombre de la red a mano.":
      "In hotspot mode the Raspberry can't scan for networks. Type the network name by hand.",
    "Nombre de red inválido.": "Invalid network name.",
    "La clave WiFi debe tener entre 8 y 63 caracteres.": "The WiFi password must be 8 to 63 characters long.",
    "Conexión inválida.": "Invalid connection.",

    // ---------------------------------------------------------------- updates (App.update_*, sdrkit-update.sh --buscar --json)
    "Falta el actualizador: reinstala el kit.": "The updater is missing: reinstall the kit.",
    "sin respuesta": "no response",
    "Ya hay una actualización en curso.": "An update is already in progress.",
    "Sin internet. Conecta la Raspberry a tu WiFi de casa (o al hotspot de tu celular) y vuelve a intentarlo.":
      "No internet. Connect the Raspberry to your home WiFi (or your phone's hotspot) and try again.",
    "Falta git: sudo apt install git": "git is missing: sudo apt install git",
    "Para buscar actualizaciones usa: sudo sdrkit actualizar --buscar": "To check for updates use: sudo sdrkit actualizar --buscar",
    "Usa: sudo sdrkit actualizar": "Use: sudo sdrkit actualizar",
    "Usa: sudo sdrkit volver": "Use: sudo sdrkit volver",
    "No hay una versión anterior guardada.": "No previous version saved.",
    "No se pudo preparar la versión nueva.": "Could not prepare the new version.",
    "Modo demo: aquí verías el avance de la actualización.": "Demo mode: the update progress would appear here.",
    "Modo demo: aquí verías los registros del sistema.": "Demo mode: the system logs would appear here.",
  });

  I18N.addPatterns([
    // ---------------------------------------------------------------- dongle / analyzer
    [/^El dongle no puede sintonizar (\S+) MHz\.$/, "The dongle can't tune to $1 MHz."],
    [/^No se pudo abrir el RTL-SDR \(código (-?\d+)\)\. Puede estar en uso por el receptor OpenWebRX u otro programa\.$/,
      "Could not open the RTL-SDR (code $1). It may be in use by the OpenWebRX receiver or another program."],
    [/^Error leyendo el RTL-SDR \((-?\d+)\)\. ¿Se desconectó o le falta energía\?$/,
      "Error reading the RTL-SDR ($1). Was it unplugged, or is it short on power?"],
    [/^(rtl_power|hackrf_sweep) se detuvo: (.*)$/, (m, d, e) => d + " stopped: " + or(e)],
    [/^Error interno del analizador: (.*)$/, "Internal analyzer error: $1"],
    [/^Analizador activo: (.+) \(sintonizador (.+)\)$/, (m, d, t) => "Analyzer running: " + or(d) + " (tuner " + or(t) + ")"],
    [/^Analizador activo con (.+)$/, "Analyzer running with $1"],
    [/^⚠ Alarma: (\S+) MHz a (\S+) dB \(límite (\S+) dB\)$/, "⚠ Alarm: $1 MHz at $2 dB (limit $3 dB)"],
    [/^SDR-Kit: señal en (\S+) MHz \((\S+) dB\)$/, "SDR-Kit: signal at $1 MHz ($2 dB)"],   // ntfy alert text
    [/^(\S+): no encontrado$/, "$1: not found"],

    // ---------------------------------------------------------------- radio and scanner
    [/^Error interno del radio: (.*)$/, "Internal radio error: $1"],
    [/^Señal encontrada en (\S+) MHz \((\S+) dB\)\.$/, "Signal found at $1 MHz ($2 dB)."],
    [/^Canal (\d+[A-Z]?)$/, "Channel $1"],                                      // default memories
    [/^(2 m|70 cm) llamada (\S+)$/, "$1 calling $2"],
    // a memory line "121.5000 MHz · AM · Aviación" when the group is shown untranslated
    [/^(\d+\.\d+) MHz · ([^·]+?) · (.+)$/, (m, f, mod, g) => {
      const tm = tr(mod), tg = tr(g);
      return tm === null && tg === null ? keep(m) : f + " MHz · " + (tm === null ? mod : tm) + " · " + (tg === null ? g : tg);
    }],

    // ---------------------------------------------------------------- digital signals and decoders
    [/^(\d)-FSK (\d+) baudios \(datos\)$/, "$1-FSK $2 baud (data)"],
    [/^(\d)FSK (\d+) baudios$/, "$1FSK $2 baud"],                              // the guess before the colon
    [/^No se pudo iniciar (multimon-ng|dsd-fme): (.*)$/, "Could not start $1: $2"],
    [/^(rtl_433|dump1090) se detuvo\. (.*)$/, (m, p, e) => p + " stopped. " + or(e)],
    [/^El decodificador AIS se detuvo\. (.*)$/, (m, e) => "The AIS decoder stopped. " + or(e)],
    [/^(RIC|Capcode) (\S+) · \(solo tono\)$/, "$1 $2 · (tone only)"],
    // decoder catalog note + " · falta: binaries" (decode.js)
    [/^(?:(.*?) )?· falta: (.+)$/, (m, note, bins) => (note ? or(note) + " · " : "") + "missing: " + bins],

    // ---------------------------------------------------------------- WiFi and updates
    [/^(\d+% · )abierta$/, "$1open"],                                          // scan list: "80% · abierta"
    [/^nmcli: (.+)$/, (m, e) => { const r = tr(e); return r === null ? m : "nmcli: " + r; }],
    [/^No se pudo iniciar la actualización: (.*)$/, (m, e) => "Could not start the update: " + or(e)],
    [/^No se pudo descargar (.+) \(¿existe y es público\?\)\.$/, "Could not download $1 (does it exist and is it public?)."],
    [/^No se pudo consultar GitHub \((.+), rama (.+)\)\.$/, "Could not reach GitHub ($1, branch $2)."],

    // ---------------------------------------------------------------- fallbacks for server text inside composed lines
    // demo names that the panel embeds in sentences ("📶 Red de demostración", "En vivo · Simulador (modo demo)")
    [/^(.*)Red de demostración(.*)$/, "$1Demo network$2"],
    [/^(.*)Simulador \(modo demo\)(.*)$/, "$1Simulator (demo mode)$2"],
    // "… · ⚠ <server error>"
    [/^(.+) · ⚠ (.+)$/, (m, a, e) => {
      const r = tr(e);
      return r === null ? keep(m) : or(a) + " · ⚠ " + r;
    }],
    // "⚠ <server error>", "📵 <update error>", "📶 <ssid>": the symbols the panel puts before server text
    [/^(⚠️?|📵|📶|✖|❌) (.+)$/u, (m, sym, rest) => {
      const r = tr(rest);
      return r === null ? keep(m) : sym + " " + r;
    }],
  ]);
})();
