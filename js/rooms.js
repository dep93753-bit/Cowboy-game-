// Interiors: town buildings you walk into, and abandoned buildings to loot.
// Every room is one screen wide. `img` is the back wall + floor, `fg` is drawn
// in front of people who stand behind counters, `lights` glow at night.
const Rooms = (() => {
  const FLOOR = 150;
  const OUT = [34, 22, 16];

  // ---------------------------------------------------------- art helpers
  // Shaded box canvas: lit top edge, dark right/bottom edge, outline.
  function box(w, h, col, o = {}) {
    const p = U.pix(w + 2, h + 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c = col;
      if (y === 0) c = U.shade(col, 1.2);
      else if (y === h - 1 || x === w - 1) c = U.shade(col, 0.72);
      else if (o.grain && (x * 7 + y * 3) % 11 === 0) c = U.shade(col, 0.9);
      p.put(x + 1, y + 1, c);
    }
    Props.outline(p, o.out || OUT);
    return p.done();
  }
  const art = (rows, pal, out = OUT) => Sprites.build(rows, pal, out);
  const draw = (ctx, img, x, base) => ctx.drawImage(img, Math.round(x), Math.round(base - img.height + 1));

  // ----------------------------------------------------------- walls/floor
  function wallPlanks(p, r, cols, old = true) {
    for (let x = 0; x < W; x++) {
      const c = cols[(Math.floor(x / 7) * 5) % cols.length];
      for (let y = 14; y < FLOOR; y++) {
        let cc = c;
        if (x % 7 === 0) cc = U.shade(c, 0.55);
        else if (x % 7 === 1) cc = U.shade(c, 1.1);
        else if (old && r() < 0.05) cc = U.shade(c, 0.85);
        p.put(x, y, cc);
      }
    }
    if (old) for (let i = 0; i < 7; i++) {
      const gx = Math.floor(r() * 45) * 7, gy = 26 + Math.floor(r() * 80), gl = 5 + Math.floor(r() * 16);
      for (let y = gy; y < gy + gl; y++) p.put(gx, y, [220, 190, 140]);
    }
  }
  function wallLogs(p, r) {
    const logs = [[128, 88, 54], [116, 78, 46], [136, 96, 60]];
    for (let y = 14; y < FLOOR; y++) {
      const i = Math.floor((y - 14) / 10), ly = (y - 14) % 10;
      const c = logs[i % 3];
      for (let x = 0; x < W; x++) {
        let cc = c;
        if (ly === 0) cc = [196, 170, 130];             // chinking
        else if (ly === 1) cc = U.shade(c, 1.22);
        else if (ly >= 8) cc = U.shade(c, 0.7);
        else if ((x + i * 13) % 37 === 0) cc = U.shade(c, 0.8);
        p.put(x, y, cc);
      }
    }
  }
  function wallPaper(p, r, base, opts = {}) {
    const stripe = U.shade(base, 0.9), motif = opts.motif || U.shade(base, 1.18);
    for (let y = 14; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      let c = Math.floor(x / 8) % 2 ? base : stripe;
      const mx = x % 16, my = (y + (Math.floor(x / 16) % 2) * 7) % 14;
      if (Math.abs(mx - 8) + Math.abs(my - 7) === 3) c = motif;
      p.put(x, y, c);
    }
    // wainscot panels + chair rail
    const wood = opts.wood || [104, 66, 40];
    for (let y = 108; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      let c = wood;
      if (y === 108 || y === 109) c = U.shade(wood, y === 108 ? 1.3 : 0.7);
      else if (x % 40 === 4 || x % 40 === 36 || y === 114 || y === 144) c = U.shade(wood, 0.75);
      else if (x % 40 === 5 || y === 115) c = U.shade(wood, 1.15);
      p.put(x, y, c);
    }
    if (opts.old) {
      // peeling paper shows the boards underneath, plus water stains
      for (let i = 0; i < 6; i++) {
        const cx = r() * W, cy = 30 + r() * 60, rw = 8 + r() * 18, rh = 10 + r() * 22;
        for (let y = cy - rh; y < cy + rh; y++) for (let x = cx - rw; x < cx + rw; x++) {
          const d = ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2 + r() * 0.25;
          if (d < 1) p.put(x, y, Math.floor(x) % 7 === 0 ? [70, 50, 36] : [118, 88, 60]);
          else if (d < 1.15) p.put(x, y, U.shade(base, 1.25));
        }
      }
      for (let i = 0; i < 5; i++) {
        const sx = Math.floor(r() * W), sl = 20 + r() * 50;
        for (let y = 16; y < 16 + sl; y++) { const c = U.shade(p.get(sx, y), 0.82); p.put(sx, y, c); p.put(sx + 1, y, U.shade(p.get(sx + 1, y), 0.9)); }
      }
    }
  }
  function wallAdobe(p, r) {
    const base = [198, 150, 106];
    for (let y = 14; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const n = r();
      p.put(x, y, n < 0.08 ? U.shade(base, 0.93) : n < 0.13 ? U.shade(base, 1.05) : base);
    }
    // plaster fallen away: adobe bricks
    for (let i = 0; i < 4; i++) {
      const bx = Math.floor(r() * 280), by = 30 + Math.floor(r() * 70), bw = 20 + Math.floor(r() * 24), bh = 12 + Math.floor(r() * 14);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
        if ((x - bx) ** 2 / (bw * bw / 4) + (y - by - bh / 2) ** 2 / (bh * bh / 4) > 1.1 + r() * 0.3) continue;
        const row = Math.floor(y / 6), mortar = y % 6 === 0 || (x + (row % 2) * 6) % 12 === 0;
        p.put(x, y, mortar ? [150, 110, 80] : [176, 124, 86]);
      }
    }
    // cracks
    for (let i = 0; i < 5; i++) {
      let x = r() * W, y = 20 + r() * 40;
      for (let k = 0; k < 25; k++) { p.put(x, y, [140, 100, 70]); y++; x += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0; }
    }
    // wooden vigas across the ceiling
    for (let x = 0; x < W; x++) for (let y = 0; y < 14; y++) p.put(x, y, [70, 48, 32]);
    for (let bx = 10; bx < W; bx += 40) for (let y = 12; y < 20; y++) for (let x = bx; x < bx + 10; x++) {
      p.put(x, y, y === 12 ? [140, 100, 64] : x === bx + 9 ? [70, 48, 32] : [110, 76, 46]);
    }
  }
  function wallBarn(p, r) {
    const reds = [[140, 62, 46], [126, 54, 40], [150, 72, 54], [118, 60, 46]];
    for (let x = 0; x < W; x++) {
      const c = reds[(Math.floor(x / 9) * 3) % 4];
      for (let y = 14; y < FLOOR; y++) {
        let cc = c;
        if (x % 9 === 0) cc = U.shade(c, 0.5);
        else if (r() < 0.06) cc = U.shade(c, 0.85);
        else if (r() < 0.02) cc = [170, 140, 110];
        p.put(x, y, cc);
      }
    }
    // loft floor and posts
    for (let x = 0; x < W; x++) for (let y = 52; y < 58; y++) p.put(x, y, y === 52 ? [176, 132, 82] : [110, 76, 46]);
    for (const px of [4, 104, 204, 304]) for (let y = 58; y < FLOOR; y++) for (let x = px; x < px + 7; x++) p.put(x, y, x === px ? [70, 46, 30] : x === px + 6 ? [80, 54, 34] : [120, 84, 52]);
    // hay hanging over the loft edge
    for (let x = 0; x < W; x++) if (r() < 0.6) for (let y = 47; y < 52 + r() * 6; y++) p.put(x, y, r() < 0.5 ? [220, 190, 100] : [190, 160, 76]);
  }
  function wallPlaster(p, r) {
    const base = [222, 216, 202];
    for (let y = 14; y < FLOOR; y++) for (let x = 0; x < W; x++) p.put(x, y, r() < 0.07 ? U.shade(base, 0.94) : base);
    for (let i = 0; i < 4; i++) {
      const bx = Math.floor(r() * 290), by = 24 + Math.floor(r() * 70), bw = 14 + Math.floor(r() * 20), bh = 10 + Math.floor(r() * 16);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
        if (r() < 0.12) continue;
        p.put(x, y, y % 3 === 0 ? [90, 66, 46] : [150, 116, 80]);
      }
    }
    for (let i = 0; i < 6; i++) {
      let x = r() * W, y = 16 + r() * 60;
      for (let k = 0; k < 30; k++) { p.put(x, y, [170, 164, 150]); y++; x += r() < 0.35 ? 1 : r() < 0.35 ? -1 : 0; }
    }
  }

  function ceiling(p, col = [62, 42, 30]) {
    for (let y = 0; y < 14; y++) for (let x = 0; x < W; x++) p.put(x, y, y > 10 ? U.shade(col, 0.7) : x % 40 < 3 ? U.shade(col, 0.8) : col);
  }
  function floorPlanks(p, r, col = [122, 90, 60]) {
    for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
      const row = Math.floor((y - FLOOR) / 5);
      let c = row % 2 ? col : U.shade(col, 0.93);
      if ((y - FLOOR) % 5 === 0 || (x + row * 23) % 47 === 0) c = U.shade(col, 0.62);
      else if (r() < 0.04) c = U.shade(c, 0.9);
      p.put(x, y, c);
    }
    for (let x = 0; x < W; x++) { p.put(x, FLOOR - 1, [60, 40, 28]); p.put(x, FLOOR - 2, [140, 104, 70]); }
  }
  function floorDirt(p, r, straw) {
    for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
      let c = [140, 104, 72];
      const n = r();
      if (n < 0.1) c = [124, 90, 62]; else if (n < 0.15) c = [156, 120, 86];
      if (straw && r() < 0.05) c = [210, 180, 96];
      p.put(x, y, c);
    }
    for (let x = 0; x < W; x++) p.put(x, FLOOR - 1, [90, 64, 44]);
  }
  function windowHole(p, wx, wy, w, h, frame, broken, r) {
    for (let y = wy; y < wy + h; y++) for (let x = wx; x < wx + w; x++) {
      const edge = x < wx + 2 || x >= wx + w - 2 || y < wy + 2 || y >= wy + h - 2 || x === wx + Math.floor(w / 2) || y === wy + Math.floor(h / 2);
      if (edge) p.put(x, y, frame);
      else p.put(x, y, [0, 0, 0], 0);
    }
    if (broken) for (let k = 0; k < w; k++) {
      p.put(wx + k, wy + 6 + Math.floor(k * 0.6), [150, 112, 74]);
      p.put(wx + k, wy + 7 + Math.floor(k * 0.6), [120, 88, 58]);
    }
    return { x: wx, y: wy, w, h };
  }
  function doorway(p, frame) {
    for (let y = FLOOR - 40; y < FLOOR; y++) for (let x = 12; x < 36; x++) {
      const f = x < 14 || x >= 34 || y < FLOOR - 38;
      p.put(x, y, f ? frame : [0, 0, 0], f ? 255 : 0);
    }
  }
  function cobwebs(p) {
    for (let i = 0; i < 10; i++) { p.put(W - 1 - i, 14 + i, [210, 210, 200]); p.put(W - 1 - i * 2, 14, [200, 200, 190]); p.put(W - 1, 14 + i * 2, [200, 200, 190]); }
    for (let i = 0; i < 7; i++) p.put(40 + i, 14 + i, [210, 210, 200]);
  }

  // ------------------------------------------------------------ furniture
  const WOOD = { H: [150, 104, 62], h: [110, 74, 44], d: [74, 48, 30], m: [190, 150, 90], k: [40, 26, 18] };
  const F = {};
  F.shelf = (w, items, r) => {
    const c = U.canvas(w + 2, 26), x = c.getContext('2d');
    x.drawImage(box(w, 3, [120, 80, 48]), 0, 23);
    x.drawImage(box(w, 3, [120, 80, 48]), 0, 9);
    const cols = [[200, 60, 50], [70, 120, 60], [220, 200, 120], [90, 110, 160], [150, 100, 60], [230, 230, 220]];
    for (const row of [9, 23]) {
      for (let i = 2; i < w - 4; i += 5 + Math.floor(r() * 3)) {
        if (r() < (items === 'sparse' ? 0.55 : 0.15)) continue;
        const kind = r(), col = U.pick(r, cols);
        if (kind < 0.4) { x.fillStyle = U.rgb(U.shade(col, 0.6)); x.fillRect(i, row - 9, 3, 8); x.fillStyle = U.rgb(col); x.fillRect(i, row - 10, 2, 9); x.fillRect(i, row - 12, 1, 2); }
        else if (kind < 0.7) { x.fillStyle = U.rgb([150, 150, 156]); x.fillRect(i, row - 6, 4, 6); x.fillStyle = U.rgb(col); x.fillRect(i, row - 4, 4, 2); }
        else { x.fillStyle = U.rgb([200, 176, 130]); x.fillRect(i, row - 7, 5, 7); x.fillStyle = U.rgb([170, 146, 100]); x.fillRect(i + 4, row - 7, 1, 7); }
      }
    }
    return c;
  };
  F.counter = (w, col = [116, 76, 44], top = [170, 124, 76]) => {
    const p = U.pix(w + 2, 28);
    for (let y = 0; y < 26; y++) for (let x = 0; x < w; x++) {
      let c = col;
      if (y < 3) c = y === 0 ? U.shade(top, 1.15) : top;
      else if (y === 3) c = U.shade(col, 0.6);
      else if ((x % 24 === 2 || x % 24 === 21) && y > 5 && y < 23) c = U.shade(col, 0.72);
      else if ((y === 6 || y === 22) && x % 24 > 2 && x % 24 < 21) c = U.shade(col, 0.72);
      else if (x % 24 === 3 && y > 5 && y < 23) c = U.shade(col, 1.15);
      p.put(x + 1, y + 1, c);
    }
    Props.outline(p, OUT);
    return p.done();
  };
  F.table = () => art(['mmmmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHHHH', '.hd................dh.', '.h..................h.', '.h..................h.', '.h..................h.', '.h..................h.', '.h..................h.', 'hh..................hh'], WOOD);
  F.roundTable = () => art(['..mmmmmmmmmmmmmm..', 'HHHHHHHHHHHHHHHHHH', '.dddddddddddddddd.', '........hh........', '........hh........', '........hh........', '........hh........', '......hhhhhh......', '....hhh....hhh....'], WOOD);
  F.chair = () => art(['H.......', 'H.......', 'Hh......', 'H.......', 'H.......', 'HHHHHHHH', 'hdddddhh', 'h......h', 'h......h', 'h......h'], WOOD);
  F.bed = old => art(['H....................', 'Hh...................', 'HwwwwWWWWWWWWWWWWWWWH', old ? 'HwwwwrrrrRRrrr..rrRrH' : 'HwwwwrrrrrRrrrrRrrrrH', 'HHHHHHHHHHHHHHHHHHHHH', 'H...................H', 'H...................H'],
    Object.assign({ w: [220, 214, 196], W: [180, 170, 150], r: [150, 60, 50], R: [120, 46, 40] }, WOOD));
  F.cot = () => art(['...........................', 'wwwWWWWWWWWWWWWWWWWWWWWWWWW', 'GGGGGGGGGGGGGGGGGGGGGGGGGGG', 'h.........................h', 'h.........................h', 'h.........................h'],
    Object.assign({ w: [230, 224, 206], W: [140, 130, 100], G: [90, 96, 70] }, WOOD));
  F.frame = () => art(['HHHHHHHHHH', 'HssssssssH', 'HsggggggsH', 'HsgGGggGsH', 'HsGGGGGGsH', 'HssssssssH', 'HHHHHHHHHH'],
    Object.assign({ s: [200, 180, 140], g: [130, 160, 190], G: [120, 100, 70] }, WOOD));
  F.poster = (r, wanted) => {
    const c = U.canvas(18, 22), x = c.getContext('2d');
    x.fillStyle = '#3a2416'; x.fillRect(0, 0, 18, 22);
    x.fillStyle = '#e8d6a8'; x.fillRect(1, 1, 16, 20);
    x.fillStyle = '#5a3a22'; x.fillRect(3, 2, 12, 2);
    if (wanted) { // Jack's face: flat hat, silver tooth
      x.fillStyle = '#2a2020'; x.fillRect(4, 6, 10, 2); x.fillRect(6, 4, 6, 2);
      x.fillStyle = '#c89a70'; x.fillRect(6, 8, 6, 6);
      x.fillStyle = '#2a2020'; x.fillRect(7, 10, 1, 1); x.fillRect(10, 10, 1, 1);
      x.fillStyle = '#d0d0d8'; x.fillRect(9, 12, 1, 1);
    } else { x.fillStyle = '#8a6a4a'; for (let i = 5; i < 15; i += 2) x.fillRect(3, i, 12, 1); }
    x.fillStyle = '#5a3a22'; x.fillRect(3, 16, 12, 1); x.fillRect(4, 18, 10, 1);
    return c;
  };
  F.lamp = () => art(['..gg..', '.gYYg.', '.gYYg.', '..hh..', '.hhhh.'], { g: [190, 200, 210], Y: [255, 220, 120], h: [100, 80, 60] });
  F.stove = () => art(['......II', '......II', '......II', 'IIIIIIIIIIIIIIII', 'IiiiiiiiiiiiiiiI', 'IiIIIIIIIIIIIIiI', 'IiIkkkkkkkkkkIiI', 'IiIkOkOkkOkOkIiI', 'IiIkkkkkkkkkkIiI', 'IiIIIIIImIIIIIiI', 'IiiiiiiiiiiiiiiI', 'IiIIIIIIIIIIIIiI', 'IiiiiiiiiiiiiiiI', 'I.I..........I.I'],
    { I: [80, 80, 86], i: [52, 52, 58], k: [30, 28, 30], m: [200, 170, 90], O: [230, 120, 50] });
  F.fireplace = () => {
    const p = U.pix(46, 46);
    const stones = [[150, 140, 130], [130, 120, 112], [166, 156, 144]];
    for (let y = 0; y < 46; y++) for (let x = 0; x < 46; x++) {
      const row = Math.floor(y / 5), col = Math.floor((x + (row % 2) * 4) / 8);
      let c = stones[(row * 3 + col) % 3];
      if (y % 5 === 0 || (x + (row % 2) * 4) % 8 === 0) c = [90, 84, 78];
      p.put(x, y, c);
    }
    for (let y = 22; y < 46; y++) for (let x = 10; x < 36; x++) p.put(x, y, y < 25 ? [60, 54, 50] : [24, 18, 16]);
    for (let x = 12; x < 34; x++) { p.put(x, 43, [90, 60, 40]); p.put(x, 44, [70, 46, 30]); }
    for (let x = -2; x < 48; x++) for (let y = 14; y < 18; y++) p.put(x + 0, y, y === 14 ? [150, 110, 72] : [110, 76, 46]);
    Props.outline(p, OUT);
    return p.done();
  };
  F.rug = (col = [140, 50, 44]) => {
    const p = U.pix(60, 6);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 60; x++) {
      let c = col;
      if (y === 0 || y === 5 || x < 2 || x > 57) c = [210, 180, 110];
      else if ((x + y * 3) % 8 < 2) c = [60, 70, 110];
      p.put(x, y, c);
    }
    return p.done();
  };
  F.debris = r => {
    const p = U.pix(40, 8);
    for (let i = 0; i < 6; i++) {
      const x0 = r() * 30, y0 = 2 + r() * 5, len = 6 + r() * 10, a = (r() - 0.5) * 0.6;
      for (let k = 0; k < len; k++) { p.put(x0 + k, y0 + k * a, [120, 88, 58]); p.put(x0 + k, y0 + k * a + 1, [80, 56, 38]); }
    }
    return p.done();
  };
  F.hay = () => {
    const p = U.pix(30, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 30; x++) {
      let c = (x * 3 + y * 7) % 5 === 0 ? [190, 160, 76] : [220, 190, 100];
      if (y === 0) c = [236, 210, 130];
      if (x === 9 || x === 20) c = [150, 100, 60];
      p.put(x, y, c);
    }
    Props.outline(p, [120, 90, 40]);
    return p.done();
  };
  F.saddleRack = () => art(['....SSSSSSS....', '...SSSSSSSSS...', '..SSsssssssSS..', '.RRRRRRRRRRRRR.', '.RRRRRRRRRRRRR.', 'hhhhhhhhhhhhhhh', '.h...........h.', '.h...........h.', '.h...........h.'],
    Object.assign({ S: [110, 66, 36], s: [80, 46, 24], R: [170, 52, 44] }, WOOD));
  F.piano = () => {
    const p = U.pix(48, 34);
    for (let y = 0; y < 34; y++) for (let x = 0; x < 48; x++) {
      let c = [70, 40, 30];
      if (y < 2) c = [110, 70, 50];
      else if (y >= 14 && y < 18) c = (x % 3 === 0 ? [30, 26, 26] : [236, 230, 214]);
      else if (y === 13) c = [40, 24, 18];
      else if (y >= 20 && (x < 3 || x > 44)) c = [56, 32, 24];
      else if (y >= 20 && x >= 3 && x <= 44) continue;
      else if ((x === 6 || x === 41) && y > 2 && y < 12) c = [96, 60, 44];
      p.put(x, y, c);
    }
    Props.outline(p, OUT);
    return p.done();
  };
  F.bottles = (w, r) => {
    const c = U.canvas(w, 14), x = c.getContext('2d');
    const cols = ['#4a7a3a', '#8a4a2a', '#c8b060', '#3a4a7a', '#a03a30', '#e0e0d8'];
    for (let i = 1; i < w - 3; i += 4) {
      x.fillStyle = U.pick(r, cols); const h = 6 + Math.floor(r() * 5);
      x.fillRect(i, 14 - h, 3, h); x.fillRect(i + 1, 14 - h - 2, 1, 2);
    }
    return c;
  };
  F.mirror = w => {
    const p = U.pix(w, 26);
    for (let y = 0; y < 26; y++) for (let x = 0; x < w; x++) {
      const e = x < 2 || x >= w - 2 || y < 2 || y >= 24;
      p.put(x, y, e ? [190, 150, 70] : (x + y) % 9 < 2 ? [170, 186, 196] : [120, 136, 150]);
    }
    return p.done();
  };
  F.chandelier = () => {
    const c = U.canvas(30, 14), x = c.getContext('2d');
    x.fillStyle = '#5a4a3a'; x.fillRect(14, 0, 2, 6); x.fillRect(4, 6, 22, 2);
    x.fillStyle = '#c8a050'; x.fillRect(4, 7, 22, 1);
    for (const cx of [4, 10, 19, 25]) { x.fillStyle = '#e8e0d0'; x.fillRect(cx, 2, 2, 4); x.fillStyle = '#ffd070'; x.fillRect(cx, 0, 2, 2); }
    return c;
  };
  F.stairs = () => {
    const p = U.pix(56, 96);
    for (let i = 0; i < 12; i++) {
      const sy = 96 - (i + 1) * 8, sx = 56 - (i + 1) * 4 - 4;
      for (let y = sy; y < 96; y++) for (let x = sx; x < sx + 6; x++) p.put(x, y, y === sy ? [176, 130, 84] : y === sy + 1 ? [96, 66, 42] : [130, 92, 58]);
    }
    for (let i = 0; i < 12; i++) for (let y = 0; y < 14; y++) p.put(56 - (i + 1) * 4 - 1, 96 - (i + 1) * 8 - 14 + y, [90, 60, 40]);
    for (let k = 0; k < 50; k++) p.put(56 - k, 96 - k * 2 - 14, [120, 84, 52]);
    return p.done();
  };
  F.cellBars = w => {
    const c = U.canvas(w, 96), x = c.getContext('2d');
    x.fillStyle = '#3a3a40';
    for (let i = 0; i < w; i += 6) { x.fillRect(i, 0, 2, 96); }
    x.fillRect(0, 0, w, 3); x.fillRect(0, 40, w, 2); x.fillRect(0, 93, w, 3);
    x.fillStyle = '#6a6a74';
    for (let i = 0; i < w; i += 6) x.fillRect(i, 0, 1, 96);
    return c;
  };
  F.vault = () => {
    const p = U.pix(70, 74);
    for (let y = 0; y < 74; y++) for (let x = 0; x < 70; x++) {
      const d = Math.hypot(x - 35, y - 37);
      if (d < 34) p.put(x, y, d > 31 ? [70, 70, 76] : d > 28 ? [120, 120, 128] : [24, 22, 24]);
    }
    // empty shelves inside
    for (const sy of [24, 40, 54]) for (let x = 14; x < 56; x++) p.put(x, sy, [90, 70, 50]);
    // the open door swung to the side
    for (let y = 6; y < 68; y++) for (let x = 60; x < 70; x++) p.put(x, y, x === 60 ? [60, 60, 66] : [150, 150, 158]);
    return p.done();
  };
  F.tellerCage = w => {
    const c = U.canvas(w, 40), x = c.getContext('2d');
    x.fillStyle = '#b08a3a';
    for (let i = 0; i < w; i += 5) x.fillRect(i, 0, 1, 40);
    x.fillRect(0, 0, w, 2); x.fillRect(0, 20, w, 1);
    x.fillStyle = '#e8c860'; x.fillRect(0, 0, w, 1);
    return c;
  };
  F.stall = () => {
    const p = U.pix(62, 26);
    for (let y = 0; y < 26; y++) for (let x = 0; x < 62; x++) {
      const post = x < 4 || x > 57;
      const rail = y < 4 || (y > 10 && y < 14);
      if (post || rail) p.put(x, y, post ? (x % 4 === 0 ? [80, 54, 34] : [126, 88, 54]) : y === 0 || y === 11 ? [170, 126, 80] : [130, 92, 58]);
    }
    Props.outline(p, OUT);
    return p.done();
  };
  F.pew = () => art(['H.......................', 'H.......................', 'Hh......................', 'H.......................', 'HHHHHHHHHHHHHHHHHHHHHHHH', 'hddddddddddddddddddddddh', 'h......................h', 'h......................h'], WOOD);
  F.altar = () => art(['..Y.......Y..', '..w.......w..', 'WWWWWWWWWWWWW', 'WRRRRRRRRRRRW', 'WRRRRYYRRRRRW', 'WRRRRYYRRRRRW', 'WRRRRRRRRRRRW', 'WWWWWWWWWWWWW', 'HHHHHHHHHHHHH'],
    Object.assign({ W: [226, 220, 204], R: [140, 40, 44], Y: [240, 200, 80], w: [236, 232, 220] }, WOOD));
  F.stained = () => {
    const p = U.pix(22, 34);
    const cols = [[180, 50, 50], [60, 90, 170], [220, 180, 60], [70, 140, 80], [140, 70, 160]];
    for (let y = 0; y < 34; y++) for (let x = 0; x < 22; x++) {
      if (y < 11 && Math.hypot(x - 11, y - 11) > 11) continue;
      const edge = x < 2 || x > 19 || y > 31 || (y < 11 && Math.hypot(x - 11, y - 11) > 9);
      const lead = (x + y) % 7 === 0 || (x - y + 40) % 7 === 0;
      p.put(x, y, edge ? [70, 48, 32] : lead ? [40, 34, 34] : cols[(Math.floor(x / 4) + Math.floor(y / 5)) % 5]);
    }
    // a broken pane
    for (let y = 20; y < 27; y++) for (let x = 12; x < 17; x++) p.put(x, y, [0, 0, 0], 0);
    return p.done();
  };
  F.pot = (r) => art(['..hHHHh..', '.hHHHHHh.', '.hhhhhhh.', 'hHHmHHHHh', 'HHmHHHHHH', 'HHHHHHHHH', 'hHHHHHHHh', '.hHHHHHh.', '..hhhhh..'],
    { H: [176, 100, 60], h: [130, 70, 42], m: [220, 180, 120] });
  F.blanket = () => {
    const p = U.pix(30, 22);
    const cols = [[170, 50, 40], [230, 200, 140], [40, 70, 110], [230, 200, 140]];
    for (let y = 0; y < 22; y++) for (let x = 0; x < 30; x++) {
      let c = cols[Math.floor(y / 3) % 4];
      if (Math.abs((x % 10) - 5) + Math.abs((y % 11) - 5) === 3) c = [30, 30, 30];
      p.put(x, y, c);
    }
    return p.done();
  };
  F.ristra = () => {
    const c = U.canvas(6, 26), x = c.getContext('2d');
    x.fillStyle = '#7a5a3a'; x.fillRect(2, 0, 1, 4);
    for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? '#b02a20' : '#d03a28'; x.fillRect(i % 2 ? 0 : 2, 4 + i * 2, 4, 3); }
    return c;
  };
  F.bench = () => art(['HHHHHHHHHHHHHHHHHHHHHHHHHHHH', 'hddddddddddddddddddddddddddh', 'h..........................h', 'h..........................h', 'h..........................h'], WOOD);
  F.hatRack = () => art(['..hh..', 'hhhhhh', '..h...', '..h...', '..h...', '..h...', '..h...', '..h...', '..h...', '..h...', '..h...', '..h...', '..h...', '..h...', '.hhh..', 'hh.hh.'], WOOD);
  F.desk = () => art(['mmmmmmmmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHHHHHHHH', 'HhHHHHHHHh.......HhHHHHHHH', 'HhHHHmHHHh.......HhHHmHHHH', 'HhhhhhhhHh.......HhhhhhhhH', 'HhHHHmHHHh.......HhHHmHHHH', 'HhhhhhhhHh.......HhhhhhhhH', 'HhHHHHHHHh.......HhHHHHHHH', 'hhhhhhhhhh.......hhhhhhhhh'], WOOD);
  F.papers = () => art(['..ww.', 'wwwwW', 'WwwwW'], { w: [236, 230, 210], W: [200, 190, 170] }, [120, 110, 90]);
  F.clock = () => art(['.hHHHh.', 'hHwwwHh', 'HwwkwwH', 'HwwkkwH', 'HwwwwwH', 'hHwwwHh', '.HHHHH.', '.HmmmH.', '.HmmmH.', '.HmmmH.', '.HHHHH.'], Object.assign({ w: [236, 230, 210] }, WOOD));
  F.jars = r => {
    const c = U.canvas(30, 10), x = c.getContext('2d');
    const cols = ['#e05050', '#f0d050', '#70c060', '#e080c0'];
    for (let i = 0; i < 4; i++) {
      x.fillStyle = 'rgba(220,230,240,.9)'; x.fillRect(i * 7, 1, 6, 9);
      x.fillStyle = cols[i]; x.fillRect(i * 7 + 1, 4, 4, 5);
      x.fillStyle = '#8a6a4a'; x.fillRect(i * 7, 0, 6, 2);
    }
    return c;
  };
  F.sacks = () => art(['..SSS....sss..', '.SSSSS..sSSSs.', 'SSSSSSSsSSSSSs', 'SSkkSSSsSSkkSs', 'SSSSSSSsSSSSSs', 'sSSSSSssSSSSSs', '.ssssss.sssss.'],
    { S: [200, 176, 130], s: [160, 136, 96], k: [120, 90, 60] });
  F.tools = () => {
    const c = U.canvas(30, 34), x = c.getContext('2d');
    x.fillStyle = '#7a5a3a'; x.fillRect(0, 2, 30, 2);
    x.fillStyle = '#9a7a52'; x.fillRect(4, 4, 2, 26); x.fillRect(14, 4, 2, 22); x.fillRect(24, 4, 2, 28);
    x.fillStyle = '#8a8a92'; x.fillRect(1, 28, 8, 5); x.fillRect(11, 24, 8, 3); x.fillRect(12, 26, 1, 4); x.fillRect(15, 26, 1, 4); x.fillRect(18, 26, 1, 4);
    x.fillRect(22, 30, 6, 3);
    return c;
  };

  // Extra searchable furniture beyond the basic set in Props.containers.
  const MORE = {
    wardrobe: () => ({
      closed: art([...['mmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHH'], ...Array(28).fill(0).map((_, i) => i === 13 ? 'HhHHHHHHmhmHHHHHHHhH' : i === 0 || i === 27 ? 'HhhhhhhhhhhhhhhhhhhH' : 'HhHHHHHHHhHHHHHHHHhH'), 'h..h............h..h'], WOOD),
      open: art([...['mmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHH'], ...Array(28).fill(0).map((_, i) => i === 27 ? 'HhhhhhhhhhhhhhhhhhhH' : i === 4 ? 'HkkkkkkkkkhHHHHHHHhHHH' : 'HkkkkkkkkkhHHHHHHHhHHH'), 'h..h............h..h'], WOOD),
    }),
    desk: () => ({ closed: F.desk(), open: art(['mmmmmmmmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHHHHHHHH', 'HhHHHHHHHh.......HhHHHHHHH', 'HkkkkkkkkkkkHh...HhHHmHHHH', 'HhHHHHHHHHmHHh...HhhhhhhhH', 'HhHHHmHHHh.......HhHHmHHHH', 'HhhhhhhhHh.......HhhhhhhhH', 'HhHHHHHHHh.......HhHHHHHHH', 'hhhhhhhhhh.......hhhhhhhhh'], WOOD) }),
    pot: () => ({ closed: F.pot(), open: art(['.........', '..kkkkk..', '.hkkkkkh.', 'hHHmHHHHh', 'HHmHHHHHH', 'HHHHHHHHH', 'hHHHHHHHh', '.hHHHHHh.', '..hhhhh..'], { H: [176, 100, 60], h: [130, 70, 42], m: [220, 180, 120], k: [40, 26, 18] }) }),
    sacks: () => ({ closed: F.sacks(), open: art(['..............', '..............', 'SSSSSSSsS.....', 'SSkkSSSsSSs...', 'SSSSSSSsSSSSs.', 'sSSSSSssSSSSSs', '.ssssss.sssss.'], { S: [200, 176, 130], s: [160, 136, 96], k: [120, 90, 60] }) }),
    hay: () => ({ closed: F.hay(), open: (() => { const c = F.hay(); const x = c.getContext('2d'); x.clearRect(10, 0, 12, 8); return c; })() }),
    offering: () => ({
      closed: art(['HHHHHHHHHH', 'HmmmkkmmmH', 'HhhhhhhhhH', 'HhHHHHHHhH', 'HhHHYYHHhH', 'HhHHHHHHhH', 'HhhhhhhhhH', '.h......h.', '.h......h.', '.h......h.', '.h......h.'], Object.assign({ Y: [230, 200, 90] }, WOOD)),
      open: art(['HHHHHHHHHH....', 'HmmmmmmmmH....', 'HkkkkkkkkH....', 'HhHHHHHHhH....', 'HhHHYYHHhH....', 'HhHHHHHHhH....', 'HhhhhhhhhH....', '.h......h.....', '.h......h.....', '.h......h.....', '.h......h.....'], Object.assign({ Y: [230, 200, 90] }, WOOD)),
    }),
    bookshelf: () => {
      const make = empty => {
        const p = U.pix(24, 40);
        for (let y = 0; y < 40; y++) for (let x = 0; x < 24; x++) {
          let c = [96, 62, 38];
          if (x < 2 || x > 21 || y < 2 || y > 37 || y % 12 < 2) c = [120, 80, 48];
          else if (!empty || x % 5 === 0) { const b = Math.floor(x / 3) % 4; c = [[150, 50, 40], [60, 80, 120], [70, 110, 60], [170, 140, 80]][b]; if (empty) c = [40, 26, 18]; }
          else c = [40, 26, 18];
          p.put(x, y, c);
        }
        Props.outline(p, OUT);
        return p.done();
      };
      return { closed: make(false), open: make(true) };
    },
  };
  const C = Object.assign({}, Props.containers);
  for (const k in MORE) C[k] = MORE[k]();

  // ---------------------------------------------------- abandoned interiors
  // Which walls, floors, furniture and loot spots each building type uses.
  const STYLES = {
    shack: { wall: 'planks', floor: 'planks', cont: ['crate', 'barrel', 'trunk', 'cupboard', 'stove'], decor: ['bed', 'table', 'chair'], frame: [70, 48, 32] },
    farmhouse: { wall: 'paper', paper: [130, 118, 90], floor: 'planks', cont: ['dresser', 'wardrobe', 'cupboard', 'desk', 'trunk', 'bookshelf'], decor: ['bed', 'table', 'chair', 'fireplace', 'rug', 'clock'], frame: [90, 64, 44] },
    adobe: { wall: 'adobe', floor: 'dirt', cont: ['pot', 'pot', 'trunk', 'sacks', 'crate'], decor: ['blanket', 'ristra', 'table', 'chair'], frame: [100, 70, 44] },
    barn: { wall: 'barn', floor: 'straw', cont: ['crate', 'sacks', 'hay', 'barrel', 'trunk'], decor: ['hayStack', 'tools', 'saddleRack'], frame: [80, 50, 34] },
    chapel: { wall: 'plaster', floor: 'planks', cont: ['offering', 'bookshelf', 'trunk', 'cupboard'], decor: ['pew', 'pew', 'altar'], frame: [90, 70, 50] },
    waystation: { wall: 'paper', paper: [116, 120, 100], floor: 'planks', cont: ['desk', 'crate', 'cupboard', 'trunk', 'barrel', 'sacks'], decor: ['bench', 'stove', 'counter'], frame: [80, 56, 36] },
  };

  function buildAbandoned(house) {
    const st = STYLES[house.type] || STYLES.shack;
    const r = U.rng(house.seed * 104729);
    const p = U.pix(W, H);
    ceiling(p, st.wall === 'barn' ? [70, 40, 30] : [62, 42, 30]);
    if (st.wall === 'planks') wallPlanks(p, r, [[112, 82, 58], [100, 72, 50], [122, 90, 62], [94, 70, 52]]);
    else if (st.wall === 'paper') wallPaper(p, r, st.paper, { old: true, wood: [90, 60, 40] });
    else if (st.wall === 'adobe') wallAdobe(p, r);
    else if (st.wall === 'barn') wallBarn(p, r);
    else if (st.wall === 'plaster') wallPlaster(p, r);
    if (st.floor === 'dirt') floorDirt(p, r, false);
    else if (st.floor === 'straw') floorDirt(p, r, true);
    else floorPlanks(p, r);

    const windows = [];
    if (house.type === 'chapel') {
      // stained glass instead of plain windows
    } else if (house.type !== 'barn') {
      const n = 1 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) windows.push(windowHole(p, 90 + i * 120 + Math.floor(r() * 30), 46, 26, 30, st.frame, r() < 0.6, r));
    } else {
      windows.push(windowHole(p, 140, 22, 30, 24, st.frame, false, r)); // hayloft door
    }
    doorway(p, st.frame);
    cobwebs(p);
    const img = p.done();
    const ctx = img.getContext('2d');

    if (house.type === 'chapel') {
      const sg = F.stained();
      for (const sx of [100, 200]) { ctx.drawImage(sg, sx, 40); windows.push({ x: sx + 12, y: 60, w: 5, h: 7, glow: true }); }
    }

    // furniture: searchable spots first, decor fills the gaps
    const slots = [70, 118, 166, 214, 262];
    const nC = 3 + Math.floor(r() * 2);
    const order = slots.slice().sort(() => r() - 0.5);
    const chosen = order.slice(0, nC).sort((a, b) => a - b);
    const containers = chosen.map((sx, idx) => {
      const type = U.pick(r, st.cont);
      const a = C[type];
      return { type, idx, x: sx, w: a.closed.width, h: a.closed.height, art: a };
    });
    order.slice(nC).forEach(sx => {
      const d = U.pick(r, st.decor);
      const im = d === 'fireplace' ? F.fireplace() : d === 'rug' ? F.rug() : d === 'clock' ? F.clock() : d === 'blanket' ? F.blanket()
        : d === 'ristra' ? F.ristra() : d === 'hayStack' ? F.hay() : d === 'tools' ? F.tools() : d === 'saddleRack' ? F.saddleRack()
        : d === 'pew' ? F.pew() : d === 'altar' ? F.altar() : d === 'bench' ? F.bench() : d === 'stove' ? F.stove()
        : d === 'counter' ? F.counter(40, [100, 70, 44]) : d === 'bed' ? F.bed(true) : d === 'table' ? F.table() : F.chair();
      if (d === 'blanket' || d === 'ristra' || d === 'tools') ctx.drawImage(im, sx, 50);
      else if (d === 'rug') ctx.drawImage(im, sx - 10, FLOOR + 6);
      else draw(ctx, im, sx, FLOOR + 1);
    });
    // wall hangings and junk on the floor
    if (st.wall !== 'barn' && st.wall !== 'adobe') { ctx.save(); ctx.translate(48 + Math.floor(r() * 200), 30); ctx.rotate(0.08); ctx.drawImage(F.frame(), 0, 0); ctx.restore(); }
    if (st.wall === 'adobe') ctx.drawImage(F.blanket(), 50 + Math.floor(r() * 200), 40);
    ctx.drawImage(F.debris(r), 40 + Math.floor(r() * 220), FLOOR + 8);

    return { kind: 'house', house, img, fg: null, containers, windows, objects: [], npcs: [], lights: [], door: 24, name: house.name };
  }

  // ------------------------------------------------------- town interiors
  function buildTown(b) {
    const r = U.rng(U.hash(b.id));
    const p = U.pix(W, H);
    const fgc = U.canvas(W, H), fg = fgc.getContext('2d');
    const objects = [], npcs = [], lights = [], windows = [];
    let frame = [80, 54, 36];
    if (b.id === 'sheriff') { ceiling(p); wallLogs(p, r); floorPlanks(p, r, [120, 88, 58]); }
    else if (b.id === 'store') { ceiling(p); wallPaper(p, r, [196, 186, 150], { wood: [110, 76, 46], motif: [170, 150, 110] }); floorPlanks(p, r, [130, 96, 64]); }
    else if (b.id === 'saloon') { ceiling(p, [60, 30, 26]); wallPaper(p, r, [130, 40, 44], { wood: [84, 50, 32], motif: [176, 120, 70] }); floorPlanks(p, r, [116, 80, 52]); frame = [70, 40, 30]; }
    else if (b.id === 'bank') { ceiling(p); wallPaper(p, r, [74, 104, 84], { wood: [96, 62, 40], motif: [110, 140, 110] }); floorPlanks(p, r, [140, 104, 70]); }
    else if (b.id === 'stable') { ceiling(p, [70, 40, 30]); wallBarn(p, r); floorDirt(p, r, true); }
    const WIN_X = { sheriff: 196, store: 262, saloon: 216, bank: 100 };
    if (b.id !== 'stable') windows.push(windowHole(p, WIN_X[b.id], 40, 26, 30, frame, false, r));
    doorway(p, frame);
    const img = p.done();
    const ctx = img.getContext('2d');
    const npc = (kind, name, x, extra = {}) => npcs.push(Object.assign({ kind, name, x, face: -1, y: GROUND - 2 }, extra));

    if (b.id === 'sheriff') {
      ctx.drawImage(F.poster(r, true), 140, 40);
      ctx.drawImage(F.poster(r, false), 162, 46);
      ctx.drawImage(F.poster(r, false), 120, 50);
      draw(ctx, F.hatRack(), 50, FLOOR);
      draw(ctx, F.desk(), 70, FLOOR + 1);
      draw(ctx, F.papers(), 76, FLOOR - 9);
      draw(ctx, F.lamp(), 90, FLOOR - 9);
      draw(ctx, F.chair(), 100, FLOOR + 1);
      draw(ctx, F.stove(), 186, FLOOR + 1);
      // jail cell with a cot
      draw(ctx, F.cot(), 252, FLOOR + 1);
      fg.drawImage(F.cellBars(80), 240, FLOOR - 95);
      lights.push({ x: 92, y: FLOOR - 12, r: 60, col: [255, 200, 120] });
      objects.push({ x: 88, r: 22, label: 'Look at your desk', act: 'desk' });
      objects.push({ x: 150, r: 18, label: 'Read the wanted poster', act: 'poster' });
      objects.push({ x: 270, r: 26, label: 'Sleep on the cot (saves)', act: 'cot' });
      npc('deputy', 'Deputy Ned', 212, { lines: [
        ['Don\'t you worry about the town, Sheriff. I\'ll keep the peace till you\'re back.'],
        ['Jack fights dirty. Watch for him windin\' up, then block at the last second.'],
        ['Get yourself a horse from Pete. Ain\'t no catchin\' a rider on foot.'],
      ] });
    } else if (b.id === 'store') {
      for (const sx of [44, 150]) ctx.drawImage(F.shelf(100, 'full', r), sx, 36), ctx.drawImage(F.shelf(100, 'full', r), sx, 68);
      draw(ctx, F.sacks(), 260, FLOOR + 1);
      draw(ctx, C.barrel.closed, 288, FLOOR + 1);
      draw(ctx, C.crate.closed, 50, FLOOR + 1);
      const ctr = F.counter(130);
      fg.drawImage(ctr, 110, FLOOR - ctr.height + 6);
      fg.drawImage(F.jars(r), 130, FLOOR - ctr.height - 3);
      draw(fg, F.lamp(), 220, FLOOR - ctr.height + 6);
      lights.push({ x: 222, y: FLOOR - 30, r: 70, col: [255, 210, 140] });
      npc('shopkeep', 'Martha', 180, { y: GROUND - 10, shop: true });
      objects.push({ x: 175, r: 40, label: 'Shop with Martha', act: 'shop' });
    } else if (b.id === 'saloon') {
      ctx.drawImage(F.mirror(70), 40, 34);
      ctx.drawImage(F.bottles(80, r), 36, 66);
      ctx.drawImage(box(84, 2, [110, 70, 40]), 34, 80);
      ctx.drawImage(F.bottles(80, r), 36, 86);
      ctx.drawImage(box(84, 2, [110, 70, 40]), 34, 100);
      ctx.drawImage(F.stairs(), 264, FLOOR - 95);
      draw(ctx, F.piano(), 168, FLOOR + 1);
      draw(ctx, F.roundTable(), 230, FLOOR + 1);
      draw(ctx, F.chair(), 220, FLOOR + 1);
      ctx.drawImage(F.chandelier(), 180, 14);
      const bar = F.counter(110, [96, 56, 34], [150, 96, 56]);
      fg.drawImage(bar, 30, FLOOR - bar.height + 6);
      fg.fillStyle = '#c8a050'; fg.fillRect(32, FLOOR + 3, 108, 1);
      lights.push({ x: 195, y: 24, r: 110, col: [255, 200, 120] });
      lights.push({ x: 80, y: FLOOR - 30, r: 60, col: [255, 190, 110] });
      npc('bartender', 'Gus', 86, { y: GROUND - 10 });
      npc('singer', 'Miss Lila', 210, { face: -1, lines: [
        ['Evenin\', Sheriff. Silver Jack tipped me a whole silver dollar last night. Said he was "goin\' up in the world."'],
        ['Up in the world... the snowy peaks, maybe? That man always liked the cold.'],
      ] });
      npc('gambler', 'Slick Doyle', 246, { face: -1, lines: [
        ['Care for a hand of poker, Sheriff? ...No? Pity.'],
        ['Word is the old way station out west still has supplies nobody\'s found. Folks are scared of the snakes.'],
      ] });
      objects.push({ x: 86, r: 40, label: 'Talk to Gus at the bar', act: 'bar' });
      objects.push({ x: 184, r: 14, label: 'Play the piano', act: 'piano' });
      objects.push({ x: 290, r: 22, label: 'Go upstairs (rent a room)', act: 'stairs' });
    } else if (b.id === 'bank') {
      draw(ctx, F.vault(), 236, FLOOR + 1);
      draw(ctx, F.clock(), 200, FLOOR - 50);
      draw(ctx, F.bench(), 40, FLOOR + 1);
      const ctr = F.counter(120, [90, 60, 40], [150, 110, 70]);
      fg.drawImage(ctr, 80, FLOOR - ctr.height + 6);
      fg.drawImage(F.tellerCage(120), 81, FLOOR - ctr.height - 34);
      draw(fg, F.lamp(), 170, FLOOR - ctr.height + 6);
      lights.push({ x: 172, y: FLOOR - 30, r: 60, col: [255, 210, 140] });
      npc('teller', 'Eustace (Teller)', 130, { y: GROUND - 10, lines: [
        ['The bank\'s offering a $500 reward for Jack Calloway. Dead or... well, the Sheriff brings \'em in alive, don\'t he.'],
        ['Jack knew the vault combination. Somebody must\'ve told him. Mighty suspicious.'],
      ] });
      objects.push({ x: 270, r: 30, label: 'Look into the vault', act: 'vault' });
    } else if (b.id === 'stable') {
      draw(ctx, F.saddleRack(), 40, FLOOR + 1);
      draw(ctx, F.hay(), 74, FLOOR + 1);
      ctx.drawImage(F.tools(), 50, 64);
      lights.push({ x: 110, y: 70, r: 80, col: [255, 200, 120] });
      for (const [i, sx] of [[0, 128], [1, 192], [2, 256]]) fg.drawImage(F.stall(), sx - 2, FLOOR - 24);
      npc('stablehand', 'Pete', 100, { face: 1 });
      objects.push({ x: 100, r: 26, label: 'Talk to Pete about horses', act: 'horses' });
    }
    return { kind: 'town', building: b, img, fg: fgc, containers: [], windows, objects, npcs, lights, door: 24, name: b.label, stalls: b.id === 'stable' ? [158, 222, 286] : null };
  }

  return { buildAbandoned, buildTown, FLOOR, STYLES, F, box };
})();
