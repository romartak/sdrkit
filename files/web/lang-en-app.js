/* SDR-Kit · English catalog: app (Spanish source → English). See i18n.js.
 * Strings produced by app.js: chips, toasts, prompts/confirms, advanced receiver,
 * WiFi, system tiles and updates. */
"use strict";
I18N.add({
  // ---------------------------------------------------------------- core
  "Sesión expirada": "Session expired",
  "Nombre para {f} MHz:": "Name for {f} MHz:",
  "Grupo (ej. Favoritos, Walkies, Repetidoras):": "Group (e.g. Favorites, Walkies, Repeaters):",
  "Guardada en «{g}».": "Saved to “{g}”.",

  // ---------------------------------------------------------------- header chips
  "Analizador": "Analyzer",
  "Radio": "Radio",
  "Sensores": "Sensors",
  "Aviones": "Aircraft",
  "Receptor avanzado": "Advanced receiver",
  "En reposo": "Idle",
  "Cambiando…": "Switching…",
  "📶 conectando…": "📶 connecting…",
  "Sin red": "No network",

  // ---------------------------------------------------------------- advanced receiver (OpenWebRX+)
  "OpenWebRX+ no está instalado.": "OpenWebRX+ is not installed.",
  "✅ Receptor encendido y listo.": "✅ Receiver on and ready.",
  "⏳ Receptor iniciando…": "⏳ Receiver starting…",
  "⏸ Apagado (el dongle está en modo {m}).": "⏸ Off (the dongle is in {m} mode).",
  "analizador": "analyzer",
  "radio": "radio",
  "sensores": "sensors",
  "aviones": "aircraft",
  "reposo": "idle",
  "En el modo demo no hay OpenWebRX+: en la Raspberry se abrirá aquí.": "There is no OpenWebRX+ in demo mode: on the Raspberry it opens here.",
  "OpenWebRX+ no está instalado. Revisa la guía de instalación.": "OpenWebRX+ is not installed. Check the install guide.",
  "Iniciando el receptor avanzado…": "Starting the advanced receiver…",
  "¡Listo! Abriendo…": "Ready! Opening…",
  "El receptor tarda en responder. Prueba de nuevo en unos segundos.": "The receiver is slow to respond. Try again in a few seconds.",

  // ---------------------------------------------------------------- WiFi
  "Hotspot propio «{s}» activo": "Own hotspot “{s}” active",
  "{n} dispositivo(s) conectados · panel en http://{ip} · fijo (no busca otras redes)":
    "{n} device(s) connected · panel at http://{ip} · fixed (won't look for other networks)",
  "{n} dispositivo(s) conectados · panel en http://{ip} · buscará tus redes conocidas si nadie lo usa":
    "{n} device(s) connected · panel at http://{ip} · will look for your known networks if nobody uses it",
  "Conectada a «{s}»": "Connected to “{s}”",
  "Conectando…": "Connecting…",
  "Si no encuentra una red conocida, la Raspberry crea su hotspot sola.": "If no known network is found, the Raspberry starts its own hotspot.",
  "No hay redes guardadas.": "No saved networks.",
  "conexión automática": "auto-connect",
  "manual": "manual",
  "prioridad {p}": "priority {p}",
  "Conectar": "Connect",
  "Olvidar": "Forget",
  "Escribe el nombre de la red.": "Type the network name.",
  "La Raspberry intentará conectarse a «{s}». Si lo logra, tu celular perderá la conexión actual. ¿Continuar?":
    "The Raspberry will try to connect to “{s}”. If it succeeds, your phone will lose its current connection. Continue?",
  "Conectando a «{s}»… si falla, el hotspot vuelve solo.": "Connecting to “{s}”… if it fails, the hotspot comes back by itself.",
  "Red «{s}» guardada.": "Network “{s}” saved.",
  "La Raspberry se cambiará a esa red y tu celular perderá la conexión actual. ¿Continuar?":
    "The Raspberry will switch to that network and your phone will lose its current connection. Continue?",
  "Cambiando de red… vuelve a conectarte en un minuto.": "Switching networks… reconnect in a minute.",
  "¿Olvidar la red «{s}»?": "Forget the network “{s}”?",
  "{n} red encontrada: toca el campo del nombre para elegir.": "{n} network found: tap the name field to choose it.",
  "{n} redes encontradas: toca el campo del nombre para elegir.": "{n} networks found: tap the name field to choose one.",
  "No se encontraron redes.": "No networks found.",
  "Buscar": "Scan",
  "La Raspberry encenderá su propio hotspot «{s}» y dejará la red actual. ¿Continuar?":
    "The Raspberry will turn on its own hotspot “{s}” and leave the current network. Continue?",
  "Encendiendo hotspot… conéctate a él en unos segundos.": "Turning on the hotspot… connect to it in a few seconds.",
  "Buscando redes conocidas… si no hay ninguna, el hotspot vuelve solo.": "Looking for known networks… if there are none, the hotspot comes back by itself.",

  // ---------------------------------------------------------------- system tiles and addresses
  "Sin datos": "No data",
  "BAJO VOLTAJE": "UNDERVOLTAGE",
  "Usa mejor cable/batería": "Use a better cable/battery",
  "Hubo cortes": "Past dips",
  "Bajo voltaje desde el arranque": "Undervoltage since boot",
  "CPU limitada por temperatura": "CPU throttled by heat",
  "Sin bajo voltaje": "No undervoltage",
  "No detectado": "Not detected",
  "Temperatura": "Temperature",
  "¡Caliente! Agrega disipador": "Hot! Add a heatsink",
  "carga {l}": "load {l}",
  "Memoria": "Memory",
  "de {t}": "of {t}",
  "Disco": "Disk",
  "Energía": "Power",
  "Encendida hace": "Uptime",
  "motor: {e}": "engine: {e}",
  "Versión": "Version",
  "modo demo": "demo mode",
  "Panel (mismo WiFi, iPhone/PC)": "Panel (same WiFi, iPhone/PC)",
  "Panel vía {ip}": "Panel via {ip}",
  "Receptor avanzado vía {ip}": "Advanced receiver via {ip}",

  // ---------------------------------------------------------------- updates and maintenance
  "Versión instalada: <b>{v}</b>": "Installed version: <b>{v}</b>",
  "Buscando…": "Checking…",
  "Consultando GitHub (hasta 30 s)…": "Checking GitHub (up to 30 s)…",
  "No se pudo consultar.": "Could not check.",
  "Modo demo: en la Raspberry aquí verás si hay una versión nueva y sus cambios.":
    "Demo mode: on the Raspberry you will see here whether there is a new version and what changed.",
  "✅ Estás al día (versión {v}).": "✅ You're up to date (version {v}).",
  "<b>Hay una versión nueva: {a} → {b}</b> · {n} cambio(s)": "<b>New version available: {a} → {b}</b> · {n} change(s)",
  "Necesita instalación completa (más lenta, al final se reinicia).": "Needs a full install (slower, restarts at the end).",
  "🔎 Buscar actualizaciones": "🔎 Check for updates",
  "¿Actualizar ahora? El panel se reiniciará (≈1 minuto). Tu configuración y tus grabaciones se conservan.":
    "Update now? The panel will restart (≈1 minute). Your settings and recordings are kept.",
  "Modo demo: no se actualiza nada.": "Demo mode: nothing is updated.",
  "Actualizando… no apagues la Raspberry.": "Updating… don't turn off the Raspberry.",
  "✅ Actualizado. Recargando el panel…": "✅ Updated. Reloading the panel…",
  "Revisa el registro de abajo.": "Check the log below.",
  "El panel se está reiniciando…": "The panel is restarting…",
  "¿Reiniciar la Raspberry? Tarda ~1 minuto en volver.": "Restart the Raspberry? It takes ~1 minute to come back.",
  "Reiniciando… vuelve a abrir el panel en un minuto.": "Restarting… open the panel again in a minute.",
  "¿Apagar la Raspberry? Para volver a encenderla tendrás que desconectar y conectar la batería.":
    "Shut down the Raspberry? To turn it back on you will have to unplug and reconnect the battery.",
  "Apagando… espera 20 segundos antes de desconectar la batería.": "Shutting down… wait 20 seconds before unplugging the battery.",

  // ---------------------------------------------------------------- welcome.js · welcome tour, version chip, update notices
  "Versión {v} · hay una nueva: {n}": "Version {v} · a new one is out: {n}",
  "Versión {v} · al día": "Version {v} · up to date",
  "Versión {v} · sin revisar si hay una nueva": "Version {v} · not checked for a new one yet",
  "← Atrás": "← Back",
  "Siguiente →": "Next →",
  "Empezar": "Get started",
  "Listo: te avisaremos cuando haya una versión nueva.": "Done: you'll be told when a new version is out.",
  "No se revisarán versiones nuevas. Puedes activarlo en Más → Sistema.": "New versions won't be checked. You can turn it on in More → System.",
  "¿Quieres que SDR-Kit te avise cuando se publique una versión nueva en su repositorio?":
    "Do you want SDR-Kit to tell you when a new version is published in its repository?",
  "Cómo funciona": "How it works",
  "Cuando la Raspberry está conectada a <b>tu WiFi</b> (la red de tu casa que configuraste, la misma por la que entras por SSH), revisa en GitHub si hay una versión nueva: al conectarse y luego cada 6 horas.":
    "When the Raspberry is connected to <b>your WiFi</b> (the home network you set up, the same one you use for SSH), it checks GitHub for a new version: when it connects and then every 6 hours.",
  "Si la hay, al abrir el panel te aparece un aviso con la lista de cambios. <b>Tú decides</b>: «Actualizar ahora» o «Más tarde».":
    "If there is one, a notice with the list of changes pops up when you open the panel. <b>You decide</b>: “Update now” or “Later”.",
  "Lo único automático es el aviso: <b>nunca se instala nada sin que lo confirmes</b>.":
    "Only the notice is automatic: <b>nothing is ever installed without your confirmation</b>.",
  "Con el hotspot propio de la Raspberry (sin internet) no revisa nada.": "On the Raspberry's own hotspot (no internet) nothing is checked.",
  "<b>Privacidad:</b> sólo se lee información pública del repositorio (el número de versión y la lista de cambios). No se envía nada tuyo: ni grabaciones, ni ubicación, ni contraseñas, ni configuración, ni datos personales. GitHub sólo ve la dirección IP de tu conexión, como en cualquier visita a una página web.":
    "<b>Privacy:</b> only public information from the repository is read (the version number and the list of changes). Nothing of yours is sent: no recordings, location, passwords, settings or personal data. GitHub only sees your connection's IP address, as with any visit to a web page.",
  "Puedes cambiarlo cuando quieras en Más → Sistema → Actualizaciones.": "You can change it any time in More → System → Updates.",
  "Avisos de versiones nuevas": "New version notices",
  "Ahora no": "Not now",
  "✅ Sí, avísame": "✅ Yes, tell me",
  "Bienvenido": "Welcome",
  "Tu Raspberry Pi y un dongle SDR convertidos en un laboratorio de radio de bolsillo, manejado desde el celular. Sólo recibe: escucha, mide y decodifica.":
    "Your Raspberry Pi and an SDR dongle turned into a pocket radio lab, run from your phone. It only receives: it listens, measures and decodes.",
  "Qué puedes hacer": "What you can do",
  "Mira qué frecuencias tienen actividad, mide señales y vigila 24/7.": "See which frequencies are active, measure signals and monitor 24/7.",
  "Escucha FM, AM y voz digital, detecta subtonos y escanea canales.": "Listen to FM, AM and digital voice, detect tones and scan channels.",
  "Buscapersonas, APRS, sensores de 433 MHz y radar de aviones.": "Pagers, APRS, 433 MHz sensors and an aircraft radar.",
  "Todo lo que grabas, ordenado por día, con su registro de actividad.": "Everything you record, sorted by day, with its activity log.",
  "Toca cualquier ⓘ del panel para saber qué hace cada parte, o el «?» de arriba para la guía rápida.":
    "Tap any ⓘ in the panel to learn what each part does, or the “?” at the top for the quick guide.",
  "Apoya el proyecto": "Support the project",
  "SDR-Kit es libre y gratuito. Si te gusta, dale una estrella en GitHub, compártelo o reporta lo que falle: eso ayuda a que siga mejorando.":
    "SDR-Kit is free and open source. If you like it, star it on GitHub, share it or report what breaks: that keeps it improving.",
  "Ver el repositorio en GitHub": "See the repository on GitHub",
  "Hay una versión nueva": "A new version is out",
  "Se publicó {n} cambio en el repositorio.": "{n} change was published in the repository.",
  "Se publicaron {n} cambios en el repositorio.": "{n} changes were published in the repository.",
  "La actualización tarda ≈1 minuto y el panel se reinicia. Tu configuración, grabaciones y memorias se conservan; si la versión nueva falla, vuelve sola a la anterior.":
    "The update takes ≈1 minute and the panel restarts. Your settings, recordings and memories are kept; if the new version fails, it goes back to the previous one on its own.",
  "Más tarde": "Later",
  "⬇ Actualizar ahora": "⬇ Update now",
  "Hay una versión nueva: {v}": "A new version is out: {v}",
  "Estás al día.": "You're up to date.",
  "Sin internet: no se pudo revisar.": "No internet: could not check.",
  "Todavía no se ha revisado si hay una versión nueva.": "No check for a new version has been made yet.",
  "Versión de SDR-Kit": "SDR-Kit version",
  "Última revisión: {t}": "Last check: {t}",
  "🔔 Avisos de versiones nuevas: <b>activados</b>.": "🔔 New version notices: <b>on</b>.",
  "🔕 Avisos de versiones nuevas: <b>desactivados</b>. Actívalos en Más → Sistema → Actualizaciones.":
    "🔕 New version notices: <b>off</b>. Turn them on in More → System → Updates.",
  "🔎 Buscar ahora": "🔎 Check now",
});
