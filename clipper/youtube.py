"""
YouTube upload and stats via the official YouTube Data API v3 (OAuth, your own Google Cloud project).

One-time setup (the only part a human must do; Google requires an interactive consent):
  1. console.cloud.google.com -> new project -> enable "YouTube Data API v3"
  2. OAuth consent screen (External, add yourself as test user) -> Credentials -> OAuth client ID ->
     "Desktop app" -> download the JSON
  3. python pipeline.py youtube auth --client-secret path/to/client_secret.json

The OAuth token (which can upload to your channel) is kept in the OS keychain, never in a file.
"""

from __future__ import annotations

import json
import random
import time
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]
KEYRING_SERVICE = "money-clipper"
TOKEN_KEY = "youtube-token"


def _key(account: str = "default") -> str:
    return TOKEN_KEY if account in ("", "default") else f"{TOKEN_KEY}:{account}"
RETRY_STATUS = {500, 502, 503, 504}


class YouTubeError(Exception):
    pass


def _keyring():
    try:
        import keyring
        return keyring
    except Exception:
        return None


def _libs():
    try:
        from google.auth.transport.requests import Request  # noqa: F401
        from google.oauth2.credentials import Credentials  # noqa: F401
        from google_auth_oauthlib.flow import InstalledAppFlow  # noqa: F401
        from googleapiclient.discovery import build  # noqa: F401
        from googleapiclient.errors import HttpError  # noqa: F401
        from googleapiclient.http import MediaFileUpload  # noqa: F401
        return True
    except Exception:
        return False


def ensure_libs(allow_install: bool = True) -> None:
    if _libs():
        return
    if allow_install:
        import clipper as cl
        cl.pip_install("google-api-python-client", "google-auth-oauthlib", "google-auth-httplib2")
    if not _libs():
        raise YouTubeError("Google API libraries missing: pip install google-api-python-client google-auth-oauthlib")


def authorize(client_secret: str, account: str = "default") -> str:
    """Interactive one-time consent in the browser; stores the token in the OS keychain."""
    ensure_libs()
    kr = _keyring()
    if not kr:
        raise YouTubeError("No OS keychain available (pip install keyring). The upload token is not stored in plain files.")
    from google_auth_oauthlib.flow import InstalledAppFlow
    flow = InstalledAppFlow.from_client_secrets_file(client_secret, SCOPES)
    creds = flow.run_local_server(port=0, open_browser=True)
    kr.set_password(KEYRING_SERVICE, _key(account), creds.to_json())
    ch = channel_info(service(account))
    return f"account '{account}' authorized for channel: {ch.get('title')} ({ch.get('id')})"


def has_token(account: str = "default") -> bool:
    kr = _keyring()
    try:
        return bool(kr and kr.get_password(KEYRING_SERVICE, _key(account)))
    except Exception:
        return False


def revoke(account: str = "default") -> None:
    kr = _keyring()
    if kr:
        try:
            kr.delete_password(KEYRING_SERVICE, _key(account))
        except Exception:
            pass


def service(account: str = "default"):
    ensure_libs()
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    kr = _keyring()
    raw = kr.get_password(KEYRING_SERVICE, _key(account)) if kr else None
    if not raw:
        raise YouTubeError(f"YouTube account '{account}' isn't connected. Run: python pipeline.py youtube auth "
                           f"--client-secret <file>" + ("" if account == "default" else f" --account {account}"))
    creds = Credentials.from_authorized_user_info(json.loads(raw), SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:  # noqa: BLE001
                raise YouTubeError(f"YouTube authorization expired or was revoked ({e}); run `pipeline.py youtube auth` "
                                   "again. Note: Google expires tokens after 7 days while the OAuth app is in "
                                   "'Testing' status; publish the app (In production) to avoid that.")
            kr.set_password(KEYRING_SERVICE, _key(account), creds.to_json())
        else:
            raise YouTubeError("YouTube token invalid; run `pipeline.py youtube auth` again")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def channel_info(yt) -> dict:
    r = yt.channels().list(part="snippet", mine=True).execute()
    items = r.get("items") or []
    return {"id": items[0]["id"], "title": items[0]["snippet"]["title"]} if items else {}


def upload(yt, path: Path, title: str, description: str, tags: list[str], privacy: str = "public",
           paid_promotion: bool = False, sleep=time.sleep) -> dict:
    """Resumable upload with retries. Returns {id, url, privacy, requested_privacy, paid_flag_set, notes}."""
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload
    notes = []
    body = {
        "snippet": {"title": title[:100], "description": description[:5000],
                    "tags": [t.lstrip("#") for t in tags][:15], "categoryId": "22"},
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    }
    parts = ["snippet", "status"]
    if paid_promotion:
        body["paidProductPlacementDetails"] = {"hasPaidProductPlacement": True}
        parts.append("paidProductPlacementDetails")

    def attempt(parts_, body_):
        media = MediaFileUpload(str(path), mimetype="video/mp4", chunksize=8 << 20, resumable=True)
        req = yt.videos().insert(part=",".join(parts_), body=body_, media_body=media)
        response, tries = None, 0
        while response is None:
            try:
                _, response = req.next_chunk()
            except HttpError as e:
                status = getattr(e.resp, "status", 0)
                if status in RETRY_STATUS and tries < 6:
                    tries += 1
                    sleep(min(64, 2 ** tries) + random.random())
                    continue
                raise
            except (ConnectionError, TimeoutError, OSError):
                if tries < 6:
                    tries += 1
                    sleep(min(64, 2 ** tries) + random.random())
                    continue
                raise
        return response

    paid_set = paid_promotion
    try:
        resp = attempt(parts, body)
    except HttpError as e:
        status = getattr(e.resp, "status", 0)
        content = getattr(e, "content", b"") or b""
        text = str(e) + " " + (content.decode("utf-8", "replace") if isinstance(content, bytes) else str(content))
        if paid_promotion and status == 400 and "paidProductPlacement" in text:
            notes.append("YouTube rejected the paid-promotion flag via API: tick 'includes paid promotion' in Studio")
            body.pop("paidProductPlacementDetails")
            paid_set = False
            resp = attempt(["snippet", "status"], body)
        elif status == 403 and ("quotaExceeded" in text or "uploadLimitExceeded" in text):
            raise YouTubeError("YouTube upload limit or API quota reached for today; will retry next cycle") from e
        elif status in (401, 403):
            raise YouTubeError(f"YouTube refused the upload ({status}): {text[:200]}") from e
        else:
            raise
    vid = resp["id"]
    got = (resp.get("status") or {}).get("privacyStatus", privacy)
    if got != privacy:
        notes.append(f"YouTube set the video to '{got}' instead of '{privacy}'. Uploads from unaudited API "
                     "projects can be locked private; apply for the YouTube API audit or change it in Studio.")
    return {"id": vid, "url": f"https://www.youtube.com/shorts/{vid}", "privacy": got, "requested_privacy": privacy,
            "paid_flag_set": paid_set, "notes": notes}


def stats(yt, video_ids: list[str]) -> dict:
    out = {}
    for i in range(0, len(video_ids), 50):
        r = yt.videos().list(part="statistics,status", id=",".join(video_ids[i:i + 50])).execute()
        for it in r.get("items", []):
            s = it.get("statistics", {})
            out[it["id"]] = {"views": int(s.get("viewCount", 0)), "likes": int(s.get("likeCount", 0)),
                             "privacy": it.get("status", {}).get("privacyStatus")}
    return out
