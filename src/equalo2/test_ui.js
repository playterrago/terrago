// Equalo UI test (Playwright). Run with a static server on the repo root: node test_ui.js http://localhost:8765 [shotsDir]
const { chromium, devices } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8765", OUT = process.argv[3] || null;
const fail = []; const ok = (c, m) => { if (!c) fail.push(m); console.log((c ? "PASS " : "FAIL ") + m); };
const BLOCK = /googlesyndication|gc\.zgo\.at|fonts\.(googleapis|gstatic)/;

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext(opts);
  await ctx.route(BLOCK, r => r.abort());
  const page = await ctx.newPage(); page._errs = []; page.on("pageerror", e => page._errs.push(e.message));
  return { ctx, page };
}
const center = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const placeStr = page => page.evaluate(() => place.map(x => x || ".").join(""));
async function placeAll(page, str) { await page.evaluate(s => { s.split("").forEach((x, k) => { place[k] = x; }); persist(); renderPlay(); }, str); }

(async () => {
  const browser = await chromium.launch();

  /* ---------- 1. desktop: help, mouse drag, keyboard, weighs, refresh, 3 misses ---------- */
  {
    const { ctx, page } = await fresh(browser, { viewport: { width: 1200, height: 900 } });
    await page.goto(BASE + "/equalo/");
    ok(await page.isVisible("#help"), "help opens on first visit");
    await page.click("#helpClose");
    const N = await page.evaluate(() => N);
    ok(N >= 5 && N <= 10, `today's puzzle has ${N} countries`);
    ok((await page.$$("#bench .chip")).length === N, "all flags start on the bench");
    ok(await page.isDisabled("#weigh"), "weigh disabled until every flag is placed");
    ok(await page.evaluate(() => scaleEl._deg) === 0, "scale is level before any weigh");
    // mouse drag chip 0 to the left pan
    const a = await center(page, '#bench .chip[data-k="0"]'), L = await center(page, ".scale .pan.L .dish");
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 20, a.y - 20, { steps: 4 }); await page.mouse.move(L.x, L.y - 10, { steps: 8 }); await page.mouse.up();
    ok((await placeStr(page))[0] === "L", "mouse drag puts a flag on the left pan");
    ok(await page.$(".scale .pan.L .chip[data-k='0']") !== null, "the flag is shown on the left pan");
    // drag it back to the bench
    const a2 = await center(page, ".scale .pan.L .chip[data-k='0']"), B = await center(page, "#bench");
    await page.mouse.move(a2.x, a2.y); await page.mouse.down(); await page.mouse.move(B.x, B.y, { steps: 8 }); await page.mouse.up();
    ok((await placeStr(page))[0] === ".", "dragging back to the bench takes it off the scale");
    // keyboard: focus chip 1, ArrowRight
    await page.focus('#bench .chip[data-k="1"]'); await page.keyboard.press("ArrowRight");
    ok((await placeStr(page))[1] === "R", "keyboard ArrowRight moves a flag to the right pan");
    await page.keyboard.press("ArrowLeft");
    ok((await placeStr(page))[1] === "L", "keyboard ArrowLeft moves it to the left pan");
    // values are not shown anywhere before weighing
    const valsShown = await page.evaluate(() => { const t = document.getElementById("play").innerText; return P.c.some((_, k) => t.includes(String(val(P, k)).replace(/\B(?=(\d{3})+(?!\d))/g, ","))); });
    ok(!valsShown, "no country's value is visible before weighing");
    // a deliberately wrong split: solution with the first two countries swapped sides
    const wrongs = await page.evaluate(() => {
      const s = P.sol.split(""), out = [];
      for (let k = 0; k < N && out.length < 3; k++) { const t = s.slice(); t[k] = t[k] === "L" ? "R" : "L"; if (t.includes("L") && t.includes("R") && weighOf(P, t).d !== 0) out.push(t.join("")); }
      return out;
    });
    const wrong = wrongs[0];
    await placeAll(page, wrong);
    ok(!(await page.isDisabled("#weigh")), "weigh enabled once every flag is placed");
    await page.click("#weigh");
    await page.waitForTimeout(1000);
    const w1 = await page.evaluate(() => { const w = weighOf(P, place); return { heavy: w.heavy, deg: scaleEl._deg, bp: offBp(w), txt: document.getElementById("verdict").textContent }; });
    ok(w1.heavy === "L" ? w1.deg < 0 : w1.deg > 0, `heavier side drops (heavy ${w1.heavy}, tilt ${w1.deg.toFixed(1)}°)`);
    ok(/heavier by .* of the total/.test(w1.txt), "verdict shows the difference: " + w1.txt);
    if (OUT) await page.screenshot({ path: OUT + "/eq-desktop-weigh1.png" });
    // changing the arrangement returns the scale to level
    await page.focus('.chip[data-k="0"]'); await page.keyboard.press(w1.heavy === "L" ? "ArrowRight" : "ArrowLeft");
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => scaleEl._deg) === 0 && (await page.textContent("#verdict")).includes("Arrangement changed"), "rearranging returns the scale to level");
    // refresh persistence
    const before = await placeStr(page);
    await page.reload();
    ok(await placeStr(page) === before, "arrangement survives a refresh");
    ok(await page.evaluate(() => weighs.length) === 1, "weighs survive a refresh");
    ok((await page.$$("#weighs li")).length === 1, "weigh history is shown after refresh");
    // two more wrong weighs -> game over
    await placeAll(page, wrong);
    ok(await page.isDisabled("#weigh") && (await page.textContent("#weigh")).includes("Already weighed"), "the same split cannot be weighed twice");
    for (let i = 1; i < 3; i++) { await placeAll(page, wrongs[i]); await page.click("#weigh"); await page.waitForTimeout(300); }
    await page.waitForTimeout(1200);
    ok(await page.isVisible("#end"), "game ends after 3 weighs");
    const sc = await page.evaluate(() => scoreOf(weighs, P));
    const want = await page.evaluate(() => Math.max(...weighs.map((x, k) => Math.max(0, 1000 - 100 * k - Math.round(offBp(weighOf(P, x.p.split(""))) / 10)))));
    ok(!sc.won && sc.pts === want, `missed score = best of 1000×(1−gap) − 100×(weigh−1): ${sc.pts} (best weigh ${sc.best + 1}, ${sc.bp / 100}% apart)`);
    ok((await page.textContent(".score b")).replace(",", "") === String(sc.pts), "score shown on the results screen");
    ok((await page.textContent("#end")).includes("The exact balance"), "results show the exact balance");
    ok((await page.textContent("#end")).includes("Your closest weigh"), "results show the player's closest weigh");
    const tots = await page.$$eval("#end .sides", s => [...s[0].querySelectorAll(".tot")].map(x => x.textContent));
    ok(tots.length === 2 && tots[0] === tots[1], "exact solution totals are equal: " + tots.join(" | "));
    ok((await page.$$("#end .sides .chip small")).length >= N, "actual values shown per country");
    ok(await page.isVisible(".tgd .tgd-next"), "next-game button shown");
    ok(await page.evaluate(() => scoreOf(weighs, P).pts) === sc.pts, "score unchanged");
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem("equalo-v2:stats")));
    await page.reload(); await page.waitForTimeout(300);
    ok(await page.isVisible("#end") && JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem("equalo-v2:stats")))) === JSON.stringify(st), "after refresh: still finished, stats not counted twice");
    if (OUT) await page.screenshot({ path: OUT + "/eq-desktop-end.png", fullPage: true });
    ok(page._errs.length === 0, "no page errors (desktop) " + page._errs.join("|"));
    await ctx.close();
  }

  /* ---------- 2. phone: touch drag, tap-to-assign, mover buttons, perfect on weigh 2 ---------- */
  {
    const { ctx, page } = await fresh(browser, { ...devices["iPhone 13"] });
    await page.goto(BASE + "/equalo/"); await page.click("#helpClose");
    const cdp = await ctx.newCDPSession(page);
    const touchDrag = async (from, to) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
      for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10, id: 1 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    await page.evaluate(() => document.getElementById("bench").scrollIntoView({ block: "end" }));
    const tf = await center(page, '#bench .chip[data-k="0"]'), tt = await center(page, ".scale .pan.R .dish");
    ok(tf.y > 0 && tf.y < 664 && tt.y > 0 && tt.y < 664, "flag and pan are both on screen for the touch drag");
    await touchDrag(tf, tt);
    ok((await placeStr(page))[0] === "R", "touch drag puts a flag on the right pan");
    await page.tap('#bench .chip[data-k="1"]');
    ok(await page.isVisible("#mover"), "tapping a flag selects it and shows move buttons");
    await page.tap(".scale .pan.L .dish");
    ok((await placeStr(page))[1] === "L", "tap flag, then tap pan, places it");
    await page.tap('#bench .chip[data-k="2"]'); await page.tap("#mover button.r");
    ok((await placeStr(page))[2] === "R", "mover button places the selected flag");
    // wrong first, then the exact split on weigh 2
    const sol = await page.evaluate(() => P.sol);
    const wrong = sol.split("").map((x, k) => k < 2 ? (x === "L" ? "R" : "L") : x).join("");
    const bad = await page.evaluate(w => weighOf(P, w.split("")).d !== 0 && w.includes("L") && w.includes("R"), wrong);
    await placeAll(page, bad ? wrong : sol.split("").map(x => x === "L" ? "R" : "L").reverse().join(""));
    if (OUT) await page.screenshot({ path: OUT + "/eq-phone-play.png" });
    await page.tap("#weigh"); await page.waitForTimeout(300);
    const first = await page.evaluate(() => weighOf(P, weighs[0].p.split("")).d === 0);
    if (!first) { await placeAll(page, sol); await page.tap("#weigh"); }
    await page.waitForTimeout(1600);
    const sc = await page.evaluate(() => scoreOf(weighs, P));
    const w1 = await page.evaluate(() => Math.max(0, 1000 - Math.round(offBp(weighOf(P, weighs[0].p.split(""))) / 10)));
    ok(sc.won && sc.pts === (first ? 1000 : Math.max(900, w1)), `exact balance on weigh ${sc.at}: score ${sc.pts} = best of weigh 1 (${w1}) and exact on weigh 2 (900)`);
    ok(await page.evaluate(() => done) && (await page.textContent("#end h2")).includes("Perfect balance"), "perfect balance ends the game immediately");
    ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "no horizontal scroll on phone");
    if (OUT) { await page.evaluate(() => document.querySelector("#end h3").scrollIntoView()); await page.waitForTimeout(1200); await page.screenshot({ path: OUT + "/eq-phone-end.png", fullPage: true }); }
    const daily = await page.evaluate(() => tgDaily.status().find(x => x.id === "equalo"));
    ok(daily.state === "done" && daily.score === Math.round(sc.pts / 10), `daily run score = points / 10 (${daily.score})`);
    // practice keeps today's result and stats untouched
    const keep = await page.evaluate(() => [localStorage.getItem("equalo-v2:day"), localStorage.getItem("equalo-v2:stats")].join("|"));
    await page.evaluate(() => startPractice());
    await placeAll(page, await page.evaluate(() => P.sol)); await page.evaluate(() => doWeigh()); await page.waitForTimeout(1300);
    ok(keep === await page.evaluate(() => [localStorage.getItem("equalo-v2:day"), localStorage.getItem("equalo-v2:stats")].join("|")), "practice does not change today's result or stats");
    ok(!(await page.isVisible(".tgd")), "practice shows no daily-run card");
    ok(page._errs.length === 0, "no page errors (phone) " + page._errs.join("|"));
    await ctx.close();
  }

  /* ---------- 3. every size 5..10 plays to an exact balance, phone layout fits ---------- */
  {
    const { ctx, page } = await fresh(browser, { ...devices["iPhone SE"] });
    await page.goto(BASE + "/equalo/"); await page.click("#helpClose");
    for (let n = 5; n <= 10; n++) {
      const r = await page.evaluate(n => {
        practice = true; P = D.practice.find(p => p.c.length === n); N = n; place = Array(N).fill(""); weighs = []; done = false; sel = -1; tiltFor = null; scaleEl = null;
        document.getElementById("end").hidden = true; renderHead(); renderPlay();
        P.sol.split("").forEach((x, k) => { place[k] = x; }); renderPlay();
        const pans = [...document.querySelectorAll(".scale .tray")].map(t => { const tr = t.getBoundingClientRect(); return [...t.children].every(c => { const b = c.getBoundingClientRect(); return b.top >= tr.top - 1 && b.bottom <= tr.bottom + 1; }); });
        const check = () => {
          const trays = [...document.querySelectorAll(".scale .tray")];
          const fit = trays.every(t => { const tr = t.getBoundingClientRect(); return [...t.children].every(c => { const b = c.getBoundingClientRect(); return b.top >= tr.top - 1 && b.bottom <= tr.bottom + 1 && b.left >= tr.left - 1 && b.right <= tr.right + 1; }); });
          const lr = Math.max(...[...trays[0].children].map(c => c.getBoundingClientRect().right), 0), rl = Math.min(...[...trays[1].children].map(c => c.getBoundingClientRect().left), 1e9);
          const beam = document.querySelector(".scale .beam").getBoundingClientRect();
          const belowBeam = trays.every(t => [...t.children].every(c => c.getBoundingClientRect().top > beam.bottom));
          return fit && lr < rl && belowBeam;
        };
        const solOk = check();
        place = place.map((_, k) => k === 0 ? "R" : "L"); renderPlay(); const crowdOk = check();
        P.sol.split("").forEach((x, k) => { place[k] = x; }); renderPlay();
        doWeigh(); return { won: scoreOf(weighs, P).won, fit: solOk && pans.every(Boolean), crowd: crowdOk };
      }, n);
      ok(r.won, `${n} countries: the stored solution balances exactly in the game`);
      ok(r.fit, `${n} countries: flags fit inside the pans on a small phone`);
      ok(r.crowd, `${n} countries: ${n - 1} flags on one pan still fit, below the beam, without overlapping the other pan`);
      if (OUT && n === 10) { await page.evaluate(() => { done = false; weighs = []; place = place.map((_, k) => k < 2 ? "R" : "L"); renderPlay(); document.getElementById("scaleBox").scrollIntoView(); }); await page.screenshot({ path: OUT + "/eq-phone-10.png" }); }
    }
    await ctx.close();
  }

  /* ---------- 4. players coming from the old 3-round Equalo ---------- */
  {
    const { ctx, page } = await fresh(browser, { viewport: { width: 400, height: 800 } });
    await page.goto(BASE + "/");
    await page.evaluate(() => {
      const n = new Date(), day = Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(2026, 10, 2)) / 864e5) + 1;
      localStorage.setItem("equalo-v1:stats", JSON.stringify({ played: 2, greens: 4, perfect: 1, lastDay: day - 1 }));
      localStorage.setItem("equalo-v1:day", JSON.stringify({ day: day - 1, results: [{ g: "g" }, { g: "y" }, { g: "x" }] }));
    });
    await page.goto(BASE + "/equalo/"); await page.click("#helpClose");
    await placeAll(page, await page.evaluate(() => P.sol)); await page.click("#weigh"); await page.waitForTimeout(1300);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem("equalo-v2:stats")));
    ok(st.played === 3 && st.wins === 1, `old games played carry over (played ${st.played})`);
    ok(await page.evaluate(() => localStorage.getItem("equalo-v1:stats")).then(s => JSON.parse(s).greens === 4), "old stats are left untouched");
    // old 3-round result from today still counts in the daily run
    await page.evaluate(() => {
      const n = new Date(), day = Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(2026, 10, 2)) / 864e5) + 1;
      localStorage.removeItem("equalo-v2:day"); localStorage.removeItem("terrago-daily-v1");
      localStorage.setItem("equalo-v1:day", JSON.stringify({ day, results: [{ g: "g" }, { g: "g" }, { g: "y" }] }));
    });
    await page.goto(BASE + "/");
    const eq = await page.evaluate(() => tgDaily.status().find(x => x.id === "equalo"));
    ok(eq.state === "done" && eq.line === "🟩🟩🟨", "an old-format result from today still shows in the daily run");
    ok(page._errs.length === 0, "no page errors (migration) " + page._errs.join("|"));
    await ctx.close();
  }

  /* ---------- 5. dark mode look ---------- */
  if (OUT) {
    const { ctx, page } = await fresh(browser, { viewport: { width: 420, height: 900 }, colorScheme: "dark", deviceScaleFactor: 2 });
    await page.goto(BASE + "/equalo/"); await page.click("#helpClose");
    await placeAll(page, await page.evaluate(() => P.sol.split("").map((x, k) => k % 3 === 0 ? "" : x).join("")));
    await page.screenshot({ path: OUT + "/eq-dark.png" });
    await ctx.close();
  }

  console.log(fail.length ? `\n${fail.length} FAILED` : "\nALL PASSED");
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
