// The road west. x is measured in pixels from the start of town.
const World = (() => {
  const END = 7400;        // the rockslide that closes this part of the road
  const TOWN_END = 1150;

  const BIOMES = [
    { id: 'town1', name: 'Redemption Gulch', x0: -1e9, x1: TOWN_END, town: true, bg: 'desert', music: 'town' },
    { id: 'desert', name: 'The Badlands', x0: TOWN_END, x1: 1e9, bg: 'desert', heat: true, music: 'desert' },
  ];
  const biomeAt = x => BIOMES.find(b => x >= b.x0 && x < b.x1);

  const BUILDINGS = [
    { id: 'sheriff', label: "Sheriff's Office", x: 30, w: 96, h: 78, sign: 'SHERIFF', wall: [156, 118, 86], trim: [92, 62, 42],
      signBg: [226, 206, 158], windows: [8, 74], doorX: 41 },
    { id: 'bank', label: 'Bank', x: 190, w: 104, h: 82, sign: 'BANK', wall: [178, 160, 128], trim: [96, 76, 56],
      signBg: [70, 60, 50], signInk: [242, 201, 76], windows: [10, 80], stepped: true, doorCol: [70, 50, 36] },
    { id: 'store', label: 'General Store', x: 370, w: 116, h: 80, sign: 'GENERAL STORE', wall: [118, 138, 108], trim: [70, 82, 62],
      signBg: [236, 220, 180], windows: [10, 92], doorX: 51 },
    { id: 'saloon', label: 'Saloon & Hotel', x: 560, w: 136, h: 96, body: 64, sign: 'SALOON & HOTEL', wall: [162, 76, 62], trim: [86, 42, 34],
      signBg: [242, 222, 170], windows: [12, 110], upper: [12, 40, 86, 114], door: 'batwing', doorX: 61 },
    { id: 'stable', label: 'Stable', x: 790, w: 112, h: 74, sign: 'STABLE', wall: [146, 98, 62], trim: [86, 56, 36],
      signBg: [220, 196, 150], windows: [8], doorX: 60, porch: false, doorCol: [120, 70, 40] },
  ];

  const HOUSES = [
    { id: 'miller', name: 'Miller Homestead', type: 'farmhouse', x: 1880, seed: 11 },
    { id: 'prospector', name: "Prospector's Shack", type: 'shack', x: 2480, seed: 23 },
    { id: 'adobe', name: 'Adobe Ruin', type: 'adobe', x: 3140, seed: 31 },
    { id: 'barn', name: 'Old Barn', type: 'barn', x: 3760, seed: 37 },
    { id: 'waystation', name: 'Old Way Station', type: 'waystation', x: 4460, seed: 43 },
    { id: 'chapel', name: 'Abandoned Chapel', type: 'chapel', x: 5180, seed: 47 },
    { id: 'farmhouse', name: 'Collapsed Farmhouse', type: 'farmhouse', x: 5860, seed: 51 },
    { id: 'trapper', name: "Trapper's Cabin", type: 'shack', x: 6520, seed: 59 },
  ];

  // Enemies that live at a spot and come back each new day if beaten.
  const FIXED_ENEMIES = [
    { type: 'snake', x: 1560 }, { type: 'outlaw', x: 2760 }, { type: 'snake', x: 3560 },
    { type: 'coyote', x: 4100 }, { type: 'outlaw', x: 4980 }, { type: 'snake', x: 6260 }, { type: 'outlaw', x: 6900 },
  ];

  const NPCS = [
    { id: 'hollis', kind: 'banker', name: 'Hollis (Banker)', x: 268, face: -1, lines: [
      ["Please, Sheriff. That money was the whole town's savings."],
      ['Jack rode west, past the old homesteads. Bring him back!'],
    ] },
    { id: 'tommy', kind: 'kid', name: 'Tommy', x: 470, wander: 40, lines: [
      ['Is it true you can knock out a coyote with one punch, Sheriff?'],
      ['Ma says to block when a critter rears back. Then you sock it!'],
    ] },
    { id: 'walt', kind: 'townsman', name: 'Walt', x: 720, wander: 30, lines: [
      ["Jack Calloway... used to be a Pinkerton man, you know. Knows every lawman's trick."],
      ["Hungry? Martha at the General Store sells jerky and beans. Gus at the saloon rents rooms."],
    ] },
    { id: 'doc', kind: 'doc', name: 'Doc Halloway', x: 560, face: 1, lines: [
      ["Bandages, Sheriff. Keep a few on you. A coyote bite festers fast out there."],
      ["If your belly's empty you'll start to weaken. Eat before you fight, not after."],
    ] },
    { id: 'dusty', kind: 'prospector', name: 'Old Dusty', x: 960, face: -1, lines: [
      ['Saw Jack ride out at sunup, headed for Canyon Pass.'],
      ["Folks abandoned them houses along the road after the drought. Might be somethin' left worth takin'."],
      ["Mind the rattlers. And at night, the coyotes come out. They don't like fire, though."],
    ] },
  ];

  // Scenery scattered along the road (seeded so it's the same every time).
  const PROPS = [];
  function scatter() {
    const r = U.rng(2024);
    const keepClear = x => HOUSES.some(h => x > h.x - 30 && x < h.x + (h.w || 80) + 20) || Math.abs(x - END) < 120;
    // town dressing
    PROPS.push({ img: Props.hitchPost(), x: 140, base: 152 });
    PROPS.push({ img: Props.trough(), x: 312, base: 152 });
    PROPS.push({ img: Props.barrels(), x: 500, base: 152 });
    PROPS.push({ img: Props.hitchPost(), x: 712, base: 152 });
    PROPS.push({ img: Props.barrels(), x: 905, base: 152 });
    PROPS.push({ img: Props.signpost('REDEMPTION GULCH'), x: 1010, base: 153 });
    PROPS.push({ img: Props.signpost('CANYON PASS 6 MI >'), x: 1180, base: 153 });
    PROPS.push({ img: Props.signpost('MILLER PLACE >'), x: 1800, base: 153 });
    PROPS.push({ img: Props.signpost('< REDEMPTION GULCH'), x: 3600, base: 153 });
    PROPS.push({ img: Props.signpost('CANYON PASS 2 MI >'), x: 5400, base: 153 });
    for (let x = TOWN_END + 60; x < END + 300; x += 30 + r() * 70) {
      if (keepClear(x)) continue;
      const n = r();
      let img, base = 150 + Math.floor(r() * 6);
      if (n < 0.22) img = Props.saguaro(Math.floor(r() * 1e6), 18 + Math.floor(r() * 22));
      else if (n < 0.34) img = Props.barrelCactus();
      else if (n < 0.55) img = Props.rock(Math.floor(r() * 1e6));
      else if (n < 0.62) img = Props.skull();
      else if (n < 0.7) img = Props.deadTree(Math.floor(r() * 1e6));
      else if (n < 0.76) img = Props.fence(Math.floor(r() * 1e6));
      else continue;
      PROPS.push({ img, x: Math.round(x), base });
    }
    // a few foreground rocks in front of the walking line
    for (let x = TOWN_END + 200; x < END; x += 260 + r() * 400) {
      PROPS.push({ img: Props.rock(Math.floor(r() * 1e6)), x: Math.round(x), base: 178, front: true });
    }
  }

  function init() {
    BUILDINGS.forEach(b => {
      const art = Props.building(b);
      b.img = art.img; b.doorWorld = b.x + art.door; b.wins = art.wins;
    });
    HOUSES.forEach(h => {
      const art = Props.abandoned(h.type, h.seed * 7919);
      h.img = art.img; h.doorWorld = h.x + art.door; h.w = art.w;
    });
    scatter();
    this.rockslide = Props.rockslide();
  }

  return { END, TOWN_END, BIOMES, BUILDINGS, HOUSES, NPCS, PROPS, FIXED_ENEMIES, biomeAt, init };
})();
