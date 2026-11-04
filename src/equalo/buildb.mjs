import fs from "fs";
const d = JSON.parse(fs.readFileSync("ranko.json","utf8")).map(c=>({c:c.c,r:c.r,f:c.f,pop:c.pop,area:c.area,gdp:c.gdp}));
const t = fs.readFileSync("weigho-template.html","utf8").replace("/*DATA*/", JSON.stringify(d));
fs.writeFileSync("/home/claude/weigho.html", t);
