# Start here

Everything is built: clipping, captions, the logo, `#ad`, rule checks, free
automatic posting to TikTok (and Instagram/YouTube), view tracking and a
schedule every 6 hours. You do 5 things once.

## Your 5 steps

**1. Whop:** join the
[Alpha Futures campaign](https://contentrewards.com/c/campaigns/2c65001c-d6a8-4b14-9ba6-52400794b085).

**2. TikTok:** make the dedicated account. Put "Alpha Futures" in the name
and their logo as the profile picture.

**3. Zernio (free):**
- Sign up at **zernio.com**.
- Connect that TikTok account.
- Create an **API key** and keep it handy.

**4. Download this tool:**
- Get the
  [ZIP](https://github.com/demetrades2000-coder/nq-dashboard/archive/refs/heads/claude/determined-shannon-94kfrp.zip)
  (sign in to GitHub if asked) and unzip it.
- Install **Python** from [python.org](https://www.python.org/downloads/).
  On Windows, tick **"Add python.exe to PATH"**.

**5. Double-click `START.bat`** (Windows) or **`START.command`** (Mac),
inside the `clipper` folder. It installs everything, then asks you simple
questions:
- **"Set up Alpha Futures now?"** Yes. Paste a rules sentence and their
  @handle. When folders open, drop in their logo and footage from the
  campaign page.
- **"Post automatically for free?"** Yes. Paste the Zernio key.
- **TikTok consent:** yes.
- **Schedule and first run:** yes.

Done. It now posts by itself.

## Ongoing (2 minutes, every day or two)

1. Open `AUTOPILOT_REPORT.md` (in the `clipper-workspace` folder).
2. Paste the new links into the campaign's submit form on Whop.
3. Double-click `START.bat` again, or run `python pipeline.py submitted all`,
   to mark them done.

When the brand posts new footage, drop it into the same footage folder.

## If something looks wrong

Run `python pipeline.py doctor`. It tells you exactly what to fix.
