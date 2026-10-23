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
    const p = U.pix(W, SKY_H);
    for (let y = 0; y < SKY_H; y++) {
      const f = (y / (SKY_H - 6)) * (bands.length - 1);
      const i = Math.min(bands.length - 1, Math.floor(f)), fr = f - i;
      for (let x = 0; x < W; x++) {
        const c = fr * 16 <= U.BAYER[y % 4][x % 4] || i + 1 >= bands.length ? bands[i] : bands[i + 1];
        p.put(x, y, c);
      }
    }
    skyCanvas = p.done();
    return skyCanvas;
  }

  const stars = (() => {
    const r = U.rng(42), s = [];
    for (let i = 0; i < 70; i++) s.push([Math.floor(r() * W), Math.floor(r() * 90), r() < 0.25]);
    return s;
  })();

  const sunImg = (() => {
    const p = U.pix(48, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot(x - 24, y - 24);
      if (d < 11) p.put(x, y, d < 9 ? [255, 240, 186] : [255, 218, 146]);
      else if (d < 20 && U.BAYER[y % 4][x % 4] < (20 - d) * 1.6) p.put(x, y, [255, 214, 150]);
    }
    return p.done();
  })();
  const moonImg = (() => {
    const p = U.pix(16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 8, y - 8);
      if (d < 6.5) p.put(x, y, Math.hypot(x - 10, y - 6) < 2 || Math.hypot(x - 6, y - 10) < 1.5 ? [196, 196, 186] : [236, 234, 220]);
    }
    return p.done();
  })();

  const CLOUDS = [[30, 40, 70], [150, 28, 90], [250, 58, 55], [90, 66, 40], [400, 46, 80], [520, 34, 60]];

  function drawSky(ctx, hour, camX) {
    ctx.drawImage(sky(hour), 0, 0);
    const n = night(hour);
    if (n > 0) {
      for (const [x, y, big] of stars) {
        ctx.fillStyle = U.rgb(big ? [230, 214, 240] : [160, 140, 190], n * (0.6 + 0.4 * Math.sin(hour * 40 + x)));
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // sun: rises 6:00 on the left (east), sets 19:00 on the right (west)
    if (hour > 5.5 && hour < 19.6) {
      const t = (hour - 5.5) / 14.1;
      ctx.drawImage(sunImg, Math.round(U.lerp(10, 286, t) - 24), Math.round(124 - Math.sin(t * Math.PI) * 100 - 24));
    }
    const mh = hour >= 19 ? hour - 19 : hour + 5;
    if (mh < 11) {
      const t = mh / 11;
      ctx.drawImage(moonImg, Math.round(U.lerp(20, 290, t) - 8), Math.round(118 - Math.sin(t * Math.PI) * 92 - 8));
    }
    // streaky clouds, tinted from the sky colours
    const [, mid, bot] = skyColors(hour);
    const cc = U.lerpColor(mid, bot, 0.5), ch = U.lerpColor(bot, [255, 255, 255], 0.25), cs = U.shade(mid, 0.85);
    for (const [cx, cy, len] of CLOUDS) {
      const x0 = ((Math.round(cx - camX * 0.04 + hour * 6) % 640) + 640) % 640 - 160;
      for (let k = 0; k < 3; k++) {
        const l = len - k * 14, x = x0 + k * 5, y = cy + k * 2;
        ctx.fillStyle = U.rgb(cc); ctx.fillRect(x, y, l, 1);
        ctx.fillStyle = U.rgb(ch); ctx.fillRect(x, y - 1, Math.round(l * 0.7), 1);
        ctx.fillStyle = U.rgb(cs); ctx.fillRect(x + 4, y + 1, Math.round(l * 0.5), 1);
      }
    }
  }

  // --------------------------------------------------------------- layers
  // Each biome has tileable 640px-wide layers drawn with parallax.
  function farMesas(seed, col) {
    const r = U.rng(seed);
    const p = U.pix(640, SKY_H, true);
    const hs = new Array(640).fill(100);
    let x = 0;
    while (x < 640) {
      const w = 25 + Math.floor(r() * 50), hh = 98 - Math.floor(r() * (r() < 0.6 ? 32 : 10));
      for (let i = 0; i < w; i++) {
        const e = Math.min(i, w - i);
        const xx = (x + i) % 640;
        hs[xx] = Math.min(hs[xx], hh + Math.max(0, 4 - e) * 3);
      }
      x += w + Math.floor(r() * 18) - 4;
    }
    for (let x = 0; x < 640; x++) {
      for (let y = hs[x]; y < SKY_H; y++) {
        let c = col;
        if ((y - hs[x]) % 7 === 3) c = U.shade(col, 0.9);
        if (x % 9 === 0 && y - hs[x] > 3) c = U.shade(col, 0.93);
        if (y === hs[x]) c = U.shade(col, 1.25);
        p.put(x, y, c);
      }
    }
    return p.done();
  }

  function buttes(seed, bands) {
    const r = U.rng(seed);
    const p = U.pix(640, SKY_H, true);
    const list = [[40, 50, 72], [210, 34, 86], [330, 60, 64], [500, 40, 78]];
    for (const [bx, bw, top] of list) {
      const x0 = bx + Math.floor(r() * 20), x1 = x0 + bw;
      for (let y = top; y < SKY_H; y++) {
        const t = y - top;
        const l = x0 - Math.floor(t * 0.35) - (t > 4 ? 2 : 0), rr = x1 + Math.floor(t * 0.25);
        for (let x = l; x < rr; x++) {
          let c = bands[Math.floor(t / 4) % 3];
          if (x < l + (rr - l) * 0.35) c = U.shade(c, 0.72);
          else if (x > rr - 4) c = U.shade(c, 1.18);
          if (r() < 0.05) c = U.shade(c, 0.86);
          p.put(x, y, c);
        }
      }
      for (let x = x0; x < x1; x++) { p.put(x, top, U.shade(bands[0], 1.25)); p.put(x, top + 1, U.shade(bands[0], 1.15)); }
      for (let i = 0; i < bw / 6; i++) {
        const cx = x0 + Math.floor(r() * bw), ln = 6 + Math.floor(r() * 12);
        for (let y = top + 2; y < top + ln; y++) { p.put(cx, y, U.shade(bands[2], 0.8)); if (y < top + ln - 3) p.put(cx + 1, y, U.shade(bands[2], 0.92)); }
      }
    }
    return p.done();
  }

  function hills(seed, col, bush) {
    const r = U.rng(seed);
    const p = U.pix(640, SKY_H, true);
    for (let x = 0; x < 640; x++) {
      const h = 120 + Math.round(4 * Math.sin((x / 640) * Math.PI * 2 * 6) + 3 * Math.sin((x / 640) * Math.PI * 2 * 15 + 1));
      for (let y = h; y < SKY_H; y++) p.put(x, y, y === h ? U.shade(col, 1.18) : (x + y) % 5 ? col : U.shade(col, 0.9));
      if (r() < 0.08) { p.put(x - 1, h - 1, bush); p.put(x, h - 1, bush); p.put(x + 1, h - 1, bush); p.put(x, h - 2, U.shade(bush, 1.2)); }
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

  const BIOMES = {
    desert: {
      far: () => farMesas(3, [108, 58, 96]),
      mid: () => buttes(1, [[170, 72, 52], [186, 86, 58], [156, 64, 50]]),
      hills: () => hills(7, [176, 98, 62], [96, 104, 52]),
      ground: () => ground(11, [[222, 166, 104], [214, 156, 98], [206, 148, 92], [196, 138, 86]], [184, 124, 78]),
    },
  };
  const cache = {};
  function layers(id) {
    if (!cache[id]) {
      const b = BIOMES[id];
      cache[id] = { far: b.far(), mid: b.mid(), hills: b.hills(), ground: b.ground() };
    }
    return cache[id];
  }

  function tile(ctx, img, offset, y) {
    const w = img.width;
    let x = -(((Math.round(offset) % w) + w) % w);
    for (; x < W; x += w) ctx.drawImage(img, x, y);
  }

  function drawLayers(ctx, id, camX) {
    const L = layers(id);
    tile(ctx, L.far, camX * 0.1, 0);
    tile(ctx, L.mid, camX * 0.22, 0);
    tile(ctx, L.hills, camX * 0.45, 0);
    tile(ctx, L.ground, camX, 132);
  }

  return { drawSky, drawLayers, light, night, skyColors };
})();
