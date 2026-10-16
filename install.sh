#!/bin/bash
# =====================================================================
#  SDR-Kit · instalador
#  Raspberry Pi Zero 2 W + RTL-SDR + power bank  →  analizador de espectro
#  estilo tinySA + receptor web (OpenWebRX+) + hotspot WiFi automático.
#
#  Uso (en la Raspberry, por SSH):
#     sudo bash /boot/firmware/sdrkit/install.sh
#
#  Hace las preguntas al principio y luego instala en segundo plano:
#  si se corta el SSH, la instalación sigue. Para ver el progreso:
#     tail -f /var/log/sdrkit-install.log
# =====================================================================
set -o pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG=/var/log/sdrkit-install.log
ETC=/etc/sdrkit
CONF="$ETC/sdrkit.conf"
OPT=/opt/sdrkit
STAGE="${1:-}"

c_ok=$'\e[32m'; c_warn=$'\e[33m'; c_err=$'\e[31m'; c_b=$'\e[1m'; c_0=$'\e[0m'
say()  { echo "${c_b}==>${c_0} $*"; }
ok()   { echo "${c_ok}  ✔${c_0} $*"; }
warn() { echo "${c_warn}  ⚠${c_0} $*"; }
die()  { echo "${c_err}  ✖ $*${c_0}"; exit 1; }
is_yes() { case "$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')" in si|sí|s|yes|y|true|1|on) return 0;; *) return 1;; esac; }

[ "$(id -u)" -eq 0 ] || die "Ejecuta con sudo:  sudo bash $0"
[ -f "$KIT/files/sdrkit_server.py" ] && [ -f "$KIT/files/sdrkit_radio.py" ] || die "No encuentro $KIT/files/. Copia la carpeta sdrkit completa."
# shellcheck source=files/sdrkit-lib.sh
source "$KIT/files/sdrkit-lib.sh"

# Súbelo cuando una versión nueva necesite paquetes o cambios del sistema: «sdrkit actualizar» hará entonces
# la instalación completa (si no, sólo copia el panel, que tarda segundos).
INSTALL_REV=1
STATE_DIR=/var/lib/sdrkit
APT=(apt-get -y -o DPkg::Lock::Timeout=600 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)
export DEBIAN_FRONTEND=noninteractive

# Copia el panel a /opt/sdrkit y lo deja como servicio (lo usan la instalación completa y «sdrkit actualizar»)
install_panel() {
  mkdir -p "$OPT/web" /var/lib/sdrkit
  install -m 755 "$KIT/files/sdrkit_server.py" "$OPT/sdrkit_server.py"
  install -m 644 "$KIT/files/sdrkit_radio.py" "$OPT/sdrkit_radio.py"
  install -m 644 "$KIT/files/sdrkit_decoders.py" "$OPT/sdrkit_decoders.py"
  install -m 644 "$KIT/files/demo_m17.sym" "$OPT/demo_m17.sym"
  install -m 755 "$KIT/files/sdrkit-update.sh" "$OPT/sdrkit-update.sh"
  install -m 644 "$KIT/VERSION" "$OPT/VERSION"
  rm -rf "$OPT/web" && mkdir -p "$OPT/web" "${REC_DIR:-/var/lib/sdrkit/grabaciones}"
  install -m 644 "$KIT/files/sdrkit-lib.sh" "$OPT/sdrkit-lib.sh"
  install -m 755 "$KIT/files/sdrkit-netwatch.sh" "$OPT/sdrkit-netwatch.sh"
  install -m 755 "$KIT/files/sdrkit-cli.sh" /usr/local/bin/sdrkit
  install -m 644 "$KIT/files/sdrkit-cli.sh" "$OPT/sdrkit-cli.sh"
  install -m 644 "$KIT"/files/web/* "$OPT/web/"
  install -m 644 "$KIT/files/sdrkit.service" /etc/systemd/system/sdrkit.service
  install -m 644 "$KIT/files/sdrkit-netwatch.service" /etc/systemd/system/sdrkit-netwatch.service
  systemctl stop openwebrx 2>/dev/null
  python3 "$OPT/sdrkit_server.py" --seed-owrx && ok "Perfiles de bandas cargados en OpenWebRX+."
  # anuncia el panel en la red local (aparece como servicio web en apps tipo "Fing")
  cat > /etc/avahi/services/sdrkit.service <<EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">SDR-Kit en %h</name>
  <service><type>_http._tcp</type><port>${PANEL_PORT:-80}</port></service>
</service-group>
EOF
  systemctl daemon-reload
  # OpenWebRX+ no arranca solo: el panel lo enciende cuando eliges «Receptor»
  systemctl disable openwebrx >/dev/null 2>&1
  systemctl enable sdrkit >/dev/null 2>&1
  ok "Panel instalado en $OPT (comando de ayuda: sdrkit)."
}

# Fusiona la configuración: conserva la tuya y agrega las opciones nuevas de esta versión
merge_conf_from_kit() {
  local n
  n=$(sdrkit_merge_conf "$KIT/sdrkit.conf" "$CONF")
  [ "${n:-0}" -gt 0 ] && ok "Configuración conservada; $n opciones nuevas agregadas a $CONF." || ok "Configuración conservada."
}

# Anota qué versión quedó instalada (la usa el actualizador)
record_version() {
  mkdir -p "$STATE_DIR"
  echo "$INSTALL_REV" > "$STATE_DIR/install_rev"
  if [ -d "$KIT/.git" ]; then git -C "$KIT" rev-parse HEAD > "$STATE_DIR/commit" 2>/dev/null || true; fi
}

# =====================================================================
#  ACTUALIZACIÓN RÁPIDA (sólo el panel): la usa «sdrkit actualizar»
# =====================================================================
if [ "$STAGE" = "--panel" ]; then
  [ -f "$CONF" ] || die "No hay una instalación previa: ejecuta primero el instalador completo."
  merge_conf_from_kit
  sdrkit_load_conf "$CONF"
  install_panel
  systemctl restart sdrkit && ok "Panel reiniciado con la versión $(cat "$KIT/VERSION" 2>/dev/null)."
  record_version
  exit 0
fi

# =====================================================================
#  ETAPA 1: comprobaciones y preguntas (interactiva)
# =====================================================================
if [ "$STAGE" != "--stage2" ]; then
  echo
  echo "${c_b}SDR-Kit · instalador${c_0}"
  echo "-------------------------------------------------------------"
  . /etc/os-release 2>/dev/null
  CODENAME="${VERSION_CODENAME:-desconocido}"
  ARCH="$(dpkg --print-architecture 2>/dev/null)"
  MODEL="$(tr -d '\0' < /proc/device-tree/model 2>/dev/null)"
  say "Sistema: ${PRETTY_NAME:-?} · $ARCH · ${MODEL:-?}"
  case "$CODENAME" in
    bookworm|trixie) ok "Versión compatible ($CODENAME)." ;;
    *) die "Este kit es para Raspberry Pi OS Bookworm o Trixie (tienes: $CODENAME)." ;;
  esac
  command -v nmcli >/dev/null || die "Falta NetworkManager (nmcli). Usa Raspberry Pi OS Lite reciente."
  case "$MODEL" in *"Zero 2"*) ;; *) warn "No es una Pi Zero 2 W; igual debería funcionar." ;; esac
  avail_kb=$(df --output=avail / | tail -1)
  [ "${avail_kb:-0}" -gt 2500000 ] || warn "Queda poco espacio en la microSD (<2.5 GB)."

  # configuración: la tuya se conserva siempre que se instale desde GitHub (carpeta con .git)
  mkdir -p "$ETC"
  if [ -d "$KIT/.git" ] && [ -f "$CONF" ]; then
    merge_conf_from_kit
  elif [ -d "$KIT/.git" ] && [ -f /boot/firmware/sdrkit.conf ]; then
    sed 's/\r$//' /boot/firmware/sdrkit.conf > "$CONF"   # preparada desde la PC en la microSD
    merge_conf_from_kit
  elif [ -f "$KIT/sdrkit.conf" ]; then
    sed 's/\r$//' "$KIT/sdrkit.conf" > "$CONF.new"
    # conserva claves ya guardadas en una instalación anterior si el kit las trae vacías
    if [ -f "$CONF" ]; then
      ( sdrkit_load_conf "$CONF"
        for k in HOTSPOT_PASSWORD ADMIN_PASSWORD; do
          v="${!k}"
          grep -qE "^${k}=\"\"" "$CONF.new" && [ -n "$v" ] && sdrkit_set_conf "$k" "$v" "$CONF.new"
        done )
    fi
    mv "$CONF.new" "$CONF"
  fi
  [ -f "$CONF" ] || die "No encuentro sdrkit.conf"
  chmod 600 "$CONF"
  sdrkit_load_conf "$CONF"
  # instalación desde GitHub: recuerda de dónde actualizar
  if [ -d "$KIT/.git" ]; then
    url="$(git -C "$KIT" remote get-url origin 2>/dev/null)"; br="$(git -C "$KIT" rev-parse --abbrev-ref HEAD 2>/dev/null)"
    [ -n "$url" ] && [ -z "${SDRKIT_REPO:-}" ] && sdrkit_set_conf SDRKIT_REPO "$url" "$CONF"
    [ -n "$br" ] && [ "$br" != HEAD ] && [ -z "${SDRKIT_BRANCH:-}" ] && sdrkit_set_conf SDRKIT_BRANCH "$br" "$CONF"
    sdrkit_load_conf "$CONF"
  fi

  ask_pass() {  # variable  texto  mínimo
    local var="$1" text="$2" min="$3" p1 p2
    while true; do
      read -r -s -p "  $text: " p1; echo
      if [ ${#p1} -lt "$min" ]; then echo "    Debe tener al menos $min caracteres."; continue; fi
      case "$p1" in *'"'*) echo '    No uses comillas dobles (").'; continue;; esac
      read -r -s -p "  Repítela: " p2; echo
      [ "$p1" = "$p2" ] || { echo "    No coinciden."; continue; }
      sdrkit_set_conf "$var" "$p1" "$CONF"
      printf -v "$var" '%s' "$p1"
      break
    done
  }
  if [ -t 0 ]; then
    if [ ${#HOTSPOT_PASSWORD} -lt 8 ]; then
      say "Clave para el hotspot WiFi «${HOTSPOT_SSID:-SDR-Pi}» (la red que crea la Raspberry)"
      ask_pass HOTSPOT_PASSWORD "Clave del hotspot (8+ caracteres)" 8
    fi
    if [ -z "$ADMIN_PASSWORD" ]; then
      say "Clave del panel web y del usuario «admin» de OpenWebRX+"
      ask_pass ADMIN_PASSWORD "Clave de administrador" 4
    fi
  else
    gen() { tr -dc 'A-HJ-NP-Za-km-z2-9' < /dev/urandom | head -c 10; }
    [ ${#HOTSPOT_PASSWORD} -ge 8 ] || { HOTSPOT_PASSWORD="$(gen)"; sdrkit_set_conf HOTSPOT_PASSWORD "$HOTSPOT_PASSWORD" "$CONF"; }
    [ -n "$ADMIN_PASSWORD" ] || { ADMIN_PASSWORD="$(gen)"; sdrkit_set_conf ADMIN_PASSWORD "$ADMIN_PASSWORD" "$CONF"; }
    warn "Sin terminal interactiva: claves generadas y guardadas en $CONF"
  fi

  # voz digital en el panel (DSD-FME + mbelib): sólo con aceptación explícita del aviso de patentes
  dsd_choice="$(echo "${INSTALL_DSD:-}" | tr '[:upper:]' '[:lower:]')"
  if [ -z "$dsd_choice" ] && [ -t 0 ]; then
    echo
    say "Voz digital en el panel: DMR, P25, D-Star, Yaesu Fusion, NXDN, dPMR y M17 (DSD-FME)"
    echo "    Usa mbelib, que implementa los códecs de voz AMBE/IMBE. Esos códecs están PATENTADOS:"
    echo "    en algunos países usarlos sin licencia puede infringir patentes. Es software libre"
    echo "    para estudio y uso personal; tú decides. Aviso completo:"
    echo "      https://github.com/lwvmobile/mbelib#readme"
    echo "    Alternativa con licencia: una llave USB AMBE3000 (ver AMBE_TTY en sdrkit.conf)."
    echo "    Compilarlo agrega ~30-50 minutos a la instalación en una Pi Zero 2 W."
    read -r -p "  ¿Leíste el aviso y quieres instalar DSD-FME? (si/no) [no]: " ans
    if is_yes "$ans"; then sdrkit_set_conf INSTALL_DSD "si" "$CONF"; INSTALL_DSD=si
    else sdrkit_set_conf INSTALL_DSD "no" "$CONF"; INSTALL_DSD=no; fi
  fi

  echo
  say "Todo listo. La instalación tarda entre 20 y 45 minutos en una Pi Zero 2 W."
  echo "    Sigue aunque se corte el SSH. Progreso:  tail -f $LOG"
  echo "    Al terminar la Raspberry se reinicia sola."
  echo
  if systemctl is-active --quiet sdrkit-install; then
    warn "Ya hay una instalación en curso; muestro su progreso (Ctrl+C para salir)."
    exec tail -n 40 -f "$LOG"
  fi
  : > "$LOG"
  systemctl reset-failed sdrkit-install >/dev/null 2>&1
  if ! systemd-run --unit=sdrkit-install --description="Instalador SDR-Kit" --collect \
        /bin/bash "$KIT/install.sh" --stage2 >/dev/null; then
    die "No se pudo lanzar el instalador en segundo plano."
  fi
  sleep 1
  tail -n +1 -f "$LOG" &
  TP=$!
  trap 'kill $TP 2>/dev/null; echo; echo "(La instalación continúa en segundo plano: tail -f $LOG)"; exit 0' INT
  while systemctl is-active --quiet sdrkit-install; do sleep 2; done
  sleep 1
  kill $TP 2>/dev/null
  exit 0
fi

# =====================================================================
#  ETAPA 2: instalación (en segundo plano, todo va al registro)
# =====================================================================
exec >>"$LOG" 2>&1
sdrkit_load_conf "$CONF"
. /etc/os-release
CODENAME="$VERSION_CODENAME"
STEP=0
step() { STEP=$((STEP + 1)); echo; echo "${c_b}[$STEP/11] $*${c_0}  ($(date +%H:%M:%S))"; }
fail() { echo "${c_err}✖ ERROR: $*${c_0}"; echo "Revisa este registro ($LOG) y vuelve a ejecutar el instalador: es seguro repetirlo."; exit 1; }

# ---------------------------------------------------------------------
step "Preparando el sistema"
# más swap mientras se instala (la Zero 2 W tiene 512 MB de RAM)
if [ -f /etc/dphys-swapfile ]; then
  cur=$(sed -n 's/^CONF_SWAPSIZE=//p' /etc/dphys-swapfile)
  if [ "${cur:-0}" -lt 1024 ] 2>/dev/null; then
    sed -i 's/^#\?CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
    systemctl restart dphys-swapfile && ok "Swap ampliado a 1 GB."
  fi
elif ! swapon --show | grep -q .; then
  if [ ! -f /var/swap.sdrkit ]; then
    fallocate -l 1G /var/swap.sdrkit && chmod 600 /var/swap.sdrkit && mkswap /var/swap.sdrkit >/dev/null
  fi
  swapon /var/swap.sdrkit 2>/dev/null && ok "Swap temporal de 1 GB activo."
fi
if [ -n "$WIFI_COUNTRY" ] && command -v raspi-config >/dev/null; then
  raspi-config nonint do_wifi_country "$WIFI_COUNTRY" && ok "País WiFi: $WIFI_COUNTRY"
fi
rfkill unblock wifi 2>/dev/null || true
"${APT[@]}" update || fail "apt update (¿hay internet?)"
if is_yes "$UPGRADE_SYSTEM"; then
  "${APT[@]}" full-upgrade || warn "La actualización completa tuvo errores; sigo."
fi

# ---------------------------------------------------------------------
step "Instalando paquetes base"
"${APT[@]}" install python3 python3-numpy rtl-sdr iw dnsmasq-base avahi-daemon curl gpg ca-certificates usbutils git \
  || fail "no se pudieron instalar los paquetes base"
ok "Paquetes base listos."

# ---------------------------------------------------------------------
step "Driver del RTL-SDR"
mkdir -p /etc/modprobe.d
cat > /etc/modprobe.d/sdrkit-blacklist-dvb.conf <<'EOF'
# SDR-Kit: el kernel no debe tomar el dongle como sintonizador de TV
blacklist dvb_usb_rtl28xxu
blacklist rtl2832
blacklist rtl2832_sdr
blacklist rtl2830
EOF
for m in rtl2832_sdr dvb_usb_rtl28xxu rtl2832 rtl2830; do modprobe -r "$m" 2>/dev/null || true; done
want_blog=no
case "$RTLSDR_DRIVER" in
  blog) want_blog=yes ;;
  distro) want_blog=no ;;
  *) [ "$CODENAME" = "bookworm" ] && want_blog=yes ;;   # Bookworm trae librtlsdr 0.6.0 sin soporte para el V4
esac
if [ "$want_blog" = yes ]; then
  if dpkg -s librtlsdr0 2>/dev/null | grep -q 'rtlsdrblog'; then
    ok "Driver de RTL-SDR Blog ya instalado."
  else
    echo "Compilando el driver de RTL-SDR Blog (5–10 minutos)…"
    "${APT[@]}" install git cmake build-essential debhelper libusb-1.0-0-dev pkg-config || fail "dependencias de compilación"
    rm -rf /usr/local/src/rtl-sdr-blog
    git clone --depth 1 https://github.com/rtlsdrblog/rtl-sdr-blog /usr/local/src/rtl-sdr-blog || fail "no se pudo descargar rtl-sdr-blog"
    ( cd /usr/local/src/rtl-sdr-blog && dpkg-buildpackage -b --no-sign ) || fail "falló la compilación del driver"
    apt-mark unhold librtlsdr0 librtlsdr-dev rtl-sdr >/dev/null 2>&1
    dpkg -i /usr/local/src/librtlsdr0_*.deb /usr/local/src/librtlsdr-dev_*.deb /usr/local/src/rtl-sdr_*.deb || fail "no se pudo instalar el driver"
    apt-mark hold librtlsdr0 librtlsdr-dev rtl-sdr >/dev/null
    ok "Driver de RTL-SDR Blog instalado (y retenido para que apt no lo reemplace)."
  fi
else
  ok "Uso el driver del sistema (en Trixie ya soporta el RTL-SDR Blog V4)."
fi
udevadm control --reload-rules 2>/dev/null; udevadm trigger 2>/dev/null || true

# ---------------------------------------------------------------------
step "Instalando OpenWebRX+ (receptor web)"
ppa="https://luarvique.github.io/ppa"
curl -fsSL "$ppa/openwebrx-plus.gpg" | gpg --yes --dearmor -o /etc/apt/trusted.gpg.d/openwebrx-plus.gpg \
  || fail "no se pudo descargar la llave del repositorio de OpenWebRX+"
echo "deb [signed-by=/etc/apt/trusted.gpg.d/openwebrx-plus.gpg] $ppa/$CODENAME ./" > /etc/apt/sources.list.d/openwebrx-plus.list
rm -f /etc/apt/sources.list.d/openwebrx.list   # el repo original choca con OpenWebRX+
"${APT[@]}" update || fail "apt update con el repositorio de OpenWebRX+"
echo "openwebrx openwebrx/admin_user_password password $ADMIN_PASSWORD" | debconf-set-selections
"${APT[@]}" install --no-install-recommends openwebrx || fail "no se pudo instalar openwebrx"
# decodificadores útiles y livianos (sin los pesados wsjtx/js8call, que necesitan entorno gráfico)
EXTRAS=(python3-digiham codecserver direwolf nmux redsea multimon-ng rtl-433 dump1090-fa-minimal acarsdec
        dumpvdl2 dumphfdl dump978-fa-minimal codec2 m17-demod sonde-decoders aprs-symbols lame imagemagick
        python3-paho-mqtt python3-csdr-eti dablin nrsc5 codecserver-driver-ambe3k)
is_yes "${INSTALL_WSJTX:-no}" && EXTRAS+=(wsjtx js8call)   # FT8/FT4/WSPR/JS8: pesados (≈300 MB)
avail=()
for p in "${EXTRAS[@]}"; do apt-cache show "$p" >/dev/null 2>&1 && avail+=("$p"); done
if ! "${APT[@]}" install --no-install-recommends "${avail[@]}"; then
  warn "Instalando decodificadores uno por uno…"
  for p in "${avail[@]}"; do "${APT[@]}" install --no-install-recommends "$p" >/dev/null 2>&1 || warn "omitido: $p"; done
fi
# usuario admin (por si debconf no lo creó)
if openwebrx admin --silent hasuser admin; then
  OWRX_PASSWORD="$ADMIN_PASSWORD" openwebrx admin --noninteractive resetpassword admin >/dev/null
else
  OWRX_PASSWORD="$ADMIN_PASSWORD" openwebrx admin --noninteractive adduser admin >/dev/null
fi
chown openwebrx: /var/lib/openwebrx/users.json 2>/dev/null
# llave AMBE3000 (camino con licencia para DMR, D-Star, YSF, NXDN y P25 en OpenWebRX+)
if [ -n "${AMBE_TTY:-}" ] && [ -f /etc/codecserver/codecserver.conf ]; then
  if ! grep -q '^\[device:sdrkit-ambe\]' /etc/codecserver/codecserver.conf; then
    printf '\n[device:sdrkit-ambe]\ndriver=ambe3k\ntty=%s\nbaudrate=%s\n' "$AMBE_TTY" "${AMBE_BAUD:-921600}" >> /etc/codecserver/codecserver.conf
  fi
  systemctl enable --now codecserver >/dev/null 2>&1 || true
  ok "Llave AMBE configurada en $AMBE_TTY: voz digital en el receptor avanzado."
fi
ok "OpenWebRX+ instalado (usuario admin)."

# ---------------------------------------------------------------------
step "Voz digital en el panel (DSD-FME)"
if is_yes "${INSTALL_DSD:-no}"; then
  if command -v dsd-fme >/dev/null && [ "$(cat /usr/local/share/sdrkit-dsd.ver 2>/dev/null)" = "72b3e5e" ]; then
    ok "DSD-FME ya instalado."
  else
    echo "Compilando mbelib y DSD-FME (30–50 minutos en una Pi Zero 2 W; no la apagues)…"
    "${APT[@]}" install git cmake build-essential pkg-config libsndfile1-dev libpulse-dev libfftw3-dev liblapack-dev \
      libncurses-dev libcodec2-dev libusb-1.0-0-dev || fail "dependencias de DSD-FME"
    dpkg -s librtlsdr-dev >/dev/null 2>&1 || "${APT[@]}" install librtlsdr-dev || warn "sin librtlsdr-dev (no hace falta)"
    src=/usr/local/src/sdrkit-dsd; rm -rf "$src"; mkdir -p "$src"
    git clone -b ambe_tones https://github.com/lwvmobile/mbelib "$src/mbelib" || fail "no se pudo descargar mbelib"
    ( cd "$src/mbelib" && git checkout -q 30dc790 2>/dev/null; mkdir -p build && cd build && cmake .. && make -j2 && make install && ldconfig ) \
      || fail "falló la compilación de mbelib"
    git clone https://github.com/lwvmobile/dsd-fme "$src/dsd-fme" || fail "no se pudo descargar DSD-FME"
    ( cd "$src/dsd-fme" && { git checkout -q 72b3e5e 2>/dev/null || echo "(uso la versión más reciente)"; } \
      && mkdir -p build && cd build && cmake .. && make -j2 && make install && ldconfig ) || fail "falló la compilación de DSD-FME"
    echo 72b3e5e > /usr/local/share/sdrkit-dsd.ver
    rm -rf "$src"
    ok "DSD-FME instalado: modo «Digital» en el Radio del panel."
  fi
else
  ok "Omitido (INSTALL_DSD=no). El panel identifica igual las señales digitales; para escucharlas activa INSTALL_DSD o usa una llave AMBE."
fi

# ---------------------------------------------------------------------
step "Instalando el panel SDR-Kit"
install_panel

# ---------------------------------------------------------------------
step "Configurando WiFi: hotspot automático"
sdrkit_setup_hotspot || fail "no se pudo crear el hotspot"
ok "Hotspot «$HOTSPOT_SSID» creado (se enciende solo cuando no hay WiFi conocida)."
IFS=';' read -r -a nets <<< "$WIFI_NETWORKS"
for entry in "${nets[@]}"; do
  [ -n "$entry" ] || continue
  ssid="${entry%%|*}"; pass=""; [[ "$entry" == *"|"* ]] && pass="${entry#*|}"
  name="sdrkit-$(printf '%s' "$ssid" | tr -c 'A-Za-z0-9_.-' '_' | cut -c1-40)"
  nmcli connection delete "$name" >/dev/null 2>&1
  if [ -n "$pass" ]; then
    nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" connection.autoconnect yes \
      connection.autoconnect-priority 20 wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$pass" >/dev/null && ok "Red guardada: $ssid"
  else
    nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" connection.autoconnect yes \
      connection.autoconnect-priority 20 >/dev/null && ok "Red abierta guardada: $ssid"
  fi
done
mkdir -p /etc/NetworkManager/conf.d
cat > /etc/NetworkManager/conf.d/sdrkit-powersave.conf <<'EOF'
# SDR-Kit: sin ahorro de energía en el WiFi (evita cortes de audio y lentitud)
[connection]
wifi.powersave = 2
EOF
iw dev "${WIFI_IFACE:-wlan0}" set power_save off 2>/dev/null
systemctl enable sdrkit-netwatch >/dev/null 2>&1
ok "Vigilante de red activado."

# ---------------------------------------------------------------------
step "Ajustes de energía y cuidado de la microSD"
CFG=/boot/firmware/config.txt; [ -f "$CFG" ] || CFG=/boot/config.txt
if is_yes "$DISABLE_BLUETOOTH"; then
  grep -q '^dtoverlay=disable-bt' "$CFG" || printf '\n# SDR-Kit: Bluetooth apagado (mejora el WiFi y ahorra batería)\ndtoverlay=disable-bt\n' >> "$CFG"
  systemctl disable --now hciuart bluetooth >/dev/null 2>&1
  ok "Bluetooth desactivado."
fi
if is_yes "$REDUCE_SD_WRITES"; then
  mkdir -p /etc/systemd/journald.conf.d
  printf '[Journal]\nStorage=volatile\nRuntimeMaxUse=24M\n' > /etc/systemd/journald.conf.d/sdrkit.conf
  ok "Registros del sistema en RAM."
fi
systemctl disable --now ModemManager >/dev/null 2>&1 || true

# ---------------------------------------------------------------------
step "Acceso remoto (Tailscale)"
if is_yes "$INSTALL_TAILSCALE"; then
  if ! command -v tailscale >/dev/null; then
    curl -fsSL https://tailscale.com/install.sh | sh || warn "No se pudo instalar Tailscale (puedes hacerlo luego)."
  fi
  if command -v tailscale >/dev/null; then
    systemctl enable --now tailscaled >/dev/null 2>&1
    if [ -n "$TAILSCALE_AUTHKEY" ]; then
      tailscale up --auth-key="$TAILSCALE_AUTHKEY" --hostname="$(hostname)" && ok "Tailscale enlazado."
    else
      ok "Tailscale instalado. Para enlazarlo: sudo tailscale up  (y abre el enlace que muestra)."
    fi
  fi
else
  ok "Omitido."
fi

# ---------------------------------------------------------------------
step "Arrancando servicios"
systemctl restart sdrkit && ok "Panel en marcha."
sleep 2
curl -fs -o /dev/null "http://127.0.0.1:${PANEL_PORT:-80}/login" && ok "El panel responde." || warn "El panel no responde todavía (revisa: sdrkit logs)."
if lsusb | grep -qiE '0bda:28(38|32)'; then ok "RTL-SDR detectado: $(lsusb | grep -iE '0bda:28(38|32)' | cut -d' ' -f7-)"
else warn "No veo el RTL-SDR conectado ahora mismo (puedes conectarlo después)."; fi

step "¡Listo!"
IPS=$(ip -4 -o addr show | awk '$2!="lo"{split($4,a,"/"); printf "%s ", a[1]}')
cat <<EOF

  ${c_ok}SDR-Kit instalado.${c_0} La Raspberry se reiniciará en 15 segundos.

  En casa (misma WiFi):   http://$(hostname).local    o   http://${IPS% }
  Fuera de casa:          conéctate al WiFi «$HOTSPOT_SSID» y abre  http://${HOTSPOT_IP}
  Receptor OpenWebRX+:    puerto 8073 (se abre desde el panel)
  Clave del panel / admin: la que elegiste (ADMIN_PASSWORD en $CONF)

  Grabaciones:            ${REC_DIR:-/var/lib/sdrkit/grabaciones} (descárgalas desde la pestaña Grabaciones)
  Actualizar (en casa, con internet):  sudo sdrkit actualizar   · o en el panel: Más → Sistema
  Ayuda por SSH:  sdrkit
EOF
record_version
sync
sleep 15
systemctl reboot
exit 0
