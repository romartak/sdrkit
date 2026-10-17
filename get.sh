#!/bin/bash
# =====================================================================
#  SDR-Kit · install from GitHub (one command, on the Raspberry Pi)
#  SDR-Kit · instalación desde GitHub (un solo comando, en la Raspberry)
#
#     curl -fsSL https://raw.githubusercontent.com/romartak/sdrkit/main/get.sh | sudo bash
#
#  Downloads the project to /opt/sdrkit-src and runs the installer.
#  Descarga el proyecto en /opt/sdrkit-src y ejecuta el instalador.
#  Update later · Para actualizar después:  sudo sdrkit update  (sudo sdrkit actualizar)
# =====================================================================
set -o pipefail
REPO="${SDRKIT_REPO:-https://github.com/romartak/sdrkit.git}"
BRANCH="${SDRKIT_BRANCH:-main}"
SRC=/opt/sdrkit-src

# language (this script runs alone, before the SDR-Kit library exists): SDRKIT_LANG → sdrkit.conf → $LANG → en
# idioma (este script corre solo, antes de tener la biblioteca de SDR-Kit)
GL="${SDRKIT_LANG:-}"
if [ -z "$GL" ] && [ -r /etc/sdrkit/sdrkit.conf ]; then   # a config without the key is from a Spanish-only version
  GL="$(sed -n 's/^[[:space:]]*SDRKIT_LANG=["'\'']*\([A-Za-z]*\).*/\1/p' /etc/sdrkit/sdrkit.conf | tail -n 1)"
  grep -q '^[[:space:]]*SDRKIT_LANG=' /etc/sdrkit/sdrkit.conf || GL=es
fi
for v in "${LC_ALL:-}" "${LC_MESSAGES:-}" "${LANG:-}"; do   # system language (skips C/POSIX)
  case "$v" in ''|C|C.*|POSIX) ;; *) [ -n "$GL" ] || GL="$v" ;; esac
done
case "$GL" in [Ee][Ss]*|[Ss][Pp]*) GL=es ;; *) GL=en ;; esac
L() { if [ "$GL" = es ]; then printf '%s\n' "$2"; else printf '%s\n' "$1"; fi; }

[ "$(id -u)" -eq 0 ] || { L "Run it with sudo:  curl -fsSL …/get.sh | sudo bash" "Ejecuta con sudo:  curl -fsSL …/get.sh | sudo bash"; exit 1; }
L "==> SDR-Kit: downloading $REPO (branch $BRANCH)…" "==> SDR-Kit: descargando $REPO (rama $BRANCH)…"
if ! command -v git >/dev/null; then
  apt-get update -qq && apt-get install -y -qq git || { L "✖ Could not install git (is there internet?)." "✖ No se pudo instalar git (¿hay internet?)."; exit 1; }
fi
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" remote set-url origin "$REPO"
  git -C "$SRC" fetch -q --depth 100 origin "$BRANCH" && git -C "$SRC" reset -q --hard FETCH_HEAD \
    || { L "✖ Could not update the local copy." "✖ No se pudo actualizar la copia local."; exit 1; }
else
  rm -rf "$SRC"
  git clone -q --depth 100 -b "$BRANCH" "$REPO" "$SRC" || { L "✖ Could not download $REPO." "✖ No se pudo descargar $REPO."; exit 1; }
fi
L "==> Version $(cat "$SRC/VERSION" 2>/dev/null) downloaded. Starting the installer…" \
  "==> Versión $(cat "$SRC/VERSION" 2>/dev/null) descargada. Iniciando el instalador…"
# the installer asks questions: give it the keyboard even though this script arrives through "curl | bash"
# el instalador hace preguntas: se le conecta el teclado aunque este script llegue por «curl | bash»
if { true </dev/tty; } 2>/dev/null; then
  exec bash "$SRC/install.sh" </dev/tty
else
  exec bash "$SRC/install.sh"
fi
