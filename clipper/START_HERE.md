# Start here: the short version

Our TikTok move is **Alpha Futures**, a futures-trading prop firm. It pays
**$2 per 1,000 views** on TikTok, Instagram and YouTube, up to $500 per clip.
That's double the typical campaign rate, and the brand supplies the footage.
Its file is `campaigns/alpha-futures.json`, already filled in except for the
parts only you can do (marked TODO).

## One-time setup (about 30–45 minutes)

**1. Join the campaign** (5 min). Open the
[Alpha Futures campaign on Content Rewards](https://contentrewards.com/c/campaigns/2c65001c-d6a8-4b14-9ba6-52400794b085),
sign in with Whop and join. Read the rules and check the budget isn't used up.

**2. Make a dedicated TikTok account** (5 min). The campaign requires one:
- the name includes "Alpha Futures" (for example "Alpha Futures Clips")
- the profile picture is their official logo
- likes stay visible

**3. Get their files** (5 min). From the links on the campaign page,
download:
- the official **footage** into `clipper/campaigns/footage/alpha-futures/`
- the official **logo** (PNG), saved as `clipper/campaigns/logos/alpha-futures.png`

**4. Fill the 3 TODOs** (3 min). Open `clipper/campaigns/alpha-futures.json`
in any text editor:
- `"evidence"`: paste one line from the rules about what you may clip.
- `"required_mentions"`: the official Alpha Futures handle, for example
  `"@alphafutures"`, exactly as the rules say.
- `"verified_on"`: today's date, like `"2026-10-22"`.

**5. Make a TikTok developer app** (10 min, free). Do this at
[developers.tiktok.com](https://developers.tiktok.com/):
- Create an app.
- Add the **Login Kit** and **Content Posting API** products, and turn on
  "Upload".
- Add the scopes `user.info.basic`, `video.upload` and `video.list`.
- Under Login Kit, choose **Desktop** and add the redirect URI
  `http://localhost:3455/callback/`.
- Copy the **client key** and **client secret**; setup asks for them.

**6. Run setup.** Double-click `clipper/START.bat` on Windows, or
`clipper/START.command` on Mac. It:
- installs everything
- checks your campaign file
- logs into the dedicated TikTok account. When TikTok asks, sign in with the
  Alpha Futures account, not your personal one.
- turns on autopilot
- schedules it every 6 hours
- optionally runs the first batch

Say yes to phone notifications if you want a ping, with the caption, when
drafts are ready.

## Your daily routine (about 2 minutes per clip)

The autopilot runs on its own every 6 hours: it imports new footage, cuts
clips, captions them, adds the logo and the `#ad` disclosure, checks the rules
and sends the clips to your TikTok as drafts. You do two things:

1. **Post the drafts.** Open TikTok on your phone and tap the draft
   notification. Paste the caption from the ntfy notification or
   `AUTOPILOT_REPORT.md`, turn on **Content disclosure → Paid partnership**,
   and tap **Post**.
2. **Submit the links.** The next cycle finds your live posts automatically.
   Paste each link from `AUTOPILOT_REPORT.md` into the campaign's submit form
   on Content Rewards, then run:

```
python pipeline.py submitted all
```

Keep posts up for at least 30 days, which the campaign requires. When the
brand sends new footage, drop it in the footage folder; the next cycle picks
it up.

## If something's off

```
python pipeline.py doctor      # checks everything and says exactly what to fix
python pipeline.py status      # what each job is doing, with errors explained
python pipeline.py review      # look at clips that were held back
```

## Why two steps stay manual

- **Posting:** TikTok only lets apps it hasn't reviewed post privately or
  send drafts. You'd need TikTok's app audit to post directly.
- **Submitting:** Content Rewards has no API for submissions.

Everything else is automated.

## About the money

You're paid on views the campaign verifies, at $2 per 1,000 minus the board's
10% fee, up to $500 per clip. A clip needs at least $2 earned (1,000+ views)
to pay out, and the campaign requires 2% engagement. Most clips get modest
views and some get none; the report shows real numbers as they come in.
Rates, budgets and rules change, so re-check the campaign page weekly and
update `verified_on`. The autopilot pauses a campaign whose check is more
than 30 days old.
