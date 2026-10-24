// Main loop, scenes, rules. Everything else is wired together here.
const Game = (() => {
  const TIME_SCALE = 0.8;        // in-game minutes per real second (30 real min = 1 day)
  const HUNGER_PER_HOUR = 3.4;   // base hunger drain
  const ENERGY_PER_HOUR = 2.6;   // base tiredness drain

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  const layer = U.canvas(W, H), lctx = layer.getContext('2d');
  const mask = U.canvas(W, H), mctx = mask.getContext('2d');
  const light = U.canvas(W, H), gctx = light.getContext('2d');
  [ctx, lctx, mctx, gctx].forEach(c => { c.imageSmoothingEnabled = false; });

  const G = {
    clock: 0, state: 'boot', slot: 1, data: null,
    player: null, enemies: [], npcs: [], pickups: [], particles: [], floaters: [], tumbleweeds: [],
    scene: 'world', interior: null, worldEnemies: null, camX: 0, shakeT: 0, shakeMag: 0,
    searching: null, spawnT: 6, saveT: 0, biome: null, cutscene: null, titleCam: 0, interiorCache: {},
  };

  // --------------------------------------------------------------- helpers
  const hour = () => (G.data.time % 1440) / 60;
  const day = () => Math.floor(G.data.time / 1440) + 1;
  G.isNight = () => BG.night(hour()) > 0.6;
  G.campfireX = () => G.data.campfire;
  G.campfireNear = (x, r) => G.scene === 'world' && G.data.campfire !== null && Math.abs(G.data.campfire - x) < r;
  G.dust = (x, y, n) => {
    for (let i = 0; i < n; i++) G.particles.push({ x, y: y - 1, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 20, life: 0.5, col: '#d8b080' });
  };
  G.spark = (x, y, col) => {
    for (let i = 0; i < 6; i++) G.particles.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.8) * 70, life: 0.25, col });
  };
  G.floater = (x, y, text, col) => G.floaters.push({ x, y, text, col, life: 0.9 });
  G.shake = m => { G.shakeT = 0.2; G.shakeMag = m; };
  G.damage = n => {
    G.data.hp = Math.max(0, G.data.hp - n);
    G.floater(G.player.x, G.player.y - 68, '-' + n, '#ff6a5a');
  };
  // Who runs the place you're in (Silverbend renames Redemption Gulch's cast).
  const who = (kind, name) => {
    const b = G.interior && G.interior.building;
    return (b && b.cast && b.cast[kind] && b.cast[kind].name) || name;
  };
  function addItem(id, n = 1) { G.data.inv[id] = (G.data.inv[id] || 0) + n; }
  function takeItem(id, n = 1) {
    G.data.inv[id] = (G.data.inv[id] || 0) - n;
    if (G.data.inv[id] <= 0) delete G.data.inv[id];
  }
  const keyName = (k, touch) => (document.body.classList.contains('touch') ? touch : k);

  // ------------------------------------------------------------ save/load
  function save() {
    if (!G.data || G.state === 'title') return;
    const d = G.data;
    if (G.scene === 'interior') d.x = G.interior.doorWorld;
    else d.x = Math.round(G.player.x);
    d.scene = 'world';
    Save.write(G.slot, d);
  }

  function startGame(slot, data, isNew = !data) {
    G.slot = slot;
    G.data = data || Save.fresh();
    enterZone(G.data.zone || 'road');
    G.player = new Player(G.data.x);
    G.pickups = []; G.particles = []; G.floaters = [];
    G.bubbles = [];
    Town.bind(G);
    makeHorse();
    G.scene = 'world'; G.interior = null; G.biome = null;
    G.camX = U.clamp(G.player.x - W / 2, 0, World.END + 120 - W);
    UI.title(false);
    UI.showHud(true);
    document.getElementById('touch').classList.toggle('hidden', !document.body.classList.contains('touch'));
    G.state = 'play';
    UI.fade(true);
    setTimeout(() => UI.fade(false), 50);
    if (isNew) startIntro();
    else UI.toast(`Day ${day()}. The trail west is waiting.`);
  }

  // Make a map current and fill it with its people and animals.
  function enterZone(zone) {
    World.use(zone);
    G.data.zone = World.zone;
    G.npcs = World.NPCS.map(n => new NPC(n));
    G.critters = World.CRITTERS.map(c => new Town.Critter(c));
    G.enemies = []; G.rocks = [];
    G.biome = null; G.spawnT = 6;
  }
  // Walk through a trail to another map; your horse comes along.
  function travel(exit) {
    if (G.travelling) return;
    G.travelling = true;
    UI.fade(true);
    Sound.sfx('door');
    setTimeout(() => {
      const d = G.data, p = G.player;
      d.campfire = null;
      enterZone(exit.to);
      p.x = exit.toX; p.vx = 0;
      if (G.horse) { G.horse.x = p.mounted ? p.x : p.x - 30 * (p.face || 1); G.horse.vx = 0; }
      G.camX = U.clamp(p.x - W / 2, 0, World.END + 120 - W);
      G.travelling = false;
      UI.fade(false);
      UI.place(World.biomeAt(p.x).name);
      save();
    }, 650);
  }

  function toTitle() {
    save();
    G.state = 'title';
    UI.closeMenu();
    UI.showHud(false);
    UI.prompt(null);
    document.getElementById('touch').classList.add('hidden');
    showTitle();
  }

  function showTitle() {
    G.state = 'title';
    World.use('road');   // the title screen pans along the badlands road
    Sound.play('title');
    const slots = [1, 2, 3].map(n => {
      const data = Save.load(n);
      const where = data ? (World.biomeAt(data.x, data.zone || 'road').name + ' · ' + U.fmtTime(data.time)) : '';
      return {
        n, data, where,
        play: () => {
          if (data) return startGame(n, data);
          // a new game starts by picking how the sheriff looks
          UI.title(false);
          UI.customize({ onDone: look => { const d = Save.fresh(); d.look = look; startGame(n, d, true); }, onCancel: showTitle });
        },
        remove: () => {
          UI.menu({
            title: `Delete slot ${n}?`, sub: 'This cannot be undone.',
            build: () => [
              { label: 'Yes, delete it', pick: () => { Save.remove(n); showTitle(); return 'close'; } },
              { label: 'No, keep it', pick: () => 'close' },
            ],
          });
        },
      };
    });
    UI.title(true, slots);
  }

  // ----------------------------------------------------------------- intro
  function startIntro() {
    const hollis = G.npcs.find(n => n.id === 'hollis');
    hollis.x = 250; hollis.face = -1;
    G.cutscene = { step: 0, hollis };
    G.state = 'cutscene';
    UI.dialogue([
      [null, 'Redemption Gulch, 1878.'],
      [null, 'A quiet morning in a quiet town... until it wasn\'t.'],
    ], () => { G.cutscene.step = 1; });
  }
  function cutsceneUpdate(dt) {
    const c = G.cutscene, h = c.hollis;
    if (c.step === 1) {
      // Hollis runs over from the bank
      h.walking = true; h.face = -1; h.animT += dt * 6;
      h.x -= 70 * dt;
      G.player.face = 1;
      if (h.x <= 122) {
        h.x = 122; h.walking = false; c.step = 2;
        UI.dialogue([
          ['Hollis (Banker)', 'Sheriff! SHERIFF! The bank\'s been robbed!'],
          ['Hollis (Banker)', "It was \"Silver\" Jack Calloway! Grinnin' that silver tooth, he cleaned out the vault and rode west into the badlands!"],
          ['Sheriff', 'Jack Calloway... I put him behind bars once. I\'ll do it again.'],
          ['Hollis (Banker)', "He's got a fast horse and a head start. Pete's only got a few nags left at the stable, and they ain't cheap."],
          ['Hollis (Banker)', "Here, take what I had in my pocket for supplies. The whole town is counting on you."],
          ['Sheriff', 'Then I\'ll buy a horse, or I\'ll walk. Every trail ends somewhere.'],
        ], () => {
          G.data.money += 15;
          Sound.sfx('coin');
          G.data.flags.intro = true;
          // hand control back right away; Hollis strolls back to the bank on his own
          G.cutscene = null;
          G.state = 'play';
          UI.toast(`Got $15. Head WEST (right). ${keyName('A/D move, Shift run, W jump', 'Use the arrows to walk')}`, 5);
          save();
        });
      }
    }
  }

  // ---------------------------------------------------------------- combat
  G.playerPunch = p => {
    const reach = [p.x + p.face * 2, p.x + p.face * 26];
    const lo = Math.min(...reach), hi = Math.max(...reach);
    const dmg = 10 + GLOVES[G.data.gloves || 0].dmg + Math.floor(Math.random() * 3);
    let hit = false;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const ex0 = e.x - e.def.half, ex1 = e.x + e.def.half;
      if (ex1 >= lo && ex0 <= hi && p.y > GROUND - 30) {
        e.hit(dmg, p.x);
        G.spark(e.x, GROUND - e.height() * 0.6, '#ffe9a8');
        hit = true;
      }
    }
    if (hit) G.shake(2);
  };

  G.firstWindup = () => {
    if (G.data.flags.tutBlock) return;
    G.data.flags.tutBlock = true;
    UI.toast(`It's winding up! Hold ${keyName('K', 'BLK')} to BLOCK at the right moment, then ${keyName('J', 'PUNCH')}!`, 5);
  };

  G.enemyDefeated = e => {
    if (e.fixedId !== undefined) G.data.fixedKilled[e.fixedId] = day();
    if (G.scene === 'interior' && G.interior.kind === 'house') G.data.cleared[G.interior.house.id] = true;
    const loot = e.def.loot;
    let ox = 0;
    for (const id in loot) {
      if (id === 'money') {
        G.pickups.push({ x: e.x + ox, id: 'money', n: 3 + Math.floor(Math.random() * 8), t: 0 });
      } else if (Math.random() < loot[id]) {
        G.pickups.push({ x: e.x + ox, id, n: 1, t: 0 });
      }
      ox += 8;
    }
  };

  function die() {
    const p = G.player;
    if (p.dead) return;
    p.dead = true; p.lying = true;
    Sound.play('death');
    UI.prompt(null);
    setTimeout(() => {
      UI.fade(true);
      setTimeout(() => {
        const d = G.data;
        if (G.scene === 'interior') leaveInterior(true);
        dismount(true);
        d.time += 120;
        d.hp = 60; d.energy = Math.max(d.energy, 40); d.hunger = Math.max(d.hunger, 30);
        if ((d.respawn.zone || 'road') !== World.zone) { d.campfire = null; enterZone(d.respawn.zone || 'road'); }
        G.player = new Player(d.respawn.x);
        if (G.horse) { G.horse.x = d.respawn.x + 30; G.horse.follow = false; }
        G.enemies = []; G.pickups = [];
        G.camX = U.clamp(G.player.x - W / 2, 0, World.END + 120 - W);
        UI.fade(false);
        UI.dialogue([[null, `You blacked out... and came to at ${d.respawn.label}, bruised but breathing.`]], () => save());
      }, 700);
    }, 1600);
  }

  // ---------------------------------------------------------------- sleep
  function sleep(label, x, napHours) {
    const d = G.data, h = hour();
    let hours;
    if (h >= 18 || h < 5) hours = ((30 - h) % 24) || 8; // until 6 AM
    else hours = napHours || 6;
    UI.fade(true);
    G.data.sleeping = true;
    setTimeout(() => {
      d.time += hours * 60;
      d.energy = 100;
      d.hunger = Math.max(0, d.hunger - hours * HUNGER_PER_HOUR * 0.5);
      d.hp = Math.min(100, d.hp + 35);
      d.respawn = { x: Math.round(x), label, zone: World.zone };
      d.sleeping = false;
      G.enemies = G.enemies.filter(e => e.fixedId !== undefined && e.alive);
      save();
      UI.fade(false);
      UI.toast(`You slept ${Math.round(hours)} hours. Game saved. Day ${day()}, ${U.fmtTime(d.time)}.`, 3.5);
    }, 900);
  }

  // ----------------------------------------------------------------- menus
  function inventoryMenu() {
    UI.menu({
      title: 'Saddlebag', bagCloses: true,
      sub: () => `$${G.data.money} · Gloves: ${GLOVES[G.data.gloves || 0].name}`,
      build: () => {
        const list = [];
        const ids = Object.keys(G.data.inv);
        if (!ids.length) list.push({ note: 'Empty. Search abandoned houses or buy supplies in town.' });
        ids.forEach(id => {
          const it = ITEMS[id], n = G.data.inv[id];
          if (it.food) list.push({ label: `Eat ${it.name} x${n}`, right: `+${it.food} food`, pick: () => { eat(id); return 'stay'; } });
          else if (it.heal) list.push({ label: `Use ${it.name} x${n}`, right: `+${it.heal} hp`, disabled: G.data.hp >= 100, pick: () => { useBandage(id); return 'stay'; } });
          else list.push({ label: `${it.name} x${n}`, right: it.note ? '' : `sells $${it.sell}`, disabled: true });
        });
        const h = G.data.horse;
        if (h && G.data.inv.horsefeed && G.horse && (G.player.mounted || Math.abs(G.horse.x - G.player.x) < 80) && G.scene === 'world') {
          list.push({ label: `Feed ${h.name} (Horse Feed)`, right: `+40`, disabled: h.hunger >= 100,
            pick: () => { takeItem('horsefeed'); h.hunger = Math.min(100, h.hunger + 40); Sound.sfx('eat'); return 'stay'; } });
        }
        list.push({ label: 'Close', pick: () => 'close' });
        return list;
      },
    });
  }
  function eat(id) {
    takeItem(id);
    G.data.hunger = Math.min(100, G.data.hunger + ITEMS[id].food);
    Sound.sfx('eat');
  }
  function useBandage(id) {
    takeItem(id);
    G.data.hp = Math.min(100, G.data.hp + ITEMS[id].heal);
    Sound.sfx('pickup');
  }

  function pauseMenu() {
    UI.menu({
      title: 'Paused',
      sub: () => `Day ${day()} · ${U.fmtTime(G.data.time)} · ${G.biome ? G.biome.name : ''}`,
      build: () => [
        { label: 'Resume', pick: () => 'close' },
        { label: 'Saddlebag', pick: () => { setTimeout(inventoryMenu, 0); return 'close'; } },
        { label: 'Sound', right: Sound.muted ? 'OFF' : 'ON', pick: () => { Sound.toggleMute(); return 'stay'; } },
        { label: 'Controls', pick: () => { setTimeout(controlsMenu, 0); return 'close'; } },
        { label: 'Change your look', pick: () => { setTimeout(() => UI.customize({ look: G.data.look, onDone: look => { G.data.look = look; save(); } }), 0); return 'close'; } },
        { label: 'Save & quit to title', pick: () => { setTimeout(toTitle, 0); return 'close'; } },
      ],
    });
  }
  function controlsMenu() {
    UI.menu({
      title: 'Controls',
      build: () => [
        { note: 'A / D or arrows: walk  ·  Shift: run' },
        { note: 'W / Space: jump' },
        { note: 'J: punch  ·  K (hold): block' },
        { note: 'Block right as an enemy strikes for a PERFECT block: it gets dazed.' },
        { note: 'E: talk / enter / search  ·  click or tap buildings too' },
        { note: 'H: get on / off your horse, or whistle for it' },
        { note: 'C: make camp  ·  I: saddlebag  ·  M: mute  ·  Esc: pause' },
        { label: 'Back', pick: () => 'close' },
      ],
    });
  }

  function storeMenu() {
    const stock = ['jerky', 'beans', 'peaches', 'biscuit', 'bandage', 'horsefeed'];
    UI.menu({
      title: 'General Store',
      sub: () => `${who('shopkeep', 'Martha')}: "What'll it be, Sheriff?"  ·  You have $${G.data.money}`,
      build: () => {
        const list = stock.map(id => ({
          label: `Buy ${ITEMS[id].name}`, right: `$${ITEMS[id].price}`, disabled: G.data.money < ITEMS[id].price,
          pick: () => { G.data.money -= ITEMS[id].price; addItem(id); Sound.sfx('coin'); return 'stay'; },
        }));
        list.push({ label: 'Sell items...', pick: () => { setTimeout(sellMenu, 0); return 'close'; } });
        list.push({ label: 'Leave', pick: () => 'close' });
        return list;
      },
    });
  }
  function sellMenu() {
    UI.menu({
      title: `Sell to ${who('shopkeep', 'Martha')}`,
      sub: () => `You have $${G.data.money}`,
      build: () => {
        const list = Object.keys(G.data.inv).filter(id => ITEMS[id].sell).map(id => ({
          label: `${ITEMS[id].name} x${G.data.inv[id]}`, right: `$${ITEMS[id].sell}`,
          pick: () => { takeItem(id); G.data.money += ITEMS[id].sell; Sound.sfx('coin'); return 'stay'; },
        }));
        if (!list.length) list.push({ note: 'Nothing to sell.' });
        list.push({ label: 'Back to buying', pick: () => { setTimeout(storeMenu, 0); return 'close'; } });
        list.push({ label: 'Leave', pick: () => 'close' });
        return list;
      },
    });
  }
  function saloonMenu(b) {
    UI.menu({
      title: G.interior ? G.interior.building.label : 'Saloon & Hotel',
      sub: () => `${who('bartender', 'Gus')} wipes a glass. "Room or a meal, Sheriff?"  ·  You have $${G.data.money}`,
      build: () => [
        { label: 'Rent a room & sleep (saves)', right: '$3', disabled: G.data.money < 3,
          pick: () => { G.data.money -= 3; sleep('the Saloon & Hotel', b.doorWorld); return 'close'; } },
        { label: 'Hot meal (+60 food)', right: '$4', disabled: G.data.money < 4,
          pick: () => { G.data.money -= 4; G.data.hunger = Math.min(100, G.data.hunger + 60); Sound.sfx('eat'); return 'stay'; } },
        { label: `Talk to ${who('bartender', 'Gus')}`, pick: () => {
          const c = G.interior.building.cast, talk = c && c.bartender && c.bartender.talk;
          setTimeout(() => UI.dialogue(talk || [
            ['Gus (Bartender)', "Jack drank here last night. Paid in silver dollars and grinned the whole time."],
            ['Gus (Bartender)', "Said somethin' about a hideout up in the snowy peaks. Long way off, Sheriff."],
          ]), 0);
          return 'close';
        } },
        { note: 'Saloon brawls for prize money: coming in a later update.' },
        { label: 'Leave', pick: () => 'close' },
      ],
    });
  }
  function stableMenu() {
    const d = G.data;
    UI.menu({
      title: `${who('stablehand', 'Pete')}'s Stable`,
      sub: () => `Pete: "Few good animals left after the drive. Pick one."  ·  You have $${d.money}`,
      build: () => {
        const trade = d.horse ? Math.floor(Horses.TYPES[d.horse.type].price / 2) : 0;
        const list = [];
        if (d.horse) list.push({ note: `Trading in ${d.horse.name} takes $${trade} off.` });
        for (const t in Horses.TYPES) {
          const T = Horses.TYPES[t], cost = Math.max(0, T.price - trade);
          const own = d.horse && d.horse.type === t;
          list.push({ label: `${T.name}: ${T.desc}`, right: own ? 'yours' : `$${cost}`, disabled: own || d.money < cost,
            pick: () => { setTimeout(() => buyHorse(t, cost), 0); return 'close'; } });
        }
        list.push({ label: 'Feed & brush your horse', right: '$2', disabled: !d.horse || d.money < 2 || d.horse.hunger >= 100,
          pick: () => { d.money -= 2; d.horse.hunger = 100; Sound.sfx('coin'); return 'stay'; } });
        list.push({ label: `Buy ${ITEMS.horsefeed.name}`, right: `$${ITEMS.horsefeed.price}`, disabled: d.money < ITEMS.horsefeed.price,
          pick: () => { d.money -= ITEMS.horsefeed.price; addItem('horsefeed'); Sound.sfx('coin'); return 'stay'; } });
        list.push({ label: 'Leave', pick: () => 'close' });
        return list;
      },
    });
  }
  const HORSE_NAMES = ['Biscuit', 'Dusty', 'Whiskey', 'Clementine', 'Buck', 'Rosie', 'Thunder', 'Pepper', 'Shiloh', 'Duke'];
  function buyHorse(type, cost) {
    const d = G.data;
    const old = d.horse;
    UI.askText({
      title: 'Name your horse', sub: `Your new ${Horses.TYPES[type].name}.`, value: U.pick(Math.random, HORSE_NAMES),
      onDone: name => {
        d.money -= cost;
        Sound.sfx('coin');
        const stable = World.BUILDINGS.find(b => (b.room || b.id) === 'stable');
        d.horse = { type, name: name || 'Horse', hunger: 100, x: stable.doorWorld + 40, face: 1 };
        makeHorse();
        UI.dialogue([
          [who('stablehand', 'Pete'), old ? `I'll look after ${old.name}. ${d.horse.name}'s waitin' out front, saddled up.` : `${d.horse.name}'s waitin' out front, saddled up. Treat 'em right.`],
          [who('stablehand', 'Pete'), `Press ${keyName('H', 'HORSE')} to climb on or off. If you leave 'em behind, ${keyName('H', 'HORSE')} whistles 'em over.`],
          [who('stablehand', 'Pete'), "Keep some horse feed in your bag. A hungry horse slows to a crawl."],
        ]);
      },
    });
  }
  function roomAction(act) {
    const I = G.interior, b = I.building;
    if (act === 'desk') UI.dialogue([[null, 'Reports, unpaid fines and a half-eaten biscuit. Nothing about where Jack went.']]);
    else if (act === 'poster') UI.dialogue([
      [null, 'WANTED: "SILVER" JACK CALLOWAY. Bank robbery. Former Pinkerton detective.'],
      [null, 'Tall, wiry, black duster, flat black hat. Silver front tooth. Fights dirty. $500 REWARD.'],
    ]);
    else if (act === 'cot') sleep("the Sheriff's Office", b.doorWorld);
    else if (act === 'shop') storeMenu();
    else if (act === 'bar' || act === 'stairs') saloonMenu(b);
    else if (act === 'piano') { Sound.sfx('piano'); UI.toast(`You plink out a few notes. ${who('singer', 'Miss Lila')} winces politely.`, 2); }
    else if (act === 'vault') UI.dialogue(b.id === 'bank'
      ? [[null, 'The vault door hangs wide open. Not a single dollar left inside.'], [null, 'Silver scratches on the floor... Jack dragged the strongbox out the back.']]
      : [[null, 'Silver bars stacked to the ceiling, each stamped and weighed.'], [null, 'The assayer watches you like a hawk the whole time.']]);
    else if (act === 'horses') stableMenu();
    else if (act === 'doctor') doctorMenu();
    else if (act === 'smith') smithMenu();
    else if (act === 'post') UI.dialogue([
      ['Mr. Pike (Postmaster)', 'Telegram came in for you this mornin\', Sheriff. From the marshal over in Canyon Town.'],
      ['Mr. Pike (Postmaster)', '"RIDER IN BLACK DUSTER SEEN HEADING FOR CANYON PASS STOP SILVER TOOTH STOP SEND HELP STOP"'],
    ]);
    else if (act === 'pray') {
      if (G.data.flags.prayedDay === day()) UI.toast('You\'ve already prayed today. The pews are quiet.');
      else { G.data.flags.prayedDay = day(); G.data.energy = Math.min(100, G.data.energy + 25); Sound.sfx('perfect'); UI.toast('You kneel a while. You feel rested. (+25 rest)'); }
    }
  }

  function doctorMenu() {
    const d = G.data;
    UI.menu({
      title: `${who('doc', 'Doc Halloway')}'s`, sub: () => `"Let's have a look at you, Sheriff."  ·  You have $${d.money}`,
      build: () => [
        { label: 'Patch me up (full health)', right: '$5', disabled: d.money < 5 || d.hp >= 100, pick: () => { d.money -= 5; d.hp = 100; Sound.sfx('perfect'); return 'stay'; } },
        { label: `Buy ${ITEMS.bandage.name}`, right: `$${ITEMS.bandage.price}`, disabled: d.money < ITEMS.bandage.price, pick: () => { d.money -= ITEMS.bandage.price; addItem('bandage'); Sound.sfx('coin'); return 'stay'; } },
        { label: 'Leave', pick: () => 'close' },
      ],
    });
  }
  function smithMenu() {
    const d = G.data;
    UI.menu({
      title: "Hank's Forge", sub: () => `Hank wipes soot off his hands. "What'll it be?"  ·  You have $${d.money}`,
      build: () => {
        const g = GLOVES[1], list = [];
        if ((d.gloves || 0) < 1) list.push({ label: `${g.name} (+punch, +block)`, right: `$${g.price}`, disabled: d.money < g.price,
          pick: () => { d.money -= g.price; d.gloves = 1; Sound.sfx('coin'); UI.toast('You pull on the Leather Gloves. Punches hit harder.'); return 'stay'; } });
        else list.push({ note: 'You\'re already wearing the best gloves Hank makes.' });
        list.push({ label: 'Leave', pick: () => 'close' });
        return list;
      },
    });
  }

  function campMenu() {
    const night = hour() >= 18 || hour() < 5;
    UI.menu({
      title: 'Campfire',
      sub: 'The fire crackles. Coyotes keep their distance.',
      build: () => {
        const list = [
          { label: night ? 'Sleep until morning (saves)' : 'Sleep 6 hours (saves)', pick: () => { sleep('your campfire', G.data.campfire); return 'close'; } },
        ];
        Object.keys(G.data.inv).filter(id => ITEMS[id].food).forEach(id => {
          list.push({ label: `Eat ${ITEMS[id].name} x${G.data.inv[id]}`, right: `+${ITEMS[id].food}`, pick: () => { eat(id); return 'stay'; } });
        });
        list.push({ label: 'Put out the fire', pick: () => { G.data.campfire = null; return 'close'; } });
        list.push({ label: 'Leave', pick: () => 'close' });
        return list;
      },
    });
  }
  function makeCamp() {
    if (G.scene !== 'world') { UI.toast("You can't make a fire indoors."); return; }
    if (G.biome && G.biome.town) { UI.toast("You're in town. Sleep at the saloon or the sheriff's office."); return; }
    if (G.enemies.some(e => e.alive && e.state !== 'idle' && Math.abs(e.x - G.player.x) < 150)) { UI.toast('Not with danger this close!'); return; }
    G.data.campfire = Math.round(G.player.x + G.player.face * 16);
    Sound.sfx('fire');
    campMenu();
  }

  // ---------------------------------------------------------- interactions
  function interactables() {
    const list = [];
    if (G.scene === 'interior') {
      const I = G.interior;
      list.push({ x: I.door, r: 18, label: 'Leave', act: () => leaveInterior() });
      I.containers.forEach(c => {
        const done = (G.data.looted[I.house.id] || []).includes(c.idx);
        list.push({ x: c.x + c.w / 2, r: 16, label: done ? `(searched)` : `Search ${c.type}`, done, box: [c.x, Rooms.FLOOR + 2 - c.h, c.w, c.h], act: () => !done && startSearch(c) });
      });
      I.objects.forEach(o => list.push({ x: o.x, r: o.r, label: o.label, box: [o.x - o.r, 60, o.r * 2, 100], act: () => roomAction(o.act) }));
      I.people.forEach(n => { if (n.lines) list.push({ x: n.x, r: 16, label: `Talk to ${n.name}`, box: [n.x - 10, n.y - 62, 20, 62], act: () => talk(n) }); });
      return list;
    }
    World.BUILDINGS.forEach(b => list.push({
      x: b.doorWorld, r: 18, label: (b.room || b.id) === 'bank' || (b.room || b.id) === 'stable' ? `Visit the ${b.label}` : `Enter ${b.label}`,
      box: [b.x, 153 - b.img.height, b.img.width, b.img.height], act: () => enterBuilding(b),
    }));
    World.HOUSES.forEach(h => list.push({
      x: h.doorWorld, r: 18, label: `Enter ${h.name}`, box: [h.x, 154 - h.img.height, h.img.width, h.img.height], act: () => enterHouse(h),
    }));
    G.npcs.forEach(n => n.present !== false && list.push({ x: n.x, r: 20, label: `Talk to ${n.name}`, box: [n.x - 10, GROUND - 62, 20, 62], act: () => talk(n) }));
    if (G.horse && !G.player.mounted) list.push({ x: G.horse.x, r: 22, label: `Ride ${G.data.horse.name}`, box: [G.horse.x - 38, GROUND - 62, 76, 62], act: mount });
    if (G.data.campfire !== null) list.push({ x: G.data.campfire, r: 20, label: 'Rest at campfire', box: [G.data.campfire - 10, GROUND - 20, 20, 20], act: campMenu });
    World.EXITS.forEach(e => list.push({ x: e.x, r: 24, label: e.label, box: [e.x - 24, 44, 48, 110], act: () => travel(e) }));
    list.push({ x: World.END - 40, r: 40, label: World.blockedEnd ? 'Look at the rockslide' : 'Look ahead', act: () => UI.dialogue(World.endLines) });
    return list;
  }

  function talk(n) {
    n.said = (n.said || 0);
    const lines = n.lines[n.said % n.lines.length];
    n.said++;
    UI.dialogue(lines.map(t => [n.name, t]));
  }

  function enterBuilding(b) {
    if (b.closed) { UI.dialogue(b.closed); return; }
    const key = 'town:' + b.id;
    const room = G.interiorCache[key] || (G.interiorCache[key] = Rooms.buildTown(b));
    enterInterior(room, b.doorWorld, b.label);
  }

  function enterHouse(h) {
    const room = G.interiorCache[h.id] || (G.interiorCache[h.id] = Rooms.buildAbandoned(h));
    enterInterior(room, h.doorWorld, h.name, () => {
      if (G.data.cleared[h.id]) return;
      const r = U.rng(h.seed * 31 + day());
      const roll = r();
      if (roll < 0.3) G.enemies.push(new Enemy('snake', 150 + r() * 120));
      else if (roll < 0.45) G.enemies.push(new Enemy('outlaw', 200 + r() * 80));
      else G.data.cleared[h.id] = true;
    });
  }

  function enterInterior(room, doorWorld, name, onEnter) {
    dismount(true);
    Sound.sfx('door');
    UI.fade(true);
    setTimeout(() => {
      if (!room.people) room.people = room.npcs.map(n => new NPC(n));
      room.doorWorld = doorWorld;
      G.interior = room;
      G.scene = 'interior';
      G.worldEnemies = G.enemies;
      G.enemies = [];
      G.pickups = [];
      G.player.x = 30; G.player.face = 1; G.player.vx = 0;
      G.camX = 0;
      if (onEnter) onEnter();
      UI.place(name);
      UI.fade(false);
    }, 450);
  }

  function leaveInterior(instant) {
    const I = G.interior;
    const go = () => {
      G.scene = 'world';
      G.enemies = G.worldEnemies || [];
      G.pickups = [];
      G.player.x = I.doorWorld; G.player.vx = 0;
      G.interior = null;
      G.camX = U.clamp(G.player.x - W / 2, 0, World.END + 120 - W);
    };
    if (instant) { go(); return; }
    Sound.sfx('doorClose');
    UI.fade(true);
    setTimeout(() => { go(); save(); UI.fade(false); }, 450);
  }

  // ---------------------------------------------------------------- horses
  function makeHorse() {
    const h = G.data.horse;
    G.horse = h ? { type: h.type, x: h.x, face: h.face || 1, vx: 0, animT: 0, follow: false } : null;
    if (G.player) G.player.mounted = false;
  }
  G.horseSpeed = () => {
    const h = G.data.horse;
    return Horses.TYPES[h.type].speed * (h.hunger <= 0 ? 0.5 : 1);
  };
  function mount() {
    if (!G.horse || G.scene !== 'world') return;
    G.player.mounted = true;
    G.player.x = G.horse.x; G.player.face = G.horse.face;
    G.horse.follow = false;
    Sound.sfx('jump');
    if (!G.data.flags.tutRide) {
      G.data.flags.tutRide = true;
      UI.toast(`Riding ${G.data.horse.name}. Hold ${keyName('Shift', 'RUN')} to gallop. No jumping or fighting in the saddle.`, 5);
    }
  }
  function dismount(quiet) {
    if (!G.player || !G.player.mounted) return;
    G.player.mounted = false;
    if (G.horse) { G.horse.x = G.player.x - G.player.face * 6; G.horse.vx = 0; }
    if (!quiet) Sound.sfx('land');
  }
  function horseKey() {
    if (!G.horse) { UI.toast("You don't have a horse yet. Pete at the stable sells them.", 2.5); return; }
    if (G.scene !== 'world') return;
    if (G.player.mounted) { dismount(); return; }
    const dist = Math.abs(G.horse.x - G.player.x);
    if (dist < 30) { mount(); return; }
    Sound.sfx('select');
    UI.toast(`You whistle for ${G.data.horse.name}.`, 1.5);
    if (Math.abs(G.horse.x - G.player.x) > 420) G.horse.x = G.player.x + (G.horse.x < G.player.x ? -300 : 300);
    G.horse.follow = true;
  }
  function horseUpdate(dt) {
    const h = G.horse, d = G.data;
    if (!h) return;
    const p = G.player;
    if (G.scene === 'world') {
      if (p.mounted) { h.x = p.x; h.face = p.face; h.vx = p.vx; }
      else if (h.follow) {
        const tx = p.x - p.face * 34, dx = tx - h.x;
        if (Math.abs(dx) > 8) { h.vx = Math.sign(dx) * Math.min(160, 40 + Math.abs(dx) * 1.5); h.face = Math.sign(dx); }
        else { h.vx = 0; h.follow = false; }
        h.x += h.vx * dt;
      } else h.vx = 0;
      const before = Math.floor(h.animT / 2);
      h.animT += dt * Math.abs(h.vx) / 11;
      if (Math.floor(h.animT / 2) !== before && Math.abs(h.vx) > 4) Sound.sfx('hoof');
      d.horse.x = Math.round(h.x); d.horse.face = h.face;
    }
    const hrs = dt * TIME_SCALE / 60;
    const rate = p.mounted ? (Math.abs(h.vx) > 100 ? 7 : 4) : 1.5;
    const was = d.horse.hunger;
    d.horse.hunger = Math.max(0, d.horse.hunger - rate * hrs);
    if (was > 20 && d.horse.hunger <= 20) UI.toast(`${d.horse.name} is getting hungry. Feed them horse feed from your bag.`);
    if (was > 0 && d.horse.hunger <= 0) UI.toast(`${d.horse.name} is starving and can barely trot.`);
  }

  function startSearch(c) {
    G.searching = { c, t: 0, dur: 0.8 };
    Sound.sfx(c.type === 'trunk' || c.type === 'offering' ? 'latch' : 'search');
  }
  function finishSearch(c) {
    const h = G.interior.house;
    (G.data.looted[h.id] = G.data.looted[h.id] || []).push(c.idx);
    const r = U.rng(U.hash(h.id + ':' + c.idx));
    const found = [];
    const n = r() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const k = U.weighted(r, LOOT_TABLE);
      if (k === 'nothing') continue;
      if (k === 'money') { const m = 2 + Math.floor(r() * 8); G.data.money += m; found.push('$' + m); }
      else { addItem(k); found.push(ITEMS[k].name); }
    }
    if (found.length) { Sound.sfx('pickup'); UI.toast('Found: ' + found.join(', ')); }
    else UI.toast(U.pick(Math.random, ['Just dust and cobwebs.', 'Nothing but mouse droppings.', 'Empty. Someone beat you to it.']));
  }

  // ---------------------------------------------------------------- spawns
  function spawning(dt) {
    if (G.scene !== 'world' || !G.biome || G.biome.town) return;
    const p = G.player, d = G.data, today = day();
    // fixed enemies come back each new day
    const hard = G.biome.hard;
    World.FIXED_ENEMIES.forEach((f, n) => {
      const i = World.zone === 'road' ? n : World.zone + ':' + n;
      if (Math.abs(f.x - p.x) > 360 || d.fixedKilled[i] === today) return;
      if (G.enemies.some(e => e.fixedId === i)) return;
      if (f.type === 'coyote' && !G.isNight()) return;
      G.enemies.push(new Enemy(f.type, f.x, { fixedId: i, tough: hard }));
    });
    // random wanderers, more at night
    G.spawnT -= dt;
    if (G.spawnT > 0) return;
    const night = G.isNight();
    // the canyon is harder: enemies turn up more often, more at once, and hit harder
    G.spawnT = (hard ? (night ? 6 : 10) : (night ? 9 : 16)) + Math.random() * (hard ? 6 : 10);
    const alive = G.enemies.filter(e => e.alive && e.fixedId === undefined).length;
    if (alive >= (night ? 3 : 1) + (hard ? 1 : 0)) return;
    const type = night ? U.weighted(Math.random, { coyote: 6, outlaw: 3, snake: 1 }) : U.weighted(Math.random, { snake: 5, outlaw: 3 });
    const dir = Math.random() < 0.7 ? p.face : -p.face;
    const x = p.x + dir * (190 + Math.random() * 40);
    if (x < World.TOWN_END + 150 || x > World.END - 80) return;
    if (G.campfireNear(x, 120)) return;
    G.enemies.push(new Enemy(type, x, { tough: hard }));
  }

  // ------------------------------------------------------------ rockfalls
  // In the canyon, rocks break off the cliffs now and then: pebbles trickle
  // down and a shadow grows on the ground for a second, then the rock lands.
  const ROCK_IMG = (() => {
    const p = U.pix(9, 8), col = [176, 92, 60];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) {
      if (((x - 4) / 4.5) ** 2 + ((y - 4) / 4) ** 2 > 1) continue;
      p.put(x, y, y < 2 ? [214, 130, 88] : x > 5 ? [130, 66, 44] : col);
    }
    Props.outline(p, [40, 22, 18]);
    return U.dbl(p.done());
  })();
  let rockT = 8;
  function rockfalls(dt) {
    const p = G.player;
    if (G.scene === 'world' && G.biome && G.biome.hard && !p.dead) {
      rockT -= dt;
      if (rockT <= 0) {
        rockT = 9 + Math.random() * 10;
        const x = U.snap(p.x + (Math.random() < 0.6 ? p.face : -p.face) * (20 + Math.random() * 90));
        G.rocks.push({ x, y: -20, vy: 0, warn: 1.1, landed: false, rest: 0 });
        Sound.sfx('land');
      }
    }
    for (const k of G.rocks) {
      if (k.warn > 0) {
        k.warn -= dt;
        if (Math.random() < dt * 14) G.particles.push({ x: k.x + (Math.random() - 0.5) * 10, y: 20 + Math.random() * 30, vx: 0, vy: 80, life: 0.5, col: '#b06a44' });
        continue;
      }
      if (k.landed) { k.rest -= dt; continue; }
      k.vy += 700 * dt; k.y += k.vy * dt;
      if (k.y >= GROUND - 14) {
        k.y = GROUND - 14; k.landed = true; k.rest = 2.5;
        G.shake(4); Sound.sfx('ko'); G.dust(k.x, GROUND, 10);
        if (Math.abs(p.x - k.x) < 18 && p.y > GROUND - 50 && p.invuln <= 0) {
          Sound.sfx('hurt');
          p.invuln = 0.8; p.flashT = 0.15;
          p.vx = Math.sign(p.x - k.x || 1) * 90; p.vy = -70; p.onGround = false;
          G.damage(14);
          UI.toast('Rockfall! Watch for falling pebbles and the shadow.', 3);
        }
        for (const e of G.enemies) if (e.alive && Math.abs(e.x - k.x) < 18) e.hit(20, k.x);
      }
    }
    G.rocks = G.rocks.filter(k => !(k.landed && k.rest <= 0));
  }
  function drawRocks(c, camX) {
    for (const k of G.rocks) {
      const x = U.snap(k.x - camX);
      if (k.warn > 0 || k.y < GROUND - 14) {
        // shadow grows as the rock gets close
        const t = k.warn > 0 ? 1 - k.warn / 1.1 : 1;
        const w = U.snap(6 + t * 14);
        c.fillStyle = `rgba(40,20,14,${(0.25 + t * 0.35).toFixed(2)})`;
        c.fillRect(x - w / 2, GROUND - 2, w, 4);
      }
      if (k.warn <= 0) {
        if (k.landed && k.rest < 0.6 && Math.floor(k.rest * 10) % 2 === 0) continue;
        c.drawImage(ROCK_IMG, x - 9, U.snap(k.y) - 2);
      }
    }
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    const d = G.data, p = G.player;

    // hotkeys
    if (Input.pressed('mute')) UI.toast(Sound.toggleMute() ? 'Sound off' : 'Sound on', 1.2);
    if (!p.dead && !G.searching) {
      if (Input.pressed('pause')) { pauseMenu(); return; }
      if (Input.pressed('bag')) { inventoryMenu(); return; }
      if (Input.pressed('camp')) { if (p.mounted) dismount(true); makeCamp(); return; }
      if (Input.pressed('horse')) horseKey();
      if (p.mounted && Input.pressed('punch') && !d.flags.tutNoFight) { d.flags.tutNoFight = true; UI.toast(`Get off your horse (${keyName('H', 'HORSE')}) to fight.`); }
    }

    // clock + survival
    const mins = dt * TIME_SCALE;
    const prevDay = day();
    d.time += mins;
    d.playSeconds += dt;
    if (day() !== prevDay) UI.toast(`Day ${day()} begins.`);
    const hrs = mins / 60, h = hour();
    const heat = G.scene === 'world' && G.biome && G.biome.heat && h > 9 && h < 18 ? 1.5 : 1;
    const run = p.running && !p.mounted ? 1.4 : 1;
    const wasHungry = d.hunger <= 25, wasTired = d.energy <= 20;
    d.hunger = Math.max(0, d.hunger - HUNGER_PER_HOUR * heat * run * hrs);
    d.energy = Math.max(0, d.energy - ENERGY_PER_HOUR * run * hrs);
    if (!wasHungry && d.hunger <= 25) UI.toast(`You're getting hungry. Eat something (${keyName('I', 'BAG')}).`);
    if (!wasTired && d.energy <= 20) UI.toast(`You're worn out. Sleep at a campfire (${keyName('C', 'CAMP')}) or in town.`);
    if (d.hunger <= 0) d.hp = Math.max(0, d.hp - 6 * hrs);
    if (d.hp <= 0 && !p.dead) die();

    // player
    const searching = G.searching;
    const bounds = G.scene === 'interior' ? [20, G.interior.w - 14] : [14, World.END - 50];
    p.update(dt, !searching && !p.dead, bounds);
    horseUpdate(dt);
    if (searching) {
      searching.t += dt;
      if (searching.t >= searching.dur) { G.searching = null; finishSearch(searching.c); }
    }

    // biome / place changes
    if (G.scene === 'world') {
      const b = World.biomeAt(p.x);
      if (b !== G.biome) {
        if (G.biome) UI.place(b.name);
        G.biome = b;
      }
    }

    // interaction
    let target = null;
    if (!p.dead && !searching && p.onGround) {
      let best = 1e9;
      for (const it of interactables()) {
        const dist = Math.abs(it.x - p.x);
        if (dist < it.r && dist < best) { best = dist; target = it; }
      }
    }
    UI.prompt(target ? `<b>${keyName('[E]', '[USE]')}</b> ${target.label}` : null);
    if (target && Input.pressed('use') && !target.done) target.act();
    if (G.scene === 'interior') for (const n of G.interior.people) n.update(dt, p);

    // clicks / taps on things in the world
    const click = Input.takeClick();
    if (click && !p.dead && !searching) {
      const wx = click.x + G.camX;
      const hitIt = interactables().find(it => it.box && wx >= it.box[0] && wx <= it.box[0] + it.box[2] && click.y >= it.box[1] && click.y <= it.box[1] + it.box[3]);
      if (hitIt) {
        if (Math.abs(hitIt.x - p.x) < Math.max(hitIt.r, 40)) { if (!hitIt.done) hitIt.act(); }
        else UI.toast('Walk closer first.', 1.2);
      }
    }

    // enemies
    for (const e of G.enemies) e.update(dt, p);
    G.enemies = G.enemies.filter(e => (e.alive || e.deadT > 0) && (e.fixedId !== undefined || Math.abs(e.x - p.x) < 480));
    spawning(dt);
    rockfalls(dt);
    if (G.scene === 'world') { for (const n of G.npcs) if (n.present !== false) n.update(dt, p); Town.update(dt, G, hour()); }

    // pickups
    for (const k of G.pickups) {
      k.t += dt;
      if (Math.abs(k.x - p.x) < 12 && k.t > 0.4) {
        k.taken = true;
        if (k.id === 'money') { d.money += k.n; Sound.sfx('coin'); G.floater(k.x, GROUND - 20, `+$${k.n}`, '#f2c94c'); }
        else { addItem(k.id, k.n); Sound.sfx('pickup'); G.floater(k.x, GROUND - 20, ITEMS[k.id].name, '#ffffff'); }
      }
    }
    G.pickups = G.pickups.filter(k => !k.taken);

    // tumbleweeds roll by in the desert
    if (G.scene === 'world' && G.biome && !G.biome.town && Math.random() < dt * 0.05 && G.tumbleweeds.length < 2) {
      G.tumbleweeds.push({ x: G.camX - 20, y: GROUND - 6, vy: 0, rot: 0, vx: 40 + Math.random() * 40 });
    }
    for (const t of G.tumbleweeds) {
      t.x += t.vx * dt; t.rot += t.vx * dt * 0.1; t.vy += 300 * dt; t.y += t.vy * dt;
      if (t.y > GROUND - 6) { t.y = GROUND - 6; t.vy = -60 - Math.random() * 60; }
    }
    G.tumbleweeds = G.tumbleweeds.filter(t => t.x < G.camX + W + 30 && G.scene === 'world');

    // camera
    if (G.scene === 'world') {
      const target = U.clamp(p.x - W / 2 + p.face * 30, 0, World.END + 120 - W);
      G.camX = U.lerp(G.camX, target, Math.min(1, dt * 4));
    } else G.camX = U.clamp(U.lerp(G.camX, p.x - W / 2, Math.min(1, dt * 5)), 0, Math.max(0, G.interior.w - W));

    // music
    const danger = G.enemies.some(e => e.alive && e.state !== 'idle' && Math.abs(e.x - p.x) < 170);
    const I = G.scene === 'interior' ? G.interior : null;
    let song;
    if (p.dead) song = 'death';
    else if (danger) song = 'fight';
    else if (I && I.kind === 'town' && (I.building.room || I.building.id) === 'saloon') song = 'saloon';
    else if (I && I.kind === 'house') song = 'house';
    else if (I || (G.biome && G.biome.town)) song = 'town';
    else song = G.isNight() ? 'night' : G.biome && G.biome.music === 'canyon' ? 'canyon' : 'desert';
    Sound.play(song);
    Sound.musicVolume(I && I.kind === 'town' && song === 'town' ? 0.45 : 1);

    // occasional coyote howl at night
    if (G.isNight() && G.scene === 'world' && Math.random() < dt * 0.02) Sound.sfx('howl');

    // autosave
    G.saveT += dt;
    if (G.saveT > 30) { G.saveT = 0; save(); }
  }

  function effects(dt) {
    for (const q of G.particles) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 120 * dt; q.life -= dt; }
    G.particles = G.particles.filter(q => q.life > 0);
    for (const f of G.floaters) { f.y -= 18 * dt; f.life -= dt; }
    G.floaters = G.floaters.filter(f => f.life > 0);
    if (G.shakeT > 0) G.shakeT -= dt;
  }

  // ---------------------------------------------------------------- render
  function drawWorld(c, camX, withPlayer) {
    BG.drawLayers(c, (World.biomeAt(camX + W / 2) || {}).bg || 'desert', camX);
    const vis = (x, w) => x + w > camX - 10 && x < camX + W + 10;
    // rockslide closing the road
    if (World.blockedEnd && vis(World.END - 110, 140)) c.drawImage(World.rockslide, Math.round(World.END - 110 - camX), 164 - World.rockslide.height);
    const lit = G.data && BG.night(hour()) > 0.3;
    for (const p of World.PROPS) {
      if (!p.back || !vis(p.x, p.img.width)) continue;
      const img = p.windmill ? Town.millFrames[Math.floor(Math.max(0, G.clock) * 6) % Town.millFrames.length] : p.img;
      c.drawImage(img, Math.round(p.x - camX), p.base - img.height);
    }
    for (const b of World.BUILDINGS) {
      if (!vis(b.x, b.img.width)) continue;
      const bx = Math.round(b.x - camX), by = 154 - b.img.height;
      c.drawImage(b.img, bx, by);
      if (lit) {
        // lamplight in the windows after dark
        c.fillStyle = '#f2b45a';
        for (const w of b.wins) c.fillRect(bx + w.r[0], by + w.r[1], w.r[2], w.r[3]);
        c.fillStyle = '#ffd98a';
        for (const w of b.wins) c.fillRect(bx + w.r[0] + 4, by + w.r[1] + 4, Math.max(2, w.r[2] - 10), Math.max(2, w.r[3] - 10));
      }
    }
    for (const h of World.HOUSES) if (vis(h.x, h.img.width)) c.drawImage(h.img, Math.round(h.x - camX), 154 - h.img.height);
    for (const p of World.PROPS) if (!p.front && !p.back && vis(p.x, p.img.width)) c.drawImage(p.img, Math.round(p.x - camX), p.base - p.img.height);
    Town.drawSmoke(c, camX);
    for (const hh of World.HITCHED) if (vis(hh.x - 32, 64)) Horses.draw(c, { type: hh.type, face: hh.face, vx: 0, animT: 0 }, hh.x - camX, false, GROUND - 4);
    if (!withPlayer) return;
    if (G.data.campfire !== null && vis(G.data.campfire - 12, 24)) drawCampfire(c, G.data.campfire - camX, G.clock);
    for (const t of G.tumbleweeds) {
      const f = tumbleFrames[((Math.floor(t.rot / (Math.PI / 4)) % 8) + 8) % 8];
      c.drawImage(f, U.snap(t.x - camX) - 8, U.snap(t.y) - 8);
    }
  }
  // the tumbleweed is pre-rotated into 8 chunky frames (rotating at draw time would break the pixel grid)
  const tumbleFrames = (() => {
    const src = Props.tumbleweed(), out = [];
    for (let i = 0; i < 8; i++) {
      const c = U.canvas(16, 16), x = c.getContext('2d');
      x.translate(8, 8); x.rotate(i * Math.PI / 4); x.drawImage(src, -7, -7);
      out.push(U.chunky(c));
    }
    return out;
  })();

  function drawPickups(c, camX) {
    for (const k of G.pickups) {
      const x = U.snap(k.x - camX), y = GROUND - 4 - U.snap(Math.abs(Math.sin(k.t * 4)) * 4);
      if (k.id === 'money') {
        c.fillStyle = '#3a2416'; c.fillRect(x - 4, y - 6, 8, 8);
        c.fillStyle = '#f2c94c'; c.fillRect(x - 2, y - 6, 4, 8); c.fillRect(x - 4, y - 4, 8, 4);
        c.fillStyle = '#fff3b0'; c.fillRect(x - 2, y - 4, 2, 2);
      } else {
        c.fillStyle = '#3a2416'; c.fillRect(x - 6, y - 8, 12, 10);
        c.fillStyle = '#a77b4a'; c.fillRect(x - 4, y - 6, 8, 6);
        c.fillStyle = '#d8b080'; c.fillRect(x - 2, y - 10, 4, 2);
      }
    }
  }

  function render() {
    const d = G.data;
    const hr = d ? hour() : 18.6;
    const camX = U.snap(G.camX);

    // sky straight onto the screen
    const inside = G.state !== 'title' && G.scene === 'interior';
    BG.drawSky(ctx, hr, inside ? G.interior.doorWorld : camX);
    if (inside) {
      // the view out of the doorway and windows: the desert outside, lit for
      // the hour, moving with the room so it looks like it's really out there
      BG.drawLayers(ctx, (World.biomeAt(G.interior.doorWorld) || {}).bg || 'desert', G.interior.doorWorld - 40 + camX);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = U.rgb(BG.light(hr));
      ctx.fillRect(0, 60, W, H - 60);
      ctx.globalCompositeOperation = 'source-over';
    }

    // everything else onto `layer`, lit by `light`, then composited
    lctx.clearRect(0, 0, W, H);
    lctx.save();
    if (G.shakeT > 0) lctx.translate(Math.round((Math.random() - 0.5) * G.shakeMag * 2), Math.round((Math.random() - 0.5) * G.shakeMag));

    if (G.state === 'title') {
      drawWorld(lctx, camX, false);
    } else if (G.scene === 'interior') {
      const I = G.interior;
      lctx.drawImage(I.img, -Math.round(camX), 0);
      if (I.kind === 'house') {
        const looted = d.looted[I.house.id] || [];
        for (const c of I.containers) {
          const img = looted.includes(c.idx) ? c.art.open : c.art.closed;
          lctx.drawImage(img, U.snap(c.x - camX), Rooms.FLOOR + 2 - img.height);
        }
      }
      if (I.stalls) I.stalls.forEach((sx, i) => Horses.draw(lctx, { type: ['mule', 'bay', 'stallion'][i], face: -1, vx: 0, animT: 0, saddle: false }, sx - camX, false, Rooms.FLOOR + 1));
      for (const n of I.people) n.draw(lctx, camX);
      if (I.fg) lctx.drawImage(I.fg, -Math.round(camX), 0);
    } else {
      drawWorld(lctx, camX, true);
      for (const n of G.npcs) if (n.present !== false) n.draw(lctx, camX);
      for (const cr of G.critters) cr.draw(lctx, camX);
      if (G.horse && !G.player.mounted) Horses.draw(lctx, G.horse, G.horse.x - camX, false);
    }
    if (G.state !== 'title') {
      drawPickups(lctx, camX);
      if (G.scene === 'world') drawRocks(lctx, camX);
      for (const e of G.enemies) e.draw(lctx, camX);
      if (G.player.mounted && G.scene === 'world') Horses.draw(lctx, G.horse, G.player.x - camX, { img: G.player.set.ride.img, hip: G.player.set.rideHip });
      else G.player.draw(lctx, camX);
      if (G.scene === 'world') for (const p of World.PROPS) if (p.front && p.x + p.img.width > camX && p.x < camX + W) lctx.drawImage(p.img, Math.round(p.x - camX), p.base - p.img.height);
      for (const q of G.particles) { lctx.fillStyle = q.col; lctx.fillRect(U.snap(q.x - camX), U.snap(q.y), 2, 2); }
    }
    lctx.restore();

    // lighting
    let amb = BG.light(hr);
    if (G.scene === 'interior' && G.state !== 'title') {
      amb = G.interior.kind === 'town' ? U.lerpColor(U.shade(amb, 0.8), [150, 122, 96], 0.4) : U.lerpColor(U.shade(amb, 0.62), [110, 84, 66], 0.25);
    }
    const nightF = BG.night(hr);
    if (amb.some(v => v < 250)) {
      gctx.globalCompositeOperation = 'source-over';
      gctx.fillStyle = U.rgb(amb);
      gctx.fillRect(0, 0, W, H);
      gctx.globalCompositeOperation = 'lighter';
      const glow = (x, y, r, col, a) => {
        const g = gctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, U.rgb(col, a)); g.addColorStop(1, U.rgb(col, 0));
        gctx.fillStyle = g; gctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      if (G.state !== 'title') {
        const flick = 0.9 + 0.1 * Math.sin(G.clock * 17) * Math.sin(G.clock * 7);
        if (G.scene === 'world') {
          if (nightF > 0) glow(G.player.x - camX, G.player.y - (G.player.mounted ? 46 : 26), 70, [190, 150, 100], 0.85 * nightF);
          if (d.campfire !== null) glow(d.campfire - camX, GROUND - 8, 95 * flick, [255, 170, 90], 0.95);
          for (const b of World.BUILDINGS) {
            if (b.x + b.img.width < camX - 60 || b.x > camX + W + 60) continue;
            const by = 154 - b.img.height;
            if (nightF > 0.3) for (const w of b.wins) glow(b.x + w.r[0] + w.r[2] / 2 - camX, by + w.r[1] + w.r[3] / 2, 26, [230, 170, 90], 0.75 * nightF);
            for (const l of b.lamps) glow(b.x + l.x - camX, by + l.y, l.forge ? 60 : 34, l.forge ? [255, 130, 50] : [255, 200, 110], l.forge ? 0.9 : 0.9 * nightF);
          }
          if (nightF > 0.2) for (const pr of World.PROPS) if (pr.lamp && pr.x > camX - 60 && pr.x < camX + W + 60) glow(pr.x + 6 - camX, pr.base - 48, 48, [255, 206, 120], 0.95 * nightF);
        } else {
          for (const w of G.interior.windows) glow(w.x + w.w / 2 - camX, w.y + w.h, 70, U.lerpColor(BG.light(hr), [255, 255, 255], 0.2), 0.6 * (1 - nightF * 0.8));
          glow(G.player.x - camX, G.player.y - 26, 55, [190, 150, 100], 0.5 + 0.4 * nightF);
          for (const l of G.interior.lights) glow(l.x - camX, l.y, l.r * flick, l.col, 0.85);
        }
      }
      // keep the layer's transparency (so the sky isn't darkened twice)
      mctx.clearRect(0, 0, W, H);
      mctx.drawImage(layer, 0, 0);
      lctx.globalCompositeOperation = 'multiply';
      lctx.drawImage(light, 0, 0);
      lctx.globalCompositeOperation = 'destination-in';
      lctx.drawImage(mask, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
    }
    if (G.scene === 'interior' && G.state !== 'title') {
      // indoors: the window holes show the sky, the rest of the room hides it
      ctx.fillStyle = '#000';
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H);
      for (const w of G.interior.windows) ctx.rect(Math.round(w.x - camX) + w.w, w.y, -w.w, w.h);
      const dr = G.interior.doorRect;
      ctx.rect(Math.round(dr.x - camX) + dr.w, dr.y, -dr.w, dr.h);
      ctx.fill('evenodd');
      ctx.restore();
    }
    ctx.drawImage(layer, 0, 0);

    // readable overlays (not darkened)
    if (G.state !== 'title') {
      if (G.scene === 'world') Town.drawBubbles(ctx, camX);
      for (const f of G.floaters) {
        const x = Math.round(f.x - camX - Font.width(f.text) / 2), y = Math.round(f.y);
        Font.draw(ctx, f.text, x + 1, y + 1, 'rgba(0,0,0,.7)');
        Font.draw(ctx, f.text, x, y, f.col);
      }
      if (G.searching) {
        const p = G.player, x = Math.round(p.x - camX - 12), y = Math.round(p.y - 74);
        ctx.fillStyle = '#1a100c'; ctx.fillRect(x - 1, y - 1, 26, 5);
        ctx.fillStyle = '#f2c94c'; ctx.fillRect(x, y, Math.round(24 * G.searching.t / G.searching.dur), 3);
      }
    }
  }

  // ------------------------------------------------------------------ loop
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    G.clock += dt;

    if (G.state === 'title') {
      UI.customizeTick(dt);
      G.titleCam += dt * 14;
      G.camX = 1300 + (G.titleCam % 4000);
    } else if (G.data && UI.customizeTick(dt)) {
      UI.prompt(null);
    } else if (G.data) {
      const talking = UI.dialogueTick(dt);
      const menu = !talking && UI.menuTick();
      if (G.state === 'cutscene' || G.cutscene) {
        if (!talking) cutsceneUpdate(dt);
        G.player.update(dt, false, [14, World.END - 50]);
        for (const n of G.npcs) if (n !== (G.cutscene && G.cutscene.hollis)) n.update(dt, G.player);
      } else if (!talking && !menu) update(dt);
      else UI.prompt(null);
      effects(dt);
      UI.hud(G.data);
    }
    render();
    Input.endFrame();
    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------------- setup
  function resize() {
    const stage = document.getElementById('stage');
    const w = Math.min(window.innerWidth, window.innerHeight * 16 / 9);
    stage.style.width = Math.floor(w) + 'px';
    stage.style.height = Math.floor(w * 9 / 16) + 'px';
    stage.style.setProperty('--u', (w / 320) + 'px');
    const portrait = window.innerHeight > window.innerWidth;
    document.getElementById('rotate').classList.toggle('hidden', !(portrait && document.body.classList.contains('touch')));
  }

  function enableTouch() {
    if (document.body.classList.contains('touch')) return;
    document.body.classList.add('touch');
    if (G.state === 'play' || G.state === 'cutscene') document.getElementById('touch').classList.remove('hidden');
    resize();
  }

  function boot() {
    World.init();
    Input.bindTouch(document.getElementById('touch'));
    Input.bindScreen(canvas);
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) enableTouch();
    window.addEventListener('touchstart', enableTouch, { once: true, passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    resize();
    G.camX = 1300;
    showTitle();
    requestAnimationFrame(frame);
  }

  G.boot = boot;
  return G;
})();

Game.boot();
