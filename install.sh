#!/bin/bash
# =====================================================================
#  SDR-Kit · installer · instalador
#  Raspberry Pi Zero 2 W + RTL-SDR + power bank  →  tinySA-style spectrum
#  analyzer + web receiver (OpenWebRX+) + automatic WiFi hotspot.
#  Analizador de espectro estilo tinySA + receptor web + hotspot automático.
#
#  Usage · Uso (on the Pi, over SSH · en la Raspberry, por SSH):
#     sudo bash /boot/firmware/sdrkit/install.sh
#
#  It asks its questions first, then installs in the background: if SSH
#  drops, the installation goes on. Progress · Progreso:
#     tail -f /var/log/sdrkit-install.log
#  Hace las preguntas al principio y luego instala en segundo plano.
#
#  install.sh --panel   panel-only update (used by "sdrkit update")
# =====================================================================
set -o pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG=/var/log/sdrkit-install.log
ETC=/etc/sdrkit
CONF="$ETC/sdrkit.conf"
OPT=/opt/sdrkit
STAGE="${1:-}"

c_ok=$'\e[32m'; c_warn=$'\e[33m'; c_err=$'\e[31m'; c_b=$'\e[1m'; c_0=$'\e[0m'
[ -f "$KIT/files/sdrkit-lib.sh" ] && [ -f "$KIT/files/sdrkit_server.py" ] && [ -f "$KIT/files/sdrkit_radio.py" ] || {
  echo "${c_err}  ✖ $KIT/files/ not found: copy the whole sdrkit folder. · No encuentro $KIT/files/: copia la carpeta sdrkit completa.${c_0}"
  exit 1; }
# shellcheck source=files/sdrkit-lib.sh
source "$KIT/files/sdrkit-lib.sh"

# messages: one text, or "English" "Español" · mensajes: un texto, o "English" "Español"
say()  { sdrkit_pick "$@"; echo "${c_b}==>${c_0} $REPLY"; }
ok()   { sdrkit_pick "$@"; echo "${c_ok}  ✔${c_0} $REPLY"; }
warn() { sdrkit_pick "$@"; echo "${c_warn}  ⚠${c_0} $REPLY"; }
die()  { sdrkit_pick "$@"; echo "${c_err}  ✖ $REPLY${c_0}"; exit 1; }
is_yes() { sdrkit_is_yes "${1:-}"; }

# The language the configuration will have (same order as the configuration step below)
# El idioma que tendrá la configuración (mismo orden que el paso de configuración de abajo)
peek_conf_lang() {
  local l=""
  if [ -d "$KIT/.git" ] && [ -f "$CONF" ]; then l="$(sdrkit_conf_lang "$CONF")"
  elif [ -d "$KIT/.git" ] && [ -f /boot/firmware/sdrkit.conf ]; then l="$(sdrkit_conf_lang /boot/firmware/sdrkit.conf)"
  elif [ -f "$KIT/sdrkit.conf" ]; then
    l="$(sdrkit_conf_lang "$KIT/sdrkit.conf")"
    if [ -z "$l" ] && [ -f "$CONF" ]; then l="$(sdrkit_conf_lang "$CONF")"; fi
  fi
  echo "$l"
}
case "$STAGE" in
  --panel|--stage2) SDRKIT_LANG="$(sdrkit_conf_lang "$CONF")" ;;
  *) SDRKIT_LANG="$(peek_conf_lang)" ;;
esac
LANG_SET="$(sdrkit_norm_lang "${SDRKIT_LANG_ENV:-$SDRKIT_LANG}")"   # empty = nobody chose yet · nadie lo eligió aún
sdrkit_lang_init

[ "$(id -u)" -eq 0 ] || die "Run it with sudo:  sudo bash $0" "Ejecuta con sudo:  sudo bash $0"

# Bump it when a new version needs packages or system changes: "sdrkit update" then runs the full
# installation (otherwise it only copies the panel, which takes seconds).
# Súbelo cuando una versión nueva necesite paquetes o cambios del sistema: «sdrkit actualizar» hará entonces
# la instalación completa (si no, sólo copia el panel, que tarda segundos).
INSTALL_REV=1
STATE_DIR=/var/lib/sdrkit
APT=(apt-get -y -o DPkg::Lock::Timeout=600 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)
export DEBIAN_FRONTEND=noninteractive

# Copies the panel to /opt/sdrkit as a service (used by the full installation and by "sdrkit update")
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
  python3 "$OPT/sdrkit_server.py" --seed-owrx && ok "OpenWebRX+ band profiles loaded." "Perfiles de bandas cargados en OpenWebRX+."
  # announces the panel on the local network (shows up as a web service in apps like "Fing")
  # anuncia el panel en la red local (aparece como servicio web en apps tipo "Fing")
  cat > /etc/avahi/services/sdrkit.service <<EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">$(L "SDR-Kit on %h" "SDR-Kit en %h")</name>
  <service><type>_http._tcp</type><port>${PANEL_PORT:-80}</port></service>
</service-group>
EOF
  systemctl daemon-reload
  # OpenWebRX+ does not start by itself: the panel starts it when you choose "Receiver"
  # OpenWebRX+ no arranca solo: el panel lo enciende cuando eliges «Receptor»
  systemctl disable openwebrx >/dev/null 2>&1
  systemctl enable sdrkit >/dev/null 2>&1
  ok "Panel installed in $OPT (help: sdrkit)." "Panel instalado en $OPT (comando de ayuda: sdrkit)."
}

# Merges the configuration: keeps yours and adds this version's new options
# Fusiona la configuración: conserva la tuya y agrega las opciones nuevas de esta versión
merge_conf_from_kit() {
  local n
  n=$(sdrkit_merge_conf "$KIT/sdrkit.conf" "$CONF")
  if [ "${n:-0}" -gt 0 ]; then
    ok "Settings kept; $n new options added to $CONF." "Configuración conservada; $n opciones nuevas agregadas a $CONF."
  else
    ok "Settings kept." "Configuración conservada."
  fi
}

# Records which version is installed (used by the updater) · Anota qué versión quedó instalada
record_version() {
  mkdir -p "$STATE_DIR"
  echo "$INSTALL_REV" > "$STATE_DIR/install_rev"
  if [ -d "$KIT/.git" ]; then git -C "$KIT" rev-parse HEAD > "$STATE_DIR/commit" 2>/dev/null || true; fi
}

# =====================================================================
#  QUICK UPDATE (panel only), used by "sdrkit update"
#  ACTUALIZACIÓN RÁPIDA (sólo el panel): la usa «sdrkit actualizar»
# =====================================================================
if [ "$STAGE" = "--panel" ]; then
  [ -f "$CONF" ] || die "No previous installation: run the full installer first." \
                        "No hay una instalación previa: ejecuta primero el instalador completo."
  merge_conf_from_kit
  sdrkit_load_conf "$CONF"
  install_panel
  systemctl restart sdrkit && ok "Panel restarted with version $(cat "$KIT/VERSION" 2>/dev/null)." \
                                 "Panel reiniciado con la versión $(cat "$KIT/VERSION" 2>/dev/null)."
  exit 0   # the updater records the version (commit) only once the new panel answers · la anota el actualizador
fi

# =====================================================================
#  STAGE 1: checks and questions (interactive)
#  ETAPA 1: comprobaciones y preguntas (interactiva)
# =====================================================================
if [ "$STAGE" != "--stage2" ]; then
  # the very first question: the language (only if nobody chose it yet) · la primera pregunta: el idioma
  if [ -z "$LANG_SET" ] && [ -t 0 ]; then
    def=1; [ "$SDRKIT_L" = es ] && def=2   # default: the system language · por defecto: el del sistema
    echo
    echo "${c_b}Language / Idioma${c_0}"
    echo "  1) English"
    echo "  2) Español"
    while true; do
      read -r -p "  Choose / Elige [$def]: " ans || ans="$def"
      case "${ans,,}" in
        "") ans="$def" ;;
      esac
      case "${ans,,}" in
        1|en|english|ingl*) SDRKIT_L=en; break ;;
        2|es|español|espanol|spanish) SDRKIT_L=es; break ;;
      esac
    done
  fi

  echo
  echo "${c_b}$(L "SDR-Kit · installer" "SDR-Kit · instalador")${c_0}"
  echo "-------------------------------------------------------------"
  . /etc/os-release 2>/dev/null
  CODENAME="${VERSION_CODENAME:-$(L unknown desconocido)}"
  ARCH="$(dpkg --print-architecture 2>/dev/null)"
  MODEL="$(tr -d '\0' < /proc/device-tree/model 2>/dev/null)"
  say "System: ${PRETTY_NAME:-?} · $ARCH · ${MODEL:-?}" "Sistema: ${PRETTY_NAME:-?} · $ARCH · ${MODEL:-?}"
  case "$CODENAME" in
    bookworm|trixie) ok "Supported version ($CODENAME)." "Versión compatible ($CODENAME)." ;;
    *) die "This kit is for Raspberry Pi OS Bookworm or Trixie (you have: $CODENAME)." \
           "Este kit es para Raspberry Pi OS Bookworm o Trixie (tienes: $CODENAME)." ;;
  esac
  command -v nmcli >/dev/null || die "NetworkManager (nmcli) is missing. Use a recent Raspberry Pi OS Lite." \
                                     "Falta NetworkManager (nmcli). Usa Raspberry Pi OS Lite reciente."
  case "$MODEL" in *"Zero 2"*) ;; *) warn "This is not a Pi Zero 2 W; it should work anyway." "No es una Pi Zero 2 W; igual debería funcionar." ;; esac
  avail_kb=$(df --output=avail / | tail -1)
  [ "${avail_kb:-0}" -gt 2500000 ] || warn "Little free space left on the microSD (<2.5 GB)." "Queda poco espacio en la microSD (<2.5 GB)."

  # configuration: yours is always kept when installing from GitHub (folder with .git)
  # configuración: la tuya se conserva siempre que se instale desde GitHub (carpeta con .git)
  mkdir -p "$ETC"
  if [ -d "$KIT/.git" ] && [ -f "$CONF" ]; then
    merge_conf_from_kit
  elif [ -d "$KIT/.git" ] && [ -f /boot/firmware/sdrkit.conf ]; then
    sed 's/\r$//' /boot/firmware/sdrkit.conf > "$CONF"   # prepared on the PC, on the microSD · preparada desde la PC
    merge_conf_from_kit
  elif [ -f "$KIT/sdrkit.conf" ]; then
    sed 's/\r$//' "$KIT/sdrkit.conf" > "$CONF.new"
    # keeps passwords saved by a previous installation when the kit brings them empty
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
  [ -f "$CONF" ] || die "sdrkit.conf not found." "No encuentro sdrkit.conf"
  chmod 600 "$CONF"
  sdrkit_load_conf "$CONF"
  # the language chosen (or detected) is saved when the configuration has none
  # el idioma elegido (o detectado) se guarda si la configuración no tiene uno
  if [ -z "$(sdrkit_norm_lang "$(sdrkit_conf_get SDRKIT_LANG "$CONF")")" ]; then sdrkit_set_conf SDRKIT_LANG "$SDRKIT_L" "$CONF"; fi
  # installed from GitHub: remember where to update from · instalación desde GitHub: recuerda de dónde actualizar
  if [ -d "$KIT/.git" ]; then
    url="$(git -C "$KIT" remote get-url origin 2>/dev/null)"; br="$(git -C "$KIT" rev-parse --abbrev-ref HEAD 2>/dev/null)"
    [ -n "$url" ] && [ -z "${SDRKIT_REPO:-}" ] && sdrkit_set_conf SDRKIT_REPO "$url" "$CONF"
    [ -n "$br" ] && [ "$br" != HEAD ] && [ -z "${SDRKIT_BRANCH:-}" ] && sdrkit_set_conf SDRKIT_BRANCH "$br" "$CONF"
    sdrkit_load_conf "$CONF"
  fi

  ask_pass() {  # variable  "English text"  "texto en español"  minimum · mínimo
    local var="$1" min="$4" p1 p2
    while true; do
      read -r -s -p "  $(Ln "$2" "$3"): " p1; echo
      if [ ${#p1} -lt "$min" ]; then L "    It must have at least $min characters." "    Debe tener al menos $min caracteres."; continue; fi
      case "$p1" in *'"'*) L '    Do not use double quotes (").' '    No uses comillas dobles (").'; continue;; esac
      read -r -s -p "  $(Ln "Repeat it" "Repítela"): " p2; echo
      [ "$p1" = "$p2" ] || { L "    They do not match." "    No coinciden."; continue; }
      sdrkit_set_conf "$var" "$p1" "$CONF"
      printf -v "$var" '%s' "$p1"
      break
    done
  }
  if [ -t 0 ]; then
    if [ ${#HOTSPOT_PASSWORD} -lt 8 ]; then
      say "Password for the WiFi hotspot \"${HOTSPOT_SSID:-SDR-Pi}\" (the network the Pi creates)" \
          "Clave para el hotspot WiFi «${HOTSPOT_SSID:-SDR-Pi}» (la red que crea la Raspberry)"
      ask_pass HOTSPOT_PASSWORD "Hotspot password (8+ characters)" "Clave del hotspot (8+ caracteres)" 8
    fi
    if [ -z "$ADMIN_PASSWORD" ]; then
      say "Password of the web panel and of the OpenWebRX+ \"admin\" user" \
          "Clave del panel web y del usuario «admin» de OpenWebRX+"
      ask_pass ADMIN_PASSWORD "Administrator password" "Clave de administrador" 4
    fi
  else
    gen() { tr -dc 'A-HJ-NP-Za-km-z2-9' < /dev/urandom | head -c 10; }
    [ ${#HOTSPOT_PASSWORD} -ge 8 ] || { HOTSPOT_PASSWORD="$(gen)"; sdrkit_set_conf HOTSPOT_PASSWORD "$HOTSPOT_PASSWORD" "$CONF"; }
    [ -n "$ADMIN_PASSWORD" ] || { ADMIN_PASSWORD="$(gen)"; sdrkit_set_conf ADMIN_PASSWORD "$ADMIN_PASSWORD" "$CONF"; }
    warn "No interactive terminal: passwords generated and saved in $CONF" \
         "Sin terminal interactiva: claves generadas y guardadas en $CONF"
  fi

  # digital voice in the panel (DSD-FME + mbelib): only after explicitly accepting the patent notice
  # voz digital en el panel (DSD-FME + mbelib): sólo con aceptación explícita del aviso de patentes
  dsd_choice="$(echo "${INSTALL_DSD:-}" | tr '[:upper:]' '[:lower:]')"
  if [ -z "$dsd_choice" ] && [ -t 0 ]; then
    echo
    say "Digital voice in the panel: DMR, P25, D-Star, Yaesu Fusion, NXDN, dPMR and M17 (DSD-FME)" \
        "Voz digital en el panel: DMR, P25, D-Star, Yaesu Fusion, NXDN, dPMR y M17 (DSD-FME)"
    if [ "$SDRKIT_L" = es ]; then
      echo "    Usa mbelib, que implementa los códecs de voz AMBE/IMBE. Esos códecs están PATENTADOS:"
      echo "    en algunos países usarlos sin licencia puede infringir patentes. Es software libre"
      echo "    para estudio y uso personal; tú decides. Aviso completo:"
      echo "      https://github.com/lwvmobile/mbelib#readme"
      echo "    Alternativa con licencia: una llave USB AMBE3000 (ver AMBE_TTY en sdrkit.conf)."
      echo "    Compilarlo agrega ~30-50 minutos a la instalación en una Pi Zero 2 W."
    else
      echo "    It uses mbelib, which implements the AMBE/IMBE voice codecs. Those codecs are PATENTED:"
      echo "    in some countries using them without a license may infringe patents. It is free software"
      echo "    for study and personal use; the decision is yours. Full notice:"
      echo "      https://github.com/lwvmobile/mbelib#readme"
      echo "    Licensed alternative: an AMBE3000 USB dongle (see AMBE_TTY in sdrkit.conf)."
      echo "    Building it adds ~30-50 minutes to the installation on a Pi Zero 2 W."
    fi
    if sdrkit_ask_yn "  Have you read the notice and do you want to install DSD-FME?" \
                     "  ¿Leíste el aviso y quieres instalar DSD-FME?" no; then
      INSTALL_DSD="$(L yes si)"
    else
      INSTALL_DSD=no
    fi
    sdrkit_set_conf INSTALL_DSD "$INSTALL_DSD" "$CONF"
  fi

  echo
  say "All set. The installation takes 20 to 45 minutes on a Pi Zero 2 W." \
      "Todo listo. La instalación tarda entre 20 y 45 minutos en una Pi Zero 2 W."
  L "    It goes on even if SSH drops. Progress:  tail -f $LOG" "    Sigue aunque se corte el SSH. Progreso:  tail -f $LOG"
  L "    When it finishes, the Pi restarts by itself." "    Al terminar la Raspberry se reinicia sola."
  echo
  if systemctl is-active --quiet sdrkit-install; then
    warn "An installation is already running; showing its progress (Ctrl+C to leave)." \
         "Ya hay una instalación en curso; muestro su progreso (Ctrl+C para salir)."
    exec tail -n 40 -f "$LOG"
  fi
  : > "$LOG"
  systemctl reset-failed sdrkit-install >/dev/null 2>&1
  # the background stage keeps this run's language · la etapa en segundo plano conserva el idioma de esta
  if ! systemd-run --unit=sdrkit-install --description="$(L "SDR-Kit installer" "Instalador SDR-Kit")" --collect \
        /usr/bin/env SDRKIT_LANG="$SDRKIT_L" /bin/bash "$KIT/install.sh" --stage2 >/dev/null; then
    die "Could not start the installer in the background." "No se pudo lanzar el instalador en segundo plano."
  fi
  sleep 1
  tail -n +1 -f "$LOG" &
  TP=$!
  trap 'kill $TP 2>/dev/null; echo; L "(The installation goes on in the background: tail -f $LOG)" "(La instalación continúa en segundo plano: tail -f $LOG)"; exit 0' INT
  while systemctl is-active --quiet sdrkit-install; do sleep 2; done
  sleep 1
  kill $TP 2>/dev/null
  exit 0
fi

# =====================================================================
#  STAGE 2: installation (in the background, everything goes to the log)
#  ETAPA 2: instalación (en segundo plano, todo va al registro)
# =====================================================================
exec >>"$LOG" 2>&1
sdrkit_load_conf "$CONF"
. /etc/os-release
CODENAME="$VERSION_CODENAME"
STEP=0
step() { STEP=$((STEP + 1)); sdrkit_pick "$@"; echo; echo "${c_b}[$STEP/11] $REPLY${c_0}  ($(date +%H:%M:%S))"; }
fail() {
  sdrkit_pick "$@"; echo "${c_err}✖ ERROR: $REPLY${c_0}"
  L "Check this log ($LOG) and run the installer again: it is safe to repeat." \
    "Revisa este registro ($LOG) y vuelve a ejecutar el instalador: es seguro repetirlo."
  exit 1
}

# ---------------------------------------------------------------------
step "Preparing the system" "Preparando el sistema"
# more swap while installing (the Zero 2 W has 512 MB of RAM) · más swap mientras se instala
if [ -f /etc/dphys-swapfile ]; then
  cur=$(sed -n 's/^CONF_SWAPSIZE=//p' /etc/dphys-swapfile)
  if [ "${cur:-0}" -lt 1024 ] 2>/dev/null; then
    sed -i 's/^#\?CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
    systemctl restart dphys-swapfile && ok "Swap increased to 1 GB." "Swap ampliado a 1 GB."
  fi
elif ! swapon --show | grep -q .; then
  if [ ! -f /var/swap.sdrkit ]; then
    fallocate -l 1G /var/swap.sdrkit && chmod 600 /var/swap.sdrkit && mkswap /var/swap.sdrkit >/dev/null
  fi
  swapon /var/swap.sdrkit 2>/dev/null && ok "Temporary 1 GB swap active." "Swap temporal de 1 GB activo."
fi
if [ -n "$WIFI_COUNTRY" ] && command -v raspi-config >/dev/null; then
  raspi-config nonint do_wifi_country "$WIFI_COUNTRY" && ok "WiFi country: $WIFI_COUNTRY" "País WiFi: $WIFI_COUNTRY"
fi
rfkill unblock wifi 2>/dev/null || true
"${APT[@]}" update || fail "apt update (is there internet?)" "apt update (¿hay internet?)"
if is_yes "$UPGRADE_SYSTEM"; then
  "${APT[@]}" full-upgrade || warn "The full upgrade had errors; going on." "La actualización completa tuvo errores; sigo."
fi

# ---------------------------------------------------------------------
step "Installing base packages" "Instalando paquetes base"
"${APT[@]}" install python3 python3-numpy rtl-sdr iw dnsmasq-base avahi-daemon curl gpg ca-certificates usbutils git \
  || fail "could not install the base packages" "no se pudieron instalar los paquetes base"
ok "Base packages ready." "Paquetes base listos."
# HackRF tools (hackrf_sweep): small, so they are always installed; not fatal if the distribution lacks them
# herramientas del HackRF (hackrf_sweep): pesan poco, se instalan siempre; no es grave si la distribución no las trae
"${APT[@]}" install hackrf >/dev/null 2>&1 \
  && ok "HackRF tools installed (used only if a HackRF is plugged in)." "Herramientas del HackRF instaladas (se usan sólo si conectas un HackRF)." \
  || warn "Could not install the HackRF tools; if you use a HackRF: sudo apt install hackrf" "No se pudieron instalar las herramientas del HackRF; si usas uno: sudo apt install hackrf"

# ---------------------------------------------------------------------
step "RTL-SDR driver" "Driver del RTL-SDR"
mkdir -p /etc/modprobe.d
cat > /etc/modprobe.d/sdrkit-blacklist-dvb.conf <<'EOF'
# SDR-Kit: the kernel must not take the dongle as a TV tuner · el kernel no debe tomar el dongle como sintonizador de TV
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
  *) [ "$CODENAME" = "bookworm" ] && want_blog=yes ;;   # Bookworm's librtlsdr 0.6.0 does not support the V4
esac
if [ "$want_blog" = yes ]; then
  if dpkg -s librtlsdr0 2>/dev/null | grep -q 'rtlsdrblog'; then
    ok "RTL-SDR Blog driver already installed." "Driver de RTL-SDR Blog ya instalado."
  else
    L "Building the RTL-SDR Blog driver (5–10 minutes)…" "Compilando el driver de RTL-SDR Blog (5–10 minutos)…"
    "${APT[@]}" install git cmake build-essential debhelper libusb-1.0-0-dev pkg-config \
      || fail "build dependencies" "dependencias de compilación"
    rm -rf /usr/local/src/rtl-sdr-blog
    git clone --depth 1 https://github.com/rtlsdrblog/rtl-sdr-blog /usr/local/src/rtl-sdr-blog \
      || fail "could not download rtl-sdr-blog" "no se pudo descargar rtl-sdr-blog"
    ( cd /usr/local/src/rtl-sdr-blog && dpkg-buildpackage -b --no-sign ) \
      || fail "the driver build failed" "falló la compilación del driver"
    apt-mark unhold librtlsdr0 librtlsdr-dev rtl-sdr >/dev/null 2>&1
    dpkg -i /usr/local/src/librtlsdr0_*.deb /usr/local/src/librtlsdr-dev_*.deb /usr/local/src/rtl-sdr_*.deb \
      || fail "could not install the driver" "no se pudo instalar el driver"
    apt-mark hold librtlsdr0 librtlsdr-dev rtl-sdr >/dev/null
    ok "RTL-SDR Blog driver installed (and held so apt does not replace it)." \
       "Driver de RTL-SDR Blog instalado (y retenido para que apt no lo reemplace)."
  fi
else
  ok "Using the system driver (on Trixie it already supports the RTL-SDR Blog V4)." \
     "Uso el driver del sistema (en Trixie ya soporta el RTL-SDR Blog V4)."
fi
udevadm control --reload-rules 2>/dev/null; udevadm trigger 2>/dev/null || true

# ---------------------------------------------------------------------
step "Installing OpenWebRX+ (web receiver)" "Instalando OpenWebRX+ (receptor web)"
ppa="https://luarvique.github.io/ppa"
curl -fsSL "$ppa/openwebrx-plus.gpg" | gpg --yes --dearmor -o /etc/apt/trusted.gpg.d/openwebrx-plus.gpg \
  || fail "could not download the OpenWebRX+ repository key" "no se pudo descargar la llave del repositorio de OpenWebRX+"
echo "deb [signed-by=/etc/apt/trusted.gpg.d/openwebrx-plus.gpg] $ppa/$CODENAME ./" > /etc/apt/sources.list.d/openwebrx-plus.list
rm -f /etc/apt/sources.list.d/openwebrx.list   # the original repo clashes with OpenWebRX+ · el original choca con OpenWebRX+
"${APT[@]}" update || fail "apt update with the OpenWebRX+ repository" "apt update con el repositorio de OpenWebRX+"
echo "openwebrx openwebrx/admin_user_password password $ADMIN_PASSWORD" | debconf-set-selections
"${APT[@]}" install --no-install-recommends openwebrx || fail "could not install openwebrx" "no se pudo instalar openwebrx"
# useful, light decoders (without the heavy wsjtx/js8call, which need a desktop environment)
# decodificadores útiles y livianos (sin los pesados wsjtx/js8call, que necesitan entorno gráfico)
EXTRAS=(python3-digiham codecserver direwolf nmux redsea multimon-ng rtl-433 dump1090-fa-minimal acarsdec
        dumpvdl2 dumphfdl dump978-fa-minimal codec2 m17-demod sonde-decoders aprs-symbols lame imagemagick
        python3-paho-mqtt python3-csdr-eti dablin nrsc5 codecserver-driver-ambe3k)
is_yes "${INSTALL_WSJTX:-no}" && EXTRAS+=(wsjtx js8call)   # FT8/FT4/WSPR/JS8: heavy (≈300 MB) · pesados
avail=()
for p in "${EXTRAS[@]}"; do apt-cache show "$p" >/dev/null 2>&1 && avail+=("$p"); done
if ! "${APT[@]}" install --no-install-recommends "${avail[@]}"; then
  warn "Installing decoders one by one…" "Instalando decodificadores uno por uno…"
  for p in "${avail[@]}"; do
    "${APT[@]}" install --no-install-recommends "$p" >/dev/null 2>&1 || warn "skipped: $p" "omitido: $p"
  done
fi
# admin user (in case debconf did not create it) · usuario admin (por si debconf no lo creó)
if openwebrx admin --silent hasuser admin; then
  OWRX_PASSWORD="$ADMIN_PASSWORD" openwebrx admin --noninteractive resetpassword admin >/dev/null
else
  OWRX_PASSWORD="$ADMIN_PASSWORD" openwebrx admin --noninteractive adduser admin >/dev/null
fi
chown openwebrx: /var/lib/openwebrx/users.json 2>/dev/null
# AMBE3000 dongle (licensed path for DMR, D-Star, YSF, NXDN and P25 in OpenWebRX+)
# llave AMBE3000 (camino con licencia para DMR, D-Star, YSF, NXDN y P25 en OpenWebRX+)
if [ -n "${AMBE_TTY:-}" ] && [ -f /etc/codecserver/codecserver.conf ]; then
  if ! grep -q '^\[device:sdrkit-ambe\]' /etc/codecserver/codecserver.conf; then
    printf '\n[device:sdrkit-ambe]\ndriver=ambe3k\ntty=%s\nbaudrate=%s\n' "$AMBE_TTY" "${AMBE_BAUD:-921600}" >> /etc/codecserver/codecserver.conf
  fi
  systemctl enable --now codecserver >/dev/null 2>&1 || true
  ok "AMBE dongle configured on $AMBE_TTY: digital voice in the advanced receiver." \
     "Llave AMBE configurada en $AMBE_TTY: voz digital en el receptor avanzado."
fi
ok "OpenWebRX+ installed (user admin)." "OpenWebRX+ instalado (usuario admin)."

# ---------------------------------------------------------------------
step "Digital voice in the panel (DSD-FME)" "Voz digital en el panel (DSD-FME)"
if is_yes "${INSTALL_DSD:-no}"; then
  if command -v dsd-fme >/dev/null && [ "$(cat /usr/local/share/sdrkit-dsd.ver 2>/dev/null)" = "72b3e5e" ]; then
    ok "DSD-FME already installed." "DSD-FME ya instalado."
  else
    L "Building mbelib and DSD-FME (30–50 minutes on a Pi Zero 2 W; do not power it off)…" \
      "Compilando mbelib y DSD-FME (30–50 minutos en una Pi Zero 2 W; no la apagues)…"
    "${APT[@]}" install git cmake build-essential pkg-config libsndfile1-dev libpulse-dev libfftw3-dev liblapack-dev \
      libncurses-dev libcodec2-dev libusb-1.0-0-dev || fail "DSD-FME dependencies" "dependencias de DSD-FME"
    dpkg -s librtlsdr-dev >/dev/null 2>&1 || "${APT[@]}" install librtlsdr-dev \
      || warn "no librtlsdr-dev (not needed)" "sin librtlsdr-dev (no hace falta)"
    src=/usr/local/src/sdrkit-dsd; rm -rf "$src"; mkdir -p "$src"
    git clone -b ambe_tones https://github.com/lwvmobile/mbelib "$src/mbelib" \
      || fail "could not download mbelib" "no se pudo descargar mbelib"
    ( cd "$src/mbelib" && git checkout -q 30dc790 2>/dev/null; mkdir -p build && cd build && cmake .. && make -j2 && make install && ldconfig ) \
      || fail "the mbelib build failed" "falló la compilación de mbelib"
    git clone https://github.com/lwvmobile/dsd-fme "$src/dsd-fme" || fail "could not download DSD-FME" "no se pudo descargar DSD-FME"
    ( cd "$src/dsd-fme" && { git checkout -q 72b3e5e 2>/dev/null || L "(using the latest version)" "(uso la versión más reciente)"; } \
      && mkdir -p build && cd build && cmake .. && make -j2 && make install && ldconfig ) \
      || fail "the DSD-FME build failed" "falló la compilación de DSD-FME"
    echo 72b3e5e > /usr/local/share/sdrkit-dsd.ver
    rm -rf "$src"
    ok "DSD-FME installed: \"Digital\" mode in the panel's Radio tab." "DSD-FME instalado: modo «Digital» en el Radio del panel."
  fi
else
  ok "Skipped (INSTALL_DSD=no). The panel still identifies digital signals; to listen to them enable INSTALL_DSD or use an AMBE dongle." \
     "Omitido (INSTALL_DSD=no). El panel identifica igual las señales digitales; para escucharlas activa INSTALL_DSD o usa una llave AMBE."
fi

# ---------------------------------------------------------------------
step "Installing the SDR-Kit panel" "Instalando el panel SDR-Kit"
install_panel

# ---------------------------------------------------------------------
step "Setting up WiFi: automatic hotspot" "Configurando WiFi: hotspot automático"
sdrkit_setup_hotspot || fail "could not create the hotspot" "no se pudo crear el hotspot"
ok "Hotspot \"$HOTSPOT_SSID\" created (it turns on by itself when no known WiFi is around)." \
   "Hotspot «$HOTSPOT_SSID» creado (se enciende solo cuando no hay WiFi conocida)."
IFS=';' read -r -a nets <<< "$WIFI_NETWORKS"
for entry in "${nets[@]}"; do
  [ -n "$entry" ] || continue
  ssid="${entry%%|*}"; pass=""; [[ "$entry" == *"|"* ]] && pass="${entry#*|}"
  name="sdrkit-$(printf '%s' "$ssid" | tr -c 'A-Za-z0-9_.-' '_' | cut -c1-40)"
  nmcli connection delete "$name" >/dev/null 2>&1
  if [ -n "$pass" ]; then
    nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" connection.autoconnect yes \
      connection.autoconnect-priority 20 wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$pass" >/dev/null && ok "Network saved: $ssid" "Red guardada: $ssid"
  else
    nmcli connection add type wifi ifname "${WIFI_IFACE:-wlan0}" con-name "$name" ssid "$ssid" connection.autoconnect yes \
      connection.autoconnect-priority 20 >/dev/null && ok "Open network saved: $ssid" "Red abierta guardada: $ssid"
  fi
done
mkdir -p /etc/NetworkManager/conf.d
cat > /etc/NetworkManager/conf.d/sdrkit-powersave.conf <<'EOF'
# SDR-Kit: no WiFi power saving (avoids audio dropouts and lag) · sin ahorro de energía en el WiFi (evita cortes y lentitud)
[connection]
wifi.powersave = 2
EOF
iw dev "${WIFI_IFACE:-wlan0}" set power_save off 2>/dev/null
systemctl enable sdrkit-netwatch >/dev/null 2>&1
ok "Network watchdog enabled." "Vigilante de red activado."

# ---------------------------------------------------------------------
step "Power settings and microSD care" "Ajustes de energía y cuidado de la microSD"
CFG=/boot/firmware/config.txt; [ -f "$CFG" ] || CFG=/boot/config.txt
if is_yes "$DISABLE_BLUETOOTH"; then
  grep -q '^dtoverlay=disable-bt' "$CFG" || printf '\n# SDR-Kit: Bluetooth off (better WiFi, longer battery) · Bluetooth apagado (mejora el WiFi y ahorra batería)\ndtoverlay=disable-bt\n' >> "$CFG"
  systemctl disable --now hciuart bluetooth >/dev/null 2>&1
  ok "Bluetooth disabled." "Bluetooth desactivado."
fi
if is_yes "$REDUCE_SD_WRITES"; then
  mkdir -p /etc/systemd/journald.conf.d
  printf '[Journal]\nStorage=volatile\nRuntimeMaxUse=24M\n' > /etc/systemd/journald.conf.d/sdrkit.conf
  ok "System logs kept in RAM." "Registros del sistema en RAM."
fi
systemctl disable --now ModemManager >/dev/null 2>&1 || true

# ---------------------------------------------------------------------
step "Remote access (Tailscale)" "Acceso remoto (Tailscale)"
if is_yes "$INSTALL_TAILSCALE"; then
  if ! command -v tailscale >/dev/null; then
    curl -fsSL https://tailscale.com/install.sh | sh || warn "Could not install Tailscale (you can do it later)." "No se pudo instalar Tailscale (puedes hacerlo luego)."
  fi
  if command -v tailscale >/dev/null; then
    systemctl enable --now tailscaled >/dev/null 2>&1
    if [ -n "$TAILSCALE_AUTHKEY" ]; then
      tailscale up --auth-key="$TAILSCALE_AUTHKEY" --hostname="$(hostname)" && ok "Tailscale linked." "Tailscale enlazado."
    else
      ok "Tailscale installed. To link it: sudo tailscale up  (and open the link it shows)." \
         "Tailscale instalado. Para enlazarlo: sudo tailscale up  (y abre el enlace que muestra)."
    fi
  fi
else
  ok "Skipped." "Omitido."
fi

# ---------------------------------------------------------------------
step "Starting services" "Arrancando servicios"
systemctl restart sdrkit && ok "Panel running." "Panel en marcha."
sleep 2
if curl -fs -o /dev/null "http://127.0.0.1:${PANEL_PORT:-80}/login"; then ok "The panel answers." "El panel responde."
else warn "The panel does not answer yet (check: sdrkit logs)." "El panel no responde todavía (revisa: sdrkit logs)."; fi
if lsusb | grep -qiE '0bda:28(38|32)'; then
  ok "RTL-SDR detected: $(lsusb | grep -iE '0bda:28(38|32)' | cut -d' ' -f7-)" "RTL-SDR detectado: $(lsusb | grep -iE '0bda:28(38|32)' | cut -d' ' -f7-)"
else
  warn "The RTL-SDR is not connected right now (you can plug it in later)." "No veo el RTL-SDR conectado ahora mismo (puedes conectarlo después)."
fi

step "Done!" "¡Listo!"
IPS=$(ip -4 -o addr show 2>/dev/null | awk '$2!="lo"{split($4,a,"/"); printf "%s ", a[1]}')
if [ "$SDRKIT_L" = es ]; then
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
else
  cat <<EOF

  ${c_ok}SDR-Kit installed.${c_0} The Pi will restart in 15 seconds.

  At home (same WiFi):    http://$(hostname).local    or   http://${IPS% }
  Away from home:         join the WiFi "$HOTSPOT_SSID" and open  http://${HOTSPOT_IP}
  OpenWebRX+ receiver:    port 8073 (opened from the panel)
  Panel / admin password: the one you chose (ADMIN_PASSWORD in $CONF)

  Recordings:             ${REC_DIR:-/var/lib/sdrkit/grabaciones} (download them from the Recordings tab)
  Update (at home, with internet):  sudo sdrkit update   · or in the panel: More → System
  Help over SSH:  sdrkit
EOF
fi
record_version
sync
[ "${SDRKIT_NO_REBOOT:-}" = 1 ] && exit 0   # "sdrkit update" checks the panel first, then restarts · lo hace "sdrkit actualizar"
sleep 15
systemctl reboot
exit 0
