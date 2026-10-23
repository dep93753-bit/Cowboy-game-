// Building exteriors, drawn to scale with the 48px sheriff (doors are 56px).
// A small toolkit (siding, brick, cornices, windows, doors, porches, signs)
// is shared by the town buildings and the abandoned ones out on the road.
const Buildings = (() => {
  const OUT = [34, 22, 16];
  const sh = U.shade;
  const DOOR_H = 56;

  // ------------------------------------------------------------ toolkit
  function darken(p, x0, y0, w, h, f) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (p.has(x, y)) p.put(x, y, sh(p.get(x, y), f));
  }
  // Horizontal clapboard: 4px boards, lit top edge, shadowed lap, knots, joints.
  function clapboard(p, r, x0, y0, w, h, col, old = 0) {
    for (let y = y0; y < y0 + h; y++) {
      const row = Math.floor((y - y0) / 4), ly = (y - y0) % 4;
      const tint = 0.94 + ((row * 37) % 7) / 60;
      const joint = (row * 53) % (w - 10) + x0 + 5;
      for (let x = x0; x < x0 + w; x++) {
        let c = sh(col, tint);
        if (ly === 0) c = sh(c, 1.14); else if (ly === 3) c = sh(c, 0.72);
        if (x === joint || x === joint + 1 + ((row % 3) * 17) % w) c = sh(c, 0.8);
        if (r() < 0.006) c = sh(col, 0.65);                              // knot
        if (old && r() < old * 0.08) c = sh(c, 0.85 + r() * 0.3);       // wear
        p.put(x, y, c);
      }
    }
  }
  // Vertical board-and-batten (barns, sheds).
  function battens(p, r, x0, y0, w, h, col, old = 0) {
    for (let x = x0; x < x0 + w; x++) {
      const b = Math.floor((x - x0) / 6), lx = (x - x0) % 6;
      const tint = 0.92 + ((b * 29) % 9) / 70;
      for (let y = y0; y < y0 + h; y++) {
        let c = sh(col, tint);
        if (lx === 0) c = sh(c, 1.18); else if (lx === 5) c = sh(c, 0.62);
        if (old && r() < old * 0.08) c = sh(c, 0.8 + r() * 0.35);
        p.put(x, y, c);
      }
    }
  }
  function brick(p, r, x0, y0, w, h, col) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / 4);
      const off = (row % 2) * 4;
      const mortar = (y - y0) % 4 === 3 || (x - x0 + off) % 8 === 7;
      let c = mortar ? [190, 176, 156] : sh(col, 0.88 + (((x - x0 + off) >> 3) * 13 + row * 7) % 5 / 20);
      if (!mortar && (y - y0) % 4 === 0) c = sh(c, 1.1);
      p.put(x, y, c);
    }
  }
  function corner(p, x, y0, y1, col) {
    for (let y = y0; y < y1; y++) { p.put(x, y, sh(col, 1.2)); p.put(x + 1, y, col); p.put(x + 2, y, sh(col, 0.7)); }
  }
  // Moulded cornice along the top of a facade.
  function cornice(p, x0, y, w, col, dentils = true) {
    for (let x = x0 - 3; x < x0 + w + 3; x++) { p.put(x, y, sh(col, 1.3)); p.put(x, y + 1, sh(col, 1.05)); p.put(x, y + 2, sh(col, 0.6)); }
    for (let x = x0 - 1; x < x0 + w + 1; x++) {
      p.put(x, y + 3, col);
      p.put(x, y + 4, dentils && (x - x0) % 4 < 2 ? sh(col, 1.15) : sh(col, 0.7));
      p.put(x, y + 5, sh(col, 0.55));
    }
    for (let x = x0; x < x0 + w; x++) if (p.has(x, y + 6)) p.put(x, y + 6, sh(p.get(x, y + 6), 0.7));
  }
  // Window with frame, sill, header, glass reflection, optional curtains/shutters/bars.
  function windowAt(p, x, y, w, h, o = {}) {
    const frame = o.frame || [236, 226, 200];
    const glass = o.glass || [58, 70, 88];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const edge = i < 2 || i >= w - 2 || j < 2 || j >= h - 2;
      const mull = (o.panes !== 1) && (i === Math.floor(w / 2) || j === Math.floor(h / 2));
      let c;
      if (edge) c = i === 0 || j === 0 ? sh(frame, 1.1) : frame;
      else if (mull) c = sh(frame, 0.85);
      else {
        c = glass;
        if (o.lit) c = [242, 186, 98];
        if ((i + j) % 11 === 3 || (i + j) % 11 === 4) c = sh(c, 1.5);   // reflection
        if (o.broken && (i * 7 + j * 3) % 5 === 0) c = [22, 18, 20];
      }
      p.put(x + i, y + j, c);
    }
    if (o.curtains) for (let j = 2; j < h - 2; j++) for (const cx of [2, w - 5]) for (let k = 0; k < 3; k++) {
      p.put(x + cx + k, y + j, (k + j) % 3 === 0 ? sh(o.curtains, 0.8) : o.curtains);
    }
    if (o.goods) for (let i = 3; i < w - 3; i += 3) { const gh = 2 + ((i * 7) % 4); for (let j = h - 3 - gh; j < h - 3; j++) p.put(x + i, y + j, o.goods[(i >> 1) % o.goods.length]); }
    if (o.bars) for (let i = 3; i < w - 2; i += 3) for (let j = 2; j < h - 2; j++) p.put(x + i, y + j, [40, 40, 44]);
    // sill + header
    for (let i = -2; i < w + 2; i++) { p.put(x + i, y + h, sh(frame, 1.15)); p.put(x + i, y + h + 1, sh(frame, 0.6)); }
    if (o.header === 'pediment') { for (let i = -2; i < w + 2; i++) { const t = Math.round(4 - Math.abs(i - w / 2) / (w / 2 + 2) * 4); for (let k = 0; k < 2; k++) p.put(x + i, y - 2 - t + k, k ? sh(frame, 0.7) : frame); } }
    else if (o.header === 'arch') { for (let i = 0; i < w; i++) { const a = Math.round(Math.sqrt(Math.max(0, (w / 2) ** 2 - (i - w / 2 + 0.5) ** 2)) * 0.5); for (let k = 0; k <= a; k++) p.put(x + i, y - k, k === a ? frame : glass); p.put(x + i, y - a - 1, sh(frame, 0.7)); } }
    else for (let i = -1; i < w + 1; i++) { p.put(x + i, y - 2, frame); p.put(x + i, y - 1, sh(frame, 0.7)); }
    if (o.shutters) for (const sx of [x - 7, x + w + 1]) for (let j = 0; j < h; j++) for (let k = 0; k < 6; k++) {
      p.put(sx + k, y + j, k === 0 || k === 5 ? sh(o.shutters, 0.65) : j % 2 ? sh(o.shutters, 0.8) : o.shutters);
    }
  }
  // Door: paneled, double, glass, batwing (saloon) or barn.
  function doorAt(p, x, y, w, h, o = {}) {
    const col = o.col || [110, 70, 40], frame = o.frame || [70, 46, 30];
    for (let j = -3; j < h; j++) for (let i = -3; i < w + 3; i++) {
      if (i >= 0 && i < w && j >= 0) continue;
      p.put(x + i, y + j, i === -3 || j === -3 ? sh(frame, 1.25) : frame);
    }
    const type = o.type || 'panel';
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c = col;
      if (type === 'batwing') {
        c = [26, 16, 12];
        const leaf = i < w / 2 ? i : w - 1 - i;
        if (j > h * 0.3 && j < h * 0.68 && leaf > 0) c = leaf === 1 || (j - Math.floor(h * 0.3)) % 3 === 0 ? sh(col, 0.75) : col;
        if (i === Math.floor(w / 2) || i === Math.floor(w / 2) - 1) c = [26, 16, 12];
      } else if (type === 'barn') {
        const lx = i % (w / 2), ly = j / h * (w / 2);
        c = i % 4 === 0 ? sh(col, 0.75) : col;
        if (lx < 2 || lx > w / 2 - 3 || j < 2 || j > h - 3 || Math.abs(lx - ly) < 1.3 || Math.abs(lx - (w / 2 - ly)) < 1.3) c = [232, 222, 202];
        if (o.open && i > w / 2) c = [26, 16, 12];
      } else {
        const leafW = type === 'double' || type === 'glass' ? w / 2 : w;
        const li = i % leafW;
        const inPanel = (li > 2 && li < leafW - 3) && ((j > 3 && j < h * 0.45) || (j > h * 0.5 && j < h - 4));
        if (type === 'glass' && j > 3 && j < h * 0.45 && li > 2 && li < leafW - 3) c = (li + j) % 9 < 2 ? [150, 170, 190] : [60, 72, 90];
        else if (inPanel) { const top = j === 4 || j === Math.ceil(h * 0.5) + 1; const left = li === 3; c = top || left ? sh(col, 0.7) : sh(col, 0.95); }
        if (i === Math.floor(leafW) - 1 && (type === 'double' || type === 'glass')) c = sh(col, 0.6);
        if (o.open && i > w * 0.35) c = [24, 16, 12];
      }
      p.put(x + i, y + j, c);
    }
    if (type !== 'batwing' && type !== 'barn' && !o.open) { p.put(x + w - 4, y + Math.floor(h * 0.52), [226, 190, 90]); if (type === 'double' || type === 'glass') p.put(x + 3, y + Math.floor(h * 0.52), [226, 190, 90]); }
    if (o.transom) for (let i = 0; i < w; i++) for (let j = -9; j < -3; j++) p.put(x + i, y + j, j === -9 || j === -4 ? frame : (i + j) % 7 < 2 ? [150, 170, 190] : [60, 72, 90]);
  }
  // Porch roof (shed roof seen from the front) with posts, braces and a shadow.
  function porch(p, x0, x1, y, yb, o = {}) {
    const roof = o.roof || [120, 84, 52], post = o.post || [130, 92, 58];
    darken(p, x0, y + 4, x1 - x0, 10, 0.78);
    darken(p, x0, y + 14, x1 - x0, 6, 0.88);
    for (let x = x0 - 2; x < x1 + 2; x++) {
      p.put(x, y, sh(roof, 1.35)); p.put(x, y + 1, sh(roof, 1.1));
      p.put(x, y + 2, (x % 6 === 0) ? sh(roof, 0.75) : roof); p.put(x, y + 3, sh(roof, 0.55));
    }
    const posts = o.posts || [x0 + 1, x1 - 4];
    for (const px of posts) {
      for (let yy = y + 4; yy < yb; yy++) { p.put(px, yy, sh(post, 1.2)); p.put(px + 1, yy, post); p.put(px + 2, yy, sh(post, 0.65)); }
      for (let k = 0; k < 6; k++) { p.put(px - 1 - k, y + 4 + k, sh(post, 0.85)); p.put(px + 3 + k, y + 4 + k, sh(post, 0.85)); }
    }
  }
  function boardwalk(p, x0, x1, yb) {
    for (let x = x0; x < x1; x++) {
      p.put(x, yb - 3, x % 9 === 0 ? [120, 84, 52] : [182, 136, 88]);
      p.put(x, yb - 2, x % 9 === 0 ? [92, 64, 40] : [146, 104, 66]);
      p.put(x, yb - 1, [86, 58, 36]);
      p.put(x, yb, [60, 40, 26]);
    }
  }
  function awning(p, x0, x1, y, cols) {
    for (let x = x0; x < x1; x++) {
      const c = cols[Math.floor((x - x0) / 6) % cols.length];
      for (let j = 0; j < 8; j++) p.put(x, y + j, j === 0 ? sh(c, 1.2) : j > 5 ? sh(c, 0.75) : c);
      const sc = (x - x0) % 6;
      if (sc > 0 && sc < 5) p.put(x, y + 8, sh(c, 0.75));               // scalloped edge
      if (sc > 1 && sc < 4) p.put(x, y + 9, sh(c, 0.65));
    }
    darken(p, x0, y + 10, x1 - x0, 6, 0.8);
  }
  // Sign board; returns the rect so text can be painted after p.done().
  function signBoard(p, x, y, w, h, bg, edge) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const e = i < 2 || i >= w - 2 || j < 2 || j >= h - 2;
      p.put(x + i, y + j, e ? (i === 0 || j === 0 ? sh(edge, 1.25) : edge) : (j % 4 === 0 ? sh(bg, 0.94) : bg));
    }
    for (let i = 2; i < w + 2; i++) if (p.has(x + i, y + h)) p.put(x + i, y + h, sh(p.get(x + i, y + h), 0.7));
    return { x, y, w, h };
  }
  function lantern(p, x, y) {
    p.put(x + 1, y - 3, [50, 40, 36]); p.put(x + 2, y - 3, [50, 40, 36]); p.put(x + 2, y - 2, [50, 40, 36]);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) p.put(x + i, y + j, j === 0 || j === 5 ? [50, 44, 40] : i === 0 || i === 3 ? [70, 62, 56] : [250, 206, 112]);
    return { x: x + 2, y: y + 3 };
  }
  function poster(p, x, y, wanted) {
    for (let j = 0; j < 12; j++) for (let i = 0; i < 10; i++) {
      let c = [232, 214, 168];
      if (j === 1 && i > 1 && i < 8) c = [90, 58, 34];
      if (wanted && j > 3 && j < 8 && i > 2 && i < 7) c = j < 5 ? [40, 30, 30] : [196, 150, 110];
      if (!wanted && j > 3 && j < 10 && j % 2 === 0 && i > 1 && i < 8) c = [140, 110, 80];
      if (j === 10 && i > 1 && i < 8) c = [90, 58, 34];
      p.put(x + i, y + j, c);
    }
  }
  function gableRoof(p, r, cx, yTop, halfW, yBase, col) {
    for (let y = yTop; y < yBase; y++) {
      const half = Math.round(((y - yTop) / (yBase - yTop)) * halfW);
      for (let x = cx - half; x <= cx + half; x++) {
        const row = Math.floor((y - yTop) / 3);
        let c = (x + row * 3) % 6 === 0 ? sh(col, 0.72) : (y - yTop) % 3 === 0 ? sh(col, 1.12) : col;
        if (r() < 0.02) c = sh(col, 0.8);
        if (x === cx - half || x === cx + half) c = sh(col, 0.6);
        p.put(x, y, c);
      }
    }
  }
  function chimney(p, x, yTop, h, col = [150, 80, 64]) {
    brick(p, () => 0.5, x, yTop, 8, h, col);
    for (let i = -1; i < 9; i++) { p.put(x + i, yTop - 1, sh(col, 0.8)); p.put(x + i, yTop - 2, sh(col, 1.1)); }
    return { x: x + 4, y: yTop - 3 };
  }
  function hangSign(p, x, y, w, h, bg, icon) {
    for (let i = 0; i < w + 4; i++) p.put(x - 2 + i, y - 4, [50, 40, 36]);
    p.put(x + 2, y - 3, [50, 40, 36]); p.put(x + 2, y - 2, [50, 40, 36]); p.put(x + w - 3, y - 3, [50, 40, 36]); p.put(x + w - 3, y - 2, [50, 40, 36]);
    signBoard(p, x, y - 1, w, h, bg, sh(bg, 0.55));
    if (icon) icon(p, x + Math.floor(w / 2), y + Math.floor(h / 2) - 1);
  }

  const paint = [];   // text to paint after the pixel pass: [x, y, text, color, scale]
  function finish(p, out = OUT) {
    Props.outline(p, out);
    const c = p.done();
    const ctx = c.getContext('2d');
    for (const [x, y, text, col, scale] of paint) {
      Font.draw(ctx, text, x + scale, y + scale, 'rgba(0,0,0,.35)', scale);
      Font.draw(ctx, text, x, y, col, scale);
    }
    paint.length = 0;
    return c;
  }
  function label(rect, text, col, scale = 1) {
    const tw = Font.width(text) * scale;
    paint.push([rect.x + Math.floor((rect.w - tw) / 2), rect.y + Math.floor((rect.h - 5 * scale) / 2), text, col, scale]);
  }

  // ---------------------------------------------------- town buildings
  // Each returns { img, door (x of door centre), wins (lit at night), lamps, smoke }.
  const TOWN = {};

  TOWN.sheriff = () => {
    const r = U.rng(11), W = 120, Hh = 112, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, top = yb - 108, wall = [150, 112, 78], trim = [96, 64, 42];
    clapboard(p, r, x0, top + 8, W, 104, wall);
    cornice(p, x0, top, W, trim);
    corner(p, x0, top + 6, yb, trim); corner(p, x0 + W - 3, top + 6, yb, trim);
    for (let x = x0; x < x0 + W; x++) for (let y = yb - 6; y < yb - 3; y++) p.put(x, y, (x + y) % 5 ? [120, 112, 104] : [96, 90, 84]);
    const sign = signBoard(p, x0 + 18, top + 12, W - 36, 16, [228, 208, 160], [96, 64, 42]);
    label(sign, 'SHERIFF', '#3a2416', 2);
    // gold star either side of the sign
    for (const sx of [x0 + 9, x0 + W - 13]) for (const [dx, dy] of [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [1, 4], [3, 4]]) p.put(sx + dx, top + 17 + dy, [242, 201, 76]);
    windowAt(p, x0 + 12, yb - 52, 22, 28, { curtains: [120, 60, 50] });
    windowAt(p, x0 + W - 34, yb - 52, 22, 28, { bars: true });
    windowAt(p, x0 + 14, top + 34, 18, 20, { header: 'pediment' });
    windowAt(p, x0 + W - 32, top + 34, 18, 20, { header: 'pediment' });
    doorAt(p, x0 + 47, yb - 3 - DOOR_H, 26, DOOR_H, { transom: true, col: [104, 66, 40] });
    poster(p, x0 + 38, yb - 46, true); poster(p, x0 + 77, yb - 44, false);
    porch(p, x0 - 2, x0 + W + 2, yb - 68, yb - 3, { posts: [x0, x0 + 38, x0 + 80, x0 + W - 3] });
    const lamp = lantern(p, x0 + 40, yb - 60);
    boardwalk(p, x0 - 4, x0 + W + 4, yb);
    const ch = chimney(p, x0 + W - 22, top - 10, 10);
    return { img: finish(p), door: x0 + 60, wins: [[x0 + 12, yb - 52, 22, 28], [x0 + 14, top + 34, 18, 20], [x0 + W - 32, top + 34, 18, 20]], lamps: [lamp], smoke: [ch] };
  };

  TOWN.bank = () => {
    const r = U.rng(22), W = 116, Hh = 126, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, top = yb - 122;
    brick(p, r, x0, top + 8, W, 114, [168, 82, 64]);
    // stone quoins + base
    for (let y = top + 8; y < yb; y++) for (const qx of [x0, x0 + W - 6]) for (let i = 0; i < 6; i++) p.put(qx + i, y, ((y >> 2) + (i > 2 ? 1 : 0)) % 2 ? [214, 204, 186] : [190, 180, 164]);
    for (let x = x0; x < x0 + W; x++) for (let y = yb - 9; y < yb; y++) p.put(x, y, y === yb - 9 ? [226, 218, 202] : (x + y) % 9 ? [190, 182, 168] : [160, 152, 140]);
    cornice(p, x0, top, W, [200, 190, 170]);
    // pediment with the year
    for (let y = top - 12; y < top; y++) { const half = Math.round((y - (top - 12)) / 12 * 30); for (let x = x0 + W / 2 - half; x < x0 + W / 2 + half; x++) p.put(x, y, y === top - 12 + Math.floor((y - top + 12)) && x === x0 + W / 2 - half ? [170, 160, 140] : [214, 204, 186]); }
    const sign = signBoard(p, x0 + 22, top + 14, W - 44, 16, [44, 40, 36], [200, 190, 170]);
    label(sign, 'BANK', '#f2c94c', 2);
    paint.push([x0 + W / 2 - 13, top - 8, 'EST 1871', '#6a5a48', 1]);
    for (const wx of [x0 + 12, x0 + W - 30]) { windowAt(p, wx, top + 44, 18, 24, { header: 'arch', frame: [226, 218, 202] }); windowAt(p, wx, yb - 52, 18, 30, { header: 'arch', frame: [226, 218, 202], bars: true }); }
    windowAt(p, x0 + W / 2 - 9, top + 44, 18, 24, { header: 'arch', frame: [226, 218, 202] });
    doorAt(p, x0 + W / 2 - 14, yb - 9 - DOOR_H, 28, DOOR_H, { type: 'glass', col: [70, 50, 36], frame: [226, 218, 202], transom: true });
    // stone steps
    for (let k = 0; k < 3; k++) for (let x = x0 + W / 2 - 20 - k * 3; x < x0 + W / 2 + 20 + k * 3; x++) for (let y = yb - 9 + k * 3; y < yb - 6 + k * 3; y++) p.put(x, y, y === yb - 9 + k * 3 ? [236, 230, 216] : [196, 188, 174]);
    const lamps = [lantern(p, x0 + W / 2 - 24, yb - 60), lantern(p, x0 + W / 2 + 20, yb - 60)];
    return { img: finish(p), door: x0 + W / 2, wins: [], lamps, smoke: [] };
  };

  TOWN.store = () => {
    const r = U.rng(33), W = 136, Hh = 116, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, top = yb - 112, wall = [120, 140, 112], trim = [232, 226, 206];
    // stepped false front
    clapboard(p, r, x0, top + 18, W, 94, wall);
    clapboard(p, r, x0 + 24, top + 6, W - 48, 14, wall);
    cornice(p, x0 + 24, top, W - 48, trim, false);
    cornice(p, x0, top + 14, 24, trim, false); cornice(p, x0 + W - 24, top + 14, 24, trim, false);
    corner(p, x0, top + 20, yb, trim); corner(p, x0 + W - 3, top + 20, yb, trim);
    const sign = signBoard(p, x0 + 12, top + 24, W - 24, 18, [244, 236, 214], [120, 70, 40]);
    label(sign, 'GENERAL STORE', '#7a2e22', 1);
    paint.push([x0 + W / 2 - 25, top + 36, 'DRY GOODS', '#4a3a2a', 1]);
    windowAt(p, x0 + 20, top + 48, 16, 18, { header: 'pediment', frame: trim, curtains: [190, 170, 120] });
    windowAt(p, x0 + W - 36, top + 48, 16, 18, { header: 'pediment', frame: trim, curtains: [190, 170, 120] });
    // big display windows with goods
    const goods = [[200, 60, 50], [220, 200, 120], [80, 120, 70], [150, 150, 156], [200, 176, 130]];
    windowAt(p, x0 + 8, yb - 50, 38, 32, { frame: trim, panes: 1, goods, glass: [70, 84, 96] });
    windowAt(p, x0 + W - 46, yb - 50, 38, 32, { frame: trim, panes: 1, goods, glass: [70, 84, 96] });
    doorAt(p, x0 + W / 2 - 13, yb - 3 - DOOR_H, 26, DOOR_H, { type: 'glass', col: [120, 76, 44], frame: trim, transom: true });
    awning(p, x0 - 2, x0 + W + 2, yb - 70, [[196, 56, 48], [236, 228, 210]]);
    for (const px of [x0, x0 + W - 3]) for (let y = yb - 60; y < yb - 3; y++) { p.put(px, y, trim); p.put(px + 1, y, sh(trim, 0.8)); }
    boardwalk(p, x0 - 4, x0 + W + 4, yb);
    const lamp = lantern(p, x0 + W / 2 - 22, yb - 58);
    return { img: finish(p), door: x0 + W / 2, wins: [[x0 + 8, yb - 50, 38, 32], [x0 + W - 46, yb - 50, 38, 32]], lamps: [lamp], smoke: [] };
  };

  TOWN.doctor = () => {
    const r = U.rng(44), W = 92, Hh = 112, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, eave = yb - 72, wall = [228, 224, 212], trim = [70, 90, 110];
    clapboard(p, r, x0, eave, W, 72, wall);
    gableRoof(p, r, x0 + W / 2, eave - 34, W / 2 + 6, eave + 2, [86, 96, 108]);
    windowAt(p, x0 + W / 2 - 8, eave - 20, 16, 16, { header: 'arch', frame: [236, 232, 220] });
    corner(p, x0, eave, yb, trim); corner(p, x0 + W - 3, eave, yb, trim);
    windowAt(p, x0 + 10, yb - 50, 20, 28, { frame: [236, 232, 220], curtains: [236, 236, 236], shutters: trim });
    windowAt(p, x0 + W - 30, yb - 50, 20, 28, { frame: [236, 232, 220], curtains: [236, 236, 236], shutters: trim });
    doorAt(p, x0 + W / 2 - 12, yb - 3 - DOOR_H, 24, DOOR_H, { col: [70, 90, 110], frame: [236, 232, 220] });
    hangSign(p, x0 + W / 2 - 26, eave + 6, 52, 11, [244, 240, 228], (pp, cx, cy) => {
      for (let i = -2; i <= 2; i++) { pp.put(cx - 19 + i, cy + 1, [60, 130, 90]); pp.put(cx - 19, cy + 1 + i, [60, 130, 90]); }
    });
    paint.push([x0 + W / 2 - 12, eave + 8, 'DOCTOR', '#2a4a6a', 1]);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    const ch = chimney(p, x0 + W - 24, eave - 30, 18);
    return { img: finish(p), door: x0 + W / 2, wins: [[x0 + 10, yb - 50, 20, 28], [x0 + W - 30, yb - 50, 20, 28]], lamps: [], smoke: [ch] };
  };

  TOWN.saloon = () => {
    const r = U.rng(55), W = 164, Hh = 146, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, top = yb - 142, wall = [160, 74, 58], trim = [236, 214, 168];
    clapboard(p, r, x0, top + 8, W, 134, wall);
    cornice(p, x0, top, W, trim);
    corner(p, x0, top + 8, yb, trim); corner(p, x0 + W - 3, top + 8, yb, trim);
    const sign = signBoard(p, x0 + 20, top + 12, W - 40, 18, [244, 224, 172], [90, 42, 32]);
    label(sign, 'SALOON', '#7a1e1a', 2);
    const sign2 = signBoard(p, x0 + W / 2 - 22, top + 34, 44, 11, [60, 30, 26], [236, 214, 168]);
    label(sign2, 'HOTEL', '#f2c94c', 1);
    // upstairs hotel windows with curtains
    const wins = [];
    for (const wx of [x0 + 10, x0 + 46, x0 + W - 62, x0 + W - 26]) { windowAt(p, wx, top + 52, 16, 24, { header: 'pediment', frame: trim, curtains: [180, 50, 60] }); wins.push([wx, top + 52, 16, 24]); }
    // balcony
    const by = yb - 74;
    for (let x = x0 - 4; x < x0 + W + 4; x++) { p.put(x, by, sh(trim, 1.1)); p.put(x, by + 1, trim); p.put(x, by + 2, [90, 42, 32]); p.put(x, by + 3, [70, 32, 24]); }
    for (let x = x0 - 2; x < x0 + W + 2; x += 4) for (let y = by - 12; y < by; y++) p.put(x, y, trim);
    for (let x = x0 - 4; x < x0 + W + 4; x++) { p.put(x, by - 13, sh(trim, 1.15)); p.put(x, by - 12, sh(trim, 0.8)); }
    darken(p, x0, by + 4, W, 10, 0.8);
    // ground floor
    windowAt(p, x0 + 10, yb - 52, 30, 32, { frame: trim, curtains: [150, 30, 40] });
    windowAt(p, x0 + W - 40, yb - 52, 30, 32, { frame: trim, curtains: [150, 30, 40] });
    wins.push([x0 + 10, yb - 52, 30, 32], [x0 + W - 40, yb - 52, 30, 32]);
    doorAt(p, x0 + W / 2 - 15, yb - 3 - DOOR_H, 30, DOOR_H, { type: 'batwing', col: [120, 80, 46], frame: [90, 42, 32] });
    for (const px of [x0, x0 + 50, x0 + W - 53, x0 + W - 3]) for (let y = by + 4; y < yb - 3; y++) { p.put(px, y, sh(trim, 1.1)); p.put(px + 1, y, trim); p.put(px + 2, y, sh(trim, 0.7)); }
    const lamps = [lantern(p, x0 + W / 2 - 26, yb - 64), lantern(p, x0 + W / 2 + 22, yb - 64)];
    boardwalk(p, x0 - 6, x0 + W + 6, yb);
    const ch = chimney(p, x0 + 14, top - 12, 12);
    return { img: finish(p), door: x0 + W / 2, wins, lamps, smoke: [ch] };
  };

  TOWN.post = () => {
    const r = U.rng(66), W = 104, Hh = 110, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, top = yb - 106, wall = [104, 120, 140], trim = [232, 226, 210];
    clapboard(p, r, x0, top + 8, W, 98, wall);
    cornice(p, x0, top, W, trim);
    corner(p, x0, top + 8, yb, trim); corner(p, x0 + W - 3, top + 8, yb, trim);
    const sign = signBoard(p, x0 + 8, top + 14, W - 16, 22, [240, 234, 216], [60, 70, 90]);
    paint.push([sign.x + Math.floor((sign.w - Font.width('POST OFFICE')) / 2), sign.y + 5, 'POST OFFICE', '#2a3a5a', 1]);
    paint.push([sign.x + Math.floor((sign.w - Font.width('& TELEGRAPH')) / 2), sign.y + 12, '& TELEGRAPH', '#7a2e22', 1]);
    windowAt(p, x0 + 10, yb - 50, 22, 28, { frame: trim, shutters: [60, 70, 90] });
    windowAt(p, x0 + W - 32, yb - 50, 22, 28, { frame: trim, shutters: [60, 70, 90] });
    doorAt(p, x0 + W / 2 - 12, yb - 3 - DOOR_H, 24, DOOR_H, { col: [80, 60, 44], frame: trim, transom: true });
    porch(p, x0 - 2, x0 + W + 2, yb - 66, yb - 3, { posts: [x0, x0 + W - 3], roof: [90, 100, 116] });
    // mailbox
    for (let y = yb - 28; y < yb - 16; y++) for (let x = x0 + W - 8; x < x0 + W - 1; x++) p.put(x, y, y === yb - 28 ? [80, 80, 86] : [56, 56, 64]);
    boardwalk(p, x0 - 4, x0 + W + 4, yb);
    return { img: finish(p), door: x0 + W / 2, wins: [[x0 + 10, yb - 50, 22, 28], [x0 + W - 32, yb - 50, 22, 28]], lamps: [], smoke: [] };
  };

  TOWN.blacksmith = () => {
    const r = U.rng(77), W = 120, Hh = 104, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, top = yb - 100, wall = [110, 84, 60], trim = [70, 50, 34];
    battens(p, r, x0, top + 18, W, 82, wall, 0.4);
    // shed roof
    for (let y = top; y < top + 18; y++) for (let x = x0 - 6; x < x0 + W + 6; x++) { const t = (y - top); if (x < x0 - 6 + (18 - t) * 0) continue; p.put(x, y, t % 3 === 0 ? [96, 96, 104] : (x % 5 === 0 ? [70, 70, 78] : [120, 120, 128])); }
    // open forge front
    const fx = x0 + 14, fw = W - 46, fy = yb - 72;
    for (let y = fy; y < yb - 3; y++) for (let x = fx; x < fx + fw; x++) p.put(x, y, [30, 22, 18]);
    // forge, fire, anvil and tools inside
    for (let y = yb - 30; y < yb - 3; y++) for (let x = fx + 6; x < fx + 30; x++) p.put(x, y, ((y >> 2) + (x >> 3)) % 2 ? [120, 110, 100] : [100, 90, 82]);
    for (let x = fx + 10; x < fx + 26; x++) for (let y = yb - 36; y < yb - 30; y++) p.put(x, y, y > yb - 33 ? [255, 120, 40] : (x % 3 ? [255, 190, 80] : [255, 230, 140]));
    for (let y = fy; y < yb - 36; y++) for (let x = fx + 14; x < fx + 22; x++) p.put(x, y, [60, 54, 50]);
    for (let x = fx + 40; x < fx + 58; x++) { p.put(x, yb - 22, [90, 90, 98]); p.put(x, yb - 21, [70, 70, 78]); }
    for (let x = fx + 44; x < fx + 54; x++) for (let y = yb - 20; y < yb - 14; y++) p.put(x, y, [60, 60, 66]);
    for (let x = fx + 46; x < fx + 52; x++) for (let y = yb - 14; y < yb - 3; y++) p.put(x, y, [90, 62, 40]);
    for (const [tx, tl] of [[fx + 36, 14], [fx + 42, 18], [fx + 50, 12], [fx + 56, 16]]) for (let y = fy + 6; y < fy + 6 + tl; y++) p.put(tx, y, [150, 150, 158]);
    for (let x = fx; x < fx + fw; x++) for (let k = 0; k < 3; k++) p.put(x, fy - 3 + k, k === 0 ? sh(trim, 1.3) : trim);
    for (const px of [fx - 3, fx + fw]) for (let y = fy; y < yb - 3; y++) { p.put(px, y, sh(trim, 1.2)); p.put(px + 1, y, trim); p.put(px + 2, y, sh(trim, 0.6)); }
    const sign = signBoard(p, x0 + 12, top + 22, W - 24, 14, [60, 40, 28], [140, 100, 60]);
    label(sign, 'BLACKSMITH', '#f2c94c', 1);
    // horseshoe on the wall
    for (let a = 0; a < 15; a++) { const ang = Math.PI * (0.15 + a / 14 * 1.7); p.put(x0 + W - 18 + Math.round(Math.cos(ang) * 5), yb - 52 + Math.round(Math.sin(ang) * 5), [160, 160, 170]); }
    const ch = chimney(p, fx + 14, top - 16, 16, [110, 100, 92]);
    boardwalk(p, x0 - 4, x0 + W + 4, yb);
    return { img: finish(p), door: fx + fw / 2, wins: [], lamps: [{ x: fx + 18, y: yb - 34, forge: true }], smoke: [ch] };
  };

  TOWN.church = () => {
    const r = U.rng(88), W = 92, Hh = 150, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, eave = yb - 70, wall = [236, 232, 220], trim = [150, 140, 120];
    clapboard(p, r, x0, eave, W, 70, wall);
    gableRoof(p, r, x0 + W / 2, eave - 30, W / 2 + 5, eave + 2, [92, 80, 76]);
    // steeple, belfry, bell and cross
    const sx = x0 + W / 2 - 10;
    clapboard(p, r, sx, eave - 66, 20, 38, wall);
    for (let y = eave - 60; y < eave - 44; y++) for (let x = sx + 4; x < sx + 16; x++) p.put(x, y, [36, 30, 30]);
    for (let y = eave - 56; y < eave - 48; y++) for (let x = sx + 7; x < sx + 13; x++) if (Math.hypot(x - sx - 10, y - eave + 52) < 4) p.put(x, y, [200, 160, 70]);
    gableRoof(p, r, sx + 10, eave - 84, 12, eave - 66, [92, 80, 76]);
    for (let y = eave - 96; y < eave - 84; y++) { p.put(sx + 10, y, [120, 100, 70]); }
    for (let x = sx + 6; x < sx + 15; x++) p.put(x, eave - 92, [120, 100, 70]);
    windowAt(p, x0 + W / 2 - 7, eave - 18, 14, 14, { header: 'arch', frame: wall, glass: [140, 90, 160] });
    for (const wx of [x0 + 10, x0 + W - 26]) windowAt(p, wx, yb - 52, 16, 30, { header: 'arch', frame: [240, 236, 228], glass: [96, 70, 130] });
    doorAt(p, x0 + W / 2 - 14, yb - 6 - DOOR_H, 28, DOOR_H, { type: 'double', col: [120, 70, 40], frame: trim });
    for (let k = 0; k < 2; k++) for (let x = x0 + W / 2 - 18 - k * 3; x < x0 + W / 2 + 18 + k * 3; x++) for (let y = yb - 6 + k * 3; y < yb - 3 + k * 3; y++) p.put(x, y, y === yb - 6 + k * 3 ? [210, 200, 186] : [170, 160, 146]);
    return { img: finish(p), door: x0 + W / 2, wins: [[x0 + 10, yb - 52, 16, 30], [x0 + W - 26, yb - 52, 16, 30]], lamps: [], smoke: [] };
  };

  TOWN.stable = () => {
    const r = U.rng(99), W = 140, Hh = 122, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, eave = yb - 70, red = [150, 62, 46];
    battens(p, r, x0, eave, W, 70, red, 0.3);
    // gambrel roof
    for (let y = eave - 48; y < eave + 2; y++) {
      const t = (y - (eave - 48)) / 50;
      const half = t < 0.4 ? 26 + t / 0.4 * 30 : 56 + (t - 0.4) / 0.6 * 20;
      for (let x = x0 + W / 2 - half; x < x0 + W / 2 + half; x++) p.put(x, y, (y % 3 === 0) ? [78, 70, 68] : ((x >> 1) + y) % 7 === 0 ? [80, 72, 70] : [104, 94, 90]);
    }
    battens(p, r, x0 + W / 2 - 30, eave - 30, 60, 30, red, 0.3);
    // hayloft door with hay and a pulley beam
    for (let y = eave - 26; y < eave - 6; y++) for (let x = x0 + W / 2 - 10; x < x0 + W / 2 + 10; x++) p.put(x, y, y > eave - 14 ? (x % 3 ? [222, 192, 104] : [190, 160, 76]) : [30, 20, 16]);
    for (let x = x0 + W / 2 - 3; x < x0 + W / 2 + 3; x++) for (let y = eave - 40; y < eave - 36; y++) p.put(x, y, [90, 62, 40]);
    // trim
    for (let y = eave; y < yb; y++) for (const tx of [x0, x0 + W - 4]) for (let i = 0; i < 4; i++) p.put(tx + i, y, [236, 226, 206]);
    // big doors: one open showing a horse's head in the dark
    doorAt(p, x0 + W / 2 - 26, yb - 3 - 60, 52, 60, { type: 'barn', col: red, frame: [236, 226, 206], open: true });
    for (const [dx, dy] of [[8, 0], [9, 0], [10, 0], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [9, 4], [10, 4], [12, 4], [13, 4], [14, 4]]) p.put(x0 + W / 2 + 4 + dx, yb - 40 + dy, [110, 70, 44]);
    const sign = signBoard(p, x0 + W / 2 - 34, eave + 4, 68, 13, [236, 226, 206], [90, 50, 34]);
    label(sign, 'LIVERY STABLE', '#6a2a1e', 1);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    const lamp = lantern(p, x0 + W / 2 - 34, yb - 56);
    return { img: finish(p), door: x0 + W / 2, wins: [], lamps: [lamp], smoke: [] };
  };

  // ---------------------------------------------------- abandoned buildings
  // Same toolkit, but faded, boarded up and falling apart.
  function brokenBoards(p, r, x0, y0, w, h, n) {
    for (let i = 0; i < n; i++) {
      const bx = x0 + Math.floor(r() * (w - 8)), by = y0 + Math.floor(r() * (h - 6)), bw = 4 + Math.floor(r() * 10);
      for (let x = bx; x < bx + bw; x++) for (let y = by; y < by + 4; y++) p.put(x, y, [24, 16, 12]);
    }
  }
  function boarded(p, x, y, w, h) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.put(x + i, y + j, [26, 18, 14]);
    for (const k of [0.25, 0.7]) for (let i = -2; i < w + 2; i++) { const yy = Math.round(y + h * k + (i - w / 2) * 0.35); p.put(x + i, yy, [156, 116, 76]); p.put(x + i, yy + 1, [156, 116, 76]); p.put(x + i, yy + 2, [110, 80, 52]); }
  }
  function openDoorway(p, x, y, w, h, frame) {
    doorAt(p, x, y, w, h, { open: true, col: [104, 80, 58], frame });
  }

  const ABANDONED = {};
  ABANDONED.shack = seed => {
    const r = U.rng(seed), W = 96 + Math.floor(r() * 20), Hh = 92, p = U.pix(W + 20, Hh + 6);
    const x0 = 10, yb = Hh + 5, eave = yb - 70;
    battens(p, r, x0, eave, W, 70, [128, 96, 70], 1);
    for (let i = 0, x = x0 - 8; x < x0 + W + 8; i++, x++) {
      const sag = Math.round(5 * Math.sin((i / (W + 16)) * Math.PI));
      for (let k = 0; k < 8; k++) { if (i > W * 0.55 && i < W * 0.55 + 12 && k > 2) continue; p.put(x, eave - 8 + k + sag, k === 0 ? [154, 118, 84] : k < 4 ? [100, 72, 52] : [78, 56, 40]); }
    }
    brokenBoards(p, r, x0, eave + 4, W, 60, 5);
    openDoorway(p, x0 + 12, yb - DOOR_H, 26, DOOR_H, [80, 58, 40]);
    boarded(p, x0 + W - 32, yb - 50, 22, 26);
    chimney(p, x0 + W - 22, eave - 12, 8, [130, 110, 100]);
    return { img: finish(p), door: x0 + 25, w: W + 20, smoke: [] };
  };
  ABANDONED.farmhouse = seed => {
    const r = U.rng(seed), W = 124, Hh = 148, p = U.pix(W + 24, Hh + 4);
    const x0 = 12, yb = Hh + 3, eave = yb - 112;
    clapboard(p, r, x0, eave, W, 112, [180, 172, 156], 1);
    gableRoof(p, r, x0 + W / 2, eave - 34, W / 2 + 8, eave + 2, [92, 74, 66]);
    brokenBoards(p, r, x0 + W / 2 - 40, eave - 24, 80, 22, 3);
    windowAt(p, x0 + W / 2 - 8, eave - 20, 16, 14, { broken: true, frame: [150, 140, 120] });
    windowAt(p, x0 + 16, eave + 14, 18, 24, { broken: true, frame: [150, 140, 120], header: 'pediment' });
    boarded(p, x0 + W - 34, eave + 14, 18, 24);
    windowAt(p, x0 + 12, yb - 50, 20, 28, { broken: true, frame: [150, 140, 120] });
    boarded(p, x0 + W - 32, yb - 50, 20, 28);
    brokenBoards(p, r, x0, eave + 40, W, 60, 4);
    openDoorway(p, x0 + W / 2 - 13, yb - 3 - DOOR_H, 26, DOOR_H, [140, 128, 110]);
    porch(p, x0 - 4, x0 + W + 4, yb - 68, yb - 3, { posts: [x0, x0 + 44, x0 + W - 3], roof: [110, 90, 76], post: [150, 136, 118] });
    for (let k = 0; k < 10; k++) p.put(x0 + 44 + k, yb - 64 + k * 2, [24, 16, 12]);   // broken porch post
    boardwalk(p, x0 - 6, x0 + W + 6, yb);
    return { img: finish(p), door: x0 + W / 2, w: W + 24 };
  };
  ABANDONED.adobe = seed => {
    const r = U.rng(seed), W = 112, Hh = 80, p = U.pix(W + 20, Hh + 6);
    const x0 = 10, yb = Hh + 5, top = yb - 76, base = [204, 158, 112];
    for (let y = top; y < yb; y++) for (let x = x0; x < x0 + W; x++) {
      const e = y - top;
      if (e < 4 && (x - x0 < 4 - e || x0 + W - x < 5 - e)) continue;
      if (e < 3 && Math.sin(x * 1.3 + seed) > 0.45) continue;
      let c = base; const n = r();
      if (n < 0.08) c = sh(base, 0.92); else if (n < 0.13) c = sh(base, 1.06);
      if (x > x0 + W - 10) c = sh(c, 0.84);
      if (e < 3) c = sh(base, 1.12);
      p.put(x, y, c);
    }
    for (let i = 0; i < 3; i++) { const bx = x0 + 10 + Math.floor(r() * (W - 30)), by = top + 14 + Math.floor(r() * 30); for (let y = by; y < by + 14; y++) for (let x = bx; x < bx + 18; x++) if (((x - bx - 9) / 9) ** 2 + ((y - by - 7) / 7) ** 2 < 1) p.put(x, y, y % 4 === 0 || (x + Math.floor(y / 4) * 3) % 7 === 0 ? [150, 110, 80] : [180, 128, 88]); }
    for (const vx of [x0 + 8, x0 + 30, x0 + 52, x0 + 74, x0 + 96]) for (let k = -5; k < 5; k++) { p.put(vx + k, top + 7, [110, 76, 46]); p.put(vx + k, top + 8, [80, 54, 34]); }
    const dx = x0 + 16;
    for (let y = yb - DOOR_H; y < yb; y++) for (let x = dx; x < dx + 26; x++) { if (y < yb - DOOR_H + 13 && Math.hypot(x - dx - 13, y - (yb - DOOR_H + 13)) > 13) continue; p.put(x, y, [26, 18, 14]); }
    for (let y = top + 22; y < top + 38; y++) for (let x = x0 + W - 40; x < x0 + W - 24; x++) p.put(x, y, x === x0 + W - 32 ? [100, 70, 44] : [30, 20, 16]);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) p.put(x0 + W - 18 + (i % 2) * 2, top + 20 + i * 4 + k, k < 3 ? [190, 50, 36] : [120, 30, 24]);   // dried chiles
    return { img: finish(p, [110, 76, 50]), door: dx + 13, w: W + 20 };
  };
  ABANDONED.barn = seed => {
    const r = U.rng(seed), W = 136, Hh = 118, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, eave = yb - 66;
    battens(p, r, x0, eave, W, 66, [146, 70, 54], 1);
    for (let y = eave - 46; y < eave + 2; y++) {
      const t = (y - (eave - 46)) / 48;
      const half = t < 0.4 ? 24 + t / 0.4 * 30 : 54 + (t - 0.4) / 0.6 * 20;
      for (let x = x0 + W / 2 - half; x < x0 + W / 2 + half; x++) { let c = y % 3 === 0 ? [70, 62, 60] : [92, 82, 78]; if (r() < 0.04) c = [36, 30, 30]; p.put(x, y, c); }
    }
    battens(p, r, x0 + W / 2 - 28, eave - 28, 56, 28, [146, 70, 54], 1);
    for (let y = eave - 24; y < eave - 6; y++) for (let x = x0 + W / 2 - 9; x < x0 + W / 2 + 9; x++) p.put(x, y, [26, 18, 14]);
    brokenBoards(p, r, x0, eave + 4, W, 40, 6);
    doorAt(p, x0 + W / 2 - 24, yb - 3 - 58, 48, 58, { type: 'barn', col: [146, 70, 54], frame: [210, 200, 180], open: true });
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    return { img: finish(p), door: x0 + W / 2 + 12, w: W + 16 };
  };
  ABANDONED.chapel = seed => {
    const r = U.rng(seed), W = 84, Hh = 146, p = U.pix(W + 16, Hh + 4);
    const x0 = 8, yb = Hh + 3, eave = yb - 66, wall = [214, 208, 192];
    clapboard(p, r, x0, eave, W, 66, wall, 1);
    gableRoof(p, r, x0 + W / 2, eave - 26, W / 2 + 5, eave + 2, [84, 74, 72]);
    const sx = x0 + W / 2 - 9;
    clapboard(p, r, sx, eave - 40, 18, 16, wall, 1);
    for (let y = eave - 37; y < eave - 29; y++) for (let x = sx + 4; x < sx + 14; x++) p.put(x, y, [30, 26, 28]);
    gableRoof(p, r, sx + 9, eave - 50, 11, eave - 40, [84, 74, 72]);
    for (let y = eave - 58; y < eave - 50; y++) p.put(sx + 9 + (y > eave - 54 ? 0 : 1), y, [110, 90, 66]);
    for (let x = sx + 5; x < sx + 13; x++) p.put(x, eave - 56 + (x > sx + 9 ? 1 : 0), [110, 90, 66]);   // crooked cross
    windowAt(p, x0 + 8, yb - 50, 14, 28, { header: 'arch', frame: wall, glass: [96, 70, 130], broken: true });
    boarded(p, x0 + W - 22, yb - 50, 14, 28);
    brokenBoards(p, r, x0, eave + 4, W, 30, 3);
    openDoorway(p, x0 + W / 2 - 13, yb - 3 - DOOR_H, 26, DOOR_H, [150, 140, 120]);
    boardwalk(p, x0 - 2, x0 + W + 2, yb);
    return { img: finish(p), door: x0 + W / 2, w: W + 16 };
  };
  ABANDONED.waystation = seed => {
    const r = U.rng(seed), W = 150, Hh = 98, p = U.pix(W + 20, Hh + 4);
    const x0 = 10, yb = Hh + 3, top = yb - 82;
    clapboard(p, r, x0, top + 8, W, 74, [176, 140, 100], 1);
    cornice(p, x0, top, W, [120, 90, 60], false);
    const sign = signBoard(p, x0 + W / 2 - 36, top - 14, 72, 13, [196, 168, 122], [110, 80, 50]);
    label(sign, 'WAY STATION', '#5a3a22', 1);
    brokenBoards(p, r, x0, top + 10, W, 40, 5);
    windowAt(p, x0 + 50, yb - 50, 22, 28, { broken: true, frame: [150, 120, 90] });
    boarded(p, x0 + 90, yb - 50, 22, 28);
    windowAt(p, x0 + 120, yb - 50, 20, 28, { broken: true, frame: [150, 120, 90] });
    openDoorway(p, x0 + 16, yb - 3 - DOOR_H, 26, DOOR_H, [130, 100, 70]);
    porch(p, x0 - 4, x0 + W + 4, yb - 66, yb - 3, { posts: [x0, x0 + 76, x0 + W - 3], roof: [110, 84, 58] });
    boardwalk(p, x0 - 6, x0 + W + 6, yb);
    return { img: finish(p), door: x0 + 29, w: W + 20 };
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

  return {
    TOWN, abandoned, waterTower, windmill, wagon, well, lampPost, bench, laundry, corral, telegraphPole, DOOR_H,
  };
})();
