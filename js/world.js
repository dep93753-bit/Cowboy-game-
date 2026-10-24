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
    const keepClear = x => HOUSES.some(h => x > h.x - 30 && x < h.x + (h.w || 80) + 20) || Math.abs(x - END) < 120 || (x > TRAIL_X - 140 && x < END + 200);
    const add = adder(PROPS);
    // the canyon mouth: cliffs from just before the trail to past the rockslide,
    // a slot canyon (the trail) and the main gorge the rockslide has filled
    add(Buildings.canyonGate({ seed: 4, w: 240, slot: (TRAIL_X + 96 - (TRAIL_X - 40)) / 2, gorge: [(END - 100 - (TRAIL_X - 40)) / 2, (END + 20 - (TRAIL_X - 40)) / 2] }), TRAIL_X - 40, 154, { back: true });
    add(Props.signpost('CANYON|PASS'), TRAIL_X - 110, 153);
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
  const SB = [5060, 6800];            // Silverbend: a pocket where the canyon widens
  const LEDGE = [5560, 6040];         // the climbable ledge (x range) over the mine
  const LY = Buildings.LEDGE_Y;
  const C_BIOMES = [
    { id: 'canyon', name: 'Canyon Pass', x0: -1e9, x1: SB[0], bg: 'canyon', heat: true, hard: true, music: 'canyon' },
    { id: 'silverbend', name: 'Silverbend', x0: SB[0], x1: SB[1], town: true, bg: 'canyon', music: 'town' },
    { id: 'canyon2', name: 'Canyon Pass', x0: SB[1], x1: 1e9, bg: 'canyon', heat: true, hard: true, music: 'canyon' },
  ];
  const C_BUILDINGS = [
    { id: 'sb_assay', art: 'assay', room: 'sb_assay', label: 'Assay Office', x: 5220, cast: {
      teller: { name: 'Mr. Crane (Assayer)', look: 'assayer', lines: [
        ['Every ounce that comes out of that mountain gets weighed right here.'],
        ['A fella with a silver tooth tried to sell me coins from Redemption Gulch\'s bank. I turned him away. He did not like that.'],
        ['That furnace runs hot enough to melt a horseshoe. That\'s how we tell silver from fool\'s silver.'],
      ] },
    } },
    { id: 'sb_store', art: 'store', room: 'sb_store', label: 'Supply Co.', x: 5380, cast: { shopkeep: { name: 'Rosa' } } },
    { id: 'sb_saloon', art: 'saloon', room: 'sb_saloon', label: 'The Silver Spur', x: 6070, cast: {
      bartender: { name: 'Big Lou', talk: [
        ['Big Lou (Bartender)', 'Rider in a black duster came through. Bought a bottle and three days of jerky, paid in silver.'],
        ['Big Lou (Bartender)', "Asked about the trail to the prairie. Real friendly, 'til somebody asked his name."],
      ] },
      singer: { name: 'Miss Opal', lines: [
        ['They call it Silverbend, Sheriff, but most of the silver ends up in Big Lou\'s till.'],
        ['Watch the cliffs out there. A rock took my brother\'s mule clean off the trail.'],
      ] },
      gambler: { name: 'Three-Card Willy', lines: [
        ['Fancy a game? No? Then here\'s a tip for free: miners leave all sorts in their old camps up the canyon.'],
      ] },
      townsman: { name: 'Dutch (Miner)', look: 'miner', lines: [
        ['First drink after a shift tastes like silver. The second one tastes like Lou\'s boot.'],
        ['Them bunks up on the ledge are free for anybody who works. Or anybody wearin\' a badge, I reckon.'],
      ] },
    } },
    { id: 'sb_livery', art: 'stable', room: 'sb_livery', label: 'Livery', x: 6270, cast: { stablehand: { name: 'Ike' } } },
    // up on the ledge
    { id: 'sb_bunk', art: 'bunkhouse', room: 'sb_bunk', label: 'Bunkhouse', x: 5596, level: 'ledge', base: LY + 2, cast: {
      cook: { name: 'Cookie', look: 'oldtimer', lines: [
        ['Grab any empty bunk, Sheriff. Mind Dutch\'s boots, they could kill a mule.'],
        ['Beans again tonight. Beans every night. Silverbend runs on beans and silver.'],
      ] },
    } },
    { id: 'sb_clinic', art: 'clinic', room: 'sb_clinic', label: 'Clinic', x: 5880, level: 'ledge', base: LY + 2, cast: { doc: { name: 'Doc Ames' } } },
  ];
  // Things to use that aren't buildings: the ladders and the mine.
  const C_OBJECTS = [
    { x: LEDGE[0] + 12, label: 'Climb the ladder', ladder: 'up' }, { x: LEDGE[0] + 12, label: 'Climb down', ladder: 'down', level: 'ledge' },
    { x: LEDGE[1] - 12, label: 'Climb the ladder', ladder: 'up' }, { x: LEDGE[1] - 12, label: 'Climb down', ladder: 'down', level: 'ledge' },
    { x: 5800, label: 'Look into the mine', lines: [
      ['Foreman Briggs', "Mine's shut, Sheriff. Shoring gave way on the third level last week."],
      ['Foreman Briggs', "Soon as the new timbers come in, we'll be diggin' again."],
    ] },
  ];
  const C_NPCS = [
    { id: 'briggs', kind: 'foreman', name: 'Foreman Briggs', x: 5760, face: 1, hours: [6, 20], greet: ['Mine\'s closed, Sheriff.', 'Mind the cart rails.'], lines: [
      ['Mine\'s shut till the new timbers come. Third level caved in.'],
      ['If you see any outlaws on the trail, tell \'em Silverbend don\'t take kindly to claim jumpers.'],
      ['My wife runs the clinic books up on the ledge. Ladders are at either end.'],
    ] },
    { id: 'jeb', kind: 'miner', name: 'Jeb (Miner)', x: 5650, face: -1, work: 'pick', hours: [7, 19], greet: ['Afternoon.', 'Sheriff.'], lines: [
      ['Breakin\' up ore that came out before the cave-in. Somebody\'s got to.'],
      ['Saw a fella in a black duster ride through two days back. Real fast horse.'],
    ] },
    { id: 'eli', kind: 'miner2', name: 'Eli (Miner)', x: 5950, face: 1, work: 'pick', hours: [8, 20], greet: ['Watch your toes.'], lines: [
      ['This here rock\'s got a vein of silver thin as a hair. Thin hair\'s still silver.'],
    ] },
    { id: 'tom', kind: 'miner2', name: 'Tom (Miner)', x: 5700, work: 'cart', range: [5600, 5990], hours: [7, 21], greet: ['Comin\' through!'], lines: [
      ['Rockfalls in the canyon\'ll flatten a man. Look for pebbles comin\' down, then get clear.'],
      ['I push this cart forty times a day. My mule pushes it zero. Smart mule.'],
    ] },
    { id: 'pip', kind: 'kid', name: 'Pip', x: 5420, wander: 60, hours: [8, 18], greet: ['Are you a REAL sheriff?'], lines: [
      ['I\'m gonna be a miner when I grow up. Or a sheriff. Or a mule.'],
    ] },
    { id: 'mrsb', kind: 'miningwife', name: 'Mrs. Briggs', x: 5790, level: 'ledge', y: LY, wander: 40, hours: [8, 18], greet: ['Good day.'], lines: [
      ['Rosa at the Supply Co. has the only decent coffee for fifty miles.'],
      ['My husband runs the mine. Worries himself sick over them timbers.'],
    ] },
    { id: 'clem', kind: 'miner', name: 'Clem (Miner)', x: 6000, level: 'ledge', y: LY, face: -1, hours: [6, 22], greet: ['Nice view from up here.'], lines: [
      ['From up here you can see the dust when riders come down the canyon. Saw a big cloud headin\' west two days ago.'],
    ] },
    { id: 'gideon', kind: 'prospector', name: 'Old Gideon', x: 6470, face: -1, hours: [6, 21], greet: ['Heh heh.'], lines: [
      ['Mountain lions in these rocks, Sheriff. They wait up high and pounce.'],
      ['Prairie\'s past the end of the canyon. Flat as a skillet, all the way to the sky.'],
      ['Folks stake claims all along the canyon. Most of \'em never came back for their gear.'],
    ] },
  ];
  const C_HITCHED = [{ x: 6056, type: 'mule', face: -1 }, { x: 6440, type: 'bay', face: 1 }];
  const C_CRITTERS = [{ kind: 'dog', name: 'Nugget', x: 5450, range: 200 }, { kind: 'chicken', x: 6520, range: 40 }, { kind: 'chicken', x: 6560, range: 40, brown: true }];
  const C_FIXED = [
    { type: 'outlaw', x: 900 }, { type: 'snake', x: 1500 }, { type: 'coyote', x: 2200 }, { type: 'outlaw', x: 3200 },
    { type: 'snake', x: 4000 }, { type: 'outlaw', x: 4600 }, { type: 'outlaw', x: 7200 }, { type: 'coyote', x: 7900 },
    { type: 'snake', x: 8600 }, { type: 'outlaw', x: 9400 }, { type: 'coyote', x: 10200 }, { type: 'outlaw', x: 11000 },
    { type: 'snake', x: 11800 },
  ];
  const C_PROPS = [];
  // dry brush that sways in the wind (drawn live), and where lizards live
  const C_BRUSH = [];
  function scatterCanyon() {
    const r = U.rng(77);
    const add = adder(C_PROPS);
    add(Buildings.canyonGate({ seed: 9, w: 120, slot: 48, left: false, right: true }), 0, 154, { back: true });
    add(Props.signpost('BADLANDS|<'), 250, 153);
    add(Props.signpost('SILVERBEND|>'), 380, 153);
    // the far end: the canyon walls close to a slot that opens onto the prairie
    add(Buildings.canyonGate({ seed: 12, w: 120, slot: 60, right: false }), C_END - 220, 154, { back: true });
    add(Props.signpost('PRAIRIE >'), C_END - 300, 153);
    // ---- Silverbend: a cliff-walled pocket, the town climbing its back wall
    add(Buildings.pocketWall(SB[1] - SB[0] - 80), SB[0] + 40, 154, { back: true });
    add(Buildings.buttress(3, false), SB[0] - 40, 154, { back: true });
    add(Buildings.buttress(4, true), SB[1] - 100, 154, { back: true });
    add(Props.signpost('SILVERBEND'), SB[0] - 90, 153);
    add(Props.signpost('PRAIRIE >'), SB[1] + 20, 153);
    add(Buildings.ledge(LEDGE[1] - LEDGE[0], 5800 - LEDGE[0]), LEDGE[0], 154, { back: true, ledge: true });
    add(Buildings.tailings(3), SB[0] + 110, 152, { back: true });
    add(Buildings.oreCart(), 5850, 154);
    add(FURprop('crates'), 5600, 154); add(Props.barrels(), 5990, 154); add(Props.barrels(), 5530, 154);
    add(Buildings.waterTower(), 6440, 150, { back: true });
    add(Props.hitchPost(), 6046, 156); add(Props.hitchPost(), 6430, 156);
    add(Props.trough(), 6250, 156);
    add(Buildings.lampPost(), 5364, 152, { lamp: true }); add(Buildings.lampPost(), 6050, 152, { lamp: true }); add(Buildings.lampPost(), 6420, 152, { lamp: true });
    add(Buildings.wagon(), 6540, 156);
    add(Buildings.bench(), 6250, 152);
    // ---- the canyon trail: rocks, bones, brush, old camps, claims, gear
    const inTown = x => x > SB[0] - 160 && x < SB[1] + 80;
    const claims = ['CLAIM', 'KEEP OUT', 'J.R. CLAIM', 'NO TRESPASS', 'O. HAYES', 'CLAIM 14'];
    for (let x = 460; x < C_END - 160; x += 40 + r() * 70) {
      if (inTown(x)) continue;
      const n = r();
      let img, base = 150 + Math.floor(r() * 6), o = {};
      if (n < 0.09) { img = Buildings.hoodoo(Math.floor(r() * 1e6)); o.back = true; base = 150; }
      else if (n < 0.22) img = Buildings.boulders(Math.floor(r() * 1e6));
      else if (n < 0.4) img = Props.rock(Math.floor(r() * 1e6));
      else if (n < 0.47) img = Props.skull();
      else if (n < 0.55) img = Props.deadTree(Math.floor(r() * 1e6));
      else if (n < 0.6) img = Props.barrelCactus();
      else if (n < 0.64) img = Buildings.campsite(Math.floor(r() * 1e6));
      else if (n < 0.67) img = Buildings.brokenWagon();
      else if (n < 0.71) img = Buildings.claimStake(U.pick(r, claims));
      else if (n < 0.75) img = Buildings.gear(Math.floor(r() * 1e6));
      else if (n < 0.86) { C_BRUSH.push({ x: Math.round(x), base: 152 + Math.floor(r() * 4), size: 2 + Math.floor(r() * 3), ph: r() * 6 }); continue; }
      else if (n < 0.9) { C_CRITTERS.push({ kind: 'lizard', x: Math.round(x), range: 30 }); continue; }
      else continue;
      add(img, Math.round(x), base, o);
    }
    // rope bridges strung across the canyon high overhead
    for (const bx of [1800, 3900, 8300, 10700]) add(Buildings.ropeBridge(220), bx, 40, { back: true, high: true });
    for (let x = 500; x < C_END; x += 220 + r() * 300) if (!inTown(x)) add(Props.rock(Math.floor(r() * 1e6)), Math.round(x), 178, { front: true });
  }
  // a stack of crates from the room furniture, outside
  function FURprop() { const p = U.pix(30, 24); for (const [x, y, w, h] of [[0, 8, 16, 16], [14, 12, 16, 12], [6, 0, 14, 8]]) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.put(x + i, y + j, i === 0 || j === 0 || i === w - 1 || j === h - 1 || i === j % w ? [100, 70, 44] : [156, 112, 68]); } Props.outline(p); return p.done(); }

  // ------------------------------------------------------------ prairie
  // About as long as the badlands and the canyon together, and never the
  // same for long: rolling grass, farmland and Willow Creek, open range
  // with bison, a cottonwood and pine forest with a river to ford, painted
  // buttes, then the foothills.
  const P_END = 20000;
  const WC = [5700, 7400];               // Willow Creek
  const RIVER = [12360, 12660];
  const P_BIOMES = [
    { id: 'pr1', name: 'Rolling Prairie', x0: -1e9, x1: 3500, bg: 'prairie' },
    { id: 'pr2', name: 'Willow Creek Farms', x0: 3500, x1: WC[0], bg: 'farm' },
    { id: 'wc', name: 'Willow Creek', x0: WC[0], x1: WC[1], town: true, bg: 'farm', music: 'town' },
    { id: 'pr3', name: 'Willow Creek Farms', x0: WC[1], x1: 8400, bg: 'farm' },
    { id: 'pr4', name: 'Open Range', x0: 8400, x1: 10600, bg: 'prairie' },
    { id: 'fo1', name: 'Cottonwood Forest', x0: 10600, x1: 14700, bg: 'forest', forest: true },
    { id: 'pr5', name: 'Painted Buttes', x0: 14700, x1: 17400, bg: 'buttes' },
    { id: 'pr6', name: 'The Foothills', x0: 17400, x1: 1e9, bg: 'foothills' },
  ];
  const P_BUILDINGS = [
    { id: 'wc_church', farm: 'church', room: 'church', label: 'Willow Creek Church', x: 5760, cast: {} },
    { id: 'wc_store', farm: 'store', room: 'store', label: 'Mercantile', x: 5900, cast: { shopkeep: { name: 'Mrs. Hale', look: 'townswoman' } } },
    { id: 'wc_doctor', farm: 'doctor', room: 'doctor', label: "Doc Linden's", x: 6060, cast: { doc: { name: 'Doc Linden' } } },
    { id: 'wc_saloon', farm: 'saloon', room: 'saloon', label: 'The Golden Sheaf', x: 6180, cast: {
      bartender: { name: 'Swede', talk: [
        ['Swede (Bartender)', 'Fella with a silver tooth came through. Paid for a room, never slept in it. Rode north before dawn.'],
        ['Swede (Bartender)', "North is the forest, then the river, then the buttes. Long way to run from a sheriff."],
      ] },
      singer: { name: 'Miss Dahlia', lines: [['They say the bison herds are thinner every year. Still enough to flatten a man, mind.']] },
      gambler: { name: 'Lucky Abe', lines: [['Bears in the cottonwoods this time of year. Don\'t go punching one for sport.']] },
      townsman: { name: 'Farmhand', look: 'cowhand', lines: [['Harvest is early. Good wheat, if the hail holds off.']] },
    } },
    { id: 'wc_mill', farm: 'mill', room: 'pr_mill', label: 'Grain Mill', x: 6420, cast: { cook: { name: 'Olsen (Miller)', look: 'oldtimer', lines: [
      ['The creek turns the wheel, the wheel turns the stones, the stones turn wheat into flour. Simple as that.'],
      ['Every farmer for forty miles brings their grain here. Hear all sorts of news.'],
    ] } } },
    { id: 'wc_stable', farm: 'stable', room: 'stable', label: 'Livery', x: 6620, cast: { stablehand: { name: 'Jonah' } } },
  ];
  const P_HOUSES = [
    { id: 'p_soddy', name: 'Empty Sod House', type: 'shack', x: 2400, seed: 61 },
    { id: 'p_farm', name: 'Burned-Out Farm', type: 'farmhouse', x: 4400, seed: 67 },
    { id: 'p_barn', name: 'Leaning Barn', type: 'barn', x: 8000, seed: 71 },
    { id: 'p_cabin', name: "Trapper's Lodge", type: 'shack', x: 11400, seed: 73 },
    { id: 'p_station', name: 'Stage Stop', type: 'waystation', x: 15200, seed: 79 },
    { id: 'p_mission', name: 'Old Mission', type: 'chapel', x: 18200, seed: 83 },
  ];
  const T = (id, kind, name, x, range, extra) => Object.assign({ id, kind, name, x, work: 'travel', range, speed: 16 + (x % 7) }, extra);
  const P_NPCS = [
    // Willow Creek
    { id: 'hale', kind: 'farmer', name: 'Mr. Hale', x: 5960, wander: 40, hours: [7, 19], greet: ['Fine day, Sheriff.'], lines: [
      ['My wife runs the Mercantile. I run the farm. We both run from the bears.'],
      ['Saw a black duster at the crossing two days back. Fella didn\'t stop to water his horse.'],
    ] },
    { id: 'ruth', kind: 'townswoman', name: 'Ruth', x: 6300, wander: 50, hours: [8, 18], greet: ['Good afternoon.'], lines: [['The mill wheel never stops. You can hear it from my porch all night.']] },
    { id: 'ben', kind: 'kid', name: 'Ben', x: 6150, wander: 80, hours: [8, 18], greet: ['Did you see the bison?!'], lines: [['Pa says if a bison looks at you, don\'t look back.']] },
    { id: 'gus2', kind: 'oldtimer', name: 'Grandpa Ike', x: 6560, face: -1, hours: [9, 17], greet: ['Heh.'], lines: [['Crossed this prairie in \'52 with nothin\' but a mule and a bad attitude. Still got the attitude.']] },
    // travelers on the trail
    T('sett1', 'farmer', 'Settler (Amos)', 1400, [900, 3000], { wagon: 'mule', lines: [['Headed for Willow Creek. Heard the soil\'s so rich you can plant a nail and grow a hammer.'], ['Watch for coyotes at night. They hunt in packs out here.']] }),
    T('trade1', 'prospector', 'Peddler Jim', 2900, [2500, 3400], { wagon: 'mule', trade: ['jerky', 'beans', 'bread', 'apple', 'bandage', 'horsefeed'], tradeGreet: 'Fresh bread and canned goods! Cheaper than the town, nearly.' }),
    T('rider1', 'cowhand', 'Drover', 9000, [8600, 10400], { speed: 30, lines: [['Movin\' cattle south. Don\'t spook the bison, they\'ll stampede.'], ['A rider in black passed our herd. Headin\' for the forest.']] }),
    T('sett2', 'townswoman', 'Settler (Martha Kay)', 9800, [9200, 10500], { wagon: 'bay', lines: [['Lost a wheel at the river crossin\'. You have to wade it, there\'s no bridge.']] }),
    T('hunter', 'townsman', 'Fur Trapper', 11800, [11000, 12200], { trade: ['jerky', 'bandage', 'steak', 'horsefeed'], tradeGreet: 'Pelts are my trade, but I got jerky for a lawman.', lines: [['Bears up ahead. Big ones.']] }),
    T('sett3', 'farmer', 'Old Couple', 15600, [15000, 16800], { wagon: 'mule', speed: 12, lines: [['We\'re goin\' home to see the grandchildren. Forty years married and he still won\'t ask for directions.']] }),
    T('trade2', 'stablehand', 'Horse Trader', 16900, [16500, 17300], { trade: ['horsefeed', 'jerky', 'beans', 'apple'], tradeGreet: 'Feed for your horse, food for you. Fair prices!' }),
    T('rider2', 'deputy', 'Marshal\'s Rider', 18800, [18200, 19600], { speed: 34, lines: [['Telegram from the marshal: Calloway was seen headin\' for the mountains. You\'re close, Sheriff.']] }),
  ];
  const P_HITCHED = [{ x: 6040, type: 'bay', face: 1 }, { x: 6790, type: 'mule', face: -1 }];
  const P_CRITTERS = [
    { kind: 'dog', name: 'Sadie', x: 6000, range: 220 }, { kind: 'chicken', x: 5400, range: 40 }, { kind: 'chicken', x: 5430, range: 40, brown: true }, { kind: 'chicken', x: 7600, range: 50 },
    { kind: 'cow', x: 4100, range: 60 }, { kind: 'cow', x: 4200, range: 60, brown: true }, { kind: 'cow', x: 4320, range: 50 }, { kind: 'cow', x: 7800, range: 70, brown: true }, { kind: 'cow', x: 7900, range: 60 },
  ];
  // bison herds out on the open range and the buttes; bears in the forest
  const herd = (x, n) => Array.from({ length: n }, (_, i) => ({ type: 'bison', x: x + i * 70 + (i % 2) * 20 }));
  const P_FIXED = [
    ...herd(1900, 4), ...herd(8900, 6), ...herd(16000, 5),
    { type: 'bear', x: 11300 }, { type: 'bear', x: 13300 }, { type: 'bear', x: 14200 },
    { type: 'coyote', x: 3000 }, { type: 'coyote', x: 3060 }, { type: 'coyote', x: 10100 }, { type: 'coyote', x: 10160 }, { type: 'coyote', x: 17800 }, { type: 'coyote', x: 17850 },
    { type: 'outlaw', x: 15800 }, { type: 'outlaw', x: 19000 },
  ];
  const P_PROPS = [];
  function scatterPrairie() {
    const r = U.rng(303);
    const add = adder(P_PROPS);
    // out of the canyon
    add(Buildings.canyonGate({ seed: 14, w: 120, slot: 60, left: false, right: true }), -20, 154, { back: true });
    add(Props.signpost('CANYON|<'), 260, 153);
    add(Props.signpost('WILLOW CREEK|>'), 420, 153);
    add(Props.signpost('WILLOW CREEK'), WC[0] - 80, 153);
    add(Props.signpost('ELK RIVER|FORD'), RIVER[0] - 90, 153);
    add(Props.signpost('MOUNTAINS|COMING SOON'), P_END - 140, 153);
    // Willow Creek street
    add(Buildings.windmill(0), 5600, 150, { back: true, windmill: true });
    add(Buildings.waterTower(), 7000, 150, { back: true });
    add(Props.hitchPost(), 6030, 156); add(Props.hitchPost(), 6390, 156); add(Props.trough(), 6160, 156);
    add(Buildings.lampPost(), 5880, 152, { lamp: true }); add(Buildings.lampPost(), 6170, 152, { lamp: true }); add(Buildings.lampPost(), 6600, 152, { lamp: true });
    add(Props.barrels(), 6400, 154); add(Buildings.bench(), 6120, 152); add(Buildings.wagon(), 6830, 156);
    add(Buildings.haystack(4), 6900, 154); add(Buildings.haystack(5), 6960, 154, { back: true });
    add(Buildings.railFence(200), 7080, 154);
    const inTown = x => x > WC[0] - 120 && x < WC[1] + 40;
    const nearHouse = x => P_HOUSES.some(h => x > h.x - 40 && x < h.x + 200);
    const inRiver = x => x > RIVER[0] - 40 && x < RIVER[1] + 40;
    // what grows where
    const kit = {
      prairie: [['grass', 30], ['flowers', 18], ['tallgrass', 12], ['bush', 8], ['cottonwood', 5], ['oak', 4], ['rock', 6], ['skull', 2], ['fence', 4], ['camp', 1], ['pdog', 3], ['rabbit', 3]],
      farm: [['wheat', 16], ['fence', 10], ['haystack', 6], ['grass', 14], ['flowers', 8], ['oak', 4], ['homestead', 3], ['scarecrow', 2], ['bush', 4], ['rabbit', 2]],
      forest: [['pine', 26], ['cottonwood', 10], ['fern', 12], ['log', 5], ['stump', 5], ['bush', 8], ['grass', 6], ['rock', 4], ['deer', 3], ['rabbit', 2]],
      buttes: [['grass', 20], ['tallgrass', 12], ['rock', 12], ['boulders', 6], ['bush', 6], ['skull', 3], ['hoodoo', 3], ['camp', 1], ['pdog', 3], ['oak', 2]],
      foothills: [['pine', 16], ['grass', 14], ['rock', 10], ['boulders', 6], ['flowers', 8], ['bush', 6], ['deer', 2], ['log', 2]],
    };
    const pickFrom = list => { let t = 0; for (const [, w] of list) t += w; let n = r() * t; for (const [k, w] of list) { n -= w; if (n <= 0) return k; } return list[0][0]; };
    const bgAt = x => (P_BIOMES.find(b => x >= b.x0 && x < b.x1) || {}).bg;
    for (let x = 520; x < P_END - 200; x += 22 + r() * 46) {
      if (inTown(x) || nearHouse(x) || inRiver(x)) continue;
      const k = pickFrom(kit[bgAt(x)] || kit.prairie), seed = Math.floor(r() * 1e6), X = Math.round(x), base = 152 + Math.floor(r() * 4);
      if (k === 'grass') add(Buildings.grassClump(seed, false), X, base);
      else if (k === 'tallgrass') add(Buildings.grassClump(seed, true), X, base);
      else if (k === 'flowers') add(Buildings.flowers(seed), X, base);
      else if (k === 'bush') add(Buildings.bush(seed), X, base);
      else if (k === 'pine') add(Buildings.tree('pine', seed), X, 152, { back: r() < 0.5 });
      else if (k === 'cottonwood') add(Buildings.tree('cottonwood', seed), X, 152, { back: true });
      else if (k === 'oak') add(Buildings.tree('oak', seed), X, 152, { back: true });
      else if (k === 'rock') add(Props.rock(seed), X, base);
      else if (k === 'boulders') add(Buildings.boulders(seed), X, 154);
      else if (k === 'skull') add(Props.skull(), X, base);
      else if (k === 'hoodoo') add(Buildings.hoodoo(seed), X, 150, { back: true });
      else if (k === 'fence') add(Buildings.railFence(80 + Math.floor(r() * 120)), X, 152, { back: true });
      else if (k === 'wheat') add(Buildings.wheat(120 + Math.floor(r() * 140)), X, 150, { back: true });
      else if (k === 'haystack') add(Buildings.haystack(seed), X, 154);
      else if (k === 'scarecrow') add(Buildings.scarecrow(), X, 152, { back: true });
      else if (k === 'homestead') { add(Buildings.homestead(seed), X, 152, { back: true }); x += 120; }
      else if (k === 'camp') add(Buildings.camp(seed), X, 154);
      else if (k === 'log') add(Buildings.log(seed), X, 154);
      else if (k === 'stump') add(Buildings.stump(seed), X, 154);
      else if (k === 'fern') add(Buildings.fern(seed), X, 154);
      else if (k === 'pdog') P_CRITTERS.push({ kind: 'pdog', x: X, range: 0 });
      else if (k === 'rabbit') P_CRITTERS.push({ kind: 'rabbit', x: X, range: 80 });
      else if (k === 'deer') P_CRITTERS.push({ kind: 'deer', x: X, range: 120 });
    }
    // reeds and rocks on the riverbanks
    for (const bx of [RIVER[0] - 30, RIVER[0] + 10, RIVER[1] - 30, RIVER[1] + 6]) add(Buildings.reeds(bx), bx, 156);
    // a few foreground grass tufts and stones in front of the trail
    for (let x = 600; x < P_END; x += 180 + r() * 260) if (!inTown(x) && !inRiver(x)) add(r() < 0.6 ? Buildings.grassClump(Math.floor(r() * 1e6), true) : Props.rock(Math.floor(r() * 1e6)), Math.round(x), 180, { front: true });
  }

  const MAPS = {
    road: {
      END, TOWN_END, BIOMES, BUILDINGS, HOUSES, NPCS, PROPS, FIXED_ENEMIES, HITCHED, CRITTERS, blockedEnd: true, OBJECTS: [], LEDGE: null, BRUSH: [],
      EXITS: [{ x: TRAIL_X + 96, label: 'Take the canyon trail', to: 'canyon', toX: 150 }],
      endLines: [
        [null, 'A rockslide has buried the road. Jack must have brought it down behind him.'],
        [null, 'There is a trail into the canyon just back from here.'],
      ],
    },
    canyon: {
      END: C_END, TOWN_END: 0, BIOMES: C_BIOMES, BUILDINGS: C_BUILDINGS, HOUSES: [], NPCS: C_NPCS, PROPS: C_PROPS, FIXED_ENEMIES: C_FIXED, HITCHED: C_HITCHED, CRITTERS: C_CRITTERS,
      OBJECTS: C_OBJECTS, LEDGE, BRUSH: C_BRUSH, life: true, POCKET: SB, ceiling: true,
      EXITS: [{ x: 96, label: 'Head back to the badlands', to: 'road', toX: TRAIL_X + 96 },
        { x: C_END - 100, label: 'Head out onto the prairie', to: 'prairie', toX: 170 }],
      endLines: [[null, 'Light ahead. The canyon opens out onto wide grassland.']],
    },
    prairie: {
      END: P_END, TOWN_END: 0, BIOMES: P_BIOMES, BUILDINGS: P_BUILDINGS, HOUSES: P_HOUSES, NPCS: P_NPCS, PROPS: P_PROPS, FIXED_ENEMIES: P_FIXED, HITCHED: P_HITCHED, CRITTERS: P_CRITTERS,
      OBJECTS: [], LEDGE: null, BRUSH: [], prairie: true, RIVER, spawns: true,
      EXITS: [{ x: 100, label: 'Head back into the canyon', to: 'canyon', toX: C_END - 100 }],
      endLines: [[null, 'The foothills climb toward the mountains. Snow on the peaks.'], [null, 'The mountains open up in a future update.']],
    },
  };

  function use(id) {
    const m = MAPS[id] || MAPS.road;
    api.zone = MAPS[id] ? id : 'road';
    for (const k of ['END', 'TOWN_END', 'BIOMES', 'BUILDINGS', 'HOUSES', 'NPCS', 'PROPS', 'FIXED_ENEMIES', 'HITCHED', 'CRITTERS', 'EXITS', 'endLines', 'blockedEnd', 'OBJECTS', 'LEDGE', 'BRUSH', 'life', 'POCKET', 'ceiling', 'prairie', 'RIVER']) api[k] = m[k];
  }
  const biomeAtIn = (x, zone) => (MAPS[zone] || MAPS.road).BIOMES.find(b => x >= b.x0 && x < b.x1);

  function init() {
    [...BUILDINGS, ...C_BUILDINGS, ...P_BUILDINGS].forEach(b => {
      const art = b.farm ? Buildings.FARM[b.farm]() : b.art ? Buildings.SILVER[b.art]() : Buildings.TOWN[b.id]();
      b.img = art.img; b.doorWorld = b.x + art.door;
      b.wins = art.wins.map(([x, y, w, h]) => ({ r: [x, y, w, h] }));
      b.lamps = art.lamps || []; b.smoke = art.smoke || [];
    });
    [...HOUSES, ...P_HOUSES].forEach(h => {
      const art = Buildings.abandoned(h.type, h.seed * 7919);
      h.img = art.img; h.doorWorld = h.x + art.door; h.w = art.w;
    });
    scatter();
    scatterCanyon();
    scatterPrairie();
    api.rockslide = U.chunky(Props.rockslide());
    use('road');
  }

  const api = { MAPS, init, use, biomeAt: (x, zone) => biomeAtIn(x, zone || api.zone) };
  use('road');
  return api;
})();
