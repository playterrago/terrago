const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\./, r => r.abort());
  await p.goto('file:///home/claude/voyago.html');
  await p.click('#helpClose');
  await p.screenshot({ path: 'v0.png', fullPage: true });
  await p.click('#startBtn');
  await p.screenshot({ path: 'v1.png', fullPage: true });
  for (let i = 0; i < 10; i++) {
    // answer: rarest valid on even prompts, a typed common one on odd, an invalid one on prompt 3, skip prompt 7
    const ans = await p.evaluate(i => { const q = BANK[set[answers.length]]; const s = q.ans.map(n => byN[n]).sort((a, b) => b.fam - a.fam); const c = i === 3 ? byN[C.find(x => !q.ans.includes(x.n)).n] : i % 2 ? s[0] : s[s.length - 1]; return q.kind === "capital" ? c.cap : c.n; }, i);
    if (i === 7) await p.click('#skip');
    else { await p.fill('#guess', ans); await p.keyboard.press('Enter'); }
    await p.waitForTimeout(150);
    if (i === 0) await p.screenshot({ path: 'v2.png', fullPage: true });
    await p.click('#next');
  }
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'v3.png', fullPage: true });
  console.log(await p.evaluate(() => shareText()), errs);
  console.log('scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.click("#again"); await p.waitForTimeout(500);
  await p.screenshot({ path: 'v4.png', fullPage: true });
  console.log('after timeout:', await p.evaluate(() => JSON.stringify(answers)), errs);
  await b.close();
})();
