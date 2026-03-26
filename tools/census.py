"""US Census Bureau Foreign Trade Data API."""

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
    "name": "get_us_trade_data",
    "description": (
        "Get US international trade data from the Census Bureau. "
        "Look up import/export values by HS code (product category), country, and time period. "
        "Useful for analyzing trade volumes, identifying supply chain dependencies, "
        "and assessing tariff impacts on specific goods."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "hs_code": {
                "type": "string",
                "description": "HS commodity code (e.g. '8542' for integrated circuits, '2709' for crude petroleum)"
            },
            "trade_type": {
                "type": "string",
                "description": "'imports' or 'exports'. Default: imports"
            },
            "country": {
                "type": "string",
                "description": "Country name or code to filter by (optional)"
            },
            "year": {
                "type": "string",
                "description": "Year for data. Default: 2025"
            }
        },
        "required": ["hs_code"]
    }
}

SOURCE_TYPE = "TRADE_DATA"

# Common country codes for Census trade data
CENSUS_COUNTRY_CODES = {
    "china": "5700", "cn": "5700",
    "japan": "5880", "jp": "5880",
    "germany": "4280", "de": "4280",
    "uk": "4120", "united kingdom": "4120", "gb": "4120",
    "canada": "1220", "ca": "1220",
    "mexico": "2010", "mx": "2010",
    "south korea": "5800", "korea": "5800", "kr": "5800",
    "india": "5330", "in": "5330",
    "taiwan": "5830", "tw": "5830",
    "vietnam": "5520", "vn": "5520",
    "brazil": "3510", "br": "3510",
    "france": "4270", "fr": "4270",
    "italy": "4759", "it": "4759",
    "australia": "6021", "au": "6021",
    "netherlands": "4210", "nl": "4210",
    "thailand": "5490", "th": "5490",
    "indonesia": "5600", "id": "5600",
    "turkey": "4890", "tr": "4890",
    "spain": "4791", "es": "4791",
}


def execute(tool_input: dict) -> tuple[str, str]:
    """Get US trade data. Returns (result_text, source_type)."""
    try:
        hs_code = tool_input["hs_code"]
        trade_type = tool_input.get("trade_type", "imports").lower()
        country = tool_input.get("country", "")
        year = tool_input.get("year", "2025")
        api_key = os.environ.get("CENSUS_API_KEY", "")

        if trade_type not in ("imports", "exports"):
            trade_type = "imports"

        # Build Census API URL
        base_url = f"https://api.census.gov/data/timeseries/intltrade/{trade_type}/hs"

        get_fields = "GEN_VAL_MO,CON_VAL_MO,HS_ID"
        if trade_type == "exports":
            get_fields = "ALL_VAL_MO,HS_ID"

        params = {
            "get": get_fields,
            "COMM_LVL": "HS6",
            "I_COMMODITY": hs_code,
            "time": year,
        }

        if country:
            country_code = CENSUS_COUNTRY_CODES.get(country.lower())
            if country_code:
                if trade_type == "imports":
                    params["CTY_CODE"] = country_code
                else:
                    params["CTY_CODE"] = country_code

        if api_key:
            params["key"] = api_key

        data = _get(base_url, params=params, timeout=20)

        if not data or len(data) < 2:
            return f"No US {trade_type} data found for HS code {hs_code} (year: {year}).", SOURCE_TYPE

        # Census API returns array of arrays: first row is headers, rest are data
        headers_row = data[0]
        rows = data[1:]

        lines = [f"US {trade_type.title()} Data: HS {hs_code} ({year})\n"]

        # Parse column indices
        col_map = {h: i for i, h in enumerate(headers_row)}

        total_value = 0
        monthly_data = []

        for row in rows:
            time_val = row[col_map.get("time", -1)] if "time" in col_map else "N/A"

            if trade_type == "imports":
                gen_val = row[col_map.get("GEN_VAL_MO", -1)] if "GEN_VAL_MO" in col_map else "0"
                con_val = row[col_map.get("CON_VAL_MO", -1)] if "CON_VAL_MO" in col_map else "0"
                try:
                    val = int(gen_val)
                    total_value += val
                except (ValueError, TypeError):
                    val = gen_val

                monthly_data.append({
                    "period": time_val,
                    "general_value": gen_val,
                    "consumption_value": con_val,
                })
            else:
                all_val = row[col_map.get("ALL_VAL_MO", -1)] if "ALL_VAL_MO" in col_map else "0"
                try:
                    val = int(all_val)
                    total_value += val
                except (ValueError, TypeError):
                    val = all_val

                monthly_data.append({
                    "period": time_val,
                    "value": all_val,
                })

        if total_value:
            lines.append(f"Total Value: ${total_value:,.0f}\n")

        lines.append("Monthly Breakdown:")
        for md in monthly_data[:12]:
            period = md["period"]
            if trade_type == "imports":
                gen = md["general_value"]
                try:
                    gen_fmt = f"${int(gen):,.0f}"
                except (ValueError, TypeError):
                    gen_fmt = str(gen)
                lines.append(f"  {period}: General={gen_fmt}")
            else:
                val = md["value"]
                try:
                    val_fmt = f"${int(val):,.0f}"
                except (ValueError, TypeError):
                    val_fmt = str(val)
                lines.append(f"  {period}: Value={val_fmt}")

        if country:
            lines.append(f"\nFiltered by country: {country}")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"Census trade data error: {str(e)}", SOURCE_TYPE
