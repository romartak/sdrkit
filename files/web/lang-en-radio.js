/* SDR-Kit · English catalog: radio (Spanish source → English). See i18n.js.
 *
 * Covers radio.js (radio card, digital voice, tones, data chips, scanner, memories, fox-hunt),
 * decode.js (messages, sensors, aircraft/radar, decoder catalog), recs.js (recordings and
 * activity log) and canales.js (services and channel plans). The channel data in canales.js
 * stays Spanish (it is sent to the server as scan/memory names) and is translated when shown.
 */
"use strict";
I18N.add({
  // ---------------------------------------------------------------- radio.js · listen, meter, recording
  "■ Dejar de escuchar": "■ Stop listening",
  "▶ Escuchar en este celular": "▶ Listen on this phone",
  "Grabación guardada ({d} s).": "Recording saved ({d} s).",
  "ruido {n}": "noise {n}",
  "■ Detener grabación · {t}": "■ Stop recording · {t}",
  "⏺ Grabar ahora": "⏺ Record now",
  "● Grabando esta transmisión… {f}": "● Recording this transmission… {f}",
  "● Grabando… {f}": "● Recording… {f}",
  "Esperando transmisiones para grabarlas (se activa cuando se abre el squelch).":
    "Waiting for transmissions to record (starts when the squelch opens).",
  "Se guardan en carpetas por fecha. Míralas en la pestaña Grabaciones.": "Saved in folders by date. See them in the Recordings tab.",
  "Guardada: {f} ({d} s)": "Saved: {f} ({d} s)",
  "Grabando… pulsa otra vez para detener.": "Recording… tap again to stop.",
  "Cada transmisión se guardará en su propio archivo.": "Each transmission will be saved to its own file.",
  "Grabación automática desactivada.": "Automatic recording off.",
  "⏪ ¿Qué dijo?": "⏪ What did they say?",
  "⏪ ¿Qué dijo? · {s} s": "⏪ What did they say? · {s} s",
  "■ Parar repetición": "■ Stop replay",
  "Repitiendo {s} s · {n} transmisión. «Guardar» la deja en Grabaciones.": "Replaying {s} s · {n} transmission. “Save” keeps it in Recordings.",
  "Repitiendo {s} s · {n} transmisiones. «Guardar» las deja en Grabaciones.": "Replaying {s} s · {n} transmissions. “Save” keeps them in Recordings.",
  "El radio guarda siempre lo último que se oyó. Si no entendiste, tócalo y se repite.":
    "The radio always keeps the last thing you heard. If you missed it, tap and it plays again.",
  "Repetición guardada en Grabaciones ({d} s).": "Replay saved to Recordings ({d} s).",
  "⏪ repetición": "⏪ replay",
  "Squelch abierto (se oye todo, incluso el ruido)": "Squelch open (you hear everything, even noise)",
  "Espera a que llegue la señal.": "Wait for the signal to come in.",
  "Squelch a {n} dB (ruido + 8 dB).": "Squelch set to {n} dB (noise + 8 dB).",
  "Frecuencia en MHz (ej. 462.5625):": "Frequency in MHz (e.g. 462.5625):",
  "Frecuencia fuera de rango (0.1–1766 MHz).": "Frequency out of range (0.1–1766 MHz).",
  "Buscando la próxima señal hacia arriba…": "Seeking the next signal up…",
  "Buscando la próxima señal hacia abajo…": "Seeking the next signal down…",
  "FM ancha": "Wide FM",
  "Digital": "Digital",

  // overlay (dongle used by another mode)
  "Cambiando de modo…": "Switching mode…",
  "El dongle lo está usando el analizador.": "The analyzer is using the dongle.",
  "El dongle lo está usando el receptor avanzado (OpenWebRX+).": "The advanced receiver (OpenWebRX+) is using the dongle.",
  "El SDR está en reposo.": "The SDR is idle.",

  // tones CTCSS / DCS
  "hace {n} s": "{n} s ago",
  "hace {n} min": "{n} min ago",
  "hace {n} h": "{n} h ago",
  "medido {m} Hz · desviación {d} Hz": "measured {m} Hz · deviation {d} Hz",
  "último, {ago}": "last, {ago}",
  "sin tono": "no tone",
  "sólo en FM": "FM only",
  "calidad {q}%": "quality {q}%",
  "sin código": "no code",

  // digital voice (DSD-FME) and the signal classifier banner
  "📡 <b>Señal digital detectada:</b> {g}": "📡 <b>Digital signal detected:</b> {g}",
  "desviación ≈ {d} Hz": "deviation ≈ {d} Hz",
  "🔊 Decodificar voz (DMR/P25/YSF)": "🔊 Decode voice (DMR/P25/YSF)",
  "Probar M17": "Try M17",
  "🔊 Decodificar NXDN": "🔊 Decode NXDN",
  "Probar dPMR": "Try dPMR",
  "🔊 Decodificar D-Star": "🔊 Decode D-Star",
  "P25 fase 2 (sólo con canal de control)": "P25 phase 2 (control channel only)",
  "✉ Leer mensajes POCSAG": "✉ Read POCSAG messages",
  "✉ Leer mensajes FLEX": "✉ Read FLEX messages",
  "✉ Leer APRS / packet": "✉ Read APRS / packet",
  "recibiendo": "receiving",
  "último detectado": "last detected",
  "esperando señal": "waiting for signal",
  "🔒 Llamada cifrada: la voz no se puede escuchar (con ningún receptor) sin la clave del sistema.":
    "🔒 Encrypted call: the voice can't be heard (on any receiver) without the system key.",
  "✅ Decodificando {sync}: la voz sale por el audio y se puede grabar.":
    "✅ Decoding {sync}: the voice plays through the audio and can be recorded.",
  "Tipo detectado por la forma de la señal: {g}. Si no aparece voz, prueba otro sistema arriba.":
    "Type detected from the signal shape: {g}. If no voice comes through, try another system above.",
  "Sintoniza un canal digital (repetidora DMR, radio de empresa, D-Star, Fusion, M17…). La voz aparece sola cuando hay una llamada sin cifrar.":
    "Tune to a digital channel (DMR repeater, business radio, D-Star, Fusion, M17…). The voice comes through by itself when there is an unencrypted call.",

  // digital data chips (multimon-ng)
  "Decodificando {k} · funciona con el squelch cerrado.": "Decoding {k} · works with the squelch closed.",
  "Funciona aunque nadie escuche y con el squelch cerrado.": "Works even when nobody is listening and with the squelch closed.",
  "Decodificando {k}: mira «Datos digitales» más abajo o Decodificar → Mensajes.":
    "Decoding {k}: see “Digital data” below or Decode → Messages.",
  "Consejo: los datos (POCSAG, APRS…) se reciben en FM.": "Tip: data (POCSAG, APRS…) is received in FM.",

  // scanner
  "{n} hallazgo": "{n} hit",
  "{n} hallazgos": "{n} hits",
  "● Detenido en {name}": "● Stopped on {name}",
  "Buscando {r}": "Scanning {r}",
  "{n} canal": "{n} channel",
  "{n} canales": "{n} channels",
  "vuelta completa {ms} ms": "full pass {ms} ms",
  "Primero guarda memorias en algún grupo.": "Save some memories to a group first.",
  "Escaneando {n} canal.": "Scanning {n} channel.",
  "Escaneando {n} canales.": "Scanning {n} channels.",
  "Escáner detenido.": "Scanner stopped.",
  "Ese canal se ignorará 10 minutos.": "That channel will be skipped for 10 minutes.",

  // memories
  "Todas las memorias": "All memories",
  "Borrar": "Delete",
  "No hay memorias en este grupo.": "No memories in this group.",
  "¿Borrar la memoria «{name}»?": "Delete the memory “{name}”?",
  "Favoritos": "Favorites",
  "memorias-sdrkit.json": "sdrkit-memories.json",
  "¿Reemplazar todas tus memorias? (Cancelar = agregarlas a las actuales)": "Replace all your memories? (Cancel = add them to the current ones)",
  "Listo: {n} memoria.": "Done: {n} memory.",
  "Listo: {n} memorias.": "Done: {n} memories.",
  "Archivo no válido: {e}": "Invalid file: {e}",

  // fox-hunt mode
  "máximo {p} dB": "max {p} dB",
  "señal {r} dB sobre el ruido": "signal {r} dB above noise",
  "sólo ruido": "noise only",

  // ---------------------------------------------------------------- decode.js · messages
  "— Elige qué escuchar —": "— Choose what to listen to —",
  "APRS · Américas 144.390": "APRS · Americas 144.390",
  "APRS · Europa 144.800": "APRS · Europe 144.800",
  "APRS · Estación Espacial ISS 145.825": "APRS · ISS space station 145.825",
  "APRS · Japón 144.640 / Australia 145.175": "APRS · Japan 144.640 / Australia 145.175",
  "Buscapersonas VHF (busca la frecuencia local: 152–159 MHz)": "VHF pagers (find your local frequency: 152–159 MHz)",
  "Buscapersonas 929–931 MHz (América)": "Pagers 929–931 MHz (Americas)",
  "Buscapersonas 466 MHz (Europa)": "Pagers 466 MHz (Europe)",
  "NOAA Weather Radio · alertas EAS 162.550": "NOAA Weather Radio · EAS alerts 162.550",
  "NOAA Weather Radio · alertas EAS 162.400": "NOAA Weather Radio · EAS alerts 162.400",
  "Selcall / FMS (servicios, flotas)": "Selcall / FMS (services, fleets)",
  "Morse en VHF/UHF (balizas)": "Morse on VHF/UHF (beacons)",
  '<b style="color:var(--ok)">● Decodificando {k}</b> en {f} MHz': '<b style="color:var(--ok)">● Decoding {k}</b> on {f} MHz',
  "El radio está encendido sin decodificadores: elige qué decodificar y pulsa ▶.":
    "The radio is on with no decoders: choose what to decode and press ▶.",
  "Al pulsar ▶ el dongle pasa al radio (se pausa el analizador).": "Pressing ▶ moves the dongle to the radio (the analyzer pauses).",
  "Al pulsar ▶ el dongle pasa al radio (se pausa la búsqueda de sensores).": "Pressing ▶ moves the dongle to the radio (the sensor search pauses).",
  "Al pulsar ▶ el dongle pasa al radio (se pausa el radar de aviones).": "Pressing ▶ moves the dongle to the radio (the aircraft radar pauses).",
  "Al pulsar ▶ el dongle pasa al radio (se pausa el mapa de barcos).": "When you tap ▶ the dongle moves to the radio (the ship map pauses).",
  "Al pulsar ▶ el dongle pasa al radio (se pausa el receptor avanzado).": "Pressing ▶ moves the dongle to the radio (the advanced receiver pauses).",
  "Al pulsar ▶ el dongle pasa al radio (se pausa lo demás).": "Pressing ▶ moves the dongle to the radio (everything else pauses).",
  "📍 en el radar": "📍 on the radar",
  "Todavía no hay mensajes.": "No messages yet.",
  "Todavía no hay mensajes con ese filtro.": "No messages match that filter yet.",
  "Escribe la frecuencia en MHz.": "Enter the frequency in MHz.",
  "Elige al menos un tipo de mensaje.": "Choose at least one message type.",
  "Decodificando en {f} MHz. Los mensajes aparecen a la derecha.": "Decoding on {f} MHz. Messages show up under Received.",
  "Escribe la frecuencia: búscala con el analizador.": "Enter the frequency: find it with the analyzer.",
  "Decodificadores apagados.": "Decoders off.",
  "¿Borrar todos los mensajes decodificados?": "Delete all decoded messages?",

  // sensors (rtl_433)
  "433.92 MHz (lo más común)": "433.92 MHz (most common)",
  "315 MHz (América: llantas, alarmas)": "315 MHz (Americas: tires, alarms)",
  "868 MHz (Europa)": "868 MHz (Europe)",
  "915 MHz (América)": "915 MHz (Americas)",
  "345 MHz (alarmas Honeywell)": "345 MHz (Honeywell alarms)",
  '<b style="color:var(--ok)">● Escuchando sensores</b>': '<b style="color:var(--ok)">● Listening for sensors</b>',
  "Iniciando rtl_433…": "Starting rtl_433…",
  "Detenido. Al iniciar, el dongle se dedica sólo a los sensores.": "Stopped. Once started, the dongle works on sensors only.",
  "batería OK": "battery OK",
  "batería BAJA": "battery LOW",
  "ráfaga {v} km/h": "gust {v} km/h",
  "botón {v}": "button {v}",
  "canal {c}": "channel {c}",
  "{n} lectura": "{n} reading",
  "{n} lecturas": "{n} readings",
  "Aún no se detectan sensores. Tip: en una zona residencial suelen aparecer en minutos (termómetros, llantas de autos que pasan).":
    "No sensors detected yet. Tip: in a residential area they usually show up within minutes (thermometers, tires of passing cars).",
  "Hora": "Time",
  "Modelo": "Model",
  "Datos": "Data",
  "Buscando sensores… deja la antena vertical.": "Searching for sensors… keep the antenna vertical.",

  // aircraft (dump1090) and radar
  "Radar apagado. Al encenderlo, el dongle se dedica sólo a 1090 MHz.": "Radar off. Once on, the dongle works on 1090 MHz only.",
  "Ubicación guardada: {lat}, {lon}": "Saved location: {lat}, {lon}",
  "Ubicación estimada con los aviones recibidos (guarda la tuya para distancias exactas).":
    "Location estimated from the aircraft received (save yours for exact distances).",
  "Sin ubicación, el radar usa el centro de los aviones recibidos.": "With no location, the radar centers on the aircraft received.",
  '<b style="color:var(--ok)">● Radar encendido</b>': '<b style="color:var(--ok)">● Radar on</b>',
  "{n} avión ({p} con posición)": "{n} aircraft ({p} with position)",
  "{n} aviones ({p} con posición)": "{n} aircraft ({p} with position)",
  "{n} mensaje": "{n} message",
  "{n} mensajes": "{n} messages",
  "{n} distinto hoy": "{n} unique today",
  "{n} distintos hoy": "{n} unique today",
  "EMERG.": "EMERG.",
  "SIN RADIO": "NO RADIO",
  "SECUESTRO": "HIJACK",
  "Vuelo": "Flight",
  "Altitud": "Altitude",
  "Velocidad": "Speed",
  "Distancia": "Distance",
  "en tierra": "on ground",
  "rumbo {n}°": "heading {n}°",
  "hacia {n}°": "bearing {n}°",
  "Sin aviones todavía.": "No aircraft yet.",
  // radar canvas: initials of North, South, East, West (space-separated, in this order)
  "N S E O": "N S E W",
  "Esperando aviones…": "Waiting for aircraft…",
  "Radar apagado": "Radar off",
  "Radar apagado · última imagen": "Radar off · last picture",
  "Radar apagado · última imagen de las {t}": "Radar off · last picture at {t}",
  "Radar encendido: los aviones aparecen en 10–60 s.": "Radar on: aircraft show up within 10–60 s.",
  "Escribe latitud y longitud en grados decimales (ej. 18.4861, -69.9312).": "Enter latitude and longitude in decimal degrees (e.g. 18.4861, -69.9312).",
  "Ubicación guardada.": "Location saved.",
  "El navegador sólo da el GPS en páginas https. Copia tus coordenadas de Google Maps (mantén pulsado tu punto) y escríbelas.":
    "The browser only provides GPS on https pages. Copy your coordinates from Google Maps (long-press your spot) and type them in.",
  "No se pudo leer el GPS. Escribe las coordenadas a mano.": "Couldn't read the GPS. Enter the coordinates by hand.",

  // decoder catalog (“All modes”)
  "Abrir": "Open",
  "falta: {x}": "missing: {x}",
  "listo": "ready",
  "no instalado": "not installed",
  "En este panel (funcionan sin internet)": "In this panel (work offline)",
  "En el receptor avanzado (OpenWebRX+)": "In the advanced receiver (OpenWebRX+)",
  "OpenWebRX+ instalado: sus decodificadores se abren en la página del receptor avanzado.":
    "OpenWebRX+ installed: its decoders open on the advanced receiver page.",
  "Modo demo: en la Raspberry verás aquí qué quedó instalado.": "Demo mode: on the Raspberry Pi you'll see here what got installed.",
  "OpenWebRX+ no está instalado: sólo funcionan los del panel.": "OpenWebRX+ is not installed: only the panel's decoders work.",
  '<b style="color:var(--ok)">✅ Códec AMBE configurado: DMR, D-Star, YSF, NXDN y P25 suenan en el receptor avanzado.</b>':
    '<b style="color:var(--ok)">✅ AMBE codec configured: DMR, D-Star, YSF, NXDN and P25 play in the advanced receiver.</b>',
  '<b style="color:var(--warn)">Sin códec AMBE.</b> Se ven y se identifican las señales (y sus datos: ID de radio, grupo, talker alias), pero la voz no se escucha.':
    '<b style="color:var(--warn)">No AMBE codec.</b> Signals are shown and identified (with their data: radio ID, talkgroup, talker alias), but the voice can\'t be heard.',

  // ---------------------------------------------------------------- recs.js · recordings and activity log
  "{n} grabación · {used} de {max} · libre en la microSD: {free}": "{n} recording · {used} of {max} · free on the microSD: {free}",
  "{n} grabaciones · {used} de {max} · libre en la microSD: {free}": "{n} recordings · {used} of {max} · free on the microSD: {free}",
  "Todavía no hay actividad en este período.": "No activity in this period yet.",
  "transmisiones": "transmissions",
  "en el aire": "on the air",
  "hora más activa": "busiest hour",
  "Por hora del día": "By hour of the day",
  "Por día": "By day",
  "Canales más usados": "Busiest channels",
  "Transmisión más larga": "Longest transmission",
  "{n} transmisión": "{n} transmission",
  "{n} transmisiones": "{n} transmissions",
  // ---------------------------------------------------------------- decode.js · ship map (AIS)
  "Mapa apagado. Al encenderlo, el dongle se dedica sólo a 162 MHz (AIS).": "Map off. Once on, the dongle works on 162 MHz (AIS) only.",
  "Ubicación estimada con los barcos recibidos (guarda la tuya en Aviones → Tu ubicación).": "Location estimated from the ships received (save yours in Aircraft → Your location).",
  "Sin ubicación, el mapa usa el centro de los barcos recibidos.": "With no location, the map centers on the ships received.",
  '<b style="color:var(--ok)">● Mapa encendido</b>': '<b style="color:var(--ok)">● Map on</b>',
  "{n} barco ({p} con posición)": "{n} ship ({p} with position)",
  "{n} barcos ({p} con posición)": "{n} ships ({p} with position)",
  "Barco": "Ship",
  "Tipo y destino": "Type and destination",
  "SOCORRO": "DISTRESS",
  "Sin barcos todavía.": "No ships yet.",
  "Esperando barcos…": "Waiting for ships…",
  "Mapa apagado": "Map off",
  "Mapa apagado · última imagen": "Map off · last picture",
  "Mapa apagado · última imagen de las {t}": "Map off · last picture at {t}",
  "Mapa encendido: los barcos aparecen en 1–5 min.": "Map on: ships show up within 1–5 min.",
  "Carguero": "Cargo ship", "Petrolero": "Tanker", "Pasajeros": "Passenger ship", "Pesca": "Fishing", "Velero": "Sailing",
  "Recreo": "Pleasure craft", "Remolcador": "Tug", "Militar": "Military", "Servicio": "Service vessel",
  "navegando con motor": "under way (engine)", "fondeado": "at anchor", "sin gobierno": "not under command",
  "maniobra restringida": "restricted maneuverability", "calado limitado": "constrained by draught", "amarrado": "moored",
  "varado": "aground", "pescando": "fishing", "navegando a vela": "under way (sailing)",
  "Nada coincide con la búsqueda.": "Nothing matches your search.",
  "Todavía no hay grabaciones. En la pestaña Radio pulsa «Grabar ahora» o activa «Grabar automáticamente cada transmisión».":
    "No recordings yet. On the Radio tab tap “Record now” or turn on “Automatically record every transmission”.",
  "Seleccionar": "Select",
  "Reproducir": "Play",
  "Descargar": "Download",
  "Más": "More",
  "Selecciona grabaciones primero.": "Select recordings first.",
  "¿Borrar {n} grabación(es)? No se puede deshacer.": "Delete {n} recording(s)? This can't be undone.",
  "{n} borrada(s).": "{n} deleted.",
  "Sin actividad todavía. Aparece cuando el radio escucha transmisiones (squelch abierto).":
    "No activity yet. It shows up when the radio hears transmissions (squelch open).",
  "Frecuencia": "Frequency",
  "Dur.": "Dur.",
  "Tono": "Tone",
  "Escuchar": "Listen",
  "Ver grabación": "View recording",
  "Escribe el número:\n1 = Escuchar esa frecuencia en vivo\n2 = Guardar la frecuencia en memorias\n3 = Borrar esta grabación":
    "Type a number:\n1 = Listen to that frequency live\n2 = Save the frequency to memories\n3 = Delete this recording",
  "No seleccionaste ninguna: ¿descargar TODAS las grabaciones en un ZIP?": "Nothing selected: download ALL recordings as a ZIP?",
  "Esa transmisión no quedó grabada (era muy corta o se borró).": "That transmission wasn't recorded (it was too short or was deleted).",
  "¿Borrar todo el registro de actividad? (las grabaciones no se borran)": "Delete the whole activity log? (recordings are kept)",

  // ---------------------------------------------------------------- canales.js · services and channels
  "Elige un servicio para ver todos sus canales, escucharlos o escanearlos completos.":
    "Choose a service to see all its channels, listen to them or scan them all.",
  "América": "Americas",
  "Europa / otros países": "Europe / other countries",
  "todo el mundo": "worldwide",
  "Región: {r}": "Region: {r}",
  "modo {m}": "{m} mode",
  "rango: {r}": "range: {r}",
  "📡 Escanear el canal": "📡 Scan the channel",
  "📡 Escanear los {n} canales": "📡 Scan all {n} channels",
  "📡 Escanear {r}": "📡 Scan {r}",
  "★ Guardar como grupo": "★ Save as group",
  "📈 Ver en el analizador": "📈 View in the analyzer",
  "Toca un canal para escucharlo. El escáner se detiene solo cuando alguien habla y sigue buscando cuando termina.":
    "Tap a channel to listen to it. The scanner stops by itself when someone talks and keeps searching when they finish.",
  "Escaneando {n} canal de {s}.": "Scanning {n} channel of {s}.",
  "Escaneando {n} canales de {s}.": "Scanning {n} channels of {s}.",
  "Escaneando {r}.": "Scanning {r}.",
  "Guardado {n} canal en el grupo «{g}».": "Saved {n} channel to the group “{g}”.",
  "Guardados {n} canales en el grupo «{g}».": "Saved {n} channels to the group “{g}”.",

  // service names (and the memory-group names derived from them: the part before " (")
  "PMR446 (walkie-talkies sin licencia)": "PMR446 (license-free walkie-talkies)",
  "dPMR446 y DMR446 (walkie-talkies digitales)": "dPMR446 and DMR446 (digital walkie-talkies)",
  "dPMR446 y DMR446": "dPMR446 and DMR446",
  "FRS / GMRS (walkie-talkies de América)": "FRS / GMRS (American walkie-talkies)",
  "Repetidoras GMRS (entradas)": "GMRS repeaters (inputs)",
  "Repetidoras GMRS": "GMRS repeaters",
  "MURS (EE. UU.)": "MURS (US)",
  "LPD433 (69 canales de 433 MHz)": "LPD433 (69 channels at 433 MHz)",
  "Banda ciudadana CB 27 MHz (40 canales)": "CB citizens band 27 MHz (40 channels)",
  "Banda ciudadana CB 27 MHz": "CB citizens band 27 MHz",
  "Marina VHF (internacional)": "Marine VHF (international)",
  "Marina VHF": "Marine VHF",
  "AIS y DSC (datos de barcos)": "AIS and DSC (ship data)",
  "AIS y DSC": "AIS and DSC",
  "Aviación civil VHF (AM)": "Civil airband VHF (AM)",
  "Aviación civil VHF": "Civil airband VHF",
  "Aviación militar UHF (AM)": "Military airband UHF (AM)",
  "Aviación militar UHF": "Military airband UHF",
  "NOAA Weather Radio (EE. UU. / Canadá)": "NOAA Weather Radio (US / Canada)",
  "Radioaficionados 2 m (VHF)": "Ham radio 2 m (VHF)",
  "Radioaficionados 2 m": "Ham radio 2 m",
  "Radioaficionados 70 cm (UHF)": "Ham radio 70 cm (UHF)",
  "Radioaficionados 70 cm": "Ham radio 70 cm",
  "Satélites": "Satellites",
  "Ferrocarril AAR (EE. UU. / Canadá)": "AAR railroads (US / Canada)",
  "VHF servicios (148–174 MHz)": "VHF services (148–174 MHz)",
  "UHF servicios (450–470 MHz)": "UHF services (450–470 MHz)",
  "Trunking 800 MHz / P25 (EE. UU.)": "Trunking 800 MHz / P25 (US)",
  "Buscapersonas (POCSAG / FLEX)": "Pagers (POCSAG / FLEX)",
  "Buscapersonas": "Pagers",
  "Radio FM comercial": "FM broadcast radio",
  "Radio AM (onda media)": "AM radio (medium wave)",
  "Onda corta internacional": "International shortwave",

  // service descriptions
  "Los walkie-talkies baratos que se venden en tiendas (Motorola T-series, Cobra, Baofeng configurados en PMR). Uso libre en Europa y en muchos países de Latinoamérica. Escucharás familias, obras, eventos, cazadores, airsoft. Suelen usar subtono: el panel te lo muestra.":
    "The cheap walkie-talkies sold in stores (Motorola T-series, Cobra, Baofeng set to PMR). License-free in Europe and in many Latin American countries. You'll hear families, building sites, events, hunters, airsoft. They often use a tone (CTCSS/DCS): the panel shows it.",
  "La versión digital de PMR446: dPMR (6.25 kHz) y DMR Tier I (12.5 kHz). Se escuchan en modo «Digital» (requiere DSD-FME). DMR446 usa los mismos canales de 12.5 kHz que PMR446 analógico.":
    "The digital version of PMR446: dPMR (6.25 kHz) and DMR Tier I (12.5 kHz). Listen in “Digital” mode (requires DSD-FME). DMR446 uses the same 12.5 kHz channels as analog PMR446.",
  "Los walkies familiares de 22 canales (Motorola Talkabout, Midland, Cobra). Muy usados en América: familias, comercios, eventos, construcción. GMRS además permite repetidoras: sus salidas están en los canales 15–22.":
    "The 22-channel family walkie-talkies (Motorola Talkabout, Midland, Cobra). Widely used in the Americas: families, shops, events, construction. GMRS also allows repeaters: their outputs are on channels 15–22.",
  "Lo que los radios GMRS transmiten HACIA la repetidora (467.550–467.725). Útil para oír al radio que llama aunque la repetidora quede lejos.":
    "What GMRS radios transmit TO the repeater (467.550–467.725). Useful to hear the calling radio even when the repeater is far away.",
  "5 canales de VHF sin licencia en EE. UU.: comercios, granjas, alarmas de entrada de vehículos (Dakota Alert) y radios de uso general.":
    "5 license-free VHF channels in the US: shops, farms, driveway alarms (Dakota Alert) and general-purpose radios.",
  "Walkies de muy baja potencia en la banda de 433 MHz (Europa). Comparten espacio con controles remotos y sensores, que suenan como ráfagas cortas.":
    "Very low-power walkie-talkies in the 433 MHz band (Europe). They share the band with remote controls and sensors, which sound like short bursts.",
  "Camioneros, taxis, aficionados. En América se usa AM (canal 19 = carreteras, 9 = emergencias); en Europa también FM. Necesita el RTL-SDR Blog V4 (o modo directo del V3) y una antena larga (≈2.6 m).":
    "Truckers, taxis, hobbyists. The Americas use AM (channel 19 = highways, 9 = emergencies); Europe also uses FM. Needs the RTL-SDR Blog V4 (or the V3's direct sampling mode) and a long antenna (≈2.6 m).",
  "Barcos, puertos, guardacostas, pesca y deportivos. Canal 16 = socorro y llamada (siempre vigilado), 13 = entre puentes, 9 = llamada recreativa. Los canales dúplex se escuchan en la frecuencia de la estación costera.":
    "Ships, ports, coast guard, fishing and pleasure boats. Channel 16 = distress and calling (always monitored), 13 = bridge-to-bridge, 9 = recreational calling. Duplex channels are heard on the coast station's frequency.",
  "Datos digitales de posición de barcos (AIS) y llamadas selectivas digitales de socorro (DSC, canal 70). Se decodifican en el receptor avanzado (OpenWebRX+).":
    "Digital ship position data (AIS) and digital selective distress calls (DSC, channel 70). Decoded in the advanced receiver (OpenWebRX+).",
  "Pilotos, torres de control, aproximación y ATIS. Las frecuencias de torre son locales: escanea la banda completa para descubrirlas. 121.5 = emergencia (siempre vigilada). Europa usa canales de 8.33 kHz.":
    "Pilots, control towers, approach and ATIS. Tower frequencies are local: scan the whole band to find them. 121.5 = emergency (always monitored). Europe uses 8.33 kHz channels.",
  "Banda militar 225–400 MHz. 243.0 MHz es la emergencia militar (guardia). La actividad depende mucho de la zona.":
    "Military band 225–400 MHz. 243.0 MHz is the military emergency (guard) frequency. Activity depends a lot on the area.",
  "Boletines meteorológicos continuos y alertas de emergencia (EAS). Decodifica las alertas en Decodificar → Mensajes → EAS.":
    "Continuous weather bulletins and emergency alerts (EAS). Decode the alerts in Decode → Messages → EAS.",
  "Radioaficionados con licencia: conversaciones, redes, emergencias. Las repetidoras amplían el alcance. En América: llamada 146.520; en Europa: 145.500.":
    "Licensed ham radio operators: contacts, nets, emergencies. Repeaters extend the range. Calling frequency: 146.520 in the Americas, 145.500 in Europe.",
  "Repetidoras FM y digitales (DMR, Fusion, D-Star, M17). Llamada FM: 446.000 (América) / 433.500 (Europa). M17 suele usar 433.475.":
    "FM and digital repeaters (DMR, Fusion, D-Star, M17). FM calling: 446.000 (Americas) / 433.500 (Europe). M17 often uses 433.475.",
  "Satélites meteorológicos (NOAA APT analógicos y Meteor LRPT digitales), la Estación Espacial y satélites de aficionados. Sólo se oyen cuando pasan por encima (usa una app de pases como «Heavens-Above»).":
    "Weather satellites (analog NOAA APT and digital Meteor LRPT), the Space Station and amateur satellites. Only heard while they pass overhead (use a pass-prediction app such as “Heavens-Above”).",
  "Canales de los trenes de carga y pasajeros en Norteamérica (160.215–161.565 MHz). Muchas líneas pasaron a NXDN digital: usa el modo «Digital» si oyes «ruido de datos».":
    "Freight and passenger train channels in North America (160.215–161.565 MHz). Many lines moved to digital NXDN: use “Digital” mode if you hear “data noise”.",
  "Empresas, seguridad privada, bomberos, ambulancias, municipios, taxis, buscapersonas. Muchos ya son digitales (DMR, NXDN, P25) y algunos cifrados (ésos no se pueden oír).":
    "Businesses, private security, fire, ambulances, municipalities, taxis, pagers. Many are digital now (DMR, NXDN, P25) and some are encrypted (those can't be heard).",
  "Comercios, fábricas, hoteles, seguridad, transporte. Mezcla de FM analógico y digital (DMR, NXDN).":
    "Shops, factories, hotels, security, transport. A mix of analog FM and digital (DMR, NXDN).",
  "Sistemas troncalizados de seguridad pública. Los canales de voz cambian en cada llamada: para seguirlos se necesita un decodificador de trunking (el panel decodifica P25 en un canal fijo). Mucho tráfico policial está cifrado.":
    "Public-safety trunked systems. Voice channels change on every call: following them needs a trunking decoder (the panel decodes P25 on a fixed channel). Much police traffic is encrypted.",
  "Hospitales, bomberos, técnicos y alarmas. Se leen como texto en Decodificar → Mensajes. Las frecuencias son locales: busca ráfagas que suenan como «brrrrt» rítmico.":
    "Hospitals, fire departments, technicians and alarms. Read as text in Decode → Messages. Frequencies are local: look for bursts that sound like a rhythmic “brrrrt”.",
  "Emisoras de FM (con RDS: nombre de la emisora y canción en el receptor avanzado).":
    "FM broadcast stations (with RDS: station name and song in the advanced receiver).",
  "Emisoras de AM (530–1700 kHz). Requiere el RTL-SDR Blog V4 y una antena de cable largo; de noche se oyen emisoras lejanas.":
    "AM broadcast stations (530–1700 kHz). Requires the RTL-SDR Blog V4 and a long-wire antenna; at night you can hear distant stations.",
  "Emisoras de todo el mundo (49 m, 41 m, 31 m, 25 m…). Requiere el V4 y una antena de cable de 10 m o más. Mejor de noche en las bandas bajas y de día en las altas.":
    "Stations from all over the world (49 m, 41 m, 31 m, 25 m…). Requires the V4 and a wire antenna of 10 m or more. Lower bands work best at night, higher bands by day.",

  // scan ranges
  "toda la banda aérea 118–137 MHz": "the whole airband 118–137 MHz",
  "banda UHF militar 225–400 MHz": "military UHF band 225–400 MHz",
  "toda la banda de 2 m": "the whole 2 m band",
  "toda la banda de 70 cm": "the whole 70 cm band",
  "91 canales AAR": "91 AAR channels",
  "851–869 MHz (bajada)": "851–869 MHz (downlink)",
  "530–1700 kHz (paso 10 kHz)": "530–1700 kHz (10 kHz step)",
  "banda de 49 m": "49 m band",

  // channel names
  "Canal 06 · seguridad": "Channel 06 · safety",
  "Canal 09 · llamada": "Channel 09 · calling",
  "Canal 13 · puente": "Channel 13 · bridge",
  "Canal 16 · socorro": "Channel 16 · distress",
  "MURS 4 (azul)": "MURS 4 (blue)",
  "MURS 5 (verde)": "MURS 5 (green)",
  "CB 9 · emergencias": "CB 9 · emergency",
  "CB 19 · carreteras": "CB 19 · highway",
  "DSC canal 70": "DSC channel 70",
  "Emergencia internacional": "International emergency",
  "Aire-aire (océanos)": "Air-to-air (oceanic)",
  "Aire-aire privado": "Private air-to-air",
  "Helicópteros (EE. UU.)": "Helicopters (US)",
  "ACARS (datos)": "ACARS (data)",
  "VDL modo 2 (datos)": "VDL mode 2 (data)",
  "Guardia militar (emergencia)": "Military guard (emergency)",
  "Búsqueda y rescate (OTAN)": "Search and rescue (NATO)",
  "Llamada FM (América)": "FM calling (Americas)",
  "Llamada FM (Europa)": "FM calling (Europe)",
  "APRS (América)": "APRS (Americas)",
  "APRS (Europa)": "APRS (Europe)",
  "ISS voz": "ISS voice",
  "SSB llamada": "SSB calling",
  "D-Star llamada (Europa)": "D-Star calling (Europe)",
  "DMR simplex (Europa)": "DMR simplex (Europe)",
  "M17 llamada": "M17 calling",
  "Satélite SO-50": "Satellite SO-50",
  "ISS repetidor bajada": "ISS repeater downlink",
  "929.6125 (América)": "929.6125 (Americas)",
  "931.9375 (América)": "931.9375 (Americas)",
  "466.075 (Europa)": "466.075 (Europe)",
  "169.650 (Europa)": "169.650 (Europe)",
});

I18N.addPatterns([
  [/^Canal (\d+[A-Z]?)$/, "Channel $1"],                                   // marine and FRS channel names
  [/^Entrada repetidora (\d+)R$/, "Repeater input $1R"],                   // GMRS repeater inputs (canales.js)
]);
I18N.add({
  "Voz con scrambler": "Scrambled voice",
  "Desinvertir voz": "Descramble voice",
  "Apagado": "Off",
  "Si la voz suena «de pato», el walkie tiene activado el scrambler por inversión. Prueba valores hasta que se entienda. También desinvierte las grabaciones.":
    "If the voice sounds like a duck, the walkie-talkie has its inversion scrambler on. Try values until it's clear. Recordings are descrambled too.",
  "Desinvirtiendo la voz en {f} Hz. Si aún no se entiende, prueba otro valor.": "Descrambling the voice at {f} Hz. If it's still unclear, try another value.",
  "Desinversión de voz apagada.": "Voice descrambling off.",
});
