# Money Clipper

Turns long streams and podcasts from money-space creators (business, trading,
real estate, sales, crypto, mindset) into ready-to-post 9:16 clips for TikTok,
Reels and Shorts. Each clip gets a hook title, word-by-word captions and a
posting caption with hashtags.

```bash
pip install -r requirements.txt        # optional: missing packages auto-install on first run
python clipper.py --selftest           # proves everything works on your machine (about 5 min)

python clipper.py "https://www.youtube.com/watch?v=VIDEO_ID"
python clipper.py "https://www.twitch.tv/videos/123" --section 1:00:00-2:30:00 -n 12
python clipper.py podcast.mp4 --layout crop --max 45
python clipper.py --from-file urls.txt -n 6           # batch: one URL per line
```

The output goes to `clips/<video-title>/`:

| File | What it is |
|---|---|
| `clip_01_<hook>.mp4` ... | 1080x1920, 30 fps, H.264, -14 LUFS audio, ready to upload |
| `CLIPS.md` | Ranked list with the on-screen title, post caption and hashtags, source timestamp link and transcript |
| `clips.json` | The same data, machine-readable |

Only ffmpeg must be installed (`winget install ffmpeg`, `brew install ffmpeg`
or `sudo apt install ffmpeg`). If it's missing, the clipper fetches a portable
ffmpeg through `imageio-ffmpeg`.

## How it picks clips

1. **Transcript.** The clipper tries these sources in order: uploaded human
   subtitles, then local Whisper (`faster-whisper`, with word timestamps and
   VAD), then `openai-whisper`, then the platform's auto-captions. If every
   source fails, it clips on audio energy alone. Pass `--fast` to use
   auto-captions before Whisper, or `--transcript file.srt` to use your own.
2. **Candidates.** Every window of 20-55 seconds that starts and ends on a
   sentence boundary, so clips never cut mid-word.
3. **Score (0-100).**

   | Signal | Weight | What it checks |
   |---|---|---|
   | Hook | 24% | The first 4 seconds: "most people", "the biggest mistake", "I went from", a question, a dollar figure |
   | Money density | 20% | Revenue, cashflow, clients, real estate, $40k and similar terms |
   | Audio energy | 12% | Loudness spikes from laughing, yelling or hype |
   | Specific numbers | 10% | Concrete figures in the clip |
   | Emotion/controversy | 10% | Words like broke, scam, mistake, truth |
   | Payoff | 10% | The clip ends on a complete sentence |
   | Speaking pace | 7% | Speech rate close to normal conversation |
   | Length fit | 7% | Duration near the middle of the target range |

   Clips that open on filler ("and", "um", "like") or carry a lot of dead air
   lose points.
4. **Optional AI pass.** With `ANTHROPIC_API_KEY` set, Claude re-ranks the top
   candidates for standalone viral potential and writes the hook title,
   caption and hashtags. Its score is blended 60/40 with the heuristic score.
   If the call fails for any reason, the clipper keeps the heuristic scores.
5. **Picks.** It takes the top N clips that don't overlap.

## How it edits clips

- **Jump cuts:** silences longer than about 0.45 seconds are removed, which keeps the pace tight.
- **Reframe:**
  - `auto` (default): a face-tracked 9:16 crop when one speaker fills the frame.
  - `blur`: the full frame over a blurred copy of itself. Used for two-person
    wide shots and screen-shares; nobody gets cropped out.
  - `fit`: for sources that are already vertical.
- **Captions:** 1-3 words at a time in heavy uppercase. The spoken word turns
  yellow and pops; money words and numbers are green. Captions sit above the
  TikTok and Reels UI zone.
- **Hook title:** a white box at the top that tells a cold viewer why to keep
  watching.
- **Audio:** loudness-normalized to -14 LUFS, the level TikTok, Reels and
  Shorts target.

Every render has fallbacks. If the full edit fails, the clipper retries
without jump cuts, then without loudness normalization, then without captions,
then as a plain letterbox. A run only reports a clip as failed after every
fallback has failed. Downloads retry, update `yt-dlp` automatically, and fall
back to simpler formats. One bad URL in a batch doesn't stop the rest.

## The money playbook (research summary)

- **Length:** 15-60 seconds. Build each clip around one question, one tension
  spike or one sharp opinion.
- **The first 3 seconds decide everything.** If half the viewers are gone by
  second 3, the clip is dead. Healthy clips keep about 70-80% at that mark.
  Clips cut from long episodes usually need a new opening, because context
  from earlier in the episode doesn't reach a cold viewer. The clipper weights
  hook strength highest and adds a title bar for that reason.
- **Captions are mandatory.** Many people scroll with the sound off, and
  animated, word-synced captions hold attention. Break captions at natural
  speech pauses, not at a fixed character count. The clipper does this.
- **Format:** 9:16, with active-speaker framing.
- **Cadence:** post consistently and spread clips out instead of dumping them
  all at once. Run several creators' clips across a few accounts and double
  down on whichever creator and topic pull views.
- **Rights:** only clip creators who allow it. Many big money-space creators
  run official clipping programs or pay-per-view campaigns (for example on
  Whop "Content Rewards" and similar platforms). That's where the paid work
  is, and it keeps your accounts safe from copyright strikes. Read each
  campaign's rules on watermarks, captions and length before posting.

Sources:
[Klap: shorts from podcasts](https://klap.app/blog/create-shorts-from-podcast) ·
[Captions: hooking repurposed clips](https://captions.ai/help/guides/creators/hook-repurposed-clip) ·
[Bytecap: 60-min podcast into 10 shorts (2026)](https://www.bytecap.io/blog/how-to-turn-podcast-into-shorts-reels-tiktoks-2026) ·
[Swell AI: how to clip a podcast segment](https://www.swellai.com/blog/how-to-clip-a-podcast-segment) ·
[Soundstripe: clipping podcasts for Reels](https://www.soundstripe.com/blogs/how-to-clip-a-podcast) ·
[Quso: podcast content ideas 2026](https://quso.ai/blog/podcast-content-ideas)

## Useful flags

| Flag | Use it for |
|---|---|
| `-n 12` | More clips per video |
| `--min 15 --max 35` | Shorter, punchier clips |
| `--section 2:00:00-3:00:00` | Only download one hour of a 6-hour stream |
| `--model medium` | Better transcript accuracy (slower); `tiny` or `base` for speed |
| `--cookies-from-browser chrome` | Videos that need a login or hit YouTube bot checks |
| `--highlight "#00FF88"` | Change the active-word caption color |
| `--no-jumpcuts`, `--no-title` | Turn off those edits |
| `--keep-ass` | Keep the caption files so you can edit wording in Aegisub |
| `--dry-run` | Rank the moments and write `CLIPS.md` without rendering |
| `CLIPPER_DEBUG=1` | Print full tracebacks |
