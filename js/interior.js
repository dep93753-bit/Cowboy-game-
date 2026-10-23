// Inside an abandoned house: one room with furniture to search.
const Interior = (() => {
  const FLOOR = 150;
  const TYPES = ['crate', 'barrel', 'dresser', 'cupboard', 'trunk', 'stove'];

  function build(house) {
    const r = U.rng(house.seed * 104729);
    const p = U.pix(W, H);
    const plank = [[112, 82, 58], [100, 72, 50], [122, 90, 62], [94, 70, 52]];
    // back wall: vertical weathered planks
    for (let x = 0; x < W; x++) {
      const c = plank[Math.floor(x / 6) * 7 % 4];
      for (let y = 14; y < FLOOR; y++) {
        let cc = c;
        if (x % 6 === 0) cc = [60, 42, 30];
        else if (r() < 0.05) cc = U.shade(c, 0.85);
        p.put(x, y, cc);
      }
    }
    // gaps between boards where light leaks
    for (let i = 0; i < 6; i++) {
      const gx = Math.floor(r() * W / 6) * 6, gy = 30 + Math.floor(r() * 70), gl = 6 + Math.floor(r() * 18);
      for (let y = gy; y < gy + gl; y++) p.put(gx, y, [200, 170, 120]);
    }
    // ceiling beam
    for (let y = 0; y < 14; y++) for (let x = 0; x < W; x++) p.put(x, y, y > 10 ? [50, 34, 24] : (x % 40 < 3 ? [40, 28, 20] : [70, 48, 34]));
    // floorboards
    for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
      const row = Math.floor((y - FLOOR) / 5);
      let c = row % 2 ? [128, 94, 64] : [118, 86, 58];
      if ((y - FLOOR) % 5 === 0) c = [76, 54, 38];
      if ((x + row * 23) % 47 === 0) c = [76, 54, 38];
      if (r() < 0.04) c = U.shade(c, 0.88);
      p.put(x, y, c);
    }
    for (let x = 0; x < W; x++) { p.put(x, FLOOR - 1, [60, 40, 28]); p.put(x, FLOOR - 2, [140, 104, 70]); }

    // windows: clear holes so the sky shows through
    const windows = [];
    const nWin = 1 + Math.floor(r() * 2);
    for (let i = 0; i < nWin; i++) {
      const wx = 90 + i * 120 + Math.floor(r() * 30), wy = 46;
      for (let y = wy; y < wy + 30; y++) for (let x = wx; x < wx + 26; x++) {
        const frame = x < wx + 2 || x >= wx + 24 || y < wy + 2 || y >= wy + 28 || x === wx + 13 || y === wy + 15;
        if (frame) p.put(x, y, [70, 48, 32]);
        else p.put(x, y, [0, 0, 0], 0);
      }
      // broken board across one window
      if (r() < 0.6) for (let k = 0; k < 26; k++) { p.put(wx + k, wy + 6 + Math.floor(k * 0.6), [150, 112, 74]); p.put(wx + k, wy + 7 + Math.floor(k * 0.6), [120, 88, 58]); }
      windows.push({ x: wx, y: wy, w: 26, h: 30 });
    }
    // doorway on the left
    for (let y = FLOOR - 40; y < FLOOR; y++) for (let x = 12; x < 36; x++) {
      const frame = x < 14 || x >= 34 || y < FLOOR - 38;
      p.put(x, y, frame ? [70, 48, 32] : [0, 0, 0], frame ? 255 : 0);
    }
    // cobwebs in corners
    for (let i = 0; i < 10; i++) { p.put(W - 1 - i, 14 + i, [210, 210, 200]); p.put(W - 1 - i * 2, 14, [200, 200, 190]); p.put(W - 1, 14 + i * 2, [200, 200, 190]); }
    for (let i = 0; i < 7; i++) p.put(40 + i, 14 + i, [210, 210, 200]);

    const img = p.done();
    const ctx = img.getContext('2d');

    // furniture
    const containers = [];
    const slots = [70, 120, 175, 225, 275];
    const n = 3 + Math.floor(r() * 3);
    const chosen = slots.slice().sort(() => r() - 0.5).slice(0, n).sort((a, b) => a - b);
    chosen.forEach((sx, idx) => {
      const type = U.pick(r, TYPES);
      const art = Props.containers[type];
      containers.push({ type, idx, x: sx, w: art.closed.width, h: art.closed.height, art });
    });
    // decor in the free slots
    const free = slots.filter(s => !chosen.includes(s));
    free.forEach(sx => {
      const d = U.pick(r, ['bed', 'table', 'chair']);
      const im = Props.decor[d];
      ctx.drawImage(im, sx, FLOOR + 2 - im.height);
    });
    const fr = Props.decor.frame;
    ctx.save(); ctx.translate(60 + Math.floor(r() * 180), 34); ctx.rotate(0.08); ctx.drawImage(fr, 0, 0); ctx.restore();

    return { house, img, containers, windows, door: 24 };
  }

  return { build, FLOOR };
})();
