# Terrago

Small daily games about the world.

| Page | What it is |
|---|---|
| `/` | Home: today's Capitalo and Polygo, with your status and streaks |
| `/capitalo/` | **Capitalo**: daily game. Six turns; each turn, guess a capital or buy a clue. |
| `/polygo/` | **Polygo**: daily game. Name the country from its outline: 2 edges, doubling with every miss up to 128. |
| `/about/` | About Terrago: how each game works, who makes it, credits |
| `/privacy/` | Privacy page (no ads, no tracking; progress saved in the browser) |
| `404.html` | Shown for any page that doesn't exist |

No ads, no accounts, no server. Every page is a plain HTML file.

---

## Launch tonight (Netlify)

1. Go to **app.netlify.com/drop** and log in.
2. Drag **`terrago-site.zip`** (or the whole Terrago folder) onto the drop zone.
3. Rename the site: **Site configuration → Change site name** → `terrago` (gives `terrago.netlify.app` if free).
4. On your phone, open the link and play one full Capitalo round and one Polygo round.

**Updating later:** Netlify → your site → **Deploys** → drag the new zip in.

## Before sharing beyond friends

- [x] **Domain:** `playterrago.com`, connected in Netlify → **Domain management** (A record `@` → `75.2.60.5`, CNAME `www` → your `.netlify.app` address).
- [x] **Link previews** point to `https://playterrago.com/...` so iMessage, WhatsApp and LinkedIn show the preview card.
- [ ] **HTTPS:** Netlify → Domain management → HTTPS shows a certificate for `playterrago.com`.
- [ ] **Add analytics.** GoatCounter is free: paste its one-line script before `</head>` on each page.
- [ ] **Check the name.** Search "Terrago", "Capitalo" and "Polygo" (a puzzle app called Polygolines exists) on Google, the App Store, and Canada's trademark database.
- [ ] **Canaccord compliance.** Ask whether you need to disclose this as an outside activity.

## Launch plan

| When | Who | What |
|---|---|---|
| Days 1–3 | 10–20 friends | "Play today's puzzle and tell me the one thing that confused you." Fix what they hit. |
| Days 4–7 | McGill, Sigma Chi, Instagram | Post your **emoji result grid**, not just the link. |
| Week 2 | r/geography, r/geoguessr, Worldle/Globle Discords, Show HN | Maker post: "I built a daily capital game where each turn you guess or buy a clue." Follow each community's self-promo rules. |

**Metric to watch:** of people who played on day 1, how many came back by day 3?

---

## How it works (for editing)

- **Daily answers:** chosen by date. Capitalo and Polygo #1 are both **2 Nov 2026**. At each local midnight, Capitalo moves to the next capital in a fixed shuffled order (seed `20261102`). It cycles after 193 days. Polygo uses its own order (seed `20261103`) over 155 countries with outlines detailed enough to play; tiny countries can still be guessed.
- **Saved progress:** each player's game, streaks and best scores live in their browser (`localStorage`), so they don't sync across devices. The hub reads the same storage to show today's status and streak.
- **Known limit:** someone reading the source could work out future answers. Fine for now; if it ever matters, serve the daily answer from a small server function.
- **Data:** populations are rounded recent estimates; neighbour counts come from shared land borders on the map (Kosovo is included as a country; Western Sahara, Somaliland and the Palestinian territories aren't counted as separate neighbours).
- **Credits:** map shapes from Natural Earth (public domain) via world-atlas (ISC). Fonts: Bricolage Grotesque and IBM Plex (Open Font License), from Google Fonts.
