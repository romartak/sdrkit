/* SDR-Kit · Ayuda: un botón ⓘ en cada parte del panel que explica qué es, para qué sirve y cómo usarlo */
"use strict";
const Help = (() => {
  // t = título · p = para qué sirve · u = cómo se usa (lista) · c = consejo
  const H = {
    inicio: {t: "Bienvenido a SDR-Kit", p: "Tu Raspberry Pi con un dongle SDR es un analizador de espectro, un radio que escucha casi todo de 0.5 a 1766 MHz y un decodificador de señales digitales, manejado desde el celular.",
      u: ["<b>Analizador:</b> mira qué frecuencias tienen actividad. Desliza el sintonizador y pulsa «Escuchar».",
        "<b>Radio:</b> escucha, graba, detecta subtonos y decodifica voz digital.",
        "<b>Decodificar:</b> mensajes de texto (buscapersonas, APRS), sensores de 433 MHz y aviones.",
        "<b>Grabaciones:</b> todo lo que grabaste, ordenado por día.",
        "<b>Más → Canales:</b> todos los canales de PMR, FRS, marina, aviación, CB… listos para escuchar o escanear."],
      c: "El dongle sólo hace una cosa a la vez: al cambiar de pestaña-función, el panel lo cambia de modo solo. Toca cualquier <b>ⓘ</b> para saber qué hace cada parte."},
    espectro: {t: "Espectro y cascada", p: "Arriba ves la potencia de cada frecuencia (eje horizontal = frecuencia, vertical = nivel). Abajo, la cascada guarda la historia: cada línea nueva es un barrido, los colores cálidos son señales fuertes.",
      u: ["Un pico estable es una emisora o un transmisor continuo.", "Una mancha que aparece y desaparece en la cascada es alguien hablando por radio (walkie, repetidora).",
        "Bloques anchos y planos son señales digitales (TV, celular, WiFi).", "Toca o arrastra sobre el gráfico para poner el marcador, o usa el sintonizador de abajo sin tocar el gráfico.", "Doble toque = acercar (zoom)."],
      c: "Si todo se ve «lleno de picos» en todas partes, baja la ganancia: el dongle se está saturando."},
    lecturas: {t: "Lecturas de arriba", p: "Resumen de lo que estás viendo.",
      u: ["<b>Inicio / Centro / Fin / Span:</b> la porción del espectro en pantalla.", "<b>RBW:</b> resolución: la señal más angosta que se distingue. Más chica = más detalle pero barrido más lento.",
        "<b>Barrido:</b> cuánto tarda en recorrer todo el span.", "<b>Ganancia:</b> amplificación del dongle.", "<b>Pico:</b> la señal más fuerte en pantalla."]},
    tuner: {t: "Sintonizador", p: "Elige la frecuencia que quieres escuchar sin tocar el gráfico: con botones, deslizando o escribiendo el número.",
      u: ["<b>− / +</b>: baja o sube un paso. <b>Mantén pulsado</b> y avanza solo, cada vez más rápido.", "<b>Número grande:</b> tócalo y escribe la frecuencia exacta en MHz (ej. 446.00625). Si queda fuera de la pantalla, la vista viaja hasta ella.",
        "<b>Deslizador:</b> recorre todo lo que está en pantalla; salta de paso en paso (12.5 kHz por defecto).", "<b>⏮ Señal / Señal ⏭:</b> saltan directo a la señal activa anterior o siguiente (lo que sobresale del ruido). Si no hay más en pantalla, mueve la vista.",
        "<b>Chips de abajo:</b> todas las señales activas que hay en pantalla; toca una para ir a ella.", "<b>Paso:</b> 12.5 kHz para walkies y repetidoras, 25 kHz aviación (8.33 en Europa), 100 kHz FM comercial, 10 kHz AM.",
        "<b>Modo:</b> «Auto» elige según la banda; «Digital» para DMR, P25, D-Star, Fusion, NXDN, dPMR o M17.", "<b>Señal activa si:</b> cuánto debe sobresalir del ruido para contar como señal (+6 dB = encuentra hasta las débiles).",
        "<b>🎧 Escuchar esta frecuencia:</b> abre el Radio exactamente ahí."],
      c: "En computadora: flechas ← → mueven un paso, Mayús + flecha salta de señal en señal, Enter escucha."},
    marcadores: {t: "Marcadores", p: "Marcan frecuencias para leer su nivel exacto y comparar señales, como en un analizador de laboratorio.",
      u: ["Hasta 4 marcadores (M1–M4). El activo es el que mueven el sintonizador y los toques.", "<b>▲ Pico:</b> va a la señal más fuerte. <b>◀ Pico / Pico ▶:</b> el pico más cercano a cada lado. <b>Sig. pico:</b> recorre los picos de mayor a menor.",
        "<b>⟳ Seguir:</b> el marcador persigue a la señal en cada barrido (M1 sigue al pico más alto).", "<b>Δ:</b> muestra la diferencia de frecuencia y nivel contra M1 (ej. separación entre canales, supresión de armónicos).",
        "<b>⏱ Span cero:</b> ve esa frecuencia en el tiempo (pulsos). <b>★:</b> guárdala en memorias. <b>🎧:</b> escúchala."]},
    modos: {t: "Barrido o span cero", p: "Dos formas de mirar: <b>Barrido</b> recorre un rango de frecuencias (lo normal). <b>Span cero</b> se queda en UNA frecuencia y dibuja su potencia en el tiempo, como un osciloscopio de RF.",
      u: ["Banda rápida: atajos a bandas conocidas.", "Inicio/Fin o Centro/Span: escribe el rango y pulsa Aplicar.",
        "Span cero: frecuencia, RBW (ancho del filtro), tiempo en pantalla y disparo.", "Disparo «por nivel»: la imagen se congela cuando la señal pasa el nivel: así ves pulsos de controles remotos alineados."],
      c: "El span cero con 50 ms y disparo por nivel muestra los bits de un control de portón o de un timbre de 433 MHz."},
    receptor: {t: "Receptor de barrido", p: "Cómo «escucha» el dongle durante el barrido.",
      u: ["<b>Ganancia:</b> amplificación. Alta = ves señales débiles; demasiado alta = saturación y señales falsas. Empieza en 29.7 dB.", "<b>Detalle:</b> Rápido (barre veloz), Normal o Fino (más resolución, más lento).",
        "<b>Puntos:</b> cuántas columnas tiene el gráfico.", "<b>Detector:</b> «Pico» muestra el máximo de cada punto (no se te escapa nada, ideal para buscar). «Promedio» da la potencia real (úsalo para medir). «Muestra» es intermedio."]},
    trazas: {t: "Trazas y escala", p: "Capas extra sobre el espectro, como en los analizadores profesionales.",
      u: ["<b>Máx.:</b> recuerda el nivel más alto visto (atrapa transmisiones cortas).", "<b>Mín.:</b> el más bajo (piso de ruido real).", "<b>Promedio:</b> suaviza el ruido.",
        "<b>Persistencia:</b> dibuja dónde cae la señal con más frecuencia (colores = repeticiones): revela señales intermitentes escondidas en el ruido.", "<b>Guardar ref. / Ver ref.:</b> congela una traza para comparar antes/después (ej. con y sin filtro).",
        "<b>Normalizar:</b> resta la referencia: muestra sólo la diferencia (medir filtros o antenas con una fuente de ruido).", "<b>Escala auto / niveles:</b> ajusta la altura del gráfico. <b>Pausa / Barrido único:</b> congela la imagen.", "<b>📷 / CSV:</b> guarda imagen o datos para Excel."]},
    mediciones: {t: "Mediciones automáticas", p: "El panel calcula lo que mediría un analizador de banco sobre la señal del marcador activo (o la más fuerte).",
      u: ["<b>Potencia de canal:</b> energía total dentro de un canal.", "<b>OBW 99 %:</b> ancho que contiene el 99 % de la energía (cuánto espectro ocupa una emisión).",
        "<b>Ancho a −3/−6/−20/−26 dB:</b> ancho de banda medido a esos niveles.", "<b>ACPR:</b> cuánto «se derrama» un transmisor en los canales vecinos (dBc).",
        "<b>SNR y densidad de ruido:</b> qué tan limpia llega la señal.", "<b>Contador de frecuencia:</b> frecuencia exacta de una portadora (con interpolación).",
        "<b>Armónicos y THD:</b> mide 2º–5º armónicos de un transmisor.", "<b>Pulsos:</b> en span cero: ancho, período y ciclo de trabajo."],
      c: "Para potencias exactas usa el detector «Promedio» y zoom sobre la señal."},
    unidades: {t: "Unidades, calibración y convertidor", p: "Por defecto los niveles son relativos (dBFS). Con una señal de nivel conocido puedes calibrar y leer dBm reales.",
      u: ["Pon el marcador sobre la señal de referencia, escribe su nivel real y pulsa Calibrar.", "dBµV y dBmV se calculan para 50 Ω.",
        "<b>Convertidor:</b> si usas un up-converter (HF) o un LNB, escribe su frecuencia para ver las frecuencias reales."],
      c: "La calibración vale para la ganancia con la que la hiciste. El RTL-SDR no es un instrumento de laboratorio: espera ±2–3 dB."},
    limite: {t: "Línea límite (pasa / falla)", p: "Marca un nivel máximo y/o mínimo: el panel avisa «FALLA» si algo lo cruza.",
      u: ["Útil para revisar que tu transmisor no se pase, o para detectar cuando aparece una señal.", "«Pitido» suena en el celular al fallar.", "«Vigilar en la Raspberry» deja la alarma funcionando aunque cierres el panel."]},
    vigilancia: {t: "Vigilancia 24/7 y ocupación", p: "La Raspberry sigue barriendo sola, guarda cuánto se usa cada frecuencia y anota alarmas, aunque nadie tenga el panel abierto.",
      u: ["Alarma si supera: nivel que dispara una alarma (en las unidades de pantalla).", "Registro cada: cada cuánto guarda una fila de ocupación.",
        "El mapa de colores muestra el tiempo (arriba lo más reciente) contra la frecuencia: descubre a qué horas se usa cada canal.", "Aviso al celular: con la app gratuita «ntfy» y NTFY_TOPIC en sdrkit.conf te llega una notificación."]},
    estados: {t: "Configuraciones guardadas", p: "Guarda la banda, unidades, mediciones y límites para volver a ellos con un toque.", u: ["Se guardan en este celular/navegador."]},
    picos: {t: "Picos detectados", p: "Las señales más fuertes de la pantalla, con su frecuencia y nivel.", u: ["Toca la frecuencia para poner el marcador; 🎧 para escucharla."]},
    radio: {t: "Radio", p: "Escucha cualquier frecuencia en el celular: walkie-talkies, repetidoras, aviación, marina, FM, AM, onda corta y voz digital.",
      u: ["Toca el número para escribir la frecuencia. <b>− / +</b> mueven un paso (mantén pulsado para avanzar solo).", "<b>⏮ / ⏭ Buscar señal:</b> como el «seek» de un autorradio: busca la próxima frecuencia con actividad (por encima del squelch).",
        "<b>Modos:</b> FM (walkies, repetidoras), FM ancha (canales de 25 kHz), WFM (emisoras FM), AM (aviación, onda media, CB), USB/LSB (radioaficionados en HF), Digital (DMR, P25, D-Star, Fusion, NXDN, dPMR, M17).",
        "<b>▶ Escuchar:</b> el audio sale por este celular. Puedes bloquear la pantalla."],
      c: "Si una señal suena como «ruido de fax» o zumbido rítmico, es digital: el panel te avisará y te ofrecerá decodificarla."},
    squelch: {t: "Señal y silenciador (squelch)", p: "El medidor muestra la fuerza de la señal. El squelch silencia el ruido cuando nadie habla.",
      u: ["Mueve la barra justo por encima del ruido: el audio se abre sólo cuando hay señal.", "«Auto» lo ajusta solo; «Abrir» lo desactiva.", "Ganancia: igual que en el analizador.", "🎯 Modo cazador: pantalla grande con pitido para buscar de dónde viene una señal."]},
    panorama: {t: "Panorama", p: "El espectro alrededor de la frecuencia que escuchas (±96 kHz) con su cascada.", u: ["La franja amarilla es el canal que estás escuchando.", "Toca el panorama para saltar a otra señal cercana."]},
    subtonos: {t: "Subtonos CTCSS, DCS y DTMF", p: "Muchos walkies y repetidoras usan un tono oculto (subtono) para «abrir» sólo con su grupo. El panel lo mide mientras alguien habla.",
      u: ["<b>CTCSS:</b> tono analógico (67–254 Hz).", "<b>DCS:</b> código digital (ej. D023N).", "<b>DTMF:</b> las teclas que marcan (como en un teléfono)."],
      c: "Configura ese mismo subtono en tu radio para escuchar o hablar con ese grupo (si estás autorizado a transmitir)."},
    dsd: {t: "Voz digital (DSD-FME)", p: "Convierte en voz las radios digitales sin cifrar: DMR (MotoTRBO, Hytera), P25, D-Star, Yaesu Fusion, NXDN, dPMR y M17.",
      u: ["«Auto» reconoce DMR, P25 fase 1, D-Star y Fusion. NXDN, dPMR y M17 hay que elegirlos.", "Verás el sistema, el grupo (talkgroup) o destino, el ID o indicativo de quien habla y el color code o NAC.",
        "Si sale «cifrada», nadie sin la clave puede oírla (y no se debe intentar).", "Necesita DSD-FME instalado (opción INSTALL_DSD del instalador)."],
      c: "Aviso legal: los códecs AMBE/IMBE están patentados. DSD-FME es software libre para estudio y uso personal; revisa la ley de tu país. La alternativa con licencia es una llave AMBE3000 en el receptor avanzado."},
    datos: {t: "Datos digitales en esta frecuencia", p: "Decodifica mensajes de texto mientras escuchas: buscapersonas (POCSAG/FLEX), APRS, alertas EAS, selcall, Morse y FMS.",
      u: ["Toca los tipos que quieres activar.", "Funciona aunque nadie escuche y con el squelch cerrado.", "Todo queda guardado en Decodificar → Mensajes y se exporta a Excel."]},
    grabar: {t: "Grabar", p: "Guarda lo que escuchas en archivos de audio (WAV) en la microSD.",
      u: ["«Grabar ahora» graba hasta que lo detengas.", "«Automático» crea un archivo por cada transmisión (con frecuencia, hora y subtono), aunque cierres el celular."]},
    escaner: {t: "Escáner", p: "Recorre muchos canales muy rápido y se detiene donde alguien habla.",
      u: ["<b>Memorias:</b> escanea un grupo de tus memorias.", "<b>Servicio:</b> todos los canales de PMR, FRS, marina, aviación, CB… con un toque.",
        "<b>Rango:</b> de una frecuencia a otra con el paso que elijas.", "⏭ Saltar sigue buscando; 🚫 ignora ese canal 10 min."],
      c: "Mide hasta 70 canales cercanos a la vez: un grupo de 22 canales se revisa en ~40 ms."},
    memorias: {t: "Memorias", p: "Tus frecuencias favoritas, ordenadas por grupos.", u: ["★ guarda la actual.", "Exportar/Importar en archivo para respaldarlas o compartirlas.", "Toca una para escucharla."]},
    mensajes: {t: "Mensajes digitales", p: "Lee el texto que viaja por radio: buscapersonas de hospitales y técnicos (POCSAG/FLEX), posiciones y mensajes de radioaficionados (APRS), alertas meteorológicas (EAS).",
      u: ["Elige qué escuchar (o escribe la frecuencia) y pulsa ▶ Decodificar.", "Los mensajes aparecen a la derecha y se guardan; descárgalos en CSV.", "Las estaciones APRS con posición aparecen en el radar de Aviones."]},
    sensores: {t: "Sensores inalámbricos (rtl_433)", p: "Reconoce más de 200 aparatos que transmiten en 315/433/868/915 MHz: estaciones meteorológicas, termómetros, sensores de presión de llantas (TPMS), timbres, sensores de puertas, medidores.",
      u: ["Elige la banda (433 MHz es la más común) y pulsa ▶.", "Cada aparato aparece como una tarjeta con sus datos (temperatura, humedad, presión, batería…)."],
      c: "En una zona residencial aparecen en minutos; las llantas TPMS de autos que pasan, en segundos."},
    adsb: {t: "Radar de aviones (ADS-B)", p: "Los aviones transmiten su posición, altura y velocidad en 1090 MHz. El panel los dibuja en un radar sin necesidad de internet.",
      u: ["Pulsa ▶ y espera 10–60 s.", "Rojo = emergencia (squawk 7700), sin radio (7600) o interferencia ilícita (7500).", "Guarda tu ubicación para ver distancias y rumbos reales."],
      c: "Antena vertical de 6.9 cm lo más alta posible; con vista despejada se ven aviones a 200–300 km."},
    ubicacion: {t: "Tu ubicación", p: "El centro del radar.", u: ["Escribe latitud y longitud en grados decimales (cópialas de Google Maps manteniendo pulsado tu punto).", "El GPS del celular sólo funciona en páginas https."]},
    todos: {t: "Todos los modos", p: "La lista completa de lo que este equipo puede decodificar, y si quedó instalado.",
      u: ["«En este panel» funcionan aquí mismo.", "«En el receptor avanzado» se abren en OpenWebRX+ (otra página), que tiene decenas de decodificadores más: RDS, AIS, ACARS, VDL2, HFDL, radiosondas, FT8, SSTV, FAX, DRM, DAB, HD Radio…"]},
    vozdigital: {t: "Voz digital: qué se puede y qué no", p: "Resumen honesto de la voz digital.",
      u: ["En el panel: DMR, P25, D-Star, Fusion, NXDN, dPMR y M17 con DSD-FME (opcional).", "En el receptor avanzado: los mismos con una llave AMBE3000 (camino con licencia).",
        "Imposible con cualquier equipo: voz cifrada (AES, ARC4, TETRA con TEA), celulares, WiFi o Bluetooth cifrados."]},
    grabaciones: {t: "Grabaciones", p: "Todos los audios grabados, por día, con frecuencia, duración y subtono.", u: ["▶ escucha, ⬇ descarga, selecciona varias para bajar un ZIP o borrarlas.", "Busca por frecuencia, nombre o tono."]},
    actividad: {t: "Registro de actividad", p: "Cada transmisión que el radio o el escáner detectan queda anotada aunque no grabes: hora, frecuencia, duración, nivel, tono y tipo digital.", u: ["Descárgalo en CSV para Excel.", "🎧 vuelve a esa frecuencia."]},
    paises: {t: "Tu país", p: "Elige tu país y el panel te muestra lo que corresponde allí: qué walkie-talkies sin licencia se usan, las bandas de radioaficionado, dónde están las salidas de las repetidoras y qué subtonos suelen usar.",
      u: ["Los servicios propios de tu país aparecen primero en la lista de abajo; los de otros países, más tenues.", "«📡 Buscar» escanea las salidas de repetidoras de esa banda: el escáner se detiene en cada una que esté activa.",
        "En el Radio verás el subtono (CTCSS) o código DCS de la repetidora y su <b>código de walkie</b> (1–38).", "Anota cada repetidora que encuentres en «Mis repetidoras» con su subtono y desplazamiento: quedan en tus memorias, en el grupo «Repetidoras» + el código del país."],
      c: "Las bandas, desplazamientos y subtonos mostrados son los habituales de cada región; cada repetidora puede ser distinta. El panel no inventa listas de repetidoras: las que guardes son las que tú comprobaste."},
    canales: {t: "Servicios y canales", p: "Los planes de canales completos de cada servicio de radio, para escuchar todo sin buscar frecuencias.",
      u: ["Toca un servicio: verás qué es, quién lo usa y todos sus canales.", "Toca un canal para escucharlo, o «Escanear» para recorrer el servicio entero.", "«Guardar como grupo» lo agrega a tus memorias.", "Los servicios de otra región aparecen más tenues."],
      c: "Revisa siempre las leyes de tu país: escuchar suele estar permitido; transmitir en estos servicios necesita radios homologadas o licencia."},
    guia: {t: "Guía de frecuencias", p: "Frecuencias útiles por categoría, con acceso directo al radio (🎧) o al analizador (📈)."},
    tablas: {t: "Tablas de subtonos", p: "Los 50 subtonos CTCSS estándar y los 104 códigos DCS con su equivalente invertido, para configurar radios."},
    antenas: {t: "Calculadora de antenas", p: "Medidas para construir antenas caseras para la frecuencia que elijas: dipolo, vertical con plano de tierra, J-pole, Yagi, discone, de lazo y para ADS-B.",
      u: ["Escribe la frecuencia o toca un atajo.", "Corta un poco más largo y ajusta mirando el analizador con «Máx.»."]},
    cable: {t: "Pérdida del cable", p: "Cuánta señal se pierde en el cable coaxial según tipo, largo y frecuencia.", c: "En UHF el cable delgado pierde mucho: mejor acerca el dongle a la antena con una extensión USB."},
    owrx: {t: "Receptor avanzado (OpenWebRX+)", p: "Otro programa, más pesado, con cascada grande y muchísimos decodificadores (AIS, ACARS, FT8, SSTV, FAX, DRM, DAB…).", u: ["Al abrirlo se pausa el panel: el dongle sólo puede usarlo uno a la vez."]},
    wifi: {t: "WiFi", p: "La Raspberry se conecta a tus redes conocidas; si no encuentra ninguna, crea su propio hotspot.",
      u: ["Agrega el WiFi de tu casa o el hotspot de tu celular para tener acceso remoto (con Tailscale, desde cualquier lugar).", "«Usar hotspot propio» lo fuerza; «Buscar WiFi conocida» vuelve al modo automático."]},
    actualizar: {t: "Actualizaciones", p: "Trae la versión más nueva del proyecto desde GitHub sin borrar nada tuyo.",
      u: ["Funciona cuando la Raspberry tiene internet (WiFi de casa o hotspot del celular).", "«Buscar» muestra la versión nueva y la lista de cambios; «Actualizar ahora» la instala (≈1 minuto, el panel se reinicia).",
        "Tu configuración, grabaciones, memorias y registros no se tocan.", "Si la versión nueva no arranca, vuelve sola a la anterior. También puedes volver a mano por SSH: sudo sdrkit volver."],
      c: "Por SSH es lo mismo: sudo sdrkit actualizar"},
    sistema: {t: "Sistema", p: "Estado de la Raspberry: temperatura, CPU, memoria, energía y direcciones para entrar.",
      u: ["«BAJO VOLTAJE»: usa un cable USB más corto/grueso o una batería de mejor calidad (5 V 2.5 A).", "Apaga desde aquí antes de desconectar la batería."]},
  };
  const ANCHORS = [
    ["tuner", "#tnFreq"], ["modos", "#anMode"], ["receptor", "#inDet"], ["trazas", "#tgMax"], ["mediciones", "#inMeas"], ["unidades", "#inUnit"],
    ["limite", "#limUp"], ["vigilancia", "#monOn"], ["estados", "#stSave"], ["picos", "#peakRows"],
    ["squelch", "#rSq"], ["panorama", "#pan"], ["subtonos", "#dCtcss"], ["dsd", "#dsdModes"], ["datos", "#rData"], ["grabar", "#rRec"],
    ["escaner", "#scStart"], ["memorias", "#memList"], ["mensajes", "#dmKinds"], ["sensores", "#snPreset"], ["adsb", "#radar"],
    ["ubicacion", "#adLat"], ["todos", "#allList"], ["vozdigital", "#ambeState"], ["grabaciones", "#recSearch"], ["actividad", "#actTable"],
    ["canales", "#chServices"], ["guia", "#refTable"], ["tablas", "#ctcssGrid"], ["tablas", "#dcsGrid"], ["antenas", "#antF"], ["cable", "#cabT"],
    ["owrx", "#btnRxOpen"], ["wifi", "#btnHotspot"], ["sistema", "#tiles"], ["actualizar", "#btnUpdCheck"],
  ];
  // English sheets live in lang-en-help.js (I18N.data.help, same keys); missing fields fall back to Spanish
  function entry(k) {
    const es = H[k]; if (!es) return null;
    const en = I18N.lang === "en" && I18N.data.help && I18N.data.help[k];
    return en ? Object.assign({}, es, en) : es;
  }
  const btn = (k, cls) => `<button type="button" class="infobtn${cls ? " " + cls : ""}" data-info="${k}" aria-label="${_t("¿Qué es esto?")}">i</button>`;
  function attach() {
    for (const [k, sel] of ANCHORS) {
      const el = $(sel); if (!el) continue;
      const card = el.closest("details.card, .card") || el.closest(".sub");
      if (!card || card.querySelector(`[data-info="${k}"]`)) continue;
      const h = card.querySelector(":scope > h3, :scope > summary");
      if (h) h.insertAdjacentHTML("beforeend", btn(k));
      else card.insertAdjacentHTML("afterbegin", btn(k, "abs"));
    }
    const radio = $("#radioMain"); if (radio && !radio.querySelector('[data-info="radio"]')) radio.insertAdjacentHTML("afterbegin", btn("radio", "abs"));
    $(".legend").insertAdjacentHTML("beforeend", btn("espectro", "inl"));
    $(".readout").insertAdjacentHTML("beforeend", `<div class="roinfo">${btn("lecturas", "inl")}</div>`);
    const mk = $(".markerbar .mk"); if (mk) mk.insertAdjacentHTML("afterbegin", btn("marcadores", "abs"));
    $(".brand").insertAdjacentHTML("afterend", `<button type="button" class="hbtn" data-info="inicio" aria-label="${_t("Ayuda")}">?</button>`);
  }
  function open(k) {
    const h = entry(k); if (!h) return;
    $("#helpTitle").textContent = h.t;
    $("#helpBody").innerHTML = (h.p ? `<p>${h.p}</p>` : "") + (h.u ? `<h4>${_t("Cómo se usa")}</h4><ul>${h.u.map(x => `<li>${x}</li>`).join("")}</ul>` : "") +
      (h.c ? `<div class="helptip">💡 ${h.c}</div>` : "");
    $("#helpSheet").classList.remove("hidden");
    $("#helpClose").focus();
  }
  function close() { $("#helpSheet").classList.add("hidden"); }
  function init() {
    attach();
    document.addEventListener("click", ev => {
      const b = ev.target.closest("[data-info]");
      if (b) { ev.preventDefault(); ev.stopPropagation(); open(b.dataset.info); }
    }, true);
    $("#helpSheet").addEventListener("click", ev => { if (ev.target.id === "helpSheet") close(); });
    $("#helpClose").addEventListener("click", close);
    document.addEventListener("keydown", ev => { if (ev.key === "Escape") close(); });
  }
  return {init, open, H};
})();
SDR.modules.help = Help;
