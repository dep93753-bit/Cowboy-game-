// Small shared helpers. Everything in this game uses plain global objects
// (no modules) so index.html also works when opened straight from disk.
const W = 320;          // internal resolution
const H = 180;
const GROUND = 160;     // y of the walking line (feet)

const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  lerpColor: (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)),
  rgb: (c, a) => (a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`),
  shade: (c, f) => c.map(v => U.clamp(Math.round(v * f), 0, 255)),

  // Deterministic RNG (xorshift) so the same seed always builds the same world.
  rng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  },
  hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  pick(r, arr) { return arr[Math.floor(r() * arr.length)]; },
  weighted(r, table) {
    let total = 0;
    for (const k in table) total += table[k];
    let n = r() * total;
    for (const k in table) { n -= table[k]; if (n <= 0) return k; }
    return Object.keys(table)[0];
  },

  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  },

  // Pixel buffer for building art one pixel at a time. `wrap` makes x tile.
  pix(w, h, wrap = false) {
    const c = U.canvas(w, h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    return {
      c, w, h,
      put(x, y, col, a = 255) {
        x = Math.round(x); y = Math.round(y);
        if (wrap) x = ((x % w) + w) % w;
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = (y * w + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a;
      },
      get(x, y) {
        if (wrap) x = ((x % w) + w) % w;
        if (x < 0 || y < 0 || x >= w || y >= h) return [0, 0, 0];
        const i = (y * w + x) * 4;
        return [d[i], d[i + 1], d[i + 2]];
      },
      has(x, y) {
        if (wrap) x = ((x % w) + w) % w;
        if (x < 0 || y < 0 || x >= w || y >= h) return false;
        return d[(y * w + x) * 4 + 3] > 0;
      },
      rect(x, y, rw, rh, col) {
        for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) this.put(x + i, y + j, col);
      },
      done() { ctx.putImageData(img, 0, 0); return c; },
    };
  },

  // Turn fine 1px art into the game's chunky 2x2 pixels at the same size:
  // each 2x2 block becomes its most common colour (ties go to the darker one,
  // which keeps outlines bold). Blocks line up with the bottom-left corner so
  // things standing on the ground stay put. Accepts a canvas or an object of
  // canvases (e.g. { closed, open }), and passes anything else through.
  chunky(c) {
    if (!c) return c;
    if (!(c instanceof HTMLCanvasElement)) {
      if (typeof c === 'object' && !Array.isArray(c)) { const o = {}; for (const k in c) o[k] = U.chunky(c[k]); return o; }
      if (Array.isArray(c)) return c.map(U.chunky);
      return c;
    }
    const w = c.width, h = c.height, oy = h % 2;
    const src = c.getContext('2d').getImageData(0, 0, w, h).data;
    const out = U.canvas(w + (w % 2), h + oy), octx = out.getContext('2d');
    const img = octx.createImageData(out.width, out.height), d = img.data;
    const cols = [];
    for (let by = -oy; by < h; by += 2) for (let bx = 0; bx < w; bx += 2) {
      cols.length = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const x = bx + i, y = by + j;
        if (x >= w || y < 0 || y >= h) continue;
        const k = (y * w + x) * 4;
        if (src[k + 3] > 60) cols.push(k);
      }
      if (!cols.length) continue;
      let best = cols[0], bestN = 0;
      for (const k of cols) {
        let n = 0;
        for (const q of cols) if (src[q] === src[k] && src[q + 1] === src[k + 1] && src[q + 2] === src[k + 2]) n++;
        const lum = src[k] + src[k + 1] + src[k + 2], bl = src[best] + src[best + 1] + src[best + 2];
        if (n > bestN || (n === bestN && lum < bl)) { best = k; bestN = n; }
      }
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const o = ((by + oy + j) * out.width + bx + i) * 4;
        d[o] = src[best]; d[o + 1] = src[best + 1]; d[o + 2] = src[best + 2]; d[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return out;
  },
  // Double a canvas with nearest-neighbour scaling (half-size art -> screen).
  dbl(c) {
    const o = U.canvas(c.width * 2, c.height * 2), x = o.getContext('2d');
    x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height);
    return o;
  },
  // Round a screen position to the 2px pixel grid.
  snap: v => Math.round(v / 2) * 2,

  // 4x4 ordered dither matrix used for gradients.
  BAYER: [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]],

  fmtTime(mins) {
    const m = Math.floor(mins % 1440);
    let h = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, '0');
    const ap = h < 12 ? 'AM' : 'PM';
    h = h % 12 || 12;
    return `${h}:${mm} ${ap}`;
  },
};
