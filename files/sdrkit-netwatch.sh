#!/bin/bash
# SDR-Kit · vigilante de red
# Mantiene la Raspberry siempre accesible:
#   1) Al encender espera a una WiFi conocida (casa, hotspot del celular…).
#   2) Si no aparece ninguna, levanta su propio hotspot (por defecto "SDR-Pi", http://192.168.4.1).
#   3) Con el hotspot encendido y nadie conectado, cada N minutos vuelve a buscar las redes conocidas.
#   4) Si se pierde la WiFi conocida, vuelve al hotspot.
# Forzar hotspot fijo:  echo hotspot > /run/sdrkit/netmode   (lo hace el panel; "auto" lo libera)

# shellcheck source=sdrkit-lib.sh
source /opt/sdrkit/sdrkit-lib.sh
sdrkit_load_conf /etc/sdrkit/sdrkit.conf

IFACE="${WIFI_IFACE:-wlan0}"
HS="${HOTSPOT_CON:-sdrkit-hotspot}"
BOOT_WAIT="${BOOT_WAIT:-45}"
RETRY_MIN="${HOME_RETRY_MIN:-5}"
LOST_GRACE="${LOST_GRACE:-40}"
MODEFILE=/run/sdrkit/netmode

log() { echo "$*"; }

dev_state()   { nmcli -g GENERAL.STATE device show "$IFACE" 2>/dev/null | cut -d' ' -f1; }
active_con()  { nmcli -g GENERAL.CONNECTION device show "$IFACE" 2>/dev/null; }
hotspot_on()  { [ "$(active_con)" = "$HS" ] && [ "$(dev_state)" = "100" ]; }
client_on()   { [ "$(dev_state)" = "100" ] && [ "$(active_con)" != "$HS" ]; }
stations()    { iw dev "$IFACE" station dump 2>/dev/null | grep -c '^Station'; }
forced_mode() { cat "$MODEFILE" 2>/dev/null || echo auto; }

# UUIDs de las redes WiFi conocidas (modo cliente), ordenadas por prioridad
known_uuids() {
  nmcli -t -f UUID,TYPE,AUTOCONNECT-PRIORITY connection show 2>/dev/null |
  while IFS=: read -r uuid type prio; do
    [ "$type" = "802-11-wireless" ] || continue
    [ "$(nmcli -g 802-11-wireless.mode connection show "$uuid" 2>/dev/null)" = "ap" ] && continue
    echo "${prio:-0} $uuid"
  done | sort -rn | awk '{print $2}'
}

start_hotspot() {
  log "Levantando hotspot ($HS)…"
  nmcli connection up "$HS" >/dev/null 2>&1 || log "No se pudo levantar el hotspot (revisa: nmcli connection show $HS)"
}

try_known() {
  local uuids visible uuid ssid
  uuids="$(known_uuids)"
  [ -n "$uuids" ] || return 1
  log "Buscando redes conocidas…"
  nmcli connection down "$HS" >/dev/null 2>&1
  sleep 3
  nmcli device wifi rescan ifname "$IFACE" >/dev/null 2>&1
  sleep 6
  visible="$(nmcli -t -f SSID device wifi list ifname "$IFACE" 2>/dev/null | sed 's/\\:/:/g')"
  for uuid in $uuids; do
    ssid="$(nmcli -g 802-11-wireless.ssid connection show "$uuid" 2>/dev/null)"
    [ -n "$ssid" ] || continue
    if grep -Fxq -- "$ssid" <<<"$visible"; then
      log "Red conocida visible: $ssid → conectando"
      if nmcli --wait 40 connection up uuid "$uuid" ifname "$IFACE" >/dev/null 2>&1; then
        log "Conectada a $ssid"
        return 0
      fi
    fi
  done
  log "Ninguna red conocida disponible."
  return 1
}

mkdir -p /run/sdrkit
[ -f "$MODEFILE" ] || echo auto > "$MODEFILE"
iw dev "$IFACE" set power_save off 2>/dev/null

# 1) arranque: esperar una red conocida
for _ in $(seq "$BOOT_WAIT"); do
  client_on && break
  sleep 1
done
if client_on; then
  log "Arranque: conectada a WiFi conocida ($(active_con))."
else
  log "Arranque: sin WiFi conocida tras ${BOOT_WAIT}s."
  start_hotspot
fi

last_try=$(date +%s)
lost_since=0
while true; do
  sleep 10
  now=$(date +%s)
  if [ "$(forced_mode)" = "hotspot" ]; then
    hotspot_on || start_hotspot
    continue
  fi
  if client_on; then
    lost_since=0
    continue
  fi
  if hotspot_on; then
    if [ "$RETRY_MIN" -gt 0 ] && [ $((now - last_try)) -ge $((RETRY_MIN * 60)) ] && [ "$(stations)" -eq 0 ]; then
      last_try=$now
      try_known || start_hotspot
    fi
    continue
  fi
  # ni cliente ni hotspot: conectando o red perdida
  [ "$lost_since" -eq 0 ] && lost_since=$now
  if [ $((now - lost_since)) -ge "$LOST_GRACE" ]; then
    log "Sin red durante ${LOST_GRACE}s."
    start_hotspot
    lost_since=0
    last_try=$now
  fi
done
