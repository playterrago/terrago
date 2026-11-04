from playwright.sync_api import sync_playwright
import pathlib
base = pathlib.Path('/tmp/claude-0/mapbuild/og.html').resolve().as_uri()
ROW = '<div class="row"><span>🟩</span><span>🟩</span><span>📍</span><span>🟧</span><span>🟩</span></div>'
jobs = {
    'og-roadtripo.png': ('<div class="logo" style="font-size:132px">Roadtrip<i>o</i></div><div class="t">Drive across the US.<br>Stop at one famous landmark on the way.</div>', ROW),
    'og.png': ('<div class="logo">terra<i>go</i></div><div class="t">Small daily games about the world.</div>',
               '<div class="k">Four daily puzzles · Capitalo · Polygo · Equalo · Roadtripo</div>'),
}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 630})
    for name, (top, bottom) in jobs.items():
        pg.goto(base); pg.evaluate("([t,b])=>{document.getElementById('top').innerHTML=t;document.getElementById('bottom').innerHTML=b}", [top, bottom])
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path='/home/claude/terrago/' + name)
print('ok')
