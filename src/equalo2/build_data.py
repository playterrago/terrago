"""Equalo statistics: parse the committed source extracts into exact integers.

Inputs (all in ./sources, committed so the build is reproducible):
  wb_population_2024.csv   World Bank WDI SP.POP.TOTL, 2024 (via github.com/datasets/population)
  wb_gdp_2022.csv          World Bank WDI NY.GDP.MKTP.CD, 2022 (via github.com/datasets/gdp)
  factbook_extract.json    CIA World Factbook text fields (via github.com/factbook/factbook.json, commit 144d697, Sep 2026)
Country list and ISO3 codes come from ../equalo/ranko.json (the same 195 countries as every Terrago game).

Every value is stored as an integer in the statistic's base unit. A country is left out of a statistic
when the source has no value, the value is not a whole number in that unit, or it is zero/negative.
Nothing is estimated, interpolated or adjusted.

Run: python3 build_data.py   ->  writes stats.json
"""
import csv, json, re, os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
S = lambda f: os.path.join(HERE, "sources", f)

STATS = {
    "pop":    dict(name="Population", unit="people", unitShort="people", source="World Bank, World Development Indicators (SP.POP.TOTL)", year="2024",
                   definition="Total population: all residents regardless of legal status or citizenship, mid-year estimate."),
    "gdp":    dict(name="GDP", unit="US$ millions", unitShort="US$", source="World Bank, World Development Indicators (NY.GDP.MKTP.CD)", year="2022",
                   definition="Gross domestic product in current US dollars, rounded to the nearest US$ 1 million."),
    "land":   dict(name="Land area", unit="km²", unitShort="km²", source="CIA World Factbook, Geography: Area (land)", year="Factbook, Sep 2026 edition",
                   definition="Land area in square kilometres, excluding inland water bodies."),
    "mean":   dict(name="Mean elevation", unit="m", unitShort="m", source="CIA World Factbook, Geography: Elevation (mean elevation)", year="Factbook, Sep 2026 edition",
                   definition="Average height of the country's land surface above sea level, in metres."),
    "hi":     dict(name="Highest point", unit="m", unitShort="m", source="CIA World Factbook, Geography: Elevation (highest point)", year="Factbook, Sep 2026 edition",
                   definition="Elevation of the country's highest point above sea level, in metres."),
    "coast":  dict(name="Coastline", unit="km", unitShort="km", source="CIA World Factbook, Geography: Coastline", year="Factbook, Sep 2026 edition",
                   definition="Total length of the boundary between the land area (including islands) and the sea, in kilometres. Landlocked countries are not used."),
    "water":  dict(name="Renewable freshwater", unit="thousand m³", unitShort="m³", source="CIA World Factbook, Environment: Total renewable water resources (FAO AQUASTAT)", year="2022 est.",
                   definition="Long-term average annual flow of rivers and recharge of groundwater generated from precipitation, plus inflows from other countries."),
    "air":    dict(name="Airports", unit="airports", unitShort="airports", source="CIA World Factbook, Transportation: Airports", year="2025",
                   definition="Total number of airports or airfields recognizable from the air, paved or unpaved."),
}

NUM = r"(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?"

def as_int(txt):
    """First number in the text, as an exact int; None if it has a fractional part."""
    m = re.search(NUM, txt or "")
    if not m: return None
    if m.group(2) and int(m.group(2)) != 0: return None
    return int(m.group(1).replace(",", ""))

def highest_point(txt):
    t = re.sub(r"\([^)]*\)", " ", re.split(r"<br>|; note|;\s*located|;\s*\d", txt or "")[0]).strip()
    m = re.findall(NUM + r"\s*m\b", t) or re.findall(NUM + r"\s*$", t)
    if not m: return None
    whole, frac = m[-1]
    if frac and int(frac) != 0: return None
    return int(whole.replace(",", ""))

UNITS = {"trillion": Decimal(10) ** 9, "billion": Decimal(10) ** 6, "million": Decimal(10) ** 3, "": Decimal(1) / 1000}
def water_thousand_m3(txt):
    m = re.match(r"\s*([\d,]+(?:\.\d+)?)\s*(trillion|billion|million)?\s*cubic meters", txt or "")
    if not m: return None
    v = Decimal(m.group(1).replace(",", "")) * UNITS[m.group(2) or ""]
    return int(v) if v == v.to_integral_value() else None

def main():
    rk = json.load(open(os.path.join(HERE, "..", "equalo", "ranko.json")))
    wc = json.load(open(os.path.join(HERE, "iso2.json")))  # ISO3 -> ISO2 (from the world-countries package)
    fb = json.load(open(S("factbook_extract.json")))
    pop = {r["Country Code"]: r["Value"] for r in csv.DictReader(open(S("wb_population_2024.csv")))}
    gdp = {r["Country Code"]: r["Value"] for r in csv.DictReader(open(S("wb_gdp_2022.csv")))}
    countries, values = [], {k: {} for k in STATS}
    for k, c in enumerate(rk):
        iso3 = c["i"]; wbcode = "XKX" if iso3 in ("UNK", "XKX") else iso3
        countries.append({"n": c["c"], "r": c["r"], "iso3": iso3, "iso2": wc[iso3]})
        f = fb.get(iso3, {})
        vals = {
            "pop": int(pop[wbcode]) if pop.get(wbcode) else None,
            "gdp": int((Decimal(gdp[wbcode]) / Decimal(10) ** 6).quantize(Decimal(1), ROUND_HALF_UP)) if gdp.get(wbcode) else None,
            "land": as_int(f.get("land")),
            "mean": as_int(f.get("mean")),
            "hi": highest_point(f.get("hi")),
            "coast": as_int(f.get("coast")),
            "water": water_thousand_m3(f.get("water")),
            "air": as_int(f.get("air")),
        }
        for s, v in vals.items():
            if v is not None and v > 0: values[s][k] = v
    out = {"countries": countries, "stats": {k: {**m, "values": values[k]} for k, m in STATS.items()}}
    json.dump(out, open(os.path.join(HERE, "stats.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    for k, s in out["stats"].items():
        vs = s["values"]; top = sorted(vs.items(), key=lambda x: -x[1])[:3]; lo = sorted(vs.items(), key=lambda x: x[1])[:3]
        print(f"{k:6} {len(vs):3} countries  max {[(countries[int(i)]['n'], v) for i, v in top]}  min {[(countries[int(i)]['n'], v) for i, v in lo]}")

if __name__ == "__main__":
    main()
