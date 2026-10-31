#!/bin/sh
# Copy one or more items from this repo into your Herdr app home and check them.
#   ./install.sh zen pomodoro      # named items
#   ./install.sh --all             # everything
# Home: $HERDR_APP_HOME, else $XDG_CONFIG_HOME/herdr-app, else ~/.config/herdr-app
# (the same on macOS, Linux and Windows' Git Bash). Existing files of the same
# name are moved to <home>/backup/herdr-custom-<time>/ first (outside layouts/
# and mods/, so Herdr doesn't load the old copies). keys.json is never touched:
# items that ship one print it so you can merge it into yours.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
home=${HERDR_APP_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}/herdr-app}
backup="$home/backup/herdr-custom-$(date +%Y%m%d%H%M%S)"
aside() { mkdir -p "$backup/$2"; mv "$1" "$backup/$2/"; echo "moved old $1 to $backup/$2/"; }
[ "${1:-}" = "--all" ] && set -- zen timeline radar newsroom arcade pomodoro needs-you git-log run-menu agent-ticker
[ $# -gt 0 ] || { sed -n 2,9p "$0"; exit 1; }
mkdir -p "$home/layouts" "$home/mods"
for item in "$@"; do
  src="$here/$item"
  [ -d "$src/mods" ] || { echo "no such item: $item" >&2; exit 1; }
  if [ -d "$src/layouts" ]; then
    for f in "$src"/layouts/*.json; do
      dst="$home/layouts/$(basename "$f")"
      if [ -e "$dst" ]; then aside "$dst" layouts; fi
      cp "$f" "$dst"
    done
  fi
  for m in "$src"/mods/*/; do
    name=$(basename "$m"); dst="$home/mods/$name"
    if [ -e "$dst" ]; then aside "$dst" mods; fi
    cp -R "${m%/}" "$dst"
    if command -v herdr-app >/dev/null 2>&1; then herdr-app check "$dst"; fi
  done
  if [ -f "$src/keys.json" ]; then
    echo "-- $item: merge these keys into $home/keys.json:"; cat "$src/keys.json"
  fi
  if [ -d "$src/layouts" ]; then
    echo "-- $item: show it with  herdr-app do layout.switch --name $item"
  fi
done
