from __future__ import annotations

# Display names are deliberately separate from the stable DOT carrier identifier.
# The code remains visible in the product because names and ownership can change.
CARRIER_NAMES: dict[str, str] = {
    "9E": "Endeavor Air",
    "AA": "American Airlines",
    "AS": "Alaska Airlines",
    "B6": "JetBlue Airways",
    "DL": "Delta Air Lines",
    "EV": "ExpressJet Airlines",
    "F9": "Frontier Airlines",
    "G4": "Allegiant Air",
    "HA": "Hawaiian Airlines",
    "MQ": "Envoy Air",
    "MX": "Breeze Airways",
    "NK": "Spirit Airlines",
    "OH": "PSA Airlines",
    "OO": "SkyWest Airlines",
    "QX": "Horizon Air",
    "UA": "United Airlines",
    "VX": "Virgin America",
    "WN": "Southwest Airlines",
    "XP": "Avelo Airlines",
    "YV": "Mesa Airlines",
    "YX": "Republic Airways",
}


def carrier_name(code: str) -> str:
    return CARRIER_NAMES.get(code, code)
