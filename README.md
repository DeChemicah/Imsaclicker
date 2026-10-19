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
- **Team**: hire 12 kinds of team members for income every second. Owning 25, 50, 100, 200 or 400 of one kind doubles its output.
- **Upgrades**: multipliers for team members, taps, all income, PUSH and race prizes.
- **Garage**
  - **21 IMSA cars** drawn to scale from the real cars, with team-style liveries, brand wordmarks, badges and real race numbers. **GT3** cars (Lexus RC F, NSX, AMG, Vantage, Mustang, Huracán, 720S, M4, 296, Corvette Z06, 911 GT3 R) race in GTD and GTD PRO. **LMP2** has the Riley, Ligier, Dallara and ORECA. **GTP** has the ARX-06, V-Series.R, M Hybrid V8, SC63, Valkyrie and 963.
  - Each car has its own **pace** and a **perk**. Every car you own adds +5% income. You can buy and swap cars within a class at any time.
  - **Car development**: tires, brakes, suspension, gearbox, aero and engine. Each level adds +4% pace. GT3, LMP2 and GTP each have their own development.
  - **Drivers**: sign Bronze, Silver, Gold and Platinum drivers. Your best three form the lineup and add pace and perks.
- **Races**
  - Each class has an 11-round championship from Daytona to Petit Le Mans, against 7 rival teams scoring IMSA-style points.
  - Your pace against the field's pace decides where you finish. Tapping during a race speeds it up.
  - **Pit stop mini-game** mid-race: tap while the needle is in the green to gain places.
  - Win the title for Legacy Points. Rivals get faster each time you win a title in that class.
- **Licenses**: win 3 races in a class to buy the next license: GTD → GTD PRO (x2 income) → LMP2 (x6) → GTP (x30).
- **Legacy (prestige)**: start a new season to turn lifetime earnings into Legacy Points. Each point gives +3% income forever.
  - Spend points on 11 Legacy perks: auto-racing, auto pit stops, shorter races, starting licenses, starting money, discounts, longer offline earnings and more.
- **36 achievements**, each worth +2% income forever.
- **PUSH** boost, **sponsor bonus** pickups, and **offline earnings** (50% rate up to 8h, upgradeable).
- Progress auto-saves to `localStorage`. Saves from the first version migrate automatically. Export and import save codes from the **More** tab.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell |
| `styles.css` | Styles |
| `game.js` | All game logic, balance tables and rendering |
| `sw.js` | Offline cache (bump `VERSION` when shipping changes) |
| `manifest.webmanifest`, `icons/` | PWA install metadata |

---

Unofficial fan-made game. Not affiliated with, endorsed by or sponsored by IMSA or any team, manufacturer, driver or circuit. Car and circuit names belong to their owners. All drivers and teams in the game are fictional.
