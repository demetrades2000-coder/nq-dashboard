# FAQ

Short answers. "Estimate" means a guess from public numbers; nothing here is a promise of income. For the step-by-step chores see
`OWNER_GUIDE.md`; for the engineering side see `RUNBOOK.md`.

## The basics

**1. What is this?**
A robot that runs on GitHub every 4 hours or so. It cuts clips and slideshows from campaign footage, posts them to your TikTok pages
through Zernio, counts views and keeps a dashboard. You paste the post links into Content Rewards yourself.

**2. Does my PC need to be on?**
No. It runs on GitHub's servers. The PC version (`START.bat`) is optional.

**3. What does it cost?**
Nothing we have to pay for today. GitHub Actions is free on a public repository. Zernio's free plan covers 2 connected accounts.
The ntfy phone notes are free. No AI service is used unless you approve a monthly budget (it is off).
Zernio's plan limits can change; check their pricing page.

**4. How often does it run?**
About every 4 hours (it waits 230 minutes after each run, then runs for a while). The dashboard shows when the last run finished.

**5. When does it post?**
Only between 08:00 and 22:59 New York time (US and UK viewers are awake). It spaces one page's posts at least 7 hours apart.
A run outside that window clips and queues but posts nothing.

**6. How many posts a day?**
Per page: up to 2 videos and 2 slideshows a day, and at most one video and one slideshow per run. TikTok's own ceiling is far higher (15);
we stay well under it on purpose. A brand-new page starts slower (a post or two a day for the first days).

**7. Why did nothing post today?**
Common reasons: it is outside 08:00-22:59 New York; the page posted less than 7 hours ago; the daily cap is reached; the campaign
paused (budget); there is no page with the brand in its name; no clips are ready; the key is missing or rejected. The red or amber
light on Today says which. Run history under Jobs & health shows each run.

**8. Can one clip go on two pages?**
No. Every clip is posted to exactly one page. Most campaigns ban the same clip twice or across accounts.

**9. What is a slideshow?**
A photo carousel (5 to 7 slides with text) built from what the speaker says. Some campaigns, like Tradever, ask for them first.
They go to TikTok only.

**10. What does "held" mean?**
The robot was not sure about a clip (a rule check failed, low score, unsure words, it may need context). It is kept back. In the cloud
nobody reviews held clips, so they simply wait; the rest keeps posting.

**11. What is "standby"?**
A campaign that is set up and allowed, waiting for a free page or its turn. If another campaign runs dry, the best standby one is
promoted.

**12. Does it use Claude or any AI?**
No, not in the cloud runs. Clip choosing, captions and slideshows are rules and scoring. An optional AI ranking exists for the PC
version but stays off without a budget and a key.

## Money and payouts (honest version)

**13. How much will I make?**
Nobody can say. It depends on views, the campaign rate, its minimum, how many other clippers share the budget and whether your posts
are approved. The campaign lead list (LEADS.md) shows guesses; the low end is often $0. Expect early posts to earn little or nothing.

**14. Why does the dashboard show an amount that Content Rewards does not?**
The dashboard multiplies the view count it can see by the campaign's rate, then takes the fee, caps and minimums. That is an
**estimate**. Content Rewards pays on the views **it** verifies, and may leave some out.

**15. When do I get paid?**
From what we have read: a 7-day earning period, then a 3-day hold, so roughly 10 days after a post, then you withdraw from your Whop
balance (a few business days, or instant for a fee). Each campaign can differ and Content Rewards can change it. Check your account.

**16. What is the "bot score"?**
Content Rewards runs an automatic check on each submission, then the brand reviews it. We do not see the score or its rules.
A post can be flagged for reasons we cannot see.

**17. What are "related accounts"?**
Content Rewards may group pages that look like they are run by one person and treat them together. It decides; we cannot see how.
That is one reason each page serves one campaign and why we never create extra pages to dodge a limit.

**18. What rules are hidden?**
A campaign's Rules tab and reference files show only after you join. The public page shows budget and rate, not the rules. That is why
you read the Rules tab yourself before a campaign is added.

**19. Can a payout be taken back?**
Yes. If a submission is rejected later (rule broken, fake views, same clip twice) its money can be reversed.

**20. Why do some posts earn $0?**
Campaigns have a minimum payout and many need a minimum number of views (for example 1,000 or 5,000) before a post earns anything.

**21. What is the fee?**
The dashboard assumes about 10% (set per campaign as the fee). Third-party guides report that figure; Content Rewards does not
publish it in a way we can read automatically. Treat it as approximate.

**22. Why do views show 0?**
Views come from Zernio's analytics. If your Zernio plan does not include analytics (we could not confirm this offline), views can stay
at 0 even though posts are live, and the tracker cannot read TikTok pages from GitHub's servers. Check the plan in Zernio, or ask Claude
to look at the run log.

**23. Do likes and engagement matter?**
Some campaigns need a minimum engagement (for example likes at least 2% of views). The robot notes posts that fall under it.

## Rules and safety

**24. Is automatic clipping allowed?**
Only if the campaign's rules say so. Many ban AI or automatic tools. A campaign is switched on only after its rules have been checked
and recorded as allowing tools. Join, open Rules, and search for AI, automated, scheduler, third-party.

**25. Who can see my dashboard?**
Anyone who has the link. It is a public web page. It shows clip titles, links, your TikTok page names and estimated earnings.
Do not post the link publicly.

**26. Is my key safe?**
The Zernio key lives only in GitHub Secrets. It is sent only to zernio.com. It is never written to the dashboard, the logs or the
state branch. Do not paste it anywhere else.

**27. What is in the public state branch?**
`clipper-cloud` holds the robot's memory: its database (clips, captions, posted links, estimates), the dashboard files and a few
settings. No keys, no tokens, no topic. Raw footage is not stored.

**28. What if TikTok limits or bans a page?**
Posts get few views, or posting fails. The light turns amber. Rest the page. We cannot fix a ban. Do not post by hand to push it.

**29. Does it delete posts?**
No. It never deletes anything you posted.

**30. Does the clip carry `#ad`?**
Yes when the campaign requires it: in the caption and on screen, as the brief says. The post is also marked as a paid partnership in
TikTok's settings.

## Running it

**31. How do I stop it?**
GitHub, Actions, `clipper-cloud`, the three dots, Disable workflow. To start again: Run workflow on branch
`claude/determined-shannon-94kfrp`.

**32. Why did it stop?**
Either you disabled it, a run failed in a way that also broke the chain (rare), or GitHub paused it. The red light says "Autopilot
hasn't run for Nh". Press Run workflow as above.

**33. How do I add a campaign?**
Join, read the Rules, then send Claude the link, the rules text, the Drive footage link and the logo. See `OWNER_GUIDE.md`.

**34. How do I add a TikTok page?**
Create it with the brand word in the name, connect it in Zernio. The next run picks it up. Zernio's free plan has 2 slots.

**35. Why does a page not get a campaign's clips?**
The name must contain the brand word the campaign asks for. Capitals, dots and spaces are ignored. If it does not match, that
campaign leaves the page alone.

**36. How do I change the key?**
New key in Zernio, then GitHub Settings, Secrets and variables, Actions, edit `ZERNIO_API_KEY`. The next run uses it.

**37. How do I get phone notes?**
Install the free ntfy app and subscribe to your topic (the same text as the `NTFY_TOPIC` secret). It sends a test note once. It stays
quiet 23:00-08:00 New York unless something is critical.

**38. Where does the footage come from?**
The campaign's shared Google Drive folder (share it as "anyone with the link") or a channel the campaign allows. The robot skips raw
files over about 2.5 GB. Add more videos any time.

**39. Can it post to Instagram or YouTube?**
The cloud runs post to TikTok only. The PC version can use Instagram and YouTube too.

**40. What time zone does it use?**
New York for the posting window, the 8 PM digest and quiet hours. Daylight saving is handled.

**41. What if Zernio is down?**
The post fails, the clip stays queued and the next run tries again. Nothing is posted twice on purpose.

**42. What should I never do?**
Buy views, post the same clip twice, delete pages mid-campaign, delete the `clipper-cloud` branch or edit the workflow file.
