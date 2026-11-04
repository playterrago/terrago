import re, html, os
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "..", ".."))
STD = os.path.join(SITE, "src", "standalone")
NAV_CSS = """<style>
.tg-nav{max-width:1180px;margin:0 auto 6px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;font:500 13px "IBM Plex Sans",system-ui,sans-serif}
.tg-nav a{color:var(--muted);text-decoration:none}
.tg-nav a:hover,.tg-nav a[aria-current=page]{color:var(--ink)}
.tg-nav .tg-brand{font:800 16px "Bricolage Grotesque",system-ui,sans-serif;color:var(--ink);letter-spacing:-.02em;margin-right:4px}
.tg-nav .tg-brand i{font-style:normal;color:#c2672b}
.tg-beta{display:inline-block;margin-left:8px;padding:2px 6px;border:1.5px solid currentColor;border-radius:5px;color:#c2672b;font:600 11px/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;vertical-align:middle;position:relative;top:-.15em}
.tg-nav .tg-beta{margin-left:4px;padding:0 4px;font-size:9px;border-width:1px;top:-.1em}
.tg-foot{max-width:640px;margin:28px auto 0;text-align:center;font:12px "IBM Plex Sans",system-ui,sans-serif;color:var(--muted)}
.tg-foot a{color:inherit}
</style>"""
def nav(cur):
    items=[("polygo","Polygo"),("capitalo","Capitalo"),("equalo","Equalo"),("roadtripo","Roadtripo"),("voyago","Voyago"),("about","About")]
    links="".join(f'<a href="/{k}/"{" aria-current=page" if k==cur else ""}>{v}{BADGE if k in ("roadtripo","voyago") else ""}</a>' for k,v in items)
    return f'<nav class="tg-nav" aria-label="Terrago games"><a class="tg-brand" href="/">terra<i>go</i></a>{links}</nav>\n'
BADGE='<small class="tg-beta">BETA</small>'
FOOT='<footer class="tg-foot">A <a href="/">Terrago</a> game · <a href="/about/">About</a> · <a href="/privacy/">Privacy</a> · Feedback: playterrago@gmail.com</footer>\n'
ADSENSE='''<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7437173923776764" crossorigin="anonymous"></script>
'''
DAILY='<script src="/daily.js"></script>\n'
TRACK=open(os.path.join(HERE, "track_snippet.html"),encoding="utf-8").read()
def head(title, desc, path, og="/og.png"):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="{html.escape(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Terrago">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="https://playterrago.com{og}">
<meta property="og:url" content="https://playterrago.com/{path}/">
<link rel="canonical" href="https://playterrago.com/{path}/">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
'''+TRACK+DAILY+ADSENSE

HOOK = {
 "polygo": ("  again.onclick = startPractice;\n  tick();",
            "  again.onclick = startPractice;\n  if (!practice && window.tgDaily) tgDaily.finish(\"polygo\", { won, n: guesses.length }, end, share, shareText().split(\"\\n\")[1]);\n  tick();"),
 "capitalo": ("  again.onclick = startPractice;\n  tick();",
            "  again.onclick = startPractice;\n  if (!practice && window.tgDaily) tgDaily.finish(\"capitalo\", { won, n: turns.length, clues: cluesUsed() }, end, share, shareText().split(\"\\n\")[1]);\n  tick();"),
 "roadtripo": ("  again.onclick = startPractice;\n}\nfunction renderAll",
            "  again.onclick = startPractice;\n  if (!practice && window.tgDaily) tgDaily.finish(\"roadtripo\", { won, n: guesses.length, best }, end, share, shareText().split(\"\\n\")[1]);\n}\nfunction renderAll"),
 "equalo": ('  $("again").onclick = startPractice;\n',
            '  $("again").onclick = startPractice;\n  if (!practice && window.tgDaily) tgDaily.finish("equalo", { g: results.map(r => r.g) }, card, $("share"), "");\n'),
 "voyago": ('  $("again").onclick = startPractice;\n',
            '  $("again").onclick = startPractice;\n  if (!practice && window.tgDaily) tgDaily.finish("voyago", { pts: total(), city: reachedCity() }, card, $("share"), shareText().split("\\n")[1]);\n'),
}
def wrap(src, out, cur, title, desc, subs=(), og="/og.png"):
    s=open(os.path.join(STD, src),encoding="utf-8").read()
    for a,b in subs:
        assert s.count(a)>=1,(src,a); s=s.replace(a,b)
    s=s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
    i=s.index('<div class="wrap">')
    body=s[i:]
    body=body.replace('<div class="wrap">','<div class="wrap">\n'+nav(cur),1)
    out_s=head(title,desc,cur,og)+s[:i]+NAV_CSS+'\n</head>\n<body>\n'+body+'\n'+FOOT+'</body>\n</html>\n'
    open(out,'w',encoding='utf-8').write(out_s)

wrap("capital-clues.html", f"{SITE}/capitalo/index.html","capitalo","Capitalo: the daily capital city game",
     "Guess today's capital city in six turns. Every turn: guess, or buy a clue.",
     subs=[HOOK["capitalo"],("<title>Capital Clues</title>","<title>Capitalo</title>"),
           ("<h1>Capital<span>.</span>Clues</h1>","<h1>Capital<span>o</span></h1>"),
           ('return `Capital Clues ${practice ? "(practice)" : "#" + SHOWN} ${won ? turns.length : "X"}/${MAXT}\\n${row}\\n${tail}`;',
            'return `Capitalo ${practice ? "(practice)" : "#" + SHOWN} ${won ? turns.length : "X"}/${MAXT}\\n${row}\\n${tail}\\n${location.origin}/capitalo/`;')],
     og="/og-capitalo.png")
wrap("edgewise.html", f"{SITE}/polygo/index.html","polygo","Polygo: name the country from its outline",
     "A daily country outline that starts as 2 edges and doubles with every miss. How few edges do you need?",
     subs=[HOOK["polygo"]], og="/og-polygo.png")
wrap("equalo.html", f"{SITE}/equalo/index.html","equalo","Equalo: balance the countries",
     "Seven countries, two pans. Split them so population, area and GDP weigh the same on both sides.",
     subs=[HOOK["equalo"]], og="/og-equalo.png")
wrap("roadtripo.html", f"{SITE}/roadtripo/index.html","roadtripo","Roadtripo: the daily US road trip game",
     "Drive state to state across the US and stop at one famous landmark on the way. Name the states in between.",
     subs=[HOOK["roadtripo"],("<title>Roadtripo</title>","<title>Roadtripo (beta)</title>"),("<h1>Roadtrip<span>o</span></h1>","<h1>Roadtrip<span>o</span>"+BADGE+"</h1>")], og="/og-roadtripo.png")
wrap("voyago.html", f"{SITE}/voyago/index.html","voyago","Voyago: rare geography answers take you further",
     "Ten geography prompts a day. The rarer your answer, the further you travel around the world from Brussels to Kampala.",
     subs=[HOOK["voyago"],("<title>Voyago</title>","<title>Voyago (beta)</title>"),("<h1>Voyag<span>o</span></h1>","<h1>Voyag<span>o</span>"+BADGE+"</h1>")], og="/og-voyago.png")
wrap("today.html", f"{SITE}/today/index.html","today","Today's Terrago: your daily results",
     "Your combined score across today's five Terrago games.",
     subs=[("<title>Today</title>",'<title>Today\'s Terrago</title>\n<meta name="robots" content="noindex">')])
print("ok")
