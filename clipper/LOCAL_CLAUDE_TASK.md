# Task for the Claude session on the user's computer

The user wants the clipping autopilot running with as little effort as
possible. Do every step you can yourself. Stop and hand over **only** at the
⏸ points:
- passwords, 2FA or phone codes
- accepting any site's terms
- creating accounts
- anything that publishes or spends money

Never paste secrets into files, chat or logs. Pass them only as environment
variables to the one command that needs them.

Context: `clipper/` is a Python tool. Read `clipper/README.md` and
`clipper/START_HERE.md` first. The target campaign is
`clipper/campaigns/alpha-futures.json`.

## 1. Get the code and install (shell)

```bash
git clone -b claude/determined-shannon-94kfrp https://github.com/demetrades2000-coder/nq-dashboard.git
cd nq-dashboard/clipper
python -m pip install -r requirements.txt     # python3 on macOS
python pipeline.py doctor --fix
```

If ffmpeg is missing, install it:
- Windows: `winget install -e --id Gyan.FFmpeg`
- macOS: `brew install ffmpeg`

Re-run `doctor` until only account and campaign items remain.

## 2. Campaign page (browser)

Open https://contentrewards.com/c/campaigns/2c65001c-d6a8-4b14-9ba6-52400794b085.

- ⏸ If the user isn't signed in, or hasn't joined the campaign, ask them to
  sign in with Whop and click Join. Joining accepts the campaign's terms.
- Read the rules. Confirm that budget remains, and that the rate is still
  $2 per 1K with TikTok included. If the campaign is paused or out of budget,
  stop and tell the user.
- From the rules, find the official handle(s) to tag and a sentence saying
  what may be clipped. Then run:

  ```bash
  python pipeline.py campaign-set campaigns/alpha-futures.json --verified-today \
     --evidence "<exact sentence from the rules>" --mention <official handle>
  ```

  If the rules name a different rate or cap, add `--cpm` / `--max-payout`.
  If they require other caption text or hashtags, add `--hashtag` (and edit
  `required_text` in the JSON).
- Download the official footage from the links the campaign page gives into
  `campaigns/footage/alpha-futures/`. Download the official logo (PNG) to
  `campaigns/logos/alpha-futures.png`. Use only links from the campaign page.
- `python pipeline.py campaign-check campaigns/alpha-futures.json` must say OK.

## 3. Dedicated TikTok account

- ⏸ The user creates it in the TikTok app: phone verification, name
  containing "Alpha Futures", the official logo as profile picture, likes
  visible. Ask them to tell you when it's done.

## 4. Posting route: Upload-Post (preferred, fully automatic)

- ⏸ The user signs up at https://upload-post.com and picks a plan that
  includes TikTok. Choosing a plan spends money, so that's the user's
  decision.
- In the Upload-Post dashboard, create a profile named `alphafutures`.
  ⏸ The user connects the dedicated TikTok account to it, plus Instagram and
  YouTube if wanted. These are platform logins.
- Copy the API key from the dashboard, then run:

  ```bash
  UPLOAD_POST_API_KEY=... python3 pipeline.py setup --yes      # Windows: $env:UPLOAD_POST_API_KEY="..."; python pipeline.py setup --yes
  python3 pipeline.py autopilot enable --via uploadpost --platforms tiktok,instagram,youtube
  ```

  Keep only the platforms actually connected in Upload-Post. Then skip
  step 4b.

## 4b. Fallback only: TikTok developer app (drafts the user posts from the app)

At https://developers.tiktok.com:
- ⏸ The user signs in and accepts the developer terms.
- Then you create an app (name it e.g. "Clip Uploader"):
  - Add products **Login Kit** and **Content Posting API**, with "Upload"
    enabled.
  - Add scopes `user.info.basic`, `video.upload` and `video.list`.
  - Under Login Kit, choose Desktop and set the redirect URI to
    `http://localhost:3455/callback/`.
  - If the portal requires app review before the scopes work for the
    owner's account, use the portal's sandbox / test users option and add
    the dedicated TikTok account as a test user. Tell the user what you did.
- Read the client key and secret from the portal and run setup with them
  set only in the environment:

```bash
# macOS/Linux
TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... python3 pipeline.py setup --yes
# Windows PowerShell
$env:TIKTOK_CLIENT_KEY="..."; $env:TIKTOK_CLIENT_SECRET="..."; python pipeline.py setup --yes
```

- ⏸ A browser window opens for TikTok login. The user signs in **with the
  dedicated Alpha Futures account** and clicks Authorize.
- If login fails with a code_challenge error, run
  `python pipeline.py tiktok auth --client-key ... --account alphafutures --pkce b64`.
- `setup --yes` enables autopilot, installs the 6-hour schedule and runs
  the first cycle.

## 5. Optional: YouTube Shorts too

Only if the user wants it. Create a Google Cloud project, enable YouTube
Data API v3, set up the OAuth consent screen (External, user as test user,
then publish to "In production"), and create a Desktop OAuth client. Then:

```bash
YOUTUBE_CLIENT_SECRET=/path/client_secret.json python3 pipeline.py youtube auth --client-secret "$YOUTUBE_CLIENT_SECRET" --account alphafutures
python3 pipeline.py autopilot enable --platforms tiktok,youtube
```

- ⏸ The user picks the right channel in the Google consent screen.

## 6. Check and report back

```bash
python pipeline.py doctor
python pipeline.py status
python pipeline.py autopilot status
```

Open `AUTOPILOT_REPORT.md` in the workspace and tell the user, in plain words:
- what's running and when the next cycle is
- how many drafts are waiting in their TikTok inbox
- their daily routine: tap Post on each draft with the caption from the
  report and "Paid partnership" on, then paste the links into the campaign
  form and run `python pipeline.py submitted all`

Don't claim earnings. Report actual views only once they exist.
