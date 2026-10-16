#!/bin/bash
# =====================================================================
#  SDR-Kit · instalación desde GitHub (un solo comando, en la Raspberry):
#
#     curl -fsSL https://raw.githubusercontent.com/romartak/sdrkit/main/get.sh | sudo bash
#
#  Descarga el proyecto en /opt/sdrkit-src y ejecuta el instalador.
#  Para actualizar después:  sudo sdrkit actualizar
# =====================================================================
set -o pipefail
REPO="${SDRKIT_REPO:-https://github.com/romartak/sdrkit.git}"
BRANCH="${SDRKIT_BRANCH:-main}"
SRC=/opt/sdrkit-src

[ "$(id -u)" -eq 0 ] || { echo "Ejecuta con sudo:  curl -fsSL …/get.sh | sudo bash"; exit 1; }
echo "==> SDR-Kit: descargando $REPO (rama $BRANCH)…"
if ! command -v git >/dev/null; then
  apt-get update -qq && apt-get install -y -qq git || { echo "✖ No se pudo instalar git (¿hay internet?)."; exit 1; }
fi
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" remote set-url origin "$REPO"
  git -C "$SRC" fetch -q --depth 100 origin "$BRANCH" && git -C "$SRC" reset -q --hard FETCH_HEAD \
    || { echo "✖ No se pudo actualizar la copia local."; exit 1; }
else
  rm -rf "$SRC"
  git clone -q --depth 100 -b "$BRANCH" "$REPO" "$SRC" || { echo "✖ No se pudo descargar $REPO."; exit 1; }
fi
echo "==> Versión $(cat "$SRC/VERSION" 2>/dev/null) descargada. Iniciando el instalador…"
# el instalador hace preguntas: se le conecta el teclado aunque este script llegue por «curl | bash»
if { true </dev/tty; } 2>/dev/null; then
  exec bash "$SRC/install.sh" </dev/tty
else
  exec bash "$SRC/install.sh"
fi
