"""Alpha Vantage API for commodity and stock prices."""

import os
import time

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

# Commodity function names (these use the symbol as the function name)
COMMODITY_FUNCTIONS = {
    "WTI", "BRENT", "NATURAL_GAS", "COPPER", "ALUMINUM",
    "WHEAT", "CORN", "COTTON", "SUGAR", "COFFEE",
}

TOOL_DEFINITION = {
    "name": "get_commodity_price",
    "description": (
        "Get current and historical prices for stocks and commodities. "
        "For stocks, provide the ticker symbol (e.g. 'AAPL'). "
        "For commodities, use: WTI, BRENT, NATURAL_GAS, COPPER, ALUMINUM, "
        "WHEAT, CORN, COTTON, SUGAR, COFFEE. "
        "Returns latest price data and recent trend."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "symbol": {
                "type": "string",
                "description": "Stock ticker (e.g. 'AAPL') or commodity name (e.g. 'WTI', 'COPPER')"
            },
            "function": {
                "type": "string",
                "description": "API function: GLOBAL_QUOTE (default for stocks), or commodity name for commodities"
            }
        },
        "required": ["symbol"]
    }
}

SOURCE_TYPE = "MARKET_DATA"

# Simple rate limiting tracker
_last_call_time = 0


def execute(tool_input: dict) -> tuple[str, str]:
    """Get price data. Returns (result_text, source_type)."""
    global _last_call_time

    try:
        symbol = tool_input["symbol"].upper()
        func = tool_input.get("function", "").upper()
        api_key = os.environ.get("ALPHA_VANTAGE_API_KEY", "demo")

        # Rate limiting: Alpha Vantage allows 5 calls/min on free tier
        now = time.time()
        elapsed = now - _last_call_time
        if elapsed < 12.5:  # 60s / 5 calls = 12s between calls
            time.sleep(12.5 - elapsed)
        _last_call_time = time.time()

        is_commodity = symbol in COMMODITY_FUNCTIONS

        if is_commodity:
            # Commodity endpoint uses the symbol name as the function
            url = "https://www.alphavantage.co/query"
            params = {
                "function": symbol,
                "interval": "monthly",
                "apikey": api_key,
            }
        else:
            # Stock quote
            fn = func if func and func != "" else "GLOBAL_QUOTE"
            url = "https://www.alphavantage.co/query"
            params = {
                "function": fn,
                "symbol": symbol,
                "apikey": api_key,
            }

        data = _get(url, params=params, timeout=20)

        # Check for API error messages
        if "Error Message" in data:
            return f"Alpha Vantage error: {data['Error Message']}", SOURCE_TYPE
        if "Note" in data:
            return f"Alpha Vantage rate limit: {data['Note']}", SOURCE_TYPE
        if "Information" in data:
            return f"Alpha Vantage: {data['Information']}", SOURCE_TYPE

        lines = [f"Price Data: {symbol}\n"]

        if is_commodity:
            # Parse commodity response
            series_key = [k for k in data.keys() if k not in ("Meta Data",)]
            if not series_key:
                return f"No commodity data returned for {symbol}.", SOURCE_TYPE

            meta = data.get("Meta Data", {})
            if meta:
                lines.append(f"Name: {meta.get('1: Symbol', symbol)}")
                lines.append(f"Unit: {meta.get('2: Unit', 'N/A')}")
                lines.append("")

            for key in series_key:
                if isinstance(data[key], list):
                    points = data[key][:12]  # Last 12 months
                    for pt in points:
                        date = pt.get("date", "N/A")
                        value = pt.get("value", "N/A")
                        lines.append(f"  {date}: {value}")
                    break

        elif "Global Quote" in data:
            q = data["Global Quote"]
            lines.append(f"Symbol: {q.get('01. symbol', symbol)}")
            lines.append(f"Price: ${q.get('05. price', 'N/A')}")
            lines.append(f"Open: ${q.get('02. open', 'N/A')}")
            lines.append(f"High: ${q.get('03. high', 'N/A')}")
            lines.append(f"Low: ${q.get('04. low', 'N/A')}")
            lines.append(f"Volume: {q.get('06. volume', 'N/A')}")
            lines.append(f"Prev Close: ${q.get('08. previous close', 'N/A')}")
            lines.append(f"Change: {q.get('09. change', 'N/A')} ({q.get('10. change percent', 'N/A')})")
            lines.append(f"Latest Trading Day: {q.get('07. latest trading day', 'N/A')}")

        else:
            # Generic response - dump first few keys
            for key, val in list(data.items())[:3]:
                if isinstance(val, dict):
                    lines.append(f"{key}:")
                    for k2, v2 in list(val.items())[:8]:
                        lines.append(f"  {k2}: {v2}")
                elif isinstance(val, list):
                    lines.append(f"{key}: {len(val)} records")
                    for item in val[:5]:
                        lines.append(f"  {item}")

        result = "\n".join(lines)
        return result[:3000], SOURCE_TYPE

    except Exception as e:
        return f"Alpha Vantage error: {str(e)}", SOURCE_TYPE
