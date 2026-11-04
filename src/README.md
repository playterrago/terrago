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

## Daily run layer (`/daily.js`, `/today/`)

`/daily.js` links the five games into one daily run. `build_site.py` loads it on every game page and adds one hook line at the end of each game's `renderEnd()` (the `HOOK` table), daily mode only. It:

- reads each game's own `<key>:day` state and never writes to it, so streaks, stats and practice are untouched;
- keeps one extra key, `terrago-daily-v1` (`{day, games: {id: {r, grid} | {skip: true}}, sent}`), because Capitalo's emoji row and Roadtripo's shortest route can't be rebuilt outside the game;
- draws the shared results card (0–100 game score, five-game progress, Play next / View daily results, Copy result, Skip), the home-page "Today's run" strip and the `/today/` page (`standalone/today.html`, noindex).

Daily score per game: Polygo and Capitalo 100 − 15 per extra guess/turn; Equalo 🟩 33, 🟨 15, three greens = 100; Roadtripo 100 − 20 per state over the shortest route; Voyago points ÷ 13; a miss or skip is 0. Events: `daily-games-1`…`5`, `next-click-<game>`, `daily-skip-<game>`, `today-view`, `today-view-complete`, `daily-share`, `home-run-<game>`.

`build_site.py` now uses paths relative to the repo, so it runs from anywhere: `python3 src/site/build_site.py`.

## Equalo (`equalo2/`, since Nov 4, 2026)

One daily balance puzzle: 5–10 country flags, one statistic, 3 weighs. Every puzzle has an exact zero-difference split.

```
python3 equalo2/build_data.py     # sources/ -> stats.json (exact integers)
python3 equalo2/gen_puzzles.py    # stats.json -> puzzles.json (730 days + 400 practice; ~7 min)
python3 equalo2/test_puzzles.py   # brute-force check of every puzzle; must print ALL PUZZLES VALID
python3 equalo2/build_page.py     # -> standalone/equalo.html and /flags/*.svg (needs flag-icons; set FLAGS_DIR)
node equalo2/test_ui.js http://localhost:8765   # browser test (drag, touch, tap, keyboard, refresh, scoring, migration)
```

- **Statistics** (all stored as integers): population (World Bank SP.POP.TOTL, 2024), GDP (World Bank NY.GDP.MKTP.CD, 2022, US$ millions), and from the CIA World Factbook (Sep 2026 snapshot): land area, mean elevation, highest point, coastline, renewable freshwater (2022 est., thousand m³) and airports (2025). Rejected: railways (mixed years 2014–2022), forest area (only a %), precipitation and reservoirs (no consistent country-level source reachable).
- **Score out of 1,000:** exact balance on weigh 1/2/3 = 1,000/850/700; otherwise the closest weigh scores 600 × (1 − off% ÷ 20%), where off% = |left − right| ÷ total. Daily-run score = points ÷ 10.
- **Saves:** `equalo-v2:day` (`place`, `weighs`, `done`, `pts`) and `equalo-v2:stats`. The old `equalo-v1` keys are never written; the old games-played count is carried over once.
- Puzzles cycle after day 730 (Nov 1, 2028). Run the generator again before then.

## Voyago scoring (since Nov 4, 2026)

- 10 prompts, up to 100 points each, 1,000 a day. Tiers: Tourist 10, Traveller 25, Explorer 45, Rare find 65, Deep cut 85, Off the map 100.
- Tier = position of the answer in the prompt's valid answers ranked by a fixed familiarity score (`fam` in voyago.json): under 25% / 45% / 65% / 80% / 93% / above. The same answer always gets the same points.
- `FROZEN[day][promptId][answer] = tier` can hold player-based tiers, fixed before a day starts. `RESPONSES` is `null`: no player answers are collected (the site has no server), so the results screen shows reference rarity and says that popularity data isn't collected.
- Saves keep the tier of each answer, so days saved on the old 15–130 scale are rescored exactly. Stats move to the new scale the first time a new day is finished (played count kept).
- `node voyago/test_scoring.js http://localhost:8765` tests scoring, normalization, refresh, migration and the results screen.

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
