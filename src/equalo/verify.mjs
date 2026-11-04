import fs from "fs";
const html = fs.readFileSync("/home/claude/weigho.html","utf8");
const js = html.split("<script>")[1].split("/* ---------- state")[0];
const f = new Function(js + "; return {makeSet, byName, optimum, ROUNDS};")();
let fail=0, t0=Date.now(), seen={};
for (let D=1; D<=365; D++){ const s=f.makeSet(20261106+D*15485863); if(!s){fail++;continue;} s.forEach(n=>seen[n]=(seen[n]||0)+1); if(D<=3) console.log(D, s.join(", "), f.ROUNDS.map(k=>f.optimum(s.map(n=>f.byName[n][k])).p.toFixed(2)).join(" / ")); }
console.log("fail",fail,"ms",Date.now()-t0,"distinct",Object.keys(seen).length);
