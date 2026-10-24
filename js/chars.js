// People built from the Mucho Pixels character pack (js/charframes.js).
// Every frame is repainted for a "look": skin, hair, clothes, then a hat,
// vest, star, neckerchief, belt, boots, sleeves or skirt are drawn on top in
// the pack's own pixel size. Frames are drawn at 2x so people stand ~60px.
const Chars = (() => {
  const SCALE = 2;
  const ANCHOR = 17 * SCALE;   // body centre column inside a frame

  // ------------------------------------------------------------ palettes
  const SKINS = [
    { name: 'Fair', c: [[244, 196, 158], [212, 152, 116], [168, 106, 80]] },
    { name: 'Tan', c: [[230, 156, 105], [191, 111, 74], [138, 72, 54]] },
    { name: 'Brown', c: [[191, 111, 74], [138, 72, 54], [93, 44, 40]] },
    { name: 'Dark', c: [[138, 72, 54], [93, 44, 40], [57, 31, 33]] },
  ];
  const HAIRS = [
    { name: 'Brown', c: [[138, 72, 54], [93, 44, 40]] },
    { name: 'Black', c: [[57, 31, 33], [28, 18, 28]] },
    { name: 'Blonde', c: [[244, 214, 120], [212, 160, 72]] },
    { name: 'Red', c: [[192, 84, 44], [138, 50, 30]] },
    { name: 'Gray', c: [[176, 176, 184], [124, 122, 134]] },
    { name: 'White', c: [[236, 234, 228], [186, 184, 190]] },
  ];
  const HATS = [
    { name: 'Cream Stetson', style: 'cowboy', c: [[226, 206, 160], [186, 164, 120], [92, 62, 40]] },
    { name: 'Black Stetson', style: 'cowboy', c: [[58, 52, 56], [38, 34, 38], [150, 120, 70]] },
    { name: 'Brown Stetson', style: 'cowboy', c: [[140, 96, 60], [108, 72, 42], [60, 40, 26]] },
    { name: 'White Stetson', style: 'cowboy', c: [[242, 238, 226], [204, 198, 184], [60, 60, 70]] },
    { name: 'Gray Bowler', style: 'bowler', c: [[96, 92, 96], [66, 62, 66], [40, 36, 40]] },
    { name: 'No hat', style: 'none', c: null },
  ];
  const FACES = ['Clean-shaven', 'Mustache', 'Beard'];
  const OUTLINE = [20, 10, 22];
  const GOLD = [[246, 206, 84], [196, 146, 44]];
  const shade = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
  const ramp = c => [c, shade(c, 0.78), shade(c, 0.6)];

  // The sheriff's default look; the customiser edits a copy of this.
  const DEFAULT_LOOK = { g: 'm', skin: 0, hair: 0, hat: 0, face: 1 };

  // --------------------------------------------------------- grid helpers
  const at = (g, x, y) => (y >= 0 && y < g.length && x >= 0 && x < g[0].length ? g[y][x] : '.');
  const set = (g, x, y, c) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function components(g, roles) {
    const id = g.map(r => r.map(() => -1)), out = [];
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      if (id[y][x] >= 0 || !roles.includes(g[y][x])) continue;
      const comp = [], stack = [[x, y]];
      id[y][x] = out.length;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        comp.push([cx, cy]);
        for (const [dx, dy] of N4) {
          const nx = cx + dx, ny = cy + dy;
          if (roles.includes(at(g, nx, ny)) && id[ny][nx] < 0) { id[ny][nx] = out.length; stack.push([nx, ny]); }
        }
      }
      out.push(comp);
    }
    return out;
  }
  function find(g, roles) {
    const pts = [];
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (roles.includes(g[y][x])) pts.push([x, y]);
    return pts;
  }
  // Wrap newly painted pixels (marked in `mine`) in outline where they touch nothing.
  function outlineNew(g, mine) {
    const add = [];
    for (const [x, y] of mine) for (const [dx, dy] of [...N4, [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (at(g, x + dx, y + dy) === '.') add.push([x + dx, y + dy]);
    }
    for (const [x, y] of add) set(g, x, y, 'A');
  }

  // ------------------------------------------------------------ dress-up
  function analyse(g) {
    const hair = find(g, 'Hh'), shirt = find(g, 'Ttu'), pants = find(g, 'Pp');
    const top = hair.length ? Math.min(...hair.map(p => p[1])) : 12;
    const near = hair.filter(p => p[1] <= top + 2);
    const hx0 = Math.min(...near.map(p => p[0])), hx1 = Math.max(...near.map(p => p[0]));
    const shirtTop = Math.min(...shirt.map(p => p[1]));
    const pantsTop = pants.length ? Math.min(...pants.map(p => p[1])) : g.length - 8;
    // skin: the piece touching the most hair is the head, the rest are arms
    const skin = components(g, 'Ssk');
    let head = null, best = -1;
    for (const c of skin) {
      let n = 0;
      for (const [x, y] of c) for (const [dx, dy] of N4) if ('Hh'.includes(at(g, x + dx, y + dy))) n++;
      if (n > best) { best = n; head = c; }
    }
    return { top, hx0, hx1, shirtTop, pantsTop, head, arms: skin.filter(c => c !== head), shirt };
  }

  function dress(rows, look) {
    const g = rows.map(r => r.split(''));
    const a = analyse(g);
    if (!a.shirt.length) return g;
    const cx = Math.round(a.shirt.reduce((s, p) => s + p[0], 0) / a.shirt.length);

    // long sleeves: arm skin becomes shirt, except the hand at the far end
    if (look.sleeves !== false) {
      const sx = cx, sy = a.shirtTop + 2;
      for (const arm of a.arms) {
        let far = arm[0], fd = -1;
        for (const p of arm) { const d = (p[0] - sx) ** 2 + (p[1] - sy) ** 2; if (d > fd) { fd = d; far = p; } }
        for (const [x, y] of arm) {
          if (Math.hypot(x - far[0], y - far[1]) <= 2.3) continue;
          g[y][x] = { S: 'T', s: 't', k: 'u' }[g[y][x]];
        }
      }
    }
    const torso = a.shirt.filter(([x, y]) => y < a.pantsTop);
    // vest over the torso, shirt showing down the front
    if (look.vest) for (const [x, y] of torso) {
      if (y === a.shirtTop || x === cx || x === cx + 1) continue;
      g[y][x] = g[y][x] === 'T' ? 'V' : 'v';
    }
    if (look.apron) for (const [x, y] of torso) if (y > a.shirtTop + 1 && x >= cx - 2 && x <= cx + 2) g[y][x] = 'E';
    // neckerchief knotted at the throat
    if (look.scarf) {
      for (const [x, y] of torso) if (y <= a.shirtTop + 1) g[y][x] = y === a.shirtTop ? 'N' : 'n';
      if (at(g, cx, a.shirtTop + 2) !== 'A') set(g, cx, a.shirtTop + 2, 'n');
    }
    if (look.star) {
      const sx = cx - 3, sy = a.shirtTop + 4;
      set(g, sx, sy, 'Y'); set(g, sx - 1, sy, 'y'); set(g, sx + 1, sy, 'y'); set(g, sx, sy - 1, 'Y'); set(g, sx, sy + 1, 'y');
    }
    // belt and buckle
    if (look.belt !== false) {
      for (let x = 0; x < g[0].length; x++) if ('Pp'.includes(at(g, x, a.pantsTop))) g[a.pantsTop][x] = 'L';
      if (at(g, cx, a.pantsTop) === 'L') g[a.pantsTop][cx] = 'Y';
    }
    // boots: shoes plus the bottom of the trouser leg
    if (look.boots !== false) for (let x = 0; x < g[0].length; x++) {
      let y0 = -1;
      for (let y = 0; y < g.length; y++) if ('Bb'.includes(g[y][x])) { y0 = y; break; }
      if (y0 < 0) continue;
      for (let y = y0 - 3; y < y0; y++) if ('Pp'.includes(at(g, x, y))) g[y][x] = g[y][x] === 'P' ? 'B' : 'b';
    }
    // a long skirt over the legs
    if (look.skirt) {
      const mine = [];
      let bottom = g.length;
      for (let y = g.length - 1; y > a.pantsTop; y--) if (g[y].some(c => 'Bb'.includes(c))) bottom = y; else if (bottom < g.length) break;
      for (let y = a.pantsTop + 1; y < bottom; y++) {
        const xs = [];
        for (let x = 0; x < g[0].length; x++) if ('PpBbAL'.includes(g[y][x]) && (y > a.pantsTop + 1 || 'Pp'.includes(at(g, x, y - 1)) || at(g, x, y - 1) === 'L')) xs.push(x);
        const legs = xs.filter(x => 'PpBb'.includes(g[y][x]));
        if (!legs.length) continue;
        const flare = Math.floor((y - a.pantsTop) / 4);
        const x0 = Math.min(...legs) - flare, x1 = Math.max(...legs) + flare;
        const mid = (x0 + x1) / 2;
        for (let x = x0; x <= x1; x++) { g[y][x] = x > mid + 1 ? 'j' : 'K'; mine.push([x, y]); }
      }
      outlineNew(g, mine);
    }
    // facial hair on the lower face, toward the front
    if (look.face && a.head) {
      const face = a.head.filter(([x, y]) => y < a.shirtTop);
      const rowsY = [...new Set(face.map(p => p[1]))].sort((p, q) => p - q);
      const chin = rowsY[rowsY.length - 1];
      const front = y => face.filter(p => p[1] === y).map(p => p[0]);
      const paint = (y, n) => { const xs = front(y).sort((p, q) => q - p).slice(0, n); for (const x of xs) g[y][x] = 'M'; };
      if (look.face === 1) { paint(chin - 2, 3); }
      if (look.face === 2) { paint(chin - 2, 3); paint(chin - 1, 4); paint(chin, 4); }
    }
    if (look.mask && a.head) {
      const face = a.head.filter(([x, y]) => y < a.shirtTop);
      const chin = Math.max(...face.map(p => p[1]));
      for (const [x, y] of face) if (y >= chin - 2) g[y][x] = y === chin - 2 ? 'N' : 'n';
    }
    hat(g, a, look);
    return g;
  }

  // Hats are drawn in the pack's pixel size over the top of the head.
  function hat(g, a, look) {
    const style = look.hatStyle;
    if (!style || style === 'none') return;
    const mine = [], put = (x, y, c) => { set(g, x, y, c); mine.push([x, y]); };
    const { top, hx0, hx1 } = a, w = hx1 - hx0;
    const row = (y, x0, x1, c) => { for (let x = x0; x <= x1; x++) put(x, y, typeof c === 'function' ? c(x) : c); };
    if (style === 'cowboy') {
      // creased crown, band, wide brim curling up at the ends
      row(top - 2, hx0 + 2, hx1 - 2, x => (x === Math.round((hx0 + hx1) / 2) ? 'w' : 'W'));
      row(top - 1, hx0 + 1, hx1 - 1, x => (x > hx1 - 3 ? 'w' : 'W'));
      row(top, hx0 + 1, hx1 - 1, 'x');
      row(top + 1, hx0 - 2, hx1 + 3, x => (x > hx1 ? 'w' : 'W'));
      put(hx0 - 3, top, 'W'); put(hx1 + 4, top, 'w');
      for (let x = hx0 - 1; x <= hx1 + 2; x++) if (at(g, x, top + 2) === '.') put(x, top + 2, 'w');
    } else if (style === 'bowler') {
      row(top - 2, hx0 + 2, hx1 - 2, 'W');
      row(top - 1, hx0 + 1, hx1 - 1, x => (x > hx1 - 3 ? 'w' : 'W'));
      row(top, hx0 + 1, hx1 - 1, 'x');
      row(top + 1, hx0 - 1, hx1 + 1, 'w');
    } else if (style === 'top') {
      for (let y = top - 6; y < top; y++) row(y, hx0 + 1, hx1 - 1, x => (x > hx1 - 3 ? 'w' : 'W'));
      row(top - 1, hx0 + 1, hx1 - 1, 'x');
      row(top, hx0 - 1, hx1 + 1, 'w');
    } else if (style === 'bonnet') {
      // round bonnet framing the face, ribbon at the chin
      row(top - 1, hx0, hx1, 'W');
      row(top, hx0 - 1, hx1 + 1, x => (x > hx1 - 1 ? 'w' : 'W'));
      row(top + 1, hx0 - 1, hx1 + 1, x => (x === hx1 + 1 ? 'x' : x > hx1 - 2 ? 'w' : 'W'));
      for (let y = top + 2; y < top + 6; y++) { put(hx0 - 1, y, 'W'); put(hx0, y, 'w'); put(hx1 + 1, y, 'w'); }
    } else if (style === 'cap') {
      row(top - 1, hx0 + 1, hx1 - 1, 'W');
      row(top, hx0, hx1, x => (x > hx1 - 2 ? 'w' : 'W'));
      row(top + 1, hx1 - 2, hx1 + 3, 'x');
    }
    outlineNew(g, mine);
    void w;
  }

  // A kid is a grown-up frame with some torso and leg rows taken out.
  function shrink(g) {
    const a = analyse(g);
    const drop = new Set();
    for (let y = a.shirtTop + 2; y < g.length - 2; y += 3) drop.add(y);
    const kept = g.filter((r, y) => !drop.has(y));
    while (kept.length < g.length) kept.unshift(g[0].map(() => '.'));
    return kept;
  }

  // --------------------------------------------------------- the sheriff's
  // customiser look -> a full look description
  function sheriffLook(c) {
    c = Object.assign({}, DEFAULT_LOOK, c || {});
    const h = HATS[c.hat] || HATS[0];
    return {
      g: c.g, skin: SKINS[c.skin].c, hair: HAIRS[c.hair].c, hatStyle: h.style, hatCol: h.c,
      shirt: [70, 112, 170], pants: [112, 86, 62], vest: [118, 78, 48], scarf: [44, 52, 96], boots: [96, 60, 36],
      star: true, face: c.g === 'm' ? c.face : 0, skirt: false,
    };
  }

  function palette(look) {
    const hair = look.hair || HAIRS[0].c, skin = look.skin || SKINS[0].c;
    const sh = ramp(look.shirt || [200, 200, 200]), pa = ramp(look.pants || [80, 80, 100]);
    const hc = look.hatCol || [[200, 180, 140], [160, 140, 100], [80, 60, 40]];
    const ve = ramp(look.vest || [100, 70, 50]), sc = ramp(look.scarf || [160, 40, 40]);
    const bo = ramp(look.boots || [80, 50, 30]), sk = ramp(look.skirt || [120, 60, 70]);
    const pal = {
      A: OUTLINE, S: skin[0], s: skin[1], k: skin[2], H: hair[0], h: hair[1], M: shade(hair[1], 0.85),
      T: sh[0], t: sh[1], u: sh[2], P: pa[0], p: pa[1], L: [58, 36, 24], Y: GOLD[0], y: GOLD[1],
      B: bo[0], b: bo[1], V: ve[0], v: ve[1], N: sc[0], n: sc[1], W: hc[0], w: hc[1], x: hc[2],
      K: sk[0], j: sk[1], E: [236, 232, 220],
    };
    return pal;
  }

  function render(g, pal) {
    const h = g.length, w = g[0].length;
    const img = U.canvas(w * SCALE, h * SCALE), flash = U.canvas(w * SCALE, h * SCALE);
    const c = img.getContext('2d'), f = flash.getContext('2d');
    f.fillStyle = '#fff';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = g[y][x];
      if (r === '.') continue;
      const col = pal[r] || [255, 0, 255];
      c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      c.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      f.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
    return { img, flash };
  }

  // Guard: hanging arms removed, both fists raised in front of the face.
  function guardGrid(rows, look) {
    const raw = rows.map(r => r.split(''));
    const a0 = analyse(raw);
    for (const arm of a0.arms) for (const [x, y] of arm) raw[y][x] = '.';
    // drop outline left floating where the arms were
    for (let y = 0; y < raw.length; y++) for (let x = 0; x < raw[0].length; x++) {
      if (raw[y][x] !== 'A') continue;
      let solid = false;
      for (const [dx, dy] of [...N4, [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const c = at(raw, x + dx, y + dy); if (c !== '.' && c !== 'A') solid = true; }
      if (!solid) raw[y][x] = '.';
    }
    const g = dress(raw.map(r => r.join('')), look);
    const a = analyse(g);
    const right = Math.max(...a.shirt.filter(p => p[1] <= a.shirtTop + 4).map(p => p[0]));
    const mine = [];
    const put = (x, y, c) => { if (at(g, x, y) === '.' || at(g, x, y) === 'A' || c === 'S' || c === 's') { set(g, x, y, c); mine.push([x, y]); } };
    // two forearms rising from the chest to fists by the chin
    for (const [ox, oy, fx, fy] of [[right, a.shirtTop + 4, right + 4, a.shirtTop], [right - 1, a.shirtTop + 7, right + 3, a.shirtTop + 4]]) {
      const n = Math.max(Math.abs(fx - ox), Math.abs(fy - oy));
      for (let i = 0; i <= n; i++) {
        const x = Math.round(ox + (fx - ox) * i / n), y = Math.round(oy + (fy - oy) * i / n);
        set(g, x, y, 'T'); set(g, x + 1, y, 't'); mine.push([x, y], [x + 1, y]);
      }
      for (const [dx, dy] of [[0, -1], [1, -1], [0, -2], [1, -2], [2, -1], [2, -2]]) { set(g, fx + dx, fy + dy, dx === 2 ? 's' : 'S'); mine.push([fx + dx, fy + dy]); }
    }
    void put;
    outlineNew(g, mine);
    return g;
  }

  // Riding: the upper body sits in the saddle, the near leg hangs down.
  function riderGrid(g) {
    const a = analyse(g);
    const out = g.slice(0, a.pantsTop + 1).map(r => r.slice());
    const hip = a.pantsTop, cx = Math.round(a.shirt.reduce((s, p) => s + p[0], 0) / a.shirt.length);
    for (let i = 0; i < 9; i++) out.push(out[0].map(() => '.'));
    const mine = [];
    const put = (x, y, c) => { set(out, x, y, c); mine.push([x, y]); };
    for (let y = hip + 1; y <= hip + 3; y++) for (let x = cx - 4; x <= cx + 4; x++) put(x, y, y === hip + 3 ? 'p' : 'P');
    for (let y = hip + 4; y <= hip + 6; y++) for (let x = cx + 2; x <= cx + 4; x++) put(x, y, x === cx + 4 ? 'p' : 'P');
    for (let y = hip + 7; y <= hip + 8; y++) for (let x = cx + 2; x <= cx + 6; x++) put(x, y, y === hip + 8 ? 'b' : 'B');
    outlineNew(out, mine);
    return { g: out, hip: hip + 1 };
  }

  // ------------------------------------------------------------ townsfolk
  const hatC = c => [c, shade(c, 0.76), shade(c, 0.45)];
  const P = (g, skin, hair, hatStyle, hat, shirt, pants, extra) =>
    Object.assign({ g, skin: SKINS[skin].c, hair: HAIRS[hair].c, hatStyle, hatCol: hat && hatC(hat), shirt, pants }, extra || {});
  const PEOPLE = {
    banker: P('m', 0, 4, 'bowler', [70, 70, 76], [236, 232, 220], [60, 60, 70], { vest: [74, 74, 84], scarf: [140, 30, 40], face: 1 }),
    teller: P('m', 1, 1, 'bowler', [120, 84, 52], [230, 226, 210], [90, 80, 70], { vest: [150, 120, 80], face: 0 }),
    postmaster: P('m', 2, 4, 'cap', [60, 70, 110], [220, 214, 196], [60, 66, 96], { vest: [60, 70, 110], face: 1 }),
    prospector: P('m', 1, 5, 'cowboy', [150, 110, 70], [170, 60, 50], [110, 100, 80], { face: 2 }),
    shopkeep: P('f', 0, 3, 'none', null, [110, 140, 180], [80, 80, 90], { skirt: [86, 110, 150], apron: true, boots: [60, 40, 30] }),
    singer: P('f', 2, 1, 'none', null, [200, 50, 70], [80, 80, 90], { skirt: [170, 40, 60], boots: [40, 30, 34], belt: false }),
    bartender: P('m', 1, 1, 'none', null, [236, 230, 214], [60, 52, 50], { vest: [110, 36, 40], apron: true, face: 1 }),
    townsman: P('m', 0, 0, 'cowboy', [180, 150, 110], [200, 180, 140], [90, 80, 110], { vest: [70, 80, 110] }),
    stablehand: P('m', 3, 1, 'cowboy', [226, 200, 120], [190, 90, 60], [70, 90, 130], { scarf: [150, 60, 40] }),
    doc: P('m', 0, 4, 'top', [40, 36, 36], [236, 232, 220], [52, 48, 50], { vest: [52, 48, 50], face: 1 }),
    gambler: P('m', 0, 1, 'top', [30, 26, 30], [220, 214, 200], [30, 28, 32], { vest: [150, 30, 50], face: 1 }),
    townswoman: P('f', 1, 0, 'bonnet', [220, 200, 160], [150, 110, 150], [80, 80, 90], { skirt: [120, 80, 120] }),
    cowhand: P('m', 2, 0, 'cowboy', [120, 84, 52], [170, 70, 56], [80, 90, 120], { vest: [150, 120, 86], scarf: [220, 200, 120] }),
    oldtimer: P('m', 0, 5, 'cowboy', [90, 80, 70], [200, 190, 160], [100, 84, 64], { face: 2, vest: [90, 70, 50] }),
    smith: P('m', 3, 1, 'none', null, [170, 130, 90], [70, 60, 56], { apron: true, face: 2, sleeves: false }),
    preacher: P('m', 1, 4, 'top', [46, 42, 42], [40, 38, 40], [40, 38, 40], { scarf: [236, 236, 236] }),
    deputy: P('m', 1, 3, 'cowboy', [120, 90, 60], [150, 140, 110], [90, 70, 50], { vest: [60, 70, 50], star: true, face: 1 }),
    kid: P('m', 1, 2, 'cap', [200, 170, 90], [200, 90, 60], [70, 90, 140], { kid: true }),
    // Silverbend
    miner: P('m', 1, 0, 'cap', [120, 100, 70], [150, 120, 90], [70, 66, 70], { scarf: [160, 40, 36], face: 2, sleeves: false }),
    miner2: P('m', 3, 1, 'cap', [90, 90, 96], [110, 120, 140], [86, 70, 56], { vest: [70, 54, 40] }),
    foreman: P('m', 0, 4, 'cowboy', [100, 80, 60], [200, 190, 170], [70, 66, 70], { vest: [60, 60, 66], face: 1 }),
    assayer: P('m', 0, 4, 'bowler', [50, 50, 56], [236, 232, 220], [60, 60, 70], { vest: [90, 30, 40], face: 1 }),
    miningwife: P('f', 2, 1, 'bonnet', [170, 150, 120], [150, 120, 90], [80, 80, 90], { skirt: [90, 90, 110], apron: true }),
    outlaw: P('m', 0, 1, 'cowboy', [58, 52, 56], [120, 40, 36], [60, 54, 50], { mask: true, scarf: [150, 30, 30], vest: [60, 50, 46] }),
    outlaw2: P('m', 2, 0, 'cowboy', [110, 80, 56], [190, 170, 120], [70, 60, 52], { mask: true, scarf: [60, 60, 70], face: 0 }),
    outlaw3: P('f', 1, 3, 'cowboy', [70, 60, 50], [90, 100, 80], [60, 50, 46], { mask: true, scarf: [150, 30, 30], vest: [100, 70, 46] }),
  };
  const person = kind => build(PEOPLE[kind] || PEOPLE.townsman);

  const FRAMES = ['idle', 'walk', 'run', 'punch', 'jump', 'fall', 'land', 'damage', 'death'];
  const cache = {};
  // Build (and cache) every animation for a look.
  function build(look) {
    const key = JSON.stringify(look);
    if (cache[key]) return cache[key];
    const pal = palette(look), src = CHAR_FRAMES[look.g === 'f' ? 'f' : 'm'];
    const set = { look };
    for (const name of FRAMES) {
      set[name] = src[name].map(rows => {
        let g = dress(rows, look);
        if (look.kid) g = shrink(g);
        return render(g, pal);
      });
    }
    set.block = render(look.kid ? shrink(guardGrid(src.idle[0], look)) : guardGrid(src.idle[0], look), pal);
    const r = riderGrid(dress(src.idle[0], look));
    set.ride = render(r.g, pal);
    set.rideHip = r.hip * SCALE;
    cache[key] = set;
    return set;
  }

  // Pick a frame for a state: 'idle', 'walk', 'run', 'punch', 'block', 'jump', 'fall', 'hurt', 'dead'.
  function frame(set, state, t) {
    const loop = (arr, fps) => arr[Math.floor(t * fps) % arr.length];
    switch (state) {
      case 'walk': return loop(set.walk, 1);
      case 'run': return loop(set.run, 1);
      case 'punch': return set.punch[Math.min(set.punch.length - 1, Math.floor(t))];
      case 'windup': return set.punch[0];
      case 'block': return set.block;
      case 'jump': return set.jump[0];
      case 'fall': return set.fall[0];
      case 'land': return set.land[0];
      case 'hurt': return set.damage[0];
      case 'dead': return set.death[Math.min(set.death.length - 1, Math.floor(t))];
      default: return loop(set.idle, 1);
    }
  }

  return { build, frame, person, PEOPLE, sheriffLook, SKINS, HAIRS, HATS, FACES, DEFAULT_LOOK, ANCHOR, SCALE, ramp };
})();
