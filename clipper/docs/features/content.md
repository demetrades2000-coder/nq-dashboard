# Content engine: what raises watch time (clips, covers, captions, slideshows)

Everything here is offline, deterministic and free (no AI calls, no network except media downloads). "Measured" below
means a test or a before/after number on synthetic or fixture data in this repo. **No view-count effect has been
measured**: every "expected effect" is a heuristic from short-form editing practice until the tracker has data
(`scoring.fit_weights` is the hook for learning from it).

New modules: `vocab.py` (shared words), `hooks.py`, `scoring.py`, `audiofx.py`, `captions.py`, `hygiene.py`,
`covers.py`, `broll.py`. Tests: `tests/test_content_hooks.py`, `test_content_render.py`, `test_content_posts.py`,
`test_content_slides.py` (+ `test_slideshow.py`).

## Optional `style` block in a campaign JSON (all keys optional)

```json
"style": {"highlight": "#FFE600", "money": "#39FF14", "negation": "#FF4D4D", "hook_bg": "#000000", "bold": true,
          "font": "Inter Display", "font_size": 84, "mask_profanity": true, "cold_open": "trim",
          "hook_seconds": 2.5, "brand_color": "#16DE4A", "speaker": "Layth", "always_tags": ["#tradever"],
          "logo_safe": true, "lifestyle": false, "broll_hooks": ["Process over prediction."]}
```
Without a block the look is today's (on_screen.highlight etc.). `cold_open`: `off` | `trim` (default) | `teaser`.

## The list

| # | What | Where | Test | Expected effect (type) |
|---|------|-------|------|------------------------|
| 1 | Lead-in trim: host chatter / "okay so" at the very start is dropped (keeps >= 8 s) | `hooks.lead_in_trim`, `clipper.prepare_clip` | `test_content_hooks.OpenerTests`, `RenderTests.test_cold_open...` | Faster first second, fewer swipe-aways (heuristic) |
| 2 | Teaser cold open (opt-in `cold_open: teaser`): punchiest late complete sentence plays first, then the clip from its start; sentence is heard twice; never mid-word | `hooks.cold_open_plan`, `keep_intervals` | `OpenerTests.test_cold_open_*` | Stronger first 3 s on clips whose best line is late (heuristic; off by default because it repeats a line) |
| 3 | On-screen hook title, first 2.5 s only, big (68-112 px), boxed, pop-in, numbers/negations in accent colour, distinct from rolling captions | `clipper.write_ass` Hook style, `hook_layout` | `RenderTests.test_render_hygiene_hook_and_captions` | Clear promise in the 1-3 s window the brief asks for (heuristic) |
| 4 | Hook is built only from words the speaker said (verbatim, contiguous, spelling fixes applied), finished thought, never a dangling clause, no detached number fragments, income claims shown in quotes | `hooks.make_hook`, `grounded`, `_complete` | `HookTests` | Safety: cannot invent facts (measured by test); a weak first sentence is the fallback so every clip opens with a title |
| 5 | Filler sounds (um / uh) cut from audio and captions | `hooks.drop_fillers`, `keep_intervals` | `JumpCutTests.test_filler_sounds...` | Tighter delivery (heuristic) |
| 6 | Jump-cut tuning: pads 0.06/0.14 s, pause ladder 0.45-1.2 s, no silence over 1.2 s left in, 12 ms audio fades at each cut (no clicks), `pacing_report` | `keep_intervals`, `build_graph`, `pacing_report` | `JumpCutTests.test_no_silence...` | Fast natural edits, no dead space (measured: max silence <= 1.2 s on test clip) |
| 7 | Punch-in (7% crop) on every second cut so jump cuts feel like a 2nd camera | `build_graph(punch=)`; `--no-punch` | render test | Less "same shot jumping" (heuristic) |
| 8 | Speech clarity chain: high-pass 70 Hz, light denoise, 2:1 compressor, +2 dB presence, then loudnorm -14 LUFS; filters missing from the ffmpeg build are skipped | `audiofx.clarity_chain`, `clipper.has_filter`; `--no-clarity` | `AudioChecks.test_clarity_chain...` | Clearer speech on phone speakers (heuristic) |
| 9 | Music / loud-noise-under-speech check (level between words vs of words); score penalty + reviewer note | `audiofx.music_suspect`, `score_clip` | `AudioChecks.test_music_suspect...` | Avoids clips where TikTok may mute or flag audio (heuristic: a laugh can trip it) |
| 10 | Karaoke captions: active word in brand colour, money/numbers green, negations red | `write_ass` | `test_style_block...` | Emphasis on the words that carry meaning (heuristic) |
| 11 | TikTok safe areas: logo + #ad under the top 220 px, hook below them, captions >= 520 px above the bottom, 140 px side margins; with `style.logo_safe: true` the logo also moves to y=232 / above the bottom 420 px (default keeps the old y=40 because tests/test_extras.py samples the logo there; recommended for Tradever); creator tag moved out of the bottom UI | `SAFE_*`, `render`, `write_ass` | `test_render_hygiene...`, `test_logo_sits_in_the_safe_area` | Nothing hidden by the TikTok UI (measured on frames) |
| 12 | Caption font sized by length, max 2 lines, never wider than the safe width | `caption_size`, `caption_chunks` | `test_caption_sizing...` | Readability (measured: widths) |
| 13 | Profanity: masked in captions (`b*******`) and the word is muted in the audio; `mask_profanity:false` turns it off. Campaign-banned windows are still skipped upstream | `captions.mask_word`, `build_graph(mutes=)` | `test_profanity_is_muted...`, `test_mask_word` | Keeps clips usable and platform-safe (measured: -50 dB in the muted window) |
| 14 | Campaign `style` block (colours, weight, size, cold open, hook seconds, brand colour) | `captions.style_for` | `test_style_block...` | Consistent brand look |
| 15 | Bundled Inter Display font via `fontsdir`, so Linux CI no longer falls back to DejaVu | `pick_font`, `fonts_arg` | render tests | Same look on every runner |
| 16 | Post captions by angle: question, bold claim, "Part N |", curiosity gap, number, contrast; neutral openers; banned phrases / result promises never produced; income claims quoted | `captions.post_caption(_info)`; wired through `make_copy` | `PostCaptionTests` | Human-sounding, varied captions (heuristic) |
| 17 | Hashtag rotation: required + brand tag always, 3-5 total, rotating the pool, never the same set as the last 3 posts | `captions.pick_hashtags` | `test_hashtag_pool_rotation...`, `test_consecutive_posts...` | Less repetition across an account (measured) |
| 18 | Cover timestamp: best frame by sharpness, exposure, face (Haar, if cv2), mouth-region stillness; skips the title window | `covers.best_cover_ms` | `CoverTests` | Better thumbnails (heuristic) |
| 19 | Branded cover image (frame, gradient, hook title, logo) | `covers.cover_image` | `test_cover_image...` | Profile-grid consistency (heuristic) |
| 20 | Clip scoring v2: 13 features (hook, money, numbers, emotion, payoff, energy, pace, 18-40 s sweet spot, setup->payoff arc, contrast, opinion, direct address, no fillers) minus named penalties (mid-thought start, filler start, host question, rambling, other firm, income claim, swearing, dead air, music) | `scoring.py`, `score_clip` | `ScoringTests` | Better picks (heuristic weights, documented in `scoring.WEIGHTS` / `PENALTY_POINTS`) |
| 21 | Data-driven weights: `scoring_weights.json` / `CLIPPER_WEIGHTS` override; `fit_weights` blends the prior with rank correlation against real views (needs hundreds of posts to matter) | `scoring.load_weights/fit_weights` | `test_weights_file_override_and_fit` | Self-tuning once tracker data exists (measured on synthetic data only) |
| 22 | Diverse selection: topic penalty, repeated-speech and overlap skipped; `pick` now uses it | `scoring.select`, `clipper.pick/select` | `test_select_is_diverse...` | Not five clips on one topic (measured on synthetic) |
| 23 | Output hygiene: H.264 high, AAC 128k, 30 fps, 1080x1920, faststart, metadata stripped, no x264 info SEI, maxrate for <= 8 MB per 30 s, one-shot shrink if over | `hygiene.encode_args/shrink_to_cap` | `HygieneTests` | State-branch size, upload compatibility (measured) |
| 24 | Post-render validation: ffprobe checks, black frames, silent audio, > 1.2 s silences (warning), under 7 s; hard failures delete the file so the clip is reported as failed | `hygiene.validate_output`, `render` | `test_good_file_passes_and_bad_ones_fail` | No broken posts (measured) |
| 25 | Whisper plan: auto model/beam to fit ~10 min (33 min podcast -> small beam 1 est. 8 min), VAD tuned, no previous-text conditioning, all cores; `--whisper-quality best|fast`. Speeds are ESTIMATES (override `CLIPPER_WHISPER_SPEED`), not measured on the runner | `clipper.whisper_plan` | `test_whisper_plan_fits_budget` | Runtime budget (estimate) |
| 26 | Parallel renders (2 workers x 2 x264 threads on 4 cores) | `clipper.render_parallel`; CLI uses it | `test_parallel_render` | ~1.3-1.5x faster batches (estimate) |
| 27 | Slideshow layouts: big-number hero, fact card, myth-vs-reality split, numbered list; auto-assigned, text never changed | `slideshow._layout_*`, `enhance_deck` | `LayoutTests` | Visual variety per swipe (heuristic) |
| 28 | Two new built-in decks using split / list / fact layouts | `BUILTIN_DECKS` | `test_new_builtin_decks...` | More rule-breakdown content |
| 29 | Balanced text wrap (no orphan last word), smaller minimum font so long text fits | `slideshow.balance/fit` | `test_balance_removes_orphans` | Cleaner type (measured) |
| 30 | Alt text per slide in every deck (`deck["alt"]`) | `slideshow.alt_texts` | `test_alt_text_per_slide` | Accessibility / TikTok alt text |
| 31 | Mined-deck ranking by hookiness, theme cap (4th deck on one theme moves back, none dropped) | `hookiness`, `mine_decks` | `test_mined_ranking...` | Better first decks (heuristic) |
| 32 | CEO-quote portrait: round crop from footage, only for `ceo_quote` decks and only when a clean face frame exists | `portrait_from_video`, `attach_portrait` | `test_portrait_only...` | Face = trust (heuristic) |
| 33 | B-roll clips: only if `style.lifestyle`; fast 2.6 s beats, alternate 1.12x framing, 1.15x speed on every 3rd beat, safe hook bank, logo + #ad, no source audio | `broll.broll_clip` | `BrollTests` | New content type (heuristic) |

Not done on purpose: fake engagement, evasion fingerprints, copyrighted music (add a trending sound in the TikTok app),
watermark tricks. Loudnorm is single pass (fine for short speech, not broadcast-exact).

## One-liners for pipeline.py (all optional; everything above except cover/post history already flows through
`cl.score_clip`, `cl.make_copy`, `cl.render`)

- Diverse picking instead of the local loop: `chosen = cl.select(fresh, args.clips)` (keeps the same-run speech check).
- Account history for varied captions: `cl.make_copy(k, meta, c, history=recent_posts)` where `recent_posts` =
  `[{"caption":..., "hashtags":[...], "angle":..., "source": source_key}, ...]` oldest first; store `k.angle`.
- Final text anytime: `import captions; captions.post_caption(k, c, history)`.
- Cover for Zernio: `import covers; ms, _ = covers.best_cover_ms(path)` -> `video_cover_timestamp_ms=ms`;
  image: `covers.cover_image(path, k.hook["text"] if k.hook else k.title, c)`.
- Validation result after render: `k.hygiene` (dict: ok/problems/warnings/stats), `k.pacing`, `k.plan_notes`, `k.hook`.
- Parallel batch: `paths = cl.render_parallel(video, info, chosen, outdir, font, args)`.
- Slideshow: unchanged calls; decks now carry `deck["alt"]`; optional `ss.attach_portrait(deck, ss.portrait_from_video(video, png))`.
- B-roll: `import broll; broll.broll_clip(src, out, campaign)` (returns None unless the campaign sets `style.lifestyle`).
