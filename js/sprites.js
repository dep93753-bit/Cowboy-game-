// Creature sprites, drawn as text grids (one letter = one pixel)
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

  // People live in js/chars.js (built from the character pack).

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

  const DOG_PAL = { D: [150, 100, 60], d: [108, 68, 40], T: [214, 176, 128], E: [20, 14, 12], n: [30, 22, 20] };
  const dogBody = tail => [
    '...............dd...',
    '..............dDDD..',
    '..............DDEDDn',
    (tail ? '.d' : 'd.') + '............DDDDD.',
    (tail ? 'd..' : '.d.') + '.DDDDDDDDDDDDDd..',
    '..dDDDDDDDDDDDDDD...',
    '...DDDDDDDDDDDDDD...',
    '...DDDTTTTTTTDDDD...',
  ];
  const DOG = {
    stand: [...dogBody(0), '...DD.D......DD.D...', '...DD.D......DD.D...', '...dd.d......dd.d...'],
    wag: [...dogBody(1), '...DD.D......DD.D...', '...DD.D......DD.D...', '...dd.d......dd.d...'],
    run0: [...dogBody(1), '..DD...D....DD...D..', '.DD.....D..DD.....D.', 'dd......d.dd......d.'],
    run1: [...dogBody(0), '....DDD.....DDD.....', '....D.D.....D.D.....', '....d.d.....d.d.....'],
    sit: ['..............dd....', '.............dDDD...', '.............DDEDDn.', '.............DDDDD..', '..........DDDDDDd...', '........DDDDDDDD....',
      '.......DDDDDDDDD....', '......dDDDDTTDD.....', '.....dDDDDDTTDD.....', '....ddDDDDDD.DD.....', '...dddDDDDDD.DD.....'],
  };
  const CHICK_PAL = { W: [238, 234, 222], w: [200, 196, 184], R: [210, 50, 40], Y: [236, 180, 60], E: [20, 14, 12] };
  const CHICK_BROWN = Object.assign({}, CHICK_PAL, { W: [180, 112, 62], w: [140, 84, 44] });
  const CHICK = {
    stand: ['......RR..', '.....WWWW.', '.....WEWWY', '.WW..WWWW.', 'WWWWWWWWW.', '.wWWWWWWW.', '..wwWWWW..', '....Y.Y...', '....Y.Y...'],
    peck: ['..........', '..........', '.WW.......', 'WWWWWWW...', '.wWWWWWRR.', '..wWWWWWWW', '..wwWWWWEY', '....Y.Y...', '....Y.Y...'],
    walk: ['......RR..', '.....WWWW.', '.....WEWWY', '.WW..WWWW.', 'WWWWWWWWW.', '.wWWWWWWW.', '..wwWWWW..', '...Y...Y..', '..Y.....Y.'],
  };

  // Creatures are drawn at 2x so they share the people's chunky pixels.
  const dbl = U.dbl;
  function creatureSet(def, pal) {
    const out = {};
    for (const k in def) out[k] = { img: dbl(build(def[k], pal)), flash: dbl(silhouette(def[k], [255, 255, 255])) };
    return out;
  }

  // a little canyon lizard: flat, long tail, sits on rocks and darts away
  const LIZ_PAL = { L: [150, 130, 80], l: [110, 92, 56], E: [20, 14, 12], o: [196, 120, 70] };
  const LIZARD = {
    stand: ['.........LL.', 'lLLLLoLLLLEL', '..l.l..l.l..'],
    run: ['.........LL.', 'lLLLLoLLLLEL', '.l...ll...l.'],
  };
  const creatures = {
    snake: creatureSet(SNAKE, SNAKE_PAL),
    coyote: creatureSet(COYOTE, COYOTE_PAL),
    dog: creatureSet(DOG, DOG_PAL),
    chicken: creatureSet(CHICK, CHICK_PAL),
    chickenBrown: creatureSet(CHICK, CHICK_BROWN),
    lizard: creatureSet(LIZARD, LIZ_PAL),
  };

  return { creatures, build, silhouette, paint };
})();
