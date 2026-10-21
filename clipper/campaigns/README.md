# Campaign briefs

Make one JSON file per campaign you join. Start by copying `_template.json`,
then fill it in from the campaign page:

| Field | From the campaign page |
|---|---|
| `cpm` | Rate per 1,000 views |
| `fee_pct` | The marketplace's cut of your payout. Whop guides report 10%; check the current terms. |
| `max_payout_per_clip`, `min_payout` | Per-clip cap and minimum, if the campaign sets them |
| `platforms` | Platforms where views count |
| `sources` | Where the footage lives: a channel `/videos` URL, VOD links, or downloaded files |
| `clip.min` / `clip.max` | Required clip length |
| `caption.required_hashtags`, `required_mentions`, `required_text` | Exactly what the brief says the post must include |
| `on_screen.watermark` | The creator tag the brief wants burned into the video |
| `banned_phrases` | Claims the brief prohibits. Common finance scam phrases ("guaranteed returns", "risk free", ...) are always blocked as well. |

Then run:

    python clipper.py --campaign campaigns/my-campaign.json

The clipper pulls the newest uploads from `sources`, skips videos already
clipped for this campaign, and drops moments that contain banned claims. Each
clip is checked against the rules (PASS or FIX in `CLIPS.md`). You also get
captions ready to paste for every platform, plus the net payout at 10k, 100k
and 1M views.
