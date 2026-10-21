# Paid clipping programs: research notes

**Checked: 2026-10-21.** Direct page fetches were blocked from the build
environment. Every point below therefore comes from search-engine excerpts of
the programs' own pages, linked inline, plus third-party guides where noted.
Before relying on any number, open the official page and re-check it. Terms
and rates change, and each campaign sets its own.

**A creator does not pay clippers just because they're big.** You're paid only
for clips that belong to a specific campaign you joined, follow that campaign's
rules, and pass its review. The pipeline won't import a source until the
campaign's permission is recorded in its brief (see `campaigns/_template.json`).

## Comparison

| | Whop Content Rewards | Vyro | Clipping.net |
|---|---|---|---|
| **Official terms** | [Creator ToS (Content Rewards Inc.)](https://b4e0vdqv6zgqeqj4pfgm.apps.whop.com/terms), [older Whop-hosted ToS](https://whop.com/content-rewards-terms-of-service/), [FTC page](https://b4e0vdqv6zgqeqj4pfgm.apps.whop.com/ftc-compliance), [Whop docs](https://docs.whop.com/memberships-and-access/third-party-apps/content-rewards) | [Clipper terms](https://vyro.com/clipper-terms), [help: payments](https://vyro.com/help/earnings-and-payments), [eligible views](https://vyro.com/help/earnings-and-payments/what-are-eligible-views), [withdrawals](https://vyro.com/help/earnings-and-payments/how-can-i-withdraw-my-earnings) | [Clipper terms & conditions](https://clipping.net/policies/clipper-terms-and-conditions) (dated May 27, 2026) |
| **Eligibility** | 18+. A Whop account in good standing (third-party guide). | 18+, legal resident of a territory Vyro serves, at least one verified social account, and onboarding with the payment provider. | Not captured in the excerpts. Read the terms. |
| **Submitting a clip** | Post the clip, then submit its public URL (or a draft where required). A bot score triages it, then the brand reviews it. Per a brand-side guide, unanswered submissions that the review AI rated legitimate auto-approve after 48 h. | Make a clip from the campaign's long-form video, post it, then submit it on Vyro for tracking. | Campaign-based. Earnings are tracked per view and per platform. |
| **How views are verified** | Through the platforms' official APIs (connected accounts are read-only; Instagram requires a Professional account). Normally tracked for 30 days. Bot or automated views are excluded at the program's discretion. | Every post is reviewed for bot views. "Eligible views" can differ from the platform's own counter. Flagged accounts are banned. | Dashboard numbers are estimates until the sponsor approves distribution. |
| **Payout terms** | Rate per 1,000 views (CPM), per post, or pool, set by each campaign. CPM rounds: 7-day earning period, then a 3-day hold. A clipper fee of about 10% is reported by third-party guides only. Unsettled payouts can be reversed if the submission is later rejected. | Campaign CPM. A post must reach 5,000 views to start earning. Per-clip cap: help pages conflict ($1,000, or 1M eligible views). Payouts are prorated if the campaign budget runs out. Claw-backs are possible for rule violations. | Flat per-view, pot-split or bounty, depending on the campaign. Formula: views × rate / 100,000. Each post needs 1,000+ views. Campaigns usually need about 25,000 total views before anyone is eligible. Paid in batches when a campaign's cycle ends, with no on-demand cash-out. |
| **Getting paid** | Credited to your Whop balance, then withdrawn from Whop Finance: about 3–5 business days, or instant for a fee. | Stripe or PayPal depending on country. $10 minimum, at most one withdrawal per 7 days, at least 72 h processing. | Batch payout at the end of each cycle. Method not captured in the excerpts. |
| **Content permission and license** | Joining a campaign is your permission to clip its content, within the campaign's rules. An approved submission gives Content Rewards and the brand a perpetual, worldwide, royalty-free license, including for paid ads. You warrant you've cleared any third-party material, such as music. You're responsible for FTC disclosure, including a clear disclosure at the start of the video. | You give Vyro and its clients a perpetual, irrevocable license, which the terms say includes training AI. | Read the terms before joining. |
| **Platforms** | Set per campaign: TikTok, Instagram, YouTube, X, sometimes Facebook. | TikTok, Instagram Reels, YouTube Shorts, X (third-party summaries). | Per campaign. |

Other sources used:
[Whop blog: Content Rewards](https://whop.com/blog/whop-content-rewards/) ·
[Whop Clips blog](https://whop.com/blog/whop-clips/) ·
[Clipspeed guide](https://www.clipspeed.ai/blog/whop-content-rewards-clipping-guide.html) ·
[Shopiator](https://shopiator.com/blog/whop-content-reward-campaigns) ·
[Sprites](https://www.sprites.ai/blog/whop-clipping-guide) ·
[Trezalabs](https://www.trezalabs.com/blog/how-to-clip-for-whop-content-rewards-with-ai) ·
[FindClout: complaints](https://findclout.com/blog/content-rewards-complaints) (a competitor, so weigh it accordingly) ·
[Influencer Marketing Hub: Vyro launch](https://influencermarketinghub.com/mrbeast-launches-vyro/) ·
[Darebay: Vyro review](https://darebay.com/en/earnings/vyro-review) ·
[TikTok Content Posting API: Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post)

## Recommendation for version 1

**Program: Whop Content Rewards. Platform: YouTube Shorts.**

Why this program:
- It has the most complete published clipper terms of the three.
- It verifies views through the platforms' official APIs.
- The only eligibility bar is 18+ and a Whop account.
- Rates, rules and allowed platforms are listed on each campaign page. That
  is exactly what the campaign brief file records.

Why this platform:
- All three programs accept it.
- Unlike Instagram, it doesn't need a Professional account to connect.
- View counts are public, so the tracker can read them.

TikTok is the obvious second platform once v1 works.

**How a clip moves through the system:**

1. **Join a campaign.** Find a money-niche campaign on Whop's Content Rewards
   discover pages and read its rules. Copy the rules, rate and allowed source
   into a campaign brief, and set `verified_on` to today. The pipeline refuses
   a brief that has no permission block or that is more than 30 days old.
2. **Import, run and review.** The pipeline downloads only allowed sources,
   transcribes them locally, ranks moments, renders vertical clips with
   captions and puts them in a review queue. You approve, reject or correct
   captions on a local page. Approved clips are copied to
   `ready/<campaign>/` with a caption file for each platform.
3. **Post it yourself (manual).** Upload the approved MP4 to YouTube Shorts
   from your own channel. Paste the caption. Tick YouTube's
   "includes paid promotion" box if the campaign or FTC guidance calls for it.
4. **Submit it (manual).** Paste the Shorts URL into the campaign's submit
   form on Whop. Then run `pipeline.py posted <clip-id> <url>` so the tracker
   knows about it.
5. **Verification (done by Whop).** Whop's bot screening and the brand's
   review approve or reject the submission. Views come from YouTube's API and
   are tracked for about 30 days.
6. **Payment (done by Whop).** CPM earnings settle after the earning period
   and hold. You then withdraw from Whop Finance.
   `pipeline.py earnings refresh` and `pipeline.py earnings report` show your
   own estimate. Whop's numbers are the ones that count.

## Why publishing isn't automated

- **You approve everything.** You asked to approve every publish, so the
  pipeline stops at "ready to post".
- **Automating it would be hard anyway.** YouTube's API upload for a personal
  channel needs a Google Cloud project with OAuth consent. Uploads from
  unverified projects are, as far as I know, locked to private until Google
  audits the project; I didn't re-check this today.
- **TikTok has the same restriction**, per its documentation: unaudited
  posting clients can post only as private (`SELF_ONLY`).
- **Whop has no clipper submission API** that I could find.

## Your income, honestly

Payout comes from verified views, at a rate the campaign sets, minus fees and
minimum thresholds. Most clips get few views. Some campaigns run out of budget
or are crowded with other clippers. The tracker shows real view counts and an
estimate. It isn't income, and nothing in this tool predicts earnings.
