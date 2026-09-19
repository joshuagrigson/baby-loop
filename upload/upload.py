#!/usr/bin/env python3
"""
upload.py -- babyloop: publish one rendered video to OUR channel via the YouTube Data API v3.

Getting client_secret.json (one-time, about 5 minutes)
-------------------------------------------------------
  1. Google Cloud Console (https://console.cloud.google.com) -> create or select a project.
  2. APIs & Services -> Library -> search "YouTube Data API v3" -> Enable.
  3. APIs & Services -> OAuth consent screen -> User type: External -> app name + your
     email -> under "Test users" add your own Gmail (the account that owns the channel).
  4. APIs & Services -> Credentials -> Create credentials -> OAuth client ID ->
     Application type: Desktop app.
  5. Download the JSON and save it as  babyloop/upload/client_secret.json  (gitignored).

The first upload opens a browser to authorize; the token is cached at
upload/token.json (also gitignored) and refreshed automatically afterwards.
Gotcha: while the consent screen is in "Testing", Google expires the refresh
token after 7 days (you get invalid_grant and re-authorize). Switch the consent
screen to "In production" to stop that; for your own channel the "unverified
app" warning screen is fine to click through.

Usage
-----
    python upload.py <video.mp4> --meta <meta.json> [--thumbnail thumb.png]
                     [--privacy private|unlisted|public] [--publish-at 2026-10-01T13:00:00Z]
                     [--playlist <playlist id>] [--dry-run]

    meta.json:
    {
      "title": "Baby Sensory | Dancing Fruits | 1 Hour",
      "description": "...",
      "tags": ["baby sensory", "high contrast"],
      "categoryId": "27",           # 27 = Education (1 = Film & Animation, 10 = Music, 24 = Entertainment)
      "defaultLanguage": "en",
      "madeForKids": true           # default true; see the COPPA banner this script prints
    }
    Optional meta keys passed through: defaultAudioLanguage, containsSyntheticMedia,
    embeddable, license ("youtube" | "creativeCommon"), publicStatsViewable, recordingDate.

--dry-run validates the files and metadata and prints the exact request body
without contacting Google (and without needing the Google libraries installed).

Quota: videos.insert costs 1,600 units; the default daily quota is 10,000
units, so about 6 uploads per day per project. Thumbnail + playlist add 100.

Exit codes: 0 ok, 1 validation error, 2 Google libraries missing, 3 upload/API failure.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_CLIENT_SECRET = HERE / "client_secret.json"
DEFAULT_TOKEN = HERE / "token.json"
REQUIREMENTS = HERE / "requirements.txt"

# youtube.upload -> videos.insert; youtube.force-ssl -> thumbnails.set + playlistItems.insert.
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]

TITLE_MAX = 100
DESCRIPTION_MAX = 5000
TAGS_TOTAL_MAX = 500          # YouTube counts all tags together; tags with spaces count +2 (implicit quotes)
TAG_WARN_LEN = 30
THUMB_MAX_BYTES = 2 * 1024 * 1024
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".mpg", ".mpeg", ".wmv", ".flv", ".3gp"}
THUMB_EXTS = {".png", ".jpg", ".jpeg"}
KNOWN_CATEGORIES = {"1": "Film & Animation", "10": "Music", "15": "Pets & Animals", "22": "People & Blogs",
                    "24": "Entertainment", "26": "Howto & Style", "27": "Education"}
KNOWN_META_KEYS = {"title", "description", "tags", "categoryId", "defaultLanguage", "defaultAudioLanguage",
                   "madeForKids", "containsSyntheticMedia", "embeddable", "license", "publicStatsViewable",
                   "recordingDate"}
LANG_RE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")

MAX_RETRIES = 10
RETRIABLE_STATUS = {500, 502, 503, 504}


# ---------------------------------------------------------------------------
# output helpers
# ---------------------------------------------------------------------------

def info(msg: str = "") -> None:
    print(msg)
    sys.stdout.flush()


def warn(msg: str) -> None:
    print(f"  warning: {msg}", file=sys.stderr)
    sys.stderr.flush()


def die(msg: str, code: int = 1) -> "None":
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def mb(n_bytes: int) -> str:
    return f"{n_bytes / (1024 * 1024):.1f} MB"


def kids_banner(made_for_kids: bool) -> str:
    line = "=" * 78
    if made_for_kids:
        body = [
            "  MADE FOR KIDS: status.selfDeclaredMadeForKids = true",
            "",
            "  * Comments are DISABLED on made-for-kids videos (YouTube does this, not us).",
            "  * Personalized ads are OFF -> expect lower RPM; no notification bell, no",
            "    end-screen/info cards, no playlist save for viewers, no miniplayer.",
            "  * This declaration is a legal statement under COPPA. Content for babies and",
            "    toddlers IS 'directed to children'. Misdeclaring is an FTC / COPPA issue",
            "    (fines) and a YouTube policy violation. Do not flip it to false to get",
            "    comments or better ads.",
        ]
    else:
        body = [
            "  MADE FOR KIDS: status.selfDeclaredMadeForKids = FALSE",
            "",
            "  * You are declaring this video is NOT directed to children.",
            "  * babyloop content is made for babies/toddlers -- that is child-directed",
            "    content under COPPA. Declaring it 'not made for kids' to keep comments or",
            "    personalized ads is misdeclaration: an FTC / COPPA liability and a YouTube",
            "    policy violation. Only keep false if this specific video truly is not for",
            "    kids (e.g. a channel trailer aimed at parents).",
        ]
    return "\n".join([line] + body + [line])


# ---------------------------------------------------------------------------
# validation (pure: no Google calls)
# ---------------------------------------------------------------------------

def parse_publish_at(value: str) -> datetime:
    """Accept ISO 8601 with timezone (2026-10-01T13:00:00Z or +02:00); return aware UTC."""
    s = value.strip()
    if s.endswith("Z") or s.endswith("z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError as exc:
        raise ValueError(f"--publish-at must be ISO 8601, e.g. 2026-10-01T13:00:00Z (got {value!r})") from exc
    if dt.tzinfo is None:
        raise ValueError("--publish-at needs a timezone (append Z for UTC or an offset like -05:00)")
    return dt.astimezone(timezone.utc)


def tags_char_count(tags: list[str]) -> int:
    # YouTube wraps tags that contain spaces in quotes and counts the quotes.
    return sum(len(t) + (2 if " " in t else 0) for t in tags)


def validate(args) -> tuple[list[str], list[str], dict, dict]:
    """Return (errors, warnings, request_body, plan)."""
    errors: list[str] = []
    warnings: list[str] = []
    plan: dict = {}

    # -- video file ---------------------------------------------------------
    video = Path(args.video).expanduser()
    if not video.is_file():
        errors.append(f"video file not found: {video}")
        size = 0
    else:
        size = video.stat().st_size
        if size == 0:
            errors.append(f"video file is empty: {video}")
        if video.suffix.lower() not in VIDEO_EXTS:
            warnings.append(f"unusual video extension {video.suffix!r}; YouTube accepts mp4/mov/mkv/webm/avi/...")
    mime = mimetypes.guess_type(str(video))[0]
    if not mime or not mime.startswith("video/"):
        mime = "video/*"
    plan["video"] = {"path": str(video), "bytes": size, "mimetype": mime}

    # -- meta ---------------------------------------------------------------
    meta_path = Path(args.meta).expanduser()
    meta: dict = {}
    if not meta_path.is_file():
        errors.append(f"meta file not found: {meta_path}")
    else:
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"meta is not valid JSON: {exc}")
            meta = {}
        if not isinstance(meta, dict):
            errors.append("meta must be a JSON object")
            meta = {}
    unknown = sorted(set(meta) - KNOWN_META_KEYS)
    if unknown:
        warnings.append(f"ignoring unknown meta keys: {', '.join(unknown)}")

    title = meta.get("title")
    if not isinstance(title, str) or not title.strip():
        errors.append("meta.title is required (non-empty string)")
        title = ""
    else:
        title = title.strip()
        if len(title) > TITLE_MAX:
            errors.append(f"meta.title is {len(title)} chars; max {TITLE_MAX}")
        if "<" in title or ">" in title:
            errors.append("meta.title may not contain < or >")

    description = meta.get("description", "")
    if description is None:
        description = ""
    if not isinstance(description, str):
        errors.append("meta.description must be a string")
        description = ""
    else:
        if len(description) > DESCRIPTION_MAX:
            errors.append(f"meta.description is {len(description)} chars; max {DESCRIPTION_MAX}")
        if "<" in description or ">" in description:
            errors.append("meta.description may not contain < or >")
        if not description.strip():
            warnings.append("meta.description is empty")

    tags = meta.get("tags", [])
    if tags is None:
        tags = []
    if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
        errors.append("meta.tags must be a list of strings")
        tags = []
    else:
        cleaned = []
        for t in tags:
            t = " ".join(t.split())
            if t and t.lower() not in {c.lower() for c in cleaned}:
                cleaned.append(t)
        if len(cleaned) != len(tags):
            warnings.append(f"tags cleaned: {len(tags)} -> {len(cleaned)} (blank/duplicate removed)")
        tags = cleaned
        long_tags = [t for t in tags if len(t) > TAG_WARN_LEN]
        if long_tags:
            warnings.append(f"{len(long_tags)} tag(s) longer than {TAG_WARN_LEN} chars: {long_tags[:3]}")
        total = tags_char_count(tags)
        if total > TAGS_TOTAL_MAX:
            errors.append(f"tags total {total} chars (quotes counted for multi-word tags); max {TAGS_TOTAL_MAX}")
        if not tags:
            warnings.append("no tags given")

    category = meta.get("categoryId", "27")
    if isinstance(category, int):
        category = str(category)
    if not isinstance(category, str) or not category.isdigit():
        errors.append(f"meta.categoryId must be a numeric string like \"27\" (got {category!r})")
    elif category not in KNOWN_CATEGORIES:
        warnings.append(f"categoryId {category} is not one of the common ones {KNOWN_CATEGORIES}; make sure it is assignable in your region")

    language = meta.get("defaultLanguage", "en")
    if not isinstance(language, str) or not LANG_RE.match(language):
        errors.append(f"meta.defaultLanguage must be a BCP-47 code like \"en\" or \"en-US\" (got {language!r})")
    audio_language = meta.get("defaultAudioLanguage", language)
    if not isinstance(audio_language, str) or not LANG_RE.match(audio_language):
        errors.append(f"meta.defaultAudioLanguage must be a BCP-47 code (got {audio_language!r})")

    if "madeForKids" in meta:
        made_for_kids = meta["madeForKids"]
        if not isinstance(made_for_kids, bool):
            errors.append("meta.madeForKids must be true or false")
            made_for_kids = True
    else:
        made_for_kids = True
        warnings.append("meta.madeForKids missing -> defaulting to true (babyloop content is for babies)")

    status: dict = {"privacyStatus": args.privacy, "selfDeclaredMadeForKids": made_for_kids}
    for key in ("containsSyntheticMedia", "embeddable", "publicStatsViewable"):
        if key in meta:
            if isinstance(meta[key], bool):
                status[key] = meta[key]
            else:
                errors.append(f"meta.{key} must be true or false")
    if "license" in meta:
        if meta["license"] in ("youtube", "creativeCommon"):
            status["license"] = meta["license"]
        else:
            errors.append("meta.license must be \"youtube\" or \"creativeCommon\"")

    # -- schedule -----------------------------------------------------------
    publish_at = None
    if args.publish_at:
        try:
            publish_at = parse_publish_at(args.publish_at)
        except ValueError as exc:
            errors.append(str(exc))
        else:
            if publish_at <= datetime.now(timezone.utc):
                errors.append(f"--publish-at {publish_at.isoformat()} is in the past")
            if args.privacy != "private":
                errors.append("--publish-at requires --privacy private (YouTube flips it to public at that time)")
            status["publishAt"] = publish_at.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    # -- thumbnail ----------------------------------------------------------
    if args.thumbnail:
        thumb = Path(args.thumbnail).expanduser()
        if not thumb.is_file():
            errors.append(f"thumbnail not found: {thumb}")
        else:
            tsize = thumb.stat().st_size
            if thumb.suffix.lower() not in THUMB_EXTS:
                errors.append(f"thumbnail must be png/jpg (got {thumb.suffix!r})")
            if tsize > THUMB_MAX_BYTES:
                errors.append(f"thumbnail is {mb(tsize)}; YouTube max is 2 MB")
            if tsize == 0:
                errors.append("thumbnail file is empty")
            plan["thumbnail"] = {"path": str(thumb), "bytes": tsize,
                                 "mimetype": mimetypes.guess_type(str(thumb))[0] or "image/jpeg"}

    # -- playlist -----------------------------------------------------------
    if args.playlist:
        pid = args.playlist.strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]{10,}", pid):
            errors.append(f"--playlist does not look like a playlist id: {pid!r} (copy the list=... value from the URL)")
        plan["playlist"] = pid

    snippet: dict = {
        "title": title,
        "description": description,
        "tags": tags,
        "categoryId": category,
        "defaultLanguage": language,
        "defaultAudioLanguage": audio_language,
    }
    if "recordingDate" in meta:
        snippet_rd = meta["recordingDate"]
        if isinstance(snippet_rd, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}(T.*)?", snippet_rd):
            snippet["recordingDate"] = snippet_rd if "T" in snippet_rd else snippet_rd + "T00:00:00.000Z"
        else:
            errors.append("meta.recordingDate must be YYYY-MM-DD")
    body = {"snippet": snippet, "status": status}
    plan["notify_subscribers"] = not args.no_notify
    plan["made_for_kids"] = made_for_kids
    plan["publish_at"] = publish_at.isoformat() if publish_at else None
    return errors, warnings, body, plan


# ---------------------------------------------------------------------------
# Google plumbing (all imports lazy so --dry-run works without the libraries)
# ---------------------------------------------------------------------------

def missing_libs_message(exc: Exception) -> str:
    return (f"Google client libraries are not installed ({exc}).\n"
            f"Install them with:\n\n    python -m pip install -r {REQUIREMENTS}\n")


def get_youtube_service(client_secret: Path, token_path: Path, open_browser: bool = True):
    try:
        from google.auth.exceptions import RefreshError
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError as exc:
        die(missing_libs_message(exc), 2)

    creds = None
    if token_path.is_file():
        try:
            creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
        except (ValueError, OSError) as exc:
            warn(f"could not read {token_path} ({exc}); re-authorizing")
    if creds and not creds.has_scopes(SCOPES):
        warn("cached token lacks the scopes this script needs; re-authorizing")
        creds = None
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except RefreshError as exc:
            warn(f"token refresh failed ({exc}); re-authorizing. (Testing-mode consent screens expire tokens after 7 days.)")
            creds = None
    if not creds or not creds.valid:
        if not client_secret.is_file():
            die(f"{client_secret} not found. Follow the 5 steps in the docstring at the top of upload.py "
                f"to create an OAuth 'Desktop app' client and download its JSON to that path.", 1)
        flow = InstalledAppFlow.from_client_secrets_file(str(client_secret), SCOPES)
        info("Authorizing with Google (a browser window should open; sign in with the channel's account)...")
        creds = flow.run_local_server(port=0, open_browser=open_browser, prompt="consent",
                                      authorization_prompt_message="Open this URL to authorize:\n{url}\n")
        token_path.write_text(creds.to_json(), encoding="utf-8")
        try:
            os.chmod(token_path, 0o600)
        except OSError:
            pass
        info(f"Token saved to {token_path}")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def http_error_hint(err) -> str:
    """Turn a googleapiclient HttpError into something actionable."""
    status = getattr(getattr(err, "resp", None), "status", None)
    reasons = []
    try:
        for d in err.error_details or []:
            if isinstance(d, dict) and d.get("reason"):
                reasons.append(d["reason"])
    except Exception:
        pass
    reason = ",".join(reasons) or getattr(err, "reason", "") or ""
    hints = {
        "quotaExceeded": "daily API quota used up (videos.insert = 1,600 of 10,000 units). Try again after midnight Pacific or request more quota.",
        "uploadLimitExceeded": "the channel hit YouTube's upload limit for today; wait 24h.",
        "youtubeSignupRequired": "the Google account you authorized has no YouTube channel. Re-authorize with the channel's account (delete token.json).",
        "forbidden": "forbidden: check that the authorized account owns the channel and the OAuth client has the youtube.upload scope.",
        "invalidPublishAt": "publishAt rejected: must be a future RFC 3339 time and privacy must be private.",
        "invalidTitle": "title rejected (length or forbidden characters).",
        "invalidDescription": "description rejected (length or forbidden characters).",
        "invalidTags": "tags rejected (total length or a forbidden character).",
        "invalidCategoryId": "categoryId not assignable in your region; try 27 (Education) or 24 (Entertainment).",
        "mediaBodyRequired": "no media body was sent (internal bug - report it).",
        "invalidVideoMetadata": "video metadata rejected by YouTube; check title/description/tags.",
    }
    for key, hint in hints.items():
        if key in reason:
            return f"HTTP {status} {reason}: {hint}"
    return f"HTTP {status} {reason or err}"


def resumable_upload(request, total_bytes: int):
    """Drive a resumable MediaFileUpload with progress + exponential back-off."""
    import http.client
    import socket

    from googleapiclient.errors import HttpError
    try:
        import httplib2
        transport_errors: tuple = (httplib2.HttpLib2Error,)
    except ImportError:  # pragma: no cover
        transport_errors = ()
    retriable_exceptions = transport_errors + (
        IOError, socket.error, http.client.NotConnected, http.client.IncompleteRead,
        http.client.ImproperConnectionState, http.client.CannotSendRequest,
        http.client.CannotSendHeader, http.client.ResponseNotReady, http.client.BadStatusLine,
    )

    response = None
    retry = 0
    started = time.time()
    while response is None:
        error = None
        try:
            status, response = request.next_chunk()
            if status:
                done = int(status.resumable_progress)
                pct = 100.0 * done / total_bytes if total_bytes else 0.0
                elapsed = max(time.time() - started, 0.001)
                rate = done / elapsed / (1024 * 1024)
                print(f"\r  uploading {pct:5.1f}%  {mb(done)} / {mb(total_bytes)}  {rate:.1f} MB/s   ", end="", flush=True)
        except HttpError as exc:
            if exc.resp.status in RETRIABLE_STATUS:
                error = f"HTTP {exc.resp.status}: {exc.content[:200]!r}"
            else:
                print()
                die(f"upload failed: {http_error_hint(exc)}", 3)
        except retriable_exceptions as exc:
            error = f"{type(exc).__name__}: {exc}"

        if error:
            retry += 1
            if retry > MAX_RETRIES:
                print()
                die(f"upload failed after {MAX_RETRIES} retries: {error}", 3)
            sleep_s = min(64.0, (2 ** retry) + random.uniform(0, 1))
            print(f"\n  transient error ({error}); retry {retry}/{MAX_RETRIES} in {sleep_s:.0f}s", flush=True)
            time.sleep(sleep_s)
    print(f"\r  uploading 100.0%  {mb(total_bytes)} / {mb(total_bytes)}                    ")
    return response


def do_upload(args, body: dict, plan: dict) -> dict:
    try:
        from googleapiclient.errors import HttpError
        from googleapiclient.http import MediaFileUpload
    except ImportError as exc:
        die(missing_libs_message(exc), 2)

    youtube = get_youtube_service(Path(args.client_secret).expanduser(), Path(args.token).expanduser(),
                                  open_browser=not args.no_browser)
    video = plan["video"]
    chunk = int(args.chunk_mb) * 1024 * 1024
    media = MediaFileUpload(video["path"], mimetype=video["mimetype"], chunksize=chunk, resumable=True)
    info(f"Uploading {video['path']} ({mb(video['bytes'])}) as {args.privacy}...")
    request = youtube.videos().insert(
        part="snippet,status", body=body, media_body=media, notifySubscribers=plan["notify_subscribers"])
    response = resumable_upload(request, video["bytes"])

    video_id = response.get("id")
    if not video_id:
        die(f"upload returned no video id: {json.dumps(response)[:500]}", 3)
    result = {
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "studio_url": f"https://studio.youtube.com/video/{video_id}/edit",
        "upload_status": (response.get("status") or {}).get("uploadStatus"),
        "privacy": (response.get("status") or {}).get("privacyStatus"),
        "publish_at": (response.get("status") or {}).get("publishAt"),
        "made_for_kids": (response.get("status") or {}).get("selfDeclaredMadeForKids"),
        "uploaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "thumbnail": None,
        "playlist_item_id": None,
    }
    info(f"Uploaded: video id {video_id} (upload status: {result['upload_status']})")

    if plan.get("thumbnail"):
        t = plan["thumbnail"]
        try:
            youtube.thumbnails().set(videoId=video_id, media_body=MediaFileUpload(t["path"], mimetype=t["mimetype"])).execute()
            result["thumbnail"] = "set"
            info(f"Thumbnail set from {t['path']}")
        except HttpError as exc:
            result["thumbnail"] = f"failed: {http_error_hint(exc)}"
            warn(f"thumbnail not set: {http_error_hint(exc)}")
            if getattr(exc.resp, "status", None) == 403:
                warn("custom thumbnails need a phone-verified channel: https://www.youtube.com/verify")

    if plan.get("playlist"):
        try:
            item = youtube.playlistItems().insert(
                part="snippet",
                body={"snippet": {"playlistId": plan["playlist"],
                                  "resourceId": {"kind": "youtube#video", "videoId": video_id}}},
            ).execute()
            result["playlist_item_id"] = item.get("id")
            info(f"Added to playlist {plan['playlist']}")
        except HttpError as exc:
            result["playlist_item_id"] = f"failed: {http_error_hint(exc)}"
            warn(f"playlist insert failed: {http_error_hint(exc)}")
    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Upload a babyloop render to YouTube (Data API v3, resumable).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=("examples:\n"
                "  python upload.py out/dancing-fruits-1h.mp4 --meta out/dancing-fruits-1h.meta.json --dry-run\n"
                "  python upload.py out/dancing-fruits-1h.mp4 --meta out/dancing-fruits-1h.meta.json "
                "--thumbnail out/dancing-fruits-1h.png --privacy private --publish-at 2026-10-01T13:00:00Z\n"),
    )
    p.add_argument("video", help="rendered video file (mp4/mov/mkv/webm)")
    p.add_argument("--meta", required=True, help="JSON with title, description, tags, categoryId, defaultLanguage, madeForKids")
    p.add_argument("--thumbnail", help="png/jpg under 2 MB (needs a phone-verified channel)")
    p.add_argument("--privacy", choices=("private", "unlisted", "public"), default="private",
                   help="privacy status (default private)")
    p.add_argument("--publish-at", help="schedule: ISO 8601 with timezone, e.g. 2026-10-01T13:00:00Z (requires --privacy private)")
    p.add_argument("--playlist", help="playlist id to add the video to (the list=... value)")
    p.add_argument("--dry-run", action="store_true", help="validate and print the request body; do not contact Google")
    p.add_argument("--no-notify", action="store_true", help="do not send the 'new video' notification to subscribers")
    p.add_argument("--client-secret", default=str(DEFAULT_CLIENT_SECRET), help=f"OAuth client JSON (default {DEFAULT_CLIENT_SECRET})")
    p.add_argument("--token", default=str(DEFAULT_TOKEN), help=f"cached OAuth token (default {DEFAULT_TOKEN})")
    p.add_argument("--no-browser", action="store_true", help="print the auth URL instead of opening a browser")
    p.add_argument("--chunk-mb", type=int, default=16, help="resumable upload chunk size in MB (default 16)")
    p.add_argument("--save-result", metavar="PATH", help="write a JSON record of the upload (id, url, status) here")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.chunk_mb < 1:
        die("--chunk-mb must be >= 1")

    errors, warnings, body, plan = validate(args)

    info("babyloop upload" + ("  --  DRY RUN (nothing is sent to Google)" if args.dry_run else ""))
    info(f"  video:      {plan['video']['path']}  ({mb(plan['video']['bytes'])}, {plan['video']['mimetype']})")
    info(f"  meta:       {args.meta}")
    info(f"  thumbnail:  {plan['thumbnail']['path'] + '  (' + mb(plan['thumbnail']['bytes']) + ')' if plan.get('thumbnail') else '(none)'}")
    info(f"  privacy:    {args.privacy}" + (f"  -> public at {plan['publish_at']}" if plan.get("publish_at") else ""))
    info(f"  playlist:   {plan.get('playlist') or '(none)'}")
    info(f"  notify:     {'yes' if plan['notify_subscribers'] else 'no'}")
    info("  request:    youtube.videos().insert(part=\"snippet,status\", notifySubscribers="
         f"{plan['notify_subscribers']}, media_body=<resumable {mb(plan['video']['bytes'])}>)")
    info("  body:")
    for line in json.dumps(body, indent=2, ensure_ascii=False).splitlines():
        info("    " + line)
    for w in warnings:
        warn(w)
    info()
    info(kids_banner(plan["made_for_kids"]))
    info()

    if errors:
        for e in errors:
            print(f"  ERROR: {e}", file=sys.stderr)
        die(f"{len(errors)} validation error(s); nothing uploaded.", 1)

    if args.dry_run:
        info("Dry run OK: files and metadata validated. Remove --dry-run to upload.")
        return 0

    result = do_upload(args, body, plan)
    info()
    info(f"Done: {result['url']}")
    info(f"Studio: {result['studio_url']}")
    if result.get("publish_at"):
        info(f"Scheduled to go public at {result['publish_at']} (stays private until then).")
    elif args.privacy != "public":
        info(f"Video is {args.privacy}; flip it in Studio when ready.")
    if args.save_result:
        out = Path(args.save_result).expanduser()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        info(f"Result saved to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
