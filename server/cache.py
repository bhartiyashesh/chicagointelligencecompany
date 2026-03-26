"""
File-based report cache for CIC.

Cache key = normalized company name (lowercase, stripped).
Cache stores: final_report.json, scratchpad/*.md, report files.
TTL: 24 hours by default.
"""

import hashlib
import json
import os
import shutil
import time
from pathlib import Path

CACHE_DIR = Path(__file__).parent.parent / "cache"
DEFAULT_TTL = 86400  # 24 hours


def _cache_key(company: str) -> str:
    """Normalize company name to a stable cache key."""
    normalized = company.strip().lower()
    # Short hash for filesystem safety
    h = hashlib.sha256(normalized.encode()).hexdigest()[:12]
    # Also keep a readable prefix
    safe_name = "".join(c if c.isalnum() else "_" for c in normalized)[:40]
    return f"{safe_name}_{h}"


def get_cache_path(company: str) -> Path:
    """Get the cache directory for a company."""
    return CACHE_DIR / _cache_key(company)


def get_cached_report(company: str, ttl: int = DEFAULT_TTL) -> dict | None:
    """
    Check if a valid cached report exists for this company.
    Returns the report dict if found and fresh, None otherwise.
    """
    cache_path = get_cache_path(company)
    meta_file = cache_path / "meta.json"

    if not meta_file.exists():
        return None

    try:
        with open(meta_file) as f:
            meta = json.load(f)

        # Check TTL
        cached_at = meta.get("cached_at", 0)
        age_hours = (time.time() - cached_at) / 3600
        if time.time() - cached_at > ttl:
            return None

        # Load report
        report_file = cache_path / "final_report.json"
        if not report_file.exists():
            return None

        with open(report_file) as f:
            report = json.load(f)

        return {
            "report": report,
            "cached_at": meta.get("cached_at"),
            "age_hours": round(age_hours, 1),
            "company": meta.get("company", company),
            "report_paths": meta.get("report_paths", {}),
        }
    except (json.JSONDecodeError, KeyError, OSError):
        return None


def save_to_cache(
    company: str,
    report: dict,
    scratchpad: dict[str, str],
    report_paths: dict[str, str],
) -> Path:
    """
    Save a completed analysis to the cache.
    Returns the cache directory path.
    """
    cache_path = get_cache_path(company)
    cache_path.mkdir(parents=True, exist_ok=True)

    # Save report JSON
    with open(cache_path / "final_report.json", "w") as f:
        json.dump(report, f, indent=2)

    # Save scratchpad files
    scratch_dir = cache_path / "scratchpad"
    scratch_dir.mkdir(exist_ok=True)
    for filename, content in scratchpad.items():
        with open(scratch_dir / filename, "w") as f:
            f.write(content)

    # Copy report files (xlsx, csv, json) into cache
    cached_paths = {}
    for fmt, src_path in report_paths.items():
        if src_path and os.path.exists(src_path):
            dest = cache_path / os.path.basename(src_path)
            shutil.copy2(src_path, dest)
            cached_paths[fmt] = str(dest)

    # Save metadata
    meta = {
        "company": company,
        "cached_at": time.time(),
        "report_paths": cached_paths,
    }
    with open(cache_path / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    return cache_path


def list_cached_reports() -> list[dict]:
    """List all cached reports with metadata."""
    if not CACHE_DIR.exists():
        return []

    reports = []
    for entry in CACHE_DIR.iterdir():
        if not entry.is_dir():
            continue
        meta_file = entry / "meta.json"
        if not meta_file.exists():
            continue
        try:
            with open(meta_file) as f:
                meta = json.load(f)
            age_hours = (time.time() - meta.get("cached_at", 0)) / 3600
            reports.append({
                "company": meta.get("company", "Unknown"),
                "cached_at": meta.get("cached_at"),
                "age_hours": round(age_hours, 1),
                "expired": age_hours > (DEFAULT_TTL / 3600),
                "path": str(entry),
            })
        except (json.JSONDecodeError, OSError):
            continue

    return sorted(reports, key=lambda r: r.get("cached_at", 0), reverse=True)


def clear_expired(ttl: int = DEFAULT_TTL) -> int:
    """Remove expired cache entries. Returns count of removed entries."""
    if not CACHE_DIR.exists():
        return 0

    removed = 0
    for entry in CACHE_DIR.iterdir():
        if not entry.is_dir():
            continue
        meta_file = entry / "meta.json"
        if not meta_file.exists():
            shutil.rmtree(entry, ignore_errors=True)
            removed += 1
            continue
        try:
            with open(meta_file) as f:
                meta = json.load(f)
            if time.time() - meta.get("cached_at", 0) > ttl:
                shutil.rmtree(entry, ignore_errors=True)
                removed += 1
        except (json.JSONDecodeError, OSError):
            shutil.rmtree(entry, ignore_errors=True)
            removed += 1

    return removed
