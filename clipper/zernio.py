"""
Free, fully automatic public posting to TikTok and Instagram through Zernio (zernio.com, formerly Late),
whose free plan covers 2 connected social accounts with API access. YouTube Shorts uses the free official
YouTube API (youtube.py), so all three platforms post automatically at no cost.

One-time setup (you):
  1. Sign up at zernio.com (free plan, no card) and connect the dedicated TikTok account
     (and Instagram as the second free account).
  2. Create an API key in the dashboard, then:  python pipeline.py zernio auth
  3. python pipeline.py autopilot enable --via free --platforms tiktok,instagram,youtube

Flow per clip: POST /v1/media/presign -> PUT the file to the presigned URL -> POST /v1/posts with
publishNow. The key lives in the OS keychain (or ZERNIO_API_KEY). Checked against Zernio's live API docs
(docs.zernio.com, 2026-10-22): presign/PUT/posts flow, tiktokSettings, commercialContentType, photo carousels.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

import secretstore

API = "https://zernio.com/api/v1"
KEYRING_SERVICE = "money-clipper"
KEY_NAME = "zernio-key"


class ZernioError(Exception):
    pass


def _keyring():
    try:
        import keyring
        return keyring
    except Exception:
        return None


def api_key() -> str | None:
    if os.environ.get("ZERNIO_API_KEY"):
        return os.environ["ZERNIO_API_KEY"]
    kr = _keyring()
    try:
        return secretstore.get(kr, KEYRING_SERVICE, KEY_NAME) if kr else None
    except Exception:
        return None


def has_token(account: str = "default") -> bool:
    return bool(api_key())


def save_key(key: str) -> None:
    kr = _keyring()
    if not kr:
        raise ZernioError("No OS keychain available; set ZERNIO_API_KEY in your environment instead.")
    secretstore.save(kr, KEYRING_SERVICE, KEY_NAME, key.strip())


def delete_key() -> None:
    kr = _keyring()
    if kr:
        try:
            secretstore.delete(kr, KEYRING_SERVICE, KEY_NAME)
        except Exception:
            pass


def _http(method: str, url: str, data: bytes | None, headers: dict, timeout: int = 900):
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _call(method: str, url: str, body=None, headers=None, http=None, sleep=time.sleep, tries: int = 4, raw: bytes = None):
    http = http or _http
    headers = dict(headers or {})
    data = raw
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    last = None
    for i in range(tries):
        try:
            status, out = http(method, url, data, headers)
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
            last = e
            if i < tries - 1:
                sleep(2 ** (i + 1))
                continue
            raise ZernioError(f"network error talking to Zernio: {e}") from e
        if status in (429, 500, 502, 503, 504) and i < tries - 1:
            sleep(2 ** (i + 1) * (3 if status == 429 else 1))
            continue
        try:
            parsed = json.loads(out.decode() or "{}") if out else {}
        except Exception:
            parsed = {"raw": out[:300].decode("utf-8", "replace") if isinstance(out, bytes) else str(out)}
        return status, parsed
    raise ZernioError(f"Zernio request failed: {last}")


def _auth() -> dict:
    key = api_key()
    if not key:
        raise ZernioError("Zernio isn't connected: run `pipeline.py zernio auth`")
    return {"Authorization": f"Bearer {key}"}


def _explain(status: int, body: dict) -> str:
    msg = body.get("error") or body.get("message") or body.get("raw") or ""
    if isinstance(msg, dict):
        msg = msg.get("message") or json.dumps(msg)
    low = str(msg).lower()
    if status == 401:
        return "Zernio rejected the API key; run `pipeline.py zernio auth` with a fresh key"
    if status in (402, 403) or "limit" in low or "plan" in low or "quota" in low:
        return f"Zernio plan or platform posting limit reached ({msg}); it retries next cycle"
    return f"Zernio error {status}: {str(msg)[:200]}"


def list_accounts(http=None, sleep=time.sleep) -> list[dict]:
    st, body = _call("GET", f"{API}/accounts", headers=_auth(), http=http, sleep=sleep)
    if st >= 400:
        raise ZernioError(_explain(st, body))
    items = body.get("accounts") if isinstance(body, dict) else body
    if items is None and isinstance(body, dict):
        items = body.get("data") or []
    return items or []


def pick_account(accounts: list[dict], platform: str, wanted: str) -> dict:
    """The connected account for a platform: matched by id or name when several exist."""
    mine = [a for a in accounts if str(a.get("platform", "")).lower() == platform]
    if not mine:
        raise ZernioError(f"no {platform} account is connected in Zernio; connect it in the Zernio dashboard")
    if wanted and wanted != "default":
        w = wanted.lower().lstrip("@")
        for a in mine:
            names = [str(a.get(k, "")).lower().lstrip("@") for k in ("_id", "id", "username", "displayName", "name")]
            if w in names or any(w and w in n for n in names[2:]):
                return a
        if len(mine) > 1:
            raise ZernioError(f"several {platform} accounts in Zernio and none matches '{wanted}': "
                              + ", ".join(str(a.get("username") or a.get("_id")) for a in mine))
    return mine[0]


def _find_url(obj) -> str | None:
    if isinstance(obj, dict):
        for k in ("platformPostUrl", "postUrl", "url", "permalink"):
            v = obj.get(k)
            if isinstance(v, str) and v.startswith("http") and "zernio.com" not in v:
                return v
        for v in obj.values():
            u = _find_url(v)
            if u:
                return u
    if isinstance(obj, list):
        for v in obj:
            u = _find_url(v)
            if u:
                return u
    return None


def _platform_entry(post: dict, platform: str) -> dict:
    for p in (post.get("platforms") or []):
        if isinstance(p, dict) and str(p.get("platform", "")).lower() == platform:
            return p
    return {}


def upload(path: Path, platform: str, account: str, caption: str, paid: bool = False, privacy: str = "public",
           consent: bool = False, http=None, sleep=time.sleep) -> dict:
    """Publish one clip now. Returns {remote_id, url, state, notes, publish_id}."""
    if platform == "tiktok" and not consent:
        raise ZernioError("TikTok requires your consent for automated posts: run `pipeline.py zernio auth` and accept")
    auth = _auth()
    acct = pick_account(list_accounts(http, sleep), platform, account)
    acct_id = acct.get("_id") or acct.get("id")
    path = Path(path)
    st, pre = _call("POST", f"{API}/media/presign",
                    {"filename": path.name, "fileName": path.name, "contentType": "video/mp4", "fileType": "video/mp4"},
                    auth, http, sleep)
    if st >= 400 or not pre.get("uploadUrl"):
        raise ZernioError(_explain(st, pre) if st >= 400 else "Zernio didn't return an upload URL")
    st, _ = _call("PUT", pre["uploadUrl"], headers={"Content-Type": "video/mp4"}, http=http, sleep=sleep,
                  raw=path.read_bytes())
    if st >= 400:
        raise ZernioError(f"upload to Zernio storage failed (HTTP {st}); retried next cycle")
    entry = {"platform": platform, "accountId": acct_id}
    body = {"content": caption, "mediaItems": [{"type": "video", "url": pre["publicUrl"]}],
            "platforms": [entry], "publishNow": True}
    if platform == "tiktok":
        tts = {"privacy_level": "PUBLIC_TO_EVERYONE" if privacy == "public" else "SELF_ONLY",
               "allow_comment": True, "allow_duet": True, "allow_stitch": True,
               "content_preview_confirmed": True, "express_consent_given": True}
        if paid:   # a paid campaign post is a paid partnership (TikTok's "branded content" label)
            tts["commercialContentType"] = "brand_content"
        body["tiktokSettings"] = tts  # docs show both placements; send both
        entry["platformSpecificData"] = {"tiktokSettings": tts}
    st, out = _call("POST", f"{API}/posts", body, auth, http, sleep)
    if st >= 400:
        raise ZernioError(_explain(st, out))
    post = out.get("post") if isinstance(out.get("post"), dict) else out
    pe = _platform_entry(post, platform)
    if str(pe.get("status", "")).lower() in ("failed", "error"):
        raise ZernioError(f"{platform} rejected the post: {pe.get('errorMessage') or pe.get('error') or pe}")
    url = _find_url(pe) or _find_url(post)
    pid = post.get("_id") or post.get("id")
    notes = [] if url else ["published; link not returned yet (checked again next cycle)"]
    return {"remote_id": pe.get("platformPostId"), "url": url, "state": "live" if url else "processing",
            "notes": notes, "publish_id": str(pid) if pid else None}


def upload_photos(images: list, platform: str, account: str, title: str, caption: str, paid: bool = False,
                  privacy: str = "public", consent: bool = False, http=None, sleep=time.sleep) -> dict:
    """Publish a photo carousel (TikTok slideshow) now: each image is presigned and uploaded, then one post."""
    if platform != "tiktok":
        raise ZernioError("photo carousels are only set up for TikTok")
    if not consent:
        raise ZernioError("TikTok requires your consent for automated posts: run `pipeline.py zernio auth` and accept")
    if not 1 <= len(images) <= 35:
        raise ZernioError(f"a TikTok carousel takes 1-35 images, got {len(images)}")
    auth = _auth()
    acct = pick_account(list_accounts(http, sleep), platform, account)
    acct_id = acct.get("_id") or acct.get("id")
    items = []
    for img in images:
        img = Path(img)
        ctype = "image/png" if img.suffix.lower() == ".png" else "image/jpeg"
        st, pre = _call("POST", f"{API}/media/presign", {"filename": img.name, "contentType": ctype,
                                                          "size": img.stat().st_size}, auth, http, sleep)
        if st >= 400 or not pre.get("uploadUrl"):
            raise ZernioError(_explain(st, pre) if st >= 400 else "Zernio didn't return an upload URL")
        st, _ = _call("PUT", pre["uploadUrl"], headers={"Content-Type": ctype}, http=http, sleep=sleep,
                      raw=img.read_bytes())
        if st >= 400:
            raise ZernioError(f"image upload to Zernio storage failed (HTTP {st}); retried next cycle")
        items.append({"type": "image", "url": pre["publicUrl"]})
    tts = {"privacy_level": "PUBLIC_TO_EVERYONE" if privacy == "public" else "SELF_ONLY", "allow_comment": True,
           "media_type": "photo", "photo_cover_index": 0, "description": caption[:4000], "auto_add_music": True,
           "content_preview_confirmed": True, "express_consent_given": True}
    if paid:
        tts["commercialContentType"] = "brand_content"
    entry = {"platform": platform, "accountId": acct_id, "platformSpecificData": {"tiktokSettings": tts}}
    body = {"content": (title or "")[:90], "mediaItems": items, "platforms": [entry], "publishNow": True,
            "tiktokSettings": tts}
    st, out = _call("POST", f"{API}/posts", body, auth, http, sleep)
    if st >= 400:
        raise ZernioError(_explain(st, out))
    post = out.get("post") if isinstance(out.get("post"), dict) else out
    pe = _platform_entry(post, platform)
    if str(pe.get("status", "")).lower() in ("failed", "error"):
        raise ZernioError(f"{platform} rejected the carousel: {pe.get('errorMessage') or pe.get('error') or pe}")
    url = _find_url(pe) or _find_url(post)
    pid = post.get("_id") or post.get("id")
    return {"remote_id": pe.get("platformPostId"), "url": url, "state": "live" if url else "processing",
            "notes": [] if url else ["published; link not returned yet (checked again next cycle)"],
            "publish_id": str(pid) if pid else None}


_STATS: dict[str, tuple[float, dict]] = {}


def _norm_url(u: str) -> str:
    return (u or "").split("?")[0].rstrip("/").lower()


def analytics_posts(platform: str = "tiktok", days: int = 60, http=None, sleep=time.sleep) -> dict[str, dict]:
    """{post url: {views, likes, comments, shares}} for recent posts, from Zernio's analytics (usage-based plans
    include it). Reliable from datacenter IPs, unlike reading TikTok's public pages."""
    import datetime as _dt
    to = _dt.date.today()
    frm = to - _dt.timedelta(days=days)
    out: dict[str, dict] = {}
    for page in range(1, 21):
        st, body = _call("GET", f"{API}/analytics?platform={platform}&fromDate={frm.isoformat()}&toDate={to.isoformat()}"
                                f"&limit=100&page={page}", headers=_auth(), http=http, sleep=sleep)
        if st >= 400:
            raise ZernioError(_explain(st, body))
        for p in (body.get("posts") or []):
            u, a = p.get("platformPostUrl"), p.get("analytics") or {}
            if u:
                out[_norm_url(u)] = {"views": a.get("views"), "likes": a.get("likes"), "comments": a.get("comments"),
                                     "shares": a.get("shares")}
        pg = body.get("pagination") or {}
        if page >= int(pg.get("pages") or 1):
            break
    return out


def post_stats(url: str, platform: str = "tiktok", http=None, sleep=time.sleep, ttl: float = 600) -> dict | None:
    """Views/likes for one of our posts (analytics fetched once per process and platform, then cached)."""
    now = time.time()
    hit = _STATS.get(platform)
    if not hit or now - hit[0] > ttl:
        try:
            _STATS[platform] = (now, analytics_posts(platform, http=http, sleep=sleep))
        except ZernioError:
            _STATS[platform] = (now, {})
    return _STATS[platform][1].get(_norm_url(url))


def post_url(post_id: str, platform: str, http=None, sleep=time.sleep) -> dict | None:
    """Look up a published post's platform link and status."""
    st, out = _call("GET", f"{API}/posts/{post_id}", headers=_auth(), http=http, sleep=sleep)
    if st >= 400:
        return None
    post = out.get("post") if isinstance(out.get("post"), dict) else out
    pe = _platform_entry(post, platform)
    status = str(pe.get("status", "")).lower()
    if status in ("failed", "error"):
        return {"failed": pe.get("errorMessage") or "failed"}
    url = _find_url(pe)
    return {"url": url} if url else None
