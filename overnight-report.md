# ZLARIOR overnight build log
Window: 9:17 pm ET (Sun) → 5:00 am ET (Mon). Live site: https://demetrades2000-coder.github.io/nq-dashboard/portfolio/

## Shipped (in order)
- 9:20 pm — SEO + share polish: JSON-LD, web manifest, home-screen icons, og image. 3D layer now loads after first paint; data-saver / slow connections get a still image instead of the hero video.
- 9:25 pm — "Ask Jarvis" demo: calm, answers only from site content, labeled demo, refuses financial advice, invents no results.
- 9:30 pm — Accessibility pass: skip link, visible focus, keyboard accordion + image viewer (tested).
- 9:31 pm — Independent QA agent started on the live site (report pending).

## Infrastructure
- Watchdog: restore.sh re-adds portfolio/ to main if the dashboard bot wipes it (bot rewrites main with a fresh history each run).
- Hourly wake-ups at :18 until 5 am; 5 am final report + push notification scheduled.

## Pending
- Permanent link: Cloudflare Pages (zlarior.pages.dev), production branch claude/jolly-knuth-0a3mav, output dir portfolio — needs the user's Cloudflare login.
- Real supercar footage: needs a Pexels API key or user-supplied clip.
- Real Jarvis / Kalshi / Clip Farm screenshots from the user.

- 9:24 pm — Lighter phone hero video (0.4 MB vs 6.8 MB desktop).
- 9:35 pm — QA agent report (no P1 bugs). Fixed: lower-contrast text lifted, visible focus on icons/chips/send, removed stray tab stop, mobile strip gutter, tighter section spacing, hero title now fades in letter by letter (no random-glyph "typo" flash), real mobile menu, Jarvis typing indicator, desktop hero video 6.8 MB → 1.0 MB.
- 9:40 pm — User request: hero picture should be a supercar (ideally Lamborghini) driving at night. Footage agent searching Wikimedia/archive.org/Mixkit for real night supercar clips; will review, swap into hero, and add any required attribution.
- 9:55 pm — HERO SWAPPED: real Lamborghini Revuelto after dark (amber taillights in a dark garage) from "Hey… Are You Okay?" by The Pro Video, YouTube CC BY 3.0 (credited in the page footer with a link). Plate hidden, audio stripped, graded dark. Phone version cropped + faded. Old hero + unused candidates removed. Caveat: it's a garage shot, not a road drive — no free night road footage of a Lamborghini exists in reachable libraries.
- 11:19 pm — watchdog: the dashboard bot wiped main at 11:08 pm ET (it rewrites main each run); portfolio restored automatically. Started a 5-minute restore loop (no usage cost) between wake-ups.
- 2:10 am — bot wiped main again at 2:08 am ET (it runs on market days); restored. Worker restarted and killed the old loop; relaunched a 3-minute restore loop (watchdog.log). Bot wipes confirm Cloudflare Pages is the real fix.
- 2:25 am — fixed watchdog check (it still looked for the deleted old hero file); site live, hero video 200.
- 5:00 am — FINAL: site live (page + hero 200). Dashboard bot wiped main 3+ more times overnight (11:08 pm, 2:08 am, ~2:30, 3:25, 4:17 am ET); every wipe auto-restored within minutes by the restore loop. Overnight wake-up schedule deleted. Restore loop keeps running until ~6:15 am ET.
- Cloudflare Pages chosen as the permanent host (user's login needed). Added portfolio/_headers (cache + security). Guard loop (2 min) running meanwhile.
