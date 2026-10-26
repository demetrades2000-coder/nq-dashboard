# Planner

A white, color-coded calendar, day planner and project tracker. It syncs between your phone and computer, and your bots can add events to it.

## Projects

The **Projects** tab (shortcut `P`) has a card for each project. It starts with Kalshi bot, NQ bot, Jarvis, Clipper and Portfolio. Each card shows:

- Status: Active, Blocked, Paused or Live.
- The next milestone and its due date. The milestone also appears on the calendar in the project's color.
- Progress, counted from the project's tasks.
- Open tasks, with priority and an optional due date.
- Project-tagged events coming up in the next 30 days.
- Notes and a link.

To tag something with a project:

- In any task box, write `#name`: `#kalshi fix order sizing`, `#nq review fills`, `#clip`, `#port`.
- Pick a project in the event editor.
- Have a bot pass `project=` (see below).

A task with a due date also shows in that day's plan.

- **App (this folder):** a static site with no data in it. It belongs in its own repo, `planner` (public, served by GitHub Pages), so the dashboard bot's publish can never delete it.
- **Data:** a private repo, `planner-data`.
  - `planner.json`: your events, tasks and event types. The app writes this file.
  - `bots/<bot>.json`: one file per bot. Each bot writes only its own file, so a bot can't change or erase your events.
  - Every save is a commit, so the repo history is a full backup you can roll back.

## One-time setup

1. **Create two repos on GitHub.**
   - `planner`: public, empty.
   - `planner-data`: **private**, empty.

   Give the Claude GitHub app access to both repos.
2. **Put this folder in `planner`.** Copy it to the repo root, then turn on Pages: Settings → Pages → Deploy from a branch → `main` / root. The app is then at `https://demetrades2000-coder.github.io/planner/`.
3. **Make a sync key.** Go to GitHub → Settings → Developer settings → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
   - Repository access: *Only select repositories* → `planner-data`.
   - Permissions: *Contents* → **Read and write**.
   - Expiration: the longest available.
4. **On your computer,** open the app, then Connect (bottom of the sidebar). Paste the key.
5. **On your phone,** go to the computer and press **Link a device**. Open that link on the phone, then Share → Add to Home Screen. The link carries the key, so keep it private.

## Sync behavior

- The app syncs when it opens, about a second after each change, and every minute while it's on screen.
- Offline changes stay on the device and sync once you're back online.
- If the phone and computer edit at the same time, each event and task keeps its newest version. Deletes carry over to the other device.
- Bot events appear in their type's color with the bot's name. They're read-only in the app. **Dismiss** hides one on every device.

## Bots

`bot/planner_bot.py` uses only the Python standard library. Copy it next to any bot and set these environment variables:

```
PLANNER_TOKEN=github_pat_...                      # same kind of key as above (Contents: Read and write on planner-data)
PLANNER_REPO=demetrades2000-coder/planner-data    # this is the default
```

```python
from planner_bot import Planner
cal = Planner("Zlarior")                     # this bot writes bots/zlarior.json
cal.add("NY open", "2026-10-27", type="trading", start="09:30", end="11:30", repeat="weekdays", id="ny-open")
cal.add("Payout window", "2026-11-03", end_date="2026-11-05", type="deadline", id="payout-nov")
cal.remove("payout-nov")
cal.set_events([...])                        # replace all of this bot's events at once
cal.prune(keep_days=30)                      # drop old one-off events
```

```
python planner_bot.py --bot ATLAS add "Eval ends" 2026-11-14 --type deadline --id eval-end
python planner_bot.py --bot ATLAS list
```

- Pass `project="NQ bot"` (or `kalshi`, `jarvis`, `clipper`, `portfolio`) to file an event under a project.
- Give events a stable `id`. Then re-running updates the event instead of adding a duplicate.
- Calls that change nothing make no commit, so it's safe to call on every loop.
- In GitHub Actions, store the key as the repository secret `PLANNER_TOKEN`.
- Event types: `trading` (blue), `bots` (purple), `meetings` (teal), `business` (green), `content` (pink), `deadline` (red), `learning` (amber), `personal` (gray), or the name of any type you add in the app. Anything else shows as Bot ops.
- Times are 24h wall-clock times, exactly as you want them shown.

### Bot file format

You can write the file directly from any language:

```json
{
  "bot": "Zlarior",
  "events": [
    { "id": "ny-open", "title": "NY open", "type": "trading", "date": "2026-10-27", "start": "09:30", "end": "11:30", "repeat": "weekdays", "skip": ["2026-11-26"] },
    { "id": "payout-nov", "title": "Payout window", "type": "deadline", "date": "2026-11-03", "end_date": "2026-11-05", "project": "NQ bot", "notes": "Request before 4pm" }
  ]
}
```

Fields:

- `repeat`: one of `none`, `daily`, `weekdays`, `weekly`, `biweekly`, `monthly`, `yearly`.
- `until`: the last date a repeating event can happen.
- `skip`: dates where a repeating event doesn't happen.
- `project`: a project name or id (optional).
- Leave out `start`/`end` for an all-day event.
