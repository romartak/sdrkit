# 🗺️ SDR-Kit · Plan diario de funciones

Una función nueva por día, en este orden. Las primeras aprovechan lo que el kit ya tiene; las que dependen de otras
van después. Cada día se toma **la primera casilla ☐** de la lista.

Estado: ☐ pendiente · ◐ hecha en parte (ver nota) · ✅ terminada (fecha · versión)

## Reglas para cada tarea

1. **Termina de verdad**: funciona en el panel real **y en el modo demo** (`--demo` simula los datos que haga falta, para
   poder probarlo sin hardware).
2. **Pruebas**: pruebas automáticas nuevas en `tests/`; `pytest`, `node tests/i18n_check.mjs`, `ruff` y la prueba del
   navegador `tests/ui_smoke.mjs` en verde antes de subir.
3. **Dos idiomas**: todo texto nuevo en español (fuente) con su traducción en los catálogos `lang-en-*.js`, y su hoja de
   ayuda ⓘ en `help.js` / `lang-en-help.js`.
4. **Documentado**: entrada en `CHANGELOG.md`, y en `README.md` / `README.es.md` o `docs/` si cambia cómo se usa algo.
5. **Opcional y seguro**: lo que necesite programas extra, internet o cuentas viene **apagado** por defecto y el resto
   del kit sigue funcionando sin eso. Nunca se rompe lo que ya existe.
6. **Honesto**: si algo depende de hardware que no se puede probar, se simula, se prueba la parte de software y se dice
   claramente en la documentación qué falta verificar con hardware real.
7. **Legal**: el kit sólo recibe. Lo que toque privacidad (TPMS, medidores, monitoreo de personal) lleva su aviso; la
   única función que transmite (#34) va al final, apagada por defecto y sólo para equipos y bandas autorizadas.
8. **Publicación**: commit a nombre de `romartak <dr.robinsonsantos113@gmail.com>`, sin menciones a herramientas de IA
   en commits ni archivos; push a `main`; versión menor nueva (`VERSION`, `version()` en `sdrkit_server.py`,
   `CHANGELOG.md`) y release con el workflow **Release**. Al final, marcar aquí la casilla con fecha y versión.

## Fase 1 · Sacarle más jugo a lo que ya existe

| # | Estado | Función | Listo cuando… |
|---|---|---|---|
| 1 | ☐ | **Repetición instantánea** «⏪ ¿qué dijo?» | El radio guarda siempre los últimos 30 s en memoria y un botón los reproduce o los guarda como grabación. |
| 2 | ☐ | **Panel del negocio** | Gráficos de actividad del radio por hora y por día, canal más usado, transmisión más larga; a partir del registro de actividad. |
| 3 | ☐ | **Alertas de aviones** | Aviso (panel + ntfy) por códigos 7700/7600/7500, aviones militares o helicópteros cerca, con filtros configurables. |
| 4 | ☐ | **Mapa de barcos (AIS)** | Modo AIS con mapa sin internet como el radar de aviones (decodificador opcional, p. ej. AIS-catcher); barcos simulados en demo. |
| 5 | ☐ | **Home Assistant (MQTT)** | Sensores de 433 MHz, aviones y actividad del radio publicados por MQTT con *discovery* automático; apagado por defecto. |
| 6 | ☐ | **App instalable (PWA)** | El panel se instala en el celular, funciona sin conexión para lo estático y muestra avisos nativos cuando está abierto. |
| 7 | ☐ | **Resumen diario por Telegram** | Bot opcional (token en `sdrkit.conf`) que manda cada día el resumen de actividad y, si se quiere, grabaciones marcadas. |
| 8 | ☐ | **Usuario de solo escucha** | Segunda contraseña con permisos limitados: escucha y ve todo, pero no cambia configuración ni borra nada. |

## Fase 2 · Herramientas de campo

| # | Estado | Función | Listo cuando… |
|---|---|---|---|
| 9 | ☐ | **Prueba de interferencias** | Asistente que analiza un canal y dice si hay ruido, otra emisora, saturación o señal débil, con consejos. |
| 10 | ☐ | **Barrido de seguridad** | Modo que busca señales sospechosas que aparecen y desaparecen (micrófonos, rastreadores) y las compara con una «línea base». |
| 11 | ☐ | **Cazador con brújula** | El modo cazador usa la brújula del celular y la intensidad para dibujar hacia dónde está el transmisor. |
| 12 | ☐ | **Mapa de cobertura caminando** | Con el GPS del celular, pinta en un mapa el nivel de una frecuencia mientras caminas; exportable. |
| 13 | ☐ | **Medidor de antena (SWR) casero** | Guía y medición con fuente de ruido + puente: curva de retorno y frecuencia de resonancia en el analizador. |
| 14 | ☐ | **Identificador de señales mejorado** | El clasificador reconoce más tipos (DMR, P25, LoRa, POCSAG, portones, TV digital…) con confianza y explicación. |

## Fase 3 · Casa inteligente y sensores

| # | Estado | Función | Listo cuando… |
|---|---|---|---|
| 15 | ☐ | **Medidores de agua, luz y gas** | Lectura de medidores por radio compatibles (rtl_433 / rtlamr), con gráfico de consumo y aviso de privacidad. |
| 16 | ☐ | **Sensores de llantas (TPMS)** | Lista de sensores TPMS con presión y temperatura; marcar «mi carro» para seguir sólo los propios. |

## Fase 4 · Espacio y mapas

| # | Estado | Función | Listo cuando… |
|---|---|---|---|
| 17 | ☐ | **Pasos de satélites e ISS** | Cálculo de pasos sin internet (TLE guardados, se actualizan si hay red), aviso y grabación automática al pasar. |
| 18 | ☐ | **Imágenes Meteor-M** | Grabar el paso y obtener la imagen (decodificador opcional); en la Pi Zero se procesa después del paso. |
| 19 | ☐ | **Radiosondas** | Rastreo de globos meteorológicos (400–406 MHz) en el mapa con su trayectoria y punto de caída estimado. |
| 20 | ☐ | **Mapa combinado** | Un solo mapa con aviones, barcos, APRS, radiosondas y tus repetidoras, con capas que se encienden y apagan. |
| 21 | ☐ | **Alimentar ADSBexchange / FlightAware** | Opción de enviar los aviones decodificados a esas redes (y MLAT si aplica), apagada por defecto. |

## Fase 5 · Radio inteligente

| # | Estado | Función | Listo cuando… |
|---|---|---|---|
| 22 | ☐ | **Varios canales a la vez** | Escuchar 2–3 canales que caben en el ancho del dongle, mezclados o en estéreo izquierda/derecha. |
| 23 | ☐ | **Quién habla** | «Huella» de cada walkie (subtono, desviación, nivel, ID digital) con nombre, mostrada en el radio y el registro. |
| 24 | ☐ | **Transcripción de voz a texto** | Transcripción sin internet de las grabaciones (motor opcional tipo whisper.cpp), buscable en Grabaciones. |
| 25 | ☐ | **Alertas por palabra clave** | Aviso cuando la transcripción contiene palabras elegidas («emergencia», «fuego»…). Depende de #24. |
| 26 | ☐ | **Trunking** | Seguir sistemas troncalizados P25 / DMR (canal de control + voz) con el decodificador opcional. |

## Fase 6 · Comunidad y aprendizaje

| # | Estado | Función | Listo cuando… |
|---|---|---|---|
| 27 | ☐ | **Huella de radio de tu ciudad** | Mapa/calendario de qué se transmite, dónde y cuándo, armado con la vigilancia 24/7. |
| 28 | ☐ | **Modo aprendizaje (tour guiado)** | Recorridos paso a paso («hoy escuchamos aviones») que explican lo que se oye y se ve. |
| 29 | ☐ | **Logros y retos** | Insignias por hitos (primer satélite, 100 aviones, primera repetidora…), guardadas en la Pi. |
| 30 | ☐ | **Repetidoras de la comunidad** | Lista abierta de repetidoras (con subtono) aportada por usuarios mediante el repositorio, cargada por país en Canales. |

## Fase 7 · Hardware y plataforma

| # | Estado | Función | Listo cuando… |
|---|---|---|---|
| 31 | ☐ | **Dos dongles a la vez** | Asignar un dongle a cada función (p. ej. aviones 24/7 + radio) y usarlos al mismo tiempo. |
| 32 | ☐ | **Respaldo en la nube** | Copia opcional de grabaciones y configuración (rclone: Google Drive, Dropbox…), apagada por defecto. |
| 33 | ☐ | **Más equipos: Airspy, SDRplay, Pi 5** | Soporte detectado automáticamente, con pruebas simuladas como las de la V3. |
| 34 | ☐ | **Hablar por tus radios (PTT)** | Con un walkie conectado por audio + PTT, hablarle a tu equipo desde el panel. Apagado por defecto, con aviso legal: sólo equipos y bandas en las que tengas permiso de transmitir. |
