// The maps. Each is one long side-scrolling strip; x is measured in pixels
// from its left end. 'road' runs from Redemption Gulch through the badlands to
// the rockslide; beside the rockslide a trail leads into the 'canyon' map.
// World.use(id) makes a map current: World.END, World.BUILDINGS, ... then
// refer to that map.
const World = (() => {
  const END = 7400;        // the rockslide that closes the badlands road
  const TOWN_END = 1700;
  const TRAIL_X = END - 300;   // the canyon trail, just before the rockslide

  const BIOMES = [
    { id: 'town1', name: 'Redemption Gulch', x0: -1e9, x1: TOWN_END, town: true, bg: 'desert', music: 'town' },
    { id: 'desert', name: 'The Badlands', x0: TOWN_END, x1: 1e9, bg: 'desert', heat: true, music: 'desert' },
  ];

  // Town buildings, left to right. Art comes from Buildings.TOWN[id].
  const BUILDINGS = [
    { id: 'sheriff', label: "Sheriff's Office", x: 20 },
    { id: 'bank', label: 'Bank', x: 172 },
    { id: 'store', label: 'General Store', x: 322 },
    { id: 'doctor', label: "Doctor's Office", x: 492 },
    { id: 'saloon', label: 'Saloon & Hotel', x: 616 },
    { id: 'post', label: 'Post & Telegraph', x: 818 },
    { id: 'blacksmith', label: 'Blacksmith', x: 956 },
    { id: 'church', label: 'Church', x: 1116 },
    { id: 'stable', label: 'Livery Stable', x: 1246 },
  ];

  const HOUSES = [
    { id: 'miller', name: 'Miller Homestead', type: 'farmhouse', x: 1900, seed: 11 },
    { id: 'prospector', name: "Prospector's Shack", type: 'shack', x: 2500, seed: 23 },
    { id: 'adobe', name: 'Adobe Ruin', type: 'adobe', x: 3140, seed: 31 },
    { id: 'barn', name: 'Old Barn', type: 'barn', x: 3760, seed: 37 },
    { id: 'waystation', name: 'Old Way Station', type: 'waystation', x: 4460, seed: 43 },
    { id: 'chapel', name: 'Abandoned Chapel', type: 'chapel', x: 5180, seed: 47 },
    { id: 'farmhouse', name: 'Collapsed Farmhouse', type: 'farmhouse', x: 5860, seed: 51 },
    { id: 'trapper', name: "Trapper's Cabin", type: 'shack', x: 6520, seed: 59 },
  ];

  // Enemies that live at a spot and come back each new day if beaten.
  const FIXED_ENEMIES = [
    { type: 'snake', x: 2180 }, { type: 'outlaw', x: 2800 }, { type: 'snake', x: 3580 },
    { type: 'coyote', x: 4120 }, { type: 'outlaw', x: 4980 }, { type: 'snake', x: 6260 }, { type: 'outlaw', x: 6900 },
  ];

  // Townsfolk out on the street. `hours` = when they're outside;
  // `greet` = what they call out as you walk past.
  const NPCS = [
    { id: 'hollis', kind: 'banker', name: 'Hollis (Banker)', x: 250, face: -1, hours: [6, 20], greet: ['Any sign of Jack?', 'Bring back that money, Sheriff!'], lines: [
      ["Please, Sheriff. That money was the whole town's savings."],
      ['Jack rode west, past the old homesteads. Bring him back!'],
    ] },
    { id: 'tommy', kind: 'kid', name: 'Tommy', x: 420, wander: 60, hours: [8, 19], greet: ['Sheriff! Sheriff!', 'Bang bang! ...Just foolin\'.'], lines: [
      ['Is it true you can knock out a coyote with one punch, Sheriff?'],
      ['Ma says to block when a critter rears back. Then you sock it!'],
      ['Rusty\'s the best dog in the territory. He chased off a rattler once!'],
    ] },
    { id: 'abigail', kind: 'townswoman', name: 'Mrs. Abigail', x: 560, wander: 50, hours: [8, 18], greet: ['Good day, Sheriff.', 'Mind the mud, Sheriff.'], lines: [
      ['Martha got new canned peaches in. Two whole crates!'],
      ['My Henry swears he saw lights out at the old chapel last week. Spirits, or bandits.'],
    ] },
    { id: 'walt', kind: 'townsman', name: 'Walt', x: 780, wander: 40, hours: [7, 21], greet: ['Howdy, Sheriff.', 'Hot one today.'], lines: [
      ["Jack Calloway... used to be a Pinkerton man, you know. Knows every lawman's trick."],
      ["Hungry? Martha at the General Store sells jerky and beans. Gus at the saloon rents rooms."],
    ] },
    { id: 'jesse', kind: 'cowhand', name: 'Jesse (Cowhand)', x: 700, wander: 30, hours: [10, 23], greet: ['Evenin\'.', 'Sheriff.'], lines: [
      ['Lost three head of cattle to coyotes last month. Light a fire at night, they won\'t come near.'],
      ['Hank the blacksmith makes the best brawlin\' gloves you ever saw.'],
    ] },
    { id: 'ezra', kind: 'oldtimer', name: 'Old Ezra', x: 470, face: 1, hours: [9, 17], greet: ['Mornin\'.'], lines: [
      ['I been sittin\' on this porch since \'49. Seen a lot of outlaws come and go.'],
      ['Silver Jack always did love a dramatic exit. He\'ll head somewhere high and cold.'],
    ] },
    { id: 'hank', kind: 'smith', name: 'Hank (Blacksmith)', x: 1030, face: -1, hours: [7, 19], greet: ['Need somethin\' forged?'], smith: true, lines: [
      ['Come on in if you need gloves. I make \'em with iron studs.'],
    ] },
    { id: 'amos', kind: 'preacher', name: 'Preacher Amos', x: 1150, face: 1, hours: [7, 20], greet: ['Bless you, Sheriff.'], lines: [
      ['The Lord forgives, Sheriff. But the bank won\'t.'],
      ['Come in and rest your soul a spell. A prayer does wonders for a tired body.'],
    ] },
    { id: 'dusty', kind: 'prospector', name: 'Old Dusty', x: 1500, face: -1, hours: [6, 21], greet: ['Heh. Westward, eh?'], lines: [
      ['Saw Jack ride out at sunup, headed for Canyon Pass.'],
      ["Folks abandoned them houses along the road after the drought. Might be somethin' left worth takin'."],
      ["Mind the rattlers. And at night, the coyotes come out. They don't like fire, though."],
    ] },
  ];

  // Horses tied up at hitching posts, and the town's animals.
  const HITCHED = [{ x: 150, type: 'bay', face: 1 }, { x: 806, type: 'mule', face: -1 }, { x: 600, type: 'stallion', face: 1 }];
  const CRITTERS = [
    { kind: 'dog', name: 'Rusty', x: 380, range: 260 },
    { kind: 'chicken', x: 1400, range: 40 }, { kind: 'chicken', x: 1420, range: 40, brown: true }, { kind: 'chicken', x: 1440, range: 50 },
    { kind: 'chicken', x: 520, range: 30, brown: true },
  ];

  // every prop is turned into the chunky 2x2 pixel grid and placed on it
  const adder = list => (img, x, base, o = {}) => list.push(Object.assign({ img: U.chunky(img), x: U.snap(x), base: U.snap(base) }, o));

  // Scenery scattered along the road (seeded so it's the same every time).
  const PROPS = [];
  function scatter() {
    const r = U.rng(2024);
    const keepClear = x => HOUSES.some(h => x > h.x - 30 && x < h.x + (h.w || 80) + 20) || Math.abs(x - END) < 120 || Math.abs(x - TRAIL_X - 80) < 150;
    const add = adder(PROPS);
    add(Buildings.canyonGate(4), TRAIL_X, 154, { back: true });
    add(Props.signpost('CANYON|PASS'), TRAIL_X - 60, 153);
    // behind the buildings
    add(Buildings.waterTower(), 1430, 150, { back: true });
    add(Buildings.windmill(0), 1590, 150, { back: true, windmill: true });
    add(Buildings.telegraphPole(), 930, 152, { back: true });
    add(Buildings.laundry(), 1050, 150, { back: true });
    // street dressing
    add(Props.hitchPost(), 140, 156); add(Props.hitchPost(), 590, 156); add(Props.hitchPost(), 796, 156);
    add(Props.trough(), 304, 156); add(Props.trough(), 1220, 156);
    add(Props.barrels(), 470, 154); add(Props.barrels(), 940, 154); add(Props.barrels(), 1396, 154);
    add(Buildings.bench(), 448, 152); add(Buildings.bench(), 760, 152);
    add(Buildings.lampPost(), 160, 152, { lamp: true }); add(Buildings.lampPost(), 486, 152, { lamp: true });
    add(Buildings.lampPost(), 806, 152, { lamp: true }); add(Buildings.lampPost(), 1106, 152, { lamp: true });
    add(Buildings.wagon(), 1520, 156);
    add(Buildings.well(), 1360, 154);
    add(Buildings.corral(), 1400, 152, { back: true });
    add(Props.saguaro(77, 30), 1650, 152); add(Props.barrelCactus(), 10, 154);
    add(Props.signpost('REDEMPTION|GULCH'), 1630, 153);
    add(Props.signpost('CANYON PASS|6 MI >'), 1740, 153);
    add(Props.signpost('MILLER|PLACE >'), 1830, 153);
    add(Props.signpost('< REDEMPTION|GULCH'), 3600, 153);
    add(Props.signpost('CANYON PASS|2 MI >'), 5400, 153);
    for (let x = TOWN_END + 60; x < END + 300; x += 30 + r() * 70) {
      if (keepClear(x)) continue;
      const n = r();
      let img; const base = 150 + Math.floor(r() * 6);
      if (n < 0.22) img = Props.saguaro(Math.floor(r() * 1e6), 18 + Math.floor(r() * 22));
      else if (n < 0.34) img = Props.barrelCactus();
      else if (n < 0.55) img = Props.rock(Math.floor(r() * 1e6));
      else if (n < 0.62) img = Props.skull();
      else if (n < 0.7) img = Props.deadTree(Math.floor(r() * 1e6));
      else if (n < 0.76) img = Props.fence(Math.floor(r() * 1e6));
      else continue;
      add(img, Math.round(x), base);
    }
    // a few foreground rocks in front of the walking line
    for (let x = TOWN_END + 200; x < END; x += 260 + r() * 400) add(Props.rock(Math.floor(r() * 1e6)), Math.round(x), 178, { front: true });
  }

  // ------------------------------------------------------------- canyon
  // Deep red canyon with the mining town of Silverbend part way along.
  // The far end opens toward the prairie (not built yet).
  const C_END = 12800;
  const SB = [5150, 6460];   // Silverbend
  const C_BIOMES = [
    { id: 'canyon', name: 'Canyon Pass', x0: -1e9, x1: SB[0], bg: 'canyon', heat: true, hard: true, music: 'canyon' },
    { id: 'silverbend', name: 'Silverbend', x0: SB[0], x1: SB[1], town: true, bg: 'canyon', music: 'town' },
    { id: 'canyon2', name: 'Canyon Pass', x0: SB[1], x1: 1e9, bg: 'canyon', heat: true, hard: true, music: 'canyon' },
  ];
  const C_BUILDINGS = [
    { id: 'sb_mine', art: 'mine', label: 'Silver Mine', x: 5236, closed: [
      ['Foreman Briggs', "Mine's shut, Sheriff. Shoring gave way on the third level last week."],
      ['Foreman Briggs', "Soon as the new timbers come in, we'll be diggin' again."],
    ] },
    { id: 'sb_assay', art: 'assay', room: 'bank', label: 'Assay Office', x: 5420, cast: {
      teller: { name: 'Mr. Crane (Assayer)', lines: [
        ['Every ounce that comes out of that mountain gets weighed right here.'],
        ['A fella with a silver tooth tried to sell me coins from Redemption Gulch\'s bank. I turned him away. He did not like that.'],
      ] },
    } },
    { id: 'sb_store', art: 'store', room: 'store', label: 'Supply Co.', x: 5574, cast: { shopkeep: { name: 'Rosa' } } },
    { id: 'sb_saloon', art: 'saloon', room: 'saloon', label: 'The Silver Spur', x: 5740, cast: {
      bartender: { name: 'Big Lou', talk: [
        ['Big Lou (Bartender)', 'Rider in a black duster came through. Bought a bottle and three days of jerky, paid in silver.'],
        ['Big Lou (Bartender)', "Asked about the trail to the prairie. Real friendly, 'til somebody asked his name."],
      ] },
      singer: { name: 'Miss Opal', lines: [
        ['They call it Silverbend, Sheriff, but most of the silver ends up in Big Lou\'s till.'],
        ['Watch the cliffs out there. A rock took my brother\'s mule clean off the trail.'],
      ] },
      gambler: { name: 'Three-Card Willy', lines: [
        ['Fancy a game? No? Then maybe you fancy a tip: miners leave stuff in the old cabins up the canyon.'],
      ] },
      townsman: { name: 'Miner', lines: [['First drink after a shift tastes like silver. The second one tastes like Lou\'s boot.']] },
    } },
    { id: 'sb_doctor', art: 'doctor', room: 'doctor', label: "Doc Ames' Office", x: 5928, cast: { doc: { name: 'Doc Ames' } } },
    { id: 'sb_stable', art: 'stable', room: 'stable', label: 'Livery', x: 6048, cast: { stablehand: { name: 'Ike' } } },
  ];
  const C_NPCS = [
    { id: 'briggs', kind: 'foreman', name: 'Foreman Briggs', x: 5400, face: -1, hours: [6, 20], greet: ['Mine\'s closed, Sheriff.'], lines: [
      ['Mine\'s shut till the new timbers come. Third level caved in.'],
      ['If you see any outlaws on the trail, tell \'em Silverbend don\'t take kindly to claim jumpers.'],
    ] },
    { id: 'jeb', kind: 'miner', name: 'Jeb (Miner)', x: 5560, wander: 50, hours: [7, 22], greet: ['Afternoon.', 'Sheriff.'], lines: [
      ['Ain\'t seen a lawman in Silverbend in years. Must be somethin\' big.'],
      ['Saw a fella in a black duster ride through two days back. Real fast horse.'],
    ] },
    { id: 'tom', kind: 'miner2', name: 'Tom (Miner)', x: 5900, wander: 40, hours: [9, 23], greet: ['Watch the rocks out there.'], lines: [
      ['Rockfalls in the canyon\'ll flatten a man. Look for pebbles comin\' down, then get clear.'],
    ] },
    { id: 'martha2', kind: 'miningwife', name: 'Mrs. Briggs', x: 5700, wander: 30, hours: [8, 18], greet: ['Good day.'], lines: [
      ['Rosa at the Supply Co. has the only decent coffee for fifty miles.'],
      ['My husband runs the mine. Worries himself sick over them timbers.'],
    ] },
    { id: 'gideon', kind: 'prospector', name: 'Old Gideon', x: 6240, face: -1, hours: [6, 21], greet: ['Heh heh.'], lines: [
      ['Mountain lions in these rocks, Sheriff. They wait up high and pounce.'],
      ['Prairie\'s past the end of the canyon. Flat as a skillet, all the way to the sky.'],
    ] },
  ];
  const C_HITCHED = [{ x: 5730, type: 'bay', face: 1 }, { x: 6036, type: 'mule', face: -1 }];
  const C_CRITTERS = [{ kind: 'dog', name: 'Nugget', x: 5650, range: 200 }, { kind: 'chicken', x: 6300, range: 40 }, { kind: 'chicken', x: 6330, range: 40, brown: true }];
  const C_FIXED = [
    { type: 'outlaw', x: 900 }, { type: 'snake', x: 1500 }, { type: 'coyote', x: 2200 }, { type: 'outlaw', x: 3200 },
    { type: 'snake', x: 4000 }, { type: 'outlaw', x: 4600 }, { type: 'outlaw', x: 7200 }, { type: 'coyote', x: 7900 },
    { type: 'snake', x: 8600 }, { type: 'outlaw', x: 9400 }, { type: 'coyote', x: 10200 }, { type: 'outlaw', x: 11000 },
    { type: 'snake', x: 11800 },
  ];
  const C_PROPS = [];
  function scatterCanyon() {
    const r = U.rng(77);
    const add = adder(C_PROPS);
    add(Buildings.canyonGate(9), 0, 154, { back: true });
    add(Props.signpost('BADLANDS|<'), 206, 153);
    add(Props.signpost('SILVERBEND|>'), 340, 153);
    add(Props.signpost('SILVERBEND'), SB[0] - 60, 153);
    add(Props.signpost('PRAIRIE >'), SB[1] + 40, 153);
    add(Props.signpost('PRAIRIE|COMING SOON'), C_END - 120, 153);
    add(Buildings.boulders(5), C_END - 40, 156);
    // Silverbend's street
    add(Buildings.tailings(3), 5180, 152, { back: true });
    add(Buildings.rails(120), 5300, 154);
    add(Buildings.oreCart(), 5390, 154);
    add(Buildings.waterTower(), 6290, 150, { back: true });
    add(Props.hitchPost(), 5720, 156); add(Props.hitchPost(), 6026, 156);
    add(Props.trough(), 5900, 156); add(Props.barrels(), 5560, 154); add(Props.barrels(), 6200, 154);
    add(Buildings.lampPost(), 5410, 152, { lamp: true }); add(Buildings.lampPost(), 5722, 152, { lamp: true }); add(Buildings.lampPost(), 6020, 152, { lamp: true });
    add(Buildings.wagon(), 6360, 156);
    add(Buildings.bench(), 5900, 152);
    const inTown = x => x > SB[0] - 140 && x < SB[1] + 80;
    for (let x = 460; x < C_END - 160; x += 40 + r() * 80) {
      if (inTown(x)) continue;
      const n = r();
      let img, base = 150 + Math.floor(r() * 6), o = {};
      if (n < 0.1) { img = Buildings.hoodoo(Math.floor(r() * 1e6)); o.back = true; base = 150; }
      else if (n < 0.26) img = Buildings.boulders(Math.floor(r() * 1e6));
      else if (n < 0.5) img = Props.rock(Math.floor(r() * 1e6));
      else if (n < 0.58) img = Props.skull();
      else if (n < 0.68) img = Props.deadTree(Math.floor(r() * 1e6));
      else if (n < 0.74) img = Props.barrelCactus();
      else continue;
      add(img, Math.round(x), base, o);
    }
    for (let x = 500; x < C_END; x += 220 + r() * 300) if (!inTown(x)) add(Props.rock(Math.floor(r() * 1e6)), Math.round(x), 178, { front: true });
  }

  const MAPS = {
    road: {
      END, TOWN_END, BIOMES, BUILDINGS, HOUSES, NPCS, PROPS, FIXED_ENEMIES, HITCHED, CRITTERS, blockedEnd: true,
      EXITS: [{ x: TRAIL_X + 96, label: 'Take the canyon trail', to: 'canyon', toX: 150 }],
      endLines: [
        [null, 'A rockslide has buried the road. Jack must have brought it down behind him.'],
        [null, 'There is a trail into the canyon just back from here.'],
      ],
    },
    canyon: {
      END: C_END, TOWN_END: 0, BIOMES: C_BIOMES, BUILDINGS: C_BUILDINGS, HOUSES: [], NPCS: C_NPCS, PROPS: C_PROPS, FIXED_ENEMIES: C_FIXED, HITCHED: C_HITCHED, CRITTERS: C_CRITTERS,
      EXITS: [{ x: 96, label: 'Head back to the badlands', to: 'road', toX: TRAIL_X + 96 }],
      endLines: [
        [null, 'The canyon opens out onto wide grassland. The prairie lies ahead.'],
        [null, 'The prairie opens up in a future update.'],
      ],
    },
  };

  function use(id) {
    const m = MAPS[id] || MAPS.road;
    api.zone = MAPS[id] ? id : 'road';
    for (const k of ['END', 'TOWN_END', 'BIOMES', 'BUILDINGS', 'HOUSES', 'NPCS', 'PROPS', 'FIXED_ENEMIES', 'HITCHED', 'CRITTERS', 'EXITS', 'endLines', 'blockedEnd']) api[k] = m[k];
  }
  const biomeAtIn = (x, zone) => (MAPS[zone] || MAPS.road).BIOMES.find(b => x >= b.x0 && x < b.x1);

  function init() {
    [...BUILDINGS, ...C_BUILDINGS].forEach(b => {
      const art = b.art ? Buildings.SILVER[b.art]() : Buildings.TOWN[b.id]();
      b.img = art.img; b.doorWorld = b.x + art.door;
      b.wins = art.wins.map(([x, y, w, h]) => ({ r: [x, y, w, h] }));
      b.lamps = art.lamps || []; b.smoke = art.smoke || [];
    });
    HOUSES.forEach(h => {
      const art = Buildings.abandoned(h.type, h.seed * 7919);
      h.img = art.img; h.doorWorld = h.x + art.door; h.w = art.w;
    });
    scatter();
    scatterCanyon();
    api.rockslide = U.chunky(Props.rockslide());
    use('road');
  }

  const api = { MAPS, init, use, biomeAt: (x, zone) => biomeAtIn(x, zone || api.zone) };
  use('road');
  return api;
})();
