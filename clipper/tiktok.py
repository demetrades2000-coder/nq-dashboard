"""
TikTok uploads via the official Content Posting API (your own TikTok developer app).

Two modes:
  inbox  (default) - the video lands in your TikTok app as a draft notification; you open it, paste the caption
                     from the autopilot report and tap Post. Works for apps that haven't passed TikTok's audit.
  direct           - posts straight to your profile. Until TikTok audits your app, TikTok only allows
                     private (SELF_ONLY) posts from it, so this is only useful after an audit.

One-time setup:
  1. developers.tiktok.com -> Manage apps -> create an app; add products "Login Kit" and "Content Posting API"
     (enable "Upload" and, if you want, "Direct Post"); add scopes user.info.basic, video.upload, video.list
  2. Under Login Kit, choose Desktop and register the redirect URI  http://localhost:3455/callback/
  3. python pipeline.py tiktok auth --client-key KEY      (the client secret is asked for, hidden)

Tokens and the client secret live in the OS keychain only. Implemented from TikTok's public API docs; this
build environment could not reach TikTok, so it has been tested against a simulated API only.
"""

from __future__ import annotations

import base64
import hashlib
import http.server
import json
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

API = "https://open.tiktokapis.com"
AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
KEYRING_SERVICE = "money-clipper"
TOKEN_KEY = "tiktok-token"


def _key(account: str = "default") -> str:
    return TOKEN_KEY if account in ("", "default") else f"{TOKEN_KEY}:{account}"
REDIRECT_PORT = 3455
MB = 1024 * 1024

ERRORS = {
    "unaudited_client_can_only_post_to_private_accounts":
        "TikTok only lets unaudited apps post privately. Use inbox mode, or get your app audited by TikTok.",
    "spam_risk_too_many_posts": "TikTok's daily posting limit for this account was reached; will retry next cycle.",
    "spam_risk_too_many_pending_share":
        "Too many drafts are waiting in your TikTok inbox (limit is about 5 per 24h). Post or delete them in the app.",
    "spam_risk_user_banned_from_posting": "TikTok has blocked this account from posting.",
    "access_token_invalid": "TikTok login expired; run `pipeline.py tiktok auth` again.",
    "scope_not_authorized": "The TikTok app lacks a needed scope (video.upload / video.list); add it and re-run auth.",
    "rate_limit_exceeded": "TikTok API rate limit; will retry later.",
    "privacy_level_option_mismatch": "Requested privacy isn't allowed for this account/app.",
    "url_ownership_unverified": "Verify your URL properties in the TikTok developer portal.",
}


class TikTokError(Exception):
    pass


# ---------------------------------------------------------------- keychain

def _keyring():
    try:
        import keyring
        return keyring
    except Exception:
        return None


def _load(account: str = "default") -> dict | None:
    kr = _keyring()
    try:
        raw = kr.get_password(KEYRING_SERVICE, _key(account)) if kr else None
    except Exception:
        raw = None
    return json.loads(raw) if raw else None


def _save(tok: dict, account: str = "default") -> None:
    kr = _keyring()
    if not kr:
        raise TikTokError("No OS keychain available (pip install keyring); tokens are never stored in plain files.")
    kr.set_password(KEYRING_SERVICE, _key(account), json.dumps(tok))


def has_token(account: str = "default") -> bool:
    return bool(_load(account))


def revoke(account: str = "default") -> None:
    kr = _keyring()
    if kr:
        try:
            kr.delete_password(KEYRING_SERVICE, _key(account))
        except Exception:
            pass


# ---------------------------------------------------------------- http

def _http(method: str, url: str, body=None, headers=None, sleep=time.sleep, tries: int = 4):
    """Returns (status, parsed-json-or-bytes). Retries 429/5xx/network errors with backoff."""
    data = None
    headers = dict(headers or {})
    if isinstance(body, (dict, list)):
        data = json.dumps(body).encode()
        headers.setdefault("Content-Type", "application/json; charset=UTF-8")
    elif isinstance(body, str):
        data = body.encode()
    elif isinstance(body, bytes):
        data = body
    last = None
    for i in range(tries):
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                raw = r.read()
                status = r.status
        except urllib.error.HTTPError as e:
            raw, status = e.read(), e.code
            if status in (429, 500, 502, 503, 504) and i < tries - 1:
                sleep(2 ** (i + 1))
                continue
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
            last = e
            if i < tries - 1:
                sleep(2 ** (i + 1))
                continue
            raise TikTokError(f"network error talking to TikTok: {e}") from e
        try:
            return status, json.loads(raw.decode() or "{}")
        except Exception:
            return status, raw
    raise TikTokError(f"TikTok request failed: {last}")


def _check(status: int, resp) -> dict:
    if not isinstance(resp, dict):
        raise TikTokError(f"unexpected TikTok response ({status})")
    err = resp.get("error") or {}
    code = err.get("code") if isinstance(err, dict) else err
    if code and code != "ok":
        msg = ERRORS.get(code, f"{code}: {err.get('message', '') if isinstance(err, dict) else resp.get('error_description', '')}")
        raise TikTokError(msg)
    if status >= 400:
        raise TikTokError(f"TikTok HTTP {status}: {str(resp)[:200]}")
    return resp.get("data") or {}


# ---------------------------------------------------------------- oauth (desktop, PKCE)

def pkce_pair(encoding: str = "hex") -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)[:64]
    digest = hashlib.sha256(verifier.encode()).digest()
    # TikTok's Login Kit docs describe a hex-encoded SHA256; standard PKCE is base64url. Both are supported.
    challenge = digest.hex() if encoding == "hex" else base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def _token_request(form: dict, http=_http) -> dict:
    status, resp = http("POST", f"{API}/v2/oauth/token/", urllib.parse.urlencode(form),
                        {"Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache"})
    if not isinstance(resp, dict) or "access_token" not in resp:
        desc = resp.get("error_description") or resp.get("error") if isinstance(resp, dict) else resp
        raise TikTokError(f"TikTok token request failed: {desc}")
    now = time.time()
    return {"access_token": resp["access_token"], "refresh_token": resp.get("refresh_token"),
            "expires_at": now + int(resp.get("expires_in", 0)) - 60,
            "refresh_expires_at": now + int(resp.get("refresh_expires_in", 0)), "open_id": resp.get("open_id"),
            "scope": resp.get("scope", "")}


def authorize(client_key: str, client_secret: str, mode: str = "inbox", pkce: str = "hex", paste: bool = False,
              port: int = REDIRECT_PORT, account: str = "default") -> str:
    scopes = ["user.info.basic", "video.upload", "video.list"] + (["video.publish"] if mode == "direct" else [])
    redirect = f"http://localhost:{port}/callback/"
    verifier, challenge = pkce_pair(pkce)
    state = secrets.token_urlsafe(16)
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "client_key": client_key, "scope": ",".join(scopes), "response_type": "code", "redirect_uri": redirect,
        "state": state, "code_challenge": challenge, "code_challenge_method": "S256"})
    got: dict = {}
    if paste:
        print("Open this URL, approve, then paste the full address you were redirected to:\n" + url)
        q = urllib.parse.parse_qs(urllib.parse.urlparse(input("> ").strip()).query)
        got = {k: v[0] for k, v in q.items()}
    else:
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_GET(self):
                q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                got.update({k: v[0] for k, v in q.items()})
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(b"<p>TikTok connected. You can close this tab.</p>")
        srv = http.server.HTTPServer(("127.0.0.1", port), H)
        t = threading.Thread(target=srv.handle_request, daemon=True)
        t.start()
        print("Opening TikTok in your browser to approve access...")
        webbrowser.open(url)
        t.join(timeout=300)
        srv.server_close()
    if got.get("state") != state:
        raise TikTokError("login was cancelled, timed out or the state didn't match; run auth again")
    if got.get("error"):
        raise TikTokError(f"TikTok denied access: {got.get('error_description') or got['error']}"
                          + (" (if it mentions code_challenge, retry with --pkce b64)" if "challenge" in str(got) else ""))
    tok = _token_request({"client_key": client_key, "client_secret": client_secret, "code": got.get("code", ""),
                          "grant_type": "authorization_code", "redirect_uri": redirect, "code_verifier": verifier})
    tok.update({"client_key": client_key, "client_secret": client_secret, "mode": mode})
    _save(tok, account)
    return f"TikTok account '{account}' connected ({mode} mode; scopes: {tok['scope']})"


def access_token(http=_http, account: str = "default") -> tuple[str, dict]:
    tok = _load(account)
    if not tok:
        raise TikTokError(f"TikTok account '{account}' isn't connected. Run: python pipeline.py tiktok auth "
                          f"--client-key <key>" + ("" if account == "default" else f" --account {account}"))
    if time.time() >= tok["expires_at"]:
        if not tok.get("refresh_token") or time.time() >= tok.get("refresh_expires_at", 0):
            raise TikTokError("TikTok login expired; run `pipeline.py tiktok auth` again")
        new = _token_request({"client_key": tok["client_key"], "client_secret": tok["client_secret"],
                              "grant_type": "refresh_token", "refresh_token": tok["refresh_token"]}, http)
        tok.update({k: v for k, v in new.items() if v})  # TikTok may rotate the refresh token: keep the newest
        _save(tok, account)
    return tok["access_token"], tok


# ---------------------------------------------------------------- upload

def chunk_plan(size: int) -> tuple[int, int]:
    """(chunk_size, total_chunk_count) per TikTok's rules: 5-64 MB chunks, last chunk absorbs the remainder
    (up to 128 MB), files under 5 MB (or up to 64 MB) go as one chunk."""
    if size <= 64 * MB:
        return size, 1
    chunk = 10 * MB
    return chunk, size // chunk


def _put_chunks(upload_url: str, path: Path, size: int, chunk: int, count: int, http=_http) -> None:
    with path.open("rb") as f:
        for i in range(count):
            start = i * chunk
            end = size - 1 if i == count - 1 else start + chunk - 1
            f.seek(start)
            data = f.read(end - start + 1)
            status, resp = http("PUT", upload_url, data, {"Content-Type": "video/mp4", "Content-Length": str(len(data)),
                                                           "Content-Range": f"bytes {start}-{end}/{size}"})
            if status == 403:
                raise TikTokError("TikTok upload URL expired before the upload finished; will retry next cycle")
            if status not in (200, 201, 206):
                raise TikTokError(f"TikTok rejected chunk {i + 1}/{count} (HTTP {status})")


def upload(path: Path, caption: str, mode: str = "inbox", branded: bool = False, http=_http, sleep=time.sleep,
           poll_seconds: int = 600, account: str = "default") -> dict:
    """Upload a clip. Returns {publish_id, status, mode, url, notes}."""
    token, tok = access_token(http, account)
    auth = {"Authorization": f"Bearer {token}"}
    path = Path(path)
    size = path.stat().st_size
    chunk, count = chunk_plan(size)
    source = {"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk, "total_chunk_count": count}
    notes = []
    if mode == "direct":
        info = _check(*http("POST", f"{API}/v2/post/publish/creator_info/query/", {}, auth))
        options = info.get("privacy_level_options") or ["SELF_ONLY"]
        privacy = "PUBLIC_TO_EVERYONE" if "PUBLIC_TO_EVERYONE" in options else options[0]
        if privacy != "PUBLIC_TO_EVERYONE":
            notes.append(f"TikTok allowed only '{privacy}' for this app (unaudited apps post privately)")
        body = {"post_info": {"title": caption[:2200], "privacy_level": privacy, "disable_comment": False,
                              "disable_duet": False, "disable_stitch": False, "video_cover_timestamp_ms": 1000,
                              "brand_content_toggle": bool(branded), "brand_organic_toggle": False, "is_aigc": False},
                "source_info": source}
        data = _check(*http("POST", f"{API}/v2/post/publish/video/init/", body, auth))
    else:
        data = _check(*http("POST", f"{API}/v2/post/publish/inbox/video/init/", {"source_info": source}, auth))
    publish_id, upload_url = data.get("publish_id"), data.get("upload_url")
    if not publish_id or not upload_url:
        raise TikTokError("TikTok didn't return an upload URL")
    _put_chunks(upload_url, path, size, chunk, count, http)
    status, fail, post_ids, waited = "PROCESSING_UPLOAD", "", [], 0
    while waited <= poll_seconds:
        d = _check(*http("POST", f"{API}/v2/post/publish/status/fetch/", {"publish_id": publish_id}, auth))
        status, fail = d.get("status", status), d.get("fail_reason", "")
        post_ids = d.get("publicaly_available_post_id") or d.get("publicly_available_post_id") or []
        if status in ("SEND_TO_USER_INBOX", "PUBLISH_COMPLETE", "FAILED"):
            break
        sleep(10)
        waited += 10
    if status == "FAILED":
        raise TikTokError(f"TikTok processing failed: {fail or 'no reason given'}")
    if status == "SEND_TO_USER_INBOX":
        notes.append("draft sent to your TikTok inbox: open the notification, paste the caption, tap Post"
                     + (" and turn on 'Paid partnership' under content disclosure" if branded else ""))
    elif status not in ("PUBLISH_COMPLETE",):
        notes.append(f"TikTok still processing ({status}); it will be checked next cycle")
    return {"publish_id": publish_id, "status": status, "mode": mode,
            "remote_id": str(post_ids[0]) if post_ids else None, "notes": notes}


def recent_videos(http=_http, max_count: int = 20, account: str = "default") -> list[dict]:
    token, _ = access_token(http, account)
    fields = "id,title,video_description,share_url,view_count,like_count,create_time"
    data = _check(*http("POST", f"{API}/v2/video/list/?fields={fields}", {"max_count": max_count},
                        {"Authorization": f"Bearer {token}"}))
    return data.get("videos") or []


def _norm(t: str) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() else " " for ch in (t or "")).split())


def match_posts(pending: list[dict], videos: list[dict]) -> dict:
    """Map pending uploads (each {'key', 'caption', 'created'}) to live TikTok videos by caption text."""
    out, used = {}, set()
    for p in pending:
        want = _norm(p["caption"])[:60]
        if len(want) < 12:
            continue
        for v in videos:
            have = _norm((v.get("video_description") or "") + " " + (v.get("title") or ""))
            if v["id"] not in used and want[:40] in have:
                out[p["key"]] = v
                used.add(v["id"])
                break
    return out
