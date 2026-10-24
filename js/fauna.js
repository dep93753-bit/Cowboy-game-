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
      const C = q.pal, b = q.bob;
      if (q.gait === 'rear') {
        // up on its hind legs, claws out
        for (const x of [-3, 2]) seg(a, x, -10, x, 0, 3, C);
        blob(a, 0, -15, 5.5, 8, C, { fur: 1 });
        blob(a, 1, -24, 4.5, 4, C, { fur: 1 });
        blob(a, 3, -23, 2.4, 1.8, P.muzzle);
        for (const x of [-2, 3]) blob(a, x, -28, 1.3, 1.3, C);
        eye(a, 2, -25, true); a.put(5, -23, [20, 14, 12]);
        for (const s of [-1, 1]) { seg(a, s * 4, -19, s * 8, -24, 2, C); for (let k = 0; k < 3; k++) a.put(s * 8 + k - 1, -26, P.white[2]); }
        blob(a, 0, -14, 3, 4, C.map(c => sh(c, 1.15)), { fur: 1 });
        return;
      }
      const L = { front: [8, -8, 2, C, C[0], 0], hind: [-8, -9, 2, C, C[0], 0], amp: 0.35 };
      legs(a, q, L, true);
      blob(a, -8, -11 + b, 6, 6, C, { fur: 1 });
      blob(a, -1, -10 + b, 9, 6, C, { fur: 1 });
      blob(a, 5, -13 + b, 6, 5.5, C, { fur: 1 });           // shoulder hump
      blob(a, 12, -10 + b, 4.5, 4, C, { fur: 1 });
      blob(a, 16, -9 + b, 2.4, 1.8, P.muzzle);
      for (const x of [10, 13]) blob(a, x, -14 + b, 1.3, 1.3, C);
      eye(a, 14, -11 + b, true); a.put(18, -9 + b, [20, 14, 12]);
      legs(a, q, L, false);
      for (const x of [9, -7]) for (let k = 0; k < 2; k++) a.put(x + k + 1, 0, P.white[1]);   // claws
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
      const W = q.pal, K = q.spots, b = q.bob, down = q.head === 'down';
      const spots = { patch: q.patch, patchPal: K };
      const L = { front: [8, -9, 2, W, [44, 36, 32]], hind: [-8, -10, 2, W, [44, 36, 32]], amp: 0.35 };
      legs(a, q, L, true);
      seg(a, -11, -16 + b, -12.5, -8 + b, 1, W); blob(a, -12.5, -7 + b, 1, 1.6, K);   // tail
      blob(a, -1, -13 + b, 10, 5.5, W, spots);
      blob(a, -4, -8 + b, 2.6, 1.6, P.pink);                     // udder
      const hx = down ? 13 : 12, hy = down ? -6 : -14;
      seg(a, 8, -14 + b, hx - 1, hy + b, 4, W);
      blob(a, hx, hy + b, 3.4, 2.8, q.face, { patch: [[1, -1, 1.5]], patchPal: W });
      blob(a, hx + 3, hy + 1 + b, 1.6, 1.4, P.pink);             // muzzle
      a.put(hx - 1, hy - 3 + b, P.horn[3]); a.put(hx - 2, hy - 4 + b, P.horn[2]);
      blob(a, hx - 3, hy - 1 + b, 1.4, 0.9, q.face);              // ear
      eye(a, hx + 1, hy - 1 + b, true);
      legs(a, q, L, false);
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
      const C = P.pink, b = q.bob, down = q.head === 'down';
      const L = { front: [5, -4, 2, C, [120, 70, 70]], hind: [-5, -4, 2, C, [120, 70, 70]], amp: 0.4 };
      legs(a, q, L, true);
      for (const [x, y] of [[-7, -7], [-8, -8], [-9, -7], [-8, -6]]) a.put(x, y + b, C[1]);   // curly tail
      blob(a, 0, -6.5 + b, 7, 4, C, q.patch ? { patch: q.patch, patchPal: P.face } : {});
      const hx = 7, hy = (down ? -4 : -7) + b;
      blob(a, hx, hy, 3, 2.8, C);
      blob(a, hx + 3, hy + 0.5, 1.2, 1.5, C.map(c => sh(c, 0.92)));
      a.put(hx + 3, hy, [130, 70, 70]); a.put(hx + 3, hy + 1, [130, 70, 70]);
      blob(a, hx - 1, hy - 2.8, 1.6, 1, C.map(c => sh(c, 0.95)));   // floppy ear
      eye(a, hx + 1, hy - 1);
      legs(a, q, L, false);
    },
    sheep(a, q) {
      const C = P.wool, F = P.face, b = q.bob, down = q.head === 'down';
      const L = { front: [5, -5, 1, F, null], hind: [-5, -5, 1, F, null], amp: 0.4 };
      legs(a, q, L, true);
      blob(a, 0, -8 + b, 7, 4.2, C, { wool: 1 });
      blob(a, -4, -9 + b, 3.5, 3.5, C, { wool: 1 }); blob(a, 3, -9.5 + b, 3.5, 3.5, C, { wool: 1 });
      const hx = 7.5, hy = (down ? -4 : -9) + b;
      blob(a, hx, hy, 2.2, 2.2, F);
      blob(a, hx + 1.8, hy + 0.8, 1.2, 1.1, F.map(c => sh(c, 1.1)));
      blob(a, hx - 1.5, hy - 1.5, 1.2, 0.8, F);                    // ear
      blob(a, hx - 1, hy - 2.5, 1.6, 1, C, { wool: 1 });           // wool on top of the head
      eye(a, hx + 0.5, hy - 0.5, true);
      legs(a, q, L, false);
    },
    goat(a, q) {
      const C = q.pal, b = q.bob, down = q.head === 'down';
      const L = { front: [5, -7, 1, C, [40, 32, 28]], hind: [-5, -7, 1, C, [40, 32, 28]], amp: 0.45 };
      legs(a, q, L, true);
      seg(a, -6, -10 + b, -7.5, -12 + b, 1, C);                      // tail, flicked up
      blob(a, 0, -9.5 + b, 6, 3.2, C, { fur: 1 });
      const hx = down ? 8.5 : 7.5, hy = (down ? -5 : -14) + b;
      seg(a, 4, -11 + b, hx - 1, hy + 1, 2, C);
      blob(a, hx, hy, 2.2, 1.8, C);
      blob(a, hx + 2, hy + 0.8, 1.3, 1, C.map(c => sh(c, 1.08)));
      for (const [x, y] of [[-1, -2], [-2, -3], [-3, -3.5], [-4, -3]]) a.put(hx + x, hy + y, [120, 110, 96]);   // horns sweeping back
      seg(a, hx + 1, hy + 2, hx + 1, hy + 4, 1, C.map(c => sh(c, 0.85)));   // beard
      eye(a, hx + 0.5, hy - 0.6, true);
      legs(a, q, L, false);
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
  const COW_SPOTS = [[-5, -2, 3], [3, 1, 2.5], [6, -3, 2], [-8, 2, 2]];
  const sets = {
    bison: make('bison', 40, 28, 20, { stand: {}, walk: WALK, run: RUN, graze: { head: 'down' } }),
    bear: make('bear', 36, 32, 16, { stand: {}, walk: WALK, rear: { gait: 'rear' } }, { pal: P.bear }),
    blackbear: make('bear', 36, 32, 16, { stand: {}, walk: WALK, rear: { gait: 'rear' } }, { pal: P.blackbear }),
    deer: make('deer', 30, 34, 12, { stand: {}, walk: WALK, run: RUN, graze: { head: 'down' } }, { buck: true }),
    doe: make('deer', 30, 34, 12, { stand: {}, walk: WALK, run: RUN, graze: { head: 'down' } }),
    rabbit: make('rabbit', 14, 12, 6, { stand: {}, run: [{ gait: 'run', ph: 0 }, { gait: 'run', ph: 0.6 }] }),
    pdog: make('pdog', 10, 13, 4, { stand: {}, down: { pose: 'down' } }),
    cow: make('cow', 34, 22, 15, { stand: {}, walk: WALK, graze: { head: 'down' } }, { pal: P.white, spots: P.cowK, face: P.cowK, patch: COW_SPOTS }),
    browncow: make('cow', 34, 22, 15, { stand: {}, walk: WALK, graze: { head: 'down' } }, { pal: P.cowB, spots: P.white, face: P.white, patch: [[-4, -3, 2], [5, 2, 1.5]] }),
    coyote: make('coyote', 32, 20, 15, { stand: {}, walk: WALK, run: RUN, bite: { pose: 'bite' } }),
    pig: make('pig', 22, 14, 10, { stand: {}, walk: WALK, graze: { head: 'down' } }),
    spotpig: make('pig', 22, 14, 10, { stand: {}, walk: WALK, graze: { head: 'down' } }, { patch: [[-3, -1, 2], [3, 1, 1.5]] }),
    sheep: make('sheep', 22, 16, 10, { stand: {}, walk: WALK, graze: { head: 'down' } }),
    goat: make('goat', 22, 20, 10, { stand: {}, walk: WALK, graze: { head: 'down' } }, { pal: P.white }),
    browngoat: make('goat', 22, 20, 10, { stand: {}, walk: WALK, graze: { head: 'down' } }, { pal: P.goatB }),
  };
  const cycle = (frames, t) => frames[((Math.floor(t) % frames.length) + frames.length) % frames.length];
  return { sets, cycle };
})();
