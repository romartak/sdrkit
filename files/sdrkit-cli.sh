#!/bin/bash
# sdrkit — SDR-Kit command-line shortcuts (use it over SSH) · atajos de línea de comandos para SDR-Kit
# English commands, with the Spanish ones as aliases · comandos en inglés, con los de español como alias
# shellcheck source=sdrkit-lib.sh
source /opt/sdrkit/sdrkit-lib.sh
CONF=/etc/sdrkit/sdrkit.conf
sdrkit_load_conf "$CONF"
sdrkit_lang_init
HS="${HOTSPOT_CON:-sdrkit-hotspot}"

need_root() { [ "$(id -u)" -eq 0 ] || { L "Use: sudo sdrkit $*" "Usa: sudo sdrkit $*"; exit 1; }; }

usage() {
  if [ "$SDRKIT_L" = es ]; then
    cat <<EOF
sdrkit — atajos de SDR-Kit
  sdrkit status                   resumen: servicios, red, IPs, SDR, energía
  sdrkit doctor                   diagnóstico completo con ✔/✖ y qué hacer si algo falla
  sudo sdrkit backup [archivo]    copia tu configuración y memorias (sin las grabaciones)
  sudo sdrkit restore archivo     restaura una copia hecha con backup
  sudo sdrkit hotspot             fuerza el hotspot propio (${HOTSPOT_SSID:-SDR-Pi})
  sudo sdrkit auto                vuelve al modo automático (WiFi conocida o hotspot)
  sudo sdrkit wifi "Red" "clave"  guarda una red WiFi (ej. el hotspot del celular)
  sdrkit networks                 lista las redes guardadas
  sudo sdrkit password            cambia la clave del panel y de OpenWebRX+ (admin)
  sudo sdrkit hotspot-password    cambia la clave del hotspot
  sudo sdrkit profiles            reescribe los perfiles de bandas de OpenWebRX+
  sudo sdrkit test-sdr            prueba el dongle con rtl_test (pausa el panel unos segundos)
  sdrkit recs                     dónde están las grabaciones y cuánto ocupan
  sdrkit decoders                 qué decodificadores quedaron instalados
  sudo sdrkit update              trae la última versión de GitHub (en casa, con internet)
  sdrkit update --check           sólo dice si hay una versión nueva
  sudo sdrkit rollback            regresa a la versión anterior si algo no te gustó
  sdrkit version                  versión instalada
  sudo sdrkit config              edita la configuración (sdrkit.conf) y reinicia el panel
  sudo sdrkit install-dsd         instala DSD-FME (voz DMR/P25/D-Star/YSF/NXDN/dPMR/M17) después
  sudo sdrkit language en|es      idioma de estos mensajes y del instalador
  sdrkit logs                     registros en vivo (Ctrl+C para salir)
  sudo sdrkit restart             reinicia los servicios de SDR-Kit
Los comandos en español también valen, en el mismo orden: estado, diagnóstico, copia, restaurar, redes, clave, clave-hotspot,
  perfiles, probar-sdr, grabaciones, decodificadores, actualizar (--buscar), volver, versión,
  configurar, instalar-dsd, idioma, reiniciar, ayuda.
EOF
  else
    cat <<EOF
sdrkit — SDR-Kit shortcuts
  sdrkit status                   summary: services, network, IPs, SDR, power
  sdrkit doctor                   full check-up with ✔/✖ and what to do if something fails
  sudo sdrkit backup [file]       save your settings and memories (not the recordings)
  sudo sdrkit restore file        restore a backup made with backup
  sudo sdrkit hotspot             force the built-in hotspot (${HOTSPOT_SSID:-SDR-Pi})
  sudo sdrkit auto                back to automatic mode (known WiFi or hotspot)
  sudo sdrkit wifi "Name" "pass"  save a WiFi network (e.g. your phone's hotspot)
  sdrkit networks                 list the saved networks
  sudo sdrkit password            change the panel and OpenWebRX+ (admin) password
  sudo sdrkit hotspot-password    change the hotspot password
  sudo sdrkit profiles            rewrite the OpenWebRX+ band profiles
  sudo sdrkit test-sdr            test the dongle with rtl_test (pauses the panel for a few seconds)
  sdrkit recs                     where the recordings are and how much space they use
  sdrkit decoders                 which decoders are installed
  sudo sdrkit update              get the latest version from GitHub (at home, with internet)
  sdrkit update --check           only check whether there is a new version
  sudo sdrkit rollback            go back to the previous version
  sdrkit version                  installed version
  sudo sdrkit config              edit the settings (sdrkit.conf) and restart the panel
  sudo sdrkit install-dsd         install DSD-FME later (DMR/P25/D-Star/YSF/NXDN/dPMR/M17 voice)
  sudo sdrkit language en|es      language of these messages and of the installer
  sdrkit logs                     live logs (Ctrl+C to quit)
  sudo sdrkit restart             restart the SDR-Kit services
Spanish aliases work too, in the same order: estado, diagnóstico, copia, restaurar, redes, clave, clave-hotspot, perfiles,
  probar-sdr, grabaciones, decodificadores, actualizar (--buscar), volver, versión, configurar,
  instalar-dsd, idioma, reiniciar, ayuda.
EOF
  fi
}

case "${1:-help}" in
  status|estado)
    L "== Services" "== Servicios"
    for s in sdrkit sdrkit-netwatch openwebrx tailscaled; do
      printf '  %-16s %s\n' "$s" "$(systemctl is-active "$s" 2>/dev/null)"
    done
    L "== Network" "== Red"
    nmcli -t -f DEVICE,STATE,CONNECTION device status 2>/dev/null | grep -E '^wlan|^eth|^usb' | sed 's/^/  /'
    mode="$(cat /run/sdrkit/netmode 2>/dev/null || echo auto)"
    L "  forced mode: $mode" "  modo forzado: $mode"
    ip -4 -o addr show | awk '$2!="lo"{print "  " $2 ": " $4}'
    command -v tailscale >/dev/null && echo "  tailscale: $(tailscale ip -4 2>/dev/null || L 'not linked' 'sin enlazar')"
    echo "  Panel: http://$(hostname).local  ·  Hotspot: http://${HOTSPOT_IP:-192.168.4.1}"
    echo "== SDR (USB)"
    usb="$(lsusb 2>/dev/null | grep -iE 'realtek|rtl|0bda:28|hackrf|1d50:')"
    if [ -n "$usb" ]; then printf '%s\n' "$usb" | sed 's/^/  /'; else L "  (not detected)" "  (no detectado)"; fi
    L "== Power and temperature" "== Energía y temperatura"
    command -v vcgencmd >/dev/null && echo "  $(vcgencmd get_throttled)  $(L "(0x0 = all good; 0x50005 = undervoltage)" "(0x0 = todo bien; 0x50005 = bajo voltaje)")"
    command -v vcgencmd >/dev/null && echo "  $(vcgencmd measure_temp)"
    ;;
  doctor|diagnóstico|diagnostico)
    bad=0
    chk() {  # chk ok|bad|warn "English" "Español" [how to fix EN] [how to fix ES]
      case "$1" in
        ok)   printf '  \033[32m✔\033[0m %s\n' "$(L "$2" "$3")" ;;
        warn) printf '  \033[33m!\033[0m %s\n' "$(L "$2" "$3")"; [ -n "$4" ] && printf '      → %s\n' "$(L "$4" "$5")" ;;
        *)    printf '  \033[31m✖\033[0m %s\n' "$(L "$2" "$3")"; bad=$((bad + 1)); [ -n "$4" ] && printf '      → %s\n' "$(L "$4" "$5")" ;;
      esac
    }
    echo "SDR-Kit $(cat /opt/sdrkit/VERSION 2>/dev/null || echo '?')"
    systemctl is-active --quiet sdrkit 2>/dev/null && chk ok "Panel service is running" "El servicio del panel está activo" \
      || chk bad "Panel service is not running" "El servicio del panel no está activo" "sudo sdrkit restart  ·  sdrkit logs" "sudo sdrkit reiniciar  ·  sdrkit logs"
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PANEL_PORT:-80}/api/status" 2>/dev/null)"
    case "$code" in 200|401) chk ok "The panel answers (HTTP $code)" "El panel responde (HTTP $code)" ;;
      *) chk bad "The panel does not answer" "El panel no responde" "sdrkit logs" "sdrkit logs" ;; esac
    if lsusb 2>/dev/null | grep -qiE '0bda:28(38|32)'; then chk ok "RTL-SDR detected" "RTL-SDR detectado"
    elif lsusb 2>/dev/null | grep -qi '1d50:6089'; then chk warn "Only a HackRF found (analyzer only)" "Sólo hay un HackRF (sólo analizador)"
    else chk bad "No RTL-SDR found" "No encuentro el RTL-SDR" "Check the OTG adapter and cable; try another USB cable or power bank" "Revisa el adaptador OTG y el cable; prueba otro cable o power bank"; fi
    if command -v vcgencmd >/dev/null; then
      thr="$(vcgencmd get_throttled 2>/dev/null | cut -d= -f2)"
      [ "${thr:-0x0}" = 0x0 ] && chk ok "Power supply is fine" "La alimentación está bien" \
        || chk warn "Under-voltage or throttling seen ($thr)" "Se detectó bajo voltaje o limitación ($thr)" "Use a stronger power bank and a short, thick cable" "Usa un power bank más fuerte y un cable corto y grueso"
      t="$(vcgencmd measure_temp 2>/dev/null | tr -dc '0-9.')"
      [ "${t%.*}" -lt 75 ] 2>/dev/null && chk ok "Temperature ${t}°C" "Temperatura ${t}°C" || chk warn "Temperature ${t}°C is high" "Temperatura ${t}°C alta" "Give it some air or a heatsink" "Dale ventilación o un disipador"
    fi
    free_mb="$(df -Pm "${REC_DIR:-/var/lib/sdrkit}" 2>/dev/null | awk 'NR==2{print $4}')"
    [ "${free_mb:-0}" -gt 500 ] 2>/dev/null && chk ok "Free space: ${free_mb} MB" "Espacio libre: ${free_mb} MB" \
      || chk warn "Low free space (${free_mb:-?} MB)" "Poco espacio libre (${free_mb:-?} MB)" "Delete old recordings (Recordings tab)" "Borra grabaciones viejas (pestaña Grabaciones)"
    ip -4 -o addr show 2>/dev/null | awk '$2!="lo"' | grep -q . && chk ok "Network up: $(ip -4 -o addr show | awk '$2!="lo"{split($4,a,"/"); printf "%s ", a[1]}')" "Red activa: $(ip -4 -o addr show | awk '$2!="lo"{split($4,a,"/"); printf "%s ", a[1]}')" \
      || chk bad "No network address" "Sin dirección de red" "sudo sdrkit hotspot" "sudo sdrkit hotspot"
    command -v hackrf_sweep >/dev/null || ! lsusb 2>/dev/null | grep -qi '1d50:6089' || chk warn "HackRF found but hackrf_sweep is missing" "Hay un HackRF pero falta hackrf_sweep" "sudo apt install hackrf" "sudo apt install hackrf"
    echo
    if [ "$bad" -eq 0 ]; then L "All good." "Todo en orden."; else L "$bad problem(s) found." "$bad problema(s) encontrado(s)."; exit 1; fi
    ;;
  backup|copia)
    need_root "$@"
    out="${2:-$HOME/sdrkit-backup-$(date +%F).tar.gz}"
    tar -czf "$out" --exclude='grabaciones' --exclude='*.wav' /etc/sdrkit /var/lib/sdrkit 2>/dev/null \
      && L "Backup saved: $out (settings and memories; recordings are not included)" \
           "Copia guardada: $out (configuración y memorias; las grabaciones no se incluyen)"
    ;;
  restore|restaurar)
    need_root "$@"
    [ -f "${2:-}" ] || { L "Usage: sudo sdrkit restore FILE.tar.gz" "Uso: sudo sdrkit restaurar ARCHIVO.tar.gz"; exit 1; }
    tar -tzf "$2" >/dev/null 2>&1 || { L "That is not a valid backup." "Ese archivo no es una copia válida."; exit 1; }
    tar -tzf "$2" | grep -qvE '^(etc/sdrkit|var/lib/sdrkit)(/|$)' && { L "Refusing: the file has paths outside SDR-Kit." "Rechazado: el archivo tiene rutas ajenas a SDR-Kit."; exit 1; }
    tar -xzf "$2" -C / && systemctl restart sdrkit-netwatch sdrkit && L "Backup restored." "Copia restaurada."
    ;;
  hotspot)
    need_root "$@"
    mkdir -p /run/sdrkit && echo hotspot > /run/sdrkit/netmode
    nmcli connection up "$HS" && L "Hotspot \"${HOTSPOT_SSID}\" active → http://${HOTSPOT_IP:-192.168.4.1}" \
                                   "Hotspot «${HOTSPOT_SSID}» activo → http://${HOTSPOT_IP:-192.168.4.1}"
    ;;
  auto)
    need_root "$@"
    mkdir -p /run/sdrkit && echo auto > /run/sdrkit/netmode
    nmcli connection down "$HS" 2>/dev/null
    L "Automatic mode: it joins a known network; if there is none, the hotspot comes back in ~1 minute." \
      "Modo automático: se conectará a una red conocida; si no hay, el hotspot vuelve en ~1 minuto."
    ;;
  wifi)
    need_root "$@"
    ssid="$2"; pass="$3"
    [ -n "$ssid" ] || { L 'Usage: sudo sdrkit wifi "NetworkName" "password"' 'Uso: sudo sdrkit wifi "NombreRed" "clave"'; exit 1; }
    name="sdrkit-$(printf '%s' "$ssid" | tr -c 'A-Za-z0-9_.-' '_' | cut -c1-40)"
    nmcli connection delete "$name" >/dev/null 2>&1
    if [ -n "$pass" ]; then
      nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" \
        connection.autoconnect yes connection.autoconnect-priority 20 wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$pass"
    else
      nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" \
        connection.autoconnect yes connection.autoconnect-priority 20
    fi && L "Network \"$ssid\" saved. It will be used automatically when in range." \
            "Red «$ssid» guardada. Se usará automáticamente cuando esté al alcance."
    ;;
  networks|redes)
    nmcli -f NAME,TYPE,AUTOCONNECT,AUTOCONNECT-PRIORITY connection show | grep -E 'NAME|wifi'
    ;;
  password|clave)
    need_root "$@"
    read -r -s -p "$(Ln "New panel/OpenWebRX+ password: " "Nueva clave del panel/OpenWebRX+: ")" p1; echo
    read -r -s -p "$(Ln "Repeat the password: " "Repite la clave: ")" p2; echo
    [ "$p1" = "$p2" ] && [ -n "$p1" ] || { L "They do not match, or it is empty." "No coinciden o está vacía."; exit 1; }
    case "$p1" in *'"'*) L 'The password cannot contain double quotes (").' 'La clave no puede contener comillas dobles (").'; exit 1;; esac
    sdrkit_set_conf ADMIN_PASSWORD "$p1" "$CONF"
    if command -v openwebrx >/dev/null; then
      if openwebrx admin --silent hasuser admin; then
        OWRX_PASSWORD="$p1" openwebrx admin --noninteractive resetpassword admin >/dev/null
      else
        OWRX_PASSWORD="$p1" openwebrx admin --noninteractive adduser admin >/dev/null
      fi
      chown openwebrx: /var/lib/openwebrx/users.json 2>/dev/null
    fi
    systemctl restart sdrkit && L "Password changed." "Clave cambiada."
    ;;
  hotspot-password|clave-hotspot)
    need_root "$@"
    read -r -s -p "$(Ln "New hotspot password (8+ characters): " "Nueva clave del hotspot (8+ caracteres): ")" p1; echo
    [ ${#p1} -ge 8 ] || { L "At least 8 characters." "Mínimo 8 caracteres."; exit 1; }
    case "$p1" in *'"'*) L 'The password cannot contain double quotes (").' 'La clave no puede contener comillas dobles (").'; exit 1;; esac
    sdrkit_set_conf HOTSPOT_PASSWORD "$p1" "$CONF"
    nmcli connection modify "$HS" wifi-sec.psk "$p1" && L "Hotspot password changed (it applies the next time the hotspot starts)." \
                                                          "Clave del hotspot cambiada (se aplica al reactivarlo)."
    ;;
  profiles|perfiles)
    need_root "$@"
    systemctl stop openwebrx
    python3 /opt/sdrkit/sdrkit_server.py --seed-owrx --force
    L "Done. Open the receiver from the panel to apply them." "Listo. Abre el receptor desde el panel para aplicarlos."
    ;;
  test-sdr|probar-sdr)
    need_root "$@"
    L "Pausing the services that use the dongle…" "Pausando servicios que usan el dongle…"
    systemctl stop sdrkit openwebrx
    timeout 8 rtl_test -t; echo
    timeout 6 rtl_test -s 2400000 2>&1 | tail -n 4
    systemctl start sdrkit
    L "(If you see 'Found 1 device(s)' and the R828D/R820T tuner, the dongle works.)" \
      "(Si ves 'Found 1 device(s)' y el sintonizador R828D/R820T, el dongle funciona.)"
    ;;
  recs|grabaciones)
    d="${REC_DIR:-/var/lib/sdrkit/grabaciones}"
    n="$(find "$d" -name '*.wav' 2>/dev/null | wc -l)"; size="$(du -sh "$d" 2>/dev/null | cut -f1)"
    L "Folder: $d" "Carpeta: $d"
    L "Files: $n · Size: $size" "Archivos: $n · Ocupan: $size"
    ls -1t "$d" 2>/dev/null | head -7 | sed "s/^/  $(L "day" "día"): /"
    L "Copy them to your PC:  scp -r $(id -un)@$(hostname).local:$d ." "Copiarlas a tu PC:  scp -r $(id -un)@$(hostname).local:$d ."
    ;;
  update|actualizar)
    shift
    # copied to /run so the update can replace the original file safely
    # se copia a /run para que la actualización pueda reemplazar el archivo original sin problemas
    cp /opt/sdrkit/sdrkit-update.sh /run/sdrkit-update.sh 2>/dev/null \
      || { L "/opt/sdrkit/sdrkit-update.sh is missing: reinstall." "Falta /opt/sdrkit/sdrkit-update.sh: reinstala."; exit 1; }
    exec bash /run/sdrkit-update.sh "$@"
    ;;
  rollback|volver)
    need_root "$@"
    exec bash /opt/sdrkit/sdrkit-update.sh --volver
    ;;
  version|versión|-v|--version)
    ver="$(cat /opt/sdrkit/VERSION 2>/dev/null || echo '?')"
    commit="$(cut -c1-7 /var/lib/sdrkit/commit 2>/dev/null || L 'unknown' 'desconocido')"
    origin="${SDRKIT_REPO:-$(git -C /opt/sdrkit-src remote get-url origin 2>/dev/null || echo "$SDRKIT_DEFAULT_REPO")}"
    echo "SDR-Kit $ver · commit $commit"
    L "Source: $origin (branch ${SDRKIT_BRANCH:-main})" "Origen: $origin (rama ${SDRKIT_BRANCH:-main})"
    ;;
  config|configurar)
    need_root "$@"
    cp -a "$CONF" "$CONF.bak"
    "${EDITOR:-nano}" "$CONF" && systemctl restart sdrkit-netwatch sdrkit \
      && L "Saved and applied (previous copy: $CONF.bak)." "Guardado y aplicado (copia anterior: $CONF.bak)."
    ;;
  decoders|decodificadores)
    python3 - "$SDRKIT_L" <<'PY'
import json, re, sys
es = sys.argv[1] == "es"
sys.path.insert(0, "/opt/sdrkit")
import sdrkit_decoders as d
tr = {}
if not es:  # English names from the panel's catalog, when present · nombres en inglés del catálogo del panel
    try:
        with open("/opt/sdrkit/web/lang-en-server.js", encoding="utf-8") as f:
            for a, b in re.findall(r'("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")', f.read()):
                tr[json.loads(a)] = json.loads(b)
    except (OSError, ValueError):
        pass
yes, no = ("sí", "no") if es else ("yes", "no")
st = d.status()
print("OpenWebRX+:", yes if st["openwebrx"] else no, "· llave AMBE:" if es else "· AMBE dongle:", yes if st["ambe"] else no)
for it in st["items"]:
    name = tr.get(it["name"], it["name"])
    need = "" if it["available"] else ("falta: " if es else "needs: ") + ", ".join(it["needs"])
    print("  %s %-62s %s" % ("✔" if it["available"] else "·", name[:62], need))
PY
    ;;
  install-dsd|instalar-dsd)
    need_root "$@"
    sdrkit_set_conf INSTALL_DSD "" "$CONF"
    kit=""; for d in /opt/sdrkit-src /boot/firmware/sdrkit /boot/sdrkit "$HOME/sdrkit"; do [ -f "$d/install.sh" ] && kit="$d" && break; done
    [ -n "$kit" ] || { L "The kit folder (install.sh) was not found: run sudo sdrkit update, or copy it to /boot/firmware/sdrkit." \
                         "No encuentro la carpeta del kit (install.sh): ejecuta sudo sdrkit actualizar, o cópiala a /boot/firmware/sdrkit."; exit 1; }
    [ -d "$kit/.git" ] || sed -i 's/^INSTALL_DSD=.*/INSTALL_DSD=""/' "$kit/sdrkit.conf" 2>/dev/null
    bash "$kit/install.sh"
    ;;
  language|idioma)
    new="$(sdrkit_norm_lang "${2:-}")"
    if [ -z "${2:-}" ]; then
      L "Language: English (SDRKIT_LANG in $CONF). Change it: sudo sdrkit language es" \
        "Idioma: español (SDRKIT_LANG en $CONF). Para cambiarlo: sudo sdrkit idioma en"
      L "(The web panel follows your browser's language, or its EN / ES switch.)" \
        "(El panel web sigue el idioma del navegador, o su selector EN / ES.)"
    elif [ -z "$new" ]; then
      L "Usage: sudo sdrkit language en|es" "Uso: sudo sdrkit idioma en|es"; exit 1
    else
      need_root "$@"
      sdrkit_set_conf SDRKIT_LANG "$new" "$CONF"
      SDRKIT_L="$new"
      L "Language set to English." "Idioma cambiado a español."
    fi
    ;;
  logs)
    journalctl -u sdrkit -u sdrkit-netwatch -u openwebrx -n 60 -f
    ;;
  restart|reiniciar)
    need_root "$@"
    systemctl restart sdrkit-netwatch sdrkit && L "Services restarted." "Servicios reiniciados."
    ;;
  help|ayuda|-h|--help)
    usage
    ;;
  *)
    L "Unknown command: $1" "Comando desconocido: $1" >&2
    usage
    exit 1
    ;;
esac
