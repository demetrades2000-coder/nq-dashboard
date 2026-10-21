# Start here

**What it does:** every 6 hours it makes clips from the brand's footage and
**posts them publicly to TikTok, Instagram and YouTube on its own, for
free**. You never tap Post.

**Campaign:** Alpha Futures pays $2 per 1,000 views on TikTok, Instagram and
YouTube, up to $500 per clip. File: `campaigns/alpha-futures.json`.

**How posting is free:**
- **TikTok and Instagram** go through **Zernio** (zernio.com). Its free plan
  is 2 connected accounts with **unlimited posts**, and TikTok already allows
  it to post publicly. The only cap is TikTok's own, about 15 posts per day
  per account, which no app can exceed. Raise your daily number with
  `python pipeline.py autopilot enable --max-per-day 10`.
- **YouTube Shorts** goes through Google's own YouTube API, which is free.

## One-time setup (you, about 30 minutes)

1. **Join** the
   [Alpha Futures campaign](https://contentrewards.com/c/campaigns/2c65001c-d6a8-4b14-9ba6-52400794b085)
   with your Whop login.
2. **Make the dedicated accounts** the campaign requires: TikTok, plus
   Instagram if you want it. Put "Alpha Futures" in the name, use their logo
   as the picture, and keep likes visible. Instagram must be a free
   Professional account: Settings → Account type → Creator.
3. **Zernio (free):**
   - Sign up at zernio.com; no card needed.
   - Connect the TikTok account, and Instagram as your second free account.
   - Create an **API key**.
4. **YouTube (optional, free):** follow the 2-minute steps at the top of
   `youtube.py` to get a `client_secret.json`.
5. **Campaign files:**
   - Put their footage in `clipper/campaigns/footage/alpha-futures/`.
   - Save their logo as `clipper/campaigns/logos/alpha-futures.png`.
   - Fill the 3 TODOs in `alpha-futures.json`: a rules line, their @handle,
     today's date.

   A Claude session on your computer can do this step with
   `LOCAL_CLAUDE_TASK.md`.
6. **Double-click** `clipper/START.bat` (Windows) or `clipper/START.command`
   (Mac):
   - Say **yes** to "Post automatically for free?" and paste the Zernio key.
   - Say **yes** to TikTok's consent question. TikTok requires your
     agreement for automated posts, and only you can give it.
   - Say **yes** to the schedule.

## The only recurring step

Content Rewards has no way for a program to submit, so every day or two:
1. Open `AUTOPILOT_REPORT.md`, which lists the new public links.
2. Paste each into the campaign's submit form.
3. Run `python pipeline.py submitted all`.

## If something's off

```
python pipeline.py doctor        # checks everything, says exactly what to fix
python pipeline.py status        # every job and error in plain words
python pipeline.py zernio status # which accounts Zernio sees
```

What the report can say:
- **"posting limit reached":** TikTok's own cap of about 15 posts per day per
  account, which applies to every app. The rest go out the next day.
- **"no tiktok account is connected in Zernio":** reconnect it in Zernio's
  dashboard.
- **"engagement under 2%":** that post may not be paid under the campaign
  rules.

## About the money

You're paid only on views the campaign verifies, at $2 per 1,000 minus a 10%
fee, capped at $500 per clip, and a clip has to earn at least $2. Most clips
get modest views; the report shows the real numbers. Re-check the campaign
page weekly and update `verified_on`. The autopilot pauses a campaign whose
check is more than 30 days old.
