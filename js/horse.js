// Horses: art (legs are drawn per frame so they can walk and gallop), types,
// and the horse that follows / carries the sheriff.
const Horses = (() => {
  // The horse is built from simple shapes (rump, barrel, chest, neck, head)
  // and shaded per column so it reads as round.
  const CW = 62, H = 47;   // canvas size
  const ANCHOR = 30;       // body centre column
  const SEAT = 14;         // saddle row
  const GROUNDY = H - 2;   // hoof line inside the canvas

  function capsule(px, py, ax, ay, bx, by, ra, rb) {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = ((px - ax) * dx + (py - ay) * dy) / L;
    t = U.clamp(t, 0, 1);
    const cx = ax + dx * t, cy = ay + dy * t, r = ra + (rb - ra) * t;
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  }
  function inBody(x, y) {
    return ((x - 28) / 17) ** 2 + ((y - 23) / 8.5) ** 2 <= 1 ||   // barrel
      (x - 14) ** 2 + (y - 21) ** 2 <= 85 ||                       // rump
      (x - 41) ** 2 + (y - 22) ** 2 <= 70 ||                       // chest
      capsule(x, y, 41, 20, 50, 8, 6.5, 4) ||                      // neck
      capsule(x, y, 50, 7, 57, 15, 4, 2.6) ||                      // head
      capsule(x, y, 49, 4, 49, 1, 1.4, 1) || capsule(x, y, 52, 4, 52, 1, 1.4, 1); // ears
  }

  const TYPES = {
    mule: { name: 'Mule', price: 18, speed: 0.8, desc: 'Slow but steady. Cheap.',
      pal: { B: [150, 132, 112], b: [112, 98, 82], M: [70, 60, 52], n: [222, 212, 192], W: [150, 132, 112] }, socks: [] },
    bay: { name: 'Bay Horse', price: 40, speed: 1.05, desc: 'A good all-round horse.',
      pal: { B: [152, 92, 52], b: [112, 64, 36], M: [40, 28, 24], n: [70, 46, 34], W: [236, 230, 220] }, socks: [2, 3] },
    stallion: { name: 'Black Stallion', price: 85, speed: 1.35, desc: 'Fastest in the territory.',
      pal: { B: [56, 50, 56], b: [36, 32, 38], M: [20, 18, 22], n: [226, 224, 218], W: [236, 234, 228] }, socks: [0, 1, 2, 3] },
  };
  const TACK = { S: [92, 56, 32], s: [64, 38, 22], R: [170, 52, 44], E: [16, 12, 12], h: [52, 48, 50] };

  // Legs: [hip x, hip y, phase offset, far?]
  const LEGS = [[17, 28, 0, true], [43, 28, Math.PI, true], [13, 28, Math.PI, false], [39, 28, 0, false]];

  function frame(type, phase, amp, saddle) {
    const t = TYPES[type];
    const pal = Object.assign({}, TACK, t.pal);
    const p = U.pix(CW, H);
    const far = U.shade(pal.B, 0.7);
    const hoof = [52, 46, 48];
    function leg(hx, hy, ph, isFar, i) {
      const swing = Math.sin(ph) * amp;
      const lift = Math.max(0, Math.cos(ph)) * amp * 1.5;
      const back = i % 2 === 0 ? 1 : -1;
      const col = isFar ? far : pal.B;
      let x = hx, y = hy;
      const len = GROUNDY - hy;
      for (let k = 0; k < len; k++) {
        const a = k < len * 0.45 ? swing : swing + lift * back;
        x += Math.sin(a); y += Math.cos(a);
        const w = k < len * 0.4 ? 5 : 3;
        const sock = t.socks.includes(i) && k >= len - 6 && k < len - 2;
        for (let j = 0; j < w; j++) {
          let c = k >= len - 2 ? hoof : sock ? pal.W : col;
          if (j === w - 1 && !sock && k < len - 2) c = U.shade(c, 0.8);
          p.put(x + j - Math.floor(w / 2), y, c);
        }
      }
    }
    // far legs behind the body
    LEGS.forEach(([hx, hy, off, isFar], i) => { if (isFar) leg(hx, hy, phase + off, true, i); });
    // tail
    for (let k = 0; k < 18; k++) {
      const x = 5 - Math.sin(k / 18 * 2.2) * 3 + Math.sin(phase + k * 0.3) * amp * 2, y = 18 + k;
      for (let j = 0; j < (k < 4 ? 4 : 3); j++) p.put(x + j, y, k % 3 === 0 ? U.shade(pal.M, 1.3) : pal.M);
    }
    // body with column shading
    for (let x = 0; x < CW; x++) {
      let top = -1, bot = -1;
      for (let y = 0; y < H; y++) if (inBody(x, y)) { if (top < 0) top = y; bot = y; }
      if (top < 0) continue;
      for (let y = top; y <= bot; y++) {
        if (!inBody(x, y)) continue;
        let c = pal.B;
        if (y - top < 2) c = U.shade(pal.B, 1.18);
        else if (bot - y < 3) c = pal.b;
        p.put(x, y, c);
      }
    }
    // mane along the neck
    for (let k = 0; k <= 12; k++) {
      const x = 39 + k * 0.85, y = 15 - k;
      for (let j = 0; j < 3; j++) p.put(x - j, y - 1 + (j > 1 ? 1 : 0), j === 0 ? U.shade(pal.M, 1.3) : pal.M);
    }
    p.put(48, 2, pal.M); p.put(47, 3, pal.M);
    // face details
    p.put(52, 8, pal.E || TACK.E); p.put(53, 8, pal.E || TACK.E);
    for (const [x, y] of [[55, 14], [56, 14], [56, 15], [57, 15], [55, 15]]) p.put(x, y, pal.n);
    p.put(57, 14, U.shade(pal.n, 0.6));
    if (type === 'stallion') for (let k = 0; k < 6; k++) p.put(52 + k * 0.8, 7 + k, pal.W);
    // saddle, blanket, girth and stirrup
    if (saddle) {
      for (let x = 20; x < 33; x++) for (let y = 15; y < 19; y++) p.put(x, y, y === 15 ? U.shade(TACK.R, 1.2) : TACK.R);
      for (let x = 21; x < 32; x++) { p.put(x, 14, TACK.S); p.put(x, 15, TACK.S); }
      for (let y = 11; y < 14; y++) { p.put(21, y, TACK.s); p.put(22, y, TACK.S); }   // cantle
      for (let y = 12; y < 14; y++) { p.put(31, y, TACK.S); p.put(30, y, TACK.s); }   // horn
      for (let y = 19; y < 30; y++) p.put(27, y, TACK.s);                             // girth
      for (let x = 25; x < 30; x++) p.put(x, 29, [150, 150, 160]);
    }
    // near legs in front
    LEGS.forEach(([hx, hy, off, isFar], i) => { if (!isFar) leg(hx, hy, phase + off, false, i); });
    Props.outline(p, [30, 20, 16]);
    return p.done();
  }

  const cache = {};
  function frames(type, saddle = true) {
    const key = type + saddle;
    if (!cache[key]) {
      const walk = [], gallop = [];
      for (let i = 0; i < 8; i++) {
        walk.push(frame(type, (i / 8) * Math.PI * 2, 0.32, saddle));
        gallop.push(frame(type, (i / 8) * Math.PI * 2, 0.62, saddle));
      }
      cache[key] = { stand: frame(type, 0, 0, saddle), walk, gallop };
    }
    return cache[key];
  }

  function drawImg(ctx, img, x, top, face, anchor) {
    x = Math.round(x); top = Math.round(top);
    if (face >= 0) ctx.drawImage(img, x - anchor, top);
    else { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(img, -anchor, top); ctx.restore(); }
  }

  // Draw a horse (and its rider, if any) with feet on the ground line.
  function draw(ctx, h, x, rider, base = GROUND) {
    const f = frames(h.type, h.saddle !== false);
    const speed = Math.abs(h.vx || 0);
    let img = f.stand, bob = 0;
    if (speed > 95) { img = f.gallop[Math.floor(h.animT * 1.4) % 8]; bob = Math.floor(h.animT * 1.4) % 4 < 2 ? 0 : -1; }
    else if (speed > 4) img = f.walk[Math.floor(h.animT) % 8];
    const top = base - GROUNDY + bob;
    drawImg(ctx, img, x, top, h.face, ANCHOR);
    if (rider) {
      const r = Sprites.rider.img;
      drawImg(ctx, r, x - 3 * h.face, top + SEAT - (Sprites.RIDER_HIP + 1), h.face, Sprites.ANCHOR_X);
    }
  }

  return { TYPES, frames, draw, H, CW };
})();
