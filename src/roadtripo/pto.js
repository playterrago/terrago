const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\./, r => r.abort());
  await p.goto('file:///home/claude/roadtripo.html');
  await p.click('#helpClose');
  await p.screenshot({ path: 'o1.png', fullPage: true });
  const route = await p.evaluate(() => bestRoute().map(i => R[i].n));
  console.log('trip', await p.textContent('#route'), '|', await p.textContent('#want'), '| best', route);
  // one off-route guess, then the best route typed with suggestions
  await p.fill('#guess', 'Ore'); await p.keyboard.press('Enter');
  for (const n of route.slice(0, 2)) { await p.fill('#guess', n.slice(0, 5)); await p.waitForTimeout(50); await p.keyboard.press('Enter'); }
  await p.screenshot({ path: 'o2.png', fullPage: true });
  for (const n of route.slice(2)) { await p.fill('#guess', n); await p.keyboard.press('Enter'); }
  await p.screenshot({ path: 'o3.png', fullPage: true });
  console.log(await p.evaluate(() => shareText()), errs);
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.click('text=Practice a random trip');
  for (let i = 0; i < 12; i++) { const done = await p.evaluate(() => done); if (done) break; await p.fill('#guess', 'Kansas'); await p.keyboard.press('Enter'); await p.fill('#guess', ['Ohio','Texas','Utah','Maine','Idaho','Iowa','Florida','Vermont','Oregon','Nevada','Georgia','Montana'][i]); await p.keyboard.press('Enter'); }
  await p.screenshot({ path: 'o4.png', fullPage: true });
  console.log('scrollW', await p.evaluate(() => document.documentElement.scrollWidth), errs);
  await b.close();
})();
