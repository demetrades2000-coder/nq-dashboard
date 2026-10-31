# Dark mode and Appearance: text for the Help sheet and README (merge by hand)

## Appearance
- **Appearance** has three choices: **Light** (the planner as it has always looked: white, thin borders), **Dark** (near-black page, dark cards, easier on the eyes at night) and **Match my phone** (dark when your phone is in dark mode, light when it is not, and it changes by itself when your phone does).
- Where to find it: the **sun / moon button** in the header flips between light and dark in one tap. For all three choices, open **All tools** and tap **Appearance and settings**, search for it with **Find** (Ctrl/Cmd+K, or type "dark mode" or "light mode"), or use the links `#settings` and `#appearance`. The **Settings** sheet shows the current choice with a one-line explanation, and also has Week starts, Back up, Restore, Connect and Help.
- The choice is saved **on this device only** (it is not part of your backup or synced data), so your phone can be dark while your computer stays light. The default is Light.
- The phone's status bar color (`theme-color`) and the native date, time and select pickers follow the choice. The dark page is applied before the first paint, so there is no white flash when the app opens.
- Event types, jobs, projects and habits keep their own colors. In dark mode a color that would be too dark to read is lightened a little, and the soft tinted backgrounds blend toward the dark card instead of toward white.

## For developers
- Theme tokens live on `:root` (light) and `html[data-theme="dark"]` (dark): `--bg --card --soft --soft2 --line --ink --ink2 --mute --faint --on-ink --on-ok --shadow`, plus `--kb-*` (backgrounds), `--kf-*` (text) and `--kl-*` (borders) for every status tint that used to be a literal hex color. In light mode each `--k*` token equals the old literal exactly.
- `tint()`, `shade()` and `cvars()` are theme aware; the theme switch re-renders the current screen. Sheets that are open while you switch repaint the next time they open.
- `planner/tests/theme.test.js` checks dark contrast and white boxes on every deep link, persistence, Match my phone, the header button, and that light mode colors are unchanged.
