// Character and creature sprites, drawn as text grids (one letter = one pixel)
// and turned into canvases at startup. Every sprite faces RIGHT; the renderer
// mirrors it for left.
const Sprites = (() => {
  const OUTLINE = [40, 22, 18];

  // Build a canvas from a grid. A 1px outline is added around the shape, so
  // the canvas is 2px bigger than the grid on each axis.
  function build(rows, pal, outline = OUTLINE) {
    const h = rows.length;
    const w = Math.max(...rows.map(r => r.length));
    const p = U.pix(w + 2, h + 2);
    const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
    if (outline) {
      for (let y = -1; y <= h; y++) {
        for (let x = -1; x <= w; x++) {
          if (filled(x, y)) continue;
          if (filled(x + 1, y) || filled(x - 1, y) || filled(x, y + 1) || filled(x, y - 1)) p.put(x + 1, y + 1, outline);
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        p.put(x + 1, y + 1, pal[ch] || [255, 0, 255]);
      }
    }
    return p.done();
  }

  // Same shape in one flat colour (used for the white "got hit" flash).
  function silhouette(rows, col) {
    return build(rows, new Proxy({}, { get: () => col }), col);
  }

  // Paint strings onto a copy of a grid starting at column x, row y.
  function paint(rows, x, y, strs) {
    const out = rows.slice();
    strs.forEach((s, j) => {
      let r = out[y + j].padEnd(x + s.length, '.');
      for (let i = 0; i < s.length; i++) if (s[i] !== ' ') r = r.slice(0, x + i) + s[i] + r.slice(x + i + 1);
      out[y + j] = r;
    });
    return out;
  }

  const pad = rows => rows.map(r => r.padEnd(24, '.'));

  // ---------------------------------------------------------------- humans
  // Approved lawman design, split into head / torso / legs so poses can mix.
  const HEAD = [
    '..........AAAA',
    '.........AAHHHh',
    '........AHHHHHHh',
    '........AHHHHHHh',
    '........HHHHHHhh',
    '........bbbbbbbb',
    '...AAAAHHHHHHHHHHHhhhh',
    '....khhhhhhhhhhhhhhhk',
    '........NNNssssssss',
    '........NNNSSSSNNNS',
    '........NNtSSSSSeES',
    '........NNtsSSSSSSSS',
    '........NNSSSSSSSSs',
    '........nNSSSSzNNNN',
    '.........nSSzzzNNz',
    '..........tzzzzs',
    '..........tsss',
  ];
  const TORSO = [
    '.........DDDDDdD',
    '........vwWWwVVVV',
    '.......vwWWWwVVVVV',
    '.......vWWWWwVVVYV',
    '.......vWWWWwVVYZY',
    '.......vwWWWwVVVyV',
    '.......vvWWWwVVVVV',
    '........vWWWwVVVV',
    '........vwWWwVVVV',
    '........vVwwSSsVV',
    '........LLLSSSsLY',
    '........PPPPssPPq',
    '........pPPPPPPPq',
  ];
  const TORSO_PUNCH = [
    '.........DDDDDdD',
    '........vwWWwVVVV',
    '.......vVVwWWWWWWWWWSSS',
    '.......vVVwwwwwwwwwwSSSs',
    '.......vVVVVVVVVYV',
    '.......vVVVVVVVYZY',
    '.......vvVVVVVVVyV',
    '........vVVVVVVVV',
    '........vVVVVVVVV',
    '........vVVVVVVVV',
    '........LLLLLLLLY',
    '........PPPPPPPPq',
    '........pPPPPPPPq',
  ];
  const TORSO_BLOCK = [
    '.........DDDDDdWWw',
    '........vwWWwVVWWw',
    '.......vwWWWWWWWWw',
    '.......vVwwwwwwwwV',
    '.......vVVVVVVVVYV',
    '.......vVVVVVVVYZY',
    '.......vvVVVVVVVyV',
    '........vVVVVVVVV',
    '........vVVVVVVVV',
    '........vVVVVVVVV',
    '........LLLLLLLLY',
    '........PPPPPPPPq',
    '........pPPPPPPPq',
  ];
  const LEGS_STAND = [
    ...Array(12).fill('........ppPPPPq'),
    '........ooOOOOo',
    '........ooOOOOOo',
    '.......GooOOOOOOO',
    '........oooooooooo',
  ];
  const LEGS_STRIDE = [
    '........ppPPPPPPq',
    '.......pppPPPPPPq',
    '.......ppp.PPPPPq',
    '.......ppp..PPPPq',
    '......ppp...PPPPq',
    '......ppp....PPPPq',
    '......ppp....PPPPq',
    '.....ppp.....PPpPq',
    '.....ppp.....PPPPq',
    '.....ppp......PPPPq',
    '....ppp.......PPPPq',
    '....ppp.......PPPPq',
    '....ooo.......OOOOO',
    '...oooooo.....OOOOOOo',
    '..Goooooooo..GOOOOOOOO',
    '...ooooooo....oooooooo',
  ];
  const LEGS_MID = [
    '........ppPPPPPq',
    '........ppPPPPPq',
    '.......pppPPPPPq',
    '.......ppp.PPPPq',
    '.......ppp.PPPPq',
    '.......ppp..PPPPq',
    '.......ppp..PPPPq',
    '.......ppp..PPpPq',
    '.......ppp..PPPPq',
    '........ppp.PPPPq',
    '........ppp.PPPPq',
    '........ppp.PPPPq',
    '........ooo.OOOOO',
    '.......ooooOOOOOOo',
    '......GooooOOOOOOOO',
    '.......ooo.oooooooo',
  ];
  const LEGS_JUMP = [
    '........ppPPPPPPq',
    '........ppPPPPPPPq',
    '........ppPPPPPPPPq',
    '.........ppp..PPPPq',
    '.........ppp..PPPq.',
    '........ppp...PPPq',
    '........ooo..OOOOo',
    '.......ooooo.OOOOOOo',
    '......Gooooo.oooooo',
    '', '', '', '', '', '', '',
  ];

  // Second stride: the far leg (dark) swaps shading with the near leg so the
  // walk cycle alternates legs.
  function swapLegs(rows) {
    return rows.map(r => {
      const split = r.search(/[PO]/);
      if (split < 0) return r;
      let out = '';
      for (let i = 0; i < r.length; i++) {
        const c = r[i];
        if (i < split) out += c === 'p' ? 'P' : c === 'o' ? 'O' : c;
        else out += c === 'P' || c === 'q' ? 'p' : c === 'O' ? 'o' : c;
      }
      return out;
    });
  }

  const BLOCK_HEAD = paint(HEAD, 15, 14, ['SSSs', 'SSSs', 'sss']);

  const POSES = {
    idle: [HEAD, TORSO, LEGS_STAND],
    walk0: [HEAD, TORSO, LEGS_STRIDE],
    walk1: [HEAD, TORSO, LEGS_MID],
    walk2: [HEAD, TORSO, swapLegs(LEGS_STRIDE)],
    walk3: [HEAD, TORSO, swapLegs(LEGS_MID)],
    jump: [HEAD, TORSO, LEGS_JUMP],
    punch: [HEAD, TORSO_PUNCH, LEGS_MID],
    block: [BLOCK_HEAD, TORSO_BLOCK, LEGS_MID],
  };

  const LAWMAN = {
    A: [244, 228, 188], H: [216, 192, 146], h: [170, 144, 100], k: [124, 100, 70], b: [70, 48, 32],
    S: [230, 174, 128], s: [192, 130, 90], t: [148, 94, 62], z: [200, 146, 106], N: [92, 58, 34], n: [64, 40, 24],
    E: [26, 20, 24], e: [236, 232, 222], D: [56, 74, 118], d: [38, 50, 84], W: [186, 200, 214], w: [140, 156, 176],
    V: [88, 60, 42], v: [60, 40, 28], U: [124, 88, 60], Y: [250, 214, 92], y: [196, 150, 50], Z: [255, 248, 210],
    L: [52, 34, 22], P: [124, 98, 72], p: [92, 72, 52], q: [152, 126, 96], O: [84, 52, 30], o: [54, 32, 18], G: [204, 204, 214],
  };

  // Palette tweaks for other people. Hiding the star = painting it vest colour.
  const noStar = v => ({ Y: v.V, y: v.v, Z: v.V });
  const hat = (A, H, h) => ({ A, H, h, k: U.shade(h, 0.75) });
  const vest = (V, v, U2) => ({ V, v, U: U2 });
  const shirt = (W, w) => ({ W, w });
  const pants = (P, p, q) => ({ P, p, q });
  function variant(...parts) {
    const pal = Object.assign({}, LAWMAN, ...parts);
    return Object.assign(pal, noStar(pal));
  }

  const PALETTES = {
    lawman: LAWMAN,
    banker: variant(hat([150, 150, 156], [116, 116, 124], [84, 84, 92]), { b: [30, 30, 34] },
      vest([54, 92, 64], [36, 64, 44], [74, 120, 84]), shirt([238, 236, 228], [192, 190, 182]),
      pants([92, 92, 100], [66, 66, 74], [122, 122, 130]), { D: [30, 30, 34], d: [20, 20, 22] }),
    prospector: variant(hat([150, 110, 70], [120, 84, 50], [86, 58, 34]), shirt([170, 64, 52], [120, 42, 36]),
      { z: [214, 210, 200], N: [196, 192, 182], n: [150, 146, 138] },
      pants([110, 100, 80], [80, 72, 58], [136, 126, 104])),
    shopkeep: variant(hat([110, 80, 60], [86, 60, 44], [62, 42, 30]), vest([228, 222, 206], [190, 182, 164], [244, 240, 228]),
      shirt([120, 140, 100], [90, 108, 74]), { D: [120, 40, 40], d: [86, 28, 28] }),
    bartender: variant(hat([60, 50, 50], [44, 36, 36], [30, 24, 24]), vest([110, 30, 40], [76, 20, 28], [140, 50, 60]),
      shirt([236, 230, 214], [190, 184, 168]), { N: [40, 30, 26], n: [24, 18, 16], z: [210, 160, 120] }),
    townsman: variant(hat([180, 150, 110], [150, 120, 84], [110, 86, 58]), vest([70, 80, 110], [50, 58, 82], [96, 108, 140]),
      shirt([210, 196, 160], [170, 156, 124])),
    kid: variant(hat([200, 170, 90], [170, 140, 70], [130, 104, 50]), shirt([200, 90, 60], [150, 64, 44]),
      vest([200, 90, 60], [150, 64, 44], [220, 120, 90]), { N: [170, 110, 50], n: [130, 80, 36], z: [230, 174, 128] },
      pants([70, 90, 140], [50, 66, 106], [96, 118, 166])),
    outlaw: variant(hat([70, 62, 62], [48, 42, 42], [32, 28, 28]), { b: [120, 40, 36] },
      vest([44, 40, 40], [28, 24, 24], [66, 60, 60]), shirt([130, 50, 44], [94, 34, 30]),
      pants([86, 76, 70], [62, 54, 50], [110, 100, 92]), { D: [170, 50, 44], d: [120, 34, 30] }),
  };

  // Outlaws wear a bandana mask over the lower face.
  const MASK = ['DDDDDDDD', 'DDDDDDDD', 'dDDDDDd', 'dDDd'];
  function headFor(kind, head) {
    if (kind === 'outlaw') return paint(head, 10, 13, MASK);
    return head;
  }

  // People share the lawman body; build every pose for every palette.
  const people = {};
  for (const kind in PALETTES) {
    people[kind] = {};
    for (const pose in POSES) {
      const [h, t, l] = POSES[pose];
      const rows = pad([...headFor(kind, h), ...t, ...l]);
      people[kind][pose] = { img: build(rows, PALETTES[kind]), flash: silhouette(rows, [255, 255, 255]) };
    }
  }

  // ------------------------------------------------------------- creatures
  const SNAKE_PAL = {
    B: [194, 158, 100], b: [96, 66, 38], H: [176, 140, 86], h: [128, 98, 58], E: [20, 10, 10],
    r: [226, 206, 156], T: [220, 40, 40],
  };
  const SNAKE = {
    idle: [
      '.................',
      '...........HHH...',
      '..........HHEHT..',
      '...........Hh....',
      '...........Hh....',
      '..r..BbBBbBHh....',
      '.rrBBbBBbBBbBBh..',
      '..hhhhhhhhhhhhh..',
    ],
    rattle: [
      '.................',
      '...........HHH...',
      '..........HHEH...',
      '...........Hh....',
      '.r.........Hh....',
      '.r...BbBBbBHh....',
      '..rBBbBBbBBbBBh..',
      '..hhhhhhhhhhhhh..',
    ],
    strike: [
      '.....................',
      '.....................',
      '................HHH..',
      '...............HHEHT.',
      '............BBbHh....',
      '..r..BbBBbBBbBh......',
      '.rrBBbBBbBBbBBh......',
      '..hhhhhhhhhhhh.......',
    ],
  };

  const COYOTE_PAL = {
    C: [180, 142, 98], c: [132, 100, 66], w: [222, 204, 164], E: [20, 14, 12], n: [44, 32, 30], t: [250, 250, 240],
  };
  const COYOTE = {
    stand: [
      '...................C.C..',
      '..................CCCC..',
      '..................CCECCnn',
      'c.................CCCCCC.',
      'cC.............CCCCwww...',
      '.cCCCCCCCCCCCCCCCCCw.....',
      '..cCCCCCCCCCCCCCCCw......',
      '...CCCCCCCCCCCCCCww......',
      '...wwwwwwwwwwwwww........',
      '...Cc.Cc.......Cc.Cc.....',
      '...Cc.Cc.......Cc.Cc.....',
      '...cc..cc......cc..cc....',
    ],
    run0: [
      '...................C.C..',
      '..................CCCC..',
      '..................CCECCnn',
      'cc................CCCCCC.',
      '.cC............CCCCwww...',
      '..cCCCCCCCCCCCCCCCCw.....',
      '..cCCCCCCCCCCCCCCCw......',
      '...CCCCCCCCCCCCCCww......',
      '...wwwwwwwwwwwwww........',
      '..Cc...Cc.....Cc....Cc...',
      '.Cc.....Cc...Cc......Cc..',
      'cc.......cc.cc........cc.',
    ],
    run1: [
      '...................C.C..',
      '..................CCCC..',
      '..................CCECCnn',
      '..................CCCCCC.',
      'ccC............CCCCwww...',
      '..cCCCCCCCCCCCCCCCCw.....',
      '..cCCCCCCCCCCCCCCCw......',
      '...CCCCCCCCCCCCCCww......',
      '...wwwwwwwwwwwwww........',
      '....Cc.Cc....Cc.Cc.......',
      '....Cc..Cc...Cc..Cc......',
      '....cc...cc..cc...cc.....',
    ],
    bite: [
      '.........................',
      '....................C.C..',
      '...................CCCC..',
      '...................CCECCCn',
      'c..................CCCttt',
      'cC..............CCCCCCnn.',
      '.cCCCCCCCCCCCCCCCCCw.....',
      '..cCCCCCCCCCCCCCCCw......',
      '...wwwwwwwwwwwwwww.......',
      '...Cc.Cc.......Cc..Cc....',
      '..Cc...Cc.....Cc....Cc...',
      '..cc....cc...cc......cc..',
    ],
  };

  function creatureSet(def, pal) {
    const out = {};
    for (const k in def) out[k] = { img: build(def[k], pal), flash: silhouette(def[k], [255, 255, 255]) };
    return out;
  }

  const creatures = {
    snake: creatureSet(SNAKE, SNAKE_PAL),
    coyote: creatureSet(COYOTE, COYOTE_PAL),
  };

  // The lawman's x anchor inside his sprite (centre of the body column).
  const ANCHOR_X = 13;

  return { people, creatures, build, silhouette, paint, ANCHOR_X };
})();
