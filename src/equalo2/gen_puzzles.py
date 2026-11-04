"""Generate Equalo daily and practice puzzles that each have an exact zero-difference split.

Method (exact integer arithmetic throughout):
  1. Pick the statistic for the day (rotates; never the same two days running) and a size n in 5..10.
  2. Pick a value band (largest value at most BAND x the smallest) so no country is a rounding error.
  3. Pick a random side A of k countries (2 <= k <= n-2) and search the remaining countries in the band for a
     side B of n-k countries whose values sum to exactly sum(A) (hash lookups over singles and pairs).
  4. Check the candidate by brute force over all 2^(n-1) splits: count exact splits, reject when any country is
     half the total on its own, when a side of the exact split has fewer than 2 countries, or when the set
     covers fewer than 2 continents. Among valid candidates keep the most interesting one: a unique exact split
     first, then more well-known countries, then fewer countries repeated from the previous days.
Nothing about the data is changed: a set without an exact split is simply discarded.

Run: python3 gen_puzzles.py  -> writes puzzles.json (daily + practice)
"""
import json, os, random, itertools
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DAYS, PRACTICE = int(os.environ.get("EQ_DAYS", 730)), int(os.environ.get("EQ_PRACTICE", 400))
SIZES, SIZE_W = [5, 6, 7, 8, 9, 10], [2, 3, 3, 3, 2, 2]
BAND = 60          # largest / smallest value allowed within one puzzle
CANDIDATES = 6     # valid candidates compared per puzzle
FAMOUS = 5.0       # Voyago familiarity score treated as "well known"

def splits(vals):
    """All splits with the first country on the left. Yields (mask, diff) where diff = left - right (exact ints)."""
    n, tot = len(vals), sum(vals)
    for mask in range(1 << (n - 1)):
        left = vals[0] + sum(vals[i + 1] for i in range(n - 1) if mask >> i & 1)
        yield mask, 2 * left - tot

def analyse(vals):
    exact = []; n = len(vals)
    for mask, d in splits(vals):
        if d == 0:
            left = [0] + [i + 1 for i in range(n - 1) if mask >> i & 1]
            exact.append(left)
    return exact

class Gen:
    def __init__(self, seed):
        self.rng = random.Random(seed)
        data = json.load(open(os.path.join(HERE, "stats.json")))
        vj = json.load(open(os.path.join(HERE, "..", "voyago", "voyago.json")))["countries"]
        self.C = data["countries"]; self.stats = data["stats"]
        fam = {c["n"]: c["fam"] for c in vj}
        self.fam = [fam.get(c["n"], 0) for c in self.C]
        self.V = {s: {int(k): v for k, v in m["values"].items()} for s, m in self.stats.items()}

    def find_side(self, pool, vals, target, m, used):
        """Find m countries in pool (not in used) whose values sum exactly to target."""
        rng = self.rng
        free = [i for i in pool if i not in used]
        if m > 4:
            for _ in range(40):
                pick = rng.sample(free, m - 4)
                rest = target - sum(vals[i] for i in pick)
                if rest <= 0: continue
                got = self.find_side(pool, vals, rest, 4, used | set(pick))
                if got: return pick + got
            return None
        if m == 1:
            for i in free:
                if vals[i] == target: return [i]
            return None
        byv = defaultdict(list)
        for i in free: byv[vals[i]].append(i)
        if m == 2:
            order = free[:]; rng.shuffle(order)
            for a in order:
                for b in byv.get(target - vals[a], []):
                    if b != a: return [a, b]
            return None
        pairs = defaultdict(list)
        for a, b in itertools.combinations(free, 2): pairs[vals[a] + vals[b]].append((a, b))
        if m == 3:
            order = free[:]; rng.shuffle(order)
            for a in order:
                for b, c in pairs.get(target - vals[a], []):
                    if a not in (b, c): return [a, b, c]
            return None
        keys = list(pairs.items()); rng.shuffle(keys)
        for s, lst in keys:
            for a, b in lst:
                for c, d in pairs.get(target - s, []):
                    if len({a, b, c, d}) == 4: return [a, b, c, d]
        return None

    def candidate(self, stat, n, recent):
        rng, vals = self.rng, self.V[stat]
        ids = sorted((i for i in vals if i not in recent), key=vals.get)
        lo = rng.randrange(0, max(1, len(ids) - 2 * n))
        base = vals[ids[lo]]
        pool = [i for i in ids if base <= vals[i] <= base * BAND and i not in recent]
        if len(pool) < 2 * n: return None
        k = rng.randint(2, n - 2)
        a = rng.sample(pool, k)
        b = self.find_side(pool, vals, sum(vals[i] for i in a), n - k, set(a))
        if not b: return None
        cs = a + b; rng.shuffle(cs)
        v = [vals[i] for i in cs]
        tot = sum(v)
        if 2 * max(v) >= tot: return None
        if len({self.C[i]["r"] for i in cs}) < 2: return None
        exact = analyse(v)
        if not exact: return None
        good = [e for e in exact if 2 <= len(e) <= n - 2]
        if len(good) != len(exact): return None   # some exact split has a 1-country side: too obvious
        famous = sum(self.fam[i] >= FAMOUS for i in cs)
        if famous * 2 < n: return None
        sol = exact[0]
        if rng.random() < 0.5: sol = [i for i in range(n) if i not in sol]   # random side for the answer
        return {"s": stat, "c": cs, "sol": "".join("L" if i in sol else "R" for i in range(n)),
                "_rank": (len(exact), -famous, len(set(cs) & recent))}

    def puzzle(self, stat, n, recent):
        found = []
        for _ in range(4000):
            c = self.candidate(stat, n, recent)
            if c: found.append(c)
            if len(found) >= CANDIDATES: break
        if not found: return None
        best = min(found, key=lambda c: c["_rank"]); best.pop("_rank")
        return best

def main():
    g = Gen(20261104)
    stats = list(g.stats)
    days, recent, order, prev = [], [], [], None
    for d in range(DAYS):
        if not order:
            order = stats[:]; g.rng.shuffle(order)
            if order[0] == prev: order.append(order.pop(0))
        stat = order.pop(0)
        n = g.rng.choices(SIZES, SIZE_W)[0]
        p = None
        while p is None:
            p = g.puzzle(stat, n, set(itertools.chain(*recent[-3:])))
            if p is None: n = g.rng.choice(SIZES)   # this size had no valid set in this statistic: try another size
        days.append(p); recent.append(p["c"]); prev = stat
        if d % 50 == 0: print("day", d + 1, stat, n, flush=True)
    practice = []
    for k in range(PRACTICE):
        stat = stats[k % len(stats)]
        p = None
        while p is None: p = g.puzzle(stat, g.rng.choices(SIZES, SIZE_W)[0], set())
        practice.append(p)
    json.dump({"days": days, "practice": practice}, open(os.path.join(HERE, "puzzles.json"), "w"), separators=(",", ":"))
    from collections import Counter
    print("sizes", sorted(Counter(len(p["c"]) for p in days).items()), "stats", Counter(p["s"] for p in days))

if __name__ == "__main__":
    main()
