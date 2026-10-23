// Town life: animals, chimney smoke, townsfolk schedules and greetings,
// the blacksmith's hammer, the windmill.
const Town = (() => {
  // --------------------------------------------------------- critters
  class Critter {
    constructor(def) {
      Object.assign(this, def);
      this.home = def.x; this.face = Math.random() < 0.5 ? 1 : -1; this.animT = 0;
      this.state = 'idle'; this.t = 1 + Math.random() * 3; this.vx = 0; this.tx = def.x;
    }
    update(dt, player) {
      this.t -= dt;
      const dx = player.x - this.x, near = Math.abs(dx) < 60;
      if (this.kind === 'dog') {
        // Rusty trots over to say hello, wags, wanders, sits
        if (near && Math.abs(dx) > 26 && this.state !== 'sit') { this.state = 'run'; this.tx = player.x - Math.sign(dx) * 22; }
        if (this.t <= 0) {
          this.t = 2 + Math.random() * 4;
          const roll = Math.random();
          if (near) this.state = 'wag';
          else if (roll < 0.35) this.state = 'sit';
          else if (roll < 0.8) { this.state = 'run'; this.tx = this.home + (Math.random() * 2 - 1) * this.range; }
          else this.state = 'idle';
          if (Math.random() < 0.15 && Math.abs(dx) < 220) Sound.sfx('bark');
        }
        if (this.state === 'run') {
          const d = this.tx - this.x;
          if (Math.abs(d) < 2) { this.state = near ? 'wag' : 'idle'; this.vx = 0; }
          else { this.vx = Math.sign(d) * (Math.abs(d) > 60 ? 70 : 40); this.face = Math.sign(d); }
        } else this.vx = 0;
      } else {
        // chickens peck, take a few steps, and scatter if you run at them
        const scared = Math.abs(dx) < 24 && player.running;
        if (scared) { this.state = 'flee'; this.t = 0.8; this.face = -Math.sign(dx) || 1; }
        if (this.t <= 0) {
          this.t = 0.6 + Math.random() * 2;
          const roll = Math.random();
          this.state = roll < 0.5 ? 'peck' : roll < 0.8 ? 'walk' : 'idle';
          if (this.state === 'walk') { this.tx = this.home + (Math.random() * 2 - 1) * this.range; this.face = Math.sign(this.tx - this.x) || 1; }
          if (Math.random() < 0.12 && Math.abs(dx) < 160) Sound.sfx('cluck');
        }
        if (this.state === 'flee') this.vx = this.face * 60;
        else if (this.state === 'walk' && Math.abs(this.tx - this.x) > 1) this.vx = Math.sign(this.tx - this.x) * 14;
        else this.vx = 0;
      }
      this.x += this.vx * dt;
      this.animT += dt * (Math.abs(this.vx) > 0 ? Math.abs(this.vx) / 8 : 2);
    }
    draw(ctx, camX) {
      const x = this.x - camX;
      if (x < -30 || x > W + 30) return;
      let frame;
      if (this.kind === 'dog') {
        const s = Sprites.creatures.dog;
        frame = this.state === 'run' ? (Math.floor(this.animT / 2) % 2 ? s.run0 : s.run1)
          : this.state === 'sit' ? s.sit : this.state === 'wag' ? (Math.floor(this.animT * 3) % 2 ? s.wag : s.stand) : s.stand;
        drawFrame(ctx, frame, x, GROUND - 1, this.face, 10);
      } else {
        const s = this.brown ? Sprites.creatures.chickenBrown : Sprites.creatures.chicken;
        frame = this.state === 'peck' ? (Math.floor(this.animT * 2) % 2 ? s.peck : s.stand)
          : this.vx ? (Math.floor(this.animT) % 2 ? s.walk : s.stand) : s.stand;
        drawFrame(ctx, frame, x, GROUND - 3, this.face, 5);
      }
    }
  }

  // -------------------------------------------------------------- smoke
  const smoke = [];
  let smokeT = 0;
  function spawnSmoke(dt, camX) {
    smokeT -= dt;
    if (smokeT > 0) return;
    smokeT = 0.18;
    for (const b of World.BUILDINGS) {
      if (b.x + b.img.width < camX - 40 || b.x > camX + W + 40) continue;
      for (const s of b.smoke) smoke.push({ x: b.x + s.x + (Math.random() - 0.5) * 2, y: 153 - b.img.height + s.y, life: 3.2, vx: 4 + Math.random() * 4, size: 2 });
    }
  }
  function drawSmoke(ctx, camX) {
    for (const q of smoke) {
      const a = Math.max(0, q.life / 3.2) * 0.55;
      ctx.fillStyle = `rgba(200,196,190,${a.toFixed(2)})`;
      const s = Math.round(q.size);
      ctx.fillRect(Math.round(q.x - camX), Math.round(q.y), s, s);
    }
  }

  // --------------------------------------------------------- windmill
  const millFrames = [];
  for (let i = 0; i < 6; i++) millFrames.push(Buildings.windmill(i / 6 * (Math.PI / 6)));

  // ---------------------------------------------------- townsfolk + misc
  const inHours = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);
  let clangT = 2;

  function update(dt, G, hour) {
    const p = G.player;
    // townsfolk keep hours; greet the sheriff once in a while as he passes
    for (const n of G.npcs) {
      n.present = !n.hours || inHours(hour, n.hours);
      if (!n.present || !n.greet) continue;
      const d = Math.abs(n.x - p.x);
      if (d < 34 && !G.bubbles.length && (!n.greetedAt || G.clock - n.greetedAt > 45)) {
        n.greetedAt = G.clock;
        G.bubbles.push({ who: n, text: U.pick(Math.random, n.greet), life: 2.6 });
      }
    }
    for (const c of G.critters) c.update(dt, p);
    spawnSmoke(dt, G.camX);
    for (const q of smoke) { q.x += q.vx * dt; q.y -= 9 * dt; q.size += dt * 1.2; q.life -= dt; }
    for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i].life <= 0) smoke.splice(i, 1);
    for (const b of G.bubbles) b.life -= dt;
    G.bubbles = G.bubbles.filter(b => b.life > 0);
    // Hank hammering at the anvil
    const hank = G.npcs.find(n => n.smith);
    if (hank && hank.present) {
      clangT -= dt;
      if (clangT <= 0) {
        clangT = 1.1 + Math.random() * 0.5;
        if (Math.abs(hank.x - p.x) < 200) Sound.sfx('clang');
        for (let i = 0; i < 5; i++) G.particles.push({ x: hank.x - 12, y: GROUND - 24, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 50, life: 0.35, col: '#ffd070' });
      }
    }
  }

  function drawBubbles(ctx, camX) {
    for (const b of G_bubbles()) {
      const text = b.text, tw = Font.width(text);
      const x = Math.round(b.who.x - camX - tw / 2), y = Math.round((b.who.y !== undefined ? b.who.y : GROUND) - 78);
      ctx.fillStyle = 'rgba(244,236,214,.95)'; ctx.fillRect(x - 3, y - 3, tw + 6, 11);
      ctx.fillStyle = '#2b1a12'; ctx.fillRect(x - 3, y + 8, tw + 6, 1); ctx.fillRect(x - 4, y - 2, 1, 9); ctx.fillRect(x + tw + 3, y - 2, 1, 9); ctx.fillRect(x - 3, y - 4, tw + 6, 1);
      ctx.fillStyle = 'rgba(244,236,214,.95)'; ctx.fillRect(Math.round(b.who.x - camX) - 1, y + 8, 3, 2);
      Font.draw(ctx, text, x, y, '#2b1a12');
    }
  }
  let G_bubbles = () => [];
  function bind(G) { G_bubbles = () => G.bubbles; }

  return { Critter, update, drawSmoke, drawBubbles, bind, millFrames, inHours };
})();
