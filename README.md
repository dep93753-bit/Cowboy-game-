# Dust & Badge

A side-scrolling pixel-art western. You're the sheriff of Redemption Gulch, and
"Silver" Jack Calloway just robbed the bank and rode west. Follow him across the
badlands on foot, loot abandoned homesteads, fight with your fists, keep yourself
fed and rested, and survive the nights.

Plain HTML, CSS and JavaScript. No build step, no libraries.

## Play
- **Locally:** open `index.html` in a browser (Chrome, Edge, Firefox, Safari).
- **Online:** turn on GitHub Pages (repo **Settings → Pages → Deploy from a
  branch → main / root**), then play at `https://<your-username>.github.io/<repo-name>/`.

## Controls
| Action | Keyboard | Phone/tablet |
|---|---|---|
| Walk | A / D or ← → | ◀ ▶ |
| Run | Shift (hold) | RUN (toggle) |
| Jump | W / Space | JUMP |
| Punch | J | PUNCH |
| Block | K (hold) | BLK (hold) |
| Talk / enter / search | E, or click/tap the thing | USE, or tap |
| Get on/off horse, whistle | H | HORSE |
| Make camp | C | CAMP |
| Saddlebag | I | BAG |
| Pause | Esc | II |
| Mute | M | (pause menu) |

Tip: block right as an enemy strikes for a **PERFECT** block, which leaves it dazed.

## Music & sound
Real recorded music (OpenGameArt.org) and sound effects (Kenney.nl), all CC0.
See [`assets/CREDITS.md`](assets/CREDITS.md). Sound effects need the game to be
served over the web (GitHub Pages or any local server); when opened straight
from a file, the game falls back to its built-in synthesised effects.

## Project docs
- [`docs/VISION.md`](docs/VISION.md): the full game design
- [`docs/ROADMAP.md`](docs/ROADMAP.md): build stages

## Code map
| File | What it does |
|---|---|
| `js/game.js` | Main loop, rules, menus, saving, lighting |
| `js/entities.js` | Player, enemies, townsfolk, campfire |
| `js/world.js` | Road layout: towns, houses, enemy spots, scenery |
| `js/rooms.js` | All interiors: town buildings and abandoned buildings |
| `js/horse.js` | Horse art and riding |
| `js/sprites.js` | Character/creature pixel art (text grids) |
| `js/props.js` | Buildings, cacti, furniture art |
| `js/backgrounds.js` | Sky by time of day, parallax layers |
| `js/audio.js` | Chiptune music + sound effects |
| `js/ui.js` | HUD, dialogue, menus, title screen |
| `js/input.js` | Keyboard, touch and click input |
