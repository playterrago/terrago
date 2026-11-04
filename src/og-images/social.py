import json, pathlib
from playwright.sync_api import sync_playwright
F = pathlib.Path('node_modules/@fontsource').resolve().as_uri()
e = json.load(open('edge.json')); italy = next(c for c in e if c['country'] == 'Italy')
stages = [italy['levels'][i] for i in (1, 2, 3, 4)] + [italy['full']]   # 4, 8, 16, 32 edges, full
labels = ['4', '8', '16', '32', 'full']
INK, PAPER, ORANGE, MUTED, LINE = '#111a24', '#e9edf1', '#d9590b', '#93a1af', '#263342'
GLOBE = lambda s, bg=INK, fg=PAPER: f'''<svg width="{s}" height="{s}" viewBox="0 0 64 64"><rect width="64" height="64" fill="{bg}"/>
<circle cx="32" cy="32" r="18" fill="none" stroke="{fg}" stroke-width="3.2"/>
<path d="M32 14c-7 6-7 30 0 36M32 14c7 6 7 30 0 36M14 32h36" fill="none" stroke="{fg}" stroke-width="2.4" opacity=".5"/>
<circle cx="43" cy="22" r="7" fill="{ORANGE}"/></svg>'''
HEAD = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:B;src:url({F}/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2)}}
@font-face{{font-family:P;src:url({F}/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2)}}
@font-face{{font-family:M;src:url({F}/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2)}}
*{{margin:0;box-sizing:border-box}} body{{overflow:hidden}}
.logo{{font-family:B;letter-spacing:-.045em;line-height:.9;color:{PAPER}}} .logo i{{font-style:normal;color:{ORANGE}}}
.tag{{font-family:P;color:{MUTED};white-space:nowrap}} .url{{font-family:M;color:{PAPER}}}
.shapes{{display:flex;align-items:flex-end}} .shape{{display:flex;flex-direction:column;align-items:center}}
.shape svg path{{fill:{PAPER}}} .shape.last svg path{{fill:{ORANGE}}} .lab{{font-family:M;color:{MUTED}}}
</style></head><body>'''
def shapes(size, gap, lab):
    out = '<div class="shapes" style="gap:%dpx">' % gap
    for k, (d, l) in enumerate(zip(stages, labels)):
        out += f'<div class="shape{" last" if k == len(stages)-1 else ""}"><svg width="{size}" height="{size}" viewBox="0 0 300 300"><path d="{d}"/></svg>'
        if lab: out += f'<div class="lab" style="font-size:{lab}px;margin-top:{lab*0.4}px">{l}{" edges" if l != "full" else ""}</div>'
        out += '</div>'
    return out + '</div>'
def banner(w, h, pad_l, logo, tag, url, shp, gap, lab, align='space-between', pad_r=None, safe=None):
    pad_r = pad_r if pad_r is not None else pad_l
    inner = f'''<div style="display:flex;align-items:center;justify-content:{align};gap:{gap*2}px;width:100%;height:100%;padding:0 {pad_r}px 0 {pad_l}px">
      <div><div class="logo" style="font-size:{logo}px">terra<i>go</i></div>
      <div class="tag" style="font-size:{tag}px;margin-top:{tag*0.55}px">Small daily games about the world.</div>
      <div class="url" style="font-size:{url}px;margin-top:{url*0.9}px">playterrago.com</div></div>
      {shapes(shp, gap, lab)}</div>'''
    if safe:
        sw, sh = safe
        inner = f'<div style="position:absolute;left:{(w-sw)/2}px;top:{(h-sh)/2}px;width:{sw}px;height:{sh}px">{inner}</div>'
    return HEAD + f'<div style="position:relative;width:{w}px;height:{h}px;background:{INK}">{inner}</div></body></html>'
def profile(s, bg, fg):
    return HEAD + f'<div style="width:{s}px;height:{s}px">{GLOBE(s, bg, fg)}</div></body></html>'
jobs = {
  'terrago-profile-1080.png': (1080, 1080, profile(1080, INK, PAPER)),
  'terrago-profile-400.png': (400, 400, profile(400, INK, PAPER)),
  'terrago-profile-light-1080.png': (1080, 1080, profile(1080, PAPER, INK)),
  'x-header-1500x500.png': (1500, 500, banner(1500, 500, 90, 120, 28, 24, 138, 18, 17)),
  'linkedin-company-cover-1128x191.png': (1128, 191, banner(1128, 191, 290, 58, 15, 13, 74, 14, 0, pad_r=40)),
  'linkedin-personal-banner-1584x396.png': (1584, 396, banner(1584, 396, 400, 100, 24, 20, 104, 16, 15, pad_r=60)),
  'facebook-cover-1640x624.png': (1640, 624, banner(1640, 624, 110, 146, 32, 28, 150, 18, 19, pad_r=100)),
  'youtube-banner-2560x1440.png': (2560, 1440, banner(2560, 1440, 40, 136, 30, 26, 158, 20, 17, safe=(1546, 423))),
}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h, html) in jobs.items():
        pg = b.new_page(viewport={'width': w, 'height': h})
        tmp = pathlib.Path('social_tmp.html'); tmp.write_text(html, encoding='utf-8')
        pg.goto(tmp.resolve().as_uri()); pg.evaluate("Promise.all([document.fonts.load('800 40px B'), document.fonts.load('500 20px P'), document.fonts.load('500 20px M')])"); pg.wait_for_timeout(300)
        assert pg.evaluate("document.fonts.check('800 40px B')"), name
        pg.screenshot(path='/home/claude/social/' + name); pg.close()
print('ok')
