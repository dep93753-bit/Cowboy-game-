// Interiors: town buildings you walk into, and abandoned buildings to loot.
// Rooms come in different widths and scroll. Furniture is built to scale
// against the 48px-tall sheriff (1px is about 1.5 inches): doors 56px,
// tables 20px, chairs 26px, wardrobes 52px.
// `img` is the back wall, floor and furniture; `fg` is drawn in front of people
// standing behind counters; `lights` glow after dark.
const Rooms = (() => {
  const FLOOR = 150;
  const OUT = [34, 22, 16];
  const DOOR_H = 56;

  const WOOD_L = [176, 128, 80], WOOD = [134, 90, 54], WOOD_D = [98, 62, 38], IRON = [72, 72, 78], BRASS = [206, 166, 74];
  const sh = U.shade;

  // ------------------------------------------------------------ helpers
  function fbox(p, x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let cc = c;
      if (j === 0) cc = sh(c, 1.2);
      else if (j === h - 1) cc = sh(c, 0.68);
      else if (i === w - 1) cc = sh(c, 0.78);
      else if (i === 0) cc = sh(c, 1.06);
      p.put(x + i, y + j, cc);
    }
  }
  function panel(p, x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let cc = sh(c, 0.94);
      if (j === 0 || i === 0) cc = sh(c, 0.7);
      else if (j === h - 1 || i === w - 1) cc = sh(c, 1.18);
      p.put(x + i, y + j, cc);
    }
  }
  const knob = (p, x, y, c = BRASS) => { p.put(x, y, c); p.put(x + 1, y, sh(c, 0.7)); };
  // make a w x h piece of furniture; draw() gets a pix with a 1px margin
  function mk(w, h, draw, out = OUT) {
    const p = U.pix(w + 2, h + 2);
    draw(p, (x, y) => [x + 1, y + 1]);
    if (out) Props.outline(p, out);
    return p.done();
  }
  const at = (p, f) => ({ box: (x, y, w, h, c) => fbox(p, x + 1, y + 1, w, h, c), panel: (x, y, w, h, c) => panel(p, x + 1, y + 1, w, h, c),
    put: (x, y, c, a) => p.put(x + 1, y + 1, c, a), knob: (x, y, c) => knob(p, x + 1, y + 1, c) });

  // ---------------------------------------------------------- furniture
  const FUR = {};
  FUR.table = (w = 40, col = WOOD) => mk(w, 20, p => { const d = at(p);
    d.box(0, 0, w, 3, sh(col, 1.1)); d.box(2, 3, w - 4, 3, col);
    for (const lx of [2, w - 5]) d.box(lx, 6, 3, 14, sh(col, 0.85)); });
  FUR.chair = (col = WOOD) => mk(12, 26, p => { const d = at(p);
    d.box(0, 0, 2, 26, col); for (const sy of [3, 8]) d.box(2, sy, 3, 2, col);
    d.box(0, 13, 12, 2, sh(col, 1.1)); d.box(10, 15, 2, 11, sh(col, 0.85)); d.box(2, 15, 1, 11, sh(col, 0.75)); });
  FUR.rocker = () => mk(14, 26, p => { const d = at(p);
    d.box(0, 0, 2, 22, WOOD_D); for (const sy of [3, 7, 11]) d.box(2, sy, 2, 2, WOOD_D);
    d.box(0, 12, 12, 2, WOOD); d.box(9, 14, 2, 8, WOOD_D);
    for (let x = 0; x < 14; x++) d.put(x, 23 + Math.round(Math.abs(x - 6) / 4), WOOD_D); });
  FUR.bed = (w = 56, blanket = [150, 56, 48], old = false) => mk(w, 30, p => { const d = at(p);
    d.box(0, 0, 4, 30, WOOD_D); d.box(w - 4, 10, 4, 20, WOOD_D);
    d.box(4, 15, w - 8, 6, [222, 216, 198]);
    for (let x = 12; x < w - 4; x++) for (let y = 16; y < 22; y++) d.put(x, y, (x + y) % 6 < 3 ? blanket : sh(blanket, 0.85));
    d.box(5, 12, 9, 4, [236, 232, 220]);
    if (old) for (let i = 0; i < 6; i++) d.put(20 + i * 5, 18 + (i % 2), [70, 50, 40]);
    d.box(4, 22, w - 8, 3, WOOD); d.box(4, 25, 3, 5, WOOD_D); d.box(w - 7, 25, 3, 5, WOOD_D); });
  FUR.cot = () => mk(50, 12, p => { const d = at(p);
    d.box(0, 3, 50, 3, [90, 96, 70]); d.box(2, 1, 12, 3, [230, 224, 206]);
    for (const lx of [1, 24, 46]) d.box(lx, 6, 2, 6, IRON); });
  FUR.dresser = open => mk(30, 28, p => { const d = at(p);
    d.box(0, 0, 30, 3, sh(WOOD, 1.15)); d.box(1, 3, 28, 23, WOOD);
    for (let k = 0; k < 3; k++) {
      const y = 5 + k * 7;
      if (open && k === 0) { for (let x = 3; x < 27; x++) for (let yy = y; yy < y + 6; yy++) d.put(x, yy, [30, 20, 14]); d.panel(2, y + 2, 26, 6, sh(WOOD, 1.1)); d.knob(14, y + 5); }
      else { d.panel(3, y, 24, 6, WOOD); d.knob(14, y + 3); }
    }
    d.box(1, 26, 3, 2, WOOD_D); d.box(26, 26, 3, 2, WOOD_D); });
  FUR.wardrobe = open => mk(30, 52, p => { const d = at(p);
    d.box(0, 0, 30, 3, sh(WOOD_D, 1.2)); d.box(1, 3, 28, 46, WOOD_D);
    d.panel(3, 5, 11, 41, WOOD_D);
    if (open) {
      for (let x = 16; x < 27; x++) for (let y = 5; y < 46; y++) d.put(x, y, [22, 14, 10]);
      for (const [cx, col] of [[17, [120, 40, 40]], [20, [60, 70, 110]], [23, [140, 120, 80]]]) for (let y = 8; y < 30; y++) d.put(cx, y, col), d.put(cx + 1, y, sh(col, 0.8));
      for (let y = 5; y < 46; y++) d.put(28, y, sh(WOOD_D, 1.2)), d.put(29, y, WOOD_D);
    } else d.panel(16, 5, 11, 41, WOOD_D);
    d.knob(13, 26); d.knob(16, 26);
    d.box(1, 49, 4, 3, WOOD_D); d.box(25, 49, 4, 3, WOOD_D); });
  const BOOKS = [[150, 50, 40], [60, 80, 120], [70, 110, 60], [170, 140, 80], [110, 60, 90], [200, 180, 140]];
  FUR.bookshelf = (open, seed = 1) => mk(26, 50, p => { const d = at(p); const r = U.rng(seed);
    d.box(0, 0, 26, 50, WOOD_D);
    for (let s = 0; s < 4; s++) {
      const y0 = 3 + s * 12;
      for (let x = 2; x < 24; x++) for (let y = y0; y < y0 + 10; y++) d.put(x, y, [36, 24, 16]);
      d.box(1, y0 + 10, 24, 2, WOOD);
      let x = 2;
      while (x < 23) {
        const bw = 2 + Math.floor(r() * 2), bh = 6 + Math.floor(r() * 4);
        if (!open || r() < 0.3) { const c = U.pick(r, BOOKS); for (let i = 0; i < bw && x + i < 24; i++) for (let y = y0 + 10 - bh; y < y0 + 10; y++) d.put(x + i, y, i === 0 ? sh(c, 1.15) : c); }
        x += bw + (r() < 0.15 ? 2 : 0);
      }
    } });
  FUR.cupboard = open => mk(26, 48, p => { const d = at(p);
    d.box(0, 0, 26, 3, sh(WOOD, 1.1)); d.box(1, 3, 24, 43, WOOD);
    // glass doors with plates
    for (const gx of [3, 14]) {
      for (let x = gx; x < gx + 9; x++) for (let y = 5; y < 22; y++) d.put(x, y, open && gx === 14 ? [24, 16, 12] : [70, 86, 96]);
      if (!(open && gx === 14)) for (const py of [8, 15]) for (let x = gx + 1; x < gx + 8; x++) d.put(x, py, [226, 222, 210]);
      d.put(gx, 5, sh(WOOD, 0.7));
    }
    d.box(1, 23, 24, 2, sh(WOOD, 1.1));
    d.panel(3, 26, 9, 17, WOOD); d.panel(14, 26, 9, 17, WOOD); d.knob(11, 34); d.knob(14, 34);
    d.box(1, 46, 3, 2, WOOD_D); d.box(22, 46, 3, 2, WOOD_D); });
  FUR.desk = open => mk(40, 20, p => { const d = at(p);
    d.box(0, 0, 40, 3, sh(WOOD_D, 1.25)); d.box(1, 3, 12, 17, WOOD_D); d.box(27, 3, 12, 17, WOOD_D);
    for (let x = 13; x < 27; x++) for (let y = 3; y < 6; y++) d.put(x, y, WOOD_D);
    for (const k of [0, 1, 2]) { d.panel(2, 5 + k * 5, 10, 4, WOOD_D); d.knob(6, 7 + k * 5); d.panel(28, 5 + k * 5, 10, 4, WOOD_D); d.knob(32, 7 + k * 5); }
    if (open) { for (let x = 2; x < 12; x++) d.put(x, 5, [20, 14, 10]); d.panel(3, 7, 12, 4, sh(WOOD_D, 1.15)); } });
  FUR.stove = open => mk(22, 24, p => { const d = at(p);
    d.box(0, 2, 22, 3, sh(IRON, 1.2)); d.box(1, 5, 20, 15, IRON);
    d.panel(4, 7, 14, 9, IRON);
    if (open) { for (let x = 5; x < 17; x++) for (let y = 8; y < 15; y++) d.put(x, y, [24, 18, 18]); for (let x = 5; x < 17; x++) d.put(x, 16, sh(IRON, 1.3)); }
    else { d.box(8, 10, 6, 1, BRASS); for (const vx of [7, 10, 13]) d.put(vx, 13, [230, 120, 50]); }
    for (const lx of [2, 18]) d.box(lx, 20, 2, 4, IRON);
    d.box(14, 0, 4, 2, IRON); });
  FUR.barrel = open => mk(16, 24, p => { const d = at(p);
    for (let y = 0; y < 24; y++) {
      const bulge = Math.round(Math.sin((y / 23) * Math.PI) * 2);
      for (let x = 2 - bulge; x < 14 + bulge; x++) {
        let c = (x % 4 === 0) ? sh(WOOD, 0.8) : WOOD;
        if (y === 3 || y === 4 || y === 19 || y === 20 || y === 11) c = [70, 66, 66];
        if (x > 10 + bulge) c = sh(c, 0.8);
        d.put(x, y, c);
      }
    }
    for (let x = 2; x < 14; x++) d.put(x, 0, open ? [24, 16, 12] : sh(WOOD, 1.25));
    if (open) for (let x = 3; x < 13; x++) d.put(x, 1, [24, 16, 12]); });
  FUR.crate = open => mk(18, 16, p => { const d = at(p);
    d.box(0, open ? 2 : 0, 18, open ? 14 : 16, WOOD_L);
    if (open) { for (let x = 2; x < 16; x++) for (let y = 3; y < 6; y++) d.put(x, y, [36, 24, 14]); for (let x = -1; x < 15; x++) d.put(x + Math.round(x / 6), Math.round(x * 0.12), sh(WOOD_L, 1.1)); }
    for (let i = 1; i < 15; i++) { d.put(1 + i, (open ? 4 : 2) + Math.round(i * (open ? 0.75 : 0.85)), sh(WOOD_L, 0.75)); d.put(16 - i, (open ? 4 : 2) + Math.round(i * (open ? 0.75 : 0.85)), sh(WOOD_L, 0.75)); }
    for (const y of [5, 10]) for (let x = 0; x < 18; x++) d.put(x, y + (open ? 1 : 0), sh(WOOD_L, 0.85)); });
  FUR.trunk = open => mk(26, open ? 22 : 15, p => { const d = at(p);
    const y0 = open ? 7 : 0;
    if (open) { d.box(0, 0, 26, 6, sh(WOOD_D, 1.1)); for (let x = 1; x < 25; x++) d.put(x, 6, [24, 16, 12]); }
    else { d.box(0, 0, 26, 5, sh(WOOD_D, 1.1)); for (let x = 2; x < 24; x++) d.put(x, 0, sh(WOOD_D, 1.3)); }
    d.box(0, y0 + 5, 26, 10, WOOD_D);
    for (const sx of [5, 19]) for (let y = 0; y < 15 + (open ? 7 : 0); y++) d.put(sx, y, [60, 50, 40]);
    d.box(11, y0 + 4, 4, 4, BRASS); });
  FUR.pot = open => mk(14, 16, p => { const d = at(p);
    const clay = [182, 104, 62];
    for (let y = 2; y < 16; y++) {
      const half = y < 4 ? 3 : Math.round(3 + Math.sin(((y - 3) / 12) * Math.PI) * 4);
      for (let x = 7 - half; x < 7 + half; x++) d.put(x, y, x > 7 + half - 3 ? sh(clay, 0.78) : y === 8 ? [220, 180, 120] : clay);
    }
    if (open) for (let x = 4; x < 10; x++) d.put(x, 2, [30, 20, 14]); else for (let x = 3; x < 11; x++) d.put(x, 1, sh(clay, 1.2)), d.put(x, 0, sh(clay, 0.9)); });
  FUR.sacks = open => mk(24, 16, p => { const d = at(p);
    const S = [204, 180, 134];
    for (const [sx, sw, sy] of open ? [[0, 12, 6]] : [[0, 12, 2], [10, 13, 4]]) for (let y = sy; y < 16; y++) for (let x = sx; x < sx + sw; x++) {
      const e = y === sy || x === sx || x === sx + sw - 1;
      d.put(x, y, e ? sh(S, 0.8) : (x + y) % 7 === 0 ? sh(S, 0.9) : S);
    }
    if (open) for (let x = 11; x < 24; x++) for (let y = 13; y < 16; y++) if ((x + y) % 3) d.put(x, y, [226, 206, 150]); });
  FUR.hay = open => mk(28, 16, p => { const d = at(p);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 28; x++) {
      if (open && x > 9 && x < 19 && y < 7) continue;
      let c = (x * 3 + y * 7) % 5 === 0 ? [190, 160, 76] : [222, 192, 104];
      if (y === 0) c = [238, 212, 132];
      if (x === 8 || x === 19) c = [150, 100, 60];
      d.put(x, y, c);
    } }, [120, 90, 40]);
  FUR.offering = open => mk(12, 24, p => { const d = at(p);
    d.box(0, open ? 0 : 3, 12, 3, sh(WOOD, 1.2)); d.box(1, 6, 10, 8, WOOD); d.box(5, 3 + (open ? 3 : 0), 2, 1, [20, 14, 10]);
    d.box(4, 14, 4, 10, WOOD_D); d.box(2, 22, 8, 2, WOOD_D); d.put(5, 9, BRASS); d.put(6, 9, BRASS); });
  FUR.washstand = open => mk(22, 30, p => { const d = at(p);
    d.box(0, 8, 22, 3, sh(WOOD, 1.1)); d.box(1, 11, 20, 15, WOOD);
    d.panel(3, 13, 16, 5, WOOD); d.knob(10, 15);
    if (open) { for (let x = 3; x < 19; x++) d.put(x, 13, [20, 14, 10]); }
    d.panel(3, 19, 16, 6, WOOD); d.box(1, 26, 3, 4, WOOD_D); d.box(18, 26, 3, 4, WOOD_D);
    for (let x = 4; x < 18; x++) d.put(x, 7, [220, 224, 230]); for (let x = 6; x < 16; x++) d.put(x, 6, [190, 196, 204]);
    d.box(13, 0, 5, 6, [214, 220, 230]); d.put(18, 2, [214, 220, 230]); });
  // searchable kinds: closed/open pairs
  const SEARCH = {};
  for (const k of ['dresser', 'wardrobe', 'bookshelf', 'cupboard', 'desk', 'stove', 'barrel', 'crate', 'trunk', 'pot', 'sacks', 'hay', 'offering', 'washstand']) {
    SEARCH[k] = { closed: FUR[k](false), open: FUR[k](true) };
  }

  FUR.clock = () => mk(12, 54, p => { const d = at(p);
    d.box(0, 0, 12, 4, sh(WOOD_D, 1.2)); d.box(1, 4, 10, 48, WOOD_D);
    for (let y = 6; y < 16; y++) for (let x = 2; x < 10; x++) if (Math.hypot(x - 5.5, y - 10.5) < 4) d.put(x, y, [236, 230, 210]);
    d.put(5, 8, [30, 20, 14]); d.put(5, 9, [30, 20, 14]); d.put(6, 10, [30, 20, 14]);
    for (let x = 3; x < 9; x++) for (let y = 19; y < 44; y++) d.put(x, y, [40, 28, 20]);
    d.box(5, 34, 2, 4, BRASS); for (let y = 19; y < 34; y++) d.put(6, y, BRASS);
    d.box(0, 52, 12, 2, WOOD_D); });
  FUR.fireplace = (lit = true) => mk(48, 46, p => { const d = at(p);
    const stones = [[150, 140, 130], [130, 120, 112], [166, 156, 144]];
    for (let y = 8; y < 46; y++) for (let x = 0; x < 48; x++) {
      const row = Math.floor(y / 5), col = Math.floor((x + (row % 2) * 4) / 8);
      let c = stones[(row * 3 + col) % 3];
      if (y % 5 === 0 || (x + (row % 2) * 4) % 8 === 0) c = [92, 86, 80];
      d.put(x, y, c);
    }
    for (let y = 24; y < 46; y++) for (let x = 11; x < 37; x++) d.put(x, y, y < 27 ? [60, 54, 50] : [22, 16, 14]);
    for (let x = 14; x < 34; x++) { d.put(x, 43, [90, 60, 40]); d.put(x, 44, [70, 46, 30]); }
    if (lit) for (let x = 16; x < 32; x++) { const fh = 3 + Math.round(5 * Math.abs(Math.sin(x * 0.9))); for (let y = 43 - fh; y < 43; y++) d.put(x, y, y > 40 ? [255, 214, 120] : [232, 110, 50]); }
    d.box(-1, 2, 50, 4, WOOD_D); d.box(1, 0, 46, 2, WOOD);
    d.box(6, -6 + 6, 4, 2, BRASS); d.box(38, 0, 3, 2, [200, 200, 210]); });
  FUR.piano = () => mk(42, 36, p => { const d = at(p);
    d.box(0, 0, 42, 3, sh([70, 40, 30], 1.3)); d.box(1, 3, 40, 14, [70, 40, 30]);
    d.panel(4, 5, 14, 9, [70, 40, 30]); d.panel(24, 5, 14, 9, [70, 40, 30]);
    d.box(0, 17, 42, 2, [40, 24, 18]);
    for (let x = 1; x < 41; x++) { d.put(x, 19, [236, 230, 214]); d.put(x, 20, x % 3 === 0 ? [30, 26, 26] : [236, 230, 214]); }
    d.box(1, 21, 40, 6, [70, 40, 30]);
    d.box(2, 27, 3, 9, [56, 32, 24]); d.box(37, 27, 3, 9, [56, 32, 24]);
    d.box(8, 0 - 0, 2, 0 + 1, BRASS); });
  FUR.counter = (w, col = [116, 76, 44], top = [170, 124, 76]) => mk(w, 28, p => { const d = at(p);
    d.box(0, 0, w, 3, top); d.box(0, 3, w, 25, col);
    for (let x = 3; x + 18 < w; x += 22) d.panel(x, 6, 18, 17, col); });
  FUR.pew = () => mk(46, 26, p => { const d = at(p);
    d.box(0, 0, 3, 26, WOOD_D); d.box(43, 6, 3, 20, WOOD_D);
    d.box(3, 2, 40, 2, WOOD); d.box(3, 6, 40, 2, WOOD); d.box(0, 13, 46, 3, WOOD); d.box(20, 16, 3, 10, WOOD_D); });
  FUR.altar = () => mk(32, 32, p => { const d = at(p);
    for (const cx of [4, 27]) { d.box(cx, 0, 1, 2, [255, 210, 110]); d.box(cx - 1, 2, 3, 4, [236, 232, 220]); }
    d.box(0, 6, 32, 3, [226, 220, 204]); d.box(1, 9, 30, 21, [140, 40, 44]);
    for (let y = 12; y < 26; y++) d.put(15, y, [240, 200, 80]), d.put(16, y, [240, 200, 80]);
    for (let x = 11; x < 21; x++) d.put(x, 16, [240, 200, 80]);
    d.box(0, 30, 32, 2, WOOD_D); });
  FUR.bench = (w = 40) => mk(w, 13, p => { const d = at(p); d.box(0, 0, w, 3, WOOD); d.box(2, 3, 3, 10, WOOD_D); d.box(w - 5, 3, 3, 10, WOOD_D); });
  FUR.coatRack = () => mk(16, 48, p => { const d = at(p);
    d.box(7, 2, 2, 44, WOOD_D); d.box(3, 46, 10, 2, WOOD_D);
    d.box(2, 0, 12, 2, WOOD_D);
    for (let y = 4; y < 26; y++) for (let x = 9; x < 14; x++) d.put(x, y, x === 9 ? [70, 50, 40] : [96, 70, 52]);
    d.box(0, 1, 7, 3, [70, 60, 50]); d.box(1, -1 + 1, 5, 1, [90, 80, 70]); });
  FUR.spittoon = () => mk(7, 6, p => { const d = at(p); d.box(0, 0, 7, 2, BRASS); d.box(1, 2, 5, 4, sh(BRASS, 0.8)); });
  FUR.lamp = () => mk(6, 9, p => { const d = at(p); d.box(1, 0, 4, 1, [190, 200, 210]); d.box(1, 1, 4, 4, [255, 220, 120]); d.box(2, 5, 2, 2, BRASS); d.box(0, 7, 6, 2, BRASS); });
  FUR.candle = () => mk(3, 7, p => { const d = at(p); d.put(1, 0, [255, 210, 110]); d.box(0, 1, 3, 6, [236, 232, 220]); });
  FUR.bucket = () => mk(10, 9, p => { const d = at(p); for (let x = 0; x < 10; x++) d.put(x, 0, [80, 80, 86]); d.box(1, 1, 8, 8, WOOD_L); d.box(1, 2, 8, 1, [80, 80, 86]); d.box(1, 6, 8, 1, [80, 80, 86]); });
  FUR.rug = (w = 70, col = [140, 50, 44]) => mk(w, 5, p => { const d = at(p);
    for (let y = 0; y < 5; y++) for (let x = 0; x < w; x++) d.put(x, y, y === 0 || y === 4 || x < 2 || x > w - 3 ? [210, 180, 110] : (x + y * 3) % 8 < 2 ? [60, 70, 110] : col); }, null);
  FUR.frame = (w, h, seed) => mk(w, h, p => { const d = at(p); const r = U.rng(seed);
    d.box(0, 0, w, h, [150, 110, 60]);
    const sky = U.pick(r, [[130, 160, 190], [200, 150, 110], [150, 170, 140]]);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) d.put(x, y, y < h * 0.55 ? sky : [120, 100, 70]);
    if (r() < 0.5) for (let x = 3; x < w - 3; x++) { const t = Math.round(h * 0.55 - 3 * Math.sin(x / 3)); d.put(x, t, [90, 70, 60]); }
    else { d.box(w / 2 - 2, h * 0.3, 4, 5, [200, 160, 130]); d.box(w / 2 - 3, h * 0.3 + 5, 6, 4, [60, 50, 60]); } });
  FUR.wallShelf = (w, seed, items = 'mixed') => mk(w, 14, p => { const d = at(p); const r = U.rng(seed);
    d.box(0, 11, w, 2, WOOD); d.box(2, 13, 2, 1, WOOD_D); d.box(w - 4, 13, 2, 1, WOOD_D);
    const cols = [[200, 60, 50], [70, 120, 60], [220, 200, 120], [90, 110, 160], [150, 100, 60], [230, 230, 220]];
    if (items !== 'none') for (let x = 1; x < w - 4; x += 4 + Math.floor(r() * 3)) {
      if (r() < 0.2) continue;
      const k = items === 'cans' ? 1 : items === 'jars' ? 2 : Math.floor(r() * 3), c = U.pick(r, cols);
      if (k === 0) { d.box(x, 3, 3, 8, sh(c, 0.7)); d.put(x + 1, 1, c); d.put(x + 1, 2, c); }
      else if (k === 1) { d.box(x, 5, 4, 6, [150, 150, 156]); d.box(x, 7, 4, 2, c); }
      else { d.box(x, 4, 4, 7, [210, 220, 230]); d.box(x + 1, 6, 2, 4, c); d.box(x, 3, 4, 1, WOOD_D); }
    } }, null);
  FUR.mirror = w => mk(w, 28, p => { const d = at(p);
    for (let y = 0; y < 28; y++) for (let x = 0; x < w; x++) d.put(x, y, x < 2 || x >= w - 2 || y < 2 || y >= 26 ? BRASS : (x + y) % 9 < 2 ? [176, 192, 200] : [120, 136, 150]); });
  FUR.bottles = (w, seed) => mk(w, 12, p => { const d = at(p); const r = U.rng(seed);
    const cols = [[74, 122, 58], [138, 74, 42], [200, 176, 96], [58, 74, 122], [160, 58, 48], [224, 224, 216]];
    for (let x = 0; x < w - 3; x += 4) { const c = U.pick(r, cols), h = 6 + Math.floor(r() * 5); d.box(x, 12 - h, 3, h, c); d.box(x + 1, 12 - h - 2, 1, 2, c); } }, null);
  FUR.chandelier = () => mk(32, 16, p => { const d = at(p);
    d.box(15, 0, 2, 8, [90, 74, 58]); d.box(3, 8, 26, 2, BRASS);
    for (const cx of [4, 10, 21, 27]) { d.box(cx, 4, 2, 4, [236, 230, 210]); d.put(cx, 2, [255, 214, 110]); d.put(cx, 3, [255, 214, 110]); }
    for (const cx of [3, 28]) d.put(cx, 10, BRASS); }, null);
  // Staircase rising to the right: treads and risers, a closed panelled
  // underside, spindles under a handrail, a newel post and a top landing.
  FUR.stairs = (n = 12, run = 7, rise = 7) => {
    const landing = 22, w = n * run + landing, h = n * rise;
    return mk(w, h + 30, p => { const d = at(p);
      const oy = 30; // room above the steps for the handrail
      const railY = x => oy + h - rise - 24 - (x - run / 2) * (rise / run);
      // underside panelling
      for (let i = 0; i < n; i++) {
        const top = oy + h - (i + 1) * rise;
        for (let x = i * run; x < (i + 1) * run; x++) for (let y = top; y < oy + h; y++) {
          let c = sh(WOOD_D, 0.9);
          if ((x % 21 === 0 || (y - oy) % 24 === 0) && y > top + rise) c = sh(WOOD_D, 0.7);
          d.put(x, y, c);
        }
        // tread + riser
        for (let x = i * run; x < (i + 1) * run + 1; x++) { d.put(x, top, sh(WOOD_L, 1.15)); d.put(x, top + 1, WOOD_L); d.put(x, top + 2, sh(WOOD, 0.8)); }
        for (let y = top; y < top + rise; y++) d.put(i * run, y, sh(WOOD, 0.75));
      }
      // landing
      for (let x = n * run; x < w; x++) for (let y = oy; y < oy + h; y++) d.put(x, y, y < oy + 3 ? (y === oy ? sh(WOOD_L, 1.15) : WOOD_L) : sh(WOOD_D, 0.85));
      // spindles and handrail
      for (let i = 0; i < n; i++) {
        const bx = Math.round(i * run + run / 2), top = oy + h - (i + 1) * rise;
        for (let y = Math.round(railY(bx)); y < top; y++) d.put(bx, y, WOOD_D);
      }
      for (let x = 0; x < n * run; x++) { const y = Math.round(railY(x)); d.put(x, y, sh(WOOD, 1.2)); d.put(x, y + 1, WOOD_D); }
      const ly = Math.round(railY(n * run));
      for (let x = n * run; x < w; x++) { d.put(x, ly, sh(WOOD, 1.2)); d.put(x, ly + 1, WOOD_D); }
      for (let x = n * run + 4; x < w; x += 6) for (let y = ly + 2; y < oy; y++) d.put(x, y, WOOD_D);
      // newel post
      const ny = Math.round(railY(0)) - 2;
      d.box(0, ny, 4, oy + h - ny, WOOD_D); d.box(-1, ny - 2, 6, 3, sh(WOOD_D, 1.3));
    });
  };
  FUR.cellBars = (w, h = 72) => mk(w, h, p => { const d = at(p);
    for (let x = 0; x < w; x += 6) for (let y = 0; y < h; y++) { d.put(x, y, [70, 70, 78]); d.put(x + 1, y, [44, 44, 50]); }
    for (const y of [0, 1, 34, 35, h - 2, h - 1]) for (let x = 0; x < w; x++) d.put(x, y, y % 2 ? [44, 44, 50] : [90, 90, 98]);
    d.box(w - 10, 30, 4, 6, BRASS); }, null);
  FUR.vault = () => mk(76, 80, p => { const d = at(p);
    for (let y = 0; y < 80; y++) for (let x = 0; x < 76; x++) { const r = Math.hypot(x - 38, y - 40); if (r < 37) d.put(x, y, r > 34 ? [70, 70, 76] : r > 31 ? [128, 128, 136] : [24, 22, 24]); }
    for (const sy of [24, 40, 56]) for (let x = 14; x < 62; x++) d.put(x, sy, [90, 70, 50]);
    for (let y = 8; y < 74; y++) for (let x = 66; x < 76; x++) d.put(x, y, x === 66 ? [60, 60, 66] : [152, 152, 160]);
    d.box(69, 34, 5, 12, [100, 100, 108]); }, null);
  FUR.tellerCage = w => mk(w, 36, p => { const d = at(p);
    for (let x = 0; x < w; x += 5) for (let y = 0; y < 36; y++) d.put(x, y, BRASS);
    for (let x = 0; x < w; x++) { d.put(x, 0, sh(BRASS, 1.2)); d.put(x, 1, BRASS); d.put(x, 18, BRASS); }
    for (let x = 20; x < 32; x++) for (let y = 24; y < 36; y++) d.put(x, y, [0, 0, 0], 0); }, null);
  FUR.stall = (w = 64) => mk(w, 30, p => { const d = at(p);
    for (const px of [0, w - 4]) d.box(px, 0, 4, 30, WOOD_D);
    for (const ry of [2, 12, 20]) d.box(4, ry, w - 8, 3, WOOD); });
  FUR.saddleRack = () => mk(18, 26, p => { const d = at(p);
    d.box(2, 2, 14, 5, [110, 66, 36]); d.box(5, 0, 8, 3, [130, 80, 44]); d.box(1, 7, 16, 4, [170, 52, 44]);
    d.box(1, 11, 16, 3, WOOD); d.box(2, 14, 3, 12, WOOD_D); d.box(13, 14, 3, 12, WOOD_D); d.put(8, 13, [200, 200, 210]); d.put(8, 14, [200, 200, 210]); });
  FUR.tools = () => mk(32, 36, p => { const d = at(p);
    d.box(0, 2, 32, 2, WOOD_D);
    d.box(4, 4, 2, 28, WOOD_L); d.box(1, 30, 8, 5, IRON);
    d.box(14, 4, 2, 24, WOOD_L); d.box(11, 26, 8, 2, IRON); for (const tx of [11, 14, 17]) d.box(tx, 28, 1, 4, IRON);
    d.box(25, 4, 2, 26, WOOD_L); d.box(23, 29, 7, 4, IRON); }, null);
  FUR.anvil = () => mk(18, 14, p => { const d = at(p); d.box(0, 0, 18, 3, IRON); d.box(4, 3, 9, 4, IRON); d.box(2, 7, 13, 2, IRON); d.box(5, 9, 8, 5, WOOD_D); });
  FUR.blanket = () => mk(30, 22, p => { const d = at(p);
    const cols = [[170, 50, 40], [230, 200, 140], [40, 70, 110], [230, 200, 140]];
    for (let y = 0; y < 22; y++) for (let x = 0; x < 30; x++) { let c = cols[Math.floor(y / 3) % 4]; if (Math.abs((x % 10) - 5) + Math.abs((y % 11) - 5) === 3) c = [30, 30, 30]; d.put(x, y, c); } }, null);
  FUR.ristra = () => mk(6, 26, p => { const d = at(p); d.box(2, 0, 1, 4, [122, 90, 58]); for (let i = 0; i < 9; i++) d.box(i % 2 ? 0 : 2, 4 + i * 2, 4, 3, i % 2 ? [176, 42, 32] : [208, 58, 40]); }, null);
  FUR.stained = () => mk(24, 38, p => { const d = at(p);
    const cols = [[180, 50, 50], [60, 90, 170], [220, 180, 60], [70, 140, 80], [140, 70, 160]];
    for (let y = 0; y < 38; y++) for (let x = 0; x < 24; x++) {
      if (y < 12 && Math.hypot(x - 11.5, y - 12) > 12) continue;
      const edge = x < 2 || x > 21 || y > 35 || (y < 12 && Math.hypot(x - 11.5, y - 12) > 10);
      const lead = (x + y) % 7 === 0 || (x - y + 42) % 7 === 0;
      d.put(x, y, edge ? [70, 48, 32] : lead ? [40, 34, 34] : cols[(Math.floor(x / 4) + Math.floor(y / 5)) % 5]);
    }
    for (let y = 22; y < 29; y++) for (let x = 13; x < 18; x++) d.put(x, y, [0, 0, 0], 0); }, null);
  FUR.poster = wanted => mk(18, 22, p => { const d = at(p);
    d.box(0, 0, 18, 22, [232, 214, 168]); d.box(3, 2, 12, 2, [90, 58, 34]);
    if (wanted) { d.box(4, 6, 10, 2, [42, 32, 32]); d.box(6, 4, 6, 2, [42, 32, 32]); d.box(6, 8, 6, 6, [200, 154, 112]); d.put(7, 10, [30, 20, 20]); d.put(10, 10, [30, 20, 20]); d.put(9, 12, [210, 210, 220]); }
    else for (let y = 6; y < 15; y += 2) d.box(3, y, 12, 1, [138, 106, 74]);
    d.box(3, 16, 12, 1, [90, 58, 34]); d.box(4, 18, 10, 1, [90, 58, 34]); }, [90, 70, 50]);
  FUR.papers = () => mk(8, 3, p => { const d = at(p); d.box(0, 1, 8, 2, [236, 230, 210]); d.box(2, 0, 4, 1, [226, 220, 200]); }, null);
  FUR.jars = () => mk(30, 10, p => { const d = at(p);
    [[224, 80, 80], [240, 208, 80], [112, 192, 96], [224, 128, 192]].forEach((c, i) => { d.box(i * 7, 1, 6, 9, [214, 226, 236]); d.box(i * 7 + 1, 4, 4, 5, c); d.box(i * 7, 0, 6, 2, WOOD_D); }); }, null);
  FUR.scale = () => mk(16, 12, p => { const d = at(p); d.box(7, 2, 2, 8, BRASS); d.box(0, 2, 16, 1, BRASS); d.box(0, 3, 5, 2, sh(BRASS, 0.8)); d.box(11, 3, 5, 2, sh(BRASS, 0.8)); d.box(4, 10, 8, 2, WOOD_D); }, null);
  FUR.cloth = () => mk(20, 12, p => { const d = at(p); [[170, 60, 60], [60, 110, 150], [220, 200, 150], [90, 140, 90]].forEach((c, i) => d.box(i * 5, 0, 5, 12, c)); });
  FUR.lantern = () => mk(8, 12, p => { const d = at(p); d.box(3, 0, 2, 2, IRON); d.box(1, 2, 6, 2, IRON); d.box(1, 4, 6, 6, [255, 210, 110]); d.box(1, 10, 6, 2, IRON); }, null);
  FUR.safe = () => mk(22, 26, p => { const d = at(p); d.box(0, 0, 22, 26, [50, 56, 54]); d.panel(3, 3, 16, 20, [50, 56, 54]); d.box(9, 10, 4, 4, BRASS); d.put(16, 13, [220, 220, 220]); });
  FUR.roundTable = () => mk(26, 20, p => { const d = at(p); d.box(0, 0, 26, 3, WOOD); d.box(2, 3, 22, 1, WOOD_D); d.box(11, 4, 4, 13, WOOD_D); d.box(5, 17, 16, 3, WOOD_D); });
  FUR.cards = () => mk(10, 2, p => { const d = at(p); d.box(0, 0, 4, 2, [236, 236, 230]); d.box(5, 0, 4, 2, [236, 236, 230]); d.put(2, 0, [200, 40, 40]); }, null);
  FUR.bottle = () => mk(3, 9, p => { const d = at(p); d.box(1, 0, 1, 3, [74, 122, 58]); d.box(0, 3, 3, 6, [74, 122, 58]); }, null);
  FUR.banjoChair = () => FUR.chair(WOOD_D);
  FUR.hatPeg = () => mk(30, 10, p => { const d = at(p); d.box(0, 0, 30, 2, WOOD_D); d.box(3, 2, 8, 3, [70, 60, 50]); d.box(5, 1, 4, 1, [90, 80, 70]); d.box(18, 2, 3, 8, [110, 60, 40]); d.box(24, 2, 2, 6, [160, 150, 120]); }, null);

  // ------------------------------------------------------------- walls
  function wallPlanks(p, r, w, cols, old = true) {
    for (let x = 0; x < w; x++) {
      const c = cols[(Math.floor(x / 7) * 5) % cols.length];
      for (let y = 14; y < FLOOR; y++) {
        let cc = c;
        if (x % 7 === 0) cc = sh(c, 0.55); else if (x % 7 === 1) cc = sh(c, 1.1);
        else if (old && r() < 0.05) cc = sh(c, 0.85);
        p.put(x, y, cc);
      }
    }
    if (old) for (let i = 0; i < w / 45; i++) {
      const gx = Math.floor(r() * w / 7) * 7, gy = 26 + Math.floor(r() * 80), gl = 5 + Math.floor(r() * 16);
      for (let y = gy; y < gy + gl; y++) p.put(gx, y, [220, 190, 140]);
    }
  }
  function wallLogs(p, r, w) {
    const logs = [[128, 88, 54], [116, 78, 46], [136, 96, 60]];
    for (let y = 14; y < FLOOR; y++) {
      const i = Math.floor((y - 14) / 10), ly = (y - 14) % 10, c = logs[i % 3];
      for (let x = 0; x < w; x++) {
        let cc = c;
        if (ly === 0) cc = [196, 170, 130]; else if (ly === 1) cc = sh(c, 1.22); else if (ly >= 8) cc = sh(c, 0.7);
        else if ((x + i * 13) % 37 === 0) cc = sh(c, 0.8);
        p.put(x, y, cc);
      }
    }
  }
  function wallPaper(p, r, w, base, opts = {}) {
    const stripe = sh(base, 0.9), motif = opts.motif || sh(base, 1.18);
    for (let y = 14; y < FLOOR; y++) for (let x = 0; x < w; x++) {
      let c = Math.floor(x / 8) % 2 ? base : stripe;
      const mx = x % 16, my = (y + (Math.floor(x / 16) % 2) * 7) % 14;
      if (Math.abs(mx - 8) + Math.abs(my - 7) === 3) c = motif;
      p.put(x, y, c);
    }
    const wood = opts.wood || [104, 66, 40];
    for (let y = 112; y < FLOOR; y++) for (let x = 0; x < w; x++) {
      let c = wood;
      if (y === 112 || y === 113) c = sh(wood, y === 112 ? 1.3 : 0.7);
      else if (x % 40 === 4 || x % 40 === 36 || y === 118 || y === 145) c = sh(wood, 0.75);
      else if (x % 40 === 5 || y === 119) c = sh(wood, 1.15);
      p.put(x, y, c);
    }
    if (opts.old) {
      for (let i = 0; i < w / 50; i++) {
        const cx = r() * w, cy = 30 + r() * 60, rw = 8 + r() * 18, rh = 10 + r() * 22;
        for (let y = cy - rh; y < cy + rh; y++) for (let x = cx - rw; x < cx + rw; x++) {
          const d = ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2 + r() * 0.25;
          if (d < 1) p.put(x, y, Math.floor(x) % 7 === 0 ? [70, 50, 36] : [118, 88, 60]);
          else if (d < 1.15) p.put(x, y, sh(base, 1.25));
        }
      }
      for (let i = 0; i < w / 60; i++) {
        const sx = Math.floor(r() * w), sl = 20 + r() * 50;
        for (let y = 16; y < 16 + sl; y++) { p.put(sx, y, sh(p.get(sx, y), 0.82)); p.put(sx + 1, y, sh(p.get(sx + 1, y), 0.9)); }
      }
    }
  }
  function wallAdobe(p, r, w) {
    const base = [198, 150, 106];
    for (let y = 14; y < FLOOR; y++) for (let x = 0; x < w; x++) { const n = r(); p.put(x, y, n < 0.08 ? sh(base, 0.93) : n < 0.13 ? sh(base, 1.05) : base); }
    for (let i = 0; i < w / 80; i++) {
      const bx = Math.floor(r() * (w - 40)), by = 30 + Math.floor(r() * 70), bw = 20 + Math.floor(r() * 24), bh = 12 + Math.floor(r() * 14);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
        if ((x - bx - bw / 2) ** 2 / (bw * bw / 4) + (y - by - bh / 2) ** 2 / (bh * bh / 4) > 1.1 + r() * 0.3) continue;
        const row = Math.floor(y / 6);
        p.put(x, y, y % 6 === 0 || (x + (row % 2) * 6) % 12 === 0 ? [150, 110, 80] : [176, 124, 86]);
      }
    }
    for (let i = 0; i < w / 60; i++) { let x = r() * w, y = 20 + r() * 40; for (let k = 0; k < 25; k++) { p.put(x, y, [140, 100, 70]); y++; x += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0; } }
    for (let x = 0; x < w; x++) for (let y = 0; y < 14; y++) p.put(x, y, [70, 48, 32]);
    for (let bx = 10; bx < w; bx += 40) for (let y = 12; y < 20; y++) for (let x = bx; x < bx + 10; x++) p.put(x, y, y === 12 ? [140, 100, 64] : x === bx + 9 ? [70, 48, 32] : [110, 76, 46]);
  }
  function wallBarn(p, r, w) {
    const reds = [[140, 62, 46], [126, 54, 40], [150, 72, 54], [118, 60, 46]];
    for (let x = 0; x < w; x++) {
      const c = reds[(Math.floor(x / 9) * 3) % 4];
      for (let y = 14; y < FLOOR; y++) { let cc = c; if (x % 9 === 0) cc = sh(c, 0.5); else if (r() < 0.06) cc = sh(c, 0.85); else if (r() < 0.02) cc = [170, 140, 110]; p.put(x, y, cc); }
    }
    for (let x = 0; x < w; x++) for (let y = 48; y < 54; y++) p.put(x, y, y === 48 ? [176, 132, 82] : [110, 76, 46]);
    for (let px = 4; px < w; px += 100) for (let y = 54; y < FLOOR; y++) for (let x = px; x < px + 7; x++) p.put(x, y, x === px ? [70, 46, 30] : x === px + 6 ? [80, 54, 34] : [120, 84, 52]);
    for (let x = 0; x < w; x++) if (r() < 0.6) for (let y = 43; y < 48 + r() * 6; y++) p.put(x, y, r() < 0.5 ? [220, 190, 100] : [190, 160, 76]);
  }
  function wallPlaster(p, r, w, clean) {
    const base = [222, 216, 202];
    for (let y = 14; y < FLOOR; y++) for (let x = 0; x < w; x++) p.put(x, y, r() < 0.07 ? sh(base, 0.94) : base);
    if (clean) return;
    for (let i = 0; i < w / 80; i++) {
      const bx = Math.floor(r() * (w - 30)), by = 24 + Math.floor(r() * 70), bw = 14 + Math.floor(r() * 20), bh = 10 + Math.floor(r() * 16);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { if (r() < 0.12) continue; p.put(x, y, y % 3 === 0 ? [90, 66, 46] : [150, 116, 80]); }
    }
    for (let i = 0; i < w / 50; i++) { let x = r() * w, y = 16 + r() * 60; for (let k = 0; k < 30; k++) { p.put(x, y, [170, 164, 150]); y++; x += r() < 0.35 ? 1 : r() < 0.35 ? -1 : 0; } }
  }
  function ceiling(p, w, col = [62, 42, 30]) {
    for (let y = 0; y < 14; y++) for (let x = 0; x < w; x++) p.put(x, y, y > 10 ? sh(col, 0.7) : x % 40 < 3 ? sh(col, 0.8) : col);
  }
  function floorPlanks(p, r, w, col = [122, 90, 60]) {
    for (let y = FLOOR; y < H; y++) for (let x = 0; x < w; x++) {
      const row = Math.floor((y - FLOOR) / 5);
      let c = row % 2 ? col : sh(col, 0.93);
      if ((y - FLOOR) % 5 === 0 || (x + row * 23) % 47 === 0) c = sh(col, 0.62); else if (r() < 0.04) c = sh(c, 0.9);
      p.put(x, y, c);
    }
    for (let x = 0; x < w; x++) { p.put(x, FLOOR - 1, [60, 40, 28]); p.put(x, FLOOR - 2, [140, 104, 70]); }
  }
  function floorDirt(p, r, w, straw) {
    for (let y = FLOOR; y < H; y++) for (let x = 0; x < w; x++) {
      let c = [140, 104, 72]; const n = r();
      if (n < 0.1) c = [124, 90, 62]; else if (n < 0.15) c = [156, 120, 86];
      if (straw && r() < 0.05) c = [210, 180, 96];
      p.put(x, y, c);
    }
    for (let x = 0; x < w; x++) p.put(x, FLOOR - 1, [90, 64, 44]);
  }
  // A window: a hole so the outside shows through. 30x36, sill ~2ft up.
  function windowHole(p, wx, frame, broken, curtains) {
    const wy = FLOOR - 26 - 36, w = 30, h = 36;
    for (let y = wy; y < wy + h; y++) for (let x = wx; x < wx + w; x++) {
      const edge = x < wx + 2 || x >= wx + w - 2 || y < wy + 2 || y >= wy + h - 2 || x === wx + 15 || y === wy + 18;
      if (edge) p.put(x, y, frame); else p.put(x, y, [0, 0, 0], 0);
    }
    for (let x = wx - 2; x < wx + w + 2; x++) { p.put(x, wy + h, sh(frame, 1.25)); p.put(x, wy + h + 1, sh(frame, 0.8)); }
    if (broken) for (let k = 0; k < w; k++) { p.put(wx + k, wy + 8 + Math.floor(k * 0.6), [150, 112, 74]); p.put(wx + k, wy + 9 + Math.floor(k * 0.6), [120, 88, 58]); }
    if (curtains) for (let y = wy - 3; y < wy + h - 6; y++) for (const cx of [wx - 3, wx + w - 1]) for (let i = 0; i < 4; i++) p.put(cx + i, y, (i + y) % 4 === 0 ? sh(curtains, 0.8) : curtains);
    return { x: wx, y: wy, w, h };
  }
  function doorway(p, frame) {
    for (let y = FLOOR - DOOR_H; y < FLOOR; y++) for (let x = 10; x < 38; x++) {
      const f = x < 12 || x >= 36 || y < FLOOR - DOOR_H + 2;
      p.put(x, y, f ? frame : [0, 0, 0], f ? 255 : 0);
    }
    return { x: 12, y: FLOOR - DOOR_H + 2, w: 24, h: DOOR_H - 2 };
  }
  // Interior wall between two rooms, with an open doorway.
  function partition(p, x, frame, wallCol) {
    for (let y = 14; y < FLOOR; y++) for (let i = 0; i < 8; i++) {
      const inDoor = y > FLOOR - DOOR_H && i > 0 && i < 7;
      p.put(x + i, y, inDoor ? sh(wallCol, 0.45) : i === 0 || i === 7 ? frame : sh(wallCol, 0.8));
    }
    for (let i = -2; i < 10; i++) p.put(x + i, FLOOR - DOOR_H, frame);
  }
  function cobwebs(p, w) {
    for (let i = 0; i < 10; i++) { p.put(w - 1 - i, 14 + i, [210, 210, 200]); p.put(w - 1 - i * 2, 14, [200, 200, 190]); p.put(w - 1, 14 + i * 2, [200, 200, 190]); }
    for (let i = 0; i < 7; i++) p.put(40 + i, 14 + i, [210, 210, 200]);
  }

  const place = (ctx, img, x, base = FLOOR + 1) => ctx.drawImage(img, Math.round(x), Math.round(base - img.height + 1));

  // ----------------------------------------------------- abandoned rooms
  // Each plan: room width, wall/floor style, and the furniture in order.
  // Items marked `s:` are searchable (loot spots); the rest is decor.
  const PLANS = {
    shack: r => ({ w: 360, wall: 'planks', floor: 'planks', frame: [70, 48, 32],
      items: ['s:barrel', 'bucket', 's:crate', 'table+chairs', 's:stove', 'bed', 's:trunk', 's:cupboard'], wallItems: ['frame', 'shelf', 'hatPeg'] }),
    farmhouse: r => ({ w: 600, wall: 'paper', paper: U.pick(r, [[130, 118, 90], [126, 104, 104], [110, 120, 104]]), floor: 'planks', frame: [90, 64, 44],
      rooms: [
        { name: 'parlor', items: ['coatRack', 'fireplace', 'rocker', 'rug', 's:bookshelf', 'clock'], wallItems: ['frame', 'frame'] },
        { name: 'kitchen', items: ['s:stove', 'table+chairs', 's:cupboard', 's:barrel', 'bucket'], wallItems: ['shelf', 'shelf'] },
        { name: 'bedroom', items: ['bed', 's:washstand', 's:dresser', 's:wardrobe', 's:trunk'], wallItems: ['frame', 'mirror'] },
      ] }),
    adobe: r => ({ w: 380, wall: 'adobe', floor: 'dirt', frame: [100, 70, 44],
      items: ['s:pot', 's:pot', 'table+chairs', 's:sacks', 'bed', 's:trunk', 's:pot', 'bench'], wallItems: ['blanket', 'ristra', 'ristra', 'shelf'] }),
    barn: r => ({ w: 540, wall: 'barn', floor: 'straw', frame: [80, 50, 34],
      items: ['s:hay', 'stall', 's:crate', 'saddleRack', 's:sacks', 'anvil', 's:barrel', 'stall', 's:hay', 'bucket', 's:trunk'], wallItems: ['tools', 'tools', 'lantern'] }),
    chapel: r => ({ w: 460, wall: 'plaster', floor: 'planks', frame: [90, 70, 50],
      items: ['s:offering', 'pew', 'pew', 'pew', 'candle', 'altar', 's:bookshelf', 's:trunk', 's:cupboard'], wallItems: ['stained', 'stained', 'stained'] }),
    waystation: r => ({ w: 500, wall: 'paper', paper: [116, 120, 100], floor: 'planks', frame: [80, 56, 36],
      items: ['bench', 's:desk', 'clock', 'counter', 's:crate', 's:barrel', 's:sacks', 'table+chairs', 's:cupboard', 'stove', 's:trunk'], wallItems: ['poster', 'poster', 'shelf', 'frame'] }),
  };

  function decorPiece(name, r) {
    switch (name) {
      case 'bucket': return [FUR.bucket()];
      case 'table+chairs': return [FUR.chair(), FUR.table(40), 'flip:chair'];
      case 'bed': return [FUR.bed(56, U.pick(r, [[150, 56, 48], [70, 90, 130], [120, 110, 70]]), true)];
      case 'coatRack': return [FUR.coatRack()];
      case 'fireplace': return [FUR.fireplace(false)];
      case 'rocker': return [FUR.rocker()];
      case 'rug': return ['rug'];
      case 'clock': return [FUR.clock()];
      case 'bench': return [FUR.bench(40)];
      case 'stall': return [FUR.stall(64)];
      case 'saddleRack': return [FUR.saddleRack()];
      case 'anvil': return [FUR.anvil()];
      case 'pew': return [FUR.pew()];
      case 'candle': return [FUR.candle()];
      case 'altar': return [FUR.altar()];
      case 'counter': return [FUR.counter(60, [100, 70, 44], [150, 110, 70])];
      case 'stove': return [FUR.stove(false)];
      default: return [];
    }
  }

  function buildAbandoned(house) {
    const r = U.rng(house.seed * 104729);
    const plan = PLANS[house.type] ? PLANS[house.type](r) : PLANS.shack(r);
    const RW = plan.w;
    const p = U.pix(RW, H);
    ceiling(p, RW, plan.wall === 'barn' ? [70, 40, 30] : [62, 42, 30]);
    if (plan.wall === 'planks') wallPlanks(p, r, RW, [[112, 82, 58], [100, 72, 50], [122, 90, 62], [94, 70, 52]]);
    else if (plan.wall === 'paper') wallPaper(p, r, RW, plan.paper, { old: true, wood: [90, 60, 40] });
    else if (plan.wall === 'adobe') wallAdobe(p, r, RW);
    else if (plan.wall === 'barn') wallBarn(p, r, RW);
    else if (plan.wall === 'plaster') wallPlaster(p, r, RW);
    if (plan.floor === 'dirt') floorDirt(p, r, RW, false);
    else if (plan.floor === 'straw') floorDirt(p, r, RW, true);
    else floorPlanks(p, r, RW);

    const rooms = plan.rooms || [{ items: plan.items, wallItems: plan.wallItems }];
    const segW = (RW - 46) / rooms.length;
    // partitions between rooms
    rooms.forEach((_, i) => { if (i > 0) partition(p, Math.round(46 + segW * i - 4), plan.frame, plan.paper || [120, 90, 60]); });
    // windows: one or two per room (barns get a hayloft door, chapels stained glass)
    const windows = [];
    if (plan.wall !== 'barn' && plan.wall !== 'plaster') {
      rooms.forEach((_, i) => {
        const x0 = 46 + segW * i;
        const nW = segW > 200 ? 2 : 1;
        for (let k = 0; k < nW; k++) windows.push(windowHole(p, Math.round(x0 + segW * (k + 1) / (nW + 1) - 15), plan.frame, r() < 0.55, r() < 0.4 ? [120, 60, 50] : null));
      });
    }
    const door = doorway(p, plan.frame);
    cobwebs(p, RW);
    const img = p.done();
    const ctx = img.getContext('2d');
    const containers = [];
    let idx = 0;

    if (plan.wall === 'barn') {
      const hx = Math.round(RW / 2 - 16);
      for (let y = 18; y < 42; y++) for (let x = hx; x < hx + 32; x++) {
        const e = x < hx + 2 || x >= hx + 30 || y < 20;
        ctx.fillStyle = e ? '#503222' : '#000'; if (!e) ctx.clearRect(x, y, 1, 1); else ctx.fillRect(x, y, 1, 1);
      }
      windows.push({ x: hx, y: 18, w: 32, h: 24 });
    }

    rooms.forEach((room, ri) => {
      const x0 = 46 + segW * ri + (ri > 0 ? 8 : 0), x1 = 46 + segW * (ri + 1) - 8;
      // wall decorations up high
      const wallItems = room.wallItems || [];
      wallItems.forEach((wi, k) => {
        const wx = Math.round(x0 + (x1 - x0) * (k + 0.5) / wallItems.length - 12);
        if (windows.some(w => wx + 24 > w.x - 4 && wx < w.x + w.w + 4) && wi !== 'stained') return;
        if (wi === 'frame') { ctx.save(); ctx.translate(wx, 50 + Math.floor(r() * 10)); ctx.rotate((r() - 0.5) * 0.12); ctx.drawImage(FUR.frame(16 + Math.floor(r() * 8), 14, Math.floor(r() * 1e5)), 0, 0); ctx.restore(); }
        else if (wi === 'shelf') ctx.drawImage(FUR.wallShelf(34, Math.floor(r() * 1e5), 'mixed'), wx, 66);
        else if (wi === 'hatPeg') ctx.drawImage(FUR.hatPeg(), wx, 70);
        else if (wi === 'mirror') ctx.drawImage(FUR.mirror(18), wx, 56);
        else if (wi === 'blanket') ctx.drawImage(FUR.blanket(), wx, 52);
        else if (wi === 'ristra') ctx.drawImage(FUR.ristra(), wx, 40);
        else if (wi === 'tools') ctx.drawImage(FUR.tools(), wx, 66);
        else if (wi === 'lantern') ctx.drawImage(FUR.lantern(), wx, 58);
        else if (wi === 'poster') ctx.drawImage(FUR.poster(r() < 0.5), wx, 62);
        else if (wi === 'stained') { const sg = FUR.stained(); ctx.drawImage(sg, wx, 48); windows.push({ x: wx + 13, y: 70, w: 5, h: 7, glow: true }); }
      });
      // floor furniture, laid out left to right with gaps
      const items = room.items;
      const pieces = [];
      items.forEach(name => {
        if (name.startsWith('s:')) {
          const type = name.slice(2);
          pieces.push({ type, art: SEARCH[type], w: SEARCH[type].closed.width });
        } else {
          const parts = decorPiece(name, r);
          if (parts[0] === 'rug') pieces.push({ rug: true, w: 0 });
          else if (parts.length) {
            let w = 0; const imgs = [];
            for (const pt of parts) { const im = pt === 'flip:chair' ? FUR.chair() : pt; imgs.push({ im, flip: pt === 'flip:chair' }); w += im.width + 1; }
            pieces.push({ decor: imgs, w });
          }
        }
      });
      const total = pieces.reduce((a, b) => a + b.w, 0);
      const gap = Math.max(3, (x1 - x0 - total) / (pieces.length + 1));
      let x = x0 + gap;
      pieces.forEach(pc => {
        if (pc.rug) { ctx.drawImage(FUR.rug(70), Math.round(x - 20), FLOOR + 6); return; }
        if (pc.decor) {
          let dx = x;
          for (const { im, flip } of pc.decor) {
            if (flip) { ctx.save(); ctx.translate(Math.round(dx + im.width), 0); ctx.scale(-1, 1); place(ctx, im, 0); ctx.restore(); }
            else place(ctx, im, dx);
            dx += im.width + 1;
          }
        } else {
          containers.push({ type: pc.type, idx: idx++, x: Math.round(x), w: pc.art.closed.width, h: pc.art.closed.height, art: pc.art });
        }
        x += pc.w + gap;
      });
      if (room.name === 'kitchen') { /* stovepipe to the ceiling */
        const st = containers.find(c => c.type === 'stove' && c.x > x0 && c.x < x1);
        if (st) { ctx.fillStyle = '#48484e'; ctx.fillRect(st.x + 15, 14, 4, FLOOR - 24 - 14 + 1); }
      }
    });
    // a few broken boards on the floor
    for (let i = 0; i < RW / 120; i++) {
      const bx = 50 + r() * (RW - 100);
      ctx.fillStyle = '#785a3a'; ctx.fillRect(Math.round(bx), FLOOR + 10 + Math.floor(r() * 12), 12 + Math.floor(r() * 10), 2);
    }

    return { kind: 'house', house, w: RW, img, fg: null, containers, windows, door: 24, doorRect: door, objects: [], npcs: [], lights: [], name: house.name };
  }

  // ------------------------------------------------------- town interiors
  function buildTown(b) {
    const r = U.rng(U.hash(b.id));
    const RW = { sheriff: 420, store: 460, saloon: 600, bank: 440, stable: 560, doctor: 380, post: 380, blacksmith: 420, church: 460 }[b.id] || 400;
    const p = U.pix(RW, H);
    const fgc = U.canvas(RW, H), fg = fgc.getContext('2d');
    const objects = [], npcs = [], lights = [], windows = [];
    let frame = [80, 54, 36];
    if (b.id === 'sheriff') { ceiling(p, RW); wallLogs(p, r, RW); floorPlanks(p, r, RW, [120, 88, 58]); }
    else if (b.id === 'store') { ceiling(p, RW); wallPaper(p, r, RW, [196, 186, 150], { wood: [110, 76, 46], motif: [170, 150, 110] }); floorPlanks(p, r, RW, [130, 96, 64]); }
    else if (b.id === 'saloon') { ceiling(p, RW, [60, 30, 26]); wallPaper(p, r, RW, [130, 40, 44], { wood: [84, 50, 32], motif: [176, 120, 70] }); floorPlanks(p, r, RW, [116, 80, 52]); frame = [70, 40, 30]; }
    else if (b.id === 'bank') { ceiling(p, RW); wallPaper(p, r, RW, [74, 104, 84], { wood: [96, 62, 40], motif: [110, 140, 110] }); floorPlanks(p, r, RW, [140, 104, 70]); }
    else if (b.id === 'stable') { ceiling(p, RW, [70, 40, 30]); wallBarn(p, r, RW); floorDirt(p, r, RW, true); }
    else if (b.id === 'doctor') { ceiling(p, RW); wallPaper(p, r, RW, [208, 214, 206], { wood: [120, 96, 70], motif: [190, 200, 196] }); floorPlanks(p, r, RW, [140, 110, 80]); }
    else if (b.id === 'post') { ceiling(p, RW); wallPaper(p, r, RW, [150, 160, 176], { wood: [96, 70, 50], motif: [176, 184, 200] }); floorPlanks(p, r, RW, [128, 96, 64]); }
    else if (b.id === 'blacksmith') { ceiling(p, RW, [50, 40, 36]); wallPlanks(p, r, RW, [[92, 70, 52], [84, 64, 48], [100, 76, 56]], false); floorDirt(p, r, RW, false); }
    else if (b.id === 'church') { ceiling(p, RW, [90, 70, 50]); wallPlaster(p, r, RW, true); floorPlanks(p, r, RW, [134, 100, 66]); }
    const WINS = { sheriff: [150], store: [384], saloon: [470], bank: [60, 250], doctor: [120, 280], post: [300] }[b.id] || [];
    const curtain = { saloon: [120, 30, 36], bank: [60, 80, 60], doctor: [236, 236, 236] }[b.id];
    WINS.forEach(wx => windows.push(windowHole(p, wx, frame, false, curtain)));
    const door = doorway(p, frame);
    const img = p.done();
    const ctx = img.getContext('2d');
    const npc = (kind, name, x, extra = {}) => npcs.push(Object.assign({ kind, name, x, face: -1, y: GROUND - 2 }, extra));

    if (b.id === 'sheriff') {
      place(ctx, FUR.coatRack(), 48);
      ctx.drawImage(FUR.poster(true), 140, 60); ctx.drawImage(FUR.poster(false), 112, 66); ctx.drawImage(FUR.poster(false), 196, 60);
      place(ctx, FUR.desk(false), 80); place(ctx, FUR.papers(), 86, FLOOR - 20); place(ctx, FUR.lamp(), 108, FLOOR - 20);
      place(ctx, FUR.chair(), 120);
      place(ctx, SEARCH.cupboard.closed, 196);
      place(ctx, FUR.stove(false), 232); ctx.fillStyle = '#48484e'; ctx.fillRect(247, 14, 4, FLOOR - 24 - 14 + 1);
      place(ctx, FUR.bench(36), 196 - 46);
      ctx.drawImage(FUR.wallShelf(34, 7), 226, 66);
      // two jail cells with cots
      place(ctx, FUR.cot(), 292); place(ctx, FUR.bucket(), 346);
      place(ctx, FUR.cot(), 362);
      fg.drawImage(FUR.cellBars(140, 76), 280, FLOOR - 76);
      fg.fillStyle = '#2c2c32'; fg.fillRect(350, FLOOR - 76, 3, 76);   // wall between the two cells
      lights.push({ x: 110, y: FLOOR - 26, r: 64, col: [255, 200, 120] });
      lights.push({ x: 240, y: FLOOR - 14, r: 40, col: [255, 140, 70] });
      objects.push({ x: 92, r: 14, label: 'Look at your desk', act: 'desk' });
      objects.push({ x: 149, r: 12, label: 'Read the wanted poster', act: 'poster' });
      objects.push({ x: 318, r: 26, label: 'Sleep on the cell cot (saves)', act: 'cot' });
      npc('deputy', 'Deputy Ned', 168, { lines: [
        ['Don\'t you worry about the town, Sheriff. I\'ll keep the peace till you\'re back.'],
        ['Jack fights dirty. Watch for him windin\' up, then block at the last second.'],
        ['Get yourself a horse from Pete. Ain\'t no catchin\' a rider on foot.'],
      ] });
    } else if (b.id === 'store') {
      for (const sy of [34, 56, 78]) for (const sx of [60, 170, 280]) ctx.drawImage(FUR.wallShelf(100, sx * 7 + sy, sy === 78 ? 'jars' : sy === 56 ? 'cans' : 'mixed'), sx, sy);
      place(ctx, SEARCH.barrel.closed, 46); place(ctx, SEARCH.crate.closed, 66); place(ctx, SEARCH.crate.closed, 66, FLOOR - 15);
      place(ctx, SEARCH.sacks.closed, 340); place(ctx, SEARCH.barrel.closed, 368); place(ctx, FUR.cloth(), 420);
      place(ctx, FUR.coatRack(), 400);
      const ctr = FUR.counter(170);
      fg.drawImage(ctr, 140, FLOOR - ctr.height + 7);
      place(fg, FUR.jars(), 160, FLOOR - 21); place(fg, FUR.scale(), 260, FLOOR - 21); place(fg, FUR.lamp(), 290, FLOOR - 21);
      lights.push({ x: 293, y: FLOOR - 28, r: 80, col: [255, 210, 140] });
      npc('shopkeep', 'Martha', 225, { y: GROUND - 10, front: true });
      objects.push({ x: 225, r: 60, label: 'Shop with Martha', act: 'shop' });
    } else if (b.id === 'saloon') {
      ctx.drawImage(FUR.mirror(90), 70, 40);
      ctx.drawImage(FUR.bottles(96, 3), 66, 72); ctx.drawImage(FUR.wallShelf(100, 1, 'none'), 64, 72);
      ctx.drawImage(FUR.bottles(96, 5), 66, 90); ctx.drawImage(FUR.wallShelf(100, 2, 'none'), 64, 90);
      ctx.drawImage(FUR.chandelier(), 250, 14); ctx.drawImage(FUR.chandelier(), 380, 14);
      place(ctx, FUR.piano(), 250); place(ctx, FUR.chair(WOOD_D), 296);
      for (const tx of [340, 410]) { place(ctx, FUR.chair(), tx - 13); place(ctx, FUR.roundTable(), tx); place(ctx, FUR.cards(), tx + 8, FLOOR - 20); place(ctx, FUR.bottle(), tx + 3, FLOOR - 20); }
      place(ctx, FUR.spittoon(), 198); place(ctx, FUR.spittoon(), 446);
      const st = FUR.stairs(12, 7, 7);
      // doorway to the hotel rooms at the top of the stairs
      ctx.fillStyle = '#46281e'; ctx.fillRect(RW - 24, FLOOR - 84 - 50, 22, 50);
      ctx.fillStyle = '#1a100c'; ctx.fillRect(RW - 22, FLOOR - 84 - 48, 18, 48);
      place(ctx, st, RW - st.width);
      ctx.drawImage(FUR.frame(30, 20, 9), 430, 44);
      const bar = FUR.counter(150, [96, 56, 34], [150, 96, 56]);
      fg.drawImage(bar, 44, FLOOR - bar.height + 7);
      fg.fillStyle = '#c8a050'; fg.fillRect(44, FLOOR + 4, 152, 1);
      place(fg, FUR.bottle(), 70, FLOOR - 21); place(fg, FUR.bottle(), 150, FLOOR - 21);
      lights.push({ x: 266, y: 26, r: 120, col: [255, 200, 120] }, { x: 396, y: 26, r: 120, col: [255, 200, 120] }, { x: 120, y: FLOOR - 30, r: 70, col: [255, 190, 110] });
      npc('bartender', 'Gus', 118, { y: GROUND - 10, front: true });
      npc('singer', 'Miss Lila', 236, { face: 1, lines: [
        ['Evenin\', Sheriff. Silver Jack tipped me a whole silver dollar last night. Said he was "goin\' up in the world."'],
        ['Up in the world... the snowy peaks, maybe? That man always liked the cold.'],
      ] });
      npc('gambler', 'Slick Doyle', 372, { face: -1, lines: [
        ['Care for a hand of poker, Sheriff? ...No? Pity.'],
        ['Word is the old way station out west still has supplies nobody\'s found. Folks are scared of the snakes.'],
      ] });
      npc('townsman', 'Cowhand', 444, { face: -1, lines: [['Whiskey\'s watered down again. Don\'t tell Gus I said so.']] });
      objects.push({ x: 118, r: 70, label: 'Talk to Gus at the bar', act: 'bar' });
      objects.push({ x: 270, r: 16, label: 'Play the piano', act: 'piano' });
      objects.push({ x: RW - 50, r: 30, label: 'Go upstairs (rent a room)', act: 'stairs' });
    } else if (b.id === 'bank') {
      place(ctx, FUR.bench(44), 100);
      place(ctx, FUR.clock(), 164);
      ctx.drawImage(FUR.frame(30, 22, 4), 110, 50);
      place(ctx, FUR.vault(), 340);
      place(ctx, FUR.safe(), 310);
      const ctr = FUR.counter(120, [90, 60, 40], [150, 110, 70]);
      fg.drawImage(ctr, 186, FLOOR - ctr.height + 7);
      fg.drawImage(FUR.tellerCage(120), 186, FLOOR - ctr.height + 7 - 36);
      place(fg, FUR.lamp(), 290, FLOOR - 21); place(fg, FUR.papers(), 200, FLOOR - 21);
      lights.push({ x: 293, y: FLOOR - 28, r: 70, col: [255, 210, 140] });
      npc('teller', 'Eustace (Teller)', 242, { y: GROUND - 10, front: true, lines: [
        ['The bank\'s offering a $500 reward for Jack Calloway. Dead or... well, the Sheriff brings \'em in alive, don\'t he.'],
        ['Jack knew the vault combination. Somebody must\'ve told him. Mighty suspicious.'],
      ] });
      objects.push({ x: 378, r: 34, label: 'Look into the vault', act: 'vault' });
    } else if (b.id === 'stable') {
      place(ctx, FUR.saddleRack(), 44); place(ctx, FUR.saddleRack(), 64);
      place(ctx, FUR.hay(false), 86); place(ctx, FUR.hay(false), 90, FLOOR - 15);
      ctx.drawImage(FUR.tools(), 60, 70); ctx.drawImage(FUR.lantern(), 120, 60);
      place(ctx, FUR.bucket(), 118); place(ctx, FUR.anvil(), 520);
      lights.push({ x: 124, y: 66, r: 90, col: [255, 200, 120] });
      for (const sx of [190, 260, 330, 400, 470]) fg.drawImage(FUR.stall(64), sx - 32, FLOOR - 28);
      npc('stablehand', 'Pete', 136, { face: 1 });
      objects.push({ x: 136, r: 22, label: 'Talk to Pete about horses', act: 'horses' });
    }
    if (b.id === 'doctor') {
      place(ctx, FUR.coatRack(), 48);
      place(ctx, SEARCH.cupboard.closed, 72);
      ctx.drawImage(FUR.wallShelf(40, 3, 'jars'), 110, 70); ctx.drawImage(FUR.frame(18, 14, 21), 200, 54);
      // exam table with a white sheet
      const table = FUR.table(52, [150, 140, 130]);
      place(ctx, table, 180); ctx.fillStyle = '#ecece6'; ctx.fillRect(181, FLOOR - 20, 52, 3);
      place(ctx, FUR.chair(), 244); place(ctx, FUR.washstand(false), 300); place(ctx, FUR.desk(false), 330);
      place(ctx, FUR.lamp(), 350, FLOOR - 20);
      lights.push({ x: 352, y: FLOOR - 28, r: 60, col: [255, 210, 140] });
      npc('doc', 'Doc Halloway', 160, { face: 1 });
      objects.push({ x: 160, r: 22, label: 'See Doc Halloway', act: 'doctor' });
    } else if (b.id === 'post') {
      // wall of mail slots and the telegraph key on the counter
      for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
        const x = 140 + col * 12, y = 46 + row * 12;
        ctx.fillStyle = '#5a3a24'; ctx.fillRect(x, y, 12, 12); ctx.fillStyle = '#24160e'; ctx.fillRect(x + 1, y + 1, 10, 10);
        if ((row * 5 + col * 3) % 4 === 0) { ctx.fillStyle = '#eae2cc'; ctx.fillRect(x + 2, y + 5, 8, 5); }
      }
      place(ctx, FUR.bench(40), 50); place(ctx, SEARCH.sacks.closed, 100); place(ctx, FUR.clock(), 290);
      const ctr = FUR.counter(110, [80, 60, 44], [140, 110, 80]);
      fg.drawImage(ctr, 130, FLOOR - ctr.height + 7);
      fg.fillStyle = '#3a3a40'; fg.fillRect(200, FLOOR - 24, 10, 3); fg.fillStyle = '#c8a050'; fg.fillRect(204, FLOOR - 27, 2, 3);
      place(fg, FUR.lamp(), 150, FLOOR - 21);
      lights.push({ x: 153, y: FLOOR - 28, r: 60, col: [255, 210, 140] });
      npc('postmaster', 'Mr. Pike (Postmaster)', 185, { y: GROUND - 10, front: true });
      objects.push({ x: 185, r: 50, label: 'Talk to Mr. Pike', act: 'post' });
    } else if (b.id === 'blacksmith') {
      // the forge: brick hearth with a fire, bellows, anvil, tools
      const fx = 150;
      for (let y = FLOOR - 40; y < FLOOR; y++) for (let x = fx; x < fx + 50; x++) { ctx.fillStyle = ((y >> 2) + (x >> 3)) % 2 ? '#7a6e64' : '#665c54'; ctx.fillRect(x, y, 1, 1); }
      for (let x = fx + 8; x < fx + 42; x++) for (let y = FLOOR - 46; y < FLOOR - 40; y++) { ctx.fillStyle = (x + y) % 3 ? '#ffb040' : '#ffe08a'; ctx.fillRect(x, y, 1, 1); }
      ctx.fillStyle = '#3c3632'; ctx.fillRect(fx + 18, 14, 14, FLOOR - 60);
      place(ctx, FUR.anvil(), 240); place(ctx, FUR.bucket(), 270);
      ctx.drawImage(FUR.tools(), 60, 60); ctx.drawImage(FUR.tools(), 300, 60);
      place(ctx, SEARCH.barrel.closed, 330); place(ctx, SEARCH.crate.closed, 350);
      lights.push({ x: fx + 25, y: FLOOR - 44, r: 120, col: [255, 140, 60] });
      npc('smith', 'Hank (Blacksmith)', 228, { face: 1 });
      objects.push({ x: 228, r: 24, label: 'Talk to Hank', act: 'smith' });
    } else if (b.id === 'church') {
      for (const sx of [100, 200, 300]) ctx.drawImage(FUR.stained(), sx, 44);
      for (const px of [90, 150, 210, 270]) place(ctx, FUR.pew(), px);
      place(ctx, FUR.altar(), 360); place(ctx, FUR.candle(), 352); place(ctx, FUR.candle(), 400);
      ctx.drawImage(FUR.frame(26, 20, 77), 364, 50);
      lights.push({ x: 376, y: FLOOR - 34, r: 70, col: [255, 214, 140] });
      for (const sx of [112, 212, 312]) windows.push({ x: sx, y: 64, w: 2, h: 2, glow: true });
      objects.push({ x: 376, r: 26, label: 'Pray at the altar', act: 'pray' });
    }
    return { kind: 'town', building: b, w: RW, img, fg: fgc, containers: [], windows, doorRect: door, objects, npcs, lights, door: 24, name: b.label,
      stalls: b.id === 'stable' ? [190, 260, 330] : null };
  }

  return { buildAbandoned, buildTown, FLOOR, FUR, SEARCH };
})();
