"""NOAA Weather Alerts API."""

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
    "name": "get_weather_alert",
    "description": (
        "Get active weather alerts from NOAA (National Weather Service). "
        "Search by geographic coordinates (lat/lon), US state code (e.g. 'IL', 'TX'), "
        "or weather zone. Returns active severe weather warnings, watches, and advisories "
        "that could impact supply chains and logistics."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "lat": {
                "type": "number",
                "description": "Latitude (e.g. 41.8781 for Chicago)"
            },
            "lon": {
                "type": "number",
                "description": "Longitude (e.g. -87.6298 for Chicago)"
            },
            "state": {
                "type": "string",
                "description": "US state code (e.g. 'IL', 'TX', 'CA'). Alternative to lat/lon."
            },
            "zone": {
                "type": "string",
                "description": "NWS zone ID (e.g. 'ILZ014'). Alternative to lat/lon or state."
            }
        },
        "required": []
    }
}

SOURCE_TYPE = "WEATHER_DATA"

HEADERS = {
    "User-Agent": "CIC Research Agent (contact@chicagointelligence.com)",
    "Accept": "application/geo+json",
}


def execute(tool_input: dict) -> tuple[str, str]:
    """Get weather alerts. Returns (result_text, source_type)."""
    try:
        lat = tool_input.get("lat")
        lon = tool_input.get("lon")
        state = tool_input.get("state")
        zone = tool_input.get("zone")

        base_url = "https://api.weather.gov/alerts/active"

        if lat is not None and lon is not None:
            url = base_url
            params = {"point": f"{lat},{lon}"}
        elif state:
            url = base_url
            params = {"area": state.upper()}
        elif zone:
            url = base_url
            params = {"zone": zone}
        else:
            return "Provide lat/lon, state, or zone to search for weather alerts.", SOURCE_TYPE

        data = _get(url, headers=HEADERS, params=params, timeout=15)

        features = data.get("features", [])
        if not features:
            location = state or zone or f"{lat},{lon}"
            return f"No active weather alerts for {location}.", SOURCE_TYPE

        lines = []
        location_desc = state or zone or f"{lat},{lon}"
        lines.append(f"Active Weather Alerts: {location_desc}\n")
        lines.append(f"Total alerts: {len(features)}\n")

        for i, feature in enumerate(features[:10]):
            props = feature.get("properties", {})
            event = props.get("event", "Unknown")
            severity = props.get("severity", "N/A")
            urgency = props.get("urgency", "N/A")
            headline = props.get("headline", "No headline")
            description = props.get("description", "")
            areas = props.get("areaDesc", "N/A")
            onset = props.get("onset", "N/A")
            expires = props.get("expires", "N/A")

            # Truncate description
            if len(description) > 200:
                description = description[:200] + "..."

            severity_icon = {"Extreme": "[!!!]", "Severe": "[!!]", "Moderate": "[!]"}.get(severity, "[ ]")

            lines.append(f"{i+1}. {severity_icon} {event}")
            lines.append(f"   Severity: {severity} | Urgency: {urgency}")
            lines.append(f"   Headline: {headline}")
            lines.append(f"   Areas: {areas[:150]}")
            lines.append(f"   Onset: {onset} | Expires: {expires}")
            if description:
                lines.append(f"   Details: {description}")
            lines.append("")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"NOAA weather alert error: {str(e)}", SOURCE_TYPE
