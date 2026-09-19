#!/usr/bin/env python3
"""
analyze.py -- babyloop competitive research: turn scraped channel metadata into a
"what format works" report. Standard library only (no pandas).

Usage
-----
    python analyze.py research/data/heybear.json [more.json ...]
                      [--top 15] [--months 12] [--today YYYY-MM-DD] [--no-write]

Input: JSON written by scrape_channel.py -- either {"_meta": ..., "videos": [...]}
or a bare list of video dicts. Only these keys are used (missing ones are fine):
    title, duration_s (or duration), view_count, upload_date (YYYY-MM-DD),
    upload_date_approx, like_count, tags, description, is_short, id, url

Output: a plain-text report on stdout and <input-stem>-report.md next to each
input. With several inputs a cross-channel comparison table is added and
written to comparison-report.md next to the first input.

The question this answers for a loop-based baby channel: which video lengths,
title patterns, tags and posting cadence actually earn views on the channels
we admire, so babyloop can copy the *structure* (never the media).
"""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# configuration
# ---------------------------------------------------------------------------

# (label, exclusive lower bound in seconds, inclusive upper bound). First bucket
# also includes 0. Spec: Shorts <=3 min, 3-10, 10-30, 30-60, 60-120, 120+ minutes.
BUCKETS = [
    ("Shorts (<=3 min)", -1, 180),
    ("3-10 min", 180, 600),
    ("10-30 min", 600, 1800),
    ("30-60 min", 1800, 3600),
    ("60-120 min", 3600, 7200),
    ("120+ min", 7200, math.inf),
]
BUCKET_LABELS = [b[0] for b in BUCKETS]

# Title keywords we care about for this niche. (label, regex)
KEYWORDS = [
    ("baby", r"\bbaby\b"),
    ("sensory", r"\bsensory\b"),
    ("high contrast", r"\bhigh[\s-]*contrast\b"),
    ("dance", r"\bdanc(?:e|es|ing)\b"),
    ("sleep", r"\bsleep(?:y|ing)?\b"),
    ("lullaby", r"\blullab(?:y|ies)\b"),
    ("learn", r"\blearn(?:ing)?\b"),
    ("colors", r"\bcolou?rs?\b"),
    ("hours", r"\b(?:hours?|hrs?)\b"),
    ("minutes", r"\b(?:minutes?|mins?)\b"),
    ("a stated length ('1 hour', '30 minutes')", r"\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?)\b"),
]

STOPWORDS = {
    "a", "an", "and", "the", "for", "of", "to", "in", "on", "with", "by", "at", "from", "or", "is", "it",
    "its", "your", "you", "our", "we", "this", "that", "these", "those", "as", "be", "are", "was", "vs",
    "up", "out", "into", "over", "all", "more", "new", "official", "video", "videos", "full", "ft",
    "feat", "hd", "4k", "official", "part", "ep", "episode", "compilation", "s", "t", "no", "not",
    "amp", "de", "la", "el", "y", "en", "et", "le", "les", "und", "der", "die", "das",
}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "twelve": 12, "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40, "forty-five": 45,
    "sixty": 60, "ninety": 90,
}

EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍\U0001F900-\U0001F9FF]"
)
TOKEN_RE = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")
CHAPTER_LINE_RE = re.compile(r"^\s*\(?\d{1,2}:\d{2}(?::\d{2})?\)?\s*[-–—:]?\s*\S", re.MULTILINE)
LINK_RE = re.compile(r"https?://", re.IGNORECASE)
HASHTAG_RE = re.compile(r"(?<!\w)#([A-Za-z][\w]{1,40})")

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ---------------------------------------------------------------------------
# formatting helpers
# ---------------------------------------------------------------------------

def fmt_compact(n) -> str:
    if n is None:
        return "-"
    n = float(n)
    sign = "-" if n < 0 else ""
    n = abs(n)
    for unit, div in (("B", 1e9), ("M", 1e6), ("K", 1e3)):
        if n >= div:
            val = n / div
            return f"{sign}{val:.1f}{unit}" if val < 100 else f"{sign}{val:.0f}{unit}"
    return f"{sign}{n:.0f}" if n >= 10 or n == int(n) else f"{sign}{n:.1f}"


def fmt_int(n) -> str:
    return "-" if n is None else f"{int(n):,}"


def fmt_pct(part, whole, digits: int = 0) -> str:
    if not whole:
        return "-"
    return f"{100.0 * part / whole:.{digits}f}%"


def hms(seconds) -> str:
    if seconds is None:
        return "-"
    seconds = int(round(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def minutes(seconds) -> str:
    return "-" if seconds is None else f"{seconds / 60:.0f} min"


def median(values) -> float | None:
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def mean(values) -> float | None:
    values = [v for v in values if v is not None]
    return statistics.fmean(values) if values else None


def truncate(text: str, n: int) -> str:
    text = (text or "").replace("\n", " ").strip()
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def bar(count: int, max_count: int, width: int = 24) -> str:
    if max_count <= 0 or count <= 0:
        return ""
    return "#" * max(1, round(width * count / max_count))


# ---------------------------------------------------------------------------
# report builder: one structure, rendered as plain text and as markdown
# ---------------------------------------------------------------------------

class Report:
    def __init__(self) -> None:
        self.blocks: list[tuple] = []

    def h1(self, text: str) -> None:
        self.blocks.append(("h1", text))

    def h2(self, text: str) -> None:
        self.blocks.append(("h2", text))

    def p(self, text: str) -> None:
        self.blocks.append(("p", text))

    def bullets(self, items: list[str]) -> None:
        self.blocks.append(("bullets", list(items)))

    def kv(self, pairs: list[tuple[str, object]]) -> None:
        self.blocks.append(("kv", [(k, str(v)) for k, v in pairs]))

    def table(self, headers: list[str], rows: list[list], align: str | None = None) -> None:
        # align: string of 'l'/'r' per column; default left for first col, right for the rest
        if align is None:
            align = "l" + "r" * (len(headers) - 1)
        self.blocks.append(("table", headers, [[str(c) for c in r] for r in rows], align))

    # -- plain text ---------------------------------------------------------
    def text(self) -> str:
        out: list[str] = []
        for block in self.blocks:
            kind = block[0]
            if kind == "h1":
                out += ["", "=" * 78, block[1].upper(), "=" * 78]
            elif kind == "h2":
                out += ["", block[1], "-" * len(block[1])]
            elif kind == "p":
                out += ["", block[1]]
            elif kind == "bullets":
                out += [""] + [f"  * {item}" for item in block[1]]
            elif kind == "kv":
                width = max((len(k) for k, _ in block[1]), default=0)
                out += [""] + [f"  {k:<{width}}  {v}" for k, v in block[1]]
            elif kind == "table":
                _, headers, rows, align = block
                widths = [len(h) for h in headers]
                for r in rows:
                    for i, c in enumerate(r):
                        widths[i] = max(widths[i], len(c))

                def fmt_row(cells):
                    parts = []
                    for i, c in enumerate(cells):
                        parts.append(c.rjust(widths[i]) if align[i] == "r" else c.ljust(widths[i]))
                    return "  " + "  ".join(parts).rstrip()

                out += ["", fmt_row(headers), "  " + "  ".join("-" * w for w in widths)]
                out += [fmt_row(r) for r in rows] if rows else ["  (no data)"]
        return "\n".join(out).lstrip("\n") + "\n"

    # -- markdown -----------------------------------------------------------
    def markdown(self) -> str:
        out: list[str] = []

        def esc(cell: str) -> str:
            return cell.replace("|", "\\|")

        for block in self.blocks:
            kind = block[0]
            if kind == "h1":
                out += [f"# {block[1]}", ""]
            elif kind == "h2":
                out += [f"## {block[1]}", ""]
            elif kind == "p":
                out += [block[1], ""]
            elif kind == "bullets":
                out += [f"- {item}" for item in block[1]] + [""]
            elif kind == "kv":
                out += [f"- **{k}:** {v}" for k, v in block[1]] + [""]
            elif kind == "table":
                _, headers, rows, align = block
                out.append("| " + " | ".join(esc(h) for h in headers) + " |")
                out.append("|" + "|".join("---:" if a == "r" else "---" for a in align) + "|")
                if rows:
                    out += ["| " + " | ".join(esc(c) for c in r) + " |" for r in rows]
                else:
                    out.append("| (no data) |" + " |" * (len(headers) - 1))
                out.append("")
        return "\n".join(out).rstrip() + "\n"


# ---------------------------------------------------------------------------
# loading + normalization
# ---------------------------------------------------------------------------

def to_int(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None


def parse_date(value) -> date | None:
    if not value:
        return None
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(s[:10] if fmt == "%Y-%m-%d" else s[:8], fmt).date()
        except ValueError:
            continue
    return None


def bucket_of(duration_s) -> str | None:
    if duration_s is None:
        return None
    for label, lo, hi in BUCKETS:
        if lo < duration_s <= hi:
            return label
    return None


def load_file(path: Path) -> tuple[dict, str | None, list[dict]]:
    """Return (_meta, _note, raw video list) for a scraper JSON file."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return {}, None, [v for v in data if isinstance(v, dict)]
    if isinstance(data, dict):
        videos = data.get("videos")
        if videos is None:
            videos = data.get("entries", [])
        meta = data.get("_meta") if isinstance(data.get("_meta"), dict) else {}
        note = data.get("_note")
        return meta, note, [v for v in (videos or []) if isinstance(v, dict)]
    raise ValueError(f"{path}: expected a JSON list or object")


def prepare(videos: list[dict], today: date) -> list[dict]:
    out = []
    for raw in videos:
        v = dict(raw)
        v["title"] = str(raw.get("title") or "")
        v["duration_s"] = to_int(raw.get("duration_s", raw.get("duration")))
        v["view_count"] = to_int(raw.get("view_count"))
        v["like_count"] = to_int(raw.get("like_count"))
        v["upload_dt"] = parse_date(raw.get("upload_date"))
        v["approx"] = bool(raw.get("upload_date_approx"))
        tags = raw.get("tags") or []
        v["tags"] = [str(t).strip() for t in tags if str(t).strip()] if isinstance(tags, list) else []
        v["description"] = str(raw.get("description") or "")
        v["bucket"] = bucket_of(v["duration_s"])
        if raw.get("is_short") is not None:
            v["is_short"] = bool(raw.get("is_short"))
        else:
            v["is_short"] = v["duration_s"] is not None and v["duration_s"] <= 180
        if v["upload_dt"]:
            v["days_live"] = max(1, (today - v["upload_dt"]).days)
            v["views_per_day"] = (v["view_count"] / v["days_live"]) if v["view_count"] is not None else None
        else:
            v["days_live"] = None
            v["views_per_day"] = None
        out.append(v)
    return out


# ---------------------------------------------------------------------------
# title helpers
# ---------------------------------------------------------------------------

def title_tokens(title: str) -> list[str]:
    text = title.lower().replace("&", " and ").replace("#", " ")
    toks = TOKEN_RE.findall(text)
    return [t for t in toks if t not in STOPWORDS and len(t) > 1 and not t.isdigit()]


def stated_lengths(title: str) -> list[tuple[str, int]]:
    """Return [(normalized phrase, seconds)] for lengths stated in a title."""
    t = title.lower()
    for word, num in NUMBER_WORDS.items():
        t = re.sub(rf"\b{word}\b", str(num), t)
    found: list[tuple[str, int]] = []
    combo = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?)\b")
    for m in combo.finditer(t):
        h, mi = float(m.group(1)), int(m.group(2))
        found.append((f"{m.group(1)} hour {mi} minutes", int(h * 3600 + mi * 60)))
    t = combo.sub(" ", t)
    for m in re.finditer(r"\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b", t):
        n = float(m.group(1))
        unit = "hour" if m.group(2).startswith("h") else "minute"
        n_txt = m.group(1).rstrip("0").rstrip(".") if "." in m.group(1) else m.group(1)
        plural = "" if n == 1 else "s"
        found.append((f"{n_txt} {unit}{plural}", int(n * (3600 if unit == "hour" else 60))))
    return found


# ---------------------------------------------------------------------------
# the analysis
# ---------------------------------------------------------------------------

def analyze(path: Path, meta: dict, note: str | None, videos: list[dict], args) -> tuple[Report, dict]:
    today: date = args.today
    rep = Report()
    summary: dict = {}

    channel = meta.get("channel") or meta.get("channel_handle") or path.stem
    handle = meta.get("channel_handle")
    rep.h1(f"Channel format report: {channel}")
    if note:
        rep.p(f"NOTE: {note}")
    info = [("Source", str(path)), ("Generated", today.isoformat())]
    if handle:
        info.append(("Handle", handle))
    if meta.get("channel_id"):
        info.append(("Channel id", meta["channel_id"]))
    if meta.get("subscriber_count"):
        info.append(("Subscribers", fmt_int(meta["subscriber_count"])))
    if meta.get("scraped_at"):
        info.append(("Scraped", str(meta["scraped_at"])[:19] + (" (deep)" if meta.get("deep") else " (flat)")))
    if meta.get("skipped"):
        info.append(("Skipped by scraper", ", ".join(f"{k}={n}" for k, n in sorted(meta["skipped"].items()))))
    rep.kv(info)

    n = len(videos)
    if n == 0:
        rep.p("No videos in file - nothing to analyze.")
        return rep, {"channel": channel, "videos": 0}

    # ---- overview / cadence -------------------------------------------------
    dated = sorted((v for v in videos if v["upload_dt"]), key=lambda v: v["upload_dt"])
    n_dated = len(dated)
    n_approx = sum(1 for v in dated if v["approx"])
    with_views = [v for v in videos if v["view_count"] is not None]
    with_dur = [v for v in videos if v["duration_s"] is not None]
    shorts = [v for v in videos if v["is_short"]]
    longform = [v for v in videos if not v["is_short"]]

    rep.h2("Overview")
    ov = [("Videos", n), ("With upload date", f"{n_dated} ({fmt_pct(n_dated, n)})" + (f", {n_approx} approximate" if n_approx else ""))]
    per_month_all = per_month_12 = per_month_3 = None
    median_gap = None
    if dated:
        first, last = dated[0]["upload_dt"], dated[-1]["upload_dt"]
        span_months = (last.year - first.year) * 12 + (last.month - first.month) + 1
        per_month_all = n_dated / span_months
        cutoff_12 = today - timedelta(days=365)
        cutoff_3 = today - timedelta(days=91)
        per_month_12 = sum(1 for v in dated if v["upload_dt"] >= cutoff_12) / 12.0
        per_month_3 = sum(1 for v in dated if v["upload_dt"] >= cutoff_3) / 3.0
        gaps = [(b["upload_dt"] - a["upload_dt"]).days for a, b in zip(dated, dated[1:])]
        median_gap = median(gaps)
        ov += [
            ("First upload", first.isoformat()),
            ("Latest upload", f"{last.isoformat()} ({(today - last).days} days ago)"),
            ("Span", f"{span_months} months"),
            ("Uploads / month (whole span)", f"{per_month_all:.2f}"),
            ("Uploads / month (last 12 months)", f"{per_month_12:.2f}"),
            ("Uploads / month (last 3 months)", f"{per_month_3:.2f}"),
            ("Median gap between uploads", f"{median_gap:.0f} days" if median_gap is not None else "-"),
        ]
    else:
        ov.append(("Date range", "unknown - rerun scraper with --deep for upload dates"))
    ov += [
        ("Shorts", f"{len(shorts)} ({fmt_pct(len(shorts), n)})"),
        ("Total views", fmt_int(sum(v["view_count"] for v in with_views)) if with_views else "-"),
        ("Median views / video", fmt_int(median([v["view_count"] for v in with_views]))),
        ("Median duration", hms(median([v["duration_s"] for v in with_dur]))),
    ]
    missing = []
    if len(with_dur) < n:
        missing.append(f"{n - len(with_dur)} without duration")
    if len(with_views) < n:
        missing.append(f"{n - len(with_views)} without views")
    if missing:
        ov.append(("Missing data", ", ".join(missing)))
    rep.kv(ov)

    if dated:
        by_month = Counter(v["upload_dt"].strftime("%Y-%m") for v in dated)
        months: list[str] = []
        y, m = today.year, today.month
        for _ in range(args.months):
            months.append(f"{y:04d}-{m:02d}")
            m -= 1
            if m == 0:
                y, m = y - 1, 12
        months.reverse()
        max_c = max((by_month.get(k, 0) for k in months), default=0)
        rows = [[k, by_month.get(k, 0), bar(by_month.get(k, 0), max_c)] for k in months]
        rep.p(f"Uploads per month, last {args.months} months" + (" (dates approximate)" if n_approx else "") + ":")
        rep.table(["Month", "Uploads", ""], rows, align="lrl")

    # ---- duration buckets ---------------------------------------------------
    rep.h2("Duration buckets vs views (do long videos earn more?)")
    groups: dict[str, list[dict]] = defaultdict(list)
    for v in with_dur:
        groups[v["bucket"]].append(v)
    total_views = sum(v["view_count"] for v in with_views) or 0
    rows = []
    bucket_stats: dict[str, dict] = {}
    for label in BUCKET_LABELS:
        g = groups.get(label, [])
        views = [v["view_count"] for v in g if v["view_count"] is not None]
        vpd = [v["views_per_day"] for v in g if v["views_per_day"] is not None]
        st = {
            "n": len(g), "median_views": median(views), "mean_views": mean(views),
            "share": (sum(views) / total_views) if total_views and views else 0.0,
            "median_vpd": median(vpd), "median_dur": median([v["duration_s"] for v in g]),
        }
        bucket_stats[label] = st
        rows.append([
            label, st["n"], fmt_pct(st["n"], len(with_dur)), fmt_compact(st["median_views"]),
            fmt_compact(st["mean_views"]), f"{100 * st['share']:.0f}%" if views else "-",
            fmt_compact(st["median_vpd"]), hms(st["median_dur"]),
        ])
    rep.table(["Bucket", "Videos", "% of videos", "Median views", "Mean views", "Share of all views", "Median views/day", "Median length"], rows)

    modal_bucket = max(BUCKET_LABELS, key=lambda b: bucket_stats[b]["n"]) if with_dur else None
    candidates = [b for b in BUCKET_LABELS if bucket_stats[b]["n"] >= 3 and bucket_stats[b]["median_views"] is not None]
    if not candidates:
        candidates = [b for b in BUCKET_LABELS if bucket_stats[b]["median_views"] is not None]
    best_bucket = max(candidates, key=lambda b: bucket_stats[b]["median_views"]) if candidates else None
    insight = []
    if modal_bucket:
        st = bucket_stats[modal_bucket]
        insight.append(f"They post mostly {modal_bucket}: {st['n']} videos ({fmt_pct(st['n'], len(with_dur))}), median {fmt_compact(st['median_views'])} views.")
    if best_bucket and modal_bucket:
        bs, ms = bucket_stats[best_bucket], bucket_stats[modal_bucket]
        if best_bucket == modal_bucket:
            insight.append("The bucket they post most is also the one with the highest median views - the format is dialed in.")
        elif ms["median_views"]:
            ratio = bs["median_views"] / ms["median_views"]
            insight.append(f"But {best_bucket} earns the highest median views ({fmt_compact(bs['median_views'])}, {ratio:.1f}x the modal bucket, n={bs['n']}).")
    long_v = [v["view_count"] for v in with_views if v["duration_s"] is not None and v["duration_s"] > 1800]
    short_v = [v["view_count"] for v in with_views if v["duration_s"] is not None and v["duration_s"] <= 1800]
    if long_v and short_v:
        insight.append(f"Median views, >30 min vs <=30 min: {fmt_compact(median(long_v))} vs {fmt_compact(median(short_v))} "
                       f"({median(long_v) / max(median(short_v), 1):.1f}x).")
    if len(with_views) >= 8:
        ranked = sorted(with_views, key=lambda v: v["view_count"], reverse=True)
        top_q = [v["duration_s"] for v in ranked[: max(2, len(ranked) // 4)] if v["duration_s"] is not None]
        if top_q:
            insight.append(f"Top-quartile videos by views have median length {hms(median(top_q))} "
                           f"vs {hms(median([v['duration_s'] for v in with_dur]))} for the whole catalog.")
    if insight:
        rep.bullets(insight)

    # ---- top videos ---------------------------------------------------------
    rep.h2(f"Top {args.top} videos by views")
    ranked = sorted(with_views, key=lambda v: v["view_count"], reverse=True)[: args.top]
    rows = []
    for i, v in enumerate(ranked, 1):
        rows.append([i, truncate(v["title"], 62), hms(v["duration_s"]), fmt_compact(v["view_count"]),
                     fmt_compact(v["views_per_day"]), v["upload_dt"].isoformat() if v["upload_dt"] else "-"])
    rep.table(["#", "Title", "Length", "Views", "Views/day", "Uploaded"], rows, align="rlrrrl")

    # ---- title analysis -----------------------------------------------------
    rep.h2("Title analysis")
    titles = [v["title"] for v in videos if v["title"]]
    nt = len(titles)
    chars = [len(t) for t in titles]
    words = [len(t.split()) for t in titles]
    with_emoji = sum(1 for t in titles if EMOJI_RE.search(t))
    with_digit = sum(1 for t in titles if re.search(r"\d", t))
    with_pipe = sum(1 for t in titles if "|" in t)
    with_dash = sum(1 for t in titles if re.search(r"\s[-–—]\s", t))
    with_excl = sum(1 for t in titles if "!" in t)
    stated = [(v, stated_lengths(v["title"])) for v in videos if v["title"]]
    stated_titles = [(v, sl) for v, sl in stated if sl]
    phrase_counter = Counter(phrase for _, sl in stated_titles for phrase, _ in sl)
    honest = 0
    for v, sl in stated_titles:
        if v["duration_s"]:
            claimed = max(sec for _, sec in sl)  # "1 hour 30 minutes" is already one combined phrase
            if abs(claimed - v["duration_s"]) <= max(60, 0.1 * v["duration_s"]):
                honest += 1
    rep.kv([
        ("Titles", nt),
        ("Median length", f"{median(chars):.0f} chars / {median(words):.0f} words" if nt else "-"),
        ("Length range", f"{min(chars)}-{max(chars)} chars" if nt else "-"),
        ("Contain an emoji", f"{with_emoji} ({fmt_pct(with_emoji, nt)})"),
        ("Contain a digit", f"{with_digit} ({fmt_pct(with_digit, nt)})"),
        ("Use ' | ' separators", f"{with_pipe} ({fmt_pct(with_pipe, nt)})"),
        ("Use ' - ' separators", f"{with_dash} ({fmt_pct(with_dash, nt)})"),
        ("Contain '!'", f"{with_excl} ({fmt_pct(with_excl, nt)})"),
        ("State a length", f"{len(stated_titles)} ({fmt_pct(len(stated_titles), nt)})"
                           + (f"; {honest} of those match the real duration within 10%" if stated_titles else "")),
    ])

    rows = [[f"'{k}'", c, fmt_pct(c, nt)] for k, c in phrase_counter.most_common(10)]
    if rows:
        rep.p("Most common length phrasing in titles:")
        rep.table(["Phrase", "Titles", "% of titles"], rows)

    rows = []
    for label, pattern in KEYWORDS:
        rx = re.compile(pattern, re.IGNORECASE)
        c = sum(1 for t in titles if rx.search(t))
        rows.append([label, c, fmt_pct(c, nt)])
    rep.p("Keyword coverage:")
    rep.table(["Keyword", "Titles", "% of titles"], rows)

    word_counter: Counter = Counter()
    bigram_counter: Counter = Counter()
    for t in titles:
        toks = title_tokens(t)
        word_counter.update(set(toks))
        bigram_counter.update({f"{a} {b}" for a, b in zip(toks, toks[1:])})
    rep.p("Most common title words (stopwords removed; counted once per title):")
    rep.table(["Word", "Titles", "% of titles"], [[w, c, fmt_pct(c, nt)] for w, c in word_counter.most_common(20)])
    rep.p("Most common bigrams:")
    rep.table(["Bigram", "Titles", "% of titles"], [[w, c, fmt_pct(c, nt)] for w, c in bigram_counter.most_common(15)])

    # ---- weekday ------------------------------------------------------------
    rep.h2("Posting weekday")
    if dated:
        wd = Counter(v["upload_dt"].strftime("%A") for v in dated)
        max_c = max(wd.values())
        rows = [[d, wd.get(d, 0), fmt_pct(wd.get(d, 0), n_dated), bar(wd.get(d, 0), max_c)] for d in WEEKDAYS]
        if n_approx:
            rep.p(f"Caution: {n_approx} of {n_dated} dates are approximate (flat scrape) - weekdays are noise until you rerun with --deep.")
        rep.table(["Weekday", "Uploads", "%", ""], rows, align="lrrl")
        best_day = max(WEEKDAYS, key=lambda d: wd.get(d, 0))
    else:
        rep.p("No upload dates available.")
        best_day = None

    # ---- tags -----------------------------------------------------------------
    rep.h2("Tags (top 30)")
    tagged = [v for v in videos if v["tags"]]
    tag_counter: Counter = Counter()
    for v in tagged:
        tag_counter.update({t.lower() for t in v["tags"]})
    median_tags = median([len(v["tags"]) for v in tagged])
    if tagged:
        rep.p(f"{len(tagged)} of {n} videos have tags; median {median_tags:.0f} tags per video.")
        rep.table(["Tag", "Videos", "% of tagged"], [[t, c, fmt_pct(c, len(tagged))] for t, c in tag_counter.most_common(30)])
    else:
        rep.p("No tag data in this file (tags need a --deep scrape).")

    # ---- descriptions ---------------------------------------------------------
    described = [v for v in videos if v["description"].strip()]
    desc_chapters = desc_links = 0
    hashtag_counter: Counter = Counter()
    if described:
        rep.h2("Descriptions")
        desc_chapters = sum(1 for v in described if len(CHAPTER_LINE_RE.findall(v["description"])) >= 2)
        desc_links = sum(1 for v in described if LINK_RE.search(v["description"]))
        for v in described:
            hashtag_counter.update({h.lower() for h in HASHTAG_RE.findall(v["description"])})
        rep.kv([
            ("Videos with a description", f"{len(described)} ({fmt_pct(len(described), n)})"),
            ("Median length", f"{median([len(v['description']) for v in described]):.0f} chars"),
            ("Contain chapter timestamps (2+)", f"{desc_chapters} ({fmt_pct(desc_chapters, len(described))})"),
            ("Contain links", f"{desc_links} ({fmt_pct(desc_links, len(described))})"),
        ])
        if hashtag_counter:
            rep.table(["Hashtag", "Videos"], [[f"#{h}", c] for h, c in hashtag_counter.most_common(10)])

    # ---- what to copy -----------------------------------------------------------
    rep.h2("What to copy structurally (computed from this data)")
    copy: list[str] = []
    if modal_bucket:
        durs = sorted(v["duration_s"] for v in with_dur)
        rounded = Counter(int(round(d / 300.0)) * 5 for d in durs if d > 180)
        common_len = rounded.most_common(1)[0] if rounded else None
        line = f"Length: most videos are {modal_bucket} (median catalog length {hms(median(durs))})"
        if common_len:
            line += f"; the single most common long-form length is ~{common_len[0]} min ({common_len[1]} videos)"
        copy.append(line + ".")
    if best_bucket:
        bs = bucket_stats[best_bucket]
        copy.append(f"Views: {best_bucket} has the best median views ({fmt_compact(bs['median_views'])}) - lead with that length"
                    + ("" if best_bucket == modal_bucket else f" even though they post {modal_bucket} more often") + ".")
    if nt:
        copy.append(f"Title shape: aim for ~{median(chars):.0f} characters / ~{median(words):.0f} words"
                    + (f", ' | ' separated" if with_pipe / nt >= 0.5 else "")
                    + (f", emoji in {fmt_pct(with_emoji, nt)}" if with_emoji else ", no emoji") + ".")
        if phrase_counter:
            ph, c = phrase_counter.most_common(1)[0]
            copy.append(f"Length in title: {fmt_pct(len(stated_titles), nt)} of titles state a length; most common phrasing '{ph}' ({c} titles).")
        strong = [(label, sum(1 for t in titles if re.search(p, t, re.IGNORECASE))) for label, p in KEYWORDS[:-1]]
        strong = [f"{label} ({fmt_pct(c, nt)})" for label, c in strong if c / nt >= 0.3]
        if strong:
            copy.append("Keywords in 30%+ of titles: " + ", ".join(strong) + ".")
        if bigram_counter:
            copy.append("Recurring title phrases: " + ", ".join(f"'{b}'" for b, _ in bigram_counter.most_common(5)) + ".")
    if per_month_12 is not None:
        cadence = f"{per_month_12:.1f}/month over the last 12 months"
        if per_month_all is not None:
            cadence += f" ({per_month_all:.1f}/month lifetime"
            cadence += f", median gap {median_gap:.0f} days)" if median_gap is not None else ")"
        copy.append(f"Cadence: {cadence}" + (f"; most uploads land on {best_day}" if best_day and not n_approx else "") + ".")
    if shorts:
        sv = median([v["view_count"] for v in shorts if v["view_count"] is not None])
        lv = median([v["view_count"] for v in longform if v["view_count"] is not None])
        copy.append(f"Shorts: {fmt_pct(len(shorts), n)} of uploads; median {fmt_compact(sv)} views vs {fmt_compact(lv)} for long-form.")
    elif with_dur:
        copy.append("Shorts: none in this sample - long-form only.")
    if tagged:
        copy.append(f"Tags: ~{median_tags:.0f} per video; reuse the core set: " + ", ".join(t for t, _ in tag_counter.most_common(6)) + ".")
    if described:
        copy.append(f"Descriptions: {fmt_pct(desc_chapters, len(described))} use chapter timestamps"
                    + (f"; common hashtags " + ", ".join(f"#{h}" for h, _ in hashtag_counter.most_common(3)) if hashtag_counter else "") + ".")
    if meta.get("deep") is False or (dated and n_approx == n_dated):
        copy.append("Data quality: this is a flat scrape (approximate dates, no tags/likes). Rerun scrape_channel.py --deep before acting on cadence or tag findings.")
    rep.bullets(copy)

    summary = {
        "channel": handle or channel,
        "videos": n,
        "first": dated[0]["upload_dt"].isoformat() if dated else "-",
        "last": dated[-1]["upload_dt"].isoformat() if dated else "-",
        "per_month_12": f"{per_month_12:.1f}" if per_month_12 is not None else "-",
        "median_dur": hms(median([v["duration_s"] for v in with_dur])),
        "modal_bucket": modal_bucket or "-",
        "best_bucket": best_bucket or "-",
        "median_views": fmt_compact(median([v["view_count"] for v in with_views])),
        "top_views": fmt_compact(ranked[0]["view_count"]) if ranked else "-",
        "shorts_pct": fmt_pct(len(shorts), n),
        "stated_len_pct": fmt_pct(len(stated_titles), nt) if nt else "-",
        "title_chars": f"{median(chars):.0f}" if nt else "-",
    }
    return rep, summary


def comparison_report(summaries: list[dict]) -> Report:
    rep = Report()
    rep.h1("Cross-channel comparison")
    headers = ["Channel", "Videos", "First", "Last", "Uploads/mo (12m)", "Median length", "Modal bucket",
               "Best bucket (median views)", "Median views", "Top video", "Shorts", "Title states length", "Title chars"]
    rows = [[s["channel"], s["videos"], s["first"], s["last"], s["per_month_12"], s["median_dur"], s["modal_bucket"],
             s["best_bucket"], s["median_views"], s["top_views"], s["shorts_pct"], s["stated_len_pct"], s["title_chars"]]
            for s in summaries]
    rep.table(headers, rows, align="lrllrlllrrrrr")
    return rep


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_today(s: str) -> date:
    try:
        return date.fromisoformat(s)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"--today wants YYYY-MM-DD, got {s!r}") from exc


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Report on scraped YouTube channel metadata (babyloop research).")
    p.add_argument("inputs", nargs="+", help="JSON file(s) written by scrape_channel.py")
    p.add_argument("--top", type=int, default=15, help="how many top videos to list (default 15)")
    p.add_argument("--months", type=int, default=12, help="months to show in the cadence table (default 12)")
    p.add_argument("--today", type=parse_today, default=date.today(), help="override 'today' for views/day (YYYY-MM-DD)")
    p.add_argument("--no-write", action="store_true", help="print only; do not write markdown reports")
    args = p.parse_args(argv)

    summaries = []
    failures = 0
    for raw in args.inputs:
        path = Path(raw).expanduser()
        try:
            meta, note, raw_videos = load_file(path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            print(f"error: cannot read {path}: {exc}", file=sys.stderr)
            failures += 1
            continue
        videos = prepare(raw_videos, args.today)
        rep, summary = analyze(path, meta, note, videos, args)
        print(rep.text())
        if not args.no_write:
            out = path.with_name(path.stem + "-report.md")
            out.write_text(rep.markdown(), encoding="utf-8")
            print(f"[markdown report written to {out}]\n")
        if summary.get("videos"):
            summaries.append(summary)

    if len(summaries) > 1:
        rep = comparison_report(summaries)
        print(rep.text())
        if not args.no_write:
            out = Path(args.inputs[0]).expanduser().with_name("comparison-report.md")
            out.write_text(rep.markdown(), encoding="utf-8")
            print(f"[comparison written to {out}]")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
