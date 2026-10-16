#!/bin/bash
# SDR-Kit · funciones compartidas (las usan el instalador, el vigilante de red y el comando sdrkit)

# Lee KEY="valor" sin ejecutar nada: el valor entre comillas se toma literal (un $ en una clave no se rompe).
sdrkit_load_conf() {
  local f="${1:-/etc/sdrkit/sdrkit.conf}" line key val
  local re_kv='^[[:space:]]*(export[[:space:]]+)?([A-Z_][A-Z0-9_]*)=(.*)$'
  local re_dq='^"([^"]*)"[[:space:]]*(#.*)?$'
  local re_sq="^'([^']*)'[[:space:]]*(#.*)?\$"
  [ -r "$f" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ $line =~ $re_kv ]] || continue
    key="${BASH_REMATCH[2]}"
    val="${BASH_REMATCH[3]}"
    if [[ $val =~ $re_dq ]] || [[ $val =~ $re_sq ]]; then
      val="${BASH_REMATCH[1]}"
    else
      val="${val%%#*}"
      val="${val#"${val%%[![:space:]]*}"}"
      val="${val%"${val##*[![:space:]]}"}"
    fi
    printf -v "$key" '%s' "$val"
  done < "$f"
}

# Cambia (o agrega) KEY="valor" en el archivo de configuración.
sdrkit_set_conf() {
  local key="$1" val="$2" f="${3:-/etc/sdrkit/sdrkit.conf}" tmp
  tmp="$(mktemp)"
  if grep -qE "^[[:space:]]*${key}=" "$f" 2>/dev/null; then
    K="$key" V="$val" awk 'BEGIN{d=0} !d && $0 ~ "^[[:space:]]*" ENVIRON["K"] "=" {print ENVIRON["K"] "=\"" ENVIRON["V"] "\""; d=1; next} {print}' "$f" > "$tmp"
  else
    { [ -s "$f" ] && sed -e '$a\' "$f"; printf '%s="%s"\n' "$key" "$val"; } > "$tmp"
  fi
  cat "$tmp" > "$f"
  rm -f "$tmp"
}

# Agrega a la configuración $2 las claves de la plantilla $1 que todavía no tenga (nunca cambia tus valores).
# Imprime cuántas agregó.
sdrkit_merge_conf() {
  local tpl="$1" dst="$2" added=0 line key
  [ -r "$tpl" ] && [ -f "$dst" ] || { echo 0; return 0; }
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ $line =~ ^([A-Z_][A-Z0-9_]*)= ]] || continue
    key="${BASH_REMATCH[1]}"
    grep -qE "^[[:space:]]*${key}=" "$dst" && continue
    [ $added -eq 0 ] && printf '\n# --- opciones nuevas agregadas por una actualización (%s) ---\n' "$(date +%F)" >> "$dst"
    printf '%s\n' "$line" >> "$dst"
    added=$((added + 1))
  done < "$tpl"
  echo "$added"
}

# Repositorio de GitHub de donde se instala y actualiza (se puede cambiar con SDRKIT_REPO en sdrkit.conf)
export SDRKIT_DEFAULT_REPO="https://github.com/romartak/sdrkit.git"

# Crea o actualiza la conexión hotspot de NetworkManager (no la activa ni la corta si ya está activa).
sdrkit_setup_hotspot() {
  local con="${HOTSPOT_CON:-sdrkit-hotspot}" iface="${WIFI_IFACE:-wlan0}"
  local ip="${HOTSPOT_IP:-192.168.4.1}" ch="${HOTSPOT_CHANNEL:-6}"
  local props=(connection.autoconnect no 802-11-wireless.ssid "${HOTSPOT_SSID:-SDR-Pi}"
    802-11-wireless.mode ap 802-11-wireless.band bg 802-11-wireless.channel "$ch"
    ipv4.method shared ipv4.addresses "$ip/24" ipv6.method disabled
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$HOTSPOT_PASSWORD"
    wifi-sec.proto rsn wifi-sec.pairwise ccmp wifi-sec.group ccmp wifi-sec.pmf disable)
  if nmcli -t -f NAME connection show | grep -Fxq -- "$con"; then
    nmcli connection modify "$con" "${props[@]}"
  else
    nmcli connection add type wifi ifname "$iface" con-name "$con" ssid "${HOTSPOT_SSID:-SDR-Pi}" "${props[@]}" >/dev/null
  fi
}
