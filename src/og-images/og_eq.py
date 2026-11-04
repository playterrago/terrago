from playwright.sync_api import sync_playwright
import pathlib
base = pathlib.Path('/tmp/claude-0/mapbuild/og.html').resolve().as_uri()
SCALE = '''<svg viewBox="0 0 400 200" style="width:520px;height:260px"><g transform="rotate(-7 200 52)"><rect x="40" y="48" width="320" height="10" rx="5" fill="#111a24"/></g><rect x="195" y="52" width="10" height="120" rx="3" fill="#111a24"/><rect x="145" y="168" width="110" height="12" rx="6" fill="#111a24"/><circle cx="200" cy="52" r="11" fill="#d9590b"/>
<g transform="translate(0 18)"><line x1="57" y1="54" x2="30" y2="116" stroke="#5d6a78" stroke-width="2"/><line x1="57" y1="54" x2="84" y2="116" stroke="#5d6a78" stroke-width="2"/><path d="M17 116 h80 a40 24 0 0 1 -80 0 z" fill="#e1ecf7" stroke="#2f6fb0" stroke-width="3"/></g>
<g transform="translate(0 -18)"><line x1="343" y1="54" x2="316" y2="116" stroke="#5d6a78" stroke-width="2"/><line x1="343" y1="54" x2="370" y2="116" stroke="#5d6a78" stroke-width="2"/><path d="M303 116 h80 a40 24 0 0 1 -80 0 z" fill="#f7e3de" stroke="#b0452f" stroke-width="3"/></g></svg>'''
jobs = {
    'og-equalo.png': ('<div class="logo" style="font-size:132px">Equal<i>o</i></div><div class="t">Seven countries, two pans.<br>Balance population, area and GDP.</div>', SCALE),
    'og.png': ('<div class="logo">terra<i>go</i></div><div class="t">Small daily games about the world.</div>',
               '<div class="k">Three daily puzzles · Capitalo · Polygo · Equalo</div>'),
}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 630})
    for name, (top, bottom) in jobs.items():
        pg.goto(base); pg.evaluate("([t,b])=>{document.getElementById('top').innerHTML=t;document.getElementById('bottom').innerHTML=b}", [top, bottom])
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path='/home/claude/terrago/' + name)
print('ok')
