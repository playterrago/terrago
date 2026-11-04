import fs from "fs";
const top = fs.readFileSync("roadtripo-template.html", "utf8");
const js = fs.readFileSync("roadtripo-script.html", "utf8").replace("/*DATA*/", fs.readFileSync("roadtripo.json", "utf8"));
fs.writeFileSync("/home/claude/roadtripo.html", top + js);
// verify a year of daily trips
const code = js.split("<script>")[1].split("/* ---------- state")[0];
const f = new Function(code.replace("let practice", "var practice") + "; return { makeTrip, dailyLandmark, plan, LM, R, DIST };")();
let fail = 0; const used = {};
for (let d = 1; d <= 365; d++) {
  const lm = f.dailyLandmark(d), t = f.makeTrip(20261106 + d * 104729, lm);
  if (!t) { fail++; console.log("FAIL day", d, f.LM[lm].n); continue; }
  used[lm] = (used[lm] || 0) + 1;
  if (d <= 6) { const p = f.plan(t.a, t.b, f.LM[lm].s); console.log(d, f.R[t.a].n, "→", f.R[t.b].n, "via", f.LM[lm].n, "| best", p.best, "direct", f.DIST[t.a][t.b] - 1); }
}
console.log("fails", fail, "landmarks used", Object.keys(used).length);
