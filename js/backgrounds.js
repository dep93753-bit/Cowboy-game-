// Sky (driven by the clock) and parallax scenery layers for each biome.
const BG = (() => {
  const SKY_H = 134;

  // Sky colours by hour: [top, middle, horizon].
  const SKY_KEYS = [
    [0, [10, 10, 28], [20, 18, 46], [34, 30, 66]],
    [4.5, [10, 10, 28], [20, 18, 46], [34, 30, 66]],
    [5.5, [36, 30, 70], [120, 70, 110], [230, 140, 110]],
    [7, [84, 136, 200], [150, 190, 225], [236, 222, 188]],
    [16.5, [76, 136, 208], [140, 190, 230], [226, 224, 206]],
    [18.5, [58, 34, 82], [170, 70, 92], [252, 204, 128]],
    [19.5, [30, 22, 56], [80, 40, 90], [160, 70, 80]],
    [20.5, [10, 10, 28], [20, 18, 46], [34, 30, 66]],
    [24, [10, 10, 28], [20, 18, 46], [34, 30, 66]],
  ];
  // Light that multiplies the world (white = full daylight).
  const LIGHT_KEYS = [
    [0, [64, 74, 132]], [4.5, [64, 74, 132]], [6, [210, 170, 190]], [7.5, [255, 255, 255]],
    [17, [255, 255, 255]], [18.5, [255, 206, 176]], [19.5, [150, 120, 160]], [20.5, [64, 74, 132]], [24, [64, 74, 132]],
  ];

  function keyed(keys, hour) {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (hour >= a[0] && hour <= b[0]) {
        const t = (hour - a[0]) / (b[0] - a[0] || 1);
        return a.slice(1).map((c, j) => U.lerpColor(c, b[j + 1], t));
      }
    }
    return keys[0].slice(1);
  }
  const skyColors = hour => keyed(SKY_KEYS, hour);
  const light = hour => keyed(LIGHT_KEYS, hour)[0];
  // 0 = day, 1 = full night
  function night(hour) {
    if (hour >= 20.5 || hour < 4.5) return 1;
    if (hour >= 18.5) return (hour - 18.5) / 2;
    if (hour < 6.5) return 1 - (hour - 4.5) / 2;
    return 0;
  }

  // Sky canvases are cached per 10 in-game minutes.
  let skyKey = -1, skyCanvas = null;
  function sky(hour) {
    const key = Math.floor(hour * 6);
    if (key === skyKey) return skyCanvas;
    skyKey = key;
    const [top, mid, bot] = skyColors(key / 6);
    const bands = [];
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      bands.push(t < 0.5 ? U.lerpColor(top, mid, t * 2) : U.lerpColor(mid, bot, (t - 0.5) * 2));
    }
    // drawn at half size and doubled, so the dither uses the chunky 2x2 pixels
    const hw = W / 2, hh = Math.ceil(SKY_H / 2);
    const p = U.pix(hw, hh);
    for (let y = 0; y < hh; y++) {
      const f = (y / (hh - 3)) * (bands.length - 1);
      const i = Math.min(bands.length - 1, Math.floor(f)), fr = f - i;
      for (let x = 0; x < hw; x++) {
        const c = fr * 16 <= U.BAYER[y % 4][x % 4] || i + 1 >= bands.length ? bands[i] : bands[i + 1];
        p.put(x, y, c);
      }
    }
    skyCanvas = U.dbl(p.done());
    return skyCanvas;
  }

  const stars = (() => {
    const r = U.rng(42), s = [];
    for (let i = 0; i < 70; i++) s.push([U.snap(r() * W), U.snap(r() * 90), r() < 0.25]);
    return s;
  })();

  const sunImg = (() => {
    const p = U.pix(24, 24);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 11.5) * 2;
      if (d < 11) p.put(x, y, d < 8 ? [255, 240, 186] : [255, 218, 146]);
      else if (d < 20 && U.BAYER[y % 4][x % 4] < (20 - d) * 1.6) p.put(x, y, [255, 214, 150]);
    }
    return U.dbl(p.done());
  })();
  const moonImg = (() => {
    const p = U.pix(8, 8);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const d = Math.hypot(x - 3.5, y - 3.5);
      if (d < 3.6) p.put(x, y, Math.hypot(x - 4.5, y - 2.5) < 1 || Math.hypot(x - 2.5, y - 4.5) < 0.8 ? [196, 196, 186] : [236, 234, 220]);
    }
    return U.dbl(p.done());
  })();

  const CLOUDS = [[30, 40, 70], [150, 28, 90], [250, 58, 55], [90, 66, 40], [400, 46, 80], [520, 34, 60]];

  function drawSky(ctx, hour, camX) {
    ctx.drawImage(sky(hour), 0, 0);
    const n = night(hour);
    if (n > 0) {
      for (const [x, y, big] of stars) {
        ctx.fillStyle = U.rgb(big ? [230, 214, 240] : [160, 140, 190], n * (0.6 + 0.4 * Math.sin(hour * 40 + x)));
        ctx.fillRect(x, y, 2, 2);
      }
    }
    // sun: rises 6:00 on the left (east), sets 19:00 on the right (west)
    if (hour > 5.5 && hour < 19.6) {
      const t = (hour - 5.5) / 14.1;
      ctx.drawImage(sunImg, U.snap(U.lerp(10, 286, t) - 24), U.snap(124 - Math.sin(t * Math.PI) * 100 - 24));
    }
    const mh = hour >= 19 ? hour - 19 : hour + 5;
    if (mh < 11) {
      const t = mh / 11;
      ctx.drawImage(moonImg, U.snap(U.lerp(20, 290, t) - 8), U.snap(118 - Math.sin(t * Math.PI) * 92 - 8));
    }
    // streaky clouds, tinted from the sky colours
    const [, mid, bot] = skyColors(hour);
    const cc = U.lerpColor(mid, bot, 0.5), ch = U.lerpColor(bot, [255, 255, 255], 0.25), cs = U.shade(mid, 0.85);
    for (const [cx, cy, len] of CLOUDS) {
      const x0 = U.snap(((Math.round(cx - camX * 0.04 + hour * 6) % 640) + 640) % 640 - 160);
      for (let k = 0; k < 3; k++) {
        const l = U.snap(len - k * 14), x = x0 + k * 6, y = cy + k * 4;
        ctx.fillStyle = U.rgb(cc); ctx.fillRect(x, y, l, 2);
        ctx.fillStyle = U.rgb(ch); ctx.fillRect(x, y - 2, U.snap(l * 0.7), 2);
        ctx.fillStyle = U.rgb(cs); ctx.fillRect(x + 4, y + 2, U.snap(l * 0.5), 2);
      }
    }
  }

  // --------------------------------------------------------------- layers
  // Each biome has tileable 640px-wide layers drawn with parallax.
  // Mesas, buttes and spires: a sheer cliff with rock layers sitting on a
  // rubble slope (talus), the classic Monument Valley shape.
  // f = [x, width, top, kind] where kind is 'mesa' | 'butte' | 'spire'
  function formations(seed, list, pal, opts = {}) {
    const r = U.rng(seed);
    const p = U.pix(640, SKY_H, true);
    const base = opts.base || 126;
    for (const [fx, fw, top, kind] of list) {
      const cliffH = (base - top) * (kind === 'spire' ? 0.82 : kind === 'butte' ? 0.7 : 0.62);
      const cliffBot = Math.round(top + cliffH);
      const talusW = (base - cliffBot) * (kind === 'spire' ? 0.6 : 1.25);
      // jagged cliff edges per row (stays near-vertical)
      let jl = 0, jr = 0;
      for (let y = top; y < base; y++) {
        jl = U.clamp(jl + (r() < 0.3 ? (r() < 0.5 ? -1 : 1) : 0), -1, 1);
        jr = U.clamp(jr + (r() < 0.3 ? (r() < 0.5 ? -1 : 1) : 0), -1, 1);
        let l, rr;
        if (y < cliffBot) { l = fx + jl; rr = fx + fw + jr; }
        else {
          const t = (y - cliffBot) / (base - cliffBot);
          const spread = talusW * Math.pow(t, 0.8);
          l = Math.round(fx - spread + jl); rr = Math.round(fx + fw + spread + jr);
        }
        for (let x = l; x < rr; x++) {
          let c;
          if (y < cliffBot) {
            // caprock + strata bands on the cliff face
            const d = y - top;
            if (d < 3) c = pal.cap;
            else c = pal.bands[Math.floor((d - 3) / (opts.band || 5)) % pal.bands.length];
            const rel = (x - l) / Math.max(1, rr - l);
            if (rel < 0.28) c = U.shade(c, 0.7);                   // shadow side
            else if (rel > 0.9) c = U.shade(c, 1.12);              // sunlit edge
            if (x !== l && (x * 13 + fx) % 11 === 0 && d > 4) c = U.shade(c, 0.8); // vertical grooves
          } else {
            const rel = (x - l) / Math.max(1, rr - l);
            c = pal.talus;
            if (rel < 0.3) c = U.shade(c, 0.8);
            if (r() < 0.12) c = U.shade(c, r() < 0.5 ? 0.86 : 1.1);
            if (y === cliffBot) c = U.shade(pal.talus, 0.7);       // shadow under the cliff
          }
          p.put(x, y, c);
        }
        // overhanging caprock lip
        if (y === top || y === top + 1) { p.put(l - 1, y, U.shade(pal.cap, 0.8)); p.put(rr, y, pal.cap); }
      }
      // fallen boulders on the slope
      for (let i = 0; i < fw / 8; i++) {
        const bx = fx - talusW * 0.6 + r() * (fw + talusW * 1.2), by = cliffBot + 3 + r() * (base - cliffBot - 4);
        p.put(bx, by, U.shade(pal.talus, 0.65)); p.put(bx + 1, by, U.shade(pal.talus, 1.15));
      }
    }
    return p.done();
  }

  // Badlands: rounded, eroded clay hills striped in cream, grey, red and purple,
  // cut by rain gullies.
  function badlands(seed) {
    const r = U.rng(seed);
    const p = U.pix(640, SKY_H, true);
    const stripes = [[196, 120, 84], [214, 168, 128], [168, 98, 82], [150, 112, 120], [222, 196, 150], [180, 104, 74]];
    const humps = [];
    for (let x = 0; x < 640; x += 30 + r() * 50) humps.push([x, 12 + r() * 14, 22 + r() * 30]);
    const height = x => {
      let h = 0;
      for (const [hx, hh, hw] of humps) {
        for (const off of [-640, 0, 640]) {
          const d = (x - hx - off) / hw;
          if (Math.abs(d) < 1) h = Math.max(h, hh * Math.cos(d * Math.PI / 2) ** 0.7);
        }
      }
      return h;
    };
    for (let x = 0; x < 640; x++) {
      const h = height(x);
      const top = Math.round(133 - h - 4);
      const slope = height(x + 1) - height(x - 1);
      for (let y = top; y < SKY_H; y++) {
        const layer = Math.floor((133 - y + Math.sin(x / 23) * 1.5) / 3);
        let c = stripes[((layer % stripes.length) + stripes.length) % stripes.length];
        if (slope > 0.35) c = U.shade(c, 1.1); else if (slope < -0.35) c = U.shade(c, 0.78);
        if ((x * 7) % 13 === 0 && y > top + 2) c = U.shade(c, 0.82);        // gullies
        if (y === top) c = U.shade(c, 1.15);
        p.put(x, y, c);
      }
      if (r() < 0.035) { const bc = [104, 112, 60]; p.put(x, top - 1, bc); p.put(x + 1, top - 1, bc); p.put(x, top - 2, U.shade(bc, 1.25)); }
    }
    return p.done();
  }

  function ground(seed, sand, rut) {
    const r = U.rng(seed);
    const top = 132, gh = H - top;
    const p = U.pix(320, gh, true);
    for (let y = 0; y < gh; y++) for (let x = 0; x < 320; x++) {
      let c = sand[Math.min(3, Math.floor((y / gh) * 4))];
      const n = r();
      if (n < 0.06) c = U.shade(c, 0.9); else if (n < 0.09) c = U.shade(c, 1.07);
      p.put(x, y, c);
    }
    for (let x = 0; x < 320; x++) p.put(x, 0, U.shade(sand[0], 1.08));
    for (let x = 0; x < 320; x++) for (const yy of [21, 33]) { p.put(x, yy, rut); if (r() < 0.5) p.put(x, yy + 1, U.shade(rut, 1.06)); }
    for (let i = 0; i < 70; i++) { const x = r() * 320, y = 3 + r() * (gh - 4); p.put(x, y, U.shade(sand[2], 0.7)); if (r() < 0.5) p.put(x + 1, y, U.shade(sand[0], 1.1)); }
    for (let i = 0; i < 10; i++) {
      let x = Math.floor(r() * 320), y = 6 + Math.floor(r() * (gh - 8));
      for (let k = 0; k < 4 + r() * 4; k++) { p.put(x, y, U.shade(sand[2], 0.82)); x++; y += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0; }
    }
    return p.done();
  }

  // Canyon: a sheer wall of layered red rock rising nearly to the top of the
  // screen, with ledges, grooves, alcoves and dark "desert varnish" streaks.
  // The jagged top edge uses waves that repeat every 640px so the layer tiles.
  function canyonWall(seed, pal, topMin, topMax, base, opts = {}) {
    const r = U.rng(seed);
    const p = U.pix(640, SKY_H, true);
    const waves = [[2, r() * 6], [3, r() * 6], [5, r() * 6], [9, r() * 6], [16, r() * 6]];
    const topAt = x => {
      let v = 0;
      waves.forEach(([k, ph], i) => { v += Math.sin(x / 640 * Math.PI * 2 * k + ph) / (i + 1.4); });
      return Math.round(topMin + (topMax - topMin) * (0.5 + v * 0.42));
    };
    const streaks = new Set();
    for (let i = 0; i < 14; i++) { const sx = Math.floor(r() * 640); streaks.add(sx); streaks.add(sx + 1); }
    const alcoves = [];
    for (let i = 0; i < (opts.alcoves || 0); i++) alcoves.push([r() * 640, topMax + 10 + r() * (base - topMax - 30), 6 + r() * 10, 3 + r() * 4]);
    for (let x = 0; x < 640; x++) {
      const top = topAt(x), slope = topAt(x + 2) - topAt(x - 2);
      const grooveT = 0.5 + 0.5 * Math.sin(x * 0.19 + Math.sin(x * 0.05) * 4);
      // broad light and shadow across the wall, so it reads as buttresses and bays
      const lightT = Math.sin(x / 640 * Math.PI * 2 * 7 + seed) * 0.5 + Math.sin(x / 640 * Math.PI * 2 * 3) * 0.5;
      for (let y = top; y < base; y++) {
        const d = y - top;
        const band = Math.floor((y + Math.sin(x / 41) * 2) / (opts.band || 6));
        let c = pal.bands[((band % pal.bands.length) + pal.bands.length) % pal.bands.length];
        if (d < 2) c = pal.cap;
        if (grooveT > 0.97) c = U.shade(c, 0.82);                // the odd vertical crack
        c = U.shade(c, 1 + lightT * 0.12);
        if ((y % (opts.ledge || 19)) === 0) c = U.shade(c, 1.18);  // ledge lip
        else if ((y % (opts.ledge || 19)) === 1) c = U.shade(c, 0.7);
        if (streaks.has(x) && d < 30 + (x % 24)) c = U.shade(c, 0.8);
        if (slope > 3 && d < 6) c = U.shade(c, 0.85);
        if (r() < 0.05) c = U.shade(c, r() < 0.5 ? 0.9 : 1.08);
        p.put(x, y, c);
      }
    }
    for (const [ax, ay, aw, ah] of alcoves) for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
      if (((x - aw / 2) / (aw / 2)) ** 2 + ((y - ah) / ah) ** 2 > 1) continue;
      p.put(ax + x, ay + y, y === 0 ? U.shade(pal.bands[0], 0.5) : U.shade(pal.bands[0], 0.38));
    }
    return p.done();
  }
  // Fallen rock piled at the foot of the wall.
  function talus(seed, col) {
    const r = U.rng(seed);
    const p = U.pix(640, SKY_H, true);
    for (let x = 0; x < 640; x++) {
      const h = 8 + Math.round(5 * Math.sin(x / 640 * Math.PI * 6) + 3 * Math.sin(x / 640 * Math.PI * 22));
      for (let y = 133 - h; y < SKY_H; y++) {
        let c = col;
        if (r() < 0.25) c = U.shade(col, r() < 0.5 ? 0.82 : 1.12);
        if (y === 133 - h) c = U.shade(col, 1.15);
        p.put(x, y, c);
      }
    }
    for (let i = 0; i < 40; i++) {
      const bx = r() * 640, bw = 4 + r() * 8, bh = 3 + r() * 5, by = 132 - bh - r() * 6;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        if (((x - bw / 2) / (bw / 2)) ** 2 + ((y - bh) / bh) ** 2 > 1) continue;
        p.put(bx + x, by + y, y < 2 ? U.shade(col, 1.2) : x > bw * 0.6 ? U.shade(col, 0.75) : col);
      }
    }
    return p.done();
  }
  // Dark crags overhanging the top of the screen: the narrow strip of sky.
  function rim(seed, col, deep = 8, spread = 9) {
    const r = U.rng(seed);
    const p = U.pix(640, 70, true);
    const waves = [[3, r() * 6], [7, r() * 6], [13, r() * 6], [29, r() * 6]];
    for (let x = 0; x < 640; x++) {
      let v = 0;
      waves.forEach(([k, ph], i) => { v += Math.sin(x / 640 * Math.PI * 2 * k + ph) / (i + 1); });
      const depth = Math.max(0, Math.round(deep + v * spread));
      for (let y = 0; y < depth; y++) p.put(x, y, y === depth - 1 ? U.shade(col, 1.25) : (x * 7 + y * 3) % 11 === 0 ? U.shade(col, 0.85) : col);
    }
    return p.done();
  }
  // Dry riverbed: pale sand, cracked mud flats and river pebbles.
  function riverbed(seed, opts = {}) {
    const r = U.rng(seed);
    const top = 132, gh = H - top;
    const sand = opts.shade ? [[170, 126, 96], [178, 134, 100], [186, 142, 104], [180, 136, 98]] : [[214, 170, 122], [206, 160, 114], [198, 150, 106], [188, 140, 98]];
    const p = U.pix(320, gh, true);
    for (let y = 0; y < gh; y++) for (let x = 0; x < 320; x++) {
      let c = sand[Math.min(3, Math.floor((y / gh) * 4))];
      const n = r();
      if (n < 0.06) c = U.shade(c, 0.9); else if (n < 0.09) c = U.shade(c, 1.07);
      p.put(x, y, c);
    }
    for (let x = 0; x < 320; x++) p.put(x, 0, U.shade(sand[0], 1.08));
    // cracked mud patches
    for (let i = 0; i < 5; i++) {
      const cx = r() * 320, cy = 14 + r() * (gh - 20), rw = 18 + r() * 26, rh = 4 + r() * 4;
      for (let y = -rh; y <= rh; y++) for (let x = -rw; x <= rw; x++) {
        if ((x / rw) ** 2 + (y / rh) ** 2 > 1) continue;
        const crack = (Math.floor((x + 400) / 7) + Math.floor((y + 40) / 4)) % 3 === 0 && ((x + 400) % 7 === 0 || (y + 40) % 4 === 0);
        p.put(cx + x, cy + y, crack ? [140, 100, 70] : [176, 128, 90]);
      }
    }
    // hoof and boot tracks along the trail
    for (let x = 4; x < 320; x += 9) { const y = 22 + ((x * 7) % 5); p.put(x, y, U.shade(sand[1], 0.8)); p.put(x + 1, y, U.shade(sand[1], 0.8)); p.put(x + 4, y + 3, U.shade(sand[1], 0.84)); }
    // cracks
    for (let i = 0; i < 8; i++) {
      let x = r() * 320, y = 4 + r() * (gh - 6);
      for (let k = 0; k < 10; k++) { p.put(x, y, U.shade(sand[2], 0.7)); x += 1; y += r() < 0.4 ? 1 : r() < 0.3 ? -1 : 0; }
    }
    // dry brush tufts and bleached bone bits
    for (let i = 0; i < 9; i++) { const x = r() * 320, y = 2 + r() * 6; for (let k = -2; k <= 2; k++) p.put(x + k, y - Math.abs(k) % 2, [130, 112, 70]); p.put(x, y - 2, [156, 136, 84]); }
    for (let i = 0; i < 4; i++) { const x = r() * 320, y = 10 + r() * (gh - 14); p.put(x, y, [226, 218, 196]); p.put(x + 1, y, [226, 218, 196]); p.put(x + 2, y + 1, [200, 190, 170]); }
    // river pebbles
    for (let i = 0; i < 90; i++) {
      const x = r() * 320, y = 3 + r() * (gh - 4), c = U.pick(r, [[150, 140, 132], [176, 120, 90], [120, 110, 104], [200, 186, 170]]);
      p.put(x, y, c); p.put(x + 1, y, U.shade(c, 0.8));
    }
    return p.done();
  }

  const BIOMES = {
    // very tight: walls close on both sides, only a sliver of sky, an
    // overhang hanging over the top and the floor in shadow
    canyon: {
      far: () => canyonWall(21, { cap: [140, 74, 64], bands: [[132, 64, 56], [124, 58, 52], [142, 72, 62], [130, 62, 54]] }, 12, 22, 126, { band: 10, ledge: 31 }),
      mid: () => canyonWall(23, { cap: [120, 52, 38], bands: [[178, 74, 48], [168, 68, 44], [186, 84, 54], [172, 70, 46], [196, 102, 70], [164, 64, 42]] }, 14, 30, 130, { band: 9, ledge: 29, alcoves: 9 }),
      hills: () => talus(25, [150, 86, 62]),
      ground: () => riverbed(27, { shade: true }),
      rim: () => rim(29, [70, 30, 28], 9, 12),
    },
    desert: {
      // distant plateaus, hazy with distance
      far: () => formations(3, [[20, 110, 84, 'mesa'], [170, 70, 92, 'mesa'], [262, 18, 80, 'butte'], [330, 140, 88, 'mesa'], [520, 90, 82, 'mesa']],
        { cap: [150, 104, 128], bands: [[132, 92, 122], [124, 86, 116], [138, 98, 126]], talus: [140, 100, 120] }, { base: 120, band: 6 }),
      // big red mesas, buttes and spires
      mid: () => formations(1, [[30, 96, 56, 'mesa'], [176, 34, 46, 'butte'], [232, 8, 64, 'spire'], [248, 6, 74, 'spire'], [330, 120, 64, 'mesa'], [520, 30, 50, 'butte'], [574, 7, 70, 'spire']],
        { cap: [120, 66, 50], bands: [[186, 84, 56], [168, 72, 50], [200, 100, 66], [176, 80, 54], [222, 150, 104]], talus: [196, 118, 78] }, { base: 128, band: 5 }),
      hills: () => badlands(7),
      ground: () => ground(11, [[222, 166, 104], [214, 156, 98], [206, 148, 92], [196, 138, 86]], [184, 124, 78]),
    },
  };
  const cache = {};
  function layers(id) {
    if (!cache[id]) {
      const b = BIOMES[id];
      cache[id] = { far: U.chunky(b.far()), mid: U.chunky(b.mid()), hills: U.chunky(b.hills()), ground: U.chunky(b.ground()), rim: b.rim ? U.chunky(b.rim()) : null };
    }
    return cache[id];
  }

  function tile(ctx, img, offset, y) {
    const w = img.width;
    let x = -(((U.snap(offset) % w) + w) % w);
    for (; x < W; x += w) ctx.drawImage(img, x, y);
  }

  // Near walls in front of the player (canyon only): dark rock hanging over
  // the top edge and a rubble lip along the bottom.
  const fronts = {};
  function frontLayer(id) {
    if (id !== 'canyon') return null;
    if (!fronts[id]) {
      const r = U.rng(31), p = U.pix(320, 90, true), q = U.pix(320, 12, true);
      for (let x = 0; x < 320; x++) {
        const d = Math.max(0, Math.round(5 + Math.sin(x / 320 * Math.PI * 2 * 3) * 6 + Math.sin(x / 320 * Math.PI * 2 * 11 + 1) * 3));
        for (let y = 0; y < d; y++) p.put(x, y, y === d - 1 ? [64, 30, 26] : [36, 18, 18]);
        if (x % 53 < 4 && x % 53 > 0) for (let y = d; y < d + 6 + (x % 7); y++) p.put(x, y, [36, 18, 18]);   // hanging points
        const b = Math.max(0, Math.round(4 + Math.sin(x / 320 * Math.PI * 2 * 5) * 3 + (r() < 0.2 ? 1 : 0)));
        for (let y = 12 - b; y < 12; y++) q.put(x, y, y === 12 - b ? [70, 36, 30] : [40, 20, 18]);
      }
      fronts[id] = { top: U.chunky(p.done()), bottom: U.chunky(q.done()) };
    }
    return fronts[id];
  }
  function drawFront(ctx, id, camX) {
    const f = frontLayer(id);
    if (!f) return;
    tile(ctx, f.top, camX * 1.25, 0);
    tile(ctx, f.bottom, camX * 1.25, H - 12);
  }

  function drawLayers(ctx, id, camX) {
    const L = layers(id);
    tile(ctx, L.far, camX * 0.1, 0);
    tile(ctx, L.mid, camX * 0.22, 0);
    if (L.rim) tile(ctx, L.rim, camX * 0.6, 0);
    tile(ctx, L.hills, camX * 0.45, 0);
    tile(ctx, L.ground, camX, 132);
  }

  return { drawSky, drawLayers, drawFront, light, night, skyColors };
})();
