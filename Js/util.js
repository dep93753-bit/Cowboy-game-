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
