"""GDELT DOC API for disruption and supply chain news."""

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

TOOL_DEFINITION = {
    "name": "search_disruptions",
    "description": (
        "Search recent global news for supply chain disruptions, trade conflicts, natural disasters, "
        "port closures, factory shutdowns, and other events that impact logistics and commerce. "
        "Uses the GDELT global event database. No authentication required."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query (e.g. 'port strike supply chain', 'semiconductor shortage')"
            },
            "timespan": {
                "type": "string",
                "description": "Time window: e.g. '7d' (7 days), '30d', '3m'. Default: 7d"
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum articles to return (1-25). Default: 10"
            }
        },
        "required": ["query"]
    }
}

SOURCE_TYPE = "NEWS_SCRAPER"


def execute(tool_input: dict) -> tuple[str, str]:
    """Search GDELT for disruption news. Returns (result_text, source_type)."""
    try:
        query = tool_input["query"]
        timespan = tool_input.get("timespan", "7d")
        max_results = min(tool_input.get("max_results", 10), 25)

        url = "https://api.gdeltproject.org/api/v2/doc/doc"
        params = {
            "query": query,
            "mode": "artlist",
            "maxrecords": str(max_results),
            "timespan": timespan,
            "format": "json",
        }

        data = _get(url, params=params, timeout=20)

        articles = data.get("articles", [])
        if not articles:
            return f"No recent news found for '{query}' in the last {timespan}.", SOURCE_TYPE

        lines = [f"Disruption News: '{query}' (last {timespan})\n"]

        for i, art in enumerate(articles[:max_results]):
            title = art.get("title", "Untitled")
            url_link = art.get("url", "")
            source = art.get("domain", art.get("source", "Unknown"))
            date = art.get("seendate", "N/A")
            tone = art.get("tone", 0)

            # Format date if present (GDELT format: YYYYMMDDTHHmmSSZ)
            if date and len(date) >= 8 and date != "N/A":
                date = f"{date[:4]}-{date[4:6]}-{date[6:8]}"

            tone_label = "negative" if isinstance(tone, (int, float)) and tone < -3 else \
                         "positive" if isinstance(tone, (int, float)) and tone > 3 else "neutral"

            lines.append(f"{i+1}. {title}")
            lines.append(f"   Source: {source} | Date: {date} | Tone: {tone_label} ({tone})")
            lines.append(f"   URL: {url_link}")
            lines.append("")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"GDELT search error: {str(e)}", SOURCE_TYPE
