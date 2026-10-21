# Start here

**Goal:** the tool makes the clips and posts them to TikTok (plus Instagram
and YouTube if you want) on its own, every 6 hours. You only set it up once,
and paste finished links into the campaign page.

**Campaign:** Alpha Futures. It pays $2 per 1,000 views on TikTok, Instagram
and YouTube, up to $500 per clip, and the brand provides the footage. Its
file is `campaigns/alpha-futures.json`.

**How posting works:** through **Upload-Post** (upload-post.com), a posting
service TikTok, Instagram and YouTube already allow to post publicly. That is
what makes it hands-off; your own new TikTok app could only post privately.
It's a paid service. By its own pricing page, the free plan is 10 uploads a
month and may not include TikTok, and Basic is about $16–24 a month for
unlimited uploads. Choosing a plan is your call.

## One-time setup (you)

1. **Join the campaign:** open
   [Alpha Futures on Content Rewards](https://contentrewards.com/c/campaigns/2c65001c-d6a8-4b14-9ba6-52400794b085),
   sign in with Whop and join. Check the budget isn't used up.
2. **Make the dedicated TikTok account** the campaign requires. The name
   includes "Alpha Futures", the profile picture is their logo, and likes
   stay visible. Optionally do the same on Instagram.
3. **Upload-Post:**
   - Sign up and pick a plan that includes TikTok.
   - Create a profile named **`alphafutures`** and connect the dedicated
     TikTok account (and Instagram/YouTube if you made them).
   - Copy your **API key**.
4. **Campaign files:**
   - Download their footage into `clipper/campaigns/footage/alpha-futures/`.
   - Save their logo as `clipper/campaigns/logos/alpha-futures.png`.
   - Fill the 3 TODOs in `alpha-futures.json`: a line from the rules, their
     @handle, today's date.

   A Claude session on your computer can do this step for you with
   `LOCAL_CLAUDE_TASK.md`.
5. **Run setup:** double-click `clipper/START.bat` (Windows) or
   `clipper/START.command` (Mac).
   - Answer **yes** to "Post fully automatically through Upload-Post?" and
     paste the key.
   - Answer yes to the schedule.

That's it. It now runs every 6 hours:
1. It picks up new footage from the folder and makes clips with captions,
   the logo and `#ad`.
2. It checks the rules and posts publicly to TikTok (and Instagram/YouTube)
   through the `alphafutures` profile.
3. It collects the links and view counts, and writes `AUTOPILOT_REPORT.md`.

## The one recurring step

Content Rewards has no way for a program to submit, so every day or two:
1. Open `AUTOPILOT_REPORT.md`. Under "Submit on the campaign page" are the
   new links.
2. Paste each into the campaign's submit form.
3. Run `python pipeline.py submitted all`.

Turn on phone notifications during setup to get a ping when there are links
to submit.

## If something's off

```
python pipeline.py doctor     # checks everything, says exactly what to fix
python pipeline.py status     # every job and any error, in plain words
python pipeline.py review     # clips held back by the safety checks
```

Watch for these in the report:
- **"published it as private":** Upload-Post's TikTok connection didn't post
  publicly. Contact Upload-Post, or switch to TikTok drafts with
  `autopilot enable --via native` and the `tiktok auth` steps in README.md.
- **"plan limit":** your Upload-Post plan is out of uploads or doesn't
  include TikTok.
- **"engagement under 2%":** that post may not be paid under the campaign
  rules.

## About the money

You're paid only on views the campaign verifies, at $2 per 1,000 minus a 10%
fee, capped at $500 per clip, and a clip has to earn at least $2. Most clips
get modest views; the report shows the real numbers. Re-check the campaign
page weekly and update `verified_on`. The autopilot pauses a campaign whose
check is more than 30 days old.
