# 104th Battalion — XP Leaderboard

Dark-themed shadcn-style leaderboard for the 104th Battalion milsim XP/leveling system. Hosted on GitHub Pages with live data from a JSON file your bot updates.

## Live site

After deploying: `https://<your-username>.github.io/104thXP/`

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173

## GitHub Pages setup

1. Push this repo to GitHub (e.g. `104thXP`)
2. **Settings → Pages → Build and deployment**: set source to **GitHub Actions**
3. Push to `main` — the deploy workflow runs automatically

## Bot data updates (every 10 minutes)

**This does not violate GitHub ToS.** Automated commits that update a data file are a standard pattern. A few practical tips:

| Approach | Notes |
|----------|-------|
| **Update same file** (`public/data/leaderboard.json`) | Preferred — one file, overwrite in place |
| **10 min interval** | Fine for a small ops leaderboard (~144 commits/day) |
| **Use `[skip ci]` in commit message** | Optional — avoids redeploying the site on every data push; the frontend polls JSON directly anyway |
| **Separate data branch** | Alternative if you want zero commits on `main` |

The site polls `data/leaderboard.json` every **60 seconds** with cache-busting, so troopers see updates without a full page rebuild. Your bot can push every 10 minutes; the UI will pick up changes on the next poll.

### JSON schema

Your bot should write to `public/data/leaderboard.json`:

```json
{
  "lastUpdated": "2026-07-07T01:00:00.000Z",
  "season": "Season 1",
  "players": [
    {
      "id": "unique-id",
      "displayName": "CT-7567",
      "callsign": "Rex",
      "xp": 38200,
      "level": 48,
      "rank": "grand-master",
      "avatarUrl": "https://optional-avatar-url"
    }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `lastUpdated` | Yes | ISO 8601 timestamp |
| `players` | Yes | Array of troopers |
| `players[].id` | Yes | Stable unique ID |
| `players[].displayName` | Yes | Shown on leaderboard |
| `players[].xp` | Yes | Total XP |
| `players[].rank` | No | Override tier: `shiny`, `trooper`, `seasoned`, `veteran`, `elite`, `vanguard`, `legend`, `padawan`, `knight`, `master`, `grand-master` |
| `players[].callsign` | No | Secondary label |
| `players[].level` | No | Display only (not used for sorting) |
| `players[].avatarUrl` | No | Profile image URL |

If `rank` is omitted, colour tier is derived from level (see `src/lib/ranks.ts`).

### Level formula

```
level = floor((−1 + √(1 + XP/625)) / 2)     when XP < 2,250,000
level = 30 + floor((XP − 2,250,000) / 147,500)   otherwise
```

Ranks by level:

| Tier | Levels | Min XP |
|------|--------|--------|
| Shiny | 0–9 | 0 |
| Trooper | 10–19 | 275,000 |
| Seasoned | 20–29 | 1,050,000 |
| Veteran | 30–39 | 2,250,000 |
| Elite | 40–49 | 3,725,000 |
| Vanguard | 50–59 | 5,200,000 |
| Legend | 60–69 | 6,675,000 |
| Padawan | 70–79 | 8,150,000 |
| Knight | 80–89 | 9,625,000 |
| Master | 90–149 | 11,100,000 |
| Grand Master | 150+ | 19,950,000 |

Edit tier thresholds in `src/lib/ranks.ts` if the rank ladder changes.

### Example bot commit (GitHub API)

```bash
curl -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/OWNER/104thXP/contents/public/data/leaderboard.json \
  -d '{
    "message": "chore: update leaderboard [skip ci]",
    "content": "'$(base64 -i leaderboard.json)'",
    "sha": "EXISTING_FILE_SHA"
  }'
```

## Project structure

```
public/data/leaderboard.json   ← bot writes here
src/components/                ← UI (shadcn-style)
src/lib/ranks.ts               ← level formula & tier colours
src/hooks/use-leaderboard.ts   ← live polling
.github/workflows/deploy.yml   ← GitHub Pages deploy
```

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview production build
```
