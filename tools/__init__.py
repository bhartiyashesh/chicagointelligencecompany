"""
Supply Chain Intelligence Tools Package

Provides structured API tools for the CIC agent to query external data sources
covering SEC filings, trade flows, disruption news, commodity prices, carrier
data, economic indicators, weather alerts, disaster alerts, and US trade data.
"""

from tools.sec_edgar import TOOL_DEFINITION as SEC_EDGAR_DEF
from tools.sec_edgar import execute as sec_edgar_execute

from tools.comtrade import TOOL_DEFINITION as COMTRADE_DEF
from tools.comtrade import execute as comtrade_execute

from tools.gdelt import TOOL_DEFINITION as GDELT_DEF
from tools.gdelt import execute as gdelt_execute

from tools.alpha_vantage import TOOL_DEFINITION as ALPHA_VANTAGE_DEF
from tools.alpha_vantage import execute as alpha_vantage_execute

from tools.fmcsa import TOOL_DEFINITION as FMCSA_DEF
from tools.fmcsa import execute as fmcsa_execute

from tools.fred import TOOL_DEFINITION as FRED_DEF
from tools.fred import execute as fred_execute

from tools.noaa import TOOL_DEFINITION as NOAA_DEF
from tools.noaa import execute as noaa_execute

from tools.gdacs import TOOL_DEFINITION as GDACS_DEF
from tools.gdacs import execute as gdacs_execute

from tools.census import TOOL_DEFINITION as CENSUS_DEF
from tools.census import execute as census_execute

# All tool definitions in Anthropic tool schema format
SUPPLY_CHAIN_TOOLS: list[dict] = [
    SEC_EDGAR_DEF,
    COMTRADE_DEF,
    GDELT_DEF,
    ALPHA_VANTAGE_DEF,
    FMCSA_DEF,
    FRED_DEF,
    NOAA_DEF,
    GDACS_DEF,
    CENSUS_DEF,
]

# Dispatcher mapping: tool name -> (execute_function, source_type)
_TOOL_DISPATCH: dict[str, tuple] = {
    "search_sec_filings": (sec_edgar_execute, "SEC_EDGAR"),
    "lookup_trade_flows": (comtrade_execute, "TRADE_DATA"),
    "search_disruptions": (gdelt_execute, "NEWS_SCRAPER"),
    "get_commodity_price": (alpha_vantage_execute, "MARKET_DATA"),
    "lookup_carrier": (fmcsa_execute, "LOGISTICS_DATA"),
    "get_economic_indicator": (fred_execute, "ECONOMIC_DATA"),
    "get_weather_alert": (noaa_execute, "WEATHER_DATA"),
    "get_disaster_alert": (gdacs_execute, "WEATHER_DATA"),
    "get_us_trade_data": (census_execute, "TRADE_DATA"),
}


def execute_supply_chain_tool(name: str, tool_input: dict, emit=None) -> str:
    """
    Dispatch a supply chain tool call by name.

    Args:
        name: Tool name (must match a TOOL_DEFINITION name)
        tool_input: Dict of input parameters for the tool
        emit: Optional callback function for emitting intelligence findings.
              Called with {"type": "intelligence_finding", "source_type": ...,
              "finding_summary": ..., "tool_name": ...}

    Returns:
        Result string from the tool execution (truncated to 3000 chars max)
    """
    if name not in _TOOL_DISPATCH:
        return f"Unknown supply chain tool: '{name}'. Available: {', '.join(_TOOL_DISPATCH.keys())}"

    execute_fn, source_type = _TOOL_DISPATCH[name]

    try:
        result_text, result_source = execute_fn(tool_input)
    except Exception as e:
        result_text = f"Tool execution error ({name}): {str(e)}"
        result_source = source_type

    # Emit intelligence finding event
    if emit is not None:
        # Build a brief summary from the first line of the result
        summary_lines = result_text.strip().split("\n")
        summary = summary_lines[0][:200] if summary_lines else "No result"

        emit({
            "type": "intelligence_finding",
            "source_type": result_source,
            "finding_summary": summary,
            "tool_name": name,
        })

    # Ensure truncation
    if len(result_text) > 3000:
        result_text = result_text[:2970] + "\n\n[Truncated - results exceed 3000 chars]"

    return result_text
