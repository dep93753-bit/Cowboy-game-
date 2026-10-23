// Building exteriors in a chunky storefront style: each one is drawn on a
// half-size grid with bold ink outlines, big sign boards and flat colour
// bands, then doubled, so its pixels match the 2x people (doors are 70px).
// Every builder returns screen-pixel geometry: { img, door, wins, lamps, smoke }.
const Buildings = (() => {
  const S = 2;                        // art pixels -> screen pixels
  const INK = [38, 24, 20];
  const sh = U.shade;
  const DOOR = 35;                    // door height in art pixels (70 on screen)
  const DOOR_H = DOOR * S;

  // ------------------------------------------------------------ toolkit
  function rect(p, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.put(x + i, y + j, typeof c === 'function' ? c(i, j) : c); }
  function box(p, x, y, w, h, c) { rect(p, x, y, w, h, c); for (let i = 0; i < w; i++) { p.put(x + i, y, INK); p.put(x + i, y + h - 1, INK); } for (let j = 0; j < h; j++) { p.put(x, y + j, INK); p.put(x + w - 1, y + j, INK); } }
  function darken(p, x0, y0, w, h, f) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (p.has(x, y)) p.put(x, y, sh(p.get(x, y), f));
  }
  // Horizontal siding: 3px boards with a shadow line and the odd joint.
  function planks(p, r, x0, y0, w, h, col, old = 0) {
    for (let y = y0; y < y0 + h; y++) {
      const row = Math.floor((y - y0) / 3), ly = (y - y0) % 3;
      const tint = 0.95 + ((row * 37) % 5) / 50;
      const joint = x0 + 3 + (row * 23) % Math.max(1, w - 6);
      for (let x = x0; x < x0 + w; x++) {
        let c = sh(col, tint);
        if (ly === 2) c = sh(col, 0.72);
        if (x === joint && ly !== 2) c = sh(col, 0.78);
        if (old && r() < old * 0.07) c = sh(c, 0.8 + r() * 0.3);
        p.put(x, y, c);
      }
    }
  }
  // Vertical board-and-batten.
  function boards(p, r, x0, y0, w, h, col, old = 0) {
    for (let x = x0; x < x0 + w; x++) {
      const b = Math.floor((x - x0) / 4), lx = (x - x0) % 4;
      const tint = 0.94 + ((b * 29) % 5) / 45;
      for (let y = y0; y < y0 + h; y++) {
        let c = sh(col, tint);
        if (lx === 3) c = sh(col, 0.68); else if (lx === 0) c = sh(col, tint * 1.1);
        if (old && r() < old * 0.07) c = sh(c, 0.78 + r() * 0.35);
        p.put(x, y, c);
      }
    }
  }
  function bricks(p, x0, y0, w, h, col) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / 3), off = (row % 2) * 3;
      const mortar = (y - y0) % 3 === 2 || (x - x0 + off) % 6 === 5;
      p.put(x, y, mortar ? sh(col, 0.62) : sh(col, 0.92 + (((x - x0 + off) / 6 | 0) * 7 + row * 3) % 4 / 22));
    }
  }
  function stone(p, x0, y0, w, h, col) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / 4), off = (row % 2) * 4;
      const mortar = (y - y0) % 4 === 3 || (x - x0 + off) % 8 === 7;
      const t = 0.9 + (((x - x0 + off) >> 3) * 11 + row * 5) % 5 / 25;
      p.put(x, y, mortar ? sh(col, 0.68) : (y - y0) % 4 === 0 ? sh(col, t * 1.08) : sh(col, t));
    }
  }
  // Cap moulding along the top of a false front.
  function cap(p, x0, y, w, col) {
    rect(p, x0 - 1, y, w + 2, 1, sh(col, 1.2));
    rect(p, x0 - 1, y + 1, w + 2, 1, col);
    rect(p, x0, y + 2, w, 1, sh(col, 0.6));
    for (let x = x0 - 1; x < x0 + w + 1; x++) p.put(x, y - 1, INK);
  }
  function pillar(p, x, y0, y1, col) { for (let y = y0; y < y1; y++) { p.put(x, y, sh(col, 1.15)); p.put(x + 1, y, sh(col, 0.75)); } }
  function window(p, x, y, w, h, o = {}) {
    const fr = o.frame || [236, 226, 198], glass = o.glass || [52, 70, 96];
    box(p, x, y, w, h, fr);
    for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) {
      let c = o.lit ? [242, 186, 98] : glass;
      if (i - j === 1 || i - j === 2) c = sh(c, 1.45);                 // reflection
      if (o.broken && (i * 5 + j * 3) % 4 === 0) c = [20, 16, 18];
      p.put(x + i, y + j, c);
    }
    if (!o.single) { for (let j = 2; j < h - 2; j++) p.put(x + (w >> 1), y + j, sh(fr, 0.85)); for (let i = 2; i < w - 2; i++) p.put(x + i, y + (h >> 1), sh(fr, 0.85)); }
    if (o.curtains) for (let j = 2; j < h - 2; j++) { p.put(x + 2, y + j, o.curtains); p.put(x + w - 3, y + j, o.curtains); if (j < 4) { p.put(x + 3, y + j, o.curtains); p.put(x + w - 4, y + j, o.curtains); } }
    if (o.goods) for (let i = 2; i < w - 2; i++) { const gh = 1 + ((i * 7) % 3); for (let j = h - 2 - gh; j < h - 2; j++) p.put(x + i, y + j, o.goods[(i >> 1) % o.goods.length]); }
    if (o.bars) for (let i = 3; i < w - 2; i += 2) for (let j = 2; j < h - 2; j++) p.put(x + i, y + j, [44, 42, 46]);
    if (o.board) for (const k of [0.3, 0.68]) for (let i = -1; i <= w; i++) { const yy = Math.round(y + h * k + (i - w / 2) * 0.3); p.put(x + i, yy, [158, 118, 78]); p.put(x + i, yy + 1, [112, 82, 54]); }
    // sill and head
    rect(p, x - 1, y + h, w + 2, 1, sh(fr, 0.65));
    if (o.head === 'pediment') for (let i = -1; i <= w; i++) { const t = Math.round(2 - Math.abs(i - (w - 1) / 2) / ((w + 1) / 2) * 2); p.put(x + i, y - 1 - t, fr); p.put(x + i, y - t, sh(fr, 0.7)); }
    else if (o.head === 'arch') for (let i = 0; i < w; i++) { const a = Math.round(Math.sqrt(Math.max(0, (w / 2) ** 2 - (i - w / 2 + 0.5) ** 2)) * 0.6); for (let k = 0; k < a; k++) p.put(x + i, y - k, k === a - 1 ? INK : k === a - 2 ? fr : glass); }
    else rect(p, x - 1, y - 1, w + 2, 1, sh(fr, 0.9));
    if (o.shutters) for (const sx of [x - 4, x + w]) { box(p, sx, y, 4, h, o.shutters); for (let j = 2; j < h - 1; j += 2) { p.put(sx + 1, y + j, sh(o.shutters, 0.7)); p.put(sx + 2, y + j, sh(o.shutters, 0.7)); } }
  }
  function door(p, x, y, w, h, o = {}) {
    const col = o.col || [118, 74, 42], fr = o.frame || [236, 226, 198];
    rect(p, x - 2, y - 2, w + 4, h + 2, INK);
    rect(p, x - 1, y - 1, w + 2, h + 1, fr);
    const type = o.type || 'panel';
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c = col;
      if (type === 'batwing') {
        c = [26, 16, 12];
        const leaf = i < w / 2 ? i : w - 1 - i;
        if (j > h * 0.3 && j < h * 0.66 && leaf > 0) c = j === Math.ceil(h * 0.3) || leaf === 1 ? INK : (j % 2 ? sh(col, 0.85) : col);
      } else if (type === 'barn') {
        const half = w / 2, lx = i % half, ly = j / h * half;
        c = i % 3 === 0 ? sh(col, 0.8) : col;
        if (lx < 1 || lx > half - 2 || j < 1 || j > h - 2 || Math.abs(lx - ly) < 0.8 || Math.abs(lx - (half - ly)) < 0.8) c = fr;
        if (o.open && i >= half) c = [24, 16, 12];
      } else {
        const two = type === 'double' || type === 'glass', lw = two ? w / 2 : w, li = i % lw;
        const inPanel = li > 1 && li < lw - 2 && ((j > 2 && j < h * 0.45) || (j > h * 0.52 && j < h - 3));
        if (type === 'glass' && li > 1 && li < lw - 2 && j > 2 && j < h * 0.45) c = (li + j) % 6 < 2 ? [150, 172, 196] : [56, 74, 100];
        else if (inPanel) c = (li === 2 || j === 3 || j === Math.ceil(h * 0.52) + 1) ? sh(col, 0.68) : sh(col, 0.92);
        if (two && i === Math.floor(lw) - 1) c = INK;
        if (o.open) c = i > w * 0.3 ? [24, 16, 12] : sh(col, 0.75);
      }
      p.put(x + i, y + j, c);
    }
    if ((type === 'panel' || type === 'double' || type === 'glass') && !o.open) { p.put(x + w - 3, y + Math.floor(h * 0.5), [232, 196, 90]); if (type !== 'panel') p.put(x + 2, y + Math.floor(h * 0.5), [232, 196, 90]); }
    if (o.transom) { box(p, x - 1, y - 6, w + 2, 5, fr); for (let i = 1; i < w + 1; i++) for (let j = -5; j < -2; j++) p.put(x - 1 + i, y + j, (i + j) % 5 < 2 ? [150, 172, 196] : [56, 74, 100]); }
  }
  // Sign board: ink border, and on boards tall enough an inner trim line in
  // the edge colour; letters always get a clear row above and below.
  function sign(p, x, y, w, h, bg, edge) {
    box(p, x, y, w, h, bg);
    if (h >= 11) { box(p, x, y, w, h, edge); for (let i = 0; i < w; i++) { p.put(x + i, y, INK); p.put(x + i, y + h - 1, INK); } for (let j = 0; j < h; j++) { p.put(x, y + j, INK); p.put(x + w - 1, y + j, INK); } rect(p, x + 2, y + 2, w - 4, h - 4, bg); }
    rect(p, x + 1, y + h - 2, w - 2, 1, sh(bg, 0.86));
    return { x, y, w, h };
  }
  // Striped awning: a flat band with a scalloped edge and a shadow under it.
  function awning(p, x0, x1, y, cols) {
    for (let x = x0; x < x1; x++) {
      const c = cols[Math.floor((x - x0) / 3) % cols.length];
      p.put(x, y, INK);
      for (let j = 1; j < 5; j++) p.put(x, y + j, j === 1 ? sh(c, 1.15) : j === 4 ? sh(c, 0.8) : c);
      const sc = (x - x0) % 3;
      p.put(x, y + 5, sc === 1 ? sh(c, 0.75) : INK);
      if (sc === 1) p.put(x, y + 6, INK);
    }
    darken(p, x0, y + 6, x1 - x0, 4, 0.75);
  }
  function porch(p, x0, x1, y, yb, o = {}) {
    const roof = o.roof || [118, 82, 50], post = o.post || [140, 100, 62];
    darken(p, x0, y + 3, x1 - x0, 5, 0.75);
    rect(p, x0 - 1, y - 1, x1 - x0 + 2, 1, INK);
    rect(p, x0 - 1, y, x1 - x0 + 2, 1, sh(roof, 1.3));
    rect(p, x0 - 1, y + 1, x1 - x0 + 2, 1, roof);
    rect(p, x0 - 1, y + 2, x1 - x0 + 2, 1, INK);
    for (const px of o.posts || [x0, x1 - 2]) { for (let yy = y + 3; yy < yb; yy++) { p.put(px, yy, sh(post, 1.15)); p.put(px + 1, yy, sh(post, 0.7)); } p.put(px - 1, y + 3, sh(post, 0.8)); p.put(px + 2, y + 3, sh(post, 0.8)); }
  }
  function balcony(p, x0, x1, y, col) {
    rect(p, x0 - 2, y, x1 - x0 + 4, 1, INK);
    rect(p, x0 - 2, y + 1, x1 - x0 + 4, 1, sh(col, 1.2));
    rect(p, x0 - 2, y + 2, x1 - x0 + 4, 1, col);
    rect(p, x0 - 2, y + 3, x1 - x0 + 4, 1, INK);
    darken(p, x0, y + 4, x1 - x0, 5, 0.75);
    rect(p, x0 - 2, y - 6, x1 - x0 + 4, 1, INK);
    rect(p, x0 - 2, y - 5, x1 - x0 + 4, 1, sh(col, 1.2));
    for (let x = x0 - 2; x < x1 + 2; x += 2) for (let yy = y - 4; yy < y; yy++) p.put(x, yy, x === x0 - 2 || x >= x1 ? INK : sh(col, 1.05));
  }
  function boardwalk(p, x0, x1, yb) {
    for (let x = x0; x < x1; x++) {
      p.put(x, yb - 2, x % 5 === 0 ? [120, 84, 52] : [184, 138, 88]);
      p.put(x, yb - 1, x % 5 === 0 ? [80, 54, 34] : [140, 100, 62]);
      p.put(x, yb, INK);
    }
  }
  function lantern(p, x, y) {
    p.put(x, y - 2, INK); p.put(x + 1, y - 2, INK); p.put(x + 1, y - 1, INK);
    box(p, x, y, 3, 4, [250, 206, 112]);
    p.put(x + 1, y + 1, [255, 240, 190]);
    return { x: (x + 1.5) * S, y: (y + 2) * S };
  }
  function poster(p, x, y, wanted) {
    box(p, x, y, 6, 7, [232, 214, 168]);
    rect(p, x + 1, y + 1, 4, 1, [120, 80, 50]);
    if (wanted) { rect(p, x + 2, y + 2, 2, 1, [50, 36, 30]); rect(p, x + 2, y + 3, 2, 2, [190, 146, 108]); }
    else { p.put(x + 2, y + 3, [140, 110, 80]); p.put(x + 3, y + 4, [140, 110, 80]); }
  }
  function gable(p, r, cx, yTop, half, yBase, col) {
    for (let y = yTop; y < yBase; y++) {
      const hw = Math.round(((y - yTop) / (yBase - yTop)) * half);
      for (let x = cx - hw; x <= cx + hw; x++) {
        let c = (y - yTop) % 3 === 2 ? sh(col, 0.72) : ((x + Math.floor((y - yTop) / 3) * 2) % 5 === 0 ? sh(col, 0.85) : col);
        if (r() < 0.02) c = sh(col, 0.8);
        p.put(x, y, c);
      }
      p.put(cx - hw - 1, y, INK); p.put(cx + hw + 1, y, INK);
    }
    for (let x = cx - half - 1; x <= cx + half + 1; x++) p.put(x, yBase, INK);
  }
  function chimney(p, x, yTop, h, col = [150, 80, 64]) {
    bricks(p, x, yTop, 5, h, col);
    rect(p, x - 1, yTop - 1, 7, 1, sh(col, 0.75));
    rect(p, x - 1, yTop - 2, 7, 1, sh(col, 1.1));
    return { x: (x + 2.5) * S, y: (yTop - 3) * S };
  }
  function star(p, x, y, c = [242, 201, 76]) {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [0, 2], [2, 2]]) p.put(x + dx, y + dy, c);
  }
  // Text painted after the pixel pass, in art pixels: [x, y, text, colour]
  const paint = [];
  function label(rect, text, col, dy = 0) {
    paint.push([rect.x + Math.floor((rect.w - Font.width(text)) / 2), rect.y + Math.floor((rect.h - 5) / 2) + dy, text, col]);
  }
  function finish(p) {
    Props.outline(p, INK);
    const art = p.done();
    const actx = art.getContext('2d');
    for (const [x, y, text, col] of paint) Font.draw(actx, text, x, y, col);
    paint.length = 0;
    const out = U.canvas(art.width * S, art.height * S), octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.drawImage(art, 0, 0, out.width, out.height);
    return out;
  }
  // canvas of w x h art pixels; the bottom row is the boardwalk's edge
  const sheet = (w, h) => ({ p: U.pix(w, h), yb: h - 1, gy: h - 3 });
  const R = ([x, y, w, h]) => [x * S, y * S, w * S, h * S];

  // ---------------------------------------------------- town buildings
  const TOWN = {};

  TOWN.sheriff = () => {
    const r = U.rng(11), { p, yb, gy } = sheet(68, 62);
    const x0 = 4, W = 60, top = 4, wall = [150, 104, 66], trim = [92, 60, 38];
    planks(p, r, x0, top + 2, W, gy - top - 2, wall);
    cap(p, x0, top, W, trim);
    const sg = sign(p, x0 + 9, top + 5, W - 18, 11, [236, 216, 164], trim);
    label(sg, 'SHERIFF', '#3a2416');
    star(p, x0 + 3, top + 9); star(p, x0 + W - 6, top + 9);
    window(p, x0 + 6, top + 22, 10, 9, { head: 'pediment' }); window(p, x0 + W - 16, top + 22, 10, 9, { head: 'pediment' });
    porch(p, x0 - 1, x0 + W + 1, gy - 43, gy, { posts: [x0, x0 + 19, x0 + 39, x0 + W - 2], roof: trim });
    window(p, x0 + 5, gy - 30, 11, 15, { curtains: [130, 60, 50] });
    window(p, x0 + W - 16, gy - 30, 11, 15, { bars: true });
    door(p, x0 + 23, gy - DOOR, 14, DOOR, { col: [100, 62, 36] });
    poster(p, x0 + 17, gy - 26, true); poster(p, x0 + 39, gy - 25, false);
    const lamp = lantern(p, x0 + 20, gy - 38);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    const ch = chimney(p, x0 + W - 10, top - 6, 5);
    return { img: finish(p), door: (x0 + 30) * S, wins: [R([x0 + 5, gy - 30, 11, 15]), R([x0 + 6, top + 22, 10, 9]), R([x0 + W - 16, top + 22, 10, 9])], lamps: [lamp], smoke: [ch] };
  };

  TOWN.bank = () => {
    const r = U.rng(22), { p, yb, gy } = sheet(66, 68);
    const x0 = 4, W = 58, top = 12, st = [168, 164, 160];
    stone(p, x0, top + 2, W, gy - top - 2, st);
    // pediment
    for (let y = top - 9; y < top; y++) { const hw = Math.round((y - top + 9) / 9 * (W / 2 - 4)); for (let x = x0 + W / 2 - hw; x < x0 + W / 2 + hw; x++) p.put(x, y, y === top - 9 + Math.floor(0) ? sh(st, 1.2) : sh(st, 1.08)); }
    paint.push([x0 + W / 2 - 15, top - 6, '1871', '#6a5e54']);
    cap(p, x0, top, W, [214, 210, 200]);
    const sg = sign(p, x0 + 12, top + 5, W - 24, 10, [46, 42, 40], [200, 190, 170]);
    label(sg, 'BANK', '#f2c94c');
    for (const cx of [x0 + 2, x0 + 15, x0 + W - 17, x0 + W - 4]) { rect(p, cx - 1, top + 17, 4, 1, [226, 222, 214]); pillar(p, cx, top + 18, gy - 3, [214, 210, 200]); rect(p, cx - 1, gy - 3, 4, 1, [226, 222, 214]); }
    for (const wx of [x0 + 5, x0 + W - 13]) { window(p, wx, top + 19, 8, 11, { head: 'arch', frame: [226, 222, 214] }); window(p, wx, gy - 26, 8, 16, { head: 'arch', frame: [226, 222, 214], bars: true }); }
    window(p, x0 + W / 2 - 5, top + 19, 10, 11, { head: 'arch', frame: [226, 222, 214] });
    door(p, x0 + W / 2 - 7, gy - 3 - DOOR, 14, DOOR, { type: 'glass', col: [70, 48, 32], frame: [226, 222, 214] });
    for (let k = 0; k < 2; k++) rect(p, x0 + W / 2 - 11 - k * 2, gy - 3 + k * 2 - 1, 22 + k * 4, 2, k ? [184, 180, 172] : [220, 216, 208]);
    const lamps = [lantern(p, x0 + W / 2 - 12, gy - 32), lantern(p, x0 + W / 2 + 10, gy - 32)];
    rect(p, x0 - 1, gy, W + 2, 2, [140, 136, 130]); rect(p, x0 - 1, yb, W + 2, 1, INK);
    void r;
    return { img: finish(p), door: (x0 + W / 2) * S, wins: [], lamps, smoke: [] };
  };

  TOWN.store = () => {
    const r = U.rng(33), { p, yb, gy } = sheet(76, 74);
    const x0 = 4, W = 68, top = 4, wall = [214, 172, 76], trim = [44, 120, 116];
    // stepped false front
    planks(p, r, x0, top + 10, W, gy - top - 10, wall);
    planks(p, r, x0 + 12, top + 2, W - 24, 10, wall);
    cap(p, x0 + 12, top, W - 24, trim); cap(p, x0, top + 8, 12, trim); cap(p, x0 + W - 12, top + 8, 12, trim);
    rect(p, x0, top + 11, 1, gy - top - 11, trim); rect(p, x0 + W - 1, top + 11, 1, gy - top - 11, trim);
    const sg = sign(p, x0 + 4, top + 12, W - 8, 11, [240, 232, 210], trim);
    label(sg, 'GENERAL STORE', '#7a2e22');
    paint.push([x0 + W / 2 - 17, top + 4, 'DRY GOODS', '#4a3a22']);
    const goods = [[200, 60, 50], [230, 206, 120], [80, 130, 70], [150, 150, 156], [210, 180, 130]];
    window(p, x0 + 3, gy - 24, 20, 17, { frame: [240, 232, 210], single: true, goods });
    window(p, x0 + W - 23, gy - 24, 20, 17, { frame: [240, 232, 210], single: true, goods });
    door(p, x0 + W / 2 - 7, gy - DOOR, 14, DOOR, { type: 'glass', col: trim, frame: [240, 232, 210] });
    awning(p, x0 - 1, x0 + W + 1, gy - 42, [[200, 54, 46], [240, 232, 214]]);
    pillar(p, x0, gy - 36, gy, [240, 232, 210]); pillar(p, x0 + W - 2, gy - 36, gy, [240, 232, 210]);
    const lamp = lantern(p, x0 + W / 2 - 12, gy - 31);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    return { img: finish(p), door: (x0 + W / 2) * S, wins: [R([x0 + 3, gy - 24, 20, 17]), R([x0 + W - 23, gy - 24, 20, 17])], lamps: [lamp], smoke: [] };
  };

  TOWN.doctor = () => {
    const r = U.rng(44), { p, yb, gy } = sheet(54, 70);
    const x0 = 4, W = 46, eave = gy - 49, wall = [80, 150, 146], trim = [236, 232, 220];
    planks(p, r, x0, eave, W, gy - eave, wall);
    gable(p, r, x0 + W / 2, eave - 17, W / 2 + 3, eave, [96, 84, 90]);
    window(p, x0 + W / 2 - 4, eave - 10, 8, 8, { head: 'arch', frame: trim });
    pillar(p, x0, eave, gy, trim); pillar(p, x0 + W - 2, eave, gy, trim);
    window(p, x0 + 6, gy - 28, 9, 14, { frame: trim, curtains: [240, 240, 240], shutters: [44, 90, 96] });
    window(p, x0 + W - 15, gy - 28, 9, 14, { frame: trim, curtains: [240, 240, 240], shutters: [44, 90, 96] });
    door(p, x0 + W / 2 - 6, gy - DOOR, 12, DOOR, { col: [44, 90, 96], frame: trim });
    const hs = sign(p, x0 + W / 2 - 16, eave + 2, 32, 9, [244, 240, 228], [44, 90, 96]);
    label(hs, 'DOCTOR', '#2a5a5a');
    rect(p, x0 + 2, eave + 5, 3, 1, [200, 50, 50]); rect(p, x0 + 3, eave + 4, 1, 3, [200, 50, 50]);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    const ch = chimney(p, x0 + W - 13, eave - 15, 8);
    return { img: finish(p), door: (x0 + W / 2) * S, wins: [R([x0 + 6, gy - 28, 9, 14]), R([x0 + W - 15, gy - 28, 9, 14])], lamps: [], smoke: [ch] };
  };

  TOWN.saloon = () => {
    const r = U.rng(55), { p, yb, gy } = sheet(90, 76);
    const x0 = 4, W = 82, top = 3, wall = [150, 66, 48], trim = [236, 214, 168];
    planks(p, r, x0, top + 2, W, gy - top - 2, wall);
    cap(p, x0, top, W, trim);
    const sg = sign(p, x0 + 14, top + 5, W - 28, 12, [244, 224, 172], [90, 40, 30]);
    label(sg, 'SALOON', '#7a1e1a');
    star(p, x0 + 6, top + 9, trim); star(p, x0 + W - 9, top + 9, trim);
    const hs = sign(p, x0 + W / 2 - 15, top + 19, 30, 9, [60, 30, 26], trim);
    label(hs, 'HOTEL', '#f2c94c');
    const wins = [];
    for (const wx of [x0 + 4, x0 + 20, x0 + W - 29, x0 + W - 13]) { window(p, wx, top + 30, 9, 12, { head: 'pediment', frame: trim, curtains: [190, 50, 60] }); wins.push(R([wx, top + 30, 9, 12])); }
    balcony(p, x0, x0 + W, gy - 42, [120, 56, 40]);
    window(p, x0 + 5, gy - 28, 16, 17, { frame: trim, curtains: [150, 30, 40] });
    window(p, x0 + W - 21, gy - 28, 16, 17, { frame: trim, curtains: [150, 30, 40] });
    wins.push(R([x0 + 5, gy - 28, 16, 17]), R([x0 + W - 21, gy - 28, 16, 17]));
    door(p, x0 + W / 2 - 8, gy - DOOR, 16, DOOR, { type: 'batwing', col: [124, 82, 46], frame: [90, 40, 30] });
    for (const px of [x0, x0 + 25, x0 + W - 27, x0 + W - 2]) pillar(p, px, gy - 38, gy, trim);
    const lamps = [lantern(p, x0 + W / 2 - 13, gy - 34), lantern(p, x0 + W / 2 + 11, gy - 34)];
    boardwalk(p, x0 - 3, x0 + W + 3, yb);
    const ch = chimney(p, x0 + 6, top - 4, 3);
    return { img: finish(p), door: (x0 + W / 2) * S, wins, lamps, smoke: [ch] };
  };

  TOWN.post = () => {
    const r = U.rng(66), { p, yb, gy } = sheet(60, 68);
    const x0 = 4, W = 52, top = 4, wall = [112, 132, 156], trim = [236, 232, 216];
    planks(p, r, x0, top + 2, W, gy - top - 2, wall);
    cap(p, x0, top, W, trim);
    const sg = sign(p, x0 + 1, top + 5, W - 2, 15, [240, 234, 216], [52, 62, 86]);
    label(sg, 'POST OFFICE', '#2a3a5a', -3); label(sg, 'TELEGRAPH', '#7a2e22', 3);
    porch(p, x0 - 1, x0 + W + 1, gy - 40, gy, { posts: [x0, x0 + W - 2], roof: [70, 82, 104] });
    window(p, x0 + 5, gy - 28, 11, 14, { frame: trim, shutters: [52, 62, 86] });
    window(p, x0 + W - 16, gy - 28, 11, 14, { frame: trim, shutters: [52, 62, 86] });
    door(p, x0 + W / 2 - 6, gy - DOOR, 12, DOOR, { col: [90, 64, 44], frame: trim });
    box(p, x0 + W - 6, gy - 14, 4, 6, [70, 70, 80]);   // mailbox
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    return { img: finish(p), door: (x0 + W / 2) * S, wins: [R([x0 + 5, gy - 28, 11, 14]), R([x0 + W - 16, gy - 28, 11, 14])], lamps: [], smoke: [] };
  };

  TOWN.blacksmith = () => {
    const r = U.rng(77), { p, yb, gy } = sheet(68, 58);
    const x0 = 4, W = 60, top = 8, wall = [104, 80, 58], trim = [64, 46, 32];
    boards(p, r, x0, top + 8, W, gy - top - 8, wall, 0.4);
    // tin shed roof
    for (let y = top; y < top + 8; y++) for (let x = x0 - 3; x < x0 + W + 3; x++) p.put(x, y, (y - top) % 3 === 0 ? [150, 150, 158] : x % 3 === 0 ? [96, 96, 104] : [124, 124, 132]);
    rect(p, x0 - 3, top + 8, W + 6, 1, INK);
    // open forge front
    const fx = x0 + 7, fw = W - 22, fy = gy - 36;
    box(p, fx - 1, fy - 1, fw + 2, gy - fy + 1, [30, 22, 18]);
    rect(p, fx, fy, fw, gy - fy, [34, 24, 20]);
    rect(p, fx + 3, gy - 14, 13, 14, (i, j) => ((j >> 1) + (i >> 2)) % 2 ? [120, 110, 100] : [98, 90, 82]);
    rect(p, fx + 5, gy - 17, 9, 3, (i, j) => (j > 1 ? [255, 120, 40] : i % 2 ? [255, 190, 80] : [255, 232, 150]));
    rect(p, fx + 7, fy, 5, gy - fy - 17, [60, 54, 50]);
    rect(p, fx + 21, gy - 11, 10, 2, [96, 96, 104]); rect(p, fx + 23, gy - 9, 6, 3, [64, 64, 70]); rect(p, fx + 24, gy - 6, 4, 6, [92, 64, 40]);
    for (const [tx, tl] of [[fx + 19, 7], [fx + 22, 9], [fx + 26, 6], [fx + 29, 8]]) rect(p, tx, fy + 3, 1, tl, [160, 160, 168]);
    pillar(p, fx - 2, fy, gy, trim); pillar(p, fx + fw, fy, gy, trim);
    const sg = sign(p, x0 + 6, top + 11, W - 12, 9, [62, 42, 30], [150, 106, 64]);
    label(sg, 'BLACKSMITH', '#f2c94c');
    for (let a = 0; a < 12; a++) { const ang = Math.PI * (0.15 + a / 11 * 1.7); p.put(x0 + W - 8 + Math.round(Math.cos(ang) * 3), gy - 26 + Math.round(Math.sin(ang) * 3), [170, 170, 180]); }
    const ch = chimney(p, fx + 7, top - 7, 7, [110, 100, 92]);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    return { img: finish(p), door: (fx + fw / 2) * S, wins: [], lamps: [{ x: (fx + 9) * S, y: (gy - 16) * S, forge: true }], smoke: [ch] };
  };

  TOWN.church = () => {
    const r = U.rng(88), { p, yb, gy } = sheet(54, 74);
    const x0 = 4, W = 46, eave = gy - 38, wall = [238, 234, 222], roof = [96, 80, 76];
    planks(p, r, x0, eave, W, gy - eave, wall);
    gable(p, r, x0 + W / 2, eave - 15, W / 2 + 3, eave, roof);
    // short steeple: belfry, little roof, cross
    const sx = x0 + W / 2 - 5;
    planks(p, r, sx, eave - 26, 10, 12, wall);
    box(p, sx + 2, eave - 24, 6, 7, [36, 30, 30]);
    rect(p, sx + 4, eave - 22, 2, 3, [210, 168, 70]);
    gable(p, r, sx + 5, eave - 33, 6, eave - 26, roof);
    rect(p, sx + 4, eave - 39, 1, 6, [140, 110, 70]); rect(p, sx + 2, eave - 37, 5, 1, [140, 110, 70]);
    window(p, x0 + W / 2 - 3, eave - 9, 6, 6, { head: 'arch', frame: wall, glass: [150, 90, 170], single: true });
    for (const wx of [x0 + 5, x0 + W - 13]) window(p, wx, gy - 30, 8, 16, { head: 'arch', frame: [240, 236, 228], glass: [100, 70, 140] });
    door(p, x0 + W / 2 - 7, gy - 3 - DOOR, 14, DOOR, { type: 'double', col: [124, 72, 40], frame: [176, 160, 136] });
    for (let k = 0; k < 2; k++) rect(p, x0 + W / 2 - 10 - k * 2, gy - 3 + k * 2 - 1, 20 + k * 4, 2, k ? [170, 160, 146] : [210, 200, 186]);
    rect(p, x0 - 1, gy, W + 2, 2, [150, 130, 110]); rect(p, x0 - 1, yb, W + 2, 1, INK);
    return { img: finish(p), door: (x0 + W / 2) * S, wins: [R([x0 + 5, gy - 30, 8, 16]), R([x0 + W - 13, gy - 30, 8, 16])], lamps: [], smoke: [] };
  };

  TOWN.stable = () => {
    const r = U.rng(99), { p, yb, gy } = sheet(78, 78);
    const x0 = 4, W = 70, eave = gy - 50, red = [156, 62, 46], white = [240, 230, 210];
    boards(p, r, x0, eave, W, gy - eave, red, 0.3);
    // gambrel roof
    for (let y = eave - 24; y < eave; y++) {
      const t = (y - (eave - 24)) / 24;
      const hw = Math.round(t < 0.4 ? 13 + t / 0.4 * 15 : 28 + (t - 0.4) / 0.6 * 10);
      for (let x = x0 + W / 2 - hw; x < x0 + W / 2 + hw; x++) p.put(x, y, (y - eave) % 3 === 0 ? [76, 68, 66] : [104, 94, 90]);
      p.put(x0 + W / 2 - hw - 1, y, INK); p.put(x0 + W / 2 + hw, y, INK);
    }
    rect(p, x0 - 4, eave, W + 8, 1, INK);
    boards(p, r, x0 + W / 2 - 13, eave - 14, 26, 14, red, 0.3);
    box(p, x0 + W / 2 - 5, eave - 12, 10, 10, [30, 20, 16]);
    rect(p, x0 + W / 2 - 4, eave - 6, 8, 3, (i) => (i % 2 ? [226, 194, 104] : [190, 160, 76]));
    rect(p, x0 + W / 2 - 1, eave - 20, 2, 3, [92, 62, 40]);
    pillar(p, x0, eave, gy, white); pillar(p, x0 + W - 2, eave, gy, white);
    door(p, x0 + W / 2 - 13, gy - 37, 26, 37, { type: 'barn', col: red, frame: white, open: true });
    for (const [dx, dy] of [[4, 0], [5, 0], [3, 1], [4, 1], [5, 1], [6, 1], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [5, 3], [6, 3], [7, 3]]) p.put(x0 + W / 2 + 2 + dx, gy - 24 + dy, [110, 70, 44]);
    const sg = sign(p, x0 + W / 2 - 31, eave + 2, 62, 9, white, [92, 50, 34]);
    label(sg, 'LIVERY STABLE', '#6a2a1e');
    const lamp = lantern(p, x0 + W / 2 - 18, gy - 30);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    return { img: finish(p), door: (x0 + W / 2) * S, wins: [], lamps: [lamp], smoke: [] };
  };

  // ---------------------------------------------------- abandoned buildings
  // Same toolkit, but faded, boarded up and falling apart.
  function holes(p, r, x0, y0, w, h, n) {
    for (let i = 0; i < n; i++) {
      const bx = x0 + Math.floor(r() * (w - 5)), by = y0 + Math.floor(r() * (h - 3)), bw = 2 + Math.floor(r() * 5);
      rect(p, bx, by, bw, 2, [24, 16, 12]);
    }
  }
  const openDoor = (p, x, y, w, h, frame) => door(p, x, y, w, h, { open: true, col: [104, 80, 58], frame });

  const ABANDONED = {};
  ABANDONED.shack = seed => {
    const r = U.rng(seed), W = 48 + Math.floor(r() * 10), { p, yb, gy } = sheet(W + 10, 50);
    const x0 = 5, eave = gy - 40;
    boards(p, r, x0, eave, W, gy - eave, [128, 96, 70], 1);
    // sagging plank roof with a hole in it
    for (let i = 0, x = x0 - 4; x < x0 + W + 4; i++, x++) {
      const sag = Math.round(2 * Math.sin((i / (W + 8)) * Math.PI));
      for (let k = 0; k < 4; k++) { if (i > W * 0.55 && i < W * 0.55 + 6 && k > 1) continue; p.put(x, eave - 4 + k + sag, k === 0 ? [154, 118, 84] : k < 2 ? [100, 72, 52] : [78, 56, 40]); }
    }
    holes(p, r, x0, eave + 2, W, 30, 4);
    openDoor(p, x0 + 6, gy - DOOR, 13, DOOR, [80, 58, 40]);
    window(p, x0 + W - 16, gy - 27, 11, 13, { board: true, frame: [120, 96, 70] });
    chimney(p, x0 + W - 11, eave - 7, 4, [130, 110, 100]);
    boardwalk(p, x0 - 1, x0 + W + 1, yb);
    return { img: finish(p), door: (x0 + 12) * S, w: (W + 10) * S, smoke: [] };
  };
  ABANDONED.farmhouse = seed => {
    const r = U.rng(seed), { p, yb, gy } = sheet(72, 76);
    const x0 = 6, W = 60, eave = gy - 56, wall = [182, 172, 154];
    planks(p, r, x0, eave, W, gy - eave, wall, 1);
    gable(p, r, x0 + W / 2, eave - 17, W / 2 + 4, eave, [92, 74, 66]);
    holes(p, r, x0 + W / 2 - 18, eave - 11, 36, 9, 3);
    window(p, x0 + W / 2 - 4, eave - 10, 8, 7, { broken: true, frame: [150, 140, 120] });
    window(p, x0 + 7, eave + 6, 10, 12, { broken: true, frame: [150, 140, 120], head: 'pediment' });
    window(p, x0 + W - 17, eave + 6, 10, 12, { board: true, frame: [150, 140, 120] });
    porch(p, x0 - 2, x0 + W + 2, gy - 42, gy, { posts: [x0, x0 + 22, x0 + W - 2], roof: [110, 90, 76], post: [150, 136, 118] });
    for (let k = 0; k < 6; k++) p.put(x0 + 22 + k, gy - 39 + k * 2, [24, 16, 12]);   // broken porch post
    window(p, x0 + 5, gy - 28, 11, 15, { broken: true, frame: [150, 140, 120] });
    window(p, x0 + W - 16, gy - 28, 11, 15, { board: true, frame: [150, 140, 120] });
    holes(p, r, x0, eave + 22, W, 30, 3);
    openDoor(p, x0 + W / 2 - 6, gy - DOOR, 13, DOOR, [140, 128, 110]);
    boardwalk(p, x0 - 3, x0 + W + 3, yb);
    return { img: finish(p), door: (x0 + W / 2) * S, w: 72 * S };
  };
  ABANDONED.adobe = seed => {
    const r = U.rng(seed), { p, yb, gy } = sheet(66, 46);
    const x0 = 5, W = 56, top = 4, base = [206, 158, 112];
    for (let y = top; y < gy; y++) for (let x = x0; x < x0 + W; x++) {
      const e = y - top;
      if (e < 2 && (x - x0 < 2 - e || x0 + W - x < 3 - e)) continue;
      if (e < 2 && Math.sin(x * 1.3 + seed) > 0.45) continue;
      let c = base; const n = r();
      if (n < 0.08) c = sh(base, 0.92); else if (n < 0.13) c = sh(base, 1.06);
      if (x > x0 + W - 5) c = sh(c, 0.84);
      if (e < 2) c = sh(base, 1.12);
      p.put(x, y, c);
    }
    // cracked plaster patches showing the adobe bricks
    for (let i = 0; i < 3; i++) { const bx = x0 + 5 + Math.floor(r() * (W - 16)), by = top + 7 + Math.floor(r() * 14); bricks(p, bx, by, 9, 6, [176, 124, 86]); }
    for (const vx of [x0 + 4, x0 + 15, x0 + 26, x0 + 37, x0 + 48]) { rect(p, vx - 2, top + 3, 5, 1, [110, 76, 46]); rect(p, vx - 2, top + 4, 5, 1, [76, 52, 32]); }
    const dx = x0 + 8;
    for (let y = gy - DOOR; y < gy; y++) for (let x = dx; x < dx + 13; x++) { if (y < gy - DOOR + 6 && Math.hypot(x - dx - 6, y - (gy - DOOR + 6)) > 6.5) continue; p.put(x, y, [26, 18, 14]); }
    box(p, x0 + W - 20, top + 11, 9, 9, [30, 20, 16]); rect(p, x0 + W - 16, top + 12, 1, 7, [100, 70, 44]);
    for (let i = 0; i < 5; i++) rect(p, x0 + W - 8 + (i % 2), top + 10 + i * 3, 1, 2, [196, 50, 36]);   // dried chiles
    rect(p, x0 - 1, gy, W + 2, 2, [176, 132, 92]); rect(p, x0 - 1, yb, W + 2, 1, INK);
    return { img: finish(p), door: (dx + 6) * S, w: 66 * S };
  };
  ABANDONED.barn = seed => {
    const r = U.rng(seed), { p, yb, gy } = sheet(76, 62);
    const x0 = 4, W = 68, eave = gy - 36, red = [146, 70, 54];
    boards(p, r, x0, eave, W, gy - eave, red, 1);
    for (let y = eave - 23; y < eave; y++) {
      const t = (y - (eave - 23)) / 23;
      const hw = Math.round(t < 0.4 ? 12 + t / 0.4 * 15 : 27 + (t - 0.4) / 0.6 * 10);
      for (let x = x0 + W / 2 - hw; x < x0 + W / 2 + hw; x++) { let c = (y - eave) % 3 === 0 ? [70, 62, 60] : [92, 82, 78]; if (r() < 0.05) c = [36, 30, 30]; p.put(x, y, c); }
    }
    rect(p, x0 - 3, eave, W + 6, 1, INK);
    boards(p, r, x0 + W / 2 - 13, eave - 14, 26, 14, red, 1);
    box(p, x0 + W / 2 - 5, eave - 12, 10, 9, [26, 18, 14]);
    holes(p, r, x0, eave + 2, W, 20, 5);
    door(p, x0 + W / 2 - 12, gy - 36, 24, 36, { type: 'barn', col: red, frame: [210, 200, 180], open: true });
    boardwalk(p, x0 - 1, x0 + W + 1, yb);
    return { img: finish(p), door: (x0 + W / 2 + 6) * S, w: 76 * S };
  };
  ABANDONED.chapel = seed => {
    const r = U.rng(seed), { p, yb, gy } = sheet(52, 70);
    const x0 = 4, W = 44, eave = gy - 36, wall = [214, 208, 192], roof = [84, 74, 72];
    planks(p, r, x0, eave, W, gy - eave, wall, 1);
    gable(p, r, x0 + W / 2, eave - 13, W / 2 + 3, eave, roof);
    const sx = x0 + W / 2 - 5;
    planks(p, r, sx, eave - 21, 10, 8, wall, 1);
    box(p, sx + 2, eave - 20, 6, 6, [30, 26, 28]);
    gable(p, r, sx + 5, eave - 27, 6, eave - 21, roof);
    rect(p, sx + 5, eave - 32, 1, 5, [110, 90, 66]); rect(p, sx + 3, eave - 31, 5, 1, [110, 90, 66]);   // crooked cross
    p.put(sx + 6, eave - 33, [110, 90, 66]);
    window(p, x0 + 4, gy - 28, 8, 15, { head: 'arch', frame: wall, glass: [96, 70, 130], broken: true });
    window(p, x0 + W - 12, gy - 28, 8, 15, { board: true, frame: wall });
    holes(p, r, x0, eave + 2, W, 14, 3);
    openDoor(p, x0 + W / 2 - 6, gy - DOOR, 13, DOOR, [150, 140, 120]);
    boardwalk(p, x0 - 1, x0 + W + 1, yb);
    return { img: finish(p), door: (x0 + W / 2) * S, w: 52 * S };
  };
  ABANDONED.waystation = seed => {
    const r = U.rng(seed), { p, yb, gy } = sheet(84, 58);
    const x0 = 5, W = 74, top = 10, wall = [176, 140, 100];
    planks(p, r, x0, top + 2, W, gy - top - 2, wall, 1);
    cap(p, x0, top, W, [120, 90, 60]);
    const sg = sign(p, x0 + W / 2 - 22, top - 8, 44, 9, [196, 168, 122], [110, 80, 50]);
    label(sg, 'WAY STATION', '#5a3a22');
    holes(p, r, x0, top + 4, W, 14, 4);
    porch(p, x0 - 2, x0 + W + 2, gy - 42, gy, { posts: [x0, x0 + 38, x0 + W - 2], roof: [110, 84, 58] });
    window(p, x0 + 25, gy - 28, 11, 15, { broken: true, frame: [150, 120, 90] });
    window(p, x0 + 45, gy - 28, 11, 15, { board: true, frame: [150, 120, 90] });
    window(p, x0 + 60, gy - 28, 10, 15, { broken: true, frame: [150, 120, 90] });
    openDoor(p, x0 + 8, gy - DOOR, 13, DOOR, [130, 100, 70]);
    boardwalk(p, x0 - 3, x0 + W + 3, yb);
    return { img: finish(p), door: (x0 + 14) * S, w: 84 * S };
  };

  function abandoned(type, seed) { return (ABANDONED[type] || ABANDONED.shack)(seed); }

  // ------------------------------------------------------ town dressing
  function waterTower() {
    const p = U.pix(54, 120);
    const r = U.rng(5);
    for (const lx of [8, 22, 32, 46]) for (let y = 50; y < 120; y++) { p.put(lx, y, [96, 66, 42]); p.put(lx + 1, y, [76, 52, 32]); }
    for (let k = 0; k < 4; k++) for (let i = 0; i < 38; i++) { p.put(8 + i, 62 + k * 16 + Math.round(i * 0.4) % 2, [110, 76, 48]); }
    for (let y = 14; y < 52; y++) for (let x = 4; x < 50; x++) { const b = Math.floor((x - 4) / 5); let c = sh([150, 104, 64], 0.92 + (b % 3) / 15); if ((x - 4) % 5 === 0) c = sh(c, 0.7); if (y % 12 === 0) c = [70, 66, 66]; if (x > 42) c = sh(c, 0.8); p.put(x, y, c); }
    for (let y = 2; y < 15; y++) { const half = Math.round((y - 2) / 13 * 26); for (let x = 27 - half; x < 27 + half; x++) p.put(x, y, y % 3 ? [100, 90, 86] : [80, 72, 70]); }
    void r;
    Props.outline(p);
    return p.done();
  }
  function windmill(t) {
    const p = U.pix(48, 110);
    for (let y = 30; y < 110; y++) { const s = Math.round((110 - y) / 80 * 9); for (const x of [24 - 10 + s, 24 + 10 - s]) { p.put(x, y, [140, 140, 148]); } if (y % 12 === 0) for (let x = 24 - 10 + s; x < 24 + 10 - s; x++) p.put(x, y, [120, 120, 128]); }
    for (let k = 0; k < 12; k++) {
      const a = t + k / 12 * Math.PI * 2;
      for (let d = 4; d < 20; d++) p.put(24 + Math.cos(a) * d, 26 + Math.sin(a) * d, d % 4 === 0 ? [200, 200, 206] : [170, 170, 178]);
    }
    for (let x = 24; x < 42; x++) p.put(x, 26, [130, 130, 138]);
    for (let y = 20; y < 32; y++) p.put(42, y, [150, 150, 158]);
    p.put(24, 26, [60, 60, 66]);
    return p.done();
  }
  function wagon() {
    const p = U.pix(70, 46);
    for (let y = 14; y < 28; y++) for (let x = 6; x < 60; x++) p.put(x, y, y === 14 ? [176, 132, 84] : x % 8 === 0 ? [96, 66, 42] : [140, 100, 62]);
    for (let y = 0; y < 14; y++) for (let x = 8; x < 58; x++) { const arch = Math.round(Math.sqrt(Math.max(0, 1 - ((x - 33) / 25) ** 2)) * 14); if (14 - y <= arch) p.put(x, y, (x % 9 === 0) ? [200, 192, 172] : [232, 226, 206]); }
    for (const wx of [16, 50]) for (let a = 0; a < 64; a++) { const ang = a / 64 * Math.PI * 2; for (const rr of [11, 10]) p.put(wx + Math.cos(ang) * rr, 34 + Math.sin(ang) * rr, [90, 60, 38]); if (a % 8 === 0) for (let d = 0; d < 10; d++) p.put(wx + Math.cos(ang) * d, 34 + Math.sin(ang) * d, [120, 84, 52]); }
    for (let x = 60; x < 70; x++) p.put(x, 30, [110, 76, 48]);
    Props.outline(p);
    return p.done();
  }
  function well() {
    const p = U.pix(34, 46);
    for (let y = 26; y < 46; y++) for (let x = 2; x < 32; x++) { const row = Math.floor(y / 5), c = (y % 5 === 0 || (x + (row % 2) * 4) % 8 === 0) ? [110, 104, 98] : [160, 152, 144]; p.put(x, y, c); }
    for (const px of [4, 28]) for (let y = 4; y < 26; y++) { p.put(px, y, [110, 76, 48]); p.put(px + 1, y, [86, 58, 36]); }
    for (let y = 0; y < 6; y++) { const half = 6 + y * 2.4; for (let x = 17 - half; x < 17 + half; x++) p.put(x, y, y % 2 ? [90, 80, 76] : [110, 100, 96]); }
    for (let x = 6; x < 28; x++) p.put(x, 10, [120, 84, 52]);
    for (let y = 10; y < 20; y++) p.put(17, y, [200, 190, 160]);
    for (let y = 20; y < 25; y++) for (let x = 14; x < 21; x++) p.put(x, y, [120, 84, 52]);
    Props.outline(p);
    return p.done();
  }
  function lampPost() {
    const p = U.pix(12, 56);
    for (let y = 12; y < 56; y++) { p.put(5, y, [50, 46, 46]); p.put(6, y, [36, 32, 32]); }
    for (let x = 3; x < 9; x++) { p.put(x, 54, [50, 46, 46]); p.put(x, 55, [50, 46, 46]); }
    for (let y = 2; y < 12; y++) for (let x = 2; x < 10; x++) p.put(x, y, y === 2 || y === 11 ? [50, 46, 46] : x === 2 || x === 9 ? [70, 66, 66] : [250, 210, 120]);
    for (let x = 1; x < 11; x++) p.put(x, 1, [50, 46, 46]);
    Props.outline(p);
    return p.done();
  }
  function bench() {
    const p = U.pix(30, 14);
    for (let x = 0; x < 30; x++) { p.put(x, 0, [150, 106, 64]); p.put(x, 1, [120, 84, 52]); p.put(x, 6, [150, 106, 64]); p.put(x, 7, [110, 76, 46]); }
    for (const lx of [2, 26]) for (let y = 0; y < 14; y++) { p.put(lx, y, [96, 66, 42]); p.put(lx + 1, y, [80, 54, 34]); }
    Props.outline(p);
    return p.done();
  }
  function laundry() {
    const p = U.pix(70, 40);
    for (const px of [2, 66]) for (let y = 4; y < 40; y++) { p.put(px, y, [110, 76, 48]); p.put(px + 1, y, [86, 58, 36]); }
    for (let x = 3; x < 66; x++) p.put(x, 6 + Math.round(Math.sin((x - 3) / 63 * Math.PI) * 3), [200, 190, 170]);
    const items = [[10, 10, 12, [220, 220, 214]], [24, 9, 14, [90, 110, 150]], [40, 8, 12, [180, 60, 50]], [54, 7, 8, [230, 210, 160]]];
    for (const [ix, iw, ih, col] of items) for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) { const yy = 7 + Math.round(Math.sin((ix + x - 3) / 63 * Math.PI) * 3) + y; p.put(ix + x, yy, x === iw - 1 ? sh(col, 0.8) : col); }
    return p.done();
  }
  function corral() {
    const p = U.pix(90, 26);
    for (let px = 0; px < 90; px += 22) for (let y = 2; y < 26; y++) { p.put(px, y, [110, 76, 48]); p.put(px + 1, y, [86, 58, 36]); }
    for (const ry of [6, 14]) for (let x = 0; x < 90; x++) { p.put(x, ry, [140, 100, 62]); p.put(x, ry + 1, [96, 66, 42]); }
    Props.outline(p);
    return p.done();
  }
  function telegraphPole() {
    const p = U.pix(20, 96);
    for (let y = 0; y < 96; y++) { p.put(9, y, [110, 80, 54]); p.put(10, y, [86, 60, 40]); }
    for (let x = 1; x < 19; x++) { p.put(x, 8, [110, 80, 54]); p.put(x, 9, [86, 60, 40]); }
    for (const ix of [2, 16]) { p.put(ix, 6, [130, 170, 150]); p.put(ix, 7, [130, 170, 150]); }
    Props.outline(p);
    return p.done();
  }

  // ------------------------------------------------------------ canyon
  // Red rock with horizontal strata, drawn on the chunky grid.
  function redRock(p, r, x0, y0, w, h, inside) {
    const bands = [[196, 86, 54], [178, 74, 48], [210, 104, 64], [186, 80, 52], [222, 138, 94]];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (inside && !inside(x - x0, y - y0)) continue;
      let c = bands[Math.floor((y - y0) / 3) % bands.length];
      if ((x * 5 + y) % 13 === 0) c = sh(c, 0.82);
      if (r() < 0.06) c = sh(c, r() < 0.5 ? 0.88 : 1.1);
      p.put(x, y, c);
    }
  }
  // The trail into (or out of) the canyon: a cleft between two rock
  // buttresses with a timber frame and a sign over the top.
  function canyonGate(text) {
    const r = U.rng(U.hash(text)), { p, yb, gy } = sheet(64, 66);
    const lw = 20, gap = 24, x1 = lw + gap;
    redRock(p, r, 0, 4, lw, gy - 4, (x, y) => x < lw - Math.max(0, 6 - y) && x > Math.max(0, 5 - y / 3));
    redRock(p, r, x1, 0, 64 - x1, gy, (x, y) => x > Math.max(0, 4 - y) && x < 64 - x1 - Math.max(0, 3 - y / 4));
    rect(p, lw, 14, gap, gy - 14, (i, j) => (j < 4 ? [44, 26, 22] : [28, 16, 14]));
    for (const px of [lw, x1 - 2]) pillar(p, px, 14, gy, [140, 100, 62]);
    rect(p, lw - 2, 13, gap + 4, 2, [120, 84, 52]);
    const sg = sign(p, lw - 6, 4, gap + 12, 9, [236, 214, 164], [110, 76, 46]);
    label(sg, text, '#5a2a1a');
    rect(p, 0, gy, 64, 3, [176, 124, 86]);
    void yb;
    return finish(p);
  }
  // A hoodoo: a tall rock column with a harder cap stone.
  function hoodoo(seed) {
    const r = U.rng(seed), h = 34 + Math.floor(r() * 20), w = 10 + Math.floor(r() * 6);
    const p = U.pix(w + 8, h + 6);
    redRock(p, r, 4, 6, w, h, (x, y) => Math.abs(x - w / 2) < w / 2 - Math.sin(y / h * Math.PI * 2.2 + seed) * 1.5 - (y < 4 ? 2 : 0));
    rect(p, 1, 2, w + 6, 4, (i, j) => (j === 0 ? [176, 150, 120] : j === 3 ? [96, 76, 62] : [140, 118, 96]));
    return finish(p);
  }
  // A heap of fallen boulders.
  function boulders(seed) {
    const r = U.rng(seed), p = U.pix(40, 22);
    for (let i = 0; i < 4; i++) {
      const bw = 9 + r() * 10, bh = 7 + r() * 8, bx = 2 + r() * (36 - bw), by = 21 - bh;
      redRock(p, r, Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh), (x, y) => ((x - bw / 2) / (bw / 2)) ** 2 + ((y - bh) / bh) ** 2 < 1);
      for (let x = 0; x < bw; x++) if (p.has(bx + x, by + 1)) p.put(bx + x, by + 1, [232, 160, 112]);
    }
    return finish(p);
  }

  return {
    TOWN, abandoned, waterTower, windmill, wagon, well, lampPost, bench, laundry, corral, telegraphPole, DOOR_H,
    canyonGate, hoodoo, boulders,
  };
})();
