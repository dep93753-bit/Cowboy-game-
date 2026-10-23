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

  // ---- extra heads for townsfolk (same 17-row frame as HEAD)
  const FACE = HEAD.slice(8);
  const HEAD_BOWLER = ['', '', '',
    '..........AAAA',
    '.........AHHHHh',
    '........AHHHHHHh',
    '........bbbbbbbb',
    '.......hHHHHHHHHHh',
    ...FACE];
  const HEAD_TOPHAT = paint([
    '.........AHHHHh',
    '.........AHHHHh',
    '.........AHHHHh',
    '.........AHHHHh',
    '.........bbbbbb',
    '.........AHHHHh',
    '......AHHHHHHHHHHh',
    '.......hhhhhhhhhhh',
    ...FACE], 15, 10, ['GeEG']);
  const HEAD_BALD = [
    '', '', '', '',
    '..........SSSSS',
    '........SSeSSSSSS',
    '.......SSSSSSSSSSS',
    '.......SSSSSSSSSSSS',
    '.......NNSSSSSSSSSS',
    '.......NNSSSSSNNNSS',
    '.......NtsSSSSSSeESS',
    '.......NttSSSSSSSSSSS',
    '.......NNsSSSSSSSSSSs',
    '........NSSSSNNNNNNNS',
    '........sSSSSNSSSSSN',
    '.........tSSSSSSSs',
    '..........tssss',
  ];
  const HEAD_WOMAN = [
    '', '', '', '',
    '......NNN',
    '.....NNNNN.NNNNN',
    '.....NNNNNNNNNNNN',
    '......NNNNNNNNNNNN',
    '........NNNNNNSSSS',
    '........NNNNSSSNNS',
    '........NNNSSSSSeES',
    '........NNNsSSSSSSSS',
    '........NNNSSSSSSSS',
    '........NNNSSSSSRRS',
    '.........NNSSSSSs',
    '..........NSSSs',
    '..........tsss',
  ];
  const HEAD_PROSPECTOR = [
    '', '',
    '..........hHHHh',
    '.........hHHHHHh',
    '.........HHHHHHHh',
    '.........bbbbbbbb',
    '.....hHHHHHHHHHHHHh',
    '.....hhhhhhhhhhhhhhh',
    '........NNNssssssss',
    '........NNNSSSSzzzS',
    '........NNtSSSSSeES',
    '........NNtsSSSSSSSS',
    '........NNzzSSSSSSs',
    '........nzzzzzzzzzzz',
    '........zzzzzzzzzzz',
    '.........zzzzzzzzz',
    '..........zzzzzzz',
  ];

  // ---- extra torsos (13 rows, like TORSO)
  const TORSO_APRON = [
    '.........DDDDDdD',
    '........wWWWWWWWW',
    '.......wWWWWWWWWWW',
    '.......wWWWXXXXXXX',
    '.......wWWWXXXXXXXX',
    '.......wWWWXXXXXXXX',
    '.......wwWWXXXXXXXX',
    '.......SsWWXXXXXXXX',
    '.......SsxXXXXXXXXX',
    '.......ssxXXXXXXXXx',
    '........LxXXXXXXXXx',
    '........PxXXXXXXXx',
    '........pPXXXXXXXx',
  ];
  const TORSO_DRESS = [
    '..........SSSs',
    '........VWWWWWVV',
    '.......VVVVVVVVVV',
    '......UVVVVVVVVVVV',
    '......UVVVVVVVVVVV',
    '.......vVVVVVVVVVV',
    '.......vVVVVVVVVV',
    '........vVVVVVVV',
    '........vVVSSsVV',
    '........vVVSSsVV',
    '........LLLLLLLL',
    '.......vVVVVVVVVV',
    '......vVVVVVVVVVVV',
  ];
  const TORSO_COAT = [
    '.........DDDDDdD',
    '........CcWWWDCCC',
    '.......CcWWWWDCCCC',
    '.......CcWWWWWCCCC',
    '.......CcWWWWWCCCC',
    '.......CcCWWWWCCCC',
    '.......CcCWWWCCCCC',
    '........cCCWWWCCCC',
    '........cCCWWWCCCC',
    '........cCCSSsCCC',
    '........cCCSSsCCC',
    '........cCCCCCCCC',
    '........cCCCCCCCC',
  ];
  const TORSO_FLANNEL = paint(TORSO, 9, 0, ['zzzzzzz', 'zzzzz', ' zzz']);

  // ---- skirts (16 rows) with a two-step sway for walking
  const skirt = sway => [
    '......vVVVVVVVVVVV',
    '......vVVVVVVVVVVV',
    '.....vVVVVVVVVVVVVV',
    '.....vVVVVVVVVVVVVV',
    '.....vVVVVVVVVVVVVV',
    '....vVVVVVVVVVVVVVVV',
    '....vVVVVVVVVVVVVVVV',
    '....vVVVVVVVVVVVVVVV',
    '....vVVVVVVVVVVVVVVV',
    '...vVVVVVVVVVVVVVVVVV',
    '...vVVVVVVVVVVVVVVVVV',
    '...vVVVVVVVVVVVVVVVVV',
    sway ? '...UUUUUUUUUUUUUUUUUU' : '..UUUUUUUUUUUUUUUUUU',
    '',
    sway ? '.......oo....ooo' : '.........oo..ooo',
    '',
  ];
  const SKIRT = { stand: skirt(0), stride: skirt(1), mid: skirt(0), stride2: skirt(1), mid2: skirt(0) };
  const apronLegs = legs => paint(legs, 10, 0, ['XXXXXXXx', 'XXXXXXXx', 'XXXXXXx', 'XXXXXXx']);
  const coatLegs = legs => paint(legs, 8, 0, Array(6).fill('cCCCCCCCC'));
  const STD_LEGS = { stand: LEGS_STAND, stride: LEGS_STRIDE, mid: LEGS_MID };

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
    R: [186, 74, 70], X: [238, 234, 222], x: [196, 190, 176], C: [60, 52, 50], c: [40, 34, 32],
  };

  // Palette tweaks for other people. Hiding the star = painting it vest colour.
  const noStar = v => ({ Y: v.V, y: v.v, Z: v.V });
  const hat = (A, H, h) => ({ A, H, h, k: U.shade(h, 0.75) });
  const vest = (V, v, U2) => ({ V, v, U: U2 });
  const shirt = (W, w) => ({ W, w });
  const pants = (P, p, q) => ({ P, p, q });
  const skin = (S, s, t) => ({ S, s, t, z: S });
  const hair = (N, n) => ({ N, n });
  const coat = (C, c) => ({ C, c });
  function variant(...parts) {
    const pal = Object.assign({}, LAWMAN, ...parts);
    return Object.assign(pal, noStar(pal));
  }

  // Each townsperson: which head/torso/legs, plus colours.
  const MODELS = {
    lawman: { pal: LAWMAN, fighter: true },
    outlaw: { fighter: true, mask: true, pal: variant(hat([70, 62, 62], [48, 42, 42], [32, 28, 28]), { b: [120, 40, 36] },
      vest([44, 40, 40], [28, 24, 24], [66, 60, 60]), shirt([130, 50, 44], [94, 34, 30]),
      pants([86, 76, 70], [62, 54, 50], [110, 100, 92]), { D: [170, 50, 44], d: [120, 34, 30] }) },
    banker: { head: HEAD_BOWLER, pal: variant(hat([70, 70, 76], [48, 48, 54], [32, 32, 38]), { b: [20, 20, 22] },
      vest([54, 92, 64], [36, 64, 44], [74, 120, 84]), shirt([238, 236, 228], [192, 190, 182]),
      pants([92, 92, 100], [66, 66, 74], [122, 122, 130]), { D: [30, 30, 34], d: [20, 20, 22] }, skin([236, 190, 150], [200, 150, 112], [160, 110, 80]),
      hair([150, 150, 150], [110, 110, 110])) },
    teller: { head: HEAD_BOWLER, pal: variant(hat([120, 84, 52], [92, 62, 38], [66, 44, 26]), vest([150, 120, 80], [110, 86, 56], [176, 146, 104]),
      shirt([226, 222, 210], [184, 180, 168]), { D: [120, 30, 40], d: [86, 20, 28] }, hair([40, 30, 24], [24, 18, 14]),
      skin([220, 166, 120], [184, 128, 88], [140, 90, 60])) },
    prospector: { head: HEAD_PROSPECTOR, torso: TORSO_FLANNEL, pal: variant(hat([150, 110, 70], [120, 84, 50], [86, 58, 34]),
      shirt([170, 64, 52], [120, 42, 36]), { z: [222, 220, 210], N: [196, 192, 182], n: [150, 146, 138] },
      vest([110, 90, 60], [80, 64, 42], [136, 112, 76]), pants([110, 100, 80], [80, 72, 58], [136, 126, 104]),
      skin([210, 150, 106], [170, 112, 76], [130, 84, 56]), { z: [226, 224, 214] }) },
    shopkeep: { head: HEAD_WOMAN, torso: TORSO_DRESS, legs: SKIRT, pal: variant(vest([86, 110, 150], [60, 80, 116], [116, 140, 180]),
      shirt([240, 236, 226], [200, 196, 186]), hair([110, 66, 36], [78, 46, 24]), skin([238, 192, 152], [204, 154, 116], [164, 114, 82]),
      { L: [240, 236, 226], o: [50, 34, 24] }) },
    singer: { head: HEAD_WOMAN, torso: TORSO_DRESS, legs: SKIRT, pal: variant(vest([170, 40, 60], [120, 24, 40], [210, 70, 90]),
      shirt([30, 24, 28], [20, 16, 18]), hair([230, 190, 100], [190, 146, 64]), skin([240, 200, 166], [210, 164, 128], [170, 124, 92]),
      { L: [30, 24, 28], R: [200, 40, 60], o: [30, 20, 20] }) },
    bartender: { head: HEAD_BALD, torso: TORSO_APRON, legsFn: apronLegs, pal: variant(shirt([236, 230, 214], [190, 184, 168]),
      { D: [140, 30, 40], d: [100, 20, 28] }, hair([44, 32, 26], [26, 18, 14]), skin([226, 170, 128], [190, 132, 92], [150, 96, 64]),
      pants([60, 54, 60], [42, 38, 42], [84, 78, 86])) },
    townsman: { pal: variant(hat([180, 150, 110], [150, 120, 84], [110, 86, 58]), vest([70, 80, 110], [50, 58, 82], [96, 108, 140]),
      shirt([210, 196, 160], [170, 156, 124]), skin([200, 140, 100], [164, 108, 72], [124, 78, 50]), hair([30, 24, 20], [18, 14, 12])) },
    stablehand: { pal: variant(hat([226, 200, 120], [200, 172, 96], [160, 132, 70]), { b: [150, 60, 40] },
      vest([80, 60, 44], [56, 40, 28], [104, 80, 58]), shirt([150, 170, 120], [112, 130, 88]),
      pants([90, 110, 150], [64, 82, 116], [116, 138, 176]), hair([150, 80, 40], [110, 56, 26]), skin([240, 186, 140], [206, 148, 104], [166, 108, 74])) },
    doc: { head: HEAD_TOPHAT, torso: TORSO_COAT, legsFn: coatLegs, pal: variant(hat([40, 36, 36], [28, 24, 24], [18, 16, 16]), { b: [90, 80, 80] },
      coat([44, 44, 52], [30, 30, 36]), shirt([236, 236, 230], [196, 196, 190]), { D: [30, 30, 30], d: [18, 18, 18] },
      pants([60, 60, 66], [42, 42, 48], [80, 80, 88]), hair([200, 200, 200], [160, 160, 160]), skin([234, 188, 150], [198, 148, 112], [158, 108, 78])) },
    gambler: { head: HEAD_TOPHAT, torso: TORSO_COAT, legsFn: coatLegs, glasses: false, pal: variant(hat([30, 26, 30], [20, 16, 20], [12, 10, 12]), { b: [170, 40, 50], G: [30, 26, 30] },
      coat([30, 26, 30], [18, 14, 18]), shirt([150, 40, 50], [110, 26, 36]), { D: [230, 230, 220], d: [190, 190, 180] },
      pants([40, 36, 40], [28, 24, 28], [60, 56, 60]), hair([20, 16, 14], [10, 8, 8]), skin([224, 170, 126], [188, 130, 90], [146, 92, 62])) },
    deputy: { fighter: true, pal: Object.assign({}, LAWMAN, hat([120, 90, 60], [96, 70, 44], [70, 50, 30]), vest([60, 70, 50], [42, 50, 34], [84, 96, 70]),
      shirt([200, 180, 150], [160, 140, 112]), hair([180, 120, 60], [140, 88, 40]), skin([240, 190, 150], [206, 152, 112], [166, 112, 80]),
      { Y: [200, 200, 210], y: [150, 150, 160], Z: [250, 250, 255] }) },
  };

  // Outlaws wear a bandana mask over the lower face.
  const MASK = ['DDDDDDDD', 'DDDDDDDD', 'dDDDDDd', 'dDDd'];

  function buildModel(m) {
    const head = m.head || HEAD, torso = m.torso || TORSO;
    const L = m.legs || STD_LEGS;
    const lf = m.legsFn || (x => x);
    let poses = {
      idle: [head, torso, lf(L.stand)],
      walk0: [head, torso, lf(L.stride)],
      walk1: [head, torso, lf(L.mid)],
      walk2: [head, torso, lf(L.stride2 || swapLegs(L.stride))],
      walk3: [head, torso, lf(L.mid2 || swapLegs(L.mid))],
    };
    if (m.fighter) poses = POSES;
    const out = {};
    for (const pose in poses) {
      let [h, t, l] = poses[pose];
      if (m.mask) h = paint(h, 10, 13, MASK);
      const rows = pad([...h, ...t, ...l]);
      out[pose] = { img: build(rows, m.pal), flash: silhouette(rows, [255, 255, 255]) };
    }
    return out;
  }

  // The kid is smaller, so he gets his own frames.
  const KID_TOP = [
    '..........AAA',
    '.........AHHHh',
    '.........bbbbb',
    '......AAHHHHHHhh',
    '.......hhhhhhhh',
    '........NNSSSSS',
    '........NNSSSeE',
    '........NtSSSSSS',
    '........NSSSSSS',
    '.........sSSSS',
    '..........tss',
    '........WWWWWW',
    '.......WWWWWWWW',
    '.......WWWWWWWW',
    '.......WWWWWWWW',
    '.......SLLLYLLS',
  ];
  const KID_LEGS = [
    ['........PPPPPP', '........PPPPPP', '........PPpPPP', '........PPpPPP', '........PPpPPP', '........OOoOOO', '........OOoOOOO'],
    ['........PPPPPP', '.......PPP.PPP', '.......PPP..PPP', '......PPP...PPP', '......PPP...PPP', '......OOO...OOOO', '.....OOOO...OOOOO'],
  ];
  const KID_PAL = Object.assign({}, LAWMAN, hat([200, 170, 90], [170, 140, 70], [130, 104, 50]), shirt([200, 90, 60], [150, 64, 44]),
    hair([170, 110, 50], [130, 80, 36]), pants([70, 90, 140], [50, 66, 106], [96, 118, 166]), { Y: [52, 34, 22] });
  function buildKid() {
    const f = l => { const rows = pad([...KID_TOP, ...l]); return { img: build(rows, KID_PAL), flash: silhouette(rows, [255, 255, 255]) }; };
    const a = f(KID_LEGS[0]), b = f(KID_LEGS[1]);
    return { idle: a, walk0: b, walk1: a, walk2: b, walk3: a };
  }

  const people = {};
  for (const kind in MODELS) people[kind] = buildModel(MODELS[kind]);
  people.kid = buildKid();

  // Riding pose: seated on a saddle, near leg hanging down the horse's side.
  const LEGS_RIDE = [
    '........ppPPPPPPPq',
    '........ppPPPPPPPPq',
    '..............PPPq',
    '..............PPPq',
    '..............PPPq',
    '..............OOOOo',
    '.............GOOOOOo',
    '..............ooooooo',
  ];
  const rider = (() => { const rows = pad([...HEAD, ...TORSO, ...LEGS_RIDE]); return { img: build(rows, LAWMAN), flash: silhouette(rows, [255, 255, 255]) }; })();
  const RIDER_HIP = 17 + 13; // rows above the saddle line (head + torso)

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

  return { people, creatures, build, silhouette, paint, ANCHOR_X, rider, RIDER_HIP };
})();
