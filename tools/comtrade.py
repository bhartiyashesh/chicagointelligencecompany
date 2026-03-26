"""UN Comtrade Trade Flow Data via v2 API."""

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

# M49 country code mapping (top 20 trading nations)
COUNTRY_CODES = {
    "us": 842, "usa": 842, "united states": 842,
    "china": 156, "cn": 156,
    "germany": 276, "de": 276,
    "japan": 392, "jp": 392,
    "uk": 826, "united kingdom": 826, "gb": 826,
    "india": 356, "in": 356,
    "mexico": 484, "mx": 484,
    "canada": 124, "ca": 124,
    "south korea": 410, "korea": 410, "kr": 410,
    "france": 250, "fr": 250,
    "italy": 380, "it": 380,
    "brazil": 76, "br": 76,
    "australia": 36, "au": 36,
    "netherlands": 528, "nl": 528,
    "spain": 724, "es": 724,
    "vietnam": 704, "vn": 704,
    "thailand": 764, "th": 764,
    "taiwan": 158, "tw": 158,
    "indonesia": 360, "id": 360,
    "turkey": 792, "tr": 792,
}

TOOL_DEFINITION = {
    "name": "lookup_trade_flows",
    "description": (
        "Look up international trade flow data between countries using UN Comtrade. "
        "Returns import/export values and quantities for specific product categories (HS codes). "
        "Useful for supply chain analysis, tariff impact assessment, and trade dependency mapping."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "reporter_country": {
                "type": "string",
                "description": "Country reporting the trade (e.g. 'US', 'China', 'Germany')"
            },
            "partner_country": {
                "type": "string",
                "description": "Trading partner country"
            },
            "hs_code": {
                "type": "string",
                "description": "HS commodity code (e.g. '8542' for integrated circuits). Optional."
            },
            "year": {
                "type": "string",
                "description": "Year for data. Default: 2025"
            }
        },
        "required": ["reporter_country", "partner_country"]
    }
}

SOURCE_TYPE = "TRADE_DATA"


def _resolve_country(name: str) -> int | None:
    """Resolve country name/code to M49 numeric code."""
    key = name.strip().lower()
    return COUNTRY_CODES.get(key)


def execute(tool_input: dict) -> tuple[str, str]:
    """Look up trade flows. Returns (result_text, source_type)."""
    try:
        reporter = tool_input["reporter_country"]
        partner = tool_input["partner_country"]
        hs_code = tool_input.get("hs_code", "")
        year = tool_input.get("year", "2025")

        reporter_code = _resolve_country(reporter)
        partner_code = _resolve_country(partner)

        if reporter_code is None:
            return f"Unknown reporter country: '{reporter}'. Supported: {', '.join(set(v for k, v in [(k, k) for k in COUNTRY_CODES.keys() if len(k) > 2]))}", SOURCE_TYPE
        if partner_code is None:
            return f"Unknown partner country: '{partner}'. Use full name or ISO code.", SOURCE_TYPE

        url = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
        params = {
            "reporterCode": str(reporter_code),
            "partnerCode": str(partner_code),
            "period": year,
        }
        if hs_code:
            params["cmdCode"] = hs_code

        data = _get(url, params=params, timeout=20)

        records = data.get("data", [])
        if not records:
            return f"No trade data found for {reporter} <-> {partner} (HS: {hs_code or 'all'}, year: {year}).", SOURCE_TYPE

        lines = [f"Trade Flows: {reporter} <-> {partner} ({year})\n"]

        for rec in records[:15]:
            flow = rec.get("flowDesc", "N/A")
            commodity = rec.get("cmdDescE", rec.get("cmdCode", "N/A"))
            value = rec.get("primaryValue", 0)
            qty = rec.get("qty", "N/A")
            qty_unit = rec.get("qtyUnitAbbr", "")

            value_fmt = f"${value:,.0f}" if isinstance(value, (int, float)) else str(value)
            qty_fmt = f"{qty:,.0f} {qty_unit}" if isinstance(qty, (int, float)) else str(qty)

            lines.append(f"  {flow}: {commodity[:60]}")
            lines.append(f"    Value: {value_fmt} | Qty: {qty_fmt}")
            lines.append("")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"Comtrade API error: {str(e)}", SOURCE_TYPE
