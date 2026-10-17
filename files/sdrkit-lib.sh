#!/bin/bash
# SDR-Kit · shared functions (used by the installer, the network watchdog and the sdrkit command)
# SDR-Kit · funciones compartidas (las usan el instalador, el vigilante de red y el comando sdrkit)

# Reads KEY="value" without running anything: a quoted value is taken literally (a $ in a password is safe).
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

# Changes (or adds) KEY="value" in the configuration file. · Cambia (o agrega) KEY="valor" en la configuración.
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

# Adds to config $2 the keys of template $1 it does not have yet (never changes your values). Prints how many.
# Agrega a la configuración $2 las claves de la plantilla $1 que todavía no tenga (nunca cambia tus valores).
sdrkit_merge_conf() {
  local tpl="$1" dst="$2" added=0 line key
  [ -r "$tpl" ] && [ -f "$dst" ] || { echo 0; return 0; }
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ $line =~ ^([A-Z_][A-Z0-9_]*)= ]] || continue
    key="${BASH_REMATCH[1]}"
    grep -qE "^[[:space:]]*${key}=" "$dst" && continue
    # a config without SDRKIT_LANG comes from a Spanish-only version: it stays in Spanish
    # una configuración sin SDRKIT_LANG viene de una versión sólo en español: sigue en español
    [ "$key" = SDRKIT_LANG ] && line="${line/#SDRKIT_LANG=\"\"/SDRKIT_LANG=\"es\"}"
    [ $added -eq 0 ] && printf '\n# --- New options added by an update · Opciones nuevas agregadas por una actualización (%s) ---\n' "$(date +%F)" >> "$dst"
    printf '%s\n' "$line" >> "$dst"
    added=$((added + 1))
  done < "$tpl"
  echo "$added"
}

# GitHub repository used to install and update (SDRKIT_REPO in sdrkit.conf overrides it)
# Repositorio de GitHub de donde se instala y actualiza (se puede cambiar con SDRKIT_REPO en sdrkit.conf)
export SDRKIT_DEFAULT_REPO="https://github.com/romartak/sdrkit.git"

# Creates or updates the NetworkManager hotspot connection (does not bring it up or down).
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

# ---------------------------------------------------------------------
#  Language · Idioma  (en | es)
#  Order: env SDRKIT_LANG → sdrkit.conf → system language ($LANG: es* → es) → en
#  Orden: variable SDRKIT_LANG → sdrkit.conf → idioma del sistema ($LANG: es* → es) → en
# ---------------------------------------------------------------------
# captured when the lib is sourced, before sdrkit_load_conf can overwrite it
# se guarda al cargar la biblioteca, antes de que sdrkit_load_conf la pise con el valor del archivo
SDRKIT_LANG_ENV="${SDRKIT_LANG_ENV-${SDRKIT_LANG:-}}"
SDRKIT_L=""

# "es", "es_MX.UTF-8", "Español", "spanish" → es · "en", "en_GB.UTF-8", "English", "inglés" → en · else empty
sdrkit_norm_lang() {
  case "${1:-}" in
    [Ee][Ss]*|[Ss][Pp]*) echo es ;;
    [Ee][Nn]*|[Ii][Nn][Gg]*) echo en ;;
  esac
}

# system language: the first of LC_ALL, LC_MESSAGES, LANG that is not C/POSIX · idioma del sistema
sdrkit_sys_lang() {
  local v
  for v in "${LC_ALL:-}" "${LC_MESSAGES:-}" "${LANG:-}"; do
    case "$v" in ''|C|C.*|POSIX) continue ;; esac
    case "$v" in [Ee][Ss]*) echo es ;; *) echo en ;; esac
    return 0
  done
  echo en
}

# SDRKIT_LANG value stored in a config file; a config without the key predates it (Spanish-only) → es
# valor de SDRKIT_LANG guardado en un archivo; si no tiene la clave es de una versión sólo en español → es
sdrkit_conf_lang() {
  [ -r "$1" ] || return 0
  if grep -qE '^[[:space:]]*(export[[:space:]]+)?SDRKIT_LANG=' "$1"; then
    sdrkit_norm_lang "$(sdrkit_conf_get SDRKIT_LANG "$1")"
  else
    echo es
  fi
}

# Value of KEY in a config file (empty if missing), without touching this shell's variables
# Valor de KEY en un archivo de configuración (vacío si no está), sin tocar las variables de este shell
sdrkit_conf_get() { ( unset "$1"; sdrkit_load_conf "$2"; printf '%s\n' "${!1:-}" ); }

# Sets SDRKIT_L (en | es). Call it after sdrkit_load_conf. · Llámala después de sdrkit_load_conf.
sdrkit_lang_init() {
  local l
  l="$(sdrkit_norm_lang "$SDRKIT_LANG_ENV")"
  # an explicit SDRKIT_LANG=xx in the environment wins, also for the programs this one starts
  if [ -n "$l" ]; then SDRKIT_LANG="$SDRKIT_LANG_ENV"; else l="$(sdrkit_norm_lang "${SDRKIT_LANG:-}")"; fi
  [ -n "$l" ] || l="$(sdrkit_sys_lang)"
  SDRKIT_L="$l"
}

# sdrkit_pick "English" "Español" → REPLY (no subshell). With one argument, that text in any language.
sdrkit_pick() {
  [ -n "$SDRKIT_L" ] || sdrkit_lang_init
  if [ "$SDRKIT_L" = es ] && [ $# -ge 2 ]; then REPLY="$2"; else REPLY="${1:-}"; fi
}
# L "English" "Español": prints the text in the active language, as is (no printf format, % and \ are safe)
L()  { sdrkit_pick "$@"; printf '%s\n' "$REPLY"; }
# Ln: same without the final newline (prompts) · igual pero sin salto de línea (preguntas)
Ln() { sdrkit_pick "$@"; printf '%s' "$REPLY"; }

# yes/no answer or setting in either language: y, yes, s, si, sí, true, 1, on
sdrkit_is_yes() {
  case "${1,,}" in y|yes|s|si|sí|sÍ|true|1|on) return 0 ;; *) return 1 ;; esac
}

# sdrkit_ask_yn "Question?" "¿Pregunta?" yes|no  → 0 = yes. Empty answer = default; anything that is not a
# yes is a no. · Respuesta vacía = valor por defecto; cualquier cosa que no sea un sí cuenta como no.
sdrkit_ask_yn() {
  local def="${3:-no}" hint ans
  if sdrkit_is_yes "$def"; then def=yes; hint="$(L "(yes/no) [yes]" "(si/no) [si]")"
  else def=no; hint="$(L "(yes/no) [no]" "(si/no) [no]")"; fi
  read -r -p "$(Ln "$1" "$2") $hint: " ans || ans=""
  ans="${ans#"${ans%%[![:space:]]*}"}"; ans="${ans%"${ans##*[![:space:]]}"}"
  [ -n "$ans" ] || ans="$def"
  sdrkit_is_yes "$ans"
}
