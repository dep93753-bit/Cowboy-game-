// Animals, painted from shaded body parts rather than flat pixel grids:
// each body part is lit along its top and darker underneath, fur and wool
// add ragged rims and texture (fixed to the part, so it doesn't crawl as
// the animal walks), and the legs are jointed so walks and gallops swing
// naturally. Drawn on the half-size grid facing right, outlined in a dark
// shade of each pixel's own colour, then doubled.
// Every set is { stand, walk: [4 frames], ..., anchor }; frames are { img, flash }.
const Fauna = (() => {
  const sh = U.shade, TAU = Math.PI * 2;
  const hash = (x, y) => { let h = (Math.round(x) * 374761393 + Math.round(y) * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h & 1023) / 1024; };

  // A frame canvas W x H art pixels with the origin (0, 0) on the ground under the body.
  function frame(W, H, ox) {
    const p = U.pix(W + 2, H + 2);
    return {
      put(x, y, c) { x = Math.round(x); y = Math.round(y); if (y <= 0) p.put(x + ox + 1, y + H, c); },
      has: (x, y) => p.has(Math.round(x) + ox + 1, Math.round(y) + H),
      done() {
        const add = [];
        for (let y = 0; y < H + 1; y++) for (let x = 0; x < W + 2; x++) {
          if (p.has(x, y)) continue;
          for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (p.has(x + dx, y + dy)) { add.push([x, y, sh(p.get(x + dx, y + dy), 0.38)]); break; }
        }
        for (const [x, y, c] of add) p.put(x, y, c);
        const img = p.done(), fl = U.canvas(img.width, img.height), fx = fl.getContext('2d');
        fx.drawImage(img, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = '#fff'; fx.fillRect(0, 0, fl.width, fl.height);
        return { img: U.dbl(img), flash: U.dbl(fl) };
      },
    };
  }

  // A shaded body part. o.fur: ragged rim and streaks; o.wool: lumpy bright rim;
  // o.patch: [[x, y, r], ...] relative to the centre, painted with o.patchPal.
  function blob(a, cx, cy, rx, ry, pal, o = {}) {
    const rcx = Math.round(cx), rcy = Math.round(cy);
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const lx = x - rcx, ly = y - rcy, u = (x - cx) / rx, v = (y - cy) / ry, d = u * u + v * v;
      const rim = o.fur ? (hash(lx * 3 + 1, ly * 7) - 0.5) * 0.55 : o.wool ? (hash(lx, ly) - 0.5) * 0.4 : 0;
      if (d > 1 + rim) continue;
      let l = -v * 0.95 - u * 0.3 + (o.fur ? (hash(lx, ly * 3 + 5) - 0.5) * 0.5 : 0);
      let k = l > 0.65 ? 4 : l > 0.2 ? 3 : l > -0.35 ? 2 : l > -0.75 ? 1 : 0;
      if (o.fur && hash(lx * 5 + 2, ly) < 0.12) k = Math.max(0, k - 1);
      if (o.wool && (lx + ly * 2) % 3 === 0 && hash(lx, ly + 9) < 0.5) k = Math.min(4, k + 1);
      let p = pal;
      if (o.patch) for (const [px, py, pr] of o.patch) if ((lx - px) ** 2 + (ly - py) ** 2 < pr * pr) p = o.patchPal;
      a.put(x, y, p[k]);
    }
  }
  function seg(a, x0, y0, x1, y1, w, pal) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let k = 0; k < w; k++) a.put(x - w / 2 + k + 0.5, y, pal[w > 1 && k === 0 ? 3 : k === w - 1 && w > 2 ? 1 : 2]);
    }
  }
  // A jointed leg from the hip straight down to the ground; ang swings it
  // (positive = forward) and the knee bends as it swings forward.
  function leg(a, hx, hy, ang, w, pal, hoof, taper = 0) {
    const len = -hy, l1 = len * 0.5, l2 = len * 0.5;
    const kx = hx + Math.sin(ang) * l1, ky = hy + Math.cos(ang) * l1, a2 = ang - Math.max(0, ang) * 1.5;
    const fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
    seg(a, hx, hy, kx, ky, w, pal); seg(a, kx, ky, fx, fy, Math.max(1, w - taper), pal);
    if (hoof) for (let k = 0; k < Math.max(1, w - taper); k++) a.put(fx - Math.max(1, w - taper) / 2 + k + 0.5, Math.min(0, fy), hoof);
  }
  // Four legs. The far pair goes behind the body, in shade; the near pair in front.
  // L.front / L.hind: [hipX, hipY, width, palette, hoof colour, taper]
  function legs(a, q, L, far) {
    for (const [k, off] of far ? [['front', 0.75], ['hind', 0.5]] : [['front', 0.25], ['hind', 0]]) {
      const [hx, hy, w, pal, hoof, taper] = L[k];
      let ang = 0;
      if (q.gait === 'walk') ang = Math.sin((q.ph + off) * TAU) * (L.amp || 0.4);
      else if (q.gait === 'run') ang = (q.ph < 0.5 ? (k === 'front' ? 0.8 : -0.75) : (k === 'front' ? -0.45 : 0.6)) + (far ? 0.2 : 0);
      leg(a, hx + (far ? -1 : 0), hy + q.bob, ang, w, far ? pal.map(c => sh(c, 0.72)) : pal, hoof, taper || 0);
    }
  }
  // a limb drawn over a body of the same colour: a dark edge first so it reads
  function arm(a, pts, w, pal) {
    for (let i = 1; i < pts.length; i++) seg(a, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w + 2, [pal[0], pal[0], pal[0], pal[0]]);
    for (let i = 1; i < pts.length; i++) seg(a, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, pal);
  }
  const eye = (a, x, y, glint) => { a.put(x, y, [14, 10, 10]); if (glint) a.put(x, y - 1, [240, 236, 226]); };

  const P = {
    bisonFront: [[30, 20, 14], [48, 32, 22], [68, 46, 30], [92, 64, 42], [120, 88, 58]],
    bisonBack: [[58, 40, 28], [84, 58, 38], [110, 78, 52], [138, 102, 70], [164, 126, 88]],
    horn: [[90, 84, 74], [150, 142, 128], [200, 194, 180], [226, 220, 208], [240, 236, 226]],
    bear: [[52, 34, 22], [76, 52, 34], [104, 72, 46], [132, 96, 62], [160, 122, 84]],
    blackbear: [[22, 20, 22], [34, 30, 32], [50, 44, 46], [70, 62, 64], [96, 86, 86]],
    muzzle: [[96, 70, 50], [130, 100, 72], [162, 130, 96], [190, 160, 124], [214, 188, 152]],
    deer: [[90, 58, 34], [120, 82, 50], [150, 108, 68], [178, 134, 88], [204, 162, 114]],
    white: [[150, 146, 140], [196, 192, 184], [226, 222, 214], [240, 238, 232], [250, 250, 246]],
    rabbit: [[84, 72, 60], [112, 98, 82], [140, 126, 106], [166, 152, 130], [192, 180, 158]],
    pdog: [[110, 80, 50], [140, 106, 70], [170, 132, 92], [196, 160, 116], [220, 188, 144]],
    dirt: [[96, 74, 52], [124, 98, 70], [150, 122, 88], [176, 148, 110], [198, 172, 134]],
    cowK: [[16, 14, 14], [28, 24, 24], [42, 38, 38], [62, 56, 56], [86, 80, 80]],
    cowB: [[86, 52, 30], [116, 72, 42], [146, 94, 56], [172, 118, 74], [196, 144, 96]],
    pink: [[170, 96, 96], [206, 128, 124], [232, 160, 152], [244, 186, 176], [252, 210, 200]],
    coyote: [[96, 80, 62], [128, 108, 84], [160, 138, 106], [188, 166, 130], [214, 196, 162]],
    coyoteDark: [[50, 42, 36], [70, 60, 50], [92, 80, 66], [116, 102, 86], [140, 126, 108]],
    wool: [[170, 162, 146], [204, 196, 180], [228, 222, 208], [242, 238, 226], [252, 250, 242]],
    face: [[24, 20, 20], [38, 32, 30], [54, 46, 44], [74, 64, 60], [96, 86, 80]],
    goatB: [[80, 54, 34], [108, 74, 46], [136, 96, 60], [162, 120, 80], [188, 148, 104]],
  };
  const HOOF = [36, 28, 24];

  // ------------------------------------------------------------ painters
  // q: { gait: 'stand'|'walk'|'run', ph: 0..1, bob, head: 'up'|'down', ... }
  const PAINT = {
    bison(a, q) {
      const F = P.bisonFront, B = P.bisonBack, b = q.bob, hy = (q.head === 'down' ? -5 : -9) + b;
      const L = { front: [9, -9, 2, F, HOOF], hind: [-9, -10, 2, B, HOOF], amp: 0.35 };
      legs(a, q, L, true);
      seg(a, -15, -15 + b, -17, -10 + b, 1, B); blob(a, -17, -9 + b, 1, 1.6, F, { fur: 1 });
      blob(a, -7, -13 + b, 9, 6, B, { fur: 1 });
      blob(a, 0, -12 + b, 9, 6, B, { fur: 1 });
      blob(a, 6, -16 + b, 9, 8, F, { fur: 1 });            // the hump
      blob(a, 10, -10 + b, 6, 7.5, F, { fur: 1 });          // shaggy chest
      blob(a, 14, hy, 4.5, 4.5, F, { fur: 1 });             // the head, carried low
      blob(a, 15, hy + 4, 2.5, 3, F, { fur: 1 });           // beard
      for (const [x, y, k] of [[13, -4, 3], [14, -5, 2], [15, -5, 1]]) a.put(x, hy + y, P.horn[k]);
      eye(a, 17, hy - 1, true);
      a.put(18, hy + 2, [20, 14, 12]);
      legs(a, q, L, false);
      blob(a, 10, -8 + b, 3, 3, F, { fur: 1 });              // fur over the near front leg
    },
    bear(a, q) {
      const C = q.pal, M = P.muzzle, b = q.bob, fur = { fur: 1 };
      const jaw = (hx, hy) => {                                  // the mouth open in a roar
        blob(a, hx + 4, hy + 3.6, 2.4, 1.1, M);
        for (let k = 0; k < 3; k++) a.put(hx + 4.5 + k, hy + 2.6, [130, 28, 28]);
        a.put(hx + 6.5, hy + 2, P.white[3]); a.put(hx + 6, hy + 3.4, P.white[3]); a.put(hx + 4.5, hy + 2, P.white[2]);
      };
      const head = (hx, hy, open) => {
        blob(a, hx - 2, hy + 0.6, 3.4, 3.8, C, fur);              // the ruff behind the jaw
        blob(a, hx, hy, 4.6, 4, C, fur);
        blob(a, hx + 4.4, hy + 1.1, 3, 2.1, M);                   // long muzzle
        a.put(hx + 7.4, hy + 0.4, [16, 10, 10]); a.put(hx + 7.4, hy + 1.2, [16, 10, 10]); a.put(hx + 6.8, hy - 0.2, [16, 10, 10]);
        for (const ex of [-2.2, 0.6]) { blob(a, hx + ex, hy - 4, 1.5, 1.5, C, fur); a.put(hx + ex, hy - 4, C[0]); }
        eye(a, hx + 2.2, hy - 1.2, true);
        if (open) jaw(hx, hy);
      };
      const claws = (x, y) => { for (let k = 0; k < 3; k++) a.put(x + k, y, P.white[1]); };
      // crouch: front end dropped, head low, growling before it charges;
      // lunge: stretched out mid-leap, head thrust forward, jaws open
      const lunge = q.pose === 'lunge', crouch = q.pose === 'crouch', roll = q.gait === 'walk' ? Math.round(Math.sin(q.ph * TAU)) : 0;
      const fb = crouch ? 2 : 0;
      const L = { front: [8, -10 + fb, 3, C, C[0]], hind: [-9, -11, 3, C, C[0]], amp: 0.32 };
      legs(a, q, L, true);
      blob(a, -15.5, -14.5 + b, 1.4, 1.4, C, fur);               // stub tail
      blob(a, -9, -13 + b - roll * 0.5, 7, 6.5, C, fur);          // rump
      blob(a, -1, -12.5 + b + fb * 0.5, 10, 6.5, C, fur);         // barrel
      blob(a, 0, -7 + b + fb * 0.5, 8, 1.6, C.map(c => sh(c, 0.82)), fur);   // shaggy fringe under the belly
      blob(a, 5, -16 + b + roll * 0.5 + fb, 7.5, 6, C, fur);      // shoulder hump
      if (q.tips) for (let x = -2; x < 12; x++) if (hash(x, 3) < 0.55) a.put(x, -21.5 + b + roll * 0.5 + fb + Math.abs(x - 5) * 0.28 + (hash(x, 7) < 0.4 ? 1 : 0), q.tips);   // silver-tipped fur
      head(lunge ? 16 : 13, (lunge ? -11 : crouch ? -7.5 : -11.5) + b, lunge || crouch);
      legs(a, q, L, false);
      if (!lunge) { claws(8, 0); claws(-10, 0); }
    },
    deer(a, q) {
      const D = P.deer, b = q.bob, down = q.head === 'down';
      const L = { front: [6, -11, 1, D, [40, 30, 26]], hind: [-6, -12, 1, D, [40, 30, 26]], amp: 0.45 };
      legs(a, q, L, true);
      blob(a, -1, -14 + b, 7.5, 3.8, D);
      blob(a, -6, -15 + b, 3.6, 3.8, D);
      blob(a, 5, -14 + b, 3.6, 4, D);
      blob(a, 0, -11 + b, 5, 0.7, P.white);                    // pale belly
      blob(a, -9.5, -17 + b, 1.2, 1.8, P.white);               // white tail
      const hx = down ? 11 : 10, hy = down ? -7 : -23;
      seg(a, 6, -16 + b, hx - 1, hy + 1 + b, 3, D);            // neck
      blob(a, hx, hy + b, 2.8, 2, D);
      blob(a, hx + 2.5, hy + 0.8 + b, 1.6, 1.2, D.map(c => sh(c, 1.1)));
      a.put(hx + 4, hy + 1 + b, [30, 22, 20]);
      blob(a, hx - 2, hy - 2.5 + b, 1, 1.6, D);                 // ear
      eye(a, hx + 1, hy - 0.5 + b, true);
      if (q.buck) {                                            // antlers
        const ax = hx - 0.5, ay = hy - 2 + b, A = [190, 174, 146];
        for (const [x0, y0, x1, y1] of [[0, 0, -1, -4], [-1, -4, -3, -7], [-1, -4, 1, -7], [-3, -7, -4, -9], [-2, -6, 0, -9], [0, -1, 2, -4]]) seg(a, ax + x0, ay + y0, ax + x1, ay + y1, 1, [A, A, A, A]);
      }
      blob(a, hx - 1, hy + 3 + b, 1.2, 1, P.white);             // throat patch
      legs(a, q, L, false);
    },
    rabbit(a, q) {
      const R = P.rabbit, st = q.gait === 'run' && q.ph < 0.5;
      blob(a, 0, st ? -4 : -3, st ? 4 : 3.4, st ? 2 : 2.6, R, { fur: 1 });
      blob(a, 3, st ? -5 : -5, 2, 1.8, R);
      seg(a, 2, -6, 1, -10, 1, R); seg(a, 3, -6, 3.5, -10, 1, R); a.put(1, -9, P.pink[2]);
      blob(a, -3.5, st ? -5 : -4, 1.2, 1.2, P.white);
      eye(a, 4, -5.5);
      if (st) { seg(a, -3, -3, -6, -1, 1, R); seg(a, 3, -3, 5, -1, 1, R); }
      else { blob(a, -1.5, -1, 2, 1, R); seg(a, 2, -2, 2.5, 0, 1, R); }
    },
    pdog(a, q) {
      const C = P.pdog;
      if (q.pose === 'down') {
        blob(a, 0, -1, 4, 1.6, P.dirt);
        blob(a, 0.5, -2.6, 1.8, 1.4, C); eye(a, 1.5, -3);
        return;
      }
      blob(a, 0, -1, 4, 1.4, P.dirt);
      blob(a, 0, -5, 2.2, 3.6, C, { fur: 1 });
      blob(a, 0.5, -9.5, 1.9, 1.7, C);
      blob(a, 0, -4.5, 1.2, 2.4, C.map(c => sh(c, 1.12)));
      seg(a, 1, -6, 2.5, -6, 1, C);                               // paws held up
      eye(a, 1.5, -10, true); a.put(2.5, -9, [40, 30, 26]);
    },
    cow(a, q) {
      const W = q.pal, K = q.spots, b = q.bob + (q.chew || 0) * 0, down = q.head === 'down', lie = q.lie, lo = lie ? 7 : 0;
      const HC = [44, 36, 32];
      // the spots are laid out over the whole cow, then each part takes its share
      const spot = (cx, cy) => ({ patch: q.patch.map(([x, y, r]) => [x - Math.round(cx), y - Math.round(cy), r]), patchPal: K });
      const L = { front: [8, -10, 2, W, HC], hind: [-9, -11, 2, W, HC], amp: 0.32 };
      if (!lie) legs(a, q, L, true);
      const tx = -12.5 + (q.tail || 0) * 1.6;                       // the tail swishes
      seg(a, -11.5, -17.5 + b + lo, tx, (lie ? -3 : -9) + b, 1, W); blob(a, tx, (lie ? -2 : -8) + b, 1, 1.8, K);
      blob(a, -1, -14 + b + lo, 10.5, 5.5, W, spot(-1, -14));
      blob(a, -8.5, -16.5 + b + lo, 3.6, 2.8, W, spot(-8.5, -16.5));   // hip bones
      blob(a, 6, -15 + b + lo, 4.2, 4.6, W, spot(6, -15));             // shoulders
      if (!lie) { blob(a, -4, -8.5 + b, 2.6, 1.8, P.pink); a.put(-5, -6.5 + b, P.pink[1]); a.put(-3, -6.5 + b, P.pink[1]); }   // udder
      blob(a, 9.5, -11 + b + lo, 1.6, 2.4, W);                        // dewlap
      const hx = down ? 14 : 13, hy = (down ? -5 : -15) + b + (lie ? 5 : 0) + (q.chew || 0);
      seg(a, 8, -15 + b + lo, hx - 1.5, hy + 0.5, 4, W);
      blob(a, hx, hy, 2.6, 2.9, q.face, { patch: [[1, -1, 1.3], [2, 0, 1]], patchPal: W });   // white blaze down the face
      blob(a, hx + 2.8, hy + 1.6, 1.8, 1.5, P.pink); a.put(hx + 4, hy + 1.4, P.pink[0]);
      seg(a, hx - 1.8, hy - 2, hx - 4.4, hy - 2.4 - (q.ear ? 1 : 0), 1, q.face); a.put(hx - 3, hy - 2.2, P.pink[2]);   // ear
      a.put(hx - 1, hy - 3.6, P.horn[3]); a.put(hx - 1.5, hy - 4.6, P.horn[2]);
      eye(a, hx + 0.6, hy - 1, true);
      if (lie) { blob(a, 6, -1.5, 3, 1.3, W); blob(a, -7, -1.8, 3.6, 1.5, W); a.put(9, 0, HC); a.put(-4, 0, HC); }
      else legs(a, q, L, false);
    },
    coyote(a, q) {
      const C = P.coyote, b = q.bob, bite = q.pose === 'bite';
      const L = { front: [6, -7, 1, C, C[0]], hind: [-6, -8, 1, C, C[0]], amp: 0.45 };
      legs(a, q, L, true);
      // bushy tail, hanging low, dark tip
      blob(a, -9, -8 + b, 2.6, 1.8, C, { fur: 1 }); blob(a, -11.5, -6 + b, 2, 1.6, C, { fur: 1 }); blob(a, -13, -4.5 + b, 1.4, 1.2, P.coyoteDark);
      blob(a, 0, -10 + b, 6.5, 3.2, C, { fur: 1 });
      blob(a, 4.5, -10.5 + b, 3.4, 3.4, C, { fur: 1 });
      blob(a, 0, -8 + b, 5, 1, P.white.map(c => sh(c, 0.95)));     // pale underside
      const hx = bite ? 11 : 9.5, hy = bite ? -9 : -13;
      seg(a, 5, -12 + b, hx - 1, hy + 1 + b, 3, C);
      blob(a, hx, hy + b, 2.6, 2.2, C);
      blob(a, hx + 3, hy + 1 + b, 2, 1, C.map(c => sh(c, 1.08)));  // snout
      a.put(hx + 5, hy + 1 + b, [24, 18, 16]);
      if (bite) { a.put(hx + 3, hy + 2.5 + b, [120, 30, 30]); a.put(hx + 4, hy + 2.5 + b, P.white[3]); seg(a, hx + 1, hy + 3 + b, hx + 4, hy + 3.5 + b, 1, C); }
      for (const x of [hx - 1.5, hx]) seg(a, x, hy - 1.5 + b, x - 0.3, hy - 4 + b, 1, P.coyoteDark);   // ears
      eye(a, hx + 1, hy - 0.6 + b, true);
      legs(a, q, L, false);
    },
    pig(a, q) {
      const C = P.pink, b = q.bob, down = q.head === 'down', lie = q.lie, lo = lie ? 3 : 0, TR = [130, 74, 74];
      const L = { front: [5, -4.5, 2, C, TR], hind: [-5, -4.5, 2, C, TR], amp: 0.4 };
      if (!lie) legs(a, q, L, true);
      const w = q.tail || 0;                                          // the curly tail wiggles
      for (const [x, y] of [[-7.5, -7.5], [-8.5, -8.5 + w * 0.5], [-9.5, -7.5 + w], [-9, -6.5]]) a.put(x, y + b + lo, C[1]);
      const pat = q.patch ? { patch: q.patch, patchPal: P.face } : {};
      blob(a, -3.5, -7.5 + b + lo, 4, 3.8, C, pat);
      blob(a, 0.5, -7 + b + lo, 7, 4.2, C, pat);
      const hx = 7, hy = (down ? -4 : -7.5) + b + lo + (q.chew || 0);
      blob(a, hx, hy, 3.2, 2.9, C);
      blob(a, hx + 3.2, hy + 0.6, 1.1, 1.6, C.map(c => sh(c, 0.88)));                         // snout
      a.put(hx + 4, hy, [120, 64, 64]); a.put(hx + 4, hy + 1.4, [120, 64, 64]);
      seg(a, hx - 0.6, hy - 2.6, hx + 1.8, hy - 1.2 - (q.ear ? 1 : 0), 2, C.map(c => sh(c, 0.94)));   // ear flopped over the eye
      eye(a, hx + 1.2, hy - 0.1);
      a.put(hx + 2.4, hy + 2, C[0]);
      if (lie) { a.put(4, 0, TR); a.put(5, 0, TR); a.put(-4, 0, TR); }
      else legs(a, q, L, false);
    },
    sheep(a, q) {
      const C = P.wool, F = P.face, b = q.bob, down = q.head === 'down', lie = q.lie, lo = lie ? 4 : 0, wool = { wool: 1 };
      const L = { front: [5, -5, 1, F, null], hind: [-5, -5, 1, F, null], amp: 0.4 };
      if (!lie) legs(a, q, L, true);
      blob(a, -7.6, -8 + b + lo + (q.tail || 0) * 0.6, 1.4, 2, C, wool);
      for (const [x, y, rx, ry] of [[0, -8.5, 7, 4.5], [-4, -10, 3.6, 3.4], [3.5, -10.5, 3.6, 3.4], [0, -11.6, 3, 2.6]]) blob(a, x, y + b + lo, rx, ry, C, wool);
      for (const [x, y] of [[-5, -9], [-1, -10.5], [3, -9], [-3, -7], [1, -7], [5, -8]]) { a.put(x, y + b + lo, C[1]); a.put(x + 1, y - 1 + b + lo, C[1]); }   // curls
      const hx = 7.5, hy = (down ? -4 : -10) + b + lo + (q.chew || 0);
      blob(a, hx, hy, 2.3, 2.5, F);
      blob(a, hx + 1.8, hy + 1, 1.3, 1.2, F.map(c => sh(c, 1.15)));
      seg(a, hx - 1, hy - 1.4, hx - 4, hy - 0.8 - (q.ear ? 1 : 0), 1, F);                   // ears out to the side
      blob(a, hx - 1, hy - 2.8, 1.8, 1.2, C, wool);                                           // topknot
      a.put(hx + 0.4, hy - 0.6, [214, 186, 110]); a.put(hx + 1, hy - 0.6, [14, 10, 10]);
      if (lie) { a.put(4, 0, F[1]); a.put(-4, 0, F[1]); }
      else legs(a, q, L, false);
    },
    goat(a, q) {
      const C = q.pal, b = q.bob, down = q.head === 'down', lie = q.lie, lo = lie ? 6 : 0, HC = [40, 32, 28], fur = { fur: 1 };
      const L = { front: [5, -7.5, 1, C, HC], hind: [-5, -8, 1, C, HC], amp: 0.45 };
      if (!lie) legs(a, q, L, true);
      seg(a, -6, -11 + b + lo, -7 - (q.tail || 0) * 0.8, -13.5 + b + lo, 1, C);            // tail flicked up
      blob(a, -4.5, -11 + b + lo, 2.6, 2.7, C, fur);
      blob(a, 0, -10 + b + lo, 6.2, 3.4, C, fur);
      blob(a, 4, -10 + b + lo, 2.8, 3.3, C, fur);
      if (q.stripe) for (let x = -5; x <= 4; x++) a.put(x, -13 + b + lo + (x > 2 ? 0.5 : 0), q.stripe);   // dark stripe down the back
      const hx = down ? 8.5 : 7, hy = (down ? -5 : -15) + b + (lie ? 4 : 0) + (q.chew || 0);
      seg(a, 4.5, -12 + b + lo, hx - 0.8, hy + 1, 2, C);
      blob(a, hx, hy, 2, 1.8, C);
      blob(a, hx + 1.9, hy + 1, 1.4, 1.2, C.map(c => sh(c, 1.08)));
      for (const [x, y, k] of [[-0.5, -2, 3], [-1.5, -3, 3], [-2.5, -3.5, 2], [-3.5, -3.2, 2], [-4.2, -2.4, 1]]) a.put(hx + x, hy + y, P.horn[k]);   // horns sweeping back
      seg(a, hx - 1, hy - 0.4, hx - 3, hy + 0.6 - (q.ear ? 1 : 0), 1, C.map(c => sh(c, 0.88)));
      seg(a, hx + 1.6, hy + 2, hx + 1.6, hy + 4, 1, C.map(c => sh(c, 0.78)));                // beard
      a.put(hx + 0.4, hy - 0.6, [210, 176, 80]); a.put(hx + 0.9, hy - 0.6, [14, 10, 10]);
      if (lie) { a.put(4, 0, HC); a.put(-4, 0, HC); }
      else legs(a, q, L, false);
    },
  };

  // ------------------------------------------------------------ sets
  // frames: name -> pose, or name -> [poses] for a cycle
  function make(kind, W, H, ox, frames, extra = {}) {
    const out = { anchor: (ox + 1) * 2 };
    for (const k in frames) {
      const one = q => { const a = frame(W, H, ox); PAINT[kind](a, Object.assign({ gait: 'stand', ph: 0, bob: 0 }, extra, q)); return a.done(); };
      out[k] = Array.isArray(frames[k]) ? frames[k].map(one) : one(frames[k]);
    }
    return out;
  }
  const WALK = [0, 0.25, 0.5, 0.75].map((ph, i) => ({ gait: 'walk', ph, bob: i % 2 ? -1 : 0 }));
  const RUN = [{ gait: 'run', ph: 0, bob: -1 }, { gait: 'run', ph: 0.5, bob: 0 }];
  // farm animals have more life: a tail swish and an ear flick while they
  // stand, chewing while they graze, and lying down for a rest
  const FARM = {
    stand: [{ tail: 0 }, { tail: 1 }, { tail: 0 }, { tail: -1, ear: 1 }],
    walk: WALK.map((w, i) => Object.assign({ tail: [0, 1, 0, -1][i] }, w)),
    graze: [{ head: 'down' }, { head: 'down', chew: 1, tail: 1 }],
    lie: [{ lie: 1 }, { lie: 1, chew: 1, ear: 1 }],
  };
  const COW_SPOTS = [[-6, -16, 3.2], [2, -13, 2.6], [6, -17, 2.2], [-10, -12, 2.2], [-2, -18, 1.6]];
  const BEAR = { stand: {}, walk: WALK, crouch: { pose: 'crouch' }, lunge: { gait: 'run', ph: 0, bob: -2, pose: 'lunge' } };
  const sets = {
    bison: make('bison', 40, 28, 20, { stand: {}, walk: WALK, run: RUN, graze: { head: 'down' } }),
    bear: make('bear', 46, 44, 18, BEAR, { pal: P.bear, tips: [184, 150, 112] }),
    blackbear: make('bear', 46, 44, 18, BEAR, { pal: P.blackbear }),
    deer: make('deer', 30, 34, 12, { stand: {}, walk: WALK, run: RUN, graze: { head: 'down' } }, { buck: true }),
    doe: make('deer', 30, 34, 12, { stand: {}, walk: WALK, run: RUN, graze: { head: 'down' } }),
    rabbit: make('rabbit', 14, 12, 6, { stand: {}, run: [{ gait: 'run', ph: 0 }, { gait: 'run', ph: 0.6 }] }),
    pdog: make('pdog', 10, 13, 4, { stand: {}, down: { pose: 'down' } }),
    cow: make('cow', 36, 24, 16, FARM, { pal: P.white, spots: P.cowK, face: P.cowK, patch: COW_SPOTS }),
    browncow: make('cow', 36, 24, 16, FARM, { pal: P.cowB, spots: P.white, face: P.cowB, patch: [[-5, -17, 2], [4, -12, 1.6]] }),
    coyote: make('coyote', 32, 20, 15, { stand: {}, walk: WALK, run: RUN, bite: { pose: 'bite' } }),
    pig: make('pig', 24, 14, 11, FARM),
    spotpig: make('pig', 24, 14, 11, FARM, { patch: [[-3, -1, 2], [3, 1, 1.5]] }),
    sheep: make('sheep', 24, 16, 11, FARM),
    goat: make('goat', 24, 20, 11, FARM, { pal: P.white }),
    browngoat: make('goat', 24, 20, 11, FARM, { pal: P.goatB, stripe: [50, 32, 22] }),
  };
  const cycle = (frames, t) => frames[((Math.floor(t) % frames.length) + frames.length) % frames.length];
  return { sets, cycle };
})();
