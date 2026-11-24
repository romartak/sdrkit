#!/bin/bash
# =====================================================================
#  labswitch · switch the Raspberry between its RF-lab projects
#  labswitch · conmuta la Raspberry entre sus proyectos de laboratorio RF
#
#  Proxlafy (Proxmark3 / RFID)  <-->  SDR-Kit (SDR / radio)
#  Both can live on the same microSD; only one runs at a time (they share
#  the WiFi hotspot and port 80). This flips which one is active, instantly,
#  with no reinstall and no internet.
#  Los dos pueden vivir en la misma microSD; solo uno corre a la vez (comparten
#  el hotspot WiFi y el puerto 80). Esto cambia cuál está activo, al instante,
#  sin reinstalar y sin internet.
#
#    labswitch status            # what's installed and which is active
#    labswitch other             # switch to the other installed project
#    labswitch proxlafy|sdrkit   # switch to a specific project
#    labswitch install <name>    # download + install a missing project (needs internet)
#    labswitch json              # machine-readable state (used by the panels)
# =====================================================================
set -o pipefail

PROJECTS="proxlafy sdrkit"
ACTIVE_FILE=/run/labswitch.active
LOGFILE=/var/log/labswitch.log

# --- language (es|en): from either project's conf, else system, else es ---
LANG_PICK=""
for c in /etc/proxlafy/proxlafy.conf /etc/sdrkit/sdrkit.conf; do
  [ -r "$c" ] || continue
  v="$(grep -E '^\s*(export\s+)?PROXLAFY_LANG=|^\s*(export\s+)?SDRKIT_LANG=|^\s*(export\s+)?LANG_UI=' "$c" 2>/dev/null | head -1 | sed -E 's/.*=//; s/["'"'"' ]//g')"
  case "$v" in [Ee][Ss]*|[Ss][Pp]*) LANG_PICK=es; break;; [Ee][Nn]*) LANG_PICK=en; break;; esac
done
[ -n "$LANG_PICK" ] || case "${LANG:-}" in [Ee][Ss]*) LANG_PICK=es;; *) LANG_PICK=en;; esac
L() { if [ "$LANG_PICK" = es ]; then printf '%s\n' "$2"; else printf '%s\n' "$1"; fi; }

log() {
  local msg; msg="$(L "$1" "$2")"
  printf '%s %s\n' "$(date '+%H:%M:%S')" "$msg"
  { printf '%s %s\n' "$(date '+%F %T')" "$msg" >>"$LOGFILE"; } 2>/dev/null
  command -v logger >/dev/null 2>&1 && logger -t labswitch -- "$msg" 2>/dev/null
}
err() { log "$1" "$2" >&2; }

# --- per-project facts -----------------------------------------------
proj_dir()     { case "$1" in proxlafy) echo /opt/proxlafy;; sdrkit) echo /opt/sdrkit;; esac; }
proj_main()    { case "$1" in proxlafy) echo proxlafy.service;; sdrkit) echo sdrkit.service;; esac; }
proj_units()   { case "$1" in proxlafy) echo "proxlafy-netwatch.service proxlafy.service";; sdrkit) echo "sdrkit-netwatch.service sdrkit.service";; esac; }
proj_hotspot() { case "$1" in proxlafy) echo proxlafy-hotspot;; sdrkit) echo sdrkit-hotspot;; esac; }
proj_label()   { case "$1" in proxlafy) echo Proxlafy;; sdrkit) echo SDR-Kit;; esac; }
proj_conf()    { case "$1" in proxlafy) echo /etc/proxlafy/proxlafy.conf;; sdrkit) echo /etc/sdrkit/sdrkit.conf;; esac; }
proj_geturl()  { case "$1" in
                   proxlafy) echo https://raw.githubusercontent.com/romartak/proxlafy/main/get.sh;;
                   sdrkit)   echo https://raw.githubusercontent.com/romartak/sdrkit/main/get.sh;;
                 esac; }
proj_defssid() { case "$1" in proxlafy) echo Proxlafy;; sdrkit) echo SDR-Pi;; esac; }

conf_val() {  # conf-file KEY default
  local f="$1" key="$2" def="$3" v=""
  if [ -r "$f" ]; then
    v="$(grep -E "^\s*(export\s+)?$key=" "$f" 2>/dev/null | head -1 | sed -E 's/.*=//; s/[[:space:]]*#.*$//; s/^["'"'"']//; s/["'"'"']$//')"
  fi
  printf '%s' "${v:-$def}"
}
proj_ssid() { conf_val "$(proj_conf "$1")" HOTSPOT_SSID "$(proj_defssid "$1")"; }
proj_ip()   { conf_val "$(proj_conf "$1")" HOTSPOT_IP "192.168.4.1"; }

installed() { [ -f "/etc/systemd/system/$(proj_main "$1")" ] && [ -d "$(proj_dir "$1")" ]; }
active()    { systemctl is-active --quiet "$(proj_main "$1")" 2>/dev/null; }

current() { local p; for p in $PROJECTS; do active "$p" && { echo "$p"; return; }; done; echo ""; }
other_of() {
  local cur p; cur="$(current)"
  for p in $PROJECTS; do [ "$p" != "$cur" ] && installed "$p" && { echo "$p"; return; }; done
  for p in $PROJECTS; do [ "$p" != "$cur" ] && { echo "$p"; return; }; done
}

need_root() { [ "$(id -u)" -eq 0 ] || { err "Run with sudo: sudo labswitch $*" "Ejecuta con sudo: sudo labswitch $*"; exit 1; }; }
have_net()  { curl -fsS --max-time 8 -o /dev/null https://raw.githubusercontent.com 2>/dev/null; }

stop_project() {
  local p="$1"
  log "Stopping $(proj_label "$p")…" "Deteniendo $(proj_label "$p")…"
  # shellcheck disable=SC2046
  systemctl disable --now $(proj_units "$p") >/dev/null 2>&1
  nmcli connection down "$(proj_hotspot "$p")" >/dev/null 2>&1
}

start_project() {
  local p="$1"
  log "Starting $(proj_label "$p")…" "Iniciando $(proj_label "$p")…"
  # shellcheck disable=SC2046
  systemctl enable --now $(proj_units "$p") >/dev/null 2>&1
}

switch_to() {
  local target="$1" p
  case " $PROJECTS " in *" $target "*) ;; *) err "Unknown project: $target" "Proyecto desconocido: $target"; return 2;; esac
  if ! installed "$target"; then
    err "$(proj_label "$target") is not installed." "$(proj_label "$target") no está instalado."
    err "Install it: sudo labswitch install $target" "Instálalo: sudo labswitch install $target"
    return 3
  fi
  if active "$target" && [ "$(current)" = "$target" ]; then
    log "$(proj_label "$target") is already active." "$(proj_label "$target") ya está activo."
    return 0
  fi
  for p in $PROJECTS; do
    [ "$p" = "$target" ] && continue
    installed "$p" && active "$p" && stop_project "$p"
  done
  start_project "$target"
  echo "$target" >"$ACTIVE_FILE" 2>/dev/null
  log "Active now: $(proj_label "$target"). Reconnect WiFi to '$(proj_ssid "$target")' → http://$(proj_ip "$target")" \
      "Activo ahora: $(proj_label "$target"). Reconéctate a la WiFi '$(proj_ssid "$target")' → http://$(proj_ip "$target")"
}

install_project() {
  local p="$1"
  case " $PROJECTS " in *" $p "*) ;; *) err "Unknown project: $p" "Proyecto desconocido: $p"; return 2;; esac
  if installed "$p"; then log "$(proj_label "$p") is already installed." "$(proj_label "$p") ya está instalado."; return 0; fi
  if ! have_net; then
    err "No internet. Connect to a WiFi with internet and retry." "Sin internet. Conéctate a una WiFi con internet y reintenta."
    return 4
  fi
  log "Downloading and installing $(proj_label "$p")… (this can take a few minutes)" \
      "Descargando e instalando $(proj_label "$p")… (puede tardar unos minutos)"
  curl -fsSL "$(proj_geturl "$p")" | bash
}

cmd_status() {
  L "Lab projects on this Pi:" "Proyectos de laboratorio en esta Pi:"
  local p s
  for p in $PROJECTS; do
    if installed "$p"; then
      if active "$p"; then s="$(L 'ACTIVE' 'ACTIVO')"; else s="$(L 'installed (paused)' 'instalado (en pausa)')"; fi
    else
      s="$(L 'not installed' 'no instalado')"
    fi
    printf '  %-9s %s\n' "$(proj_label "$p")" "$s"
  done
}

cmd_json() {
  local cur other oi
  cur="$(current)"; other="$(other_of)"
  installed "$other" && oi=true || oi=false
  printf '{"current":"%s","current_label":"%s","other":"%s","other_label":"%s","other_installed":%s,"other_ssid":"%s","other_ip":"%s"}\n' \
    "$cur" "$( [ -n "$cur" ] && proj_label "$cur" )" "$other" "$(proj_label "$other")" "$oi" "$(proj_ssid "$other")" "$(proj_ip "$other")"
}

case "${1:-status}" in
  status|estado|"")     cmd_status ;;
  json)                 cmd_json ;;
  other|otro)           need_root other; switch_to "$(other_of)" ;;
  proxlafy|sdrkit)      need_root "$1"; switch_to "$1" ;;
  install|instalar)     need_root "install ${2:-}"; install_project "${2:-}" ;;
  *)                    err "Usage: labswitch [status|other|proxlafy|sdrkit|install <name>|json]" \
                            "Uso: labswitch [status|other|proxlafy|sdrkit|install <nombre>|json]"; exit 2 ;;
esac
