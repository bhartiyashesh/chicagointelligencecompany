"""FMCSA (Federal Motor Carrier Safety Administration) Carrier Lookup."""

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

TOOL_DEFINITION = {
    "name": "lookup_carrier",
    "description": (
        "Look up freight carrier and trucking company information from FMCSA (Federal Motor "
        "Carrier Safety Administration). Returns safety ratings, fleet size, operating status, "
        "and authority information. Search by company name or USDOT number."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Company name or USDOT number to search for"
            },
            "search_type": {
                "type": "string",
                "description": "Search type: 'NAME' (search by name) or 'USDOT' (search by DOT number). Default: NAME"
            }
        },
        "required": ["query"]
    }
}

SOURCE_TYPE = "LOGISTICS_DATA"


def execute(tool_input: dict) -> tuple[str, str]:
    """Look up carrier info. Returns (result_text, source_type)."""
    try:
        query = tool_input["query"]
        search_type = tool_input.get("search_type", "NAME").upper()
        api_key = os.environ.get("FMCSA_API_KEY", "")

        if not api_key:
            return "FMCSA_API_KEY environment variable not set. Get a free key at https://mobile.fmcsa.dot.gov/qc/services/registration", SOURCE_TYPE

        if search_type == "USDOT":
            url = f"https://mobile.fmcsa.dot.gov/qc/services/carriers/{query}"
            params = {"webKey": api_key}
        else:
            url = f"https://mobile.fmcsa.dot.gov/qc/services/carriers/name/{query}"
            params = {"webKey": api_key}

        data = _get(url, params=params, timeout=15)

        # FMCSA response structure varies
        content = data.get("content", data)

        # Handle list of carriers (name search)
        carriers = []
        if isinstance(content, list):
            carriers = content[:5]
        elif isinstance(content, dict):
            carrier_data = content.get("carrier", content)
            if isinstance(carrier_data, list):
                carriers = carrier_data[:5]
            else:
                carriers = [carrier_data]

        if not carriers:
            return f"No carriers found for '{query}'.", SOURCE_TYPE

        lines = [f"FMCSA Carrier Results for '{query}':\n"]

        for i, c in enumerate(carriers):
            name = c.get("legalName", c.get("dbaName", "Unknown"))
            dot_num = c.get("dotNumber", "N/A")
            mc_num = c.get("mcNumber", "N/A")
            status = c.get("statusCode", c.get("allowedToOperate", "N/A"))
            safety_rating = c.get("safetyRating", "Not Rated")
            total_drivers = c.get("totalDrivers", "N/A")
            total_power_units = c.get("totalPowerUnits", "N/A")
            state = c.get("phyState", "N/A")
            city = c.get("phyCity", "N/A")

            allowed = c.get("allowedToOperate", "")
            allowed_str = "ALLOWED" if str(allowed).upper() in ("Y", "YES", "TRUE", "ALLOWED") else \
                          "NOT ALLOWED" if str(allowed).upper() in ("N", "NO", "FALSE", "NOT ALLOWED") else str(allowed)

            lines.append(f"{i+1}. {name}")
            lines.append(f"   USDOT: {dot_num} | MC: {mc_num}")
            lines.append(f"   Status: {allowed_str}")
            lines.append(f"   Safety Rating: {safety_rating}")
            lines.append(f"   Fleet: {total_power_units} power units, {total_drivers} drivers")
            lines.append(f"   Location: {city}, {state}")
            lines.append("")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"FMCSA lookup error: {str(e)}", SOURCE_TYPE
