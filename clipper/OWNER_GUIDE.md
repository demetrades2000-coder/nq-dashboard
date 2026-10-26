# Owner guide

For you, on your phone. No coding. If something here ever disagrees with the dashboard, trust the dashboard and tell Claude.

## What it does, in one minute

Every 4 hours or so, a robot on GitHub (free, your PC can be off) does this:

1. Looks at each campaign's page on Content Rewards. Money left? Still open? If not, that campaign pauses by itself and
   the others carry on.
2. Picks up any new footage from the campaign's shared Google Drive folder.
3. Cuts the best moments into vertical clips and makes slideshows. It adds captions, the brand logo and `#ad`.
4. Posts them to your TikTok pages through Zernio. Each clip goes to **one** page only, never two.
5. Counts the views and updates your dashboard.
6. Sends your phone a note only if it needs you.

The one thing it can **not** do: tell Content Rewards about your posts. That is your daily chore.

## The daily chore (30 seconds to 2 minutes)

1. Open the dashboard. Add it to your Home Screen once: open the link in Safari, tap Share, tap Add to Home Screen.
   `https://raw.githack.com/demetrades2000-coder/nq-dashboard/clipper-cloud/site/index.html`
2. Tap **Submit** (it is the first tab).
3. Tap **Copy next link**. Open the campaign page on Content Rewards. Paste the link into the submit box. Come back.
4. Repeat until it says **all submitted**.

Good to know:
- At about 8 PM New York time your phone gets a note: "N new links to submit". That is your reminder.
- The ticks are saved **in that browser only**. If you open the dashboard on another phone it will show the old links again.
  Use **Mark all submitted** there once.
- Skipping a day is fine. Links wait. (Check the campaign's rules: some only accept posts submitted within a time limit.)

## What the colours mean

At the top of **Today** and **Submit** you see one light.

| Colour | Meaning | What you do |
|---|---|---|
| Green: "Everything is running" | The last run was recent, content is stocked, posts are going out. | Nothing. |
| Amber | Something needs a look soon. Examples: a campaign paused, content running low, a page may be limited, a post failed once. | Read the reason under the light. Most fix themselves. |
| Red | Posting is stuck. Examples: "The Zernio key is missing", "Autopilot hasn't run for 9h", "No posting account is connected", "Nothing posted in the last 24 hours, but clips are waiting". | Follow the button next to it, or see "When something goes wrong" below. |

Chips on clips: **posted** means it is live. **held** means the robot was unsure and kept it back. In the cloud nobody
reviews held clips, so they just wait; ignore them unless you have time.

Dollar amounts on the dashboard are **estimates**, not money in your account. See the next section.

## How you get paid (and why the dashboard cannot say exactly)

- You are paid by Content Rewards, not by this tool. The tool only makes and posts clips.
- A campaign pays per 1,000 views at its own rate. The dashboard multiplies the view count it sees by that rate, minus the
  fee. That is a **guess**. The campaign pays on the views **it** verifies, and it can leave out views it thinks are fake.
- Money is not instant. Based on what we have read: views count for about a **7-day earning period**, then there is a
  **3-day hold**, so a post made today is paid roughly **10 days later**. Treat that as a guide, not a promise. Each
  campaign and Content Rewards can change it.
- Each campaign has a minimum: a post under it earns **$0**, and many pay nothing until a post reaches a view count
  (for example 1,000 or 5,000). Early posts often earn nothing. That is normal.
- A submission can be rejected later (rule broken, bot score too high, same clip posted twice). Then its money can be
  taken back.
- Content Rewards may treat several pages run by one person as **related accounts**. It decides, we cannot see how.
- The rules text of a campaign is only visible after you join it. We have no way to read it for you.
- Payouts come to your Whop balance, then you withdraw. Withdrawal takes a few days or costs a fee for instant.

## Add a campaign

1. **Join** the campaign on Content Rewards (free). Check it still has budget and pays on TikTok.
2. Open its **Rules** tab. Search the page (Ctrl+F on a computer, or the browser's "Find on page" on a phone) for these
   words: **AI**, **automated**, **scheduler**, **third-party**, **native**, **watermark**, **original**, **disclosure**,
   **duplicate**, **one account**. If the rules ban automatic tools or scheduled posting, **do not use it**. Our
   Alpha Futures and Alpha Capital Group are examples we skipped.
3. Send Claude, in one message:
   - the campaign link,
   - the Rules text (copy and paste it, all of it),
   - the brief or footage links (the Google Drive folder with the videos; share it as "anyone with the link"),
   - the logo file link, if the rules want the logo on the video,
   - the exact name the TikTok page must contain, if they say so.
4. Claude adds it. It starts in **standby** or **active** depending on how it ranks. The robot never posts for a campaign
   until the rules have been confirmed to allow tools.

## Add or rename a TikTok page

**The brand-name rule.** Most campaigns want a page with the brand in its name, for example `tradever.clips` for
Tradever. The robot only posts a campaign's clips to pages that have the brand word in the name (capitals, dots and
spaces do not matter). A page without it is left alone for that campaign.

To add a page:
1. Create the TikTok account with the brand word in the name.
2. In Zernio, connect that TikTok account. (Zernio's free plan covers 2 accounts. More may need a paid plan; check
   Zernio's pricing page.)
3. That is all. The next run sees it.

New pages **warm up**: a post or two a day for the first days, then the normal pace. That is on purpose.

To rename: change the name in TikTok, then reconnect the account in Zernio so it shows the new name. If the new name no
longer has the brand word, the robot stops posting to it for that campaign.

## When something goes wrong

**The key expired or was rejected** (red light: "The Zernio key is missing", or an error "Zernio rejected the API key"):
1. In Zernio, make a new API key.
2. On GitHub: repository Settings, Secrets and variables, Actions, edit `ZERNIO_API_KEY`, paste the new key, save.
3. Optional: Actions, `clipper-cloud`, Run workflow, to try straight away. Otherwise the next run uses it.
Never paste a key into a chat or a file in the repo.

**A page looks limited** (amber: "possibly limited"): its posts get few views. Let it rest. The robot slows it down by
itself. Do not post by hand to push it, and do not make more pages to get around it.

**A page needs reconnecting** (amber: "Reconnect @name in Zernio"): open Zernio, reconnect the TikTok login. Done.

**A campaign ended or ran out of money** (amber: "campaign paused"): the robot has already moved on. If a spare campaign
was waiting it is promoted. If you see "join the next campaign", pick one from the dashboard's Leads and use "Add a
campaign" above. Money already earned is still paid.

**Content is running low** (amber): drop more videos into the campaign's Drive folder.

**The robot stopped** (red: "Autopilot hasn't run for Nh"): the chain of runs broke.
1. GitHub: Actions tab, `clipper-cloud`.
2. Open the newest run. Is it red? Tap in and send Claude a screenshot of the last red step.
3. Press **Run workflow**, choose branch `claude/determined-shannon-94kfrp`, press the green button. That restarts it.

**No phone notes**: open the ntfy app and check you subscribed to your topic. The topic is a secret on GitHub
(`NTFY_TOPIC`). Anyone who knows it can read your notes, so never share it.

## What NOT to do

- **Do not buy views, likes, bots or "boosts".** It is against campaign rules, it gets pages banned and unpaid.
- **Do not post the same clip twice**, and do not post a clip the robot made to another page. Most rules ban the same clip
  twice or across accounts.
- **Do not delete TikTok pages** or disconnect them in the middle of a campaign. Posts and earnings are tied to them.
- **Do not delete or rewrite the `clipper-cloud` branch** on GitHub. It is the robot's memory.
- **Do not edit `.github/workflows/clipper-cloud.yml`**. Saving a change restarts the run chain.
- **Do not treat the dashboard link as private.** It is a public web page: anyone who has the link can see your clips,
  your TikTok page names and your estimated earnings. Do not post the link anywhere.
- **Do not switch the robot off and on in a hurry.** Wait for the current run to finish (a few minutes).
- **Do not trust the dollar figures as income.** They are estimates until Content Rewards pays.

## Where things are

- Dashboard: `https://raw.githack.com/demetrades2000-coder/nq-dashboard/clipper-cloud/site/index.html`
- Runs (what the robot is doing now): GitHub, Actions tab, `clipper-cloud`.
- Secrets: GitHub, Settings, Secrets and variables, Actions: `ZERNIO_API_KEY`, `NTFY_TOPIC`.
- Questions: see `FAQ.md`. Engineer notes: `RUNBOOK.md`.
