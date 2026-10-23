// Procedural pixel art for buildings and scenery. Each function returns a
// canvas whose bottom edge sits on the ground.
const Props = (() => {
  const OUT = [40, 24, 18];

  // Outline every opaque pixel's empty neighbours (keeps the chunky style).
  function outline(p, col = OUT) {
    const marks = [];
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        if (p.has(x, y)) continue;
        if (p.has(x + 1, y) || p.has(x - 1, y) || p.has(x, y + 1) || p.has(x, y - 1)) marks.push([x, y]);
      }
    }
    marks.forEach(([x, y]) => p.put(x, y, col));
  }

  // ------------------------------------------------------------ town front
  // Western "false front" building with clapboard walls, a sign, a porch.
  function building(o) {
    const r = U.rng(U.hash(o.sign));
    const w = o.w, h = o.h, body = o.body || 50;
    const cw = w + 12, ch = h + 2;
    const p = U.pix(cw, ch);
    const x0 = 6, top = h - body - (o.front || 22), bodyTop = h - body;
    const wall = o.wall, hi = U.shade(wall, 1.15), lo = U.shade(wall, 0.78), dk = U.shade(wall, 0.6);

    // false front + body, clapboard rows
    for (let y = top; y < h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const band = (y - top) % 4;
        let c = band === 0 ? hi : band === 3 ? lo : wall;
        if (r() < 0.04) c = U.shade(c, 0.92);
        p.put(x, y, c);
      }
    }
    // stepped top on some fronts
    if (o.stepped) {
      for (let y = top - 6; y < top; y++) for (let x = x0 + 10; x < x0 + w - 10; x++) p.put(x, y, (y - top) % 4 === 0 ? hi : wall);
      for (let x = x0 + 8; x < x0 + w - 8; x++) { p.put(x, top - 7, o.trim); p.put(x, top - 8, U.shade(o.trim, 1.2)); }
    }
    // cornice
    for (let x = x0 - 2; x < x0 + w + 2; x++) {
      p.put(x, top, U.shade(o.trim, 1.2)); p.put(x, top + 1, o.trim); p.put(x, top + 2, U.shade(o.trim, 0.7));
    }
    // corner posts
    for (let y = top + 3; y < h; y++) { p.put(x0, y, dk); p.put(x0 + 1, y, lo); p.put(x0 + w - 1, y, dk); p.put(x0 + w - 2, y, lo); }

    // sign board
    const sw = Math.min(w - 12, Font.width(o.sign) * 1 + 10);
    const sx = x0 + Math.floor((w - sw) / 2), sy = top + 6;
    for (let y = sy; y < sy + 11; y++) for (let x = sx; x < sx + sw; x++) {
      p.put(x, y, y === sy || y === sy + 10 || x === sx || x === sx + sw - 1 ? U.shade(o.signBg, 0.6) : o.signBg);
    }

    // windows
    const winY = h - 34;
    const wins = [];
    (o.windows || []).forEach(wx => {
      const X = x0 + wx;
      for (let y = winY; y < winY + 15; y++) for (let x = X; x < X + 12; x++) {
        let c = [46, 56, 72];
        if (x === X || x === X + 11 || y === winY || y === winY + 14 || x === X + 6 || y === winY + 7) c = o.trim;
        else if ((x - X) + (y - winY) === 6 || (x - X) + (y - winY) === 7) c = [96, 116, 140];
        p.put(x, y, c);
      }
      wins.push({ x: X + 6, y: winY + 7, r: [X + 1, winY + 1, 10, 13] });
    });
    // upstairs windows (hotel etc.)
    (o.upper || []).forEach(wx => {
      const X = x0 + wx, Y = bodyTop + 3;
      for (let y = Y; y < Y + 11; y++) for (let x = X; x < X + 9; x++) {
        let c = [46, 56, 72];
        if (x === X || x === X + 8 || y === Y || y === Y + 10 || x === X + 4) c = o.trim;
        p.put(x, y, c);
      }
      wins.push({ x: X + 4, y: Y + 5, r: [X + 1, Y + 1, 7, 9] });
    });

    // door
    const dX = x0 + (o.doorX !== undefined ? o.doorX : Math.floor(w / 2) - 7);
    const dY = h - 26;
    for (let y = dY; y < h - 3; y++) for (let x = dX; x < dX + 14; x++) {
      let c = [30, 20, 16];
      if (o.door === 'batwing') {
        if (y > dY + 5 && y < dY + 16) c = (x - dX) % 3 === 0 ? [96, 60, 34] : [140, 96, 56];
        if (x === dX + 7) c = [30, 20, 16];
      } else {
        c = (x - dX) % 4 === 0 ? U.shade(o.doorCol || [110, 70, 40], 0.7) : (o.doorCol || [110, 70, 40]);
        if (x === dX + 11 && y === dY + 12) c = [230, 196, 90];
      }
      if (x === dX || x === dX + 13 || y === dY) c = o.trim;
      p.put(x, y, c);
    }

    // porch roof + posts + boardwalk
    if (o.porch !== false) {
      const ry = h - 31;
      for (let y = ry; y < ry + 4; y++) for (let x = x0 - 5; x < x0 + w + 5; x++) {
        p.put(x, y, y === ry ? [150, 110, 72] : y === ry + 3 ? [70, 46, 30] : (x % 5 === 0 ? [96, 64, 40] : [120, 82, 52]));
      }
      for (const px of [x0 - 3, x0 + w + 2]) for (let y = ry + 4; y < h - 3; y++) { p.put(px, y, [120, 84, 52]); p.put(px + 1, y, [86, 58, 36]); }
    }
    for (let y = h - 3; y < h; y++) for (let x = x0 - 5; x < x0 + w + 5; x++) {
      p.put(x, y, y === h - 3 ? [176, 130, 84] : (x % 7 === 0 ? [96, 66, 42] : [138, 96, 60]));
    }
    outline(p);
    const c = p.done();
    const ctx = c.getContext('2d');
    Font.draw(ctx, o.sign, sx + Math.floor((sw - Font.width(o.sign)) / 2), sy + 3, U.rgb(o.signInk || [40, 24, 18]));
    return { img: c, w: cw, h: ch, door: dX + 7, wins };
  }

  // ------------------------------------------------------ abandoned house
  function shack(seed) {
    const r = U.rng(seed);
    const w = 52 + Math.floor(r() * 18), h = 34 + Math.floor(r() * 8);
    const cw = w + 12, ch = h + 12;
    const p = U.pix(cw, ch);
    const x0 = 6, yb = ch - 1, top = yb - h;
    const wood = [[128, 92, 64], [112, 80, 56], [140, 104, 72], [104, 84, 66]];
    const missing = 3 + Math.floor(r() * (w / 4 - 6));
    for (let x = x0; x < x0 + w; x++) {
      const plank = Math.floor((x - x0) / 4);
      const c = wood[(plank * 7 + seed) % 4];
      const t = top + (plank % 5 === 2 ? 2 : 0);
      for (let y = t; y < yb; y++) {
        let cc = c;
        if ((x - x0) % 4 === 0) cc = [70, 50, 36];
        else if (r() < 0.07) cc = U.shade(c, 0.82);
        if (plank === missing && y > t + 5) cc = [30, 20, 18];
        p.put(x, y, cc);
      }
    }
    // sagging roof with a hole
    const hole = Math.floor(r() * (w - 16)) + 6;
    for (let i = 0, x = x0 - 5; x < x0 + w + 5; i++, x++) {
      const sag = Math.round(3 * Math.sin((i / (w + 10)) * Math.PI));
      for (let k = 0; k < 6; k++) {
        if (i > hole && i < hole + 5 && k > 1) continue;
        p.put(x, top - 5 + k + sag, k === 0 ? [154, 116, 80] : k < 3 ? [96, 66, 46] : [76, 52, 36]);
      }
    }
    // doorway (dark, door hanging open)
    const dx = x0 + 6;
    for (let y = yb - 22; y < yb; y++) for (let x = dx; x < dx + 12; x++) p.put(x, y, x < dx + 3 ? [26, 16, 12] : x < dx + 9 ? [20, 12, 10] : [100, 72, 48]);
    // boarded window
    const wx = x0 + w - 16;
    for (let y = yb - 24; y < yb - 13; y++) for (let x = wx; x < wx + 11; x++) p.put(x, y, [28, 18, 16]);
    for (let k = 0; k < 11; k++) {
      p.put(wx + k, yb - 24 + k, [156, 116, 76]); p.put(wx + k, yb - 23 + k, [156, 116, 76]);
      p.put(wx + 10 - k, yb - 24 + k, [130, 96, 64]);
    }
    outline(p);
    return { img: p.done(), w: cw, h: ch, door: dx + 6 };
  }

  // ---------------------------------------------- other abandoned buildings
  function shadeWood(c, r) { return r() < 0.08 ? U.shade(c, 0.82) : c; }

  function farmhouse(seed) {
    const r = U.rng(seed);
    const w = 84, h = 74, cw = w + 16, ch = h + 4;
    const p = U.pix(cw, ch);
    const x0 = 8, yb = ch - 1, wall = [176, 168, 150], roofC = [92, 74, 66];
    const eave = yb - 50;
    // clapboard body
    for (let y = eave; y < yb; y++) for (let x = x0; x < x0 + w; x++) {
      const band = (y - eave) % 4;
      let c = band === 0 ? U.shade(wall, 1.1) : band === 3 ? U.shade(wall, 0.8) : wall;
      p.put(x, y, shadeWood(c, r));
    }
    // gable roof with missing shingles
    for (let y = yb - h; y < eave + 2; y++) {
      const half = Math.round(((y - (yb - h)) / (eave + 2 - (yb - h))) * (w / 2 + 6));
      for (let x = x0 + w / 2 - half; x < x0 + w / 2 + half; x++) {
        const row = Math.floor(y / 3);
        let c = (x + row * 3) % 7 === 0 ? U.shade(roofC, 0.7) : y % 3 === 0 ? U.shade(roofC, 0.85) : roofC;
        if (r() < 0.04) c = [40, 30, 26];
        p.put(x, y, c);
      }
    }
    // attic window in the gable
    for (let y = eave - 16; y < eave - 6; y++) for (let x = x0 + w / 2 - 4; x < x0 + w / 2 + 4; x++) p.put(x, y, (x === x0 + w / 2 - 4 || x === x0 + w / 2 + 3 || y === eave - 16 || y === eave - 7) ? [90, 70, 56] : [24, 20, 22]);
    // windows: one broken, one shuttered, upstairs
    const win = (wx, wy, broken) => {
      for (let y = wy; y < wy + 13; y++) for (let x = wx; x < wx + 10; x++) {
        let c = [28, 24, 26];
        if (x === wx || x === wx + 9 || y === wy || y === wy + 12) c = [110, 96, 80];
        else if (broken && (x - wx) + (y - wy) < 6) c = [120, 140, 160];
        p.put(x, y, c);
      }
    };
    win(x0 + 10, eave + 6, true); win(x0 + 62, eave + 6, false);
    for (let y = eave + 6; y < eave + 19; y++) { p.put(x0 + 72, y + 2, [80, 90, 70]); p.put(x0 + 73, y + 3, [64, 72, 56]); } // hanging shutter
    // porch roof (sagging) and posts
    const pr = yb - 26;
    for (let i = 0, x = x0 - 6; x < x0 + w + 6; i++, x++) {
      const sag = Math.round(2 * Math.sin((i / (w + 12)) * Math.PI));
      for (let k = 0; k < 4; k++) p.put(x, pr + k + sag, k === 0 ? [150, 120, 96] : [96, 78, 64]);
    }
    for (const px of [x0 - 3, x0 + 30, x0 + w + 1]) for (let y = pr + 4; y < yb; y++) { p.put(px, y, [130, 110, 90]); p.put(px + 1, y, [96, 80, 66]); }
    // door hanging open
    const dx = x0 + 38;
    for (let y = yb - 22; y < yb; y++) for (let x = dx; x < dx + 12; x++) p.put(x, y, x < dx + 3 ? [22, 16, 14] : x < dx + 9 ? [16, 12, 10] : [120, 100, 80]);
    // boardwalk
    for (let x = x0 - 6; x < x0 + w + 6; x++) { p.put(x, yb, [120, 90, 60]); p.put(x, yb - 1, [150, 116, 80]); }
    Props.outline(p);
    return { img: p.done(), w: cw, h: ch, door: dx + 6 };
  }

  function adobe(seed) {
    const r = U.rng(seed);
    const w = 66, h = 38, cw = w + 16, ch = h + 6;
    const p = U.pix(cw, ch);
    const x0 = 8, yb = ch - 1, top = yb - h, base = [204, 158, 112];
    for (let y = top; y < yb; y++) for (let x = x0; x < x0 + w; x++) {
      // crumbling, rounded parapet
      const edge = y - top;
      if (edge < 3 && (x - x0 < 3 - edge || x0 + w - x < 4 - edge)) continue;
      if (edge < 2 && Math.sin(x * 1.7 + seed) > 0.5) continue;
      let c = base;
      const n = r();
      if (n < 0.08) c = U.shade(base, 0.92); else if (n < 0.12) c = U.shade(base, 1.06);
      if (x > x0 + w - 6) c = U.shade(c, 0.85);
      if (edge < 2) c = U.shade(base, 1.12);
      p.put(x, y, c);
    }
    // missing plaster showing bricks
    for (let y = top + 18; y < top + 30; y++) for (let x = x0 + 46; x < x0 + 60; x++) {
      if (((x - x0 - 53) / 7) ** 2 + ((y - top - 24) / 6) ** 2 > 1) continue;
      p.put(x, y, y % 4 === 0 || (x + Math.floor(y / 4) * 3) % 7 === 0 ? [150, 110, 80] : [180, 128, 88]);
    }
    // vigas poking out
    for (const vx of [x0 + 6, x0 + 22, x0 + 38, x0 + 54]) for (let k = -4; k < 4; k++) { p.put(vx + k, top + 5, [110, 76, 46]); p.put(vx + k, top + 6, [80, 54, 34]); }
    // arched doorway
    const dx = x0 + 10;
    for (let y = yb - 24; y < yb; y++) for (let x = dx; x < dx + 13; x++) {
      if (y < yb - 18 && Math.hypot(x - dx - 6, y - (yb - 18)) > 6.5) continue;
      p.put(x, y, [26, 18, 14]);
    }
    // small window
    for (let y = top + 12; y < top + 21; y++) for (let x = x0 + 34; x < x0 + 42; x++) p.put(x, y, x === x0 + 38 ? [100, 70, 44] : [28, 20, 16]);
    Props.outline(p, [110, 76, 50]);
    return { img: p.done(), w: cw, h: ch, door: dx + 6 };
  }

  function barn(seed) {
    const r = U.rng(seed);
    const w = 96, h = 76, cw = w + 12, ch = h + 4;
    const p = U.pix(cw, ch);
    const x0 = 6, yb = ch - 1, top = yb - h, eave = yb - 44;
    const reds = [[150, 64, 48], [136, 56, 42], [160, 74, 56]];
    // gambrel roof outline: steep lower slope then shallow top
    const roofW = y => {
      const t = (y - top) / (eave - top);
      return t < 0.45 ? 14 + t / 0.45 * 22 : 36 + (t - 0.45) / 0.55 * 16;
    };
    for (let y = top; y < yb; y++) {
      const half = y < eave ? roofW(y) : w / 2;
      for (let x = x0 + w / 2 - half; x < x0 + w / 2 + half; x++) {
        let c;
        if (y < eave) { c = y % 3 === 0 ? [70, 62, 60] : [92, 82, 78]; if (r() < 0.03) c = [40, 34, 32]; }
        else { c = reds[Math.floor((x - x0) / 8) % 3]; if ((x - x0) % 8 === 0) c = U.shade(c, 0.6); c = shadeWood(c, r); }
        p.put(x, y, c);
      }
    }
    // hayloft door
    for (let y = eave - 18; y < eave - 4; y++) for (let x = x0 + 40; x < x0 + 56; x++) p.put(x, y, x === x0 + 40 || x === x0 + 55 || y === eave - 18 ? [230, 220, 200] : [40, 24, 20]);
    // big doors: left one closed with a white X, right one swung open
    const dx = x0 + 30, dw = 36, dy = yb - 34;
    for (let y = dy; y < yb; y++) for (let x = dx; x < dx + dw; x++) {
      let c = x < dx + 18 ? [150, 64, 48] : [20, 14, 12];
      if (x < dx + 18) {
        const lx = x - dx, ly = (y - dy) * 18 / 34;
        if (x === dx || x === dx + 17 || y === dy || y === yb - 1 || Math.abs(lx - ly) < 1.2 || Math.abs(lx - (18 - ly)) < 1.2) c = [230, 220, 200];
      }
      p.put(x, y, c);
    }
    for (let y = dy + 2; y < yb; y++) for (let x = dx + dw; x < dx + dw + 4; x++) p.put(x, y, [126, 54, 40]);
    Props.outline(p);
    return { img: p.done(), w: cw, h: ch, door: dx + 26 };
  }

  function chapel(seed) {
    const r = U.rng(seed);
    const w = 56, cw = w + 16, ch = 100;
    const p = U.pix(cw, ch);
    const x0 = 8, yb = ch - 1, eave = yb - 40, wall = [218, 212, 196];
    for (let y = eave; y < yb; y++) for (let x = x0; x < x0 + w; x++) {
      const band = (y - eave) % 4;
      p.put(x, y, shadeWood(band === 0 ? U.shade(wall, 1.05) : band === 3 ? U.shade(wall, 0.84) : wall, r));
    }
    // roof
    for (let y = eave - 18; y < eave + 2; y++) {
      const half = Math.round(((y - (eave - 18)) / 20) * (w / 2 + 5));
      for (let x = x0 + w / 2 - half; x < x0 + w / 2 + half; x++) p.put(x, y, y % 3 === 0 ? [70, 60, 60] : [96, 86, 84]);
    }
    // steeple with a bell opening and a cross
    const sx = x0 + w / 2 - 7;
    for (let y = eave - 44; y < eave - 10; y++) for (let x = sx; x < sx + 14; x++) {
      let c = (y % 4 === 0) ? U.shade(wall, 0.85) : wall;
      if (y > eave - 38 && y < eave - 28 && x > sx + 3 && x < sx + 10) c = [30, 26, 28];
      p.put(x, y, c);
    }
    for (let y = eave - 52; y < eave - 44; y++) { const half = Math.round((y - (eave - 52)) / 8 * 9); for (let x = sx + 7 - half; x < sx + 7 + half; x++) p.put(x, y, [80, 70, 68]); }
    for (let y = eave - 60; y < eave - 52; y++) p.put(sx + 7, y, [70, 56, 44]);
    for (let x = sx + 4; x < sx + 11; x++) p.put(x, eave - 58, [70, 56, 44]);
    // arched coloured window and door
    for (let y = eave + 6; y < eave + 22; y++) for (let x = x0 + 40; x < x0 + 50; x++) {
      if (y < eave + 10 && Math.hypot(x - x0 - 45, y - eave - 10) > 5) continue;
      p.put(x, y, [[170, 50, 50], [60, 90, 170], [220, 180, 60]][(x + y) % 3]);
    }
    const dx = x0 + 14;
    for (let y = yb - 24; y < yb; y++) for (let x = dx; x < dx + 14; x++) {
      if (y < yb - 18 && Math.hypot(x - dx - 7, y - (yb - 18)) > 7) continue;
      p.put(x, y, x < dx + 9 ? [20, 14, 12] : [110, 80, 54]);
    }
    for (let x = x0 - 2; x < x0 + w + 2; x++) { p.put(x, yb, [150, 120, 90]); }
    Props.outline(p);
    return { img: p.done(), w: cw, h: ch, door: dx + 6 };
  }

  function waystation(seed) {
    const r = U.rng(seed);
    const w = 106, h = 46, cw = w + 16, ch = h + 4;
    const p = U.pix(cw, ch);
    const x0 = 8, yb = ch - 1, top = yb - h + 10, wall = [176, 136, 96];
    for (let y = top; y < yb; y++) for (let x = x0; x < x0 + w; x++) {
      let c = (x - x0) % 5 === 0 ? U.shade(wall, 0.7) : wall;
      p.put(x, y, shadeWood(c, r));
    }
    // flat roof with a sign board
    for (let y = top - 4; y < top; y++) for (let x = x0 - 3; x < x0 + w + 3; x++) p.put(x, y, y === top - 4 ? [150, 120, 90] : [100, 76, 54]);
    const sw = Font.width('WAY STATION') + 8, sxx = x0 + Math.floor((w - sw) / 2);
    for (let y = top - 14; y < top - 4; y++) for (let x = sxx; x < sxx + sw; x++) p.put(x, y, y === top - 14 || x === sxx || x === sxx + sw - 1 ? [110, 80, 50] : [190, 160, 116]);
    // porch roof + posts
    const pr = yb - 26;
    for (let x = x0 - 6; x < x0 + w + 6; x++) for (let k = 0; k < 3; k++) p.put(x, pr + k + (x > x0 + 70 ? 1 : 0), k === 0 ? [150, 120, 90] : [96, 72, 50]);
    for (const px of [x0 - 4, x0 + 50, x0 + w + 2]) for (let y = pr + 3; y < yb; y++) { p.put(px, y, [120, 90, 60]); p.put(px + 1, y, [86, 64, 44]); }
    // door + windows
    const dx = x0 + 18;
    for (let y = yb - 22; y < yb; y++) for (let x = dx; x < dx + 12; x++) p.put(x, y, x < dx + 9 ? [22, 16, 14] : [130, 100, 70]);
    for (const wx of [x0 + 60, x0 + 84]) for (let y = yb - 20; y < yb - 9; y++) for (let x = wx; x < wx + 11; x++) p.put(x, y, x === wx || x === wx + 10 || y === yb - 20 ? [110, 86, 60] : [26, 22, 22]);
    for (let k = 0; k < 11; k++) { p.put(x0 + 84 + k, yb - 20 + k, [160, 120, 80]); }
    Props.outline(p);
    const c = p.done();
    Font.draw(c.getContext('2d'), 'WAY STATION', sxx + 4, top - 12, '#5a3a22');
    return { img: c, w: cw, h: ch, door: dx + 6 };
  }

  function abandoned(type, seed) {
    if (type === 'farmhouse') return farmhouse(seed);
    if (type === 'adobe') return adobe(seed);
    if (type === 'barn') return barn(seed);
    if (type === 'chapel') return chapel(seed);
    if (type === 'waystation') return waystation(seed);
    return shack(seed);
  }

  // ------------------------------------------------------------- scenery
  function saguaro(seed, hgt) {
    const r = U.rng(seed);
    const cw = 30, ch = hgt + 4;
    const p = U.pix(cw, ch);
    const G = [78, 138, 70], g = [54, 104, 56], gg = [38, 74, 44], hi = [120, 176, 92];
    const yb = ch;
    function col(cx, y0, y1, w) {
      for (let y = y0; y < y1; y++) for (let x = cx; x < cx + w; x++) {
        let c = G;
        if (x === cx) c = gg; else if (x === cx + 1) c = g; else if (x === cx + w - 2) c = hi;
        if ((y + x) % 3 === 0 && (x === cx + 2 || x === cx + w - 3)) c = g;
        p.put(x, y, c);
      }
      for (let x = cx + 1; x < cx + w - 1; x++) p.put(x, y0 - 1, x > cx + 1 ? hi : G);
    }
    const x0 = 12;
    col(x0, yb - hgt + 1, yb, 6);
    const armY = yb - Math.floor(hgt * (0.45 + r() * 0.2));
    if (r() < 0.85) { // left arm
      for (let x = x0 - 6; x < x0; x++) for (let y = armY; y < armY + 4; y++) p.put(x, y, y === armY ? hi : G);
      col(x0 - 7, armY - Math.floor(hgt * 0.3), armY + 4, 4);
    }
    if (r() < 0.7) { // right arm
      const ay = armY - 5;
      for (let x = x0 + 6; x < x0 + 12; x++) for (let y = ay; y < ay + 4; y++) p.put(x, y, y === ay ? hi : G);
      col(x0 + 11, ay - Math.floor(hgt * 0.22), ay + 4, 4);
    }
    outline(p, [30, 50, 30]);
    for (let i = 0; i < hgt / 2; i++) {
      const y = yb - Math.floor(r() * hgt);
      if (p.has(x0 - 1, y) && !p.has(x0 - 2, y)) p.put(x0 - 1, y, [232, 224, 180]);
      if (p.has(x0 + 6, y)) p.put(x0 + 6, y, [232, 224, 180]);
    }
    if (r() < 0.5) { p.put(x0 + 2, yb - hgt - 1, [240, 90, 110]); p.put(x0 + 3, yb - hgt - 1, [250, 220, 120]); }
    return p.done();
  }

  function fromRows(rows, pal, out = OUT) {
    return Sprites.build(rows, pal, out);
  }

  const barrelCactus = () => fromRows(['..g..', '.GGG.', 'GGHGG', 'GgHgG', '.GGG.'],
    { G: [78, 138, 70], g: [240, 90, 110], H: [120, 176, 92] }, [30, 50, 30]);
  const skull = () => {
    const c = fromRows(['W.....W', 'W.WWWW.W', '.WWEWEW', '.WWWWWW', '..WWWW.', '..W.WW.W'],
      { W: [236, 226, 200], E: [40, 30, 30] }, [90, 70, 60]);
    return c;
  };
  function rock(seed) {
    const r = U.rng(seed);
    const w = 6 + Math.floor(r() * 10), h = 3 + Math.floor(r() * 5);
    const p = U.pix(w + 2, h + 2);
    for (let y = 0; y < h; y++) {
      const inset = Math.max(0, Math.floor((h - y) * 0.6) - 1);
      for (let x = inset; x < w - inset; x++) p.put(x + 1, y + 1, y === 0 ? [196, 160, 128] : x > w * 0.6 ? [130, 96, 80] : [160, 124, 100]);
    }
    outline(p, [80, 56, 44]);
    return p.done();
  }
  function deadTree(seed) {
    const r = U.rng(seed);
    const p = U.pix(30, 40);
    const C = [96, 74, 56], c = [70, 52, 40];
    function branch(x, y, ang, len, th) {
      for (let i = 0; i < len; i++) {
        x += Math.cos(ang); y -= Math.sin(ang);
        for (let t = 0; t < th; t++) p.put(x + t, y, t === 0 ? c : C);
      }
      if (len > 5) {
        branch(x, y, ang + 0.5 + r() * 0.3, len * 0.6, Math.max(1, th - 1));
        branch(x, y, ang - 0.5 - r() * 0.3, len * 0.55, Math.max(1, th - 1));
      }
    }
    branch(14, 39, Math.PI / 2, 18, 3);
    outline(p, [44, 30, 22]);
    return p.done();
  }
  function fence(seed) {
    const r = U.rng(seed);
    const p = U.pix(48, 16);
    for (let i = 0; i < 6; i++) {
      if (r() < 0.2) continue;
      const x = i * 8 + 1, lean = r() < 0.3 ? 1 : 0;
      for (let y = 2; y < 16; y++) { p.put(x + (y < 6 ? lean : 0), y, [110, 74, 46]); p.put(x + 1 + (y < 6 ? lean : 0), y, [86, 58, 36]); }
      if (i < 5 && r() < 0.8) for (let xx = x; xx < x + 8; xx++) { p.put(xx, 5, [130, 90, 56]); p.put(xx, 10 + (r() < 0.2 ? 1 : 0), [130, 90, 56]); }
    }
    outline(p, [50, 32, 22]);
    return p.done();
  }
  function signpost(text) {
    const tw = Font.width(text) + 8;
    const p = U.pix(tw + 4, 30);
    for (let y = 8; y < 30; y++) { p.put(tw / 2 + 1, y, [110, 76, 48]); p.put(tw / 2 + 2, y, [84, 56, 34]); }
    for (let y = 2; y < 11; y++) for (let x = 2; x < tw + 2; x++) p.put(x, y, y === 2 ? [196, 150, 100] : y === 10 ? [110, 76, 48] : [164, 120, 78]);
    outline(p);
    const c = p.done();
    Font.draw(c.getContext('2d'), text, 6, 4, '#3a2416');
    return c;
  }
  function tumbleweed() {
    const p = U.pix(14, 14);
    for (let a = 0; a < 360; a += 9) {
      for (const rad of [2, 4, 5, 6]) {
        const x = 7 + rad * Math.cos((a + rad * 25) * Math.PI / 180), y = 7 + rad * Math.sin((a + rad * 25) * Math.PI / 180);
        p.put(x, y, rad < 5 ? [160, 120, 70] : [120, 86, 50]);
      }
    }
    return p.done();
  }
  function rockslide() {
    const r = U.rng(99);
    const p = U.pix(140, 80);
    for (let i = 0; i < 46; i++) {
      const bx = 10 + r() * 120, by = 30 + r() * 46 + Math.abs(bx - 70) * 0.3, rad = 5 + r() * 11;
      for (let y = -rad; y < rad; y++) for (let x = -rad * 1.2; x < rad * 1.2; x++) {
        if ((x * x) / 1.44 + y * y > rad * rad) continue;
        const shade = y < -rad * 0.4 ? [206, 120, 84] : x > rad * 0.3 ? [140, 70, 54] : [176, 92, 66];
        p.put(bx + x, by + y, shade);
      }
    }
    outline(p, [80, 36, 28]);
    return p.done();
  }
  function trough() {
    return fromRows(['WWWWWWWWWWWWWWWWWW', 'WbbbbbbbbbbbbbbbbW', 'WbBBBBBBBBBBBBBBbW', 'wwwwwwwwwwwwwwwwww', '.w..............w.', '.w..............w.'],
      { W: [140, 98, 60], w: [100, 68, 42], b: [70, 100, 130], B: [110, 150, 180] });
  }
  function barrels() {
    return fromRows(['.hHHHHh..hHHHh.', 'hHHHHHHh.hHHHHh', 'bbbbbbbb.bbbbbb', 'hHHHHHHh.hHHHHh', 'hHHHHHHh.hHHHHh', 'bbbbbbbb.bbbbbb', 'hHHHHHHh.hHHHHh', '.hHHHHh...hHHh.'],
      { H: [150, 100, 58], h: [110, 70, 40], b: [70, 66, 66] });
  }
  function hitchPost() {
    return fromRows(['hHHHHHHHHHHHHHHHh', 'h...............h', 'h...............h', 'h...............h', 'h...............h', 'h...............h'],
      { H: [140, 98, 60], h: [100, 68, 42] });
  }

  // ------------------------------------------------------- interior props
  const WOOD = { H: [150, 104, 62], h: [110, 74, 44], d: [74, 48, 30], m: [190, 150, 90], k: [40, 26, 18] };
  const containers = {
    crate: {
      closed: fromRows(['HHHHHHHHHHHHHHHH', 'HdddddddddddddhH', 'HdH..........HhH', 'Hd.H........H.hH', 'Hd..H......H..hH', 'Hd...H....H...hH', 'Hd....H..H....hH', 'Hd.....HH.....hH', 'Hd.....HH.....hH', 'Hd....H..H....hH', 'Hd...H....H...hH', 'Hd..H......H..hH', 'HdH..........HhH', 'HhhhhhhhhhhhhhhH'].map(r => r.replace(/\./g, 'h')), WOOD),
      open: fromRows(['......HHHHHHHHHHHHH', '...HHHHHHHHHHHH....', 'HkkkkkkkkkkkkkkkH', 'HdkkkkkkkkkkkkkhH', 'Hdhhhhhhhhhhhhh.H', 'Hdhhhhhhhhhhhhh.H', 'Hdhhhhhhhhhhhhh.H', 'Hdhhhhhhhhhhhhh.H', 'Hdhhhhhhhhhhhhh.H', 'Hdhhhhhhhhhhhhh.H', 'Hdhhhhhhhhhhhhh.H', 'Hdhhhhhhhhhhhhh.H', 'HhhhhhhhhhhhhhhhH'].map(r => r.replace(/\./g, 'h')), WOOD),
    },
    barrel: {
      closed: fromRows(['..hHHHHHHh..', '.hHHHHHHHHh.', 'hbbbbbbbbbbh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hbbbbbbbbbbh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hbbbbbbbbbbh', '.hHHHHHHHHh.', '..hhhhhhhh..'],
        Object.assign({ b: [70, 66, 66] }, WOOD)),
      open: fromRows(['..kkkkkkkk..', '.hkkkkkkkkh.', 'hbbbbbbbbbbh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hbbbbbbbbbbh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hHHHHmHHHHHh', 'hbbbbbbbbbbh', '.hHHHHHHHHh.', '..hhhhhhhh..'],
        Object.assign({ b: [70, 66, 66] }, WOOD)),
    },
    dresser: {
      closed: fromRows(['mmmmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHHHH', 'HddddddddddddddddddddH', 'HhHHHHHHHHHHHHHHHHHHhH', 'HhHHHHHHHmmHHHHHHHHHhH', 'HhhhhhhhhhhhhhhhhhhhhH', 'HhHHHHHHHHHHHHHHHHHHhH', 'HhHHHHHHHmmHHHHHHHHHhH', 'HhhhhhhhhhhhhhhhhhhhhH', 'HhHHHHHHHHHHHHHHHHHHhH', 'HhHHHHHHHmmHHHHHHHHHhH', 'HhhhhhhhhhhhhhhhhhhhhH', 'Hd..................dH', 'Hd..................dH'].map(r => r.replace(/\./g, 'd')), WOOD),
      open: fromRows(['mmmmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHHHH', 'HddddddddddddddddddddH', 'HhHHHHHHHHHHHHHHHHHHhH', 'HhHHHHHHHmmHHHHHHHHHhH', 'HhhhhhhhhhhhhhhhhhhhhH', 'HkkkkkkkkkkkkkkkkkkkkHHHH', 'HkHHHHHHHHHHHHHHHHHHHHHHH', 'HhHHHHHHHHHHHHHHHHHmmHHHH', 'HhHHHHHHHHHHHHHHHHHHhH', 'HhHHHHHHHmmHHHHHHHHHhH', 'HhhhhhhhhhhhhhhhhhhhhH', 'Hd..................dH', 'Hd..................dH'].map(r => r.replace(/\./g, 'd')), WOOD),
    },
    cupboard: {
      closed: fromRows([...['mmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHH'], ...Array(22).fill('HhHHHHHHhHHHHHHHhH').map((r, i) => (i === 10 ? 'HhHHHHHmhmHHHHHHhH' : i === 0 || i === 21 ? 'HhhhhhhhhhhhhhhhhH' : r))], WOOD),
      open: fromRows([...['mmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHH'], ...Array(22).fill('HkkkkkkkkhHHHHHHhHH').map((r, i) => (i === 8 || i === 16 ? 'HmmmmmmmmhHHHHHHhHH' : i === 21 ? 'HhhhhhhhhhhhhhhhhH' : r))], WOOD),
    },
    trunk: {
      closed: fromRows(['..HHHHHHHHHHHHHHHH..', '.HmHHHHHHHHHHHHHHmH.', 'HHmhhhhhhhhhhhhhhmHH', 'bbbbbbbbbmmbbbbbbbbb', 'HHmHHHHHHmmHHHHHHmHH', 'HHmHHHHHHHHHHHHHHmHH', 'HHmHHHHHHHHHHHHHHmHH', 'HHmHHHHHHHHHHHHHHmHH', 'hhmhhhhhhhhhhhhhhmhh'],
        Object.assign({ b: [60, 60, 60] }, WOOD)),
      open: fromRows(['..HHHHHHHHHHHHHHHH..', '.HmHHHHHHHHHHHHHHmH.', 'HHmhhhhhhhhhhhhhhmHH', 'HHkkkkkkkkkkkkkkkkHH', 'kkkkkkkkkkkkkkkkkkkk', 'HHmHHHHHHmmHHHHHHmHH', 'HHmHHHHHHHHHHHHHHmHH', 'HHmHHHHHHHHHHHHHHmHH', 'hhmhhhhhhhhhhhhhhmhh'],
        Object.assign({ b: [60, 60, 60] }, WOOD)),
    },
    stove: {
      closed: fromRows(['......II', '......II', '......II', 'IIIIIIIIIIIIIIII', 'IiiiiiiiiiiiiiiI', 'IiIIIIIIIIIIIIiI', 'IiIkkkkkkkkkkIiI', 'IiIkkkkkkkkkkIiI', 'IiIkkkkkkkkkkIiI', 'IiIIIIIImIIIIIiI', 'IiiiiiiiiiiiiiiI', 'IiIIIIIIIIIIIIiI', 'IiIIIIIIIIIIIIiI', 'IiiiiiiiiiiiiiiI', 'I.I..........I.I'],
        { I: [80, 80, 86], i: [52, 52, 58], k: [30, 28, 30], m: [200, 170, 90] }),
      open: fromRows(['......II', '......II', '......II', 'IIIIIIIIIIIIIIII', 'IiiiiiiiiiiiiiiI', 'IiIIIIIIIIIIIIiI', 'IiIooooooooooIiI', 'IiIoOoOOooOoOIiI', 'IiIkkkkkkkkkkIiI', 'IiIIIIIImIIIIIiI', 'IiiiiiiiiiiiiiiI', 'IiIIIIIIIIIIIIiI', 'IiIIIIIIIIIIIIiI', 'IiiiiiiiiiiiiiiI', 'I.I..........I.I'],
        { I: [80, 80, 86], i: [52, 52, 58], k: [30, 28, 30], m: [200, 170, 90], o: [60, 40, 30], O: [120, 70, 40] }),
    },
  };
  const decor = {
    bed: fromRows(['H...................', 'H...................', 'HwwwwWWWWWWWWWWWWWWH', 'HwwwwrrrrrRrrrrRrrrH', 'HHHHHHHHHHHHHHHHHHHH', 'H..................H'],
      Object.assign({ w: [220, 214, 196], W: [180, 170, 150], r: [150, 60, 50], R: [120, 46, 40] }, WOOD)),
    table: fromRows(['mmmmmmmmmmmmmmmmmmmm', 'HHHHHHHHHHHHHHHHHHHH', '.h................h.', '.h................h.', '.h................h.', '.h................h.', '.h................h.', '.h................h.'], WOOD),
    chair: fromRows(['H.......', 'H.......', 'H.......', 'H.......', 'HHHHHHHH', 'h......h', 'h......h', 'h......h'], WOOD),
    frame: fromRows(['HHHHHHHHHH', 'HssssssssH', 'HsggggggsH', 'HsgGGggGsH', 'HsGGGGGGsH', 'HssssssssH', 'HHHHHHHHHH'],
      Object.assign({ s: [200, 180, 140], g: [130, 160, 190], G: [120, 100, 70] }, WOOD)),
  };

  return {
    building, shack, abandoned, saguaro, barrelCactus, skull, rock, deadTree, fence, signpost, tumbleweed, rockslide,
    trough, barrels, hitchPost, containers, decor, outline,
  };
})();
