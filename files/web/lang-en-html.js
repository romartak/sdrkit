/* SDR-Kit · English catalog: html (Spanish source → English). See i18n.js.
 * Every static text, <option>, title / placeholder / aria-label of index.html,
 * plus whole rich elements (text mixed with inline tags) in addHtml. */
"use strict";
I18N.add({
  // ---------------------------------------------------------------- header / tab bar / dialogs
  "⚡ Bajo voltaje": "⚡ Undervoltage",
  "Conectando…": "Connecting…",
  "Analizador": "Analyzer",
  "Radio": "Radio",
  "Decodificar": "Decode",
  "Grabaciones": "Recordings",
  "Más": "More",
  "Secciones": "Sections",
  "Ayuda": "Help",
  "Cerrar": "Close",
  "Cancelar": "Cancel",
  "Un momento…": "One moment…",

  // ---------------------------------------------------------------- analyzer: readout + scope
  "Analizador de espectro": "Spectrum analyzer",
  "Inicio": "Start",
  "Centro": "Center",
  "Fin": "Stop",
  "Barrido": "Sweep",
  "Ganancia": "Gain",
  "Pico": "Peak",
  "Espectro": "Spectrum",
  "Cascada": "Waterfall",
  "El dongle lo está usando otro modo.": "Another mode is using the dongle.",
  "Usar el analizador": "Use the analyzer",
  "En vivo": "Live",
  "Máx. retenido": "Max hold",
  "Mín. retenido": "Min hold",
  "Promedio": "Average",
  "Referencia": "Reference",
  "Límite": "Limit",

  // ---------------------------------------------------------------- analyzer: tuner
  "Sintonizador": "Tuner",
  "· elige sin tocar el gráfico": "· pick without touching the chart",
  "Bajar un paso": "Step down",
  "Subir un paso": "Step up",
  "Frecuencia en MHz": "Frequency in MHz",
  "Deslizar por el espectro": "Slide across the spectrum",
  "Señal activa anterior": "Previous active signal",
  "Señal activa siguiente": "Next active signal",
  "⏮ Señal": "⏮ Signal",
  "Señal ⏭": "Signal ⏭",
  "Desliza o usa los botones": "Slide or use the buttons",
  "Paso": "Step",
  "8.33 kHz (aviación)": "8.33 kHz (airband)",
  "9 kHz (AM Europa)": "9 kHz (AM Europe)",
  "Modo": "Mode",
  "FM ancha": "Wide FM",
  "Señal activa si": "Active signal if",
  "🎧 Escuchar esta frecuencia": "🎧 Listen to this frequency",

  // ---------------------------------------------------------------- analyzer: marker bar + zoom
  "Toca el espectro para poner un marcador": "Tap the spectrum to place a marker",
  "Marcador al pico más alto": "Marker to the highest peak",
  "Pico a la izquierda": "Peak to the left",
  "Pico a la derecha": "Peak to the right",
  "Siguiente pico más alto": "Next highest peak",
  "El marcador sigue a la señal": "The marker follows the signal",
  "Diferencia contra M1": "Difference from M1",
  "Ver esta frecuencia en el tiempo": "View this frequency over time",
  "Guardar en memorias": "Save to memories",
  "Escuchar en el radio": "Listen on the radio",
  "▲ Pico": "▲ Peak",
  "◀ Pico": "◀ Peak",
  "Pico ▶": "Peak ▶",
  "Sig. pico": "Next peak",
  "⟳ Seguir": "⟳ Track",
  "⏱ Span cero": "⏱ Zero span",
  "🎧 Escuchar": "🎧 Listen",
  "Mover a la izquierda": "Move left",
  "Mover a la derecha": "Move right",
  "Alejar": "Zoom out",
  "Acercar": "Zoom in",
  "Centrar en el marcador": "Center on the marker",
  "⊙ Centrar": "⊙ Center",

  // ---------------------------------------------------------------- analyzer: sweep / zero span
  "📊 Barrido": "📊 Sweep",
  "Banda rápida": "Quick band",
  "— Elige una banda —": "— Choose a band —",
  "Inicio (MHz)": "Start (MHz)",
  "Fin (MHz)": "Stop (MHz)",
  "Centro (MHz)": "Center (MHz)",
  "Aplicar": "Apply",
  "Potencia de UNA frecuencia en el tiempo, como un osciloscopio de RF: pulsos de controles remotos, ráfagas de datos, radares.":
    "Power of ONE frequency over time, like an RF oscilloscope: remote-control pulses, data bursts, radars.",
  "Frecuencia (MHz)": "Frequency (MHz)",
  "Tiempo en pantalla": "Time on screen",
  "Disparo": "Trigger",
  "Libre": "Free run",
  "Por nivel": "On level",
  "Nivel de disparo": "Trigger level",

  // ---------------------------------------------------------------- analyzer: receiver, traces
  "Receptor de barrido": "Sweep receiver",
  "Detalle": "Detail",
  "Rápido": "Fast",
  "Fino": "Fine",
  "Puntos": "Points",
  "Pico (+Peak)": "Peak (+Peak)",
  "Promedio (RMS)": "Average (RMS)",
  "Muestra": "Sample",
  "Trazas y escala": "Traces and scale",
  "Máx.": "Max",
  "Mín.": "Min",
  "Persistencia": "Persistence",
  "Picos": "Peaks",
  "Guardar ref.": "Save ref.",
  "Ver ref.": "Show ref.",
  "Normalizar": "Normalize",
  "Limpiar": "Clear",
  "Escala auto": "Auto scale",
  "⏸ Pausa": "⏸ Pause",
  "Barrido único": "Single sweep",
  "Nivel máx.": "Max level",
  "Nivel mín.": "Min level",
  "📷 Imagen": "📷 Image",

  // ---------------------------------------------------------------- analyzer: measurements, units, limits
  "Mediciones": "Measurements",
  "Medición": "Measurement",
  "Ancho de canal (kHz)": "Channel width (kHz)",
  "Separación (kHz)": "Spacing (kHz)",
  "FM comercial": "FM broadcast",
  "Usa el marcador activo (o el pico más alto). Para potencias exactas elige el detector «Promedio». El resultado aparece debajo del espectro.":
    "Uses the active marker (or the highest peak). For exact power readings choose the “Average” detector. The result appears below the spectrum.",
  "Unidades, calibración y convertidor": "Units, calibration and converter",
  "Unidades": "Units",
  "dBFS (relativo)": "dBFS (relative)",
  "Convertidor (MHz)": "Converter (MHz)",
  "Nivel real en el marcador (dBm)": "Actual level at the marker (dBm)",
  "Calibrar": "Calibrate",
  "Borrar calibración": "Delete calibration",
  "Calibrar: conecta una señal de nivel conocido (generador, o el tinySA de un amigo), pon el marcador encima y escribe su nivel. Vale para esa ganancia. El convertidor suma su frecuencia: up-converter HF «-125», LNB de 10 GHz «9750».":
    "Calibrate: connect a signal of known level (a generator, or a friend's tinySA), put the marker on it and type its level. It is valid for that gain. The converter adds its frequency: HF up-converter “-125”, 10 GHz LNB “9750”.",
  "Línea límite (pasa / falla)": "Limit line (pass / fail)",
  "Límite superior": "Upper limit",
  "Límite inferior": "Lower limit",
  "apagado": "off",
  "Pitido cuando falla": "Beep on fail",
  "Límite = marcador + 3 dB": "Limit = marker + 3 dB",
  "Vigilar en la Raspberry": "Monitor on the Raspberry",
  "Ideal para revisar que un transmisor no se pase de nivel o detectar cuando aparece una señal.":
    "Ideal for checking that a transmitter stays below a level, or for detecting when a signal shows up.",

  // ---------------------------------------------------------------- analyzer: 24/7 monitor, presets, peaks
  "Vigilancia 24/7 y ocupación": "24/7 monitor and occupancy",
  "Vigilar aunque cierre el panel": "Monitor even with the panel closed",
  "La Raspberry sigue barriendo, registra la ocupación y anota alarmas.": "The Raspberry keeps sweeping, logs occupancy and records alarms.",
  "Alarma si supera": "Alarm above",
  "sin alarma": "no alarm",
  "Registro cada": "Log every",
  "Sólo desde (MHz)": "Only from (MHz)",
  "Hasta (MHz)": "To (MHz)",
  "todo": "all",
  "Aviso al celular (ntfy)": "Phone alert (ntfy)",
  "Para recibir avisos en el celular configura NTFY_TOPIC en sdrkit.conf e instala la app gratuita «ntfy».":
    "To get alerts on your phone, set NTFY_TOPIC in sdrkit.conf and install the free “ntfy” app.",
  "Guardar": "Save",
  "Borrar": "Delete",
  "Ocupación %": "Occupancy %",
  "Ocupación en el tiempo": "Occupancy over time",
  "Alarmas": "Alarms",
  "Configuraciones guardadas": "Saved settings",
  "💾 Guardar la configuración actual": "💾 Save the current settings",
  "Picos detectados": "Detected peaks",
  "Frecuencia": "Frequency",
  "Nivel": "Level",
  "Sin calibrar, los niveles son relativos (dBFS): sirven para comparar, no son dBm de laboratorio.":
    "Uncalibrated levels are relative (dBFS): good for comparing, not lab-grade dBm.",

  // ---------------------------------------------------------------- radio: main card
  "El dongle lo está usando el analizador.": "The analyzer is using the dongle.",
  "Usar el radio": "Use the radio",
  "Toca para escribir la frecuencia": "Tap to type the frequency",
  "Bajar frecuencia": "Frequency down",
  "Subir frecuencia": "Frequency up",
  "Paso 1 kHz": "Step 1 kHz",
  "Paso 5 kHz": "Step 5 kHz",
  "Paso 6.25 kHz": "Step 6.25 kHz",
  "Paso 12.5 kHz": "Step 12.5 kHz",
  "Paso 25 kHz": "Step 25 kHz",
  "Paso 100 kHz": "Step 100 kHz",
  "Paso 1 MHz": "Step 1 MHz",
  "Buscar hacia abajo la próxima señal": "Seek down to the next signal",
  "Buscar hacia arriba la próxima señal": "Seek up to the next signal",
  "⏮ Buscar señal": "⏮ Seek signal",
  "Buscar señal ⏭": "Seek signal ⏭",
  "▶ Escuchar en este celular": "▶ Listen on this phone",
  "Volumen": "Volume",

  // ---------------------------------------------------------------- radio: squelch, DSD, panorama
  "Señal y silenciador (squelch)": "Signal and squelch",
  "ruido —": "noise —",
  "Abrir": "Open",
  "🎯 Modo cazador": "🎯 Fox-hunt mode",
  "Voz digital (DSD-FME)": "Digital voice (DSD-FME)",
  "Sistema": "System",
  "esperando señal": "waiting for signal",
  "Destino / grupo": "Target / group",
  "Origen": "Source",
  "· toca para sintonizar": "· tap to tune",

  // ---------------------------------------------------------------- radio: decoding, data, recording
  "Decodificación": "Decoding",
  "Subtono CTCSS": "CTCSS tone",
  "sin tono": "no tone",
  "Código DCS": "DCS code",
  "sin código": "no code",
  "teclas marcadas": "keys dialed",
  "Funciona en FM (walkie-talkies, repetidoras). El subtono aparece ~2 s después de que empiezan a hablar: es lo que debes configurar en tu radio para hablar con ese grupo.":
    "Works on FM (walkie-talkies, repeaters). The tone shows up ~2 s after someone starts talking: it is what you set on your radio to talk to that group.",
  "Datos digitales en esta frecuencia": "Digital data on this frequency",
  "Activa un decodificador: los mensajes aparecen aquí y en Decodificar → Mensajes.":
    "Turn on a decoder: messages show up here and in Decode → Messages.",
  "Funciona aunque nadie escuche y con el squelch cerrado.": "Works even when nobody is listening and with the squelch closed.",
  "Grabar": "Record",
  "⏺ Grabar ahora": "⏺ Record now",
  "Grabar automáticamente cada transmisión": "Automatically record every transmission",
  "Un archivo por transmisión, aunque cierres el celular.": "One file per transmission, even with your phone locked.",
  "Se guardan en carpetas por fecha. Míralas en la pestaña Grabaciones.": "Saved in folders by date. See them in the Recordings tab.",
  "Repetición instantánea": "Instant replay",
  "Avisarme cuando haya una versión nueva": "Tell me when a new version is out",
  "Revisa GitHub sólo cuando la Raspberry está en tu WiFi. Nunca instala nada sin preguntarte.":
    "Checks GitHub only while the Raspberry is on your WiFi. It never installs anything without asking you.",
  "Acerca de SDR-Kit": "About SDR-Kit",
  "SDR-Kit es un proyecto libre y gratuito (licencia MIT). Si te sirve, apóyalo con una ⭐ en GitHub, cuéntale a alguien o reporta lo que falle: así sigue creciendo.":
    "SDR-Kit is a free, open-source project (MIT license). If it helps you, support it with a ⭐ on GitHub, tell someone about it or report what breaks: that keeps it growing.",
  "⭐ Apoyar en GitHub": "⭐ Support on GitHub",
  "🗺 Roadmap": "🗺 Roadmap",
  "★ Calificar": "★ Rate",
  "📤 Compartir": "📤 Share",
  "👋 Introducción": "👋 Introduction",
  "⏪ ¿Qué dijo?": "⏪ What did they say?",
  "💾 Guardar": "💾 Save",
  "El radio guarda siempre lo último que se oyó. Si no entendiste, tócalo y se repite.":
    "The radio always keeps the last thing you heard. If you missed it, tap and it plays again.",

  // ---------------------------------------------------------------- radio: scanner, memories
  "Escáner": "Scanner",
  "Memorias": "Memories",
  "Servicio": "Service",
  "Rango": "Range",
  "Desde (MHz)": "From (MHz)",
  "Paso (kHz)": "Step (kHz)",
  "▶ Escanear": "▶ Scan",
  "⏭ Saltar": "⏭ Skip",
  "No volver a parar en este canal por 10 min": "Don't stop on this channel again for 10 min",
  "■ Detener": "■ Stop",
  "Mide varios canales a la vez: un grupo de 22 canales se revisa en ~40 ms.": "Measures many channels at once: a group of 22 channels is checked in ~40 ms.",
  "★ Guardar actual": "★ Save current",
  "⬇ Exportar": "⬇ Export",
  "⬆ Importar": "⬆ Import",
  "📈 Ver en analizador": "📈 View in analyzer",

  // ---------------------------------------------------------------- decode: messages
  "✉ Mensajes": "✉ Messages",
  "🌡 Sensores": "🌡 Sensors",
  "✈ Aviones": "✈ Aircraft",
  "🧩 Todos los modos": "🧩 All modes",
  "Mensajes digitales (multimon-ng)": "Digital messages (multimon-ng)",
  "Qué escuchar": "What to listen to",
  "▶ Decodificar": "▶ Decode",
  "Qué puedes leer aquí": "What you can read here",
  "Ley: escuchar suele ser legal, pero divulgar o usar el contenido de mensajes privados (p. ej. buscapersonas médicos) puede no serlo. Infórmate en tu país.":
    "Law: listening is usually legal, but disclosing or using the content of private messages (e.g. medical pagers) may not be. Check the rules in your country.",
  "Recibidos": "Received",
  "Buscar texto, RIC, indicativo…": "Search text, RIC, callsign…",
  "Todos": "All",
  "Otros": "Other",
  "Todavía no hay mensajes.": "No messages yet.",

  // ---------------------------------------------------------------- decode: sensors
  "Sensores inalámbricos (rtl_433 · +200 modelos)": "Wireless sensors (rtl_433 · 200+ models)",
  "Estaciones meteorológicas, termómetros, sensores de presión de llantas (TPMS), timbres, sensores de puertas, medidores de consumo… todo lo que transmite en las bandas ISM.":
    "Weather stations, thermometers, tire-pressure sensors (TPMS), doorbells, door sensors, energy meters… anything that transmits on the ISM bands.",
  "Banda": "Band",
  "Cambiar banda cada": "Switch band every",
  "▶ Buscar sensores": "▶ Find sensors",
  "Borrar lista": "Clear list",
  "Últimas lecturas": "Latest readings",

  // ---------------------------------------------------------------- decode: aircraft
  "Radar de aviones (ADS-B 1090 MHz) · sin internet": "Aircraft radar (ADS-B 1090 MHz) · no internet",
  "▶ Encender radar": "▶ Start radar",
  "Alcance": "Range",
  "Mostrar estaciones APRS decodificadas": "Show decoded APRS stations",
  "Tu ubicación (centro del radar)": "Your location (radar center)",
  "Latitud": "Latitude",
  "Longitud": "Longitude",
  "📍 GPS del celular": "📍 Phone GPS",
  "Sin ubicación, el radar usa el centro de los aviones recibidos.": "Without a location, the radar centers on the aircraft received.",
  "Aviones": "Aircraft",
  "Antena: vertical de 6.9 cm (¼ de onda a 1090 MHz) lo más alta posible; con el dipolo del kit, abre cada brazo a 6.5 cm. Alcance típico 100–250 km con vista despejada. Squawk 7700 = emergencia, 7600 = sin radio, 7500 = interferencia ilícita.":
    "Antenna: a 6.9 cm vertical (¼ wave at 1090 MHz), as high as possible; with the kit dipole, extend each arm to 6.5 cm. Typical range 100–250 km with a clear view. Squawk 7700 = emergency, 7600 = radio failure, 7500 = unlawful interference.",

  // ---------------------------------------------------------------- decode: all modes
  "Todo lo que este equipo puede decodificar": "Everything this device can decode",
  "Voz digital: DMR, D-Star, YSF (Fusion), NXDN, P25": "Digital voice: DMR, D-Star, YSF (Fusion), NXDN, P25",

  // ---------------------------------------------------------------- recordings
  "Buscar frecuencia, nombre, tono…": "Search frequency, name, tone…",
  "Actualizar": "Refresh",
  "Seleccionar todo": "Select all",
  "🗑 Borrar": "🗑 Delete",
  "Registro de actividad": "Activity log",
  "Panel del negocio": "Business panel",
  "Cuánto se usa la radio: transmisiones por hora y por día, los canales más activos y la transmisión más larga.": "How much the radio is used: transmissions per hour and per day, the busiest channels and the longest transmission.",
  "Hoy": "Today",
  "7 días": "7 days",
  "30 días": "30 days",
  "Cada vez que alguien transmite (en el radio o el escáner) queda anotado: hora, frecuencia, duración, nivel y tonos.":
    "Every time someone transmits (on the radio or the scanner) it is logged: time, frequency, duration, level and tones.",
  "Borrar registro": "Clear log",

  // ---------------------------------------------------------------- more: nav, channels, frequency guide
  "📻 Canales": "📻 Channels",
  "📖 Frecuencias": "📖 Frequencies",
  "📶 Antenas": "📶 Antennas",
  "📡 Receptor avanzado": "📡 Advanced receiver",
  "⚙ Sistema": "⚙ System",
  "Escuchar todo: servicios y canales": "Listen to everything: services and channels",
  "Todos los canales de cada servicio (walkie-talkies PMR/FRS, marina, aviación, CB, radioaficionados, satélites…). Toca uno para escucharlo o escanea el servicio completo.":
    "Every channel of each service (PMR/FRS walkie-talkies, marine, airband, CB, ham radio, satellites…). Tap one to listen or scan the whole service.",
  "Guía de frecuencias": "Frequency guide",
  "Buscar: aviación, marina, 446, satélite…": "Search: airband, marine, 446, satellite…",
  "🎧 abre el radio en esa frecuencia · 📈 la muestra en el analizador. Las frecuencias varían por país: confírmalas localmente.":
    "🎧 opens the radio on that frequency · 📈 shows it in the analyzer. Frequencies vary by country: confirm them locally.",
  "Subtonos CTCSS (50 estándar)": "CTCSS tones (50 standard)",
  "Códigos DCS (104) y su equivalente invertido": "DCS codes (104) and their inverted equivalent",

  // ---------------------------------------------------------------- more: antennas
  "Calculadora de antenas": "Antenna calculator",
  "Alambre / varilla delgada (×0.95)": "Wire / thin rod (×0.95)",
  "Tubo grueso (×0.97)": "Thick tube (×0.97)",
  "Pérdida del cable coaxial": "Coax cable loss",
  "Largo (m)": "Length (m)",
  "¿Qué antena para qué?": "Which antenna for what?",
  "Consejos que hacen la diferencia": "Tips that make a difference",

  // ---------------------------------------------------------------- more: advanced receiver
  "Receptor avanzado (OpenWebRX+)": "Advanced receiver (OpenWebRX+)",
  "Cascada grande, más modos y decodificadores: RDS de emisoras FM, aviones ADS-B en mapa, APRS, buscapersonas, sensores de 433 MHz, ACARS, radiosondas…":
    "Large waterfall, more modes and decoders: FM station RDS, ADS-B aircraft on a map, APRS, pagers, 433 MHz sensors, ACARS, radiosondes…",
  "📡 Abrir receptor avanzado": "📡 Open advanced receiver",
  "El dongle sólo puede usarlo un modo a la vez: al abrirlo se pausan el analizador y el radio.":
    "Only one mode at a time can use the dongle: opening it pauses the analyzer and the radio.",
  "Ajustes de OpenWebRX+ (usuario admin)": "OpenWebRX+ settings (admin user)",

  // ---------------------------------------------------------------- more: WiFi
  "📡 Usar hotspot propio": "📡 Use own hotspot",
  "🏠 Buscar WiFi conocida": "🏠 Find known WiFi",
  "Al cambiar de red tu celular perderá la conexión con la Raspberry. Reconéctate a la red nueva y vuelve a abrir el panel.":
    "When the network changes, your phone will lose its connection to the Raspberry. Reconnect to the new network and open the panel again.",
  "Redes guardadas": "Saved networks",
  "Cargando…": "Loading…",
  "Agregar red WiFi": "Add WiFi network",
  "Ej.: el WiFi de tu casa o el hotspot de tu celular (así tendrás internet y acceso remoto en la calle).":
    "E.g. your home WiFi or your phone's hotspot (so you have internet and remote access on the go).",
  "Nombre de la red (SSID)": "Network name (SSID)",
  "Buscar": "Scan",
  "Clave (vacío si es abierta)": "Password (empty if open)",
  "Mostrar clave": "Show password",
  "Red oculta": "Hidden network",
  "Guardar y conectar": "Save and connect",

  // ---------------------------------------------------------------- more: system
  "Direcciones para entrar": "Access addresses",
  "Actualizaciones": "Updates",
  "🔎 Buscar actualizaciones": "🔎 Check for updates",
  "⬇ Actualizar ahora": "⬇ Update now",
  "Necesita internet (WiFi de casa o hotspot del celular). Tu configuración, grabaciones y memorias no se tocan. Si la versión nueva falla, vuelve sola a la anterior.":
    "Needs internet (home WiFi or phone hotspot). Your settings, recordings and memories are kept. If the new version fails, it rolls back to the previous one by itself.",
  "Mantenimiento": "Maintenance",
  "📄 Ver registros": "📄 View logs",
  "🔄 Reiniciar": "🔄 Restart",
  "🔴 Apagar": "🔴 Shut down",
  "Cerrar sesión": "Log out",
  "Apaga desde aquí antes de desconectar la batería: así cuidas la tarjeta microSD. Espera a que la luz verde deje de parpadear.":
    "Shut down from here before unplugging the battery: it protects the microSD card. Wait until the green light stops blinking.",

  // ---------------------------------------------------------------- fox-hunt overlay
  "Modo cazador": "Fox-hunt mode",
  "🎯 Modo cazador ·": "🎯 Fox-hunt mode ·",
  "máximo —": "max —",
  "Camina y gira la antena: el pitido sube de tono y se acelera al acercarte al transmisor. Si el valor se queda pegado arriba, baja la ganancia.":
    "Walk around and turn the antenna: the beep rises in pitch and speeds up as you get closer to the transmitter. If the value sticks at the top, lower the gain.",
  "🔊 Pitido": "🔊 Beep",
  "Reiniciar máximo": "Reset max",
});

// Whole elements that mix text with inline tags (key = exact innerHTML, whitespace-normalized).
// Tags, ids, classes and attributes are kept identical; <code> stays untranslated.
I18N.addHtml({
  'Sintonizador <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· elige sin tocar el gráfico</span>':
    'Tuner <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· pick without touching the chart</span>',
  '<i>M1</i>Toca el espectro para poner un marcador':
    '<i>M1</i>Tap the spectrum to place a marker',
  'Vigilar aunque cierre el panel<br><span class="muted small">La Raspberry sigue barriendo, registra la ocupación y anota alarmas.</span>':
    'Monitor even with the panel closed<br><span class="muted small">The Raspberry keeps sweeping, logs occupancy and records alarms.</span>',
  'Panorama <span id="panSpan">±96 kHz</span> <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· toca para sintonizar</span>':
    'Panorama <span id="panSpan">±96 kHz</span> <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· tap to tune</span>',
  'Avisarme cuando haya una versión nueva<br><span class="muted small" id="updNotifyInfo">Revisa GitHub sólo cuando la Raspberry está en tu WiFi. Nunca instala nada sin preguntarte.</span>':
    'Tell me when a new version is out<br><span class="muted small" id="updNotifyInfo">Checks GitHub only while the Raspberry is on your WiFi. It never installs anything without asking you.</span>',
  'Grabar automáticamente cada transmisión<br><span class="muted small">Un archivo por transmisión, aunque cierres el celular.</span>':
    'Automatically record every transmission<br><span class="muted small">One file per transmission, even with your phone locked.</span>',

  // decode → messages: what you can read here
  '<b>POCSAG / FLEX:</b> buscapersonas de hospitales, bomberos, servicios técnicos y alarmas (152–159 MHz, 929–931 MHz en América).':
    '<b>POCSAG / FLEX:</b> pagers of hospitals, fire departments, field service and alarm companies (152–159 MHz, 929–931 MHz in the Americas).',
  '<b>APRS:</b> posiciones, clima y mensajes de radioaficionados (144.390 MHz en América, 144.800 en Europa, 145.825 la ISS). Las estaciones con posición aparecen en el radar de Aviones.':
    '<b>APRS:</b> ham radio positions, weather and messages (144.390 MHz in the Americas, 144.800 in Europe, 145.825 the ISS). Stations with a position show up on the Aircraft radar.',
  '<b>EAS:</b> alertas de emergencia de NOAA Weather Radio (162.400–162.550 MHz, EE. UU.).':
    '<b>EAS:</b> NOAA Weather Radio emergency alerts (162.400–162.550 MHz, USA).',
  '<b>Selcall / FMS / Morse:</b> llamadas selectivas de flotas, servicios de emergencia europeos y telegrafía.':
    '<b>Selcall / FMS / Morse:</b> fleet selective calling, European emergency services and telegraphy.',

  // decode → all modes: digital voice
  'Estas radios usan el códec de voz <b>AMBE/IMBE</b>, que está patentado: OpenWebRX+ decodifica la señal, pero para convertirla en voz necesita un «servidor de códec».':
    'These radios use the patented <b>AMBE/IMBE</b> voice codec: OpenWebRX+ decodes the signal, but it needs a “codec server” to turn it into voice.',
  '<b>Camino legal y fácil:</b> una llave USB con chip <b>AMBE3000</b> (ThumbDV, DVstick 30, ~US$ 100–130). Conéctala, escribe <code>AMBE_TTY="/dev/ttyUSB0"</code> en sdrkit.conf y reinstala: queda configurada sola.':
    '<b>The easy, legal way:</b> a USB stick with an <b>AMBE3000</b> chip (ThumbDV, DVstick 30, ~US$ 100–130). Plug it in, write <code>AMBE_TTY="/dev/ttyUSB0"</code> in sdrkit.conf and reinstall: it sets itself up.',
  '<b>M17</b> (códec abierto Codec2) y <b>FreeDV</b> funcionan sin llave.':
    '<b>M17</b> (open Codec2 codec) and <b>FreeDV</b> work without a stick.',
  '<b>Imposible</b> (con cualquier equipo): voz <b>cifrada</b> (policía/militar con AES/ARC4/TETRA TEA), celulares 2G/3G/4G/5G, WiFi o Bluetooth cifrados.':
    '<b>Impossible</b> (with any equipment): <b>encrypted</b> voice (police/military with AES/ARC4/TETRA TEA), 2G/3G/4G/5G cell phones, encrypted WiFi or Bluetooth.',

  // more → antennas
  'λ (longitud de onda) = <b id="antLambda">—</b>. Corta siempre un poco más largo y recorta probando con el analizador.':
    'λ (wavelength) = <b id="antLambda">—</b>. Always cut a little long and trim while testing with the analyzer.',
  '<b>Altura antes que ganancia:</b> subir la antena 5 m vale más que cualquier antena «mágica». Afuera y sin obstáculos.':
    '<b>Height beats gain:</b> raising the antenna 5 m is worth more than any “magic” antenna. Outdoors and clear of obstacles.',
  '<b>Polarización:</b> walkie-talkies, repetidoras, aviación y marina usan antena <b>vertical</b>. TV y algunos satélites, horizontal o circular.':
    '<b>Polarization:</b> walkie-talkies, repeaters, airband and marine use a <b>vertical</b> antenna. TV and some satellites, horizontal or circular.',
  '<b>Cable corto:</b> en UHF (400 MHz+) el cable delgado pierde mucho. Lleva el dongle cerca de la antena con una extensión USB.':
    '<b>Short cable:</b> at UHF (400 MHz+) thin cable loses a lot. Put the dongle near the antenna with a USB extension.',
  '<b>Conector:</b> el RTL-SDR Blog V3/V4 usa <b>SMA hembra</b>: la antena debe tener SMA macho (o usa un adaptador).':
    '<b>Connector:</b> the RTL-SDR Blog V3/V4 has a <b>female SMA</b>: the antenna needs a male SMA (or use an adapter).',
  '<b>Filtro FM:</b> si vives cerca de emisoras, un filtro rechaza-FM (88–108 MHz) evita «fantasmas» en todo el espectro.':
    '<b>FM filter:</b> if you live near broadcast stations, an FM band-stop filter (88–108 MHz) prevents “ghosts” across the whole spectrum.',
  '<b>Bias-tee:</b> el V4 puede alimentar un LNA por el coaxial (BIAS_TEE="si"). Nunca lo actives con una antena en cortocircuito DC.':
    '<b>Bias-tee:</b> the V4 can power an LNA through the coax (BIAS_TEE="si"). Never turn it on with a DC-shorted antenna.',
  '<b>Ajuste fino:</b> usa el analizador con «Máx. retenido» mientras recortas: la mejor longitud es la que deja la señal más alta.':
    '<b>Fine tuning:</b> use the analyzer with “Max hold” while trimming: the best length is the one that leaves the strongest signal.',

  // fox-hunt overlay
  '🎯 Modo cazador · <span id="hFreq"></span>':
    '🎯 Fox-hunt mode · <span id="hFreq"></span>',
});
