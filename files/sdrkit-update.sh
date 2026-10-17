#!/bin/bash
# =====================================================================
#  SDR-Kit · updater · actualizador
#  Gets the latest version from GitHub and installs it WITHOUT touching your settings
#  (/etc/sdrkit/sdrkit.conf) or your data (recordings, memories, logs).
#  Trae la última versión desde GitHub y la instala SIN tocar tu configuración ni tus datos.
#
#  sudo sdrkit update              check, show the changes and ask · busca, muestra los cambios y pregunta
#  sudo sdrkit update --yes        no questions (used by the panel button) · sin preguntar   (--si)
#  sudo sdrkit update --force      reinstall even if up to date · reinstala aunque esté al día   (--forzar)
#  sdrkit update --check           only tell whether there is something new (--json for the panel)   (--buscar)
#  sudo sdrkit rollback            go back to the previous version · regresa a la versión anterior   (volver)
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
sdrkit_lang_init

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

# messages take "English" "Español" · los mensajes reciben "English" "Español"
say()  { [ "$JSON" = yes ] || L "$@"; }
jstr() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }
fail_json() { echo "{\"ok\": false, \"online\": ${2:-true}, \"error\": $(jstr "$1")}"; exit 1; }
die()  {  # "English" "Español" [online=true|false]
  local m; m="$(L "$1" "$2")"
  if [ "$JSON" = yes ]; then fail_json "$m" "${3:-true}"; fi
  echo "✖ $m"; exit 1
}

current_commit() { cat "$STATE/commit" 2>/dev/null; }
current_version() { cat "$OPT/VERSION" 2>/dev/null || echo "?"; }

# ---------------------------------------------------------------- rollback · volver
if [ "$MODE" = rollback ]; then
  [ "$(id -u)" -eq 0 ] || die "Use: sudo sdrkit rollback" "Usa: sudo sdrkit volver"
  [ -d "$OPT.prev" ] || die "There is no previous version saved." "No hay una versión anterior guardada."
  prev_ver="$(cat "$OPT.prev/VERSION" 2>/dev/null || echo '?')"
  L "Going back to the previous version ($prev_ver)…" "Volviendo a la versión anterior ($prev_ver)…"
  rm -rf "$OPT.tmp" && mv "$OPT" "$OPT.tmp" && mv "$OPT.prev" "$OPT" && mv "$OPT.tmp" "$OPT.prev"
  [ -f "$OPT/sdrkit-cli.sh" ] && install -m 755 "$OPT/sdrkit-cli.sh" /usr/local/bin/sdrkit
  prev="$(cat "$STATE/prev_commit" 2>/dev/null)"; cur="$(current_commit)"
  [ -n "$prev" ] && echo "$prev" > "$STATE/commit"; [ -n "$cur" ] && echo "$cur" > "$STATE/prev_commit"
  systemctl restart sdrkit && L "✔ Done: version $(current_version). (To return to the newer one: sudo sdrkit rollback)" \
                                "✔ Listo: versión $(current_version). (Para volver a la nueva: sudo sdrkit volver)"
  exit 0
fi

# ---------------------------------------------------------------- fetch from GitHub · traer de GitHub
[ "$MODE" = check ] || [ "$(id -u)" -eq 0 ] || die "Use: sudo sdrkit update" "Usa: sudo sdrkit actualizar"
if ! curl -fsS --max-time 10 -o /dev/null "https://github.com" 2>/dev/null; then
  die "No internet. Connect the Pi to your home WiFi (or your phone's hotspot) and try again." \
      "Sin internet. Conecta la Raspberry a tu WiFi de casa (o al hotspot de tu celular) y vuelve a intentarlo." false
fi
command -v git >/dev/null || die "git is missing: sudo apt install git" "Falta git: sudo apt install git"
GIT=(git -C "$SRC" -c advice.detachedHead=false)
RO=no; [ "$MODE" = check ] && [ "$(id -u)" -ne 0 ] && [ ! -w "$SRC" ] && RO=yes
if [ "$RO" = yes ]; then
  # no write access to the source folder: ask GitHub only (no sudo needed) · sin permiso de escritura: sólo se consulta GitHub
  NEW="$(git ls-remote "$REPO" "refs/heads/$BRANCH" 2>/dev/null | cut -f1)"
  [ -n "$NEW" ] || die "Could not reach GitHub ($REPO, branch $BRANCH)." "No se pudo consultar GitHub ($REPO, rama $BRANCH)."
  OLD="$(current_commit)"
  RAW="$(printf '%s' "${REPO%.git}" | sed -n 's#^https://github.com/#https://raw.githubusercontent.com/#p')/$NEW"
  NEW_VER="$(curl -fsS --max-time 10 "$RAW/VERSION" 2>/dev/null | tr -d '[:space:]')"
  NEW_REV="$(curl -fsS --max-time 10 "$RAW/install.sh" 2>/dev/null | sed -n 's/^INSTALL_REV=\([0-9]*\).*/\1/p' | head -1)"
  CUR_REV="$(cat "$STATE/install_rev" 2>/dev/null || echo 0)"
  FULL=no; [ "${NEW_REV:-0}" -gt "${CUR_REV:-0}" ] 2>/dev/null && FULL=yes
  CHANGES=""; BEHIND=0; [ "$NEW" != "$OLD" ] && BEHIND=1
elif [ ! -d "$SRC/.git" ]; then
  say "Downloading the project from $REPO …" "Descargando el proyecto desde $REPO …"
  rm -rf "$SRC"
  git clone -q --depth 100 -b "$BRANCH" "$REPO" "$SRC" 2>&1 \
    || die "Could not download $REPO (does it exist, and is it public?)." "No se pudo descargar $REPO (¿existe y es público?)."
else
  "${GIT[@]}" remote set-url origin "$REPO"
fi
if [ "$RO" = no ]; then
  "${GIT[@]}" fetch -q --depth 100 origin "$BRANCH" 2>&1 \
    || die "Could not reach GitHub ($REPO, branch $BRANCH)." "No se pudo consultar GitHub ($REPO, rama $BRANCH)."
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
fi

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
    L "✔ Already up to date ($(current_version))." "✔ Ya tienes la última versión ($(current_version))."
  else
    if [ "$RO" = yes ]; then
      L "Update available: $(current_version) → ${NEW_VER:-?}" "Hay una actualización: $(current_version) → ${NEW_VER:-?}"
    else
      L "Update available: $(current_version) → ${NEW_VER:-?}  ($BEHIND changes)" \
        "Hay una actualización: $(current_version) → ${NEW_VER:-?}  ($BEHIND cambios)"
      printf '%s\n' "$CHANGES" | head -15 | sed 's/^/  • /'
    fi
    L "To install it:  sudo sdrkit update" "Para instalarla:  sudo sdrkit actualizar"
  fi
  exit 0
fi

# ---------------------------------------------------------------- install · instalar
exec 9>/run/sdrkit-update.lock
flock -n 9 || die "An update is already running." "Ya hay una actualización en curso."
exec > >(tee -a "$LOG") 2>&1
echo
L "=== Update $(date '+%F %T') ===" "=== Actualización $(date '+%F %T') ==="
if [ "$BEHIND" -eq 0 ] && [ "$FORCE" != yes ]; then
  L "✔ Already up to date ($(current_version)). (To reinstall it: sudo sdrkit update --force)" \
    "✔ Ya tienes la última versión ($(current_version)). (Para reinstalarla: sudo sdrkit actualizar --forzar)"
  exit 0
fi
L "Installed version: $(current_version)   →   new: ${NEW_VER:-?}" "Versión instalada: $(current_version)   →   nueva: ${NEW_VER:-?}"
[ -n "$CHANGES" ] && { L "Changes:" "Cambios:"; printf '%s\n' "$CHANGES" | head -20 | sed 's/^/  • /'; }
if [ "$FULL" = yes ]; then
  L "This version needs the full installation (new packages): it takes longer and restarts the Pi at the end." \
    "Esta versión necesita la instalación completa (paquetes nuevos): tarda más y al final se reinicia."
fi
if [ "$YES" != yes ] && [ -t 0 ]; then
  sdrkit_ask_yn "Update now?" "¿Actualizar ahora?" yes || { L "Cancelled." "Cancelado."; exit 0; }
fi

# backup of what works now · copia de seguridad de lo que funciona ahora
rm -rf "$OPT.prev"
[ -d "$OPT" ] && cp -a "$OPT" "$OPT.prev"
cp -a "$CONF" "$CONF.antes-de-actualizar" 2>/dev/null
[ -n "$OLD" ] && echo "$OLD" > "$STATE/prev_commit"
"${GIT[@]}" reset -q --hard "$NEW" && "${GIT[@]}" clean -qfd || die "Could not prepare the new version." "No se pudo preparar la versión nueva."

rollback() {  # "English" "Español"
  echo "✖ $(L "$1" "$2")"
  if [ -d "$OPT.prev" ]; then
    rm -rf "$OPT" && mv "$OPT.prev" "$OPT"
    [ -f "$OPT/sdrkit-cli.sh" ] && install -m 755 "$OPT/sdrkit-cli.sh" /usr/local/bin/sdrkit
    [ -n "$OLD" ] && "${GIT[@]}" reset -q --hard "$OLD" 2>/dev/null
    [ -n "$OLD" ] && echo "$OLD" > "$STATE/commit"
    echo "$CUR_REV" > "$STATE/install_rev"
    systemctl restart sdrkit
    L "↩ Rolled back to the previous version ($(current_version)): everything is as before." \
      "↩ Volví a la versión anterior ($(current_version)): todo sigue como antes."
  fi
  exit 1
}
wait_panel() {  # 0 when the panel answers within 60 s · 0 si el panel responde en 60 s
  local code
  for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PANEL_PORT:-80}/api/status")"
    case "$code" in 200|401) return 0 ;; esac
    sleep 2
  done
  return 1
}

if [ "$FULL" = yes ]; then
  L "Full installation running (if SSH drops it goes on: tail -f /var/log/sdrkit-install.log)…" \
    "Instalación completa en marcha (si se corta el SSH sigue sola: tail -f /var/log/sdrkit-install.log)…"
  SDRKIT_NO_REBOOT=1 bash "$SRC/install.sh" </dev/null || rollback "The full installation failed." "Falló la instalación completa."
  L "Checking that the panel starts…" "Comprobando que el panel arranca…"
  wait_panel || rollback "The new panel did not answer within 60 s." "El panel nuevo no respondió en 60 s."
  echo "$NEW" > "$STATE/commit"
  L "✔ Updated to version $(current_version). The Pi restarts in 15 seconds." \
    "✔ Actualizado a la versión $(current_version). La Raspberry se reinicia en 15 segundos."
  sync; sleep 15; systemctl reboot
  exit 0
fi

bash "$SRC/install.sh" --panel || rollback "Installing the new version failed." "Falló la instalación de la versión nueva."
L "Checking that the panel starts…" "Comprobando que el panel arranca…"
if wait_panel; then
  echo "$NEW" > "$STATE/commit"
  L "✔ Updated to version $(current_version). Reload the panel on your phone." \
    "✔ Actualizado a la versión $(current_version). Recarga el panel en el celular."
  exit 0
fi
rollback "The new panel did not answer within 60 s." "El panel nuevo no respondió en 60 s."
