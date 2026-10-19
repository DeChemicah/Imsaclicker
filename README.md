# IMSA Clicker

A mobile-first idle / incremental game set in sports car endurance racing. Start with one GTD car and build your team up to an overall-winning GTP program.

## Play

The game is plain HTML/CSS/JS with no build step. Serve the folder over HTTP:

```sh
python3 -m http.server 8000
# open http://localhost:8000 on your phone (same network) or desktop
```

It's an installable PWA: use **Add to Home Screen** for a full-screen app that also works offline. It also deploys as-is to any static host, such as GitHub Pages.

## Gameplay

- **Tap the car** to earn prize money. Upgrades raise the tap value, and later ones add a share of your $/sec to every tap.
- **Team**: hire 12 kinds of team members, from Mechanics to an Endurance Dynasty. Each produces income every second. Owning 25, 50, 100, 150, 200… of one kind doubles its output.
- **Upgrades**: multipliers for each team member, tap power, global income, PUSH and race prizes.
- **Car class**: move up GTD → GTD PRO → LMP2 → GTP. Each step multiplies all income, and the car changes look.
- **PUSH**: a short income boost (x2 for 30s at first) with a cooldown.
- **Sponsor bonuses**: they pop up on track now and then. Tap one for a burst of cash.
- **Races**: an 11-round calendar from Daytona to Petit Le Mans. Your $/sec sets your expected finish, and tapping during a race speeds it up. A podium unlocks the next round. A win adds +10% income for the season.
- **Seasons (prestige)**: reset to earn Championship Points from lifetime earnings. Each point gives a permanent +5% income.
- **Offline earnings**: 50% rate, up to 8 hours.
- Progress auto-saves to `localStorage`. You can export and import save codes from the **More** tab.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell |
| `styles.css` | Styles |
| `game.js` | All game logic, balance tables and rendering |
| `sw.js` | Offline cache (bump `VERSION` when shipping changes) |
| `manifest.webmanifest`, `icons/` | PWA install metadata |

---

Unofficial fan-made game. Not affiliated with, endorsed by or sponsored by IMSA or any team, manufacturer or circuit.
