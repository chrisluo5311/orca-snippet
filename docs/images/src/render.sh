#!/bin/sh
# Renders the README images from HTML at 2x with headless Chrome:
#   docs/images/src/panel.html -> docs/images/panel.png (326 CSS px wide)
#   docs/images/src/cover.html -> docs/images/cover.png (1600×1000)
set -eu
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

shot() { # html out width height [scale]
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="${5:-2}" \
    --allow-file-access-from-files --virtual-time-budget=2000 \
    --window-size="$3,$4" --screenshot="$2" "file://$PWD/$1" 2>/dev/null
}

# The panel image is as tall as the panel; ask Chrome for that height first.
height=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=2000 \
  --window-size=326,2000 --dump-dom "file://$PWD/panel.html" 2>/dev/null \
  | sed -n 's/.*data-height="\([0-9]*\)".*/\1/p')
shot panel.html ../panel.png 326 "${height:?could not measure panel.html}"
# The cover's tilted panel is a 3D transform, which Chrome draws as a bitmap and then warps,
# softening the text. Render at 4x and scale down to 1600×1000 (supersampling) to keep it sharp;
# Orca caps the cover at 1 MB, which a larger cover would pass.
shot cover.html ../cover.png 800 500 4
sips -z 1000 1600 ../cover.png >/dev/null
echo "panel.png 326x$height (CSS px, 2x), cover.png 1600x1000 (4x, downsampled)"
