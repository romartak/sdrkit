/* SDR-Kit · Roadmap: lo que viene (misma lista que ROADMAP.md; tests/test_roadmap.py las compara).
 * Cada función va en una línea: [número, estado, nombre, qué hará]. Estado: done | part | todo.
 * El inglés está en lang-en-roadmap.js (I18N.data.roadmap), con las mismas claves. */
"use strict";
const Roadmap = (() => {
  const PHASES = [
    [1, "Sacarle más jugo a lo que ya existe", [
      [1, "done", "Repetición instantánea", "«⏪ ¿Qué dijo?»: repite los últimos 30 s que se oyeron."],
      [2, "done", "Panel del negocio", "Gráficos de actividad del radio por hora y por día, canal más usado."],
      [3, "todo", "Alertas de aviones", "Aviso por emergencias (7700/7600/7500), militares y helicópteros cerca."],
      [4, "done", "Mapa de barcos (AIS)", "Barcos en un mapa sin internet, como el radar de aviones."],
      [5, "todo", "Home Assistant (MQTT)", "Sensores, aviones y actividad del radio en tu casa inteligente."],
      [6, "todo", "App instalable (PWA)", "El panel se instala en el celular y avisa como una app."],
      [7, "todo", "Resumen diario por Telegram", "Bot opcional que manda cada día el resumen de actividad."],
      [8, "todo", "Usuario de solo escucha", "Segunda contraseña: escucha y ve todo, pero no cambia ni borra nada."],
    ]],
    [2, "Herramientas de campo", [
      [9, "todo", "Prueba de interferencias", "Asistente que dice si hay ruido, otra emisora o saturación."],
      [10, "todo", "Barrido de seguridad", "Busca señales sospechosas (micrófonos, rastreadores) contra una línea base."],
      [11, "todo", "Cazador con brújula", "Dibuja hacia dónde está el transmisor con la brújula del celular."],
      [12, "todo", "Mapa de cobertura caminando", "Pinta en un mapa el nivel de una frecuencia mientras caminas."],
      [13, "todo", "Medidor de antena (SWR) casero", "Curva de retorno y frecuencia de resonancia de tu antena."],
      [14, "todo", "Identificador de señales mejorado", "Reconoce más tipos de señal (DMR, P25, LoRa, POCSAG, portones…)."],
    ]],
    [3, "Casa inteligente y sensores", [
      [15, "todo", "Medidores de agua, luz y gas", "Lectura de medidores por radio con gráfico de consumo."],
      [16, "todo", "Sensores de llantas (TPMS)", "Presión y temperatura de llantas; sigue sólo «mi carro»."],
    ]],
    [4, "Espacio y mapas", [
      [17, "todo", "Pasos de satélites e ISS", "Cálculo de pasos sin internet, aviso y grabación automática."],
      [18, "todo", "Imágenes Meteor-M", "Graba el paso de un satélite meteorológico y obtén su imagen."],
      [19, "todo", "Radiosondas", "Rastrea globos meteorológicos con su trayectoria y punto de caída."],
      [20, "todo", "Mapa combinado", "Un solo mapa con aviones, barcos, APRS, radiosondas y repetidoras."],
      [21, "todo", "Alimentar ADSBexchange / FlightAware", "Envía tus aviones a esas redes (opcional, apagado por defecto)."],
    ]],
    [5, "Radio inteligente", [
      [22, "todo", "Varios canales a la vez", "Escucha 2–3 canales a la vez, mezclados o en estéreo."],
      [23, "todo", "Quién habla", "«Huella» de cada walkie con nombre, en el radio y el registro."],
      [24, "todo", "Transcripción de voz a texto", "Transcribe las grabaciones sin internet y búscalas por texto."],
      [25, "todo", "Alertas por palabra clave", "Aviso cuando la transcripción dice «emergencia», «fuego»…"],
      [26, "todo", "Trunking", "Sigue sistemas troncalizados P25 / DMR con el decodificador opcional."],
    ]],
    [6, "Comunidad y aprendizaje", [
      [27, "todo", "Huella de radio de tu ciudad", "Mapa y calendario de qué se transmite, dónde y cuándo."],
      [28, "todo", "Modo aprendizaje (tour guiado)", "Recorridos paso a paso que explican lo que se oye y se ve."],
      [29, "todo", "Logros y retos", "Insignias por hitos: primer satélite, 100 aviones, primera repetidora…"],
      [30, "todo", "Repetidoras de la comunidad", "Lista abierta de repetidoras aportada por usuarios, por país."],
    ]],
    [7, "Hardware y plataforma", [
      [31, "todo", "Dos dongles a la vez", "Un dongle para cada función, usados al mismo tiempo."],
      [32, "todo", "Respaldo en la nube", "Copia opcional de grabaciones y configuración (Drive, Dropbox…)."],
      [33, "todo", "Más equipos: Airspy, SDRplay, Pi 5", "Soporte detectado automáticamente para más hardware."],
      [34, "todo", "Hablar por tus radios (PTT)", "Hablarle a tu equipo desde el panel, sólo con equipos y bandas autorizadas."],
    ]],
    [8, "Visión a futuro", [
      [35, "todo", "Servidor unificado (SDR-Kit Network)", "Conecta tu Pi a un servidor y escucha las Pi de todo el mundo, en todos los países."],
    ]],
  ];
  const ICON = {done: "✅", part: "◐", todo: "☐"};
  const all = () => PHASES.flatMap(p => p[2]);
  const counts = () => { const a = all(); return {done: a.filter(x => x[1] === "done").length, total: a.length}; };
  const en = () => (I18N.lang === "en" && I18N.data && I18N.data.roadmap) || null;
  const phaseName = (p) => { const e = en(); return (e && e.phases[p[0]]) || p[1]; };
  const itemText = (x) => { const e = en(), t = e && e.items[x[0]]; return {t: t ? t[0] : x[2], d: t ? t[1] : x[3]}; };
  const next = () => all().find(x => x[1] !== "done");
  return {PHASES, ICON, all, counts, phaseName, itemText, next};
})();
