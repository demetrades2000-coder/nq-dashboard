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
