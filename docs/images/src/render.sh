#!/bin/sh
# Renders the README images from HTML with headless Chrome:
#   docs/images/src/panel.html -> docs/images/panel.png (326 CSS px wide, at 2x)
#   docs/images/src/cover.html -> docs/images/cover.png (800×500 CSS px at 4x, scaled down to 1600×1000)
# Needs Chrome (override with CHROME=...) and, for the cover, sips (macOS) or ImageMagick.
set -eu
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
COVER_W=800 COVER_H=500    # CSS px; must match body in cover.html
COVER_MAX_BYTES=1048576    # Orca rejects a cover over 1 MB

die() { echo "render.sh: $*" >&2; exit 1; }

# Pick a resizer before touching any output, so a missing tool fails cleanly.
if command -v sips >/dev/null 2>&1; then
  resize() { sips -z "$4" "$3" "$1" --out "$2" >/dev/null; }    # in out width height
elif command -v magick >/dev/null 2>&1; then
  resize() { magick "$1" -resize "$3x$4!" "$2"; }
else
  die "need sips (macOS) or ImageMagick's magick to scale the cover down"
fi

# Everything renders into a temp dir and moves into docs/images/ only once it is complete.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

shot() { # html out width height scale
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="$5" \
    --allow-file-access-from-files --virtual-time-budget=2000 \
    --window-size="$3,$4" --screenshot="$2" "file://$PWD/$1" 2>/dev/null
  [ -s "$2" ] || die "Chrome wrote no screenshot for $1"
}

# The panel image is as tall as the panel; ask Chrome for that height first.
height=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=2000 \
  --window-size=326,2000 --dump-dom "file://$PWD/panel.html" 2>/dev/null \
  | sed -n 's/.*data-height="\([0-9]*\)".*/\1/p')
shot panel.html "$tmp/panel.png" 326 "${height:?could not measure panel.html}" 2

# The cover's tilted panel is a 3D transform, which Chrome draws as a bitmap and then warps,
# softening the text. Render at 4x and scale down to 2x (supersampling) to keep it sharp.
shot cover.html "$tmp/cover-4x.png" "$COVER_W" "$COVER_H" 4
resize "$tmp/cover-4x.png" "$tmp/cover.png" $((COVER_W * 2)) $((COVER_H * 2))
[ -s "$tmp/cover.png" ] || die "scaling the cover down produced no file"
size=$(wc -c < "$tmp/cover.png" | tr -d ' ')
[ "$size" -le "$COVER_MAX_BYTES" ] || die "cover.png is $size bytes, over Orca's $COVER_MAX_BYTES-byte limit"

mv "$tmp/panel.png" ../panel.png
mv "$tmp/cover.png" ../cover.png
echo "panel.png 326x$height (CSS px, 2x), cover.png $((COVER_W * 2))x$((COVER_H * 2)) ($size bytes, 4x downsampled)"
