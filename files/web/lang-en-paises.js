/* SDR-Kit · English catalog for the country picker (paises.js) and the country-specific services in canales.js.
 * Country names come from the browser (Intl.DisplayNames); regulators, call-sign prefixes and associations are proper names. */
"use strict";
I18N.add({
  // index.html
  "🌎 Tu país": "🌎 Your country",
  "País": "Country",
  "Buscar país": "Find a country",
  "Escribe: Dominicana, México, España…": "Type: Dominican, Mexico, Spain…",
  "🔎 Decodificador de subtono": "🔎 Tone decoder",
  "Escucha una frecuencia y te dice qué subtono CTCSS o código DCS usa (y su código de walkie). Sirve para configurar tu radio y abrir una repetidora.":
    "Listens to a frequency and tells you which CTCSS tone or DCS code it uses (and its walkie-talkie code). Use it to set up your radio and open a repeater.",
  "MHz, ej. 146.940": "MHz, e.g. 146.940",
  "🎧 Escuchar y detectar": "🎧 Listen and detect",
  "— {n} país encontrado —": "— {n} country found —",
  "— {n} países encontrados —": "— {n} countries found —",
  "El decodificador funciona con el radio encendido. Escribe una frecuencia y pulsa «Escuchar y detectar», o usa «Buscar» en las repetidoras.":
    "The decoder works while the radio is on. Enter a frequency and tap “Listen and detect”, or use “Search” on the repeaters.",
  "Escuchando {f} MHz": "Listening on {f} MHz",
  "hay señal": "signal present",
  "en silencio": "quiet",
  "en {f} MHz": "on {f} MHz",
  "ahora": "now",
  "★ Usar en «Mis repetidoras»": "★ Use in “My repeaters”",
  "Escribe la frecuencia en MHz.": "Enter the frequency in MHz.",
  "Detectando el subtono en {f} MHz…": "Detecting the tone on {f} MHz…",
  "Elige primero tu país.": "Choose your country first.",
  // analyzer.js
  "🔎 Decodificar las señales de la pantalla": "🔎 Decode the signals on screen",
  "No hay señales activas en pantalla para decodificar (prueba «+6 dB»).": "No active signals on screen to decode (try “+6 dB”).",
  "Decodificando {n} señal: el radio se detiene en ella cuando transmite.": "Decoding {n} signal: the radio stops on it when it transmits.",
  "Decodificando {n} señales: el radio se detiene en cada una que transmita.": "Decoding {n} signals: the radio stops on each one that transmits.",
  // paises.js — interface
  "— Elige tu país —": "— Choose your country —",
  "Elige tu país para ver sus walkie-talkies, bandas de radioaficionado, repetidoras y subtonos.":
    "Choose your country to see its walkie-talkies, ham bands, repeaters and tones.",
  "Regulador: {r}": "Regulator: {r}",
  "Indicativos de radioaficionado: {p}": "Ham call-sign prefixes: {p}",
  "Asociación: {o}": "Association: {o}",
  "Región UIT {n}": "ITU Region {n}",
  "Walkie-talkies sin licencia": "License-free walkie-talkies",
  "No hay un servicio de walkies sin licencia en la lista para este país. La banda ciudadana CB (27 MHz) es casi universal.":
    "There is no license-free walkie-talkie service listed for this country. CB radio (27 MHz) is almost universal.",
  "Repetidoras de radioaficionados": "Ham radio repeaters",
  "Bandas: 2 m {a}–{b} MHz · 70 cm {c}–{d} MHz": "Bands: 2 m {a}–{b} MHz · 70 cm {c}–{d} MHz",
  "salidas (lo que escuchas) · entrada {o} MHz": "outputs (what you hear) · input {o} MHz",
  "📡 Buscar": "📡 Search",
  "Subtono:": "Tone:",
  "Al escuchar una repetidora, el radio mide su subtono CTCSS o código DCS y te dice el código de walkie que le corresponde. Las bandas y los desplazamientos son los habituales: confírmalos con el regulador o la asociación de tu país.":
    "While you listen to a repeater, the radio measures its CTCSS tone or DCS code and tells you the matching walkie-talkie code. Bands and offsets are the usual ones: confirm them with your country's regulator or ham association.",
  "Mis repetidoras en {p}": "My repeaters in {p}",
  "sale {o} · entra {i} MHz": "out {o} · in {i} MHz",
  "📡 Escanear mi repetidora": "📡 Scan my repeater",
  "📡 Escanear mis {n} repetidoras": "📡 Scan my {n} repeaters",
  "Aún no guardaste repetidoras de este país. Cuando encuentres una con «Buscar», anótala aquí con su subtono.":
    "You haven't saved any repeaters for this country yet. When “Search” finds one, note it here with its tone.",
  "Nombre": "Name",
  "ej. Repetidora del cerro": "e.g. Hilltop repeater",
  "Salida (MHz)": "Output (MHz)",
  "Desplazamiento (MHz)": "Offset (MHz)",
  "Subtono (Hz, código o DCS)": "Tone (Hz, code or DCS)",
  "ej. 100.0, 12 o D023N": "e.g. 100.0, 12 or D023N",
  "código {n}": "code {n}",
  "★ Guardar repetidora": "★ Save repeater",
  "Códigos de subtono de los walkies (1–38)": "Walkie-talkie tone codes (1–38)",
  "Los walkies FRS y PMR llaman «código» o «privacidad» al subtono. Los códigos 1–38 son iguales en casi todas las marcas; del 39 en adelante son DCS y cambian según el fabricante.":
    "FRS and PMR walkie-talkies call the tone a “code” or “privacy code”. Codes 1–38 are the same on almost every brand; 39 and up are DCS and differ by manufacturer.",
  "CTCSS {t} Hz (código {n})": "CTCSS {t} Hz (code {n})",
  "CTCSS {t} Hz": "CTCSS {t} Hz",
  "Escribe la frecuencia de salida en MHz.": "Enter the output frequency in MHz.",
  "Subtono no válido: escribe los Hz (ej. 100.0), el código de walkie (1–38) o un DCS (ej. D023N).":
    "Invalid tone: enter the Hz (e.g. 100.0), the walkie-talkie code (1–38) or a DCS code (e.g. D023N).",
  "Repetidora «{n}» guardada.": "Repeater “{n}” saved.",
  "Escaneando {n} repetidora.": "Scanning {n} repeater.",
  "Escaneando {n} repetidoras.": "Scanning {n} repeaters.",
  "Buscando repetidoras de {b} en {a}–{z} MHz.": "Searching for {b} repeaters on {a}–{z} MHz.",
  // radio.js
  "código walkie {n}": "walkie code {n}",

  // paises.js — plans and country notes
  "por debajo de 147 MHz la entrada está 600 kHz abajo; por encima, 600 kHz arriba":
    "below 147 MHz the input is 600 kHz lower; above it, 600 kHz higher",
  "Cada repetidora tiene su propio subtono CTCSS; los más comunes son 100.0, 103.5, 107.2, 110.9, 123.0, 127.3, 141.3 y 146.2 Hz.":
    "Every repeater has its own CTCSS tone; the most common are 100.0, 103.5, 107.2, 110.9, 123.0, 127.3, 141.3 and 146.2 Hz.",
  "Varía en cada repetidora: muchas usan un subtono CTCSS (100.0, 103.5, 110.9, 123.0 Hz…) y otras no usan ninguno.":
    "It varies by repeater: many use a CTCSS tone (100.0, 103.5, 110.9, 123.0 Hz…) and some use none.",
  "Muchas repetidoras se abren con un subtono CTCSS (a menudo 71.9, 77.0, 88.5 o 123.0 Hz) o con el tono de 1750 Hz.":
    "Many repeaters open with a CTCSS tone (often 71.9, 77.0, 88.5 or 123.0 Hz) or with a 1750 Hz tone burst.",
  "Varía en cada repetidora: muchas usan un subtono CTCSS (a menudo 88.5 Hz) o el tono de 1750 Hz.":
    "It varies by repeater: many use a CTCSS tone (often 88.5 Hz) or a 1750 Hz tone burst.",
  "Varía en cada repetidora: muchas usan un subtono CTCSS (88.5 Hz es frecuente) y otras no usan ninguno.":
    "It varies by repeater: many use a CTCSS tone (88.5 Hz is common) and some use none.",
  "Las emisoras del tiempo de Environment Canada transmiten en los mismos canales que NOAA (162.400–162.550).":
    "Environment Canada weather radio uses the same channels as NOAA (162.400–162.550).",
  "Los walkies FRS de 22 canales son los más comunes. Empresas, seguridad y transporte usan VHF y UHF comercial (FM y DMR): escanea «VHF servicios» y «UHF servicios».":
    "22-channel FRS walkie-talkies are the most common. Businesses, security and transport use commercial VHF and UHF (FM and DMR): scan “VHF services” and “UHF services”.",
  "Las repetidoras japonesas usan el subtono CTCSS de 88.5 Hz (estándar de JARL).":
    "Japanese repeaters use an 88.5 Hz CTCSS tone (JARL standard).",
  "Los walkies sin licencia de Japón (特定小電力) usan 422.05–422.30 MHz y los pares 421.575–421.800 / 440.250–440.500 MHz; el simple digital (デジタル簡易無線) está en 351 MHz.":
    "Japan's license-free walkie-talkies (特定小電力) use 422.05–422.30 MHz and the 421.575–421.800 / 440.250–440.500 MHz pairs; simple digital radio (デジタル簡易無線) is on 351 MHz.",
  "La UHF CB (476–477 MHz, 80 canales) es la radio sin licencia de todos los días: canales 5/35 = emergencias, 40 = carreteras.":
    "UHF CB (476–477 MHz, 80 channels) is the everyday license-free radio: channels 5/35 = emergency, 40 = highway.",
  "Como en Australia, la UHF CB (476–477 MHz) es la radio sin licencia más usada.":
    "As in Australia, UHF CB (476–477 MHz) is the most used license-free radio.",
  "Los walkies públicos sin licencia (公众对讲机) usan 20 canales en 409.7500–409.9875 MHz.":
    "License-free public walkie-talkies (公众对讲机) use 20 channels on 409.7500–409.9875 MHz.",
  "Ministerio para la Transformación Digital": "Ministry for Digital Transformation",

  // canales.js — country-specific services
  "UHF CB 477 MHz (Australia y Nueva Zelanda)": "UHF CB 477 MHz (Australia and New Zealand)",
  "Australia y Nueva Zelanda": "Australia and New Zealand",
  "La radio sin licencia de Australia y Nueva Zelanda: 80 canales en 476–477 MHz. Canales 5 y 35 = emergencias, 40 = carreteras (camiones), 1–8 = salidas de repetidoras (entran por el 31–38). Mucho uso en el campo, caravanas y 4×4.":
    "The license-free radio of Australia and New Zealand: 80 channels on 476–477 MHz. Channels 5 and 35 = emergency, 40 = highway (trucks), 1–8 = repeater outputs (inputs on 31–38). Heavily used in the bush, by caravans and 4×4s.",
  "Walkies públicos 409 MHz (China)": "409 MHz public walkie-talkies (China)",
  "China": "China",
  "Los walkie-talkies sin licencia de China (公众对讲机): 20 canales de 12.5 kHz en 409.7500–409.9875 MHz.":
    "China's license-free walkie-talkies (公众对讲机): 20 channels of 12.5 kHz on 409.7500–409.9875 MHz.",
});
I18N.addPatterns([
  [/^Repetidoras ([A-Z]{2})$/, "Repeaters $1"],                                       // memory group of each country's repeaters
  [/^UHF CB (\d+) · emergencias$/, "UHF CB $1 · emergency"],
  [/^UHF CB (\d+) · carreteras$/, "UHF CB $1 · highway"],
  [/^UHF CB (\d+) · repetidora$/, "UHF CB $1 · repeater"],
]);
