"""
Fully automatic posting to TikTok, Instagram Reels and YouTube Shorts through Upload-Post
(upload-post.com), a hosted posting API that holds its own platform approvals, so your clips can go
out publicly without you tapping anything and without a TikTok app review on your side.

One-time setup (you):
  1. Sign up at upload-post.com and pick a plan that includes TikTok (the free plan may not).
  2. Create a profile (e.g. "alphafutures") and connect the dedicated TikTok / Instagram / YouTube accounts to it.
  3. Copy your API key, then:  python pipeline.py uploadpost auth
  4. python pipeline.py autopilot enable --via uploadpost --platforms tiktok,instagram,youtube

The API key is kept in the OS keychain (or the UPLOAD_POST_API_KEY environment variable), never in files.
Built from Upload-Post's public API docs; this build environment could not reach the service, so it is
tested against a simulated API only.
"""

from __future__ import annotations

import json
import mimetypes
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.upload-post.com/api"
KEYRING_SERVICE = "money-clipper"
KEY_NAME = "upload-post-key"
PLATFORM_NAMES = {"tiktok": "tiktok", "instagram": "instagram", "youtube": "youtube"}


class UploadPostError(Exception):
    pass


def _keyring():
    try:
        import keyring
        return keyring
    except Exception:
        return None


def api_key() -> str | None:
    if os.environ.get("UPLOAD_POST_API_KEY"):
        return os.environ["UPLOAD_POST_API_KEY"]
    kr = _keyring()
    try:
        return kr.get_password(KEYRING_SERVICE, KEY_NAME) if kr else None
    except Exception:
        return None


def has_token(account: str = "default") -> bool:
    return bool(api_key())


def save_key(key: str) -> None:
    kr = _keyring()
    if not kr:
        raise UploadPostError("No OS keychain available; set UPLOAD_POST_API_KEY in your environment instead.")
    kr.set_password(KEYRING_SERVICE, KEY_NAME, key.strip())


def delete_key() -> None:
    kr = _keyring()
    if kr:
        try:
            kr.delete_password(KEYRING_SERVICE, KEY_NAME)
        except Exception:
            pass


def _multipart(fields: list[tuple[str, str]], files: list[tuple[str, Path]]) -> tuple[bytes, str]:
    boundary = "----mc" + secrets.token_hex(12)
    out = bytearray()
    for name, value in fields:
        out += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n").encode()
        out += str(value).encode("utf-8") + b"\r\n"
    for name, path in files:
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        out += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{path.name}\"\r\n"
                f"Content-Type: {ctype}\r\n\r\n").encode()
        out += path.read_bytes() + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


def _http(method: str, url: str, data: bytes | None, headers: dict, timeout: int = 900):
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _call(method, url, data, headers, http=None, sleep=time.sleep, tries=4):
    http = http or _http
    last = None
    for i in range(tries):
        try:
            status, raw = http(method, url, data, headers)
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
            last = e
            if i < tries - 1:
                sleep(2 ** (i + 1))
                continue
            raise UploadPostError(f"network error talking to Upload-Post: {e}") from e
        if status in (429, 500, 502, 503, 504) and i < tries - 1:
            sleep(2 ** (i + 1) * (3 if status == 429 else 1))
            continue
        try:
            body = json.loads(raw.decode() or "{}")
        except Exception:
            body = {"raw": raw[:300].decode("utf-8", "replace") if isinstance(raw, bytes) else str(raw)}
        return status, body
    raise UploadPostError(f"Upload-Post request failed: {last}")


def _explain(status: int, body: dict) -> str:
    msg = body.get("message") or body.get("error") or body.get("detail") or body.get("raw") or ""
    if status == 401:
        return "Upload-Post rejected the API key; run `pipeline.py uploadpost auth` with a fresh key"
    if status in (402, 403) or "limit" in str(msg).lower() or "plan" in str(msg).lower():
        return f"Upload-Post plan limit or platform not in your plan ({msg}); upgrade the plan or wait for the reset"
    if status == 404 and "user" in str(msg).lower():
        return f"Upload-Post profile not found ({msg}); create it in the dashboard and connect the accounts"
    return f"Upload-Post error {status}: {str(msg)[:200]}"


def _find_result(body: dict, platform: str) -> dict:
    """Responses nest per-platform results; accept the shapes the docs and SDKs show."""
    for key in ("results", "result", "data"):
        v = body.get(key)
        if isinstance(v, dict):
            if platform in v and isinstance(v[platform], dict):
                return v[platform]
            if any(k in v for k in ("url", "post_url", "success")):
                return v
    return body


def upload(path: Path, platform: str, user: str, title: str, caption: str, paid: bool = False,
           privacy: str = "public", http=None, sleep=time.sleep) -> dict:
    """Post one clip to one platform. Returns {remote_id, url, state, notes, publish_id}."""
    key = api_key()
    if not key:
        raise UploadPostError("Upload-Post isn't connected: run `pipeline.py uploadpost auth`")
    if platform not in PLATFORM_NAMES:
        raise UploadPostError(f"Upload-Post adapter doesn't handle {platform}")
    rid = "mc-" + secrets.token_hex(8)
    fields = [("user", user), ("platform[]", PLATFORM_NAMES[platform]), ("request_id", rid)]
    if platform == "youtube":
        fields += [("title", title[:100]), ("description", caption[:5000]),
                   ("privacyStatus", "public" if privacy == "public" else privacy), ("selfDeclaredMadeForKids", "false"),
                   ("containsSyntheticMedia", "false")]
    else:
        fields += [("title", caption[:2200])]
    if platform == "tiktok":
        fields += [("post_mode", "DIRECT_POST"),
                   ("privacy_level", "PUBLIC_TO_EVERYONE" if privacy == "public" else "SELF_ONLY"),
                   ("tiktok_is_ai_generated", "false")]
        if paid:
            fields += [("brand_content_toggle", "true")]
    if platform == "instagram":
        fields += [("media_type", "REELS")]
    data, ctype = _multipart(fields, [("video", Path(path))])
    status, body = _call("POST", f"{API}/upload", data, {"Authorization": f"Apikey {key}", "Content-Type": ctype},
                         http, sleep)
    notes = []
    if status == 400 and paid and "brand" in json.dumps(body).lower():
        # older API versions may not know the brand flag: retry without it, keep #ad in the caption
        fields = [f for f in fields if f[0] != "brand_content_toggle"]
        data, ctype = _multipart(fields, [("video", Path(path))])
        status, body = _call("POST", f"{API}/upload", data, {"Authorization": f"Apikey {key}", "Content-Type": ctype},
                             http, sleep)
        notes.append("paid-partnership toggle not accepted by the API; '#ad' is in the caption, also switch on "
                     "'Paid partnership' in the TikTok app")
    if status >= 400 or body.get("success") is False:
        raise UploadPostError(_explain(status, body))
    res = _find_result(body, PLATFORM_NAMES[platform])
    if res.get("success") is False:
        raise UploadPostError(f"{platform} rejected the post: {res.get('error') or res.get('message') or res}")
    url = res.get("url") or res.get("post_url") or res.get("permalink")
    pid = res.get("publish_id") or res.get("video_id") or res.get("id") or res.get("post_id")
    state = "live" if url else "processing"
    vis = str(res.get("privacy_level") or res.get("privacy") or "").upper()
    if vis and ("SELF_ONLY" in vis or "PRIVATE" in vis) and privacy == "public":
        state = "private"
        notes.append("the platform published it as private; check the account and Upload-Post's TikTok approval")
    if not url:
        notes.append("posted; link not returned yet (checked again next cycle)")
    return {"remote_id": str(pid) if pid else None, "url": url, "state": state, "notes": notes,
            "publish_id": body.get("request_id") or rid}


def status(request_id: str, http=None, sleep=time.sleep) -> dict:
    """Best-effort status lookup for an earlier upload: {platform: {url, state}}."""
    key = api_key()
    if not key:
        return {}
    st, body = _call("GET", f"{API}/uploadposts/status?" + urllib.parse.urlencode({"request_id": request_id}), None,
                     {"Authorization": f"Apikey {key}"}, http, sleep)
    if st >= 400:
        return {}
    out = {}
    for p in PLATFORM_NAMES.values():
        r = _find_result(body, p)
        url = r.get("url") or r.get("post_url") if isinstance(r, dict) else None
        if url:
            out[p] = {"url": url}
    return out
