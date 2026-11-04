// Voyago scoring and results test (Playwright). Run with a static server on the repo root:
//   node test_scoring.js http://localhost:8765 [shotsDir]
const { chromium, devices } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8765", OUT = process.argv[3] || null;
const fail = []; const ok = (c, m) => { if (!c) fail.push(m); console.log((c ? "PASS " : "FAIL ") + m); };
const BLOCK = /googlesyndication|gc\.zgo\.at|fonts\.(googleapis|gstatic)/;
async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext(opts); await ctx.route(BLOCK, r => r.abort());
  const page = await ctx.newPage(); page._errs = []; page.on("pageerror", e => page._errs.push(e.message));
  return { ctx, page };
}
const DAYCALC = () => { const n = new Date(); return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(2026, 10, 2)) / 864e5) + 1; };

(async () => {
  const browser = await chromium.launch();

  /* ---------- 1. scoring rules (in the real page) ---------- */
  {
    const { ctx, page } = await fresh(browser);
    await page.goto(BASE + "/voyago/");
    const r = await page.evaluate(() => {
      const out = {};
      out.tiers = TIERS.map(t => t.pts);
      out.max = NQ * TIERS[TIERS.length - 1].pts;
      /* every prompt: best-known answer scores 10, rarest scores 100, invalid scores 0, points never decrease down the ranking */
      let mono = true, common = true, rare = true, invalid = true;
      BANK.forEach(p => {
        const s = famSort(p), pts = s.map(c => pointsFor(1, p, c.n).pts);
        if (pts[0] !== 10) common = false; if (pts[pts.length - 1] !== 100) rare = false;
        for (let i = 1; i < pts.length; i++) if (pts[i] < pts[i - 1]) mono = false;
        const bad = C.find(c => !p.ans.includes(c.n)); if (bad && pointsFor(1, p, bad.n).pts !== 0) invalid = false;
        if (pointsFor(1, p, null).pts !== 0) invalid = false;
      });
      Object.assign(out, { mono, common, rare, invalid, bank: BANK.length });
      /* normalization */
      const k = t => (find(CLOOK, t) || {}).n, cap = t => (find(KLOOK, t) || {}).n;
      out.norm = { "the netherlands": k("the Netherlands"), "U.S.A.": k("U.S.A."), "côte d'ivoire": k("côte d'ivoire"), "COTE D IVOIRE": k("COTE D IVOIRE"), "st lucia": k("st lucia"), "St. Kitts & Nevis": k("St. Kitts & Nevis"), "Burma": k("Burma"), "Türkiye": k("Türkiye"), "Czech Republic": k("Czech Republic"), "the gambia": k("the gambia"), "Bosnia & Herzegovina": k("Bosnia & Herzegovina") };
      out.caps = { "Cape Town": cap("Cape Town"), "Colombo": cap("Colombo"), "Kiev": cap("Kiev"), "Washington DC": cap("Washington DC"), "sao tome": cap("sao tome"), "La Paz": cap("La Paz") };
      out.typo = k("Germny"); out.notCountry = k("Atlantis");
      /* popularity: never invented */
      const p = BANK[0];
      out.popNone = popularity(null, p); out.popEmpty = popularity({}, p); out.popFew = popularity({ [p.ans[0]]: 10, [p.ans[1]]: 5 }, p);
      const big = {}; p.ans.forEach((a, i) => { big[a] = (i + 1) * 7; }); big["Atlantis"] = 99;
      const pb = popularity(big, p); out.popBig = { ok: pb.ok, n: pb.n, sum: pb.rows.reduce((a, r) => a + r.pct, 0), first: pb.rows[0].a, top: pb.rows[0].pct, noJunk: !pb.rows.some(r => r.a === "Atlantis") };
      out.responses = RESPONSES;
      return out;
    });
    ok(JSON.stringify(r.tiers) === "[10,25,45,65,85,100]" && r.max === 1000, "points: 10/25/45/65/85/100 per prompt, 1,000 a day");
    ok(r.common, `most common valid answer scores 10 on all ${r.bank} prompts`);
    ok(r.rare, "rarest valid answer scores 100 on every prompt");
    ok(r.mono, "points never go down as answers get rarer");
    ok(r.invalid, "invalid, empty and skipped answers score 0");
    const wantN = { "the netherlands": "Netherlands", "U.S.A.": "United States", "côte d'ivoire": "Ivory Coast", "COTE D IVOIRE": "Ivory Coast", "st lucia": "Saint Lucia", "St. Kitts & Nevis": "Saint Kitts and Nevis", "Burma": "Myanmar", "Türkiye": "Turkey", "Czech Republic": "Czechia", "the gambia": "Gambia", "Bosnia & Herzegovina": "Bosnia and Herzegovina" };
    Object.entries(wantN).forEach(([t, w]) => ok(r.norm[t] === w, `name "${t}" → ${r.norm[t]}`));
    const wantC = { "Cape Town": "South Africa", "Colombo": "Sri Lanka", "Kiev": "Ukraine", "Washington DC": "United States", "sao tome": "São Tomé and Príncipe", "La Paz": "Bolivia" };
    Object.entries(wantC).forEach(([t, w]) => ok(r.caps[t] === w, `capital "${t}" → ${r.caps[t]}`));
    ok(r.typo === "Germany" && !r.notCountry, "one-letter typo forgiven; a made-up name is rejected");
    ok(!r.popNone.ok && r.popNone.reason === "none" && !r.popEmpty.ok && r.popEmpty.reason === "none", "no response data → no percentages");
    ok(!r.popFew.ok && r.popFew.reason === "few" && r.popFew.n === 15, "15 responses (under 50) → too few, no percentages");
    ok(r.popBig.ok && Math.abs(r.popBig.sum - 100 * (r.popBig.n - 99) / r.popBig.n) < 0.6 && r.popBig.noJunk, `enough responses → % of all ${r.popBig.n} answers (valid rows sum ${r.popBig.sum.toFixed(1)}%, the 99 wrong answers excluded from rows)`);
    ok(r.responses === null, "no player response data is shipped (nothing invented)");
    await ctx.close();
  }

  /* ---------- 2. same answer, same points, for different players ---------- */
  {
    const results = [];
    for (let i = 0; i < 2; i++) {
      const { ctx, page } = await fresh(browser);
      await page.goto(BASE + "/voyago/");
      results.push(await page.evaluate(() => set.map(q => { const p = BANK[q]; return famSort(p).map(c => pointsFor(DAY, p, c.n).pts).join(","); }).join("|")));
      await ctx.close();
    }
    ok(results[0] === results[1], "two players get identical points for every answer to today's prompts");
  }

  /* ---------- 3. a full day: max, min, refresh, double submit, results UI on a phone ---------- */
  {
    const { ctx, page } = await fresh(browser, { ...devices["iPhone 13"] });
    await page.goto(BASE + "/voyago/"); await page.evaluate(() => { document.getElementById("help").hidden = true; });
    ok((await page.textContent("#card")).includes("Valid answers earn points. Rarer answers score higher."), "intro states the rule");
    ok(await page.$$eval("#example .exrow", r => r.length) === 2, "intro shows a worked example: " + (await page.textContent("#example")).replace(/\s+/g, " "));
    if (OUT) await page.screenshot({ path: OUT + "/vg-intro.png", fullPage: true });
    await page.click("#startBtn");
    // refresh mid-prompt keeps the clock
    await page.waitForTimeout(2600); await page.reload(); await page.waitForTimeout(400);
    const t = parseInt(await page.textContent("#timer"), 10);
    ok(t <= 28 && t >= 20, `refresh does not reset the 30-second clock (shows ${t}s)`);
    // clock expired while away → timeout, 0 points
    await page.evaluate(() => { cur.t0 = Date.now() - 31000; persist(); }); await page.reload(); await page.waitForTimeout(800);
    const a0 = await page.evaluate(() => answers[0]);
    ok(a0 && a0.to && a0.pts === 0, "clock that ran out during a refresh counts as a timeout (0 points)");
    // answer the rest with the rarest valid answer; double submit is ignored
    await page.evaluate(() => {
      renderPrompt(); const p = BANK[set[answers.length]], z = famSort(p).slice(-1)[0]; finishPrompt(z.n); finishPrompt(z.n);
    });
    ok(await page.evaluate(() => answers.length) === 2, "a second submit for the same prompt is ignored");
    await page.evaluate(() => { while (answers.length < NQ - 1) { renderPrompt(); const p = BANK[set[answers.length]]; finishPrompt(famSort(p).slice(-1)[0].n); } });
    // last one: a wrong answer
    await page.evaluate(() => { renderPrompt(); const p = BANK[set[answers.length]]; const bad = C.find(c => !p.ans.includes(c.n)); finishPrompt(bad.n); renderEnd(); });
    const sum = await page.evaluate(() => ({ total: total(), v: validN() }));
    ok(sum.total === 800 && sum.v === 8, `8 rarest answers + 1 timeout + 1 wrong = ${sum.total} points, ${sum.v} valid`);
    ok((await page.textContent("#tot")) === "800" && (await page.textContent("#kv")) === "8/10" && (await page.textContent("#ka")) === "100", "results show total, valid answers and average per valid answer");
    const share = await page.evaluate(() => shareText());
    const names = await page.evaluate(() => answers.filter(x => x.a).map(x => x.a));
    ok(!names.some(n => share.includes(n)) && /800\/1000/.test(share) && /8\/10 valid/.test(share), "share text is spoiler-free: " + share.replace(/\n/g, " | "));
    ok(await page.$$eval(".qrow", r => r.length) === 10, "ten expandable question rows");
    await page.tap(".qrow >> nth=1");
    ok(await page.getAttribute(".qrow >> nth=1", "aria-expanded") === "true" && await page.isVisible("#qd-1"), "tapping a row expands its breakdown");
    const d1 = await page.textContent("#qd-1");
    ok(/Not collected yet/.test(d1) && !/\d+(\.\d)?%/.test(d1.replace(/rarest 7%/, "")), "no popularity percentages are shown without player data");
    ok(await page.$("#qd-1 .chart.ref li.mine") !== null, "the player's own answer is highlighted in the breakdown");
    ok(/#\d+ of \d+ valid answers/.test(d1), "breakdown explains the answer's rank among valid answers");
    await page.tap(".qrow >> nth=9");
    ok(/doesn't fit this prompt/.test(await page.textContent("#qd-9")), "a wrong answer's breakdown says it wasn't valid");
    ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "no horizontal scroll on phone");
    if (OUT) { await page.evaluate(() => document.querySelector(".qlist").scrollIntoView()); await page.screenshot({ path: OUT + "/vg-review.png", fullPage: true }); }
    // refreshing a finished day can't add points; stats count once
    const st = await page.evaluate(() => localStorage.getItem("voyago-v2:stats"));
    await page.reload(); await page.waitForTimeout(400);
    ok(await page.evaluate(() => total()) === 800 && await page.evaluate(() => localStorage.getItem("voyago-v2:stats")) === st, "refreshing a finished day changes nothing");
    const daily = await page.evaluate(() => tgDaily.status().find(x => x.id === "voyago"));
    ok(daily.score === 80, `daily run score = points / 10 (${daily.score})`);
    // practice is separate
    const keep = await page.evaluate(() => localStorage.getItem("voyago-v2:day") + localStorage.getItem("voyago-v2:stats"));
    await page.evaluate(() => { startPractice(); for (let i = 0; i < NQ; i++) { renderPrompt(); finishPrompt(BANK[set[answers.length]].ans[0]); } renderEnd(); });
    ok(keep === await page.evaluate(() => localStorage.getItem("voyago-v2:day") + localStorage.getItem("voyago-v2:stats")), "practice does not touch the daily result or stats");
    ok(page._errs.length === 0, "no page errors " + page._errs.join(" | "));
    await ctx.close();
  }

  /* ---------- 4. minimum: all skipped ---------- */
  {
    const { ctx, page } = await fresh(browser);
    await page.goto(BASE + "/voyago/"); await page.evaluate(() => { document.getElementById("help").hidden = true; document.getElementById("startBtn").click(); for (let i = 0; i < NQ; i++) { renderPrompt(); finishPrompt(null); } renderEnd(); });
    ok(await page.evaluate(() => total()) === 0 && (await page.textContent("#ka")) === "–", "all skipped: 0 points, no average");
    await ctx.close();
  }

  /* ---------- 5. results saved before the change (old 15-130 points) ---------- */
  {
    const { ctx, page } = await fresh(browser);
    await page.goto(BASE + "/voyago/");
    const day = await page.evaluate(DAYCALC);
    await page.evaluate(day => {
      const old = [130, 110, 85, 60, 35, 15, 0, 130, 15, 35], tiers = [5, 4, 3, 2, 1, 0, -1, 5, 0, 1];
      const ans = tiers.map((t, i) => { const q = set[i], p = BANK[q]; const c = t < 0 ? C.find(c => !p.ans.includes(c.n)) : famSort(p).find(c => tierOf(p, c.n) === t); return { q, a: c.n, pts: old[i], tier: t, to: false }; });
      localStorage.clear();
      localStorage.setItem("voyago-v2:seenHelp", "1");
      localStorage.setItem("voyago-v2:stats", JSON.stringify({ played: 2, best: 905, sum: 1500, perth: 0, lastDay: day - 1 }));
      localStorage.setItem("voyago-v2:day", JSON.stringify({ day, started: true, answers: ans }));
    }, day);
    await page.goto(BASE + "/");
    ok((await page.textContent("#vgStatus")).includes("465 points"), "home page shows the old day on the new scale (465): " + await page.textContent("#vgStatus"));
    await page.goto(BASE + "/voyago/"); await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ t: total(), st: JSON.parse(localStorage.getItem("voyago-v2:stats")) }));
    ok(r.t === 465, "a day saved on the old scale is rescored by tier: 100+85+65+45+25+10+0+100+10+25 = 465");
    ok(r.st.played === 2 && r.st.scale === undefined, "loading an old finished day doesn't count it again");
    // finishing a new day migrates the stats
    await page.evaluate(day => { localStorage.setItem("voyago-v2:day", JSON.stringify({ day: day + 1, answers: [] })); }, day);
    await page.reload(); await page.evaluate(() => { document.getElementById("help").hidden = true; document.getElementById("startBtn").click(); for (let i = 0; i < NQ; i++) { renderPrompt(); finishPrompt(BANK[set[answers.length]].ans[0]); } renderEnd(); });
    const s2 = await page.evaluate(() => JSON.parse(localStorage.getItem("voyago-v2:stats")));
    ok(s2.played === 3 && s2.scale === 1000 && s2.best === s2.sum && s2.oldPlayed === 2, `stats move to the 1,000 scale, played count kept (${s2.played})`);
    ok((await page.textContent("#statsBox")).includes("1,000-point scale"), "results explain why averages restart");
    ok(page._errs.length === 0, "no page errors (migration) " + page._errs.join(" | "));
    await ctx.close();
  }

  console.log(fail.length ? `\n${fail.length} FAILED` : "\nALL PASSED");
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
