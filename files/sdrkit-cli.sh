#!/bin/bash
# sdrkit — atajos de línea de comandos para SDR-Kit (úsalo por SSH)
# shellcheck source=sdrkit-lib.sh
source /opt/sdrkit/sdrkit-lib.sh
CONF=/etc/sdrkit/sdrkit.conf
sdrkit_load_conf "$CONF"
HS="${HOTSPOT_CON:-sdrkit-hotspot}"

need_root() { [ "$(id -u)" -eq 0 ] || { echo "Usa: sudo sdrkit $*"; exit 1; }; }

ayuda() {
  cat <<EOF
sdrkit — atajos de SDR-Kit
  sdrkit estado                 resumen: servicios, red, IPs, SDR, energía
  sudo sdrkit hotspot           fuerza el hotspot propio (${HOTSPOT_SSID:-SDR-Pi})
  sudo sdrkit auto              vuelve al modo automático (WiFi conocida o hotspot)
  sudo sdrkit wifi "Red" "clave"  guarda una red WiFi (ej. el hotspot del celular)
  sdrkit redes                  lista las redes guardadas
  sudo sdrkit clave             cambia la clave del panel y de OpenWebRX+ (admin)
  sudo sdrkit clave-hotspot     cambia la clave del hotspot
  sudo sdrkit perfiles          reescribe los perfiles de bandas de OpenWebRX+
  sudo sdrkit probar-sdr        prueba el dongle con rtl_test (pausa el panel unos segundos)
  sdrkit grabaciones            dónde están las grabaciones y cuánto ocupan
  sdrkit decodificadores        qué decodificadores quedaron instalados
  sudo sdrkit actualizar        trae la última versión de GitHub (en casa, con internet)
  sdrkit actualizar --buscar    sólo dice si hay una versión nueva
  sudo sdrkit volver            regresa a la versión anterior si algo no te gustó
  sdrkit version                versión instalada
  sudo sdrkit config            edita la configuración (sdrkit.conf) y reinicia el panel
  sudo sdrkit instalar-dsd      instala DSD-FME (voz DMR/P25/D-Star/YSF/NXDN/dPMR/M17) después
  sdrkit logs                   registros en vivo (Ctrl+C para salir)
  sudo sdrkit reiniciar         reinicia los servicios de SDR-Kit
EOF
}

case "${1:-ayuda}" in
  estado|status)
    echo "== Servicios"
    for s in sdrkit sdrkit-netwatch openwebrx tailscaled; do
      printf '  %-16s %s\n' "$s" "$(systemctl is-active "$s" 2>/dev/null)"
    done
    echo "== Red"
    nmcli -t -f DEVICE,STATE,CONNECTION device status 2>/dev/null | grep -E '^wlan|^eth|^usb' | sed 's/^/  /'
    echo "  modo forzado: $(cat /run/sdrkit/netmode 2>/dev/null || echo auto)"
    ip -4 -o addr show | awk '$2!="lo"{print "  " $2 ": " $4}'
    command -v tailscale >/dev/null && echo "  tailscale: $(tailscale ip -4 2>/dev/null || echo 'sin enlazar')"
    echo "  Panel: http://$(hostname).local  ·  Hotspot: http://${HOTSPOT_IP:-192.168.4.1}"
    echo "== SDR (USB)"
    lsusb 2>/dev/null | grep -iE 'realtek|rtl|0bda:28|hackrf|1d50:' | sed 's/^/  /' || echo "  (no detectado)"
    echo "== Energía y temperatura"
    command -v vcgencmd >/dev/null && echo "  $(vcgencmd get_throttled)  (0x0 = todo bien; 0x50005 = bajo voltaje)"
    command -v vcgencmd >/dev/null && echo "  $(vcgencmd measure_temp)"
    ;;
  hotspot)
    need_root "$@"
    mkdir -p /run/sdrkit && echo hotspot > /run/sdrkit/netmode
    nmcli connection up "$HS" && echo "Hotspot «${HOTSPOT_SSID}» activo → http://${HOTSPOT_IP:-192.168.4.1}"
    ;;
  auto)
    need_root "$@"
    mkdir -p /run/sdrkit && echo auto > /run/sdrkit/netmode
    nmcli connection down "$HS" 2>/dev/null
    echo "Modo automático: se conectará a una red conocida; si no hay, el hotspot vuelve en ~1 minuto."
    ;;
  wifi)
    need_root "$@"
    ssid="$2"; pass="$3"
    [ -n "$ssid" ] || { echo 'Uso: sudo sdrkit wifi "NombreRed" "clave"'; exit 1; }
    name="sdrkit-$(printf '%s' "$ssid" | tr -c 'A-Za-z0-9_.-' '_' | cut -c1-40)"
    nmcli connection delete "$name" >/dev/null 2>&1
    if [ -n "$pass" ]; then
      nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" \
        connection.autoconnect yes connection.autoconnect-priority 20 wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$pass"
    else
      nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" \
        connection.autoconnect yes connection.autoconnect-priority 20
    fi && echo "Red «$ssid» guardada. Se usará automáticamente cuando esté al alcance."
    ;;
  redes)
    nmcli -f NAME,TYPE,AUTOCONNECT,AUTOCONNECT-PRIORITY connection show | grep -E 'NAME|wifi'
    ;;
  clave)
    need_root "$@"
    read -r -s -p "Nueva clave del panel/OpenWebRX+: " p1; echo
    read -r -s -p "Repite la clave: " p2; echo
    [ "$p1" = "$p2" ] && [ -n "$p1" ] || { echo "No coinciden o está vacía."; exit 1; }
    case "$p1" in *'"'*) echo 'La clave no puede contener comillas dobles (").'; exit 1;; esac
    sdrkit_set_conf ADMIN_PASSWORD "$p1" "$CONF"
    if command -v openwebrx >/dev/null; then
      if openwebrx admin --silent hasuser admin; then
        OWRX_PASSWORD="$p1" openwebrx admin --noninteractive resetpassword admin >/dev/null
      else
        OWRX_PASSWORD="$p1" openwebrx admin --noninteractive adduser admin >/dev/null
      fi
      chown openwebrx: /var/lib/openwebrx/users.json 2>/dev/null
    fi
    systemctl restart sdrkit && echo "Clave cambiada."
    ;;
  clave-hotspot)
    need_root "$@"
    read -r -s -p "Nueva clave del hotspot (8+ caracteres): " p1; echo
    [ ${#p1} -ge 8 ] || { echo "Mínimo 8 caracteres."; exit 1; }
    case "$p1" in *'"'*) echo 'La clave no puede contener comillas dobles (").'; exit 1;; esac
    sdrkit_set_conf HOTSPOT_PASSWORD "$p1" "$CONF"
    nmcli connection modify "$HS" wifi-sec.psk "$p1" && echo "Clave del hotspot cambiada (se aplica al reactivarlo)."
    ;;
  perfiles)
    need_root "$@"
    systemctl stop openwebrx
    python3 /opt/sdrkit/sdrkit_server.py --seed-owrx --force
    echo "Listo. Abre el receptor desde el panel para aplicarlos."
    ;;
  probar-sdr)
    need_root "$@"
    echo "Pausando servicios que usan el dongle…"
    systemctl stop sdrkit openwebrx
    timeout 8 rtl_test -t; echo
    timeout 6 rtl_test -s 2400000 2>&1 | tail -n 4
    systemctl start sdrkit
    echo "(Si ves 'Found 1 device(s)' y el sintonizador R828D/R820T, el dongle funciona.)"
    ;;
  grabaciones|recs)
    d="${REC_DIR:-/var/lib/sdrkit/grabaciones}"
    echo "Carpeta: $d"
    echo "Archivos: $(find "$d" -name '*.wav' 2>/dev/null | wc -l) · Ocupan: $(du -sh "$d" 2>/dev/null | cut -f1)"
    ls -1t "$d" 2>/dev/null | head -7 | sed 's/^/  día: /'
    echo "Copiarlas a tu PC:  scp -r $(id -un)@$(hostname).local:$d ."
    ;;
  actualizar|update)
    shift
    # se copia a /run para que la actualización pueda reemplazar el archivo original sin problemas
    cp /opt/sdrkit/sdrkit-update.sh /run/sdrkit-update.sh 2>/dev/null || { echo "Falta /opt/sdrkit/sdrkit-update.sh: reinstala."; exit 1; }
    exec bash /run/sdrkit-update.sh "$@"
    ;;
  volver|rollback)
    need_root "$@"
    exec bash /opt/sdrkit/sdrkit-update.sh --volver
    ;;
  version|versión|-v|--version)
    echo "SDR-Kit $(cat /opt/sdrkit/VERSION 2>/dev/null || echo '?') · commit $(cut -c1-7 /var/lib/sdrkit/commit 2>/dev/null || echo 'desconocido')"
    echo "Origen: ${SDRKIT_REPO:-$(git -C /opt/sdrkit-src remote get-url origin 2>/dev/null || echo "$SDRKIT_DEFAULT_REPO")} (rama ${SDRKIT_BRANCH:-main})"
    ;;
  config|configurar)
    need_root "$@"
    cp -a "$CONF" "$CONF.bak"
    "${EDITOR:-nano}" "$CONF" && systemctl restart sdrkit-netwatch sdrkit && echo "Guardado y aplicado (copia anterior: $CONF.bak)."
    ;;
  decodificadores|decoders)
    python3 - <<'PY'
import sys
sys.path.insert(0, "/opt/sdrkit")
import sdrkit_decoders as d
st = d.status()
print("OpenWebRX+:", "sí" if st["openwebrx"] else "no", "· llave AMBE:", "sí" if st["ambe"] else "no")
for it in st["items"]:
    print("  %s %-62s %s" % ("✔" if it["available"] else "·", it["name"][:62], "" if it["available"] else "falta: " + ", ".join(it["needs"])))
PY
    ;;
  instalar-dsd)
    need_root "$@"
    sdrkit_set_conf INSTALL_DSD "" "$CONF"
    kit=""; for d in /boot/firmware/sdrkit /boot/sdrkit "$HOME/sdrkit"; do [ -f "$d/install.sh" ] && kit="$d" && break; done
    [ -n "$kit" ] || { echo "No encuentro la carpeta del kit (install.sh). Cópiala a /boot/firmware/sdrkit."; exit 1; }
    sed -i 's/^INSTALL_DSD=.*/INSTALL_DSD=""/' "$kit/sdrkit.conf" 2>/dev/null
    bash "$kit/install.sh"
    ;;
  logs)
    journalctl -u sdrkit -u sdrkit-netwatch -u openwebrx -n 60 -f
    ;;
  reiniciar|restart)
    need_root "$@"
    systemctl restart sdrkit-netwatch sdrkit && echo "Servicios reiniciados."
    ;;
  *) ayuda ;;
esac
