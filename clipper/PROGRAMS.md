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

## TikTok pick: Alpha Futures (checked 2026-10-21)

These are the money-niche campaigns paying on TikTok in the ClippingAlpha
snapshot of 18 Oct 2026, where the median TikTok campaign pays $1 per 1,000
views ([TikTok board](https://clippingalpha.com/platforms/tiktok)).

| Campaign | Rate | Why it is or isn't the pick |
|---|---|---|
| **[Alpha Futures](https://contentrewards.com/c/campaigns/2c65001c-d6a8-4b14-9ba6-52400794b085)** (Click Culture, Content Rewards) | **$2 per 1K** on TikTok, Instagram and YouTube; max $500 per clip | **Pick.** Twice the median rate, the brand supplies the footage, and the rules are written down. About $3.8K of budget was left on 7 Oct ([ClippingAlpha brief](https://clippingalpha.com/campaigns/alpha-futures/clipping)). |
| FundingPips | $15 per 1K (listed) | Highest rate on the board, but I found no brief, cap or rules anywhere. Worth checking yourself; not something to build on blind. |
| Rick Roth | $3 per 1K | Political clips, not the money niche, and application-only ([ClipLaunch](https://whop.com/cliplaunch/)). |
| Ivan Soto / MoonPay | $1.50 per 1K | Budget may be nearly used up (see below). |
| Alfe (Reach) | $1.50 per 1K, $250 cap | Open at last count; needs dedicated fan pages. |
| TradeAxis, Flowik | $1.50 per 1K | Budget exhausted. |

**Alpha Futures rules** (from its ClippingAlpha brief and the
[hub page](https://content.clipalphafutures.com/)):
- **Footage:** official Alpha Futures footage only; English; at least 7
  seconds.
- **Logo:** visible on the black section for the whole clip. The brief
  renders a letterboxed layout with the logo in the top bar.
- **Caption:** tag the official account in every caption.
- **Posts:** keep them live 30 days or more; at least 2% engagement with
  likes visible. The tracker warns when a post falls under 2%.
- **Account:** used only for this campaign, with "Alpha Futures" in its name
  and the official logo as the profile picture. The brief routes uploads to
  a separate `alphafutures` account.
- **Payout:** minimum $2, 10% board fee, paid within 10 days.

Two similar-looking domains exist (clipalphafutures.com and
content.clipalphafutures.com). Use only the links on the Content Rewards
campaign page.

On compliance: Alpha Futures sells trading evaluations. The brief bans
"guaranteed", "risk free", "can't lose", "financial advice" and "get rich",
and every caption and clip carries `#ad`.

## Campaigns you found (checked 2026-10-21)

All three are **Clip Farm** campaigns listed on Content Rewards (Whop's
clipping marketplace). Clip Farm says it aggregates Content Rewards campaigns;
accounts, submissions and payouts happen on Content Rewards. Each has a
brief in `campaigns/` with `TODO`s that you fill in from the live page.

| Campaign | What I could confirm | What I couldn't | Platforms |
|---|---|---|---|
| **Higgsfield / 20VC** | [Listing](https://contentrewards.com/discover/1ccf8238-ca36-4ff3-a6d1-76956d865ada): clip Alex Mashrabov's 20VC podcast appearance. $1.00 per 1,000 views, $1 minimum and $350 maximum payout per clip. Budget about $4K (snapshots range from $3.4K to $5K left). | The exact source video URL and the full rules | **Instagram and YouTube only, not TikTok** |
| **Ivan Soto / MoonPay** | $1.50 per 1,000 views, 18+, listed on an [aggregator](https://clippingalpha.com/platforms/tiktok) and on [Clip Farm's page](https://contentrewards.com/clip-farm) | Budget left: snapshots disagree, and one shows **$33 of $8K**. It may be nearly used up; check before you invest time. The stricter content rules aren't captured. | TikTok, Instagram, YouTube |
| **PBInvesting** | $1.25 per 1,000 views, a $5K "dedicated account" campaign ([aggregator listing](https://clippingalpha.com/campaigns)) | The 10,000-view minimum and the AI-content ban. Neither appeared in any source I found. | TikTok, Instagram, YouTube |

About the "no AI-generated content" rule on PBInvesting:
- The tool doesn't generate synthetic voices, faces or footage.
- It does use speech recognition for captions and automatic cutting and
  cropping. Whether that counts as "AI-generated" is the campaign's call, so
  ask before posting.
- The brief sets `ai_text_allowed: false`, which turns off Claude ranking and
  titles for this campaign.

"Dedicated account" campaigns usually want clips posted on an account used
only for that creator. Read the rules before you post them on a shared
account.

Other sources:
[Foundry: typical rate and the 10% fee](https://www.builtbyfoundry.io/blog/what-is-clipping-1-dollar-per-1000-views-50-campaigns) ·
[getclippay listings](https://getclippay.com/) ·
[ClippingAlpha podcast campaigns](https://clippingalpha.com/niches/podcast) ·
[Clip Farm: get paid to clip](https://www.clip-farm.com/blog/get-paid-to-clip) ·
[Content Rewards creator terms](https://contentrewards.com/terms)

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

## What's automated and what isn't

- **YouTube uploads are automated** in autopilot mode, through the official
  Data API with your own OAuth client.
  - The [videos.insert reference](https://developers.google.com/youtube/v3/docs/videos/insert)
    says uploads from unverified projects are no longer restricted to
    private. A [2020 revision-history entry](https://developers.google.com/youtube/data/revision_history)
    says they are, and [YouTube Help](https://support.google.com/youtube/answer/7300965?hl=en)
    describes the lock. The code reads back the privacy YouTube applied and
    reports a lock. If you hit it, the fix is the
    [API audit](https://developers.google.com/youtube/data/guides/quota_and_compliance_audits).
  - Uploads have their own quota bucket, 100 per day by default. Autopilot
    caps itself lower (3 per day by default).
- **Fully automatic posting goes through Upload-Post.**
  [Upload-Post](https://www.upload-post.com/platforms/tiktok/) is a hosted
  posting API that says you don't need your own TikTok app review.
  - Its [upload API](https://docs.upload-post.com/api/upload-video/) takes
    `post_mode=DIRECT_POST` and `privacy_level=PUBLIC_TO_EVERYONE` for TikTok,
    and also posts Instagram Reels and YouTube.
  - [Pricing per its own pages](https://www.upload-post.com/pricing-comparison/):
    free is 10 uploads a month, and one page says TikTok isn't on the free
    plan; Basic is $16–24 a month, unlimited.
  - None of the sources I found states whether its TikTok app has passed
    TikTok's audit. The code reads back the visibility and reports a post
    that came out private.
  - Alternatives: [Ayrshare](https://www.upload-post.com/ayrshare-pricing/)
    from $149 a month, and [Zernio (formerly Late)](https://zernio.com/alternatives/ayrshare).
- **Without Upload-Post, TikTok is automated up to an inbox draft.** Its documentation says
  unaudited posting clients can post only as private (`SELF_ONLY`) and
  allow at most 5 users in 24 hours, and sandbox mode can't post public
  videos.
  - The [Upload API](https://developers.tiktok.com/docs/en/content-posting-api-reference-upload-video)
    sends the video to your TikTok inbox as a draft; you tap Post in the
    app.
  - [Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post)
    needs TikTok's app audit (a demo video and verified URLs), and TikTok
    expects audited apps to serve a wide audience, not one person.
  - Media upload follows the
    [media transfer guide](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide);
    login uses [Login Kit for Desktop](https://developers.tiktok.com/doc/login-kit-desktop/)
    with PKCE and a localhost redirect.
- **Whop submission isn't automated.** There is no API for Content Rewards
  submissions. The only submission API, a beta for
  [bounty submissions](https://docs.whop.com/api-reference/beta/bounty-submissions/submit-bounty-submission),
  rejects account API keys. The autopilot report lists the links to paste
  instead.

## Your income, honestly

Payout comes from verified views, at a rate the campaign sets, minus fees and
minimum thresholds. Most clips get few views. Some campaigns run out of budget
or are crowded with other clippers. The tracker shows real view counts and an
estimate. It isn't income, and nothing in this tool predicts earnings.
