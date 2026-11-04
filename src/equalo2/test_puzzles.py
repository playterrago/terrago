"""Independent check of every Equalo puzzle (daily and practice). Exits non-zero on any failure.

For each puzzle, by brute force over all 2^(n-1) splits with exact integers:
  - 5 <= n <= 10, no repeated country, every value exists in stats.json and is a positive integer
  - at least one split has a difference of exactly 0, and the stored solution is one of them
  - every exact split has at least 2 countries on each side; no country is half the total or more
  - at least 2 continents
Across the schedule: every size 5..10 appears, no statistic two days running, every statistic is used,
and the values used match the committed source extracts (stats.json is rebuilt and compared).
"""
import json, os, sys, subprocess, collections

HERE = os.path.dirname(os.path.abspath(__file__))
fails = []
def check(cond, msg):
    if not cond: fails.append(msg)

st = json.load(open(os.path.join(HERE, "stats.json")))
pz = json.load(open(os.path.join(HERE, "puzzles.json")))
C = st["countries"]

def splits(v):
    n, tot = len(v), sum(v)
    for mask in range(1 << (n - 1)):
        left = v[0] + sum(v[i + 1] for i in range(n - 1) if mask >> i & 1)
        yield mask, 2 * left - tot

def verify(p, tag):
    n = len(p["c"]); vals = st["stats"][p["s"]]["values"]
    check(5 <= n <= 10, f"{tag}: size {n}")
    check(len(set(p["c"])) == n, f"{tag}: repeated country")
    v = []
    for i in p["c"]:
        x = vals.get(str(i))
        check(isinstance(x, int) and x > 0, f"{tag}: {C[i]['n']} has no positive integer {p['s']} value")
        v.append(x or 0)
    tot = sum(v)
    check(all(2 * x < tot for x in v), f"{tag}: one country is half the total or more")
    exact = []
    for mask, d in splits(v):
        if d == 0:
            left = {0} | {i + 1 for i in range(n - 1) if mask >> i & 1}
            exact.append(left)
    check(len(exact) >= 1, f"{tag}: no exact split")
    for e in exact: check(2 <= len(e) <= n - 2, f"{tag}: exact split with a 1-country side")
    sol = p["sol"]; check(len(sol) == n and set(sol) <= {"L", "R"}, f"{tag}: bad solution string")
    L = sum(x for x, s in zip(v, sol) if s == "L"); R = sum(x for x, s in zip(v, sol) if s == "R")
    check(L == R and L > 0, f"{tag}: stored solution does not balance ({L} vs {R})")
    check(len({C[i]["r"] for i in p["c"]}) >= 2, f"{tag}: one continent")
    return len(exact)

uniq = collections.Counter()
for d, p in enumerate(pz["days"]): uniq[verify(p, f"day {d + 1}")] += 1
for k, p in enumerate(pz["practice"]): verify(p, f"practice {k}")
sizes = collections.Counter(len(p["c"]) for p in pz["days"])
check(set(sizes) == set(range(5, 11)), f"daily sizes {sorted(sizes)}")
check(all(a["s"] != b["s"] for a, b in zip(pz["days"], pz["days"][1:])), "same statistic two days running")
check(set(p["s"] for p in pz["days"]) == set(st["stats"]), "a statistic is never used")

# stats.json must be exactly what the committed sources produce
before = open(os.path.join(HERE, "stats.json")).read()
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
check(open(os.path.join(HERE, "stats.json")).read() == before, "stats.json differs from a rebuild of the sources")

print(f"{len(pz['days'])} daily + {len(pz['practice'])} practice puzzles checked")
print("daily sizes:", dict(sorted(sizes.items())), "| exact splits per daily puzzle:", dict(sorted(uniq.items())))
print("statistics:", dict(collections.Counter(p["s"] for p in pz["days"])))
if fails:
    print(f"{len(fails)} FAILURES"); [print(" -", f) for f in fails[:30]]; sys.exit(1)
print("ALL PUZZLES VALID")
