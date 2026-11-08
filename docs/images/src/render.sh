#!/bin/sh
# Renders the README images from HTML at 2x with headless Chrome:
#   docs/images/src/panel.html -> docs/images/panel.png (326 CSS px wide)
#   docs/images/src/cover.html -> docs/images/cover.png (1600×1000)
set -eu
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

shot() { # html out width height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --allow-file-access-from-files --virtual-time-budget=2000 \
    --window-size="$3,$4" --screenshot="$2" "file://$PWD/$1" 2>/dev/null
}

# The panel image is as tall as the panel; ask Chrome for that height first.
height=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=2000 \
  --window-size=326,2000 --dump-dom "file://$PWD/panel.html" 2>/dev/null \
  | sed -n 's/.*data-height="\([0-9]*\)".*/\1/p')
shot panel.html ../panel.png 326 "${height:?could not measure panel.html}"
shot cover.html ../cover.png 800 500
echo "panel.png 326x$height (CSS px, 2x), cover.png 800x500 (CSS px, 2x)"
