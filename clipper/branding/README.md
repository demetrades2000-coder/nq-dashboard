# Clip Engine icon

A real 3D render made with three.js r160 and finished with Pillow. It's the sibling of the Liquidity Engine icon in `../../icons/`: both use the same neon pink/teal rim, glowing ring base and dark indigo backdrop.

- `icon-scene.html`: the three.js scene. It renders only the mark on a transparent canvas: a metal slab shaped like a vertical-video frame, a neon rim, a pearl play button, a clip timeline, an orbiting light trail and the ring base.
- `render.mjs`: uses headless Chromium (Playwright + SwiftShader) to save the canvas as `mark.png` at 2048px.
- `compose.py`: adds the background gradient, bloom, shadow and squircle mask, then exports every file in `../site_assets/`.

## Re-render

```bash
W=$(mktemp -d) && cp clipper/branding/* "$W" && cd "$W"
npm install three@0.160.0                       # the importmap expects ./node_modules/three
python3 -m http.server 8765 --bind 127.0.0.1 &  # render.mjs loads http://127.0.0.1:8765/icon-scene.html
node render.mjs 2048 mark.png                   # Playwright from /opt/node22/lib/node_modules, Chromium at /opt/pw-browsers/chromium
python3 compose.py mark.png /path/to/nq-dashboard/clipper/site_assets
```

To preview the scene, open `http://127.0.0.1:8765/icon-scene.html?size=1024` in a browser. Colors come from the dashboard palette: indigo `#6d7cff`, teal `#3ee0c8`, pink `#ff3d7f` and violet `#b18cff`.
