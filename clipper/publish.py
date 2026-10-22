"""
Publish the Clip Engine dashboard to GitHub Pages, the same way the NQ dashboard is served: the page,
data.json, manifest and icons go into a folder of your Pages repo (default: clips/ in nq-dashboard), so it
opens at https://<you>.github.io/<repo>/clips/ on any device and refreshes itself every minute.

Uses the GitHub contents API with a fine-grained token (Contents: read and write on that one repo only),
kept in the OS keychain. Only files that changed are uploaded. The repo is public, so the page is public:
`publish setup --hide-money` keeps dollar figures off the published copy.
"""

from __future__ import annotations

import base64
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request

KEYRING_SERVICE = "money-clipper"
KEY_NAME = "github-publish-token"
API = "https://api.github.com"


class PublishError(Exception):
    pass


def _keyring():
    try:
        import keyring
        return keyring
    except Exception:
        return None


def token() -> str | None:
    import os
    if os.environ.get("CLIPPER_GITHUB_TOKEN"):
        return os.environ["CLIPPER_GITHUB_TOKEN"]
    kr = _keyring()
    try:
        import secretstore
        return secretstore.get(kr, KEYRING_SERVICE, KEY_NAME) if kr else None
    except Exception:
        return None


def save_token(t: str) -> None:
    kr = _keyring()
    if not kr:
        raise PublishError("No OS keychain available; set CLIPPER_GITHUB_TOKEN instead.")
    import secretstore
    secretstore.save(kr, KEYRING_SERVICE, KEY_NAME, t.strip())


def delete_token() -> None:
    kr = _keyring()
    if kr:
        try:
            import secretstore
            secretstore.delete(kr, KEYRING_SERVICE, KEY_NAME)
        except Exception:
            pass


def _http(method: str, url: str, body: dict | None, headers: dict):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}


def _call(method, url, body=None, http=None, sleep=time.sleep):
    http = http or _http
    t = token()
    if not t:
        raise PublishError("No GitHub token: run `pipeline.py publish setup`")
    headers = {"Authorization": f"Bearer {t}", "Accept": "application/vnd.github+json",
               "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "clip-engine"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    for i in range(4):
        try:
            st, out = http(method, url, body, headers)
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
            if i == 3:
                raise PublishError(f"network error talking to GitHub: {e}") from e
            sleep(2 ** (i + 1))
            continue
        if st in (429, 500, 502, 503, 504) or (st == 403 and "rate limit" in json.dumps(out).lower()):
            if i < 3:
                sleep(2 ** (i + 2))
                continue
        return st, out
    return st, out


def blob_sha(content: bytes) -> str:
    return hashlib.sha1(b"blob %d\0" % len(content) + content).hexdigest()


def check_access(repo: str, http=None) -> str:
    st, out = _call("GET", f"{API}/repos/{repo}", http=http)
    if st == 401:
        raise PublishError("GitHub rejected the token; create a new one (see `publish setup --help`)")
    if st == 404:
        raise PublishError(f"repo {repo} not found or the token can't see it")
    perms = out.get("permissions") or {}
    if perms and not perms.get("push"):
        raise PublishError("the token can read but not write this repo: give it Contents: Read and write")
    pages = f"https://{repo.split('/')[0].lower()}.github.io/{repo.split('/')[1]}/" if out.get("has_pages") else ""
    return pages


def publish(files: dict[str, bytes], repo: str, branch: str = "main", folder: str = "clips", http=None,
            sleep=time.sleep) -> dict:
    """Upload changed files. Returns {'uploaded': [...], 'unchanged': [...]}."""
    folder = folder.strip("/")
    uploaded, unchanged = [], []
    st, listing = _call("GET", f"{API}/repos/{repo}/contents/{urllib.parse.quote(folder)}?ref={urllib.parse.quote(branch)}",
                        http=http, sleep=sleep)
    current = {}
    if st == 200 and isinstance(listing, list):
        current = {x["name"]: x["sha"] for x in listing if x.get("type") == "file"}
    elif st not in (200, 404):
        raise PublishError(f"GitHub error {st} listing {folder}/: {str(listing)[:160]}")
    # data and assets first, the page last, so a visitor never gets a page newer than its data
    order = sorted(files, key=lambda n: (n == "index.html", n != "data.json", n))
    for name in order:
        content = files[name]
        sha = current.get(name)
        if sha == blob_sha(content):
            unchanged.append(name)
            continue
        body = {"message": f"clips dashboard: {name}", "content": base64.b64encode(content).decode(), "branch": branch}
        if sha:
            body["sha"] = sha
        path = f"{folder}/{name}"
        st, out = _call("PUT", f"{API}/repos/{repo}/contents/{urllib.parse.quote(path)}", body, http=http, sleep=sleep)
        if st == 409 or (st == 422 and "sha" in json.dumps(out)):
            # someone else changed it meanwhile: refetch its sha and retry once
            st2, cur = _call("GET", f"{API}/repos/{repo}/contents/{urllib.parse.quote(path)}?ref={urllib.parse.quote(branch)}",
                             http=http, sleep=sleep)
            if st2 == 200:
                body["sha"] = cur.get("sha")
                st, out = _call("PUT", f"{API}/repos/{repo}/contents/{urllib.parse.quote(path)}", body, http=http,
                                sleep=sleep)
        if st not in (200, 201):
            msg = (out or {}).get("message", "")
            if st in (401, 403):
                raise PublishError(f"GitHub refused the upload ({st} {msg}); the token needs Contents: Read and write")
            raise PublishError(f"GitHub error {st} uploading {path}: {msg}")
        uploaded.append(name)
    return {"uploaded": uploaded, "unchanged": unchanged}
