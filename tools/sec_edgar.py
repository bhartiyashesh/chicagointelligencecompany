"""SEC EDGAR Full-Text Search via EFTS API."""

import urllib.parse

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
    "name": "search_sec_filings",
    "description": (
        "Search SEC EDGAR for company filings (10-K, 10-Q, 8-K, etc.) using full-text search. "
        "Returns filing titles, dates, and relevant excerpts. Useful for finding financial data, "
        "risk factors, supply chain disclosures, and corporate events."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query (e.g. 'supply chain disruption', 'tariff impact')"
            },
            "company": {
                "type": "string",
                "description": "Company name to filter results (optional)"
            },
            "filing_type": {
                "type": "string",
                "description": "Filing type: 10-K, 10-Q, 8-K, etc. Default: 10-K"
            }
        },
        "required": ["query"]
    }
}

SOURCE_TYPE = "SEC_EDGAR"

HEADERS = {"User-Agent": "CIC Research Agent (contact@chicagointelligence.com)"}


def execute(tool_input: dict) -> tuple[str, str]:
    """Search SEC EDGAR filings. Returns (result_text, source_type)."""
    try:
        query = tool_input["query"]
        company = tool_input.get("company", "")
        filing_type = tool_input.get("filing_type", "10-K")

        search_q = f'"{query}"'
        if company:
            search_q = f'{company} {search_q}'

        url = "https://efts.sec.gov/LATEST/search-index"
        params = {
            "q": search_q,
            "dateRange": "custom",
            "startdt": "2023-01-01",
            "enddt": "2026-03-20",
            "forms": filing_type,
        }

        data = _get(url, headers=HEADERS, params=params)

        hits = data.get("hits", {}).get("hits", [])
        if not hits:
            return f"No SEC filings found for query '{query}' (type: {filing_type}).", SOURCE_TYPE

        lines = [f"SEC EDGAR Results for '{query}' (type: {filing_type}):\n"]
        for i, hit in enumerate(hits[:5]):
            src = hit.get("_source", {})
            title = src.get("file_description", src.get("display_names", ["Unknown"])[0] if src.get("display_names") else "Unknown")
            company_name = ", ".join(src.get("display_names", ["Unknown"]))
            date = src.get("file_date", "N/A")
            form = src.get("form_type", filing_type)

            excerpt = ""
            highlights = hit.get("highlight", {})
            for field_highlights in highlights.values():
                if field_highlights:
                    excerpt = field_highlights[0][:300]
                    break

            lines.append(f"{i+1}. {company_name}")
            lines.append(f"   Form: {form} | Date: {date}")
            if title:
                lines.append(f"   Title: {title}")
            if excerpt:
                lines.append(f"   Excerpt: {excerpt}")
            lines.append("")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"SEC EDGAR search error: {str(e)}", SOURCE_TYPE
