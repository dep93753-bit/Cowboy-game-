// Plants and trees for the prairie and forest. Drawn on a half-size grid,
// shaded in five tones lit from the upper left, outlined in a darker shade
// of their own colour (black ink makes leaves look cut out), then doubled
// to screen size. Every generator takes a seed, so no two come out alike.
// Pixels are collected first and the canvas is sized to fit them, so a
// crown can spread as wide as it likes without being clipped.
const Flora = (() => {
  const sh = U.shade, mix = U.lerpColor;

  // y grows downward and row 0 is the ground; art goes up into negative y.
  function art() {
    const px = new Map();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9;
    const key = (x, y) => Math.round(x) + ',' + Math.round(y);
    return {
      put(x, y, c) {
        x = Math.round(x); y = Math.round(y);
        if (y > 0) return;                                  // nothing below the ground
        px.set(x + ',' + y, [x, y, c]);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y;
      },
      has: (x, y) => px.has(key(x, y)),
      done() {
        const w = x1 - x0 + 3, h = -y0 + 2, p = U.pix(w, h);
        for (const [x, y, c] of px.values()) p.put(x - x0 + 1, y - y0 + 1, c);
        // outline in each edge pixel's own darker hue, but not along the ground row
        const add = [];
        for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) {
          if (p.has(x, y)) continue;
          for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (p.has(x + dx, y + dy)) { add.push([x, y, sh(p.get(x + dx, y + dy), 0.45)]); break; }
        }
        for (const [x, y, c] of add) p.put(x, y, c);
        return U.dbl(p.done());
      },
    };
  }

  const LEAF = {
    cottonwood: [[50, 82, 44], [72, 108, 54], [100, 138, 64], [134, 168, 80], [174, 198, 108]],
    oak: [[38, 66, 38], [56, 90, 46], [78, 118, 56], [108, 148, 68], [148, 182, 90]],
    birch: [[84, 108, 40], [116, 144, 52], [152, 178, 68], [192, 208, 94], [228, 230, 140]],
    gold: [[140, 90, 30], [184, 126, 40], [214, 166, 58], [236, 200, 88], [250, 230, 150]],
    willow: [[60, 90, 48], [86, 120, 60], [114, 150, 74], [146, 178, 94], [184, 204, 126]],
    apple: [[44, 74, 40], [62, 98, 48], [86, 128, 58], [116, 158, 72], [156, 190, 96]],
    pine: [[24, 54, 42], [36, 72, 52], [52, 94, 62], [74, 118, 74], [108, 148, 94]],
    spruce: [[28, 52, 56], [40, 70, 70], [58, 92, 88], [82, 118, 108], [118, 152, 138]],
  };
  const BARK = {
    brown: [[70, 52, 38], [96, 72, 52], [124, 96, 70], [150, 122, 92]],
    grey: [[78, 74, 70], [104, 98, 92], [132, 126, 118], [160, 154, 146]],
    birch: [[52, 48, 46], [196, 190, 178], [224, 220, 208], [244, 240, 230]],
  };
  const GRASS = [[62, 96, 44], [84, 122, 54], [108, 146, 64], [136, 170, 80], [170, 192, 100]];

  // ------------------------------------------------------------ parts
  // One clump of leaves: lit on its upper left, a ragged rim, a few stray leaves.
  // tone 1 is the sunny top of a crown, 0 its shaded underside.
  function cluster(a, r, cx, cy, rad, pal, tone) {
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > rad + 0.3 || (d > rad - 1 && r() < 0.4)) continue;
      const lit = (-x - y * 1.2) / (rad * 1.6) + tone * 0.9 - 0.35 + (r() - 0.5) * 0.25;
      let k = lit > 0.55 ? 4 : lit > 0.15 ? 3 : lit > -0.3 ? 2 : lit > -0.7 ? 1 : 0;
      if (r() < 0.08) k = Math.max(0, k - 1);
      a.put(cx + x, cy + y, pal[k]);
    }
    for (let i = 0; i < rad * 1.5; i++) { const g = r() * Math.PI * 2; a.put(cx + Math.cos(g) * (rad + 1), cy + Math.sin(g) * (rad + 1), pal[Math.sin(g) < 0 ? 3 : 1]); }
  }
  // A crown: leaf clumps spread over an ellipse, drawn bottom first so the lit tops land on top.
  function crown(a, r, cx, cy, rw, rh, pal, n, rmin, rmax) {
    const cl = [];
    for (let i = 0; i < n; i++) { const g = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.85; cl.push([cx + Math.cos(g) * d * rw, cy + Math.sin(g) * d * rh, rmin + r() * (rmax - rmin)]); }
    cl.sort((p, q) => q[1] - p[1]);
    for (const [x, y, rad] of cl) cluster(a, r, x, y, Math.round(rad), pal, U.clamp(1 - (y - (cy - rh)) / (rh * 2), 0, 1));
  }
  function trunk(a, r, x, yb, yt, w0, w1, bark, lean = 0) {
    for (let y = yb; y >= yt; y--) {
      const f = (yb - y) / Math.max(1, yb - yt), hw = (w0 + (w1 - w0) * f) / 2, cx = x + lean * f;
      for (let i = Math.floor(-hw); i <= Math.ceil(hw) - 1; i++) {
        const u = (i + hw) / (hw * 2);
        let k = u < 0.3 ? 3 : u < 0.65 ? 2 : u < 0.85 ? 1 : 0;
        if ((Math.round(cx + i) * 5 + y * 2) % 7 === 0 && k > 0) k--;      // furrows in the bark
        a.put(cx + i, y, bark[k]);
      }
    }
  }
  function limb(a, x0, y0, x1, y1, w, bark) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, ww = Math.max(1, Math.round(w * (1 - t * 0.6)));
      for (let k = 0; k < ww; k++) a.put(x + k, y, bark[k === 0 ? 2 : 1]);
    }
  }
  // Low grass blades along the ground, to hide where things meet it.
  function skirt(a, r, x0, w, pal = GRASS) {
    for (let x = Math.round(x0); x < x0 + w; x++) {
      const h = 1 + Math.floor(r() * 4), lean = r() < 0.5 ? -1 : 1;
      for (let y = 0; y < h; y++) a.put(x + (y >= h - 1 && h > 2 ? lean : 0), -y, pal[y === h - 1 ? 3 + (r() < 0.3 ? 1 : 0) : y === 0 ? 1 : 2]);
    }
  }
  // Roots flaring into the ground, then the grass skirt.
  function roots(a, r, x, w, bark, wide) {
    for (let k = 1; k <= 3; k++) { a.put(x - w / 2 - k, -3 + k, bark[1]); a.put(x + w / 2 + k - 1, -3 + k, bark[0]); }
    skirt(a, r, x - wide / 2, wide);
  }

  // ------------------------------------------------------------ trees
  // kinds: cottonwood, oak, apple, pine, spruce, birch, aspen, willow, dead, sapling
  function tree(kind, seed) {
    const r = U.rng(seed * 7 + 11), a = art();
    if (kind === 'cottonwood' || kind === 'oak' || kind === 'apple') {
      const big = kind === 'cottonwood', apple = kind === 'apple', pal = LEAF[kind];
      const h = apple ? 26 + r() * 8 : big ? 56 + r() * 20 : 40 + r() * 14;
      const lean = (r() - 0.5) * h * 0.15, tw = apple ? 3 : big ? 5 + r() * 2 : 4 + r() * 1.5;
      const ch = h * (apple ? 0.42 : 0.5), cw = h * (apple ? 0.5 : big ? 0.55 : 0.5) * (0.85 + r() * 0.35);
      const cy = -h + ch, fork = -h * 0.42, lx = lean * 0.4;
      trunk(a, r, 0, 0, fork, tw * 1.25, tw, BARK.brown, lx);
      const nl = 2 + Math.floor(r() * 3);
      for (let i = 0; i < nl; i++) limb(a, lx - 1, fork, lx + (i / (nl - 1) - 0.5) * cw * 1.3 + (r() - 0.5) * 4, cy + (r() - 0.5) * ch * 0.6, Math.max(1, tw * 0.5), BARK.brown);
      // a few lobes with gaps between them where the branches show
      const lobes = big ? 3 + Math.floor(r() * 3) : 2 + Math.floor(r() * 2);
      for (let i = 0; i < lobes; i++) {
        const ox = lean * 0.6 + (i / (lobes - 1) - 0.5) * cw * 1.1 + (r() - 0.5) * 6, oy = cy + (r() - 0.5) * ch * 0.5 - (i % 2) * ch * 0.25;
        crown(a, r, ox, oy, cw * 0.5, ch * 0.55, pal, big ? 9 : 7, big ? 4 : 3, big ? 7 : 6);
      }
      crown(a, r, lean * 0.6, cy - ch * 0.35, cw * 0.4, ch * 0.4, pal, 5, 3, 6);
      if (apple) {
        for (let i = 0; i < 18; i++) { const x = lean * 0.6 + (r() - 0.5) * cw * 1.2, y = cy + (r() - 0.3) * ch; if (a.has(x, y)) a.put(x, y, r() < 0.8 ? [204, 44, 40] : [236, 196, 70]); }
        for (let i = 0; i < 3; i++) a.put((r() - 0.5) * 14, 0, [190, 40, 36]);       // windfalls
      }
      roots(a, r, 0, tw * 1.25, BARK.brown, tw * 4 + 8);
      return a.done();
    }
    if (kind === 'pine' || kind === 'spruce') {
      // boughs: rows of drooping branches, each spreading out from the trunk
      // with a sunny top and shaded underside, ragged at the tips
      const spruce = kind === 'spruce', pal = LEAF[kind];
      const h = spruce ? 54 + r() * 30 : 48 + r() * 30, wmax = h * (spruce ? 0.22 : 0.27) * (0.85 + r() * 0.3), lean = (r() - 0.5) * 3, top = -h;
      trunk(a, r, 0, 0, -h * 0.9, 3, 1.4, BARK.brown, lean * 0.3);
      const rows = Math.round(h / (spruce ? 4.2 : 5));
      for (let i = rows - 1; i >= 0; i--) {
        const f = (i + 1) / rows, y = top + 3 + (h * 0.86 - 3) * (i / rows), cx = lean * (1 - f);
        for (const side of [-1, 1]) {
          const len = (1.5 + wmax * Math.pow(f, 0.8)) * (0.75 + r() * 0.45), droop = 1.5 + len * (spruce ? 0.25 : 0.4), th = 2 + Math.round(f * 2 + r());
          for (let d = 0; d <= len; d++) {
            const t = d / len, yy = y + droop * t * t;
            for (let k = 0; k < th * (1 - t * 0.5) + 1; k++) {
              let c = side < 0 ? 3 : 1;
              if (k === 0) c = side < 0 ? 4 : 2;                                // the bough's top catches the light
              if (k >= th * (1 - t * 0.5)) c = 0;                               // shade under it
              if ((d * 3 + k * 5 + i) % 7 === 0) c = Math.max(0, c - 1);
              a.put(cx + side * d, yy + k - 1, pal[c]);
            }
            if (d > 1 && r() < 0.3) a.put(cx + side * d, yy + th, pal[0]);     // needles hanging off
          }
        }
        for (let k = -1; k < 3; k++) a.put(cx, y + k, pal[2]);
      }
      a.put(lean, top, pal[3]); a.put(lean, top + 1, pal[2]); a.put(lean, top - 1, pal[2]);
      if (!spruce && r() < 0.35) for (let i = 0; i < 5; i++) a.put(lean + (r() - 0.5) * 10, top + 8 + r() * 14, [140, 92, 60]);   // cones
      roots(a, r, 0, 3, BARK.brown, 14);
      return a.done();
    }
    if (kind === 'birch' || kind === 'aspen') {
      const pal = kind === 'aspen' && r() < 0.5 ? LEAF.gold : LEAF.birch, n = 1 + Math.floor(r() * 3), h0 = 40 + r() * 20;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 5 + (r() - 0.5) * 2, h = h0 * (1 - (i % 2) * 0.15), lean = x * 0.5 + (r() - 0.5) * 3, ht = h * 0.82;
        trunk(a, r, x, 0, -ht, 2.4, 1.4, BARK.birch, lean);
        for (let y = -2; y > -ht; y -= 2 + Math.floor(r() * 4)) a.put(x + lean * (-y / ht) + (r() < 0.5 ? -1 : 0), y, BARK.birch[0]);   // the black marks
        crown(a, r, x + lean, -h * 0.68, 7 + r() * 3, h * 0.3, pal, 10, 2, 4);
      }
      roots(a, r, 0, n * 4, BARK.grey, n * 5 + 10);
      return a.done();
    }
    if (kind === 'willow') {
      const pal = LEAF.willow, h = 38 + r() * 12, cw = h * 0.7;
      trunk(a, r, 0, 0, -h * 0.55, 6, 4, BARK.brown, (r() - 0.5) * 4);
      crown(a, r, 0, -h * 0.74, cw * 0.5, h * 0.2, pal, 14, 3, 6);
      for (let i = 0; i < cw * 1.6; i++) {                    // long strands hanging down
        const x = (r() - 0.5) * cw * 1.05, y0 = -h * 0.74 + (r() - 0.2) * h * 0.2, len = 8 + r() * h * 0.4;
        for (let d = 0; d < len && y0 + d < -2; d++) a.put(x + Math.sin(d * 0.25) * (x > 0 ? 0.8 : -0.8), y0 + d, pal[d > len - 2 ? 3 : Math.abs(Math.round(x)) % 3 === 0 ? 1 : 2]);
      }
      roots(a, r, 0, 6, BARK.brown, 20);
      return a.done();
    }
    if (kind === 'dead') {
      const h = 34 + r() * 24, bark = BARK.grey, lean = (r() - 0.5) * 6;
      trunk(a, r, 0, 0, -h, 4, 1.5, bark, lean);
      const branch = (x, y, g, len, w, depth) => {
        const x1 = x + Math.cos(g) * len, y1 = y - Math.sin(g) * len;
        limb(a, x, y, x1, y1, w, bark);
        if (depth > 0) for (const s of [-1, 1]) if (r() < 0.8) branch(x1, y1, g + s * (0.3 + r() * 0.5), len * (0.5 + r() * 0.2), Math.max(1, w - 1), depth - 1);
      };
      const nb = 3 + Math.floor(r() * 3);
      for (let i = 0; i < nb; i++) { const f = 0.35 + (i / nb) * 0.55, s = i % 2 ? 1 : -1; branch(lean * f, -h * f, Math.PI / 2 - s * (0.6 + r() * 0.5), h * (0.25 + r() * 0.15), 2, 2); }
      if (r() < 0.3) for (let i = -3; i <= 3; i++) { a.put(lean * 0.8 + i, -h * 0.8, [96, 76, 52]); a.put(lean * 0.8 + i, -h * 0.8 - 1, [120, 96, 64]); }   // an old nest
      roots(a, r, 0, 4, bark, 12);
      return a.done();
    }
    // a young tree
    const h = 14 + r() * 8, pal = U.pick(r, [LEAF.oak, LEAF.cottonwood, LEAF.birch]);
    trunk(a, r, 0, 0, -h * 0.6, 1.6, 1, BARK.brown);
    crown(a, r, 0, -h * 0.72, 4 + r() * 2, h * 0.25, pal, 5, 2, 3);
    skirt(a, r, -5, 10);
    return a.done();
  }

  // ------------------------------------------------------------ ground plants
  const SHRUB = {
    leafy: LEAF.oak,
    berry: [[34, 62, 40], [50, 84, 50], [70, 108, 60], [96, 136, 72], [130, 168, 92]],
    sage: [[78, 94, 80], [104, 120, 100], [130, 146, 120], [158, 172, 142], [192, 202, 172]],
    juniper: [[30, 58, 52], [44, 78, 66], [62, 100, 80], [88, 126, 98], [124, 156, 124]],
    rose: LEAF.apple,
  };
  function shrub(seed, kind) {
    const r = U.rng(seed * 13 + 5), a = art();
    kind = kind || U.pick(r, ['leafy', 'berry', 'sage', 'juniper', 'rose']);
    const w = 9 + r() * 8, h = 6 + r() * 5;
    crown(a, r, 0, -h * 0.55, w * 0.5, h * 0.45, SHRUB[kind], 8 + Math.floor(w / 2), 2, 4);
    const dots = { berry: [[196, 40, 52], [120, 60, 150]], rose: [[236, 130, 160], [250, 200, 214]], juniper: [[110, 140, 180], [150, 180, 210]] }[kind];
    if (dots) for (let i = 0; i < w; i++) { const x = (r() - 0.5) * w, y = -r() * h; if (a.has(x, y)) { a.put(x, y, dots[0]); if (kind === 'rose') a.put(x + 1, y, dots[1]); } }
    skirt(a, r, -w * 0.6, w * 1.2);
    return a.done();
  }
  // A tuft of grass. size 0 short, 1 medium, 2 tall prairie grass with seed heads.
  function grass(seed, size = 1) {
    const r = U.rng(seed * 17 + 3), a = art(), w = [6, 9, 12][size] + r() * 6, hmax = [4, 8, 14][size], dry = r() < 0.25 ? 0.5 : 0;
    for (let i = 0; i < w * 1.4; i++) {
      const x0 = (r() - 0.5) * w * (0.5 + r() * 0.5), h = hmax * (0.35 + r() * 0.65), bend = (r() - 0.5) * 1.6 + x0 * 0.12, tone = 1 + Math.floor(r() * 3);
      for (let y = 0; y < h; y++) { const t = y / h; a.put(x0 + bend * t * t * h * 0.35, -y, mix(GRASS[y > h - 2 ? Math.min(4, tone + 1) : tone], [196, 176, 104], dry * t)); }
      if (size === 2 && r() < 0.35) { const tx = x0 + bend * h * 0.35; for (let k = 0; k < 3; k++) a.put(tx + (k % 2), -h - k, k ? [214, 196, 128] : [184, 160, 96]); }
    }
    for (let x = -w * 0.35; x < w * 0.35; x++) a.put(x, 0, GRASS[0]);
    return a.done();
  }
  const BLOOMS = {
    daisy: { petal: [244, 242, 232], eye: [236, 190, 60], h: [3, 6] },
    blackeyed: { petal: [240, 186, 50], eye: [70, 44, 30], h: [4, 7] },
    poppy: { petal: [228, 92, 50], eye: [60, 30, 26], h: [3, 6] },
    bluebell: { petal: [110, 140, 220], eye: [80, 100, 190], h: [3, 5] },
    lupine: { spike: [[120, 100, 210], [160, 140, 230], [96, 76, 176]], h: [6, 10] },
    paintbrush: { spike: [[214, 60, 50], [240, 110, 70], [180, 40, 40]], h: [4, 7] },
    sunflower: { petal: [246, 196, 40], eye: [96, 60, 30], h: [14, 22], big: true },
  };
  function flowers(seed, kind) {
    const r = U.rng(seed * 29 + 1), a = art();
    const kinds = kind ? [kind] : [U.pick(r, ['daisy', 'blackeyed', 'poppy', 'lupine', 'paintbrush', 'bluebell']), U.pick(r, ['daisy', 'lupine', 'bluebell', 'poppy'])];
    const w = kind === 'sunflower' ? 8 + r() * 8 : 10 + r() * 10;
    for (let i = 0; i < w; i++) { const x = (r() - 0.5) * w, h = 1 + r() * 3; for (let y = 0; y < h; y++) a.put(x, -y, GRASS[1 + (y > 1 ? 1 : 0)]); }
    const n = Math.max(2, Math.round(w * (kind === 'sunflower' ? 0.3 : 0.45)));
    for (let i = 0; i < n; i++) {
      const b = BLOOMS[kinds[i % kinds.length]], x = (r() - 0.5) * w, h = Math.round(b.h[0] + r() * (b.h[1] - b.h[0]));
      for (let y = 0; y < h; y++) a.put(x, -y, GRASS[2]);
      if (b.big) {
        a.put(x - 1, -Math.round(h * 0.5), GRASS[3]); a.put(x + 1, -Math.round(h * 0.4), GRASS[2]); a.put(x - 2, -Math.round(h * 0.5) + 1, GRASS[1]);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) a.put(x + dx, -h + dy, Math.abs(dx) + Math.abs(dy) <= 1 ? b.eye : b.petal);
      } else if (b.spike) {
        for (let k = 0; k < 4; k++) { a.put(x, -h - k, b.spike[k % 2]); if (k < 3) a.put(x + (k % 2 ? 1 : -1), -h - k, b.spike[2]); }
      } else {
        a.put(x - 1, -h, b.petal); a.put(x + 1, -h, b.petal); a.put(x, -h - 1, b.petal); a.put(x, -h + 1, sh(b.petal, 0.85)); a.put(x, -h, b.eye);
      }
    }
    return a.done();
  }
  function cattails(seed) {
    const r = U.rng(seed * 31 + 7), a = art(), w = 10 + r() * 8, pal = [[56, 88, 50], [78, 112, 58], [104, 138, 68], [134, 162, 84]];
    for (let i = 0; i < w * 1.5; i++) {               // long leaves curving over
      const x0 = (r() - 0.5) * w, h = 10 + r() * 12, bend = (r() - 0.5) * 6;
      for (let y = 0; y < h; y++) { const t = y / h; a.put(x0 + bend * t * t, -y, pal[y > h * 0.8 ? 3 : 1 + (i % 2)]); }
    }
    const n = 2 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {                       // stalks with brown heads
      const x = (r() - 0.5) * w * 0.8, h = 14 + r() * 10, lean = (r() - 0.5) * 2;
      for (let y = 0; y < h; y++) a.put(x + lean * y / h, -y, pal[0]);
      for (let k = 0; k < 5; k++) { a.put(x + lean, -h + 2 - k, k === 4 ? [150, 108, 70] : [104, 68, 44]); a.put(x + lean + 1, -h + 2 - k, [84, 54, 36]); }
      a.put(x + lean, -h - 3, pal[2]);
    }
    return a.done();
  }
  function fern(seed) {
    const r = U.rng(seed * 37 + 2), a = art(), n = 5 + Math.floor(r() * 3), pal = [[48, 92, 50], [66, 116, 58], [92, 144, 70], [124, 172, 88]];
    for (let k = 0; k < n; k++) {
      const g = Math.PI * (0.12 + k / (n - 1) * 0.76) + (r() - 0.5) * 0.15, len = 8 + r() * 5;
      for (let d = 0; d < len; d++) {
        const x = Math.cos(g) * d * 1.1, y = -Math.sin(g) * d + d * d / len * 0.35;
        a.put(x, y, pal[1]);
        if (d > 1 && d < len - 1 && d % 2 === 0) for (let q = 1; q <= 1 + Math.round((1 - d / len) * 2); q++) { a.put(x - Math.sin(g) * q * 0.7, y - Math.cos(g) * q * 0.7, pal[2]); a.put(x + Math.sin(g) * q * 0.7, y + Math.cos(g) * q * 0.7, pal[0]); }
      }
      a.put(Math.cos(g) * len * 1.1, -Math.sin(g) * len + len * 0.35, pal[3]);
    }
    return a.done();
  }
  function rock(seed, moss, small) {
    const r = U.rng(seed * 41 + 9), a = art(), w = small ? 4 + r() * 5 : 9 + r() * 14, h = (small ? 2 : 5) + r() * w * 0.5;
    const pal = U.pick(r, [[[78, 76, 74], [104, 100, 96], [132, 128, 122], [164, 160, 152]], [[96, 84, 70], [126, 112, 94], [154, 140, 120], [186, 172, 150]]]);
    const bumps = [0, 1, 2].map(() => [(r() - 0.5) * w * 0.5, r() * 0.4 + 0.8]);
    for (let x = -w / 2; x <= w / 2; x++) {
      const u = x / (w / 2);
      let top = h * Math.sqrt(Math.max(0, 1 - u * u));
      for (const [bx, s] of bumps) top = Math.max(top, h * s * Math.max(0, 1 - ((x - bx) / (w * 0.3)) ** 2));
      for (let y = 0; y < top; y++) {
        const l = -u * 0.6 + (y / Math.max(1, top)) * 0.9;
        let k = l > 0.55 ? 3 : l > 0.1 ? 2 : l > -0.3 ? 1 : 0;
        if (y >= top - 1 && u < 0.4) k = 3;
        if ((Math.round(x) * 7 + y * 3) % 13 === 0) k = Math.max(0, k - 1);
        a.put(x, -y, moss && y >= top - 2 && r() < 0.7 ? GRASS[2 + (y >= top - 1 ? 1 : 0)] : pal[k]);
      }
    }
    if (r() < 0.5) for (let i = 0; i < 3; i++) a.put((r() - 0.5) * w * 0.6, -1 - r() * h * 0.5, [190, 196, 140]);   // lichen
    skirt(a, r, -w / 2 - 1, 4); skirt(a, r, w / 2 - 2, 4);
    return a.done();
  }
  function log(seed) {
    const r = U.rng(seed * 43 + 1), a = art(), L = 18 + r() * 14, rad = 3 + Math.floor(r() * 2), bark = BARK.brown, top = -rad * 2 + 1;
    for (let x = 0; x < L; x++) for (let y = 0; y < rad * 2; y++) {
      const v = y / (rad * 2);
      let k = v < 0.25 ? 3 : v < 0.6 ? 2 : v < 0.85 ? 1 : 0;
      if ((x * 3 + y * 7) % 9 === 0) k = Math.max(0, k - 1);
      a.put(x, top + y, bark[k]);
    }
    for (let y = 0; y < rad * 2; y++) for (let x = 0; x < 3; x++) { const d = Math.hypot(x - 1, y - rad + 0.5); a.put(L + x - 1, top + y, d < rad * 0.4 ? [196, 164, 116] : d < rad * 0.75 ? [170, 136, 94] : [150, 116, 80]); }   // the sawn end
    for (let x = 0; x < L; x++) if (r() < 0.55) { a.put(x, top - 1, GRASS[2]); if (r() < 0.4) a.put(x, top - 2, GRASS[3]); }   // moss
    if (r() < 0.6) for (let i = 0; i < 3; i++) { const x = 2 + r() * (L - 6); a.put(x, top - 2, [196, 60, 48]); a.put(x + 1, top - 2, [196, 60, 48]); a.put(x, top - 1, [230, 220, 200]); }
    skirt(a, r, -2, L + 4);
    return a.done();
  }
  function stump(seed) {
    const r = U.rng(seed * 47 + 3), a = art(), w = 8 + Math.floor(r() * 5), h = 5 + Math.floor(r() * 5), bark = BARK.brown;
    trunk(a, r, 0, 0, -h, w, w - 1, bark);
    for (let x = -w / 2; x < w / 2 - 1; x++) a.put(x, -h - 1, Math.round(x) % 2 ? [196, 164, 116] : [176, 140, 96]);   // rings on the cut top
    for (let k = 1; k <= 3; k++) { a.put(-w / 2 - k, -3 + k, bark[1]); a.put(w / 2 + k - 1, -3 + k, bark[0]); }
    if (r() < 0.4) { limb(a, 0, -h - 1, 3, -h - 6, 1, [[0, 0, 0], [110, 80, 52], [130, 96, 62]]); for (const [x, y] of [[3, -h - 7], [4, -h - 7], [4, -h - 6], [5, -h - 6]]) a.put(x, y, [150, 150, 158]); }   // an axe left in it
    skirt(a, r, -w, w * 2);
    return a.done();
  }
  function mushrooms(seed) {
    const r = U.rng(seed * 53 + 1), a = art(), n = 2 + Math.floor(r() * 3), red = r() < 0.5, cap = red ? [200, 50, 44] : [150, 110, 70];
    for (let i = 0; i < n; i++) {
      const x = i * 3 + r() * 2, h = 2 + Math.floor(r() * 3);
      for (let y = 0; y < h; y++) a.put(x, -y, [232, 222, 200]);
      for (let k = -1; k <= 1; k++) a.put(x + k, -h, cap);
      a.put(x, -h - 1, cap); if (red) a.put(x - 1, -h, [250, 240, 230]);
    }
    skirt(a, r, -2, n * 3 + 3);
    return a.done();
  }

  // ------------------------------------------------------------ crops
  // A wheat field: two ranks of ripe stalks swaying in long waves, heads catching the light.
  function wheat(w, seed) {
    const r = U.rng(seed * 71 + 5), a = art(), W = Math.round(w / 2);
    const gold = [[160, 120, 50], [196, 158, 70], [222, 186, 92], [240, 210, 120], [250, 232, 160]];
    for (let k = 0; k < 2; k++) for (let x = k; x < W; x += 1 + k) {
      const h = 11 + Math.sin(x * 0.15 + seed) * 1.5 + r() * 3 - (1 - k) * 2, lean = Math.sin(x * 0.05 + seed * 0.3) * 1.2, tone = k ? 2 : 1;
      for (let y = 0; y < h; y++) a.put(x + lean * y / h, -y, gold[y < 3 ? tone - 1 : tone]);
      for (let y = 0; y < 3; y++) a.put(x + lean + (y % 2 ? 0.5 : 0), -h - y, gold[Math.min(4, tone + 1 + (y === 2 ? 1 : 0))]);
    }
    return a.done();
  }
  // Rows of tall corn: arching leaves, ears on the stalk, tassels on top.
  function corn(w, seed) {
    const r = U.rng(seed * 59 + 4), a = art(), W = Math.round(w / 2);
    const stalk = [[70, 110, 50], [92, 136, 58], [118, 160, 70], [150, 184, 90]], tassel = [[200, 170, 90], [230, 204, 120]];
    for (let row = 0; row < 2; row++) for (let x = (1 - row) * 2; x < W; x += 4) {
      const h = 22 + r() * 8 - (1 - row) * 3, xx = x + (r() - 0.5), tone = row;
      for (let y = 0; y < h; y++) a.put(xx, -y, stalk[tone + (y % 5 === 0 ? 0 : 1)]);
      for (let k = 0; k < 4; k++) { const ly = -6 - k * 4 - r() * 2, s = k % 2 ? 1 : -1, len = 4 + r() * 3; for (let d = 1; d <= len; d++) a.put(xx + s * d, ly + d * d * 0.12, stalk[Math.min(3, tone + 1 + (d < 2 ? 1 : 0))]); }
      if (r() < 0.7) { const ey = -10 - r() * 6; a.put(xx + 1, ey, [226, 200, 110]); a.put(xx + 1, ey - 1, [236, 214, 130]); a.put(xx + 1, ey + 1, [150, 170, 90]); }
      for (let k = 0; k < 3; k++) a.put(xx + (k - 1), -h - (k === 1 ? 2 : 1), tassel[k % 2]);
    }
    skirt(a, r, -1, W + 2);
    return a.done();
  }
  // A pumpkin patch: creeping vines with ribbed pumpkins of all sizes.
  function pumpkins(w, seed) {
    const r = U.rng(seed * 61 + 2), a = art(), W = Math.round(w / 2), vine = [[60, 96, 44], [84, 124, 54], [110, 150, 66]];
    const orange = [[150, 64, 20], [196, 94, 30], [230, 128, 44], [246, 162, 70], [252, 196, 110]];
    for (let x = 0; x < W; x++) { const y = -Math.round(Math.abs(Math.sin(x * 0.4)) * 1.5); a.put(x, y, vine[1]); if (r() < 0.3) { a.put(x, y - 1, vine[2]); a.put(x + 1, y - 2, vine[2]); a.put(x, y - 2, vine[0]); } }
    for (let x = 2; x < W - 2; x += 5 + r() * 6) {
      const rx = 2 + r() * 2.5, ry = rx * 0.8, cx = Math.round(x), cy = -ry;
      for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let xx = -Math.ceil(rx); xx <= Math.ceil(rx); xx++) {
        if ((xx / rx) ** 2 + (y / ry) ** 2 > 1) continue;
        const l = -y / ry * 0.8 - xx / rx * 0.4;
        let k = l > 0.6 ? 4 : l > 0.15 ? 3 : l > -0.4 ? 2 : 1;
        if (Math.abs(xx) % 2 === 1 && Math.abs(xx) < rx - 0.5) k = Math.max(0, k - 1);   // ribs
        a.put(cx + xx, cy + y, orange[k]);
      }
      a.put(cx, cy - ry - 1, [96, 76, 40]); a.put(cx + 1, cy - ry - 1, [96, 76, 40]);
      for (let k = 0; k < 3; k++) a.put(cx - 2 + k, cy - ry - 1 - (k % 2), vine[2]);
    }
    return a.done();
  }
  // A kitchen garden on tilled soil: cabbages, lettuces, beans up their poles, carrot tops.
  function garden(w, seed) {
    const r = U.rng(seed * 67 + 9), a = art(), W = Math.round(w / 2);
    const leafG = [[54, 96, 52], [80, 128, 64], [112, 160, 82], [150, 190, 110], [190, 214, 150]];
    const cab = [[70, 110, 80], [104, 150, 104], [140, 184, 132], [176, 210, 166], [206, 230, 196]];
    for (let x = -1; x < W + 1; x++) { a.put(x, 0, [96, 70, 46]); if (x % 4 !== 0) a.put(x, -1, [120, 90, 60]); }
    let x = 1;
    while (x < W - 3) {
      const kind = U.pick(r, ['cabbage', 'cabbage', 'beans', 'carrots', 'lettuce', 'sweetcorn']);
      if (kind === 'cabbage' || kind === 'lettuce') { const rr = kind === 'cabbage' ? 3 : 2; cluster(a, r, x + rr, -rr - 1, rr, kind === 'cabbage' ? cab : leafG, 0.6); x += rr * 2 + 2; }
      else if (kind === 'beans') { for (let y = 0; y < 16; y++) a.put(x + 1, -y - 1, [140, 110, 70]); for (let y = 2; y < 15; y++) if (r() < 0.8) a.put(x + 1 + (r() < 0.5 ? (y % 3 === 0 ? 1 : -1) : 0), -y - 1, leafG[1 + Math.floor(r() * 3)]); x += 5; }
      else if (kind === 'carrots') { for (let k = 0; k < 4; k++) { const cx = x + k * 2; a.put(cx, -2, leafG[2]); a.put(cx, -3, leafG[3]); a.put(cx + 1, -3, leafG[2]); a.put(cx, -1, [230, 120, 40]); } x += 9; }
      else { for (let k = 0; k < 2; k++) { const cx = x + k * 3; for (let y = 0; y < 10; y++) a.put(cx, -y - 1, leafG[1]); a.put(cx - 1, -6, leafG[2]); a.put(cx + 1, -8, leafG[2]); a.put(cx, -11, [220, 196, 110]); } x += 7; }
    }
    return a.done();
  }

  // freshly plowed ground: dark ridged soil with the odd sprout
  function tilled(w, seed) {
    const r = U.rng(seed * 73 + 1), a = art(), W = Math.round(w / 2);
    for (let x = 0; x < W; x++) for (let y = 0; y < 3; y++) a.put(x, -y, (x + y * 2) % 4 < 2 ? [96, 70, 46] : [120, 90, 60]);
    for (let x = 2; x < W; x += 3 + Math.floor(r() * 3)) if (r() < 0.5) { a.put(x, -3, GRASS[2]); a.put(x, -4, GRASS[3]); }
    return a.done();
  }

  return { tree, shrub, grass, flowers, cattails, fern, rock, log, stump, mushrooms, wheat, corn, pumpkins, garden, tilled, GRASS };
})();
