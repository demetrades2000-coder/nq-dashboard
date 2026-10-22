# Message to send a campaign owner before clipping

Paste this into the campaign's Discord, the Whop chat, or the "contact" link
on the campaign page. Get a yes in writing, then screenshot it.

---

Hi! I'd like to clip for your campaign. Before I start, here's how I work:
- I use software to help find moments and add captions (speech-to-text from
  your real footage, with no AI-generated video, voices or faces).
- Every clip uses only your official footage, with the required tag,
  `#ad` and your logo if needed.
- I post from a dedicated account for your brand, one clip per account, with
  no reposts and no bought views.

Is that allowed under your rules? Thanks!

---

If they say yes, run this (or answer "yes" in setup):

    python pipeline.py campaign-set campaigns\<file>.json --automation-allowed yes
