# Dust & Badge — Project Vision

> Source of truth for what this game is. A fresh session should be able to read
> this file and continue the project without re-asking the owner anything.
> Working title "Dust & Badge" and bandit name were picked by Claude; the owner
> said they don't mind and they can be renamed at any time.

## One-line pitch
A 2D side-scrolling pixel-art western survival-adventure. You play a **lawman**
who leaves his home town to chase **"Silver" Jack Calloway**, a lone bandit who
robbed the town bank, across a long road through multiple biomes. It takes
several in-game days to catch him.

## Platform & tech
- Plain **HTML + CSS + JavaScript**, runs in the browser, no build step.
- Must work on **computer (keyboard + mouse)** and **phone/tablet (on-screen touch
  buttons)**.
- **Public and free** to play (planned hosting: GitHub Pages).
- Claude makes **all** art, music, sound and code. No outside assets.

## Story
1. Starts in the home town (Redemption Gulch). Short intro cutscene: the banker
   runs to the sheriff — "Silver" Jack Calloway robbed the bank and rode west.
2. The lawman follows the road west, through towns and wilderness.
3. Along the way: abandoned houses to loot, enemies, towns to resupply.
4. Final showdown: **boss fist fight** with Jack at his hideout. Jack works
   **alone** (no gang). He fights dirty (feints, sand in the eyes, headbutt).
5. Bring him back to the starting town, collect the reward → **the game ends**
   (no post-game free roam).
- Story is told with **short cutscenes + dialogue boxes**.
- **No time limit** — Jack never escapes; take as long as you want.

## World
- **One long continuous road** scrolling left/right; biomes blend into each
  other. Player can **backtrack** to earlier towns.
- Biome order: **Town → Desert badlands → Canyon → Prairie → Forest/Mountains →
  Snowy peaks → Bandit's hideout.**
- **6 towns**, about one per biome.
- Biomes affect survival: harsh biomes (desert heat by day, mountain/snow cold)
  make the player **get hungry faster**.

## Time
- Real, continuously progressing clock with day/night cycle.
- **One in-game day ≈ 30 real minutes.**
- Full playthrough target: **3–5 hours** (~6–10 in-game days).
- **Night:** darker screen (lantern light around the player), **more dangerous
  enemies** (coyotes, wolves, night bandits), and the player can **make camp**.

## Player (the lawman)
- Look (approved): tall, lean, **true side view**, cream hat, gold sheriff's star,
  dark leather vest, light blue shirt, navy neckerchief, brown trousers, boots
  with spurs, stubble + mustache. ~50px tall at 320x180 internal resolution.
- Moves: walk, run, jump, **punch**, **block**. **Fists only — no weapons, no
  guns, no ammo.**
- Stats: **Health**, **Hunger**, **Tiredness/energy**.
  - Hunger drains over time (faster in harsh biomes, faster when running). At
    zero, health drains.
  - Tiredness: if he doesn't sleep he gets slower.
- **Death:** respawn at the **last town or campfire** where he slept. Keeps
  inventory.
- **Upgrades:** only **brawling gloves** (hit harder / block better).

## Combat
- Fist fighting only. Enemies telegraph attacks (wind-up); the player must
  **block** at the right time, then punch back. Big animals hit harder.
- Enemies (all beatable with punches): outlaws/bandits, rattlesnakes, scorpions,
  coyotes, wolves, bears (forest), mountain lions, buzzards.
- No fighting from horseback.

## Survival & items
- Items: **food**, **money**, **bandages** (heal), **horse feed**. No water, no ammo.
- **Inventory is unlimited.**
- **Campfire:** can be made **anywhere for free**. Sleep to skip the night,
  restore energy, save, and set the respawn point.

## Looting abandoned houses
- Houses sit in the background like town buildings. Click/tap (or press the
  action key) to **go inside**, walk around the room and **search containers**.
- **Sometimes dangerous** inside (rattlesnake, squatter, scorpion).

## Towns (all features wanted)
1. General store — buy food, bandages, horse feed.
2. Stable — buy horses / swap for better ones.
3. Saloon / hotel — sleep (skip night) and save; respawn point.
4. Townsfolk with hints about where the bandit went.
5. Side jobs for money (deliveries, clearing coyotes, etc.).
6. Saloon fist-fight brawls for prize money.
7. Sell looted items.

## Horses
- Faster travel. **Cannot jump** while riding. **No fighting on horseback.**
- Horse has its **own hunger bar** and eats horse feed. If it hits empty, the
  horse **slows down**.
- Enemies **cannot** hurt the horse.
- **Several horse types** (mule → average → fast stallion) sold at stables.
- Player can **name** the horse.

## Saving
- **3 save slots** (local to the device/browser).

## Art & sound
- Pixel art, internal resolution 320x180 scaled up. Style reference: the
  approved sample — dithered sunset sky, layered mesas with rock strata,
  detailed props (shacks, saguaros, fences, skulls, tumbleweeds). Parallax
  scrolling layers. Sky colour follows the in-game clock.
- **Retro chiptune** music + sound effects, generated in the browser.
  Music changes **per biome**, **day vs night**, **during fights**, and **in towns**.
