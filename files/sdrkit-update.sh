#!/bin/bash
# =====================================================================
#  SDR-Kit · actualizador
#  Trae la última versión desde GitHub y la instala SIN tocar tu configuración
#  (/etc/sdrkit/sdrkit.conf) ni tus datos (grabaciones, memorias, registros).
#
#  sudo sdrkit actualizar            busca, muestra los cambios y pregunta
#  sudo sdrkit actualizar --si       sin preguntar (lo usa el botón del panel)
#  sudo sdrkit actualizar --forzar   reinstala aunque ya esté al día
#  sdrkit actualizar --buscar        sólo dice si hay algo nuevo (--json para el panel)
#  sudo sdrkit volver                regresa a la versión anterior
# =====================================================================
set -o pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=sdrkit-lib.sh
source "$HERE/sdrkit-lib.sh" 2>/dev/null || source /opt/sdrkit/sdrkit-lib.sh
CONF=/etc/sdrkit/sdrkit.conf
SRC=/opt/sdrkit-src
OPT=/opt/sdrkit
STATE=/var/lib/sdrkit
LOG=/var/log/sdrkit-update.log
sdrkit_load_conf "$CONF"

MODE=apply; YES=no; FORCE=no; JSON=no
for a in "$@"; do
  case "$a" in
    --buscar|--check) MODE=check ;;
    --volver|--rollback) MODE=rollback ;;
    --si|--yes|-y) YES=yes ;;
    --forzar|--force) FORCE=yes ;;
    --json) JSON=yes ;;
  esac
done

REPO="${SDRKIT_REPO:-}"
[ -n "$REPO" ] || REPO="$(git -C "$SRC" remote get-url origin 2>/dev/null)"
[ -n "$REPO" ] || REPO="$SDRKIT_DEFAULT_REPO"
BRANCH="${SDRKIT_BRANCH:-main}"

say()  { [ "$JSON" = yes ] || echo "$*"; }
jstr() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }
fail_json() { echo "{\"ok\": false, \"online\": ${2:-true}, \"error\": $(jstr "$1")}"; exit 1; }
die()  { if [ "$JSON" = yes ]; then fail_json "$1" "${2:-true}"; fi; echo "✖ $1"; exit 1; }

current_commit() { cat "$STATE/commit" 2>/dev/null; }
current_version() { cat "$OPT/VERSION" 2>/dev/null || echo "?"; }

# ---------------------------------------------------------------- volver
if [ "$MODE" = rollback ]; then
  [ "$(id -u)" -eq 0 ] || die "Usa: sudo sdrkit volver"
  [ -d "$OPT.prev" ] || die "No hay una versión anterior guardada."
  echo "Volviendo a la versión anterior ($(cat "$OPT.prev/VERSION" 2>/dev/null || echo '?'))…"
  rm -rf "$OPT.tmp" && mv "$OPT" "$OPT.tmp" && mv "$OPT.prev" "$OPT" && mv "$OPT.tmp" "$OPT.prev"
  [ -f "$OPT/sdrkit-cli.sh" ] && install -m 755 "$OPT/sdrkit-cli.sh" /usr/local/bin/sdrkit
  prev="$(cat "$STATE/prev_commit" 2>/dev/null)"; cur="$(current_commit)"
  [ -n "$prev" ] && echo "$prev" > "$STATE/commit"; [ -n "$cur" ] && echo "$cur" > "$STATE/prev_commit"
  systemctl restart sdrkit && echo "✔ Listo: versión $(current_version). (Para volver a la nueva: sudo sdrkit volver)"
  exit 0
fi

# ---------------------------------------------------------------- traer de GitHub
[ "$MODE" = check ] || [ "$(id -u)" -eq 0 ] || die "Usa: sudo sdrkit actualizar"
if ! curl -fsS --max-time 10 -o /dev/null "https://github.com" 2>/dev/null; then
  die "Sin internet. Conecta la Raspberry a tu WiFi de casa (o al hotspot de tu celular) y vuelve a intentarlo." false
fi
command -v git >/dev/null || die "Falta git: sudo apt install git"
GIT=(git -C "$SRC" -c advice.detachedHead=false)
if [ "$MODE" = check ] && [ "$(id -u)" -ne 0 ] && [ ! -w "$SRC" ]; then
  die "Para buscar actualizaciones usa: sudo sdrkit actualizar --buscar"
fi
if [ ! -d "$SRC/.git" ]; then
  say "Descargando el proyecto desde $REPO …"
  rm -rf "$SRC"
  git clone -q --depth 100 -b "$BRANCH" "$REPO" "$SRC" 2>&1 || die "No se pudo descargar $REPO (¿existe y es público?)."
else
  "${GIT[@]}" remote set-url origin "$REPO"
fi
"${GIT[@]}" fetch -q --depth 100 origin "$BRANCH" 2>&1 || die "No se pudo consultar GitHub ($REPO, rama $BRANCH)."
NEW="$("${GIT[@]}" rev-parse FETCH_HEAD)"
OLD="$(current_commit)"
NEW_VER="$("${GIT[@]}" show "$NEW:VERSION" 2>/dev/null | tr -d '[:space:]')"
NEW_REV="$("${GIT[@]}" show "$NEW:install.sh" 2>/dev/null | sed -n 's/^INSTALL_REV=\([0-9]*\).*/\1/p' | head -1)"
CUR_REV="$(cat "$STATE/install_rev" 2>/dev/null || echo 0)"
FULL=no; [ "${NEW_REV:-0}" -gt "${CUR_REV:-0}" ] 2>/dev/null && FULL=yes
if [ -n "$OLD" ] && "${GIT[@]}" cat-file -e "$OLD^{commit}" 2>/dev/null; then
  CHANGES="$("${GIT[@]}" log --format='%s' "$OLD..$NEW" 2>/dev/null)"
else
  CHANGES="$("${GIT[@]}" log --format='%s' -n 10 "$NEW" 2>/dev/null)"
fi
BEHIND=0; [ "$NEW" != "$OLD" ] && BEHIND="$(printf '%s\n' "$CHANGES" | grep -c .)"
[ "$NEW" != "$OLD" ] && [ "$BEHIND" -eq 0 ] && BEHIND=1

if [ "$MODE" = check ]; then
  if [ "$JSON" = yes ]; then
    python3 - "$(current_version)" "$OLD" "$NEW_VER" "$NEW" "$BEHIND" "$FULL" "$CHANGES" "$REPO" "$BRANCH" <<'PY'
import json, sys
cv, oc, nv, nc, behind, full, changes, repo, branch = sys.argv[1:]
print(json.dumps({"ok": True, "online": True, "current": cv, "current_commit": oc[:7], "latest": nv or "?",
                  "latest_commit": nc[:7], "behind": int(behind), "full": full == "yes",
                  "changes": [c for c in changes.splitlines() if c][:30], "repo": repo, "branch": branch}))
PY
  elif [ "$BEHIND" -eq 0 ]; then
    echo "✔ Ya tienes la última versión ($(current_version))."
  else
    echo "Hay una actualización: $(current_version) → ${NEW_VER:-?}  ($BEHIND cambios)"
    printf '%s\n' "$CHANGES" | head -15 | sed 's/^/  • /'
    echo "Para instalarla:  sudo sdrkit actualizar"
  fi
  exit 0
fi

# ---------------------------------------------------------------- instalar
exec 9>/run/sdrkit-update.lock
flock -n 9 || die "Ya hay una actualización en curso."
exec > >(tee -a "$LOG") 2>&1
echo
echo "=== Actualización $(date '+%F %T') ==="
if [ "$BEHIND" -eq 0 ] && [ "$FORCE" != yes ]; then
  echo "✔ Ya tienes la última versión ($(current_version)). (Para reinstalarla: sudo sdrkit actualizar --forzar)"
  exit 0
fi
echo "Versión instalada: $(current_version)   →   nueva: ${NEW_VER:-?}"
[ -n "$CHANGES" ] && { echo "Cambios:"; printf '%s\n' "$CHANGES" | head -20 | sed 's/^/  • /'; }
if [ "$FULL" = yes ]; then
  echo "Esta versión necesita la instalación completa (paquetes nuevos): tarda más y al final se reinicia."
fi
if [ "$YES" != yes ] && [ -t 0 ]; then
  read -r -p "¿Actualizar ahora? (si/no) [si]: " ans
  case "$(echo "${ans:-si}" | tr '[:upper:]' '[:lower:]')" in si|s|sí|y|yes) ;; *) echo "Cancelado."; exit 0 ;; esac
fi

# copia de seguridad de lo que funciona ahora
rm -rf "$OPT.prev"
[ -d "$OPT" ] && cp -a "$OPT" "$OPT.prev"
cp -a "$CONF" "$CONF.antes-de-actualizar" 2>/dev/null
[ -n "$OLD" ] && echo "$OLD" > "$STATE/prev_commit"
"${GIT[@]}" reset -q --hard "$NEW" && "${GIT[@]}" clean -qfd || die "No se pudo preparar la versión nueva."

if [ "$FULL" = yes ]; then
  echo "Instalación completa en marcha (si se corta el SSH sigue sola: tail -f /var/log/sdrkit-install.log)…"
  bash "$SRC/install.sh" </dev/null
  exit $?
fi

rollback() {
  echo "✖ $1"
  if [ -d "$OPT.prev" ]; then
    rm -rf "$OPT" && mv "$OPT.prev" "$OPT"
    [ -f "$OPT/sdrkit-cli.sh" ] && install -m 755 "$OPT/sdrkit-cli.sh" /usr/local/bin/sdrkit
    [ -n "$OLD" ] && "${GIT[@]}" reset -q --hard "$OLD" 2>/dev/null
    [ -n "$OLD" ] && echo "$OLD" > "$STATE/commit"
    systemctl restart sdrkit
    echo "↩ Volví a la versión anterior ($(current_version)): todo sigue como antes."
  fi
  exit 1
}
bash "$SRC/install.sh" --panel || rollback "Falló la instalación de la versión nueva."
echo "Comprobando que el panel arranca…"
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PANEL_PORT:-80}/api/status")"
  case "$code" in 200|401) echo "$NEW" > "$STATE/commit"; echo "✔ Actualizado a la versión $(current_version). Recarga el panel en el celular."; exit 0 ;; esac
  sleep 2
done
rollback "El panel nuevo no respondió en 60 s."
