#!/usr/bin/env python3
"""
scrape_channel.py -- babyloop competitive research: METADATA-ONLY YouTube channel scraper.

Collects public metadata (titles, ids, view counts, durations, upload dates,
descriptions, tags, thumbnail URLs, like counts) for every video on one or more
channels, so we can study *formats* -- lengths, cadence, title patterns, tags.

    THIS SCRIPT NEVER DOWNLOADS VIDEO OR AUDIO. That is deliberate.
    Re-uploading (or "remixing") another channel's media is copyright
    infringement and would get the babyloop channel struck. We analyze how
    successful channels structure their catalog; we do not copy their media.
    Every yt-dlp call below runs with skip_download/simulate and
    extract_info(download=False). Do not "fix" that.

Usage
-----
    python scrape_channel.py <channel_url_or_handle> [<more channels> ...]
                             [--deep] [--limit N] [--tabs videos,shorts]
                             [--out research/data/<slug>.json]

    # Fast: one listing request per channel tab (titles, ids, durations, views,
    # approximate upload dates). Good for a first look.
    python scrape_channel.py https://www.youtube.com/@HeyBear/videos

    # Deep: also fetch the full watch page for each video (exact upload date,
    # tags, categories, like count, description, resolution). ~1-2 s per video.
    python scrape_channel.py @HeyBear --deep --limit 200

    # Several channels at once; --out is treated as a directory.
    python scrape_channel.py @HeyBear @MissRachel UCtf9cFBJkHVAf2qMqF01xYg --deep --out research/data/

Accepted channel forms: @handle, handle, UC... channel id, or any youtube.com
channel URL (with or without /videos, /shorts, /streams, /featured).

Output
------
    <out>.json  {"_meta": {...channel + run info...}, "videos": [ {normalized video}, ... ]}
    <out>.csv   same videos, flat columns (tags/categories joined with "|")

Normalized video keys:
    id, title, url, upload_date (YYYY-MM-DD or null), upload_date_approx (bool),
    duration_s, view_count, like_count, comment_count, description, tags,
    categories, thumbnail, is_short, width, height, channel, channel_id,
    channel_handle, live_status, availability, source_tab, deep

is_short: true for anything listed under the Shorts tab (or a /shorts/ URL);
false for the Videos/Streams tabs (YouTube lists Shorts only under Shorts);
when the tab is unknown, true if <= 180 s and vertical (or orientation unknown).
Use --tabs videos,shorts to include the Shorts tab; the default is videos only.

Notes
-----
* Without --deep, YouTube's listing gives *relative* dates ("3 years ago"), so
  upload_date is approximate (upload_date_approx = true). Run --deep before
  trusting cadence / weekday analysis.
* Members-only, private, premium-only and not-yet-premiered videos are skipped.
* If YouTube answers "Sign in to confirm you're not a bot", slow down
  (--sleep-min/--sleep-max) or pass --cookies-from-browser firefox|chrome.
* Exit codes: 0 ok, 1 one or more channels failed, 2 yt-dlp not installed.

Run `python scrape_channel.py --selftest` to exercise the normalizer offline.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    import yt_dlp  # noqa: F401  (imported here only to fail fast with a helpful message)
    from yt_dlp.utils import DownloadError, ExtractorError
except ImportError:  # pragma: no cover - exercised only on machines without yt-dlp
    if "--selftest" not in sys.argv:
        sys.stderr.write(
            "scrape_channel.py needs yt-dlp (the Python library).\n"
            "Install it with:\n\n    python -m pip install -U yt-dlp\n\n"
        )
        sys.exit(2)
    yt_dlp = None  # type: ignore[assignment]

    class DownloadError(Exception):  # type: ignore[no-redef]
        pass

    class ExtractorError(Exception):  # type: ignore[no-redef]
        pass


TOOL_NAME = "babyloop scrape_channel.py"
TOOL_VERSION = "0.1"
DEFAULT_LIMIT = 200
DEFAULT_TABS = "videos"
VALID_TABS = ("videos", "shorts", "streams")
SHORT_MAX_SECONDS = 180

# Honest User-Agent: says who we are and that we are a metadata scraper.
# Pass --ua default to fall back to yt-dlp's built-in browser-like UA if YouTube
# ever starts rejecting this one.
DEFAULT_UA = "babyloop-research/{v} (metadata-only channel research; yt-dlp/{ytv})"

# Availability values (yt-dlp vocabulary) we never keep: nothing to analyze, and
# in the members-only case the metadata is not even public.
SKIP_AVAILABILITY = {"private", "subscriber_only", "premium_only", "needs_auth"}
SKIP_LIVE_STATUS = {"is_upcoming"}

# Error messages that mean "this video will never work" -> skip, don't retry.
PERMANENT_ERROR_RE = re.compile(
    r"(members[- ]only|join this channel|private video|video unavailable|"
    r"this video is unavailable|has been removed|no longer available|"
    r"account associated with this video has been terminated|premieres? in|"
    r"this live event will begin|sign in to confirm your age|age[- ]restricted|"
    r"not available in your country|video is not available|is not a valid url|"
    r"unsupported url|incomplete youtube id)",
    re.IGNORECASE,
)
# Bot check / rate limiting -> long back-off, then give up on deep for the run.
RATE_LIMIT_RE = re.compile(r"(not a bot|429|too many requests|rate[- ]?limit)", re.IGNORECASE)


# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------

def eprint(*args, **kwargs) -> None:
    print(*args, file=sys.stderr, **kwargs)
    sys.stderr.flush()


def int_or_none(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None


def slugify(text: str) -> str:
    text = (text or "").strip().lstrip("@").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "channel"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class QuietLogger:
    """Collects yt-dlp's warnings/errors instead of spamming the terminal.

    yt-dlp calls .debug() for ordinary progress lines as well as real debug
    output (prefixed "[debug] "), so we drop those unless --verbose.
    """

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.last_error: str | None = None
        self.warnings: list[str] = []

    def debug(self, msg: str) -> None:
        if self.verbose:
            eprint(f"    {msg}")

    def info(self, msg: str) -> None:
        if self.verbose:
            eprint(f"    {msg}")

    def warning(self, msg: str) -> None:
        self.warnings.append(msg)
        if self.verbose:
            eprint(f"    warning: {msg}")

    def error(self, msg: str) -> None:
        self.last_error = msg
        if self.verbose:
            eprint(f"    error: {msg}")


# ---------------------------------------------------------------------------
# channel input parsing
# ---------------------------------------------------------------------------

_TAB_SUFFIX_RE = re.compile(
    r"/(videos|shorts|streams|live|featured|playlists|community|posts|about|podcasts|releases|store|channels)/?$",
    re.IGNORECASE,
)


def normalize_channel_input(raw: str) -> tuple[str, str]:
    """Return (base_channel_url, fallback_slug) for a handle, channel id or URL.

    The base URL never ends in a tab; tab URLs are built from it.
    """
    s = raw.strip()
    if not s:
        raise ValueError("empty channel argument")

    if re.fullmatch(r"UC[0-9A-Za-z_-]{22}", s):
        return f"https://www.youtube.com/channel/{s}", s.lower()
    if s.startswith("@"):
        return f"https://www.youtube.com/{s}", slugify(s)
    if not re.match(r"^[a-z]+://", s, re.IGNORECASE):
        if "youtube.com/" in s or "youtu.be/" in s:
            s = "https://" + s
        else:
            # bare handle without the @
            return f"https://www.youtube.com/@{s}", slugify(s)

    parts = urlparse(s)
    host = parts.netloc.lower()
    if not any(h in host for h in ("youtube.com", "youtu.be", "youtube-nocookie.com")):
        raise ValueError(f"not a YouTube URL: {raw}")

    path = parts.path.rstrip("/")
    path = _TAB_SUFFIX_RE.sub("", path)
    if not path or path == "/":
        raise ValueError(f"no channel in URL: {raw}")

    # Video / watch URLs are not channels.
    if path.startswith("/watch") or path.startswith("/shorts/") or host == "youtu.be":
        raise ValueError(f"that is a video URL, not a channel: {raw}")

    base = f"https://www.youtube.com{path}"
    segments = [p for p in path.split("/") if p]
    if segments[0].startswith("@"):
        slug = slugify(segments[0])
    elif segments[0] in ("channel", "c", "user") and len(segments) > 1:
        slug = slugify(segments[1])
    else:
        slug = slugify(segments[-1])
    return base, slug


# ---------------------------------------------------------------------------
# normalization of yt-dlp dicts -> our schema
# ---------------------------------------------------------------------------

def iso_upload_date(raw: dict) -> str | None:
    """YYYY-MM-DD from upload_date (YYYYMMDD) or a unix timestamp; else None."""
    ud = raw.get("upload_date")
    if ud and re.fullmatch(r"\d{8}", str(ud)):
        ud = str(ud)
        return f"{ud[:4]}-{ud[4:6]}-{ud[6:]}"
    for key in ("timestamp", "release_timestamp"):
        ts = raw.get(key)
        if isinstance(ts, (int, float)) and not isinstance(ts, bool) and ts > 0:
            try:
                return datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()
            except (OverflowError, OSError, ValueError):
                continue
    return None


def best_thumbnail(raw: dict) -> str | None:
    if raw.get("thumbnail"):
        return raw["thumbnail"]
    thumbs = raw.get("thumbnails") or []
    best, best_area = None, -1
    for t in thumbs:
        if not isinstance(t, dict) or not t.get("url"):
            continue
        area = (int_or_none(t.get("width")) or 0) * (int_or_none(t.get("height")) or 0)
        # Prefer the largest; if sizes unknown, the last entry (yt-dlp sorts ascending).
        if area >= best_area:
            best, best_area = t["url"], area
    if best:
        return best
    vid = raw.get("id")
    return f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg" if vid else None


def compute_is_short(duration_s, width, height, url: str | None, source_tab: str | None) -> bool:
    """Shorts tab / shorts URL is authoritative. YouTube lists Shorts *only* under
    the Shorts tab, so anything from the Videos or Streams tab is long-form even
    when it is under 3 minutes. The duration+orientation rule is the fallback for
    entries whose tab we do not know (playlists, hand-made fixtures)."""
    if source_tab == "shorts" or (url and "/shorts/" in url):
        return True
    if source_tab in ("videos", "streams"):
        return False
    if duration_s is None or duration_s > SHORT_MAX_SECONDS:
        return False
    if width and height:
        return height > width  # vertical
    return True  # <= 3 min and orientation unknown


def dimensions(raw: dict) -> tuple[int | None, int | None]:
    """Top-level width/height, else the largest pair found in the formats list.
    (Without a JS runtime yt-dlp may leave the top-level fields empty even though
    the formats carry resolutions.)"""
    width, height = int_or_none(raw.get("width")), int_or_none(raw.get("height"))
    if width and height:
        return width, height
    best = (0, 0)
    for f in raw.get("formats") or []:
        if not isinstance(f, dict):
            continue
        w, h = int_or_none(f.get("width")), int_or_none(f.get("height"))
        if w and h and w * h > best[0] * best[1]:
            best = (w, h)
    return (best if best[0] else (width, height))


def skip_reason(raw: dict) -> str | None:
    """Why we would not keep this entry, or None to keep it."""
    if not raw or not raw.get("id"):
        return "no_id"
    avail = raw.get("availability")
    if avail in SKIP_AVAILABILITY:
        return avail
    if raw.get("live_status") in SKIP_LIVE_STATUS:
        return raw["live_status"]
    return None


def normalize_entry(raw: dict, *, deep: bool, source_tab: str | None = None,
                    channel_ctx: dict | None = None) -> dict:
    """Map a yt-dlp info dict (flat or full) onto the babyloop schema."""
    channel_ctx = channel_ctx or {}
    vid = raw.get("id")
    url = raw.get("webpage_url") or raw.get("url") or ""
    if not url.startswith("http"):
        url = f"https://www.youtube.com/watch?v={vid}"
    elif "/watch?v=" not in url and "/shorts/" not in url:
        url = f"https://www.youtube.com/watch?v={vid}"

    duration_s = int_or_none(raw.get("duration"))
    width, height = dimensions(raw)
    upload_date = iso_upload_date(raw)

    tags = raw.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    categories = raw.get("categories") or []
    if isinstance(categories, str):
        categories = [categories]

    handle = raw.get("uploader_id") or channel_ctx.get("channel_handle")
    if handle and not str(handle).startswith("@"):
        handle = None  # old-style uploader ids are not handles

    return {
        "id": vid,
        "title": (raw.get("title") or "").strip(),
        "url": url,
        "upload_date": upload_date,
        # Flat listings only know "3 years ago" -> approximate. Full extraction is exact.
        "upload_date_approx": bool(upload_date) and not deep,
        "duration_s": duration_s,
        "view_count": int_or_none(raw.get("view_count")),
        "like_count": int_or_none(raw.get("like_count")),
        "comment_count": int_or_none(raw.get("comment_count")),
        "description": raw.get("description") or "",
        "tags": [str(t) for t in tags],
        "categories": [str(c) for c in categories],
        "thumbnail": best_thumbnail(raw),
        "is_short": compute_is_short(duration_s, width, height, url, source_tab),
        "width": width,
        "height": height,
        "channel": raw.get("channel") or raw.get("uploader") or channel_ctx.get("channel"),
        "channel_id": raw.get("channel_id") or channel_ctx.get("channel_id"),
        "channel_handle": handle,
        "live_status": raw.get("live_status"),
        "availability": raw.get("availability"),
        "source_tab": source_tab,
        "deep": bool(deep),
    }


def merge_flat_and_deep(flat: dict, deep: dict) -> dict:
    """Deep values win, but keep flat values where deep is empty/None."""
    out = dict(flat)
    for k, v in deep.items():
        if v is None or v == "" or v == []:
            continue
        out[k] = v
    out["deep"] = True
    out["upload_date_approx"] = False if deep.get("upload_date") else flat.get("upload_date_approx", False)
    out["source_tab"] = flat.get("source_tab") or deep.get("source_tab")
    out["is_short"] = compute_is_short(out.get("duration_s"), out.get("width"), out.get("height"),
                                       out.get("url"), out.get("source_tab"))
    return out


# ---------------------------------------------------------------------------
# yt-dlp plumbing
# ---------------------------------------------------------------------------

def base_ydl_opts(args, logger: QuietLogger) -> dict:
    ua = args.ua
    if ua == "default":
        headers = {}
    else:
        ytv = getattr(getattr(yt_dlp, "version", None), "__version__", "unknown") if yt_dlp else "unknown"
        headers = {"User-Agent": ua.format(v=TOOL_VERSION, ytv=ytv)}
    opts = {
        # --- metadata only, never media --------------------------------------
        "skip_download": True,
        "simulate": True,
        "writethumbnail": False,
        "writeinfojson": False,
        "writesubtitles": False,
        "writeautomaticsub": False,
        "getcomments": False,
        # ---------------------------------------------------------------------
        "quiet": True,
        "no_warnings": not args.verbose,
        "noprogress": True,
        "logger": logger,
        "http_headers": headers,
        "socket_timeout": 30,
        "retries": 3,
        "extractor_retries": 3,
        "sleep_interval_requests": args.request_sleep,
        "ignore_no_formats_error": True,  # keep metadata even when no playable formats
        "check_formats": False,
        "noplaylist": False,
        "extractor_args": {
            # Flat listings only carry "3 years ago"; ask yt-dlp to turn that into
            # an approximate timestamp so cadence analysis works without --deep.
            "youtubetab": {"approximate_date": ["true"]},
        },
    }
    if args.cookies:
        opts["cookiefile"] = args.cookies
    if args.cookies_from_browser:
        opts["cookiesfrombrowser"] = (args.cookies_from_browser,)
    return opts


def list_tab_flat(base_url: str, tab: str, args, logger: QuietLogger) -> tuple[dict, list[dict]]:
    """One flat extraction of a channel tab. Returns (channel_info, raw_entries)."""
    opts = base_ydl_opts(args, logger)
    opts.update({
        "extract_flat": "in_playlist",
        "lazy_playlist": False,
        "ignoreerrors": False,
    })
    if args.limit and args.limit > 0:
        opts["playlist_items"] = f"1:{args.limit}"
    url = f"{base_url}/{tab}"
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    if not info:
        return {}, []
    entries = info.get("entries") or []
    entries = [e for e in entries if isinstance(e, dict)]
    channel_info = {
        "channel": info.get("channel") or info.get("uploader") or info.get("title"),
        "channel_id": info.get("channel_id"),
        "channel_handle": info.get("uploader_id") if str(info.get("uploader_id") or "").startswith("@") else None,
        "channel_url": info.get("channel_url") or info.get("uploader_url"),
        "subscriber_count": int_or_none(info.get("channel_follower_count")),
        "channel_description": info.get("description"),
        "channel_tags": info.get("tags") or [],
        "tab_video_count": int_or_none(info.get("playlist_count")),
    }
    return channel_info, entries


class DeepAborted(Exception):
    """Raised when YouTube keeps rate-limiting us; the run continues with flat data."""


def fetch_deep(video_url: str, args, logger: QuietLogger, state: dict) -> tuple[dict | None, str | None]:
    """Full metadata for one video.

    Returns (info, None) on success, (None, reason) when the video should be
    skipped, (None, "flat_fallback") when we could not get deep data but the
    flat entry is still usable. Raises DeepAborted when the bot-check/rate limit
    keeps firing.
    """
    opts = base_ydl_opts(args, logger)
    opts.update({"extract_flat": False, "ignoreerrors": False, "noplaylist": True})
    attempt = 0
    while True:
        attempt += 1
        logger.last_error = None
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
            if info:
                state["consecutive_rate_limits"] = 0
                return info, None
            msg = logger.last_error or "empty result"
        except (DownloadError, ExtractorError) as exc:
            msg = str(exc)
        except Exception as exc:  # network stack surprises, JSON decode errors, ...
            msg = f"{type(exc).__name__}: {exc}"

        if PERMANENT_ERROR_RE.search(msg):
            return None, "unavailable"
        if RATE_LIMIT_RE.search(msg):
            state["consecutive_rate_limits"] = state.get("consecutive_rate_limits", 0) + 1
            if state["consecutive_rate_limits"] >= 3:
                eprint(f"    YouTube keeps rate-limiting/bot-checking us: {msg.strip()[:160]}")
                raise DeepAborted(msg)
            wait = 60 * state["consecutive_rate_limits"]
            eprint(f"    rate limited ({msg.strip()[:80]}); sleeping {wait}s before retrying")
            time.sleep(wait)
            continue
        if attempt <= args.retries:
            wait = min(30.0, (2 ** attempt) + random.uniform(0, 1))
            if args.verbose:
                eprint(f"    transient error (attempt {attempt}/{args.retries}): {msg.strip()[:120]}; retry in {wait:.0f}s")
            time.sleep(wait)
            continue
        eprint(f"    giving up on deep metadata for {video_url}: {msg.strip()[:160]}")
        return None, "flat_fallback"


# ---------------------------------------------------------------------------
# per-channel driver
# ---------------------------------------------------------------------------

def scrape_channel(raw_input: str, args, logger: QuietLogger) -> dict:
    base_url, fallback_slug = normalize_channel_input(raw_input)
    tabs = [t.strip().lower() for t in args.tabs.split(",") if t.strip()]
    for t in tabs:
        if t not in VALID_TABS:
            raise ValueError(f"unknown tab '{t}' (valid: {', '.join(VALID_TABS)})")

    skipped: dict[str, int] = {}
    channel_info: dict = {}
    flat_by_id: dict[str, dict] = {}
    tab_errors: dict[str, str] = {}

    for tab in tabs:
        try:
            info, entries = list_tab_flat(base_url, tab, args, logger)
        except (DownloadError, ExtractorError) as exc:
            msg = str(exc)
            # A channel with no Shorts tab (or no live streams) is normal, not fatal.
            if tab != "videos" and re.search(r"(does not have a|tab|not found|404)", msg, re.IGNORECASE):
                tab_errors[tab] = "no such tab"
                continue
            raise
        for k, v in info.items():
            if v not in (None, "", []) and not channel_info.get(k):
                channel_info[k] = v
        for raw in entries:
            reason = skip_reason(raw)
            if reason:
                skipped[reason] = skipped.get(reason, 0) + 1
                continue
            vid = raw["id"]
            if vid in flat_by_id:
                continue
            flat_by_id[vid] = normalize_entry(raw, deep=False, source_tab=tab, channel_ctx=channel_info)

    videos = list(flat_by_id.values())
    if args.limit and args.limit > 0:
        videos = videos[: args.limit]

    deep_ok = 0
    deep_aborted = False
    if args.deep and videos:
        eprint(f"  deep pass: {len(videos)} videos, {args.sleep_min:.1f}-{args.sleep_max:.1f}s between requests")
        state: dict = {}
        merged: list[dict] = []
        for i, flat in enumerate(videos, 1):
            if deep_aborted:
                merged.append(flat)
                continue
            if i > 1:
                time.sleep(random.uniform(args.sleep_min, args.sleep_max))
            try:
                info, why = fetch_deep(flat["url"], args, logger, state)
            except DeepAborted:
                deep_aborted = True
                eprint("  deep pass aborted; remaining videos keep their flat metadata. "
                       "Re-run later, slower, or with --cookies-from-browser.")
                merged.append(flat)
                continue
            if info:
                reason = skip_reason(info)
                if reason:
                    skipped[reason] = skipped.get(reason, 0) + 1
                    status = f"skip ({reason})"
                else:
                    merged.append(merge_flat_and_deep(flat, normalize_entry(info, deep=True, source_tab=flat.get("source_tab"), channel_ctx=channel_info)))
                    deep_ok += 1
                    status = "ok"
                    if not channel_info.get("channel_id") and info.get("channel_id"):
                        channel_info["channel_id"] = info["channel_id"]
                    if not channel_info.get("channel_handle") and str(info.get("uploader_id") or "").startswith("@"):
                        channel_info["channel_handle"] = info["uploader_id"]
                    if not channel_info.get("subscriber_count") and info.get("channel_follower_count"):
                        channel_info["subscriber_count"] = int_or_none(info.get("channel_follower_count"))
            elif why == "flat_fallback":
                merged.append(flat)
                status = "flat only"
            else:
                skipped[why or "unavailable"] = skipped.get(why or "unavailable", 0) + 1
                status = f"skip ({why})"
            title = (flat.get("title") or "")[:48]
            eprint(f"  [{i:>4}/{len(videos)}] {flat['id']}  {title:<48}  {status}")
        videos = merged

    slug = slugify(channel_info.get("channel_handle") or "") or fallback_slug
    meta = {
        "tool": f"{TOOL_NAME} v{TOOL_VERSION}",
        "yt_dlp_version": getattr(getattr(yt_dlp, "version", None), "__version__", None) if yt_dlp else None,
        "scraped_at": utc_now_iso(),
        "input": raw_input,
        "channel_base_url": base_url,
        "channel": channel_info.get("channel"),
        "channel_id": channel_info.get("channel_id"),
        "channel_handle": channel_info.get("channel_handle"),
        "channel_url": channel_info.get("channel_url"),
        "subscriber_count": channel_info.get("subscriber_count"),
        "channel_description": channel_info.get("channel_description"),
        "channel_tags": channel_info.get("channel_tags") or [],
        "tabs": tabs,
        "tabs_missing": tab_errors,
        "deep": bool(args.deep),
        "deep_ok": deep_ok,
        "deep_aborted": deep_aborted,
        "limit": args.limit,
        "video_count": len(videos),
        "skipped": skipped,
        "note": "Public metadata only. No video or audio was downloaded (deliberate: analysis, not copying).",
    }
    return {"slug": slug, "_meta": meta, "videos": videos}


# ---------------------------------------------------------------------------
# output
# ---------------------------------------------------------------------------

CSV_COLUMNS = [
    "id", "title", "url", "upload_date", "upload_date_approx", "duration_s", "duration_hms",
    "view_count", "like_count", "comment_count", "is_short", "width", "height",
    "tags", "categories", "thumbnail", "channel", "channel_id", "channel_handle",
    "live_status", "source_tab", "deep", "description",
]


def hms(seconds) -> str:
    if seconds is None:
        return ""
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def write_outputs(result: dict, json_path: Path) -> Path:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"_meta": result["_meta"], "videos": result["videos"]}
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    csv_path = json_path.with_suffix(".csv")
    with csv_path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        w.writeheader()
        for v in result["videos"]:
            row = dict(v)
            row["duration_hms"] = hms(v.get("duration_s"))
            row["tags"] = "|".join(v.get("tags") or [])
            row["categories"] = "|".join(v.get("categories") or [])
            desc = (v.get("description") or "").replace("\r", "")
            row["description"] = " / ".join(line.strip() for line in desc.split("\n") if line.strip())
            w.writerow(row)
    return csv_path


def summarize(result: dict, json_path: Path, csv_path: Path) -> str:
    meta, videos = result["_meta"], result["videos"]
    name = meta.get("channel_handle") or meta.get("channel") or meta.get("input")
    dates = sorted(v["upload_date"] for v in videos if v.get("upload_date"))
    durations = sorted(v["duration_s"] for v in videos if v.get("duration_s") is not None)
    views = [v["view_count"] for v in videos if v.get("view_count") is not None]
    med_dur = hms(durations[len(durations) // 2]) if durations else "n/a"
    span = f"{dates[0]} -> {dates[-1]}" if dates else "dates unknown"
    approx = sum(1 for v in videos if v.get("upload_date_approx"))
    mode = "deep" if meta.get("deep") else "flat"
    if meta.get("deep") and meta.get("deep_ok") != len(videos):
        mode = f"deep {meta.get('deep_ok')}/{len(videos)}"
    bits = [
        f"{name}: {len(videos)} videos ({mode})",
        span + (" (approx)" if approx and not meta.get("deep") else ""),
        f"median {med_dur}",
        f"{sum(views):,} total views" if views else "views n/a",
    ]
    if meta.get("skipped"):
        bits.append("skipped " + ", ".join(f"{k}={n}" for k, n in sorted(meta["skipped"].items())))
    bits.append(f"-> {json_path} (+{csv_path.name})")
    return " | ".join(bits)


# ---------------------------------------------------------------------------
# self-test (offline): feed yt-dlp-shaped dicts through the normalizer
# ---------------------------------------------------------------------------

def _selftest() -> int:
    import tempfile

    flat_entry = {  # what YoutubeTabIE._extract_video emits with approximate_date on
        "_type": "url", "ie_key": "Youtube", "id": "dQw4w9WgXcQ",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "title": "Baby Sensory | Dancing Fruits | 1 Hour", "description": "High contrast fun...",
        "duration": 3605, "channel_id": "UCtf9cFBJkHVAf2qMqF01xYg", "channel": "Hey Bear Sensory",
        "uploader": "Hey Bear Sensory", "uploader_id": "@HeyBear",
        "thumbnails": [{"url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "width": 480, "height": 360}],
        "timestamp": 1_700_000_000, "release_timestamp": None, "availability": None,
        "view_count": 1234567, "live_status": None, "channel_is_verified": True,
    }
    flat_short = {**flat_entry, "id": "abcdefghijk", "url": "https://www.youtube.com/shorts/abcdefghijk",
                  "title": "Dancing Banana #shorts", "duration": None, "view_count": 500}
    members_only = {**flat_entry, "id": "memberonly1", "availability": "subscriber_only"}
    upcoming = {**flat_entry, "id": "upcoming001", "live_status": "is_upcoming", "release_timestamp": 4_000_000_000}
    deep_info = {  # trimmed YoutubeIE result
        "id": "dQw4w9WgXcQ", "title": "Baby Sensory | Dancing Fruits | 1 Hour",
        "webpage_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "upload_date": "20231114",
        "timestamp": 1_699_958_400, "duration": 3605, "view_count": 1234890, "like_count": 4321,
        "comment_count": None, "description": "Chapters\n0:00 Intro\n1:00 Fruits", "tags": ["baby sensory", "high contrast"],
        "categories": ["Education"], "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        "width": 1920, "height": 1080, "channel": "Hey Bear Sensory", "channel_id": "UCtf9cFBJkHVAf2qMqF01xYg",
        "uploader_id": "@HeyBear", "availability": "public", "live_status": "not_live", "channel_follower_count": 9_000_000,
    }

    assert normalize_channel_input("@HeyBear")[0] == "https://www.youtube.com/@HeyBear"
    assert normalize_channel_input("HeyBear")[0] == "https://www.youtube.com/@HeyBear"
    assert normalize_channel_input("https://www.youtube.com/@HeyBear/videos") == ("https://www.youtube.com/@HeyBear", "heybear")
    assert normalize_channel_input("UCtf9cFBJkHVAf2qMqF01xYg")[0] == "https://www.youtube.com/channel/UCtf9cFBJkHVAf2qMqF01xYg"
    assert normalize_channel_input("youtube.com/channel/UCtf9cFBJkHVAf2qMqF01xYg/shorts")[1] == "uctf9cfbjkhvaf2qmqf01xyg"
    for bad in ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://example.com/@x"):
        try:
            normalize_channel_input(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"should have rejected {bad}")

    assert skip_reason(members_only) == "subscriber_only"
    assert skip_reason(upcoming) == "is_upcoming"
    assert skip_reason(flat_entry) is None

    flat = normalize_entry(flat_entry, deep=False, source_tab="videos")
    assert flat["upload_date"] == "2023-11-14" and flat["upload_date_approx"] is True
    assert flat["duration_s"] == 3605 and flat["is_short"] is False and flat["view_count"] == 1234567
    assert flat["thumbnail"].endswith("hqdefault.jpg") and flat["channel_handle"] == "@HeyBear"

    short = normalize_entry(flat_short, deep=False, source_tab="shorts")
    assert short["is_short"] is True and short["url"].startswith("https://www.youtube.com/shorts/")

    deep = normalize_entry(deep_info, deep=True, source_tab="videos")
    assert deep["upload_date"] == "2023-11-14" and deep["upload_date_approx"] is False
    assert deep["tags"] == ["baby sensory", "high contrast"] and deep["categories"] == ["Education"]
    assert deep["like_count"] == 4321 and deep["comment_count"] is None and deep["width"] == 1920

    merged = merge_flat_and_deep(flat, deep)
    assert merged["deep"] is True and merged["view_count"] == 1234890 and merged["source_tab"] == "videos"
    assert compute_is_short(120, 1080, 1920, None, None) is True
    assert compute_is_short(120, 1920, 1080, None, None) is False
    assert compute_is_short(120, None, None, None, None) is True
    assert compute_is_short(181, None, None, None, None) is False
    assert compute_is_short(90, None, None, None, "videos") is False  # Videos tab never lists Shorts
    assert compute_is_short(90, None, None, None, "shorts") is True
    no_dims = {**deep_info, "width": None, "height": None,
               "formats": [{"width": 640, "height": 360}, {"width": 1920, "height": 1080}, {"acodec": "opus"}]}
    assert dimensions(no_dims) == (1920, 1080)
    assert dimensions({"id": "x"}) == (None, None)

    result = {"slug": "heybear", "_meta": {"channel_handle": "@HeyBear", "deep": True, "deep_ok": 2,
                                           "skipped": {"subscriber_only": 1}}, "videos": [merged, short]}
    with tempfile.TemporaryDirectory() as tmp:
        jp = Path(tmp) / "heybear.json"
        cp = write_outputs(result, jp)
        back = json.loads(jp.read_text(encoding="utf-8"))
        assert back["videos"][0]["id"] == "dQw4w9WgXcQ" and back["_meta"]["deep"] is True
        rows = list(csv.DictReader(cp.open(encoding="utf-8")))
        assert rows[0]["duration_hms"] == "1:00:05" and rows[0]["tags"] == "baby sensory|high contrast"
        assert " / " in rows[0]["description"]
        print(summarize(result, jp, cp))
    print(json.dumps(merged, indent=2, ensure_ascii=False))
    print("selftest OK")
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Metadata-only YouTube channel scraper for babyloop competitive research (never downloads media).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python scrape_channel.py https://www.youtube.com/@HeyBear/videos\n"
            "  python scrape_channel.py @HeyBear --deep --limit 200\n"
            "  python scrape_channel.py @HeyBear @MissRachel --deep --tabs videos,shorts --out research/data/\n"
        ),
    )
    p.add_argument("channels", nargs="*", help="channel URL, @handle, handle or UC... id (one or more)")
    p.add_argument("--deep", action="store_true", help="fetch full metadata per video (exact dates, tags, likes, description)")
    p.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help=f"max videos per channel, 0 = all (default {DEFAULT_LIMIT})")
    p.add_argument("--tabs", default=DEFAULT_TABS, help=f"comma list of {', '.join(VALID_TABS)} (default {DEFAULT_TABS})")
    p.add_argument("--out", help="output .json path (single channel) or directory (multiple channels); "
                                 "default research/data/<slug>.json next to this script")
    p.add_argument("--sleep-min", type=float, default=1.0, help="min seconds between deep requests (default 1.0)")
    p.add_argument("--sleep-max", type=float, default=2.0, help="max seconds between deep requests (default 2.0)")
    p.add_argument("--request-sleep", type=float, default=0.0, help="extra seconds yt-dlp sleeps between its own internal requests")
    p.add_argument("--retries", type=int, default=3, help="retries per video on transient errors (default 3)")
    p.add_argument("--ua", default=DEFAULT_UA, help="User-Agent to send; 'default' = yt-dlp's built-in")
    p.add_argument("--cookies", help="Netscape cookie file (only if YouTube bot-checks you)")
    p.add_argument("--cookies-from-browser", metavar="BROWSER", help="e.g. firefox or chrome (only if YouTube bot-checks you)")
    p.add_argument("-v", "--verbose", action="store_true", help="show yt-dlp warnings and per-request detail")
    p.add_argument("--selftest", action="store_true", help="run offline parsing checks and exit")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.selftest:
        return _selftest()
    if not args.channels:
        build_parser().print_usage(sys.stderr)
        eprint("error: give at least one channel (or --selftest)")
        return 1
    if args.sleep_min < 0 or args.sleep_max < args.sleep_min:
        eprint("error: need 0 <= --sleep-min <= --sleep-max")
        return 1

    default_dir = Path(__file__).resolve().parent / "data"
    multi = len(args.channels) > 1
    out_arg = Path(args.out).expanduser() if args.out else None
    if out_arg and (multi or out_arg.is_dir() or str(args.out).endswith(("/", "\\"))):
        out_dir, out_file = out_arg, None
    elif out_arg:
        out_dir, out_file = out_arg.parent, out_arg
    else:
        out_dir, out_file = default_dir, None

    logger = QuietLogger(verbose=args.verbose)
    failures = 0
    for raw in args.channels:
        eprint(f"== {raw}")
        try:
            result = scrape_channel(raw, args, logger)
        except ValueError as exc:
            failures += 1
            eprint(f"  error: {exc}")
            continue
        except (DownloadError, ExtractorError) as exc:
            failures += 1
            eprint(f"  error: could not list channel: {str(exc).strip()[:300]}")
            continue
        except KeyboardInterrupt:
            eprint("  interrupted")
            return 130
        if not result["videos"]:
            failures += 1
            eprint(f"  error: no public videos found for {raw} (wrong handle? all members-only? try --tabs videos,shorts)")
            continue
        json_path = out_file if out_file else out_dir / f"{result['slug']}.json"
        if json_path.suffix.lower() != ".json":
            json_path = json_path.with_suffix(".json")
        csv_path = write_outputs(result, json_path)
        print(summarize(result, json_path, csv_path))
        if not args.deep:
            eprint("  note: flat mode -> upload dates approximate, no tags/likes. Use --deep for the full picture.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
