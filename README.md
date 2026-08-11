# GRAND SLAAM — Tournament Website

A static, Flash-era styled single-page site for a global pro-wrestling tournament.
Each company sends a **4-member team**; every fight gets its own animated "VS" page,
loaded from a single JSON file you can update whenever.

## Structure

```
tournament-site/
├── index.html          # Shell: header (logo centre + 3 links each side), router mount
├── css/
│   └── main.css        # Gold/black theme, transitions, responsive layout
├── js/
│   ├── config.js       # ▶ EDIT: YouTube API key, live video ID, polling
│   ├── data.js         # Loads data/fights.json + data/results.json at runtime
│   ├── router.js       # Hash routing + page templates + curtain transition
│   ├── player.js       # Custom skinned YouTube player (branding hidden)
│   ├── livechat.js     # Reskinned YouTube live chat reader (StreamYard comments)
│   └── app.js          # Bootstrapping + mobile menu
├── data/
│   ├── fights.json     # ◀ THE DATA FILE. Teams, members, fight cards.
│   └── results.json    # ◀ RESULTS FILE. Record winners/losers here.
└── assets/
    └── logo.svg        # Replace with your custom SVG logo
```

## Run locally

Any static server works (needed because of `fetch`):

```powershell
# Python
python -m http.server 8080 --directory tournament-site

# then open http://localhost:8080
```

## Update fights (the "sporadically updated JSON")

Edit `data/fights.json` and re-upload / redeploy. No rebuild needed.

### Add / change a fight (matches are 1 member vs 1 member)

```jsonc
{
  "id": "qf1",                 // unique id — determines the page URL (#/fight/qf1)
  "round": "Quarter-Final 1",  // label shown above VS card
  "teamA": "phoenix",          // must match a "team.id"
  "teamB": "kaiju",
  "fighterA": "axel-vaughn",   // member id from team A (see below)
  "fighterB": "kenji-nakamura",// member id from team B
  "date": "TBA",
  "venue": "Global Arena",
  "status": "scheduled"        // "scheduled" | "live" | "completed"
}
```

Set a fight's `status` to `"live"` to make it appear as the next bout and hook
the live page to it.

### Add / edit a team (each team has exactly 4 members)

```jsonc
{
  "id": "phoenix",
  "name": "PHOENIX PRO WRESTLING",
  "short": "PHOENIX",
  "company": "Phoenix Pro Wrestling",
  "country": "USA",
  "flag": "🇺🇸",              // emoji flag or paste any text
  "color": "#d84315",          // team accent color
  "motto": "Rise from the ashes",
  "members": [                  // exactly 4
    { "id": "axel-vaughn",      // unique id, referenced by fights & results
      "name": "Axel Vaughn",
      "nickname": "The Inferno",
      "role": "Captain",
      "height": "6'2\"", "weight": "245 lbs", "record": "18-3-1",
      "hometown": "Las Vegas, NV" }
  ]
}
```

## Record results — elimination / greyscale

Edit `data/results.json`. Each entry records one fight's outcome. The **loser
is automatically eliminated from the tournament**:

- that member's picture turns **greyscale** on the Teams page, fight pages
  and cards;
- when **all 4 members of a team** have lost, an **ELIMINATED** alert banner
  appears on the Home, Teams, Tournament and Schedule pages, and the team is
  marked OUT.

```jsonc
{
  "results": [
    {
      "fightId": "qf1",            // must match a fight id
      "winner": "kenji-nakamura",  // member id (wins — stays active)
      "loser": "axel-vaughn",      // member id (loses — eliminated, grey)
      "method": "Pinfall",         // free text
      "time": "12:34",
      "date": "2026-03-01"
    }
  ]
}
```

Tips:

- `winner` and `loser` must both be members of the fight's two teams.
- Deleting/removing a result re-colours the member instantly.
- A fight with a result automatically renders as COMPLETED, even if its
  `status` in `fights.json` says `scheduled` (a live fight stays LIVE until
  you change `status`).

## Live stream + live chat setup

1. **Broadcast on YouTube via StreamYard** (stream must be public/unlisted).
2. Copy the broadcast's **video ID** (the `XXXX` in `youtube.com/watch?v=XXXX`)
   into `js/config.js` → `liveVideoId` (or `data/fights.json` → `tournament.live.videoId`).
3. Enable the **YouTube Data API v3** in Google Cloud Console and create an API key.
4. Paste it into `js/config.js` → `youTubeApiKey`.

The custom player hides YouTube's chrome (controls, annotations, related videos;
a minimal logo can appear while paused per YouTube policy). The chat panel polls
the YouTube Live Chat API and renders the exact same comments StreamYard shows,
fully reskinned in the gold/black theme.

## Design notes

- **Fonts**: Orbitron (Google Fonts), loaded via `<link>` in `index.html`.
- **Palette**: gold gradient (`#f7e08b → #9a7318`) on black.
- **Transitions**: curtain wipe + gold flash between every route; VS cards use
  opponent-slide + centre-burst reveal.
- **Logo**: centered in the menu with 3 links each side, all aligned to the
  logo's vertical middle. Replace `assets/logo.svg` with your custom SVG
  (it renders at ~`header height − 26px`).
- **Responsive**: 1024px collapses side columns; 860px switches to a
  hamburger menu with the logo still centered; 560px stacks VS/next cards.