"""Build the Equalo page: inline stats + puzzles into the template, copy the flags the puzzles use.

Run (after build_data.py and gen_puzzles.py, and after test_puzzles.py passes):
  python3 build_page.py   ->  ../standalone/equalo.html and /flags/*.svg
Flags: flag-icons (MIT, https://github.com/lipis/flag-icons), 4x3 SVGs. Set FLAGS_DIR to its flags/4x3 folder.
"""
import json, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "..", ".."))
FLAGS_DIR = os.environ.get("FLAGS_DIR", "/home/claude/data/node_modules/flag-icons/flags/4x3")

def main():
    st = json.load(open(os.path.join(HERE, "stats.json")))
    pz = json.load(open(os.path.join(HERE, "puzzles.json")))
    used = sorted({i for p in pz["days"] + pz["practice"] for i in p["c"]})
    stats = {}
    for k, m in st["stats"].items():
        stats[k] = {f: m[f] for f in ("name", "unit", "definition", "source", "year")}
        stats[k]["values"] = {str(i): m["values"][str(i)] for i in used if str(i) in m["values"]}
    countries = [[c["n"], c["iso2"], c["r"]] for c in st["countries"]]
    data = {"countries": countries, "stats": stats, "days": pz["days"], "practice": pz["practice"]}
    tpl = open(os.path.join(HERE, "equalo-template.html"), encoding="utf-8").read()
    assert tpl.count("/*DATA*/") == 1
    out = tpl.replace("/*DATA*/", json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    open(os.path.join(SITE, "src", "standalone", "equalo.html"), "w", encoding="utf-8").write(out)
    os.makedirs(os.path.join(SITE, "flags"), exist_ok=True)
    for i in used:
        f = st["countries"][i]["iso2"]
        shutil.copyfile(os.path.join(FLAGS_DIR, f + ".svg"), os.path.join(SITE, "flags", f + ".svg"))
    print(f"equalo.html {len(out) // 1024} KB, {len(used)} countries, {len(used)} flags")

if __name__ == "__main__":
    main()
