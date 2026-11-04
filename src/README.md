# Terrago source files

Everything needed to rebuild the five games on playterrago.com. The live site is the static HTML at the top level of this repo. This `src/` folder is never served: `/_redirects` sends `/src/*` to the 404 page, and `robots.txt` disallows it.

The full project background is kept privately, outside this public repo.

## How a game gets to the site

```
data files ──► build script ──► standalone/<game>.html ──► site/build_site.py ──► /<game>/index.html (live)
```

1. **Template + data → standalone page.** Each game has a `*-template.html` with a `/*DATA*/` placeholder. Its build script inlines the data JSON and writes one self-contained HTML file. Those files are kept in `standalone/`.
2. **Standalone page → site page.** `site/build_site.py` wraps each standalone page with the site `<head>` (SEO tags, Open Graph image, GoatCounter tracking, AdSense code), the top menu and the footer. It writes `/<game>/index.html`.
3. **Push to `main`.** Netlify deploys the repo root automatically. Every push spends Netlify credits, so batch changes into one push.

The original build ran in a temporary cloud workspace, so the scripts contain absolute paths like `/tmp/claude-0/mapbuild/` and `/home/claude/`. Before running them again, change those paths to point at this folder.

## Folders

| Folder | What's in it |
|---|---|
| `site/` | `build_site.py` (wraps every game page; holds the menu order, BETA badges and AdSense snippet) and `track_snippet.html` (GoatCounter + return-day tracking) |
| `shared/` | `world.txt` (195 countries: name, capital, alternate capitals, lat, lon, grouped by continent), `meta.txt` (population in millions, main language), `aliases.js` (alternate country names), `nb.json` + `nb.mjs` (land neighbours) |
| `capitalo/` | `clues-template.html`, `buildc.mjs`, `clues2.json` (clue data with pop, language, neighbours) |
| `polygo/` | `edge-template.html`, `buildedge.mjs` (simplifies each outline to 2–128 edges), `edge.json` |
| `equalo/` | `equalo-template.html` (originally `weigho-template.html`), `buildb.mjs` (template → page), `build.mjs` + `forest.txt` + `gdp.txt` → `ranko.json` (country stats), `verify.mjs` (checks a year of daily sets) |
| `roadtripo/` | `roadtripo-template.html` (CSS + HTML) + `roadtripo-script.html` (game JS); `buildus.mjs` (US map, adjacency, landmarks → `roadtripo.json`); `buildo.mjs` (page + year check); `landmarks.txt`; `adj_raw.json`; `data/na.geojson` (US/Canada/Mexico states); `lakes/lakes.geojson` (the 6 Great Lakes, drawn on top as water) |
| `voyago/` | `voyago-template.html` (game + 415-prompt bank), `build.mjs` (country facts + familiarity + world route → `voyago.json`), `buildpage.mjs`, `check.js` (bank size, 20-day no-repeat check), `pt.js` (Playwright play-through) |
| `og-images/` | Link-preview images (`og*.py`, using `og.html`) and social banners (`social*.py`) |
| `standalone/` | The current built single-file game pages; these are the inputs to `build_site.py` |
| `prototypes/` | Ranko, Balanco and the original 3-country Roadtrip (not on the site) |

## Node packages used
d3-geo, topojson-client, topojson-server, topojson-simplify, world-atlas, polygon-clipping (not needed any more), playwright (testing). See each folder's `package.json`.
