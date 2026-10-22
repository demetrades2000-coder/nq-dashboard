"""
Keychain helpers shared by the uploaders: values too long for one OS keychain entry are split transparently.

Windows Credential Manager caps a secret at 2560 bytes, and keyring stores it as UTF-16, so anything over
1280 characters fails to save there. OAuth token JSON (Google in particular) can get close to or past that.
Long values are written as numbered parts plus a small header entry; short values are stored as before, so
existing keychain entries keep working unchanged.
"""

from __future__ import annotations

CHUNK = 1000  # characters per entry: 2000 bytes as UTF-16, under Windows' 2560-byte limit
HEADER = "money-clipper-chunked:v1:"


def _part(key: str, i: int) -> str:
    return f"{key}#part{i}"


def _parts_count(raw: str | None) -> int:
    if raw and raw.startswith(HEADER):
        try:
            return int(raw[len(HEADER):])
        except ValueError:
            return 0
    return 0


def get(kr, service: str, key: str) -> str | None:
    """The stored value, reassembled if it was split. None if missing or a part is lost. May raise like keyring."""
    raw = kr.get_password(service, key)
    n = _parts_count(raw)
    if not n:
        return raw
    parts = [kr.get_password(service, _part(key, i)) for i in range(n)]
    if any(p is None for p in parts):
        return None
    return "".join(parts)


def _delete_parts(kr, service: str, key: str, start: int, stop: int) -> None:
    for i in range(start, stop):
        try:
            kr.delete_password(service, _part(key, i))
        except Exception:  # noqa: BLE001  (already gone)
            pass


def save(kr, service: str, key: str, value: str) -> None:
    try:
        old = _parts_count(kr.get_password(service, key))
    except Exception:  # noqa: BLE001
        old = 0
    if len(value) <= CHUNK and not value.startswith(HEADER):
        kr.set_password(service, key, value)
        _delete_parts(kr, service, key, 0, old)
        return
    pieces = [value[i:i + CHUNK] for i in range(0, len(value), CHUNK)]
    for i, piece in enumerate(pieces):  # parts first, header last: the header never points at unwritten parts
        kr.set_password(service, _part(key, i), piece)
    kr.set_password(service, key, f"{HEADER}{len(pieces)}")
    _delete_parts(kr, service, key, len(pieces), old)


def delete(kr, service: str, key: str) -> None:
    """Remove the value and any parts. Raises like keyring's delete_password if nothing was stored."""
    try:
        n = _parts_count(kr.get_password(service, key))
    except Exception:  # noqa: BLE001
        n = 0
    _delete_parts(kr, service, key, 0, n)
    kr.delete_password(service, key)
