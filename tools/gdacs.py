"""GDACS/USGS Disaster Alerts — earthquakes, tropical cyclones, floods."""

import xml.etree.ElementTree as ET

try:
    import httpx
    def _get_text(url, headers=None, timeout=15):
        r = httpx.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.text
    def _get_json(url, headers=None, timeout=15):
        r = httpx.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.json()
except ImportError:
    import requests
    def _get_text(url, headers=None, timeout=15):
        r = requests.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.text
    def _get_json(url, headers=None, timeout=15):
        r = requests.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.json()

TOOL_DEFINITION = {
    "name": "get_disaster_alert",
    "description": (
        "Get current global disaster alerts from GDACS (Global Disaster Alert and Coordination System) "
        "and USGS earthquake data. Covers earthquakes, tropical cyclones, floods, and other natural "
        "disasters that can disrupt supply chains and logistics."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "alert_type": {
                "type": "string",
                "description": "Filter by type: 'EQ' (earthquake), 'TC' (tropical cyclone), 'FL' (flood), or omit for all"
            },
            "min_severity": {
                "type": "string",
                "description": "Minimum severity: 'Green', 'Orange', or 'Red'. Default: Orange"
            }
        },
        "required": []
    }
}

SOURCE_TYPE = "WEATHER_DATA"

SEVERITY_ORDER = {"Green": 0, "Orange": 1, "Red": 2}
HEADERS = {"User-Agent": "CIC Research Agent (contact@chicagointelligence.com)"}


def _parse_gdacs_rss(xml_text: str, alert_type: str | None, min_severity: str) -> list[dict]:
    """Parse GDACS RSS feed XML into alert dicts."""
    alerts = []
    min_level = SEVERITY_ORDER.get(min_severity, 1)

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    # GDACS RSS uses namespaces
    ns = {"gdacs": "http://www.gdacs.org"}

    for item in root.iter("item"):
        title = item.findtext("title", "")
        description = item.findtext("description", "")
        pub_date = item.findtext("pubDate", "")
        link = item.findtext("link", "")

        # Try to extract GDACS-specific fields
        event_type = item.findtext("gdacs:eventtype", "", ns) or item.findtext("{http://www.gdacs.org}eventtype", "")
        severity = item.findtext("gdacs:alertlevel", "", ns) or item.findtext("{http://www.gdacs.org}alertlevel", "")
        country = item.findtext("gdacs:country", "", ns) or item.findtext("{http://www.gdacs.org}country", "")

        # Filter by alert type
        if alert_type and event_type and event_type.upper() != alert_type.upper():
            continue

        # Filter by severity
        severity_level = SEVERITY_ORDER.get(severity, 0)
        if severity_level < min_level:
            continue

        alerts.append({
            "title": title,
            "type": event_type or "Unknown",
            "severity": severity or "Unknown",
            "country": country,
            "date": pub_date,
            "description": description[:200] if description else "",
            "link": link,
        })

    return alerts


def _fetch_usgs_earthquakes() -> list[dict]:
    """Fetch significant earthquakes from USGS in the last month."""
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson"
    try:
        data = _get_json(url, headers=HEADERS, timeout=15)
    except Exception:
        return []

    quakes = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        coords = feature.get("geometry", {}).get("coordinates", [0, 0, 0])
        quakes.append({
            "title": props.get("title", "Unknown earthquake"),
            "type": "EQ",
            "severity": "Red" if props.get("mag", 0) >= 7 else "Orange" if props.get("mag", 0) >= 5 else "Green",
            "magnitude": props.get("mag", "N/A"),
            "location": props.get("place", "Unknown"),
            "date": props.get("time", ""),
            "tsunami": props.get("tsunami", 0),
            "link": props.get("url", ""),
            "coordinates": {"lon": coords[0], "lat": coords[1], "depth_km": coords[2]} if len(coords) >= 3 else {},
        })

    return quakes


def execute(tool_input: dict) -> tuple[str, str]:
    """Get disaster alerts. Returns (result_text, source_type)."""
    try:
        alert_type = tool_input.get("alert_type", "")
        min_severity = tool_input.get("min_severity", "Orange")

        lines = ["Global Disaster Alerts\n"]
        all_alerts = []

        # Fetch GDACS RSS
        try:
            gdacs_xml = _get_text("https://www.gdacs.org/xml/rss.xml", headers=HEADERS, timeout=15)
            gdacs_alerts = _parse_gdacs_rss(gdacs_xml, alert_type or None, min_severity)
            all_alerts.extend(gdacs_alerts)
        except Exception as e:
            lines.append(f"(GDACS feed unavailable: {str(e)[:80]})")

        # Fetch USGS earthquakes if no type filter or EQ requested
        if not alert_type or alert_type.upper() == "EQ":
            try:
                usgs_quakes = _fetch_usgs_earthquakes()
                min_level = SEVERITY_ORDER.get(min_severity, 1)
                usgs_quakes = [q for q in usgs_quakes if SEVERITY_ORDER.get(q["severity"], 0) >= min_level]
                all_alerts.extend(usgs_quakes)
            except Exception as e:
                lines.append(f"(USGS feed unavailable: {str(e)[:80]})")

        if not all_alerts:
            filter_desc = f" (type: {alert_type})" if alert_type else ""
            return f"No active disaster alerts at severity >= {min_severity}{filter_desc}.", SOURCE_TYPE

        lines.append(f"Found {len(all_alerts)} alert(s) at severity >= {min_severity}:\n")

        for i, alert in enumerate(all_alerts[:10]):
            severity_icon = {"Red": "[!!!]", "Orange": "[!!]", "Green": "[!]"}.get(alert.get("severity", ""), "[ ]")
            atype = alert.get("type", "Unknown")
            type_name = {"EQ": "Earthquake", "TC": "Tropical Cyclone", "FL": "Flood"}.get(atype, atype)

            lines.append(f"{i+1}. {severity_icon} {type_name}: {alert.get('title', 'N/A')}")

            if alert.get("magnitude"):
                lines.append(f"   Magnitude: {alert['magnitude']}")
            if alert.get("country"):
                lines.append(f"   Country: {alert['country']}")
            if alert.get("location"):
                lines.append(f"   Location: {alert['location']}")
            lines.append(f"   Severity: {alert.get('severity', 'N/A')}")
            if alert.get("date"):
                lines.append(f"   Date: {alert['date']}")
            if alert.get("description"):
                lines.append(f"   Details: {alert['description']}")
            if alert.get("tsunami"):
                lines.append(f"   Tsunami warning: YES")
            if alert.get("link"):
                lines.append(f"   Link: {alert['link']}")
            lines.append("")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"Disaster alert error: {str(e)}", SOURCE_TYPE
