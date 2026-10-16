# Historial de versiones

## 3.1.0
- Instalación desde GitHub con un solo comando (`get.sh`).
- `sudo sdrkit actualizar`: trae la última versión, muestra los cambios, guarda una copia y **vuelve sola a la anterior** si la nueva no arranca. `sudo sdrkit volver` para regresar a mano.
- Botón **Actualizar** en Más → Sistema.
- La configuración se conserva en cada actualización y recibe las opciones nuevas automáticamente.
- Pruebas automáticas en GitHub en cada cambio.

## 3.0.0
- Analizador profesional: sintonizador sin tocar el gráfico (−/+, deslizador, salto a la siguiente señal), 4 marcadores con delta y seguimiento, mediciones (potencia de canal, OBW, ACPR, ancho a −3/−6/−20/−26 dB, SNR, contador, armónicos, pulsos), span cero con disparo, trazas máx./mín./promedio/persistencia/referencia, unidades calibradas, convertidor, línea límite, vigilancia 24/7 con mapa de ocupación y avisos al celular.
- Voz digital en el panel con DSD-FME (DMR, P25, D-Star, Fusion, NXDN, dPMR, M17) e identificador automático de señales digitales.
- Pestaña Decodificar: mensajes POCSAG/FLEX/APRS/EAS, sensores de 433 MHz (rtl_433) y radar de aviones (dump1090).
- Servicios y canales completos (PMR, FRS, marina, aviación, CB…) para escuchar o escanear todo.
- Ayuda ⓘ en cada parte del panel.

## 2.0.0
- Radio en el celular con subtonos CTCSS/DCS y DTMF, grabación por transmisión, escáner, memorias, modo cazador, antenas y guía de frecuencias.

## 1.0.0
- Analizador de espectro estilo tinySA, hotspot automático, OpenWebRX+ y Tailscale.
