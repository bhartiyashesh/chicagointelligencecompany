"""FRED (Federal Reserve Economic Data) API."""

import os

try:
    import httpx
    def _get(url, headers=None, params=None, timeout=15):
        r = httpx.get(url, headers=headers, params=params, timeout=timeout)
        r.raise_for_status()
        return r.json()
except ImportError:
    import requests
    def _get(url, headers=None, params=None, timeout=15):
        r = requests.get(url, headers=headers, params=params, timeout=timeout)
        r.raise_for_status()
        return r.json()

# Common FRED series IDs for quick reference
COMMON_SERIES = {
    "GDP": "Gross Domestic Product",
    "UNRATE": "Unemployment Rate",
    "CPIAUCSL": "Consumer Price Index (All Urban Consumers)",
    "INDPRO": "Industrial Production Index",
    "TOTALSA": "Total Vehicle Sales",
    "RSAFS": "Advance Retail Sales: Retail and Food Services",
    "DGORDER": "Manufacturers' New Orders: Durable Goods",
    "UMCSENT": "University of Michigan Consumer Sentiment",
}

TOOL_DEFINITION = {
    "name": "get_economic_indicator",
    "description": (
        "Get economic indicator data from FRED (Federal Reserve Economic Data). "
        "Common series: GDP, UNRATE (unemployment), CPIAUCSL (CPI/inflation), "
        "INDPRO (industrial production), TOTALSA (vehicle sales), RSAFS (retail sales), "
        "DGORDER (durable goods orders), UMCSENT (consumer sentiment). "
        "Can also search for any FRED series by keyword."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "series_id": {
                "type": "string",
                "description": "FRED series ID (e.g. 'GDP', 'UNRATE', 'CPIAUCSL') or a search query prefixed with 'search:' to find series"
            },
            "observation_start": {
                "type": "string",
                "description": "Start date for observations (YYYY-MM-DD). Optional."
            },
            "limit": {
                "type": "integer",
                "description": "Number of most recent observations to return. Default: 12"
            }
        },
        "required": ["series_id"]
    }
}

SOURCE_TYPE = "ECONOMIC_DATA"


def _search_series(query: str, api_key: str) -> str:
    """Search FRED for series matching a keyword."""
    url = "https://api.stlouisfed.org/fred/series/search"
    params = {
        "search_text": query,
        "api_key": api_key,
        "file_type": "json",
        "limit": "5",
    }
    data = _get(url, params=params)
    series_list = data.get("seriess", [])
    if not series_list:
        return f"No FRED series found for '{query}'."

    lines = [f"FRED Series Search: '{query}'\n"]
    for s in series_list:
        sid = s.get("id", "N/A")
        title = s.get("title", "N/A")
        freq = s.get("frequency_short", "N/A")
        units = s.get("units_short", "N/A")
        last_updated = s.get("last_updated", "N/A")
        lines.append(f"  {sid}: {title}")
        lines.append(f"    Frequency: {freq} | Units: {units} | Updated: {last_updated[:10] if len(last_updated) > 10 else last_updated}")
        lines.append("")

    return "\n".join(lines)


def execute(tool_input: dict) -> tuple[str, str]:
    """Get FRED economic data. Returns (result_text, source_type)."""
    try:
        series_id = tool_input["series_id"]
        limit = tool_input.get("limit", 12)
        obs_start = tool_input.get("observation_start", "")
        api_key = os.environ.get("FRED_API_KEY", "")

        if not api_key:
            return "FRED_API_KEY environment variable not set. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html", SOURCE_TYPE

        # Handle search queries
        if series_id.startswith("search:"):
            query = series_id[7:].strip()
            result = _search_series(query, api_key)
            return result[:3000], SOURCE_TYPE

        # Fetch observations
        url = "https://api.stlouisfed.org/fred/series/observations"
        params = {
            "series_id": series_id.upper(),
            "api_key": api_key,
            "file_type": "json",
            "sort_order": "desc",
            "limit": str(limit),
        }
        if obs_start:
            params["observation_start"] = obs_start

        data = _get(url, params=params)

        observations = data.get("observations", [])

        # Also fetch series metadata
        meta_url = "https://api.stlouisfed.org/fred/series"
        meta_params = {
            "series_id": series_id.upper(),
            "api_key": api_key,
            "file_type": "json",
        }
        try:
            meta_data = _get(meta_url, params=meta_params)
            series_info = meta_data.get("seriess", [{}])[0]
        except Exception:
            series_info = {}

        title = series_info.get("title", COMMON_SERIES.get(series_id.upper(), series_id))
        units = series_info.get("units", "N/A")
        frequency = series_info.get("frequency", "N/A")
        seasonal = series_info.get("seasonal_adjustment", "N/A")

        lines = [f"FRED: {title}\n"]
        lines.append(f"Series: {series_id.upper()} | Units: {units}")
        lines.append(f"Frequency: {frequency} | Seasonal Adj: {seasonal}")
        lines.append("")

        if not observations:
            lines.append("No observations found.")
        else:
            lines.append("Recent Observations:")
            for obs in observations:
                date = obs.get("date", "N/A")
                value = obs.get("value", "N/A")
                lines.append(f"  {date}: {value}")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"FRED API error: {str(e)}", SOURCE_TYPE
