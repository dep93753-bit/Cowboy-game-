// The lawman, enemies, townsfolk and small effects.

// Draw a sprite frame anchored at its feet. Sprites face right; flip for left.
function drawFrame(ctx, frame, x, y, face, anchor, flash) {
  const img = flash ? frame.flash : frame.img;
  // positions snap to the 2px pixel grid so every sprite shares one pixel size
  const dx = U.snap(x), dy = U.snap(y) - img.height + 2;
  if (face >= 0) ctx.drawImage(img, dx - anchor, dy);
  else {
    ctx.save();
    ctx.translate(dx, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -anchor, dy);
    ctx.restore();
  }
}

// Walk to a random spot near home, stop, wait a few seconds, repeat.
// Returns true while actually moving (so the walk animation only plays then).
function wanderStep(o, dt, range, speed) {
  if (o.pause > 0) { o.pause -= dt; return false; }
  if (o.tx === undefined) o.tx = o.home + (Math.random() * 2 - 1) * range;
  const dx = o.tx - o.x;
  if (Math.abs(dx) < 1) { o.x = o.tx; o.tx = undefined; o.pause = 1.5 + Math.random() * 4; return false; }
  const dir = Math.sign(dx);
  o.x += dir * Math.min(speed * dt, Math.abs(dx));
  o.face = dir;
  o.animT += dt * speed / 7;   // one walk frame per ~7px travelled
  return true;
}

class Player {
  constructor(x) {
    this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0;
    this.face = 1; this.onGround = true;
    this.animT = 0; this.punchT = 0; this.punchHit = false;
    this.blocking = false; this.blockAge = 0;
    this.invuln = 0; this.flashT = 0;
    this.dead = false; this.lying = false;
    this.level = 'street'; this.floor = GROUND;   // Silverbend's ledge is a second floor
  }
  setLevel(level) {
    this.level = level;
    this.floor = level === 'ledge' ? Buildings.LEDGE_Y : GROUND;
    this.y = this.floor; this.vy = 0; this.onGround = true;
  }

  get speedMul() { return Game.data.energy <= 0 ? 0.6 : 1; }

  update(dt, control, bounds) {
    const I = Input;
    let move = 0;
    if (control && !this.dead) {
      if (I.down('left')) move -= 1;
      if (I.down('right')) move += 1;
    }
    const wantBlock = control && !this.dead && I.down('block') && this.onGround && !this.mounted;
    if (wantBlock && !this.blocking) this.blockAge = 0;
    this.blocking = wantBlock;
    if (this.blocking) this.blockAge += dt;

    if (control && !this.dead && !this.mounted && I.pressed('punch') && this.punchT <= 0 && !this.blocking) {
      this.punchT = 0.34; this.punchHit = false;
      Sound.sfx('punch');
    }
    if (this.punchT > 0) {
      this.punchT -= dt;
      if (!this.punchHit && this.punchT < 0.24) { this.punchHit = true; Game.playerPunch(this); }
    }

    const running = control && I.down('run') && Game.data.energy > 0 && move !== 0;
    this.running = running;
    let speed = this.mounted ? (running ? 180 : 82) * Game.horseSpeed() : (running ? 94 : 54) * this.speedMul;
    // wading across a river is slow going (and splashy)
    if (!this.mounted && Game.inRiver(this.x)) { speed *= 0.55; if (Math.abs(this.vx) > 10 && Math.random() < dt * 14) for (let i = 0; i < 2; i++) Game.particles.push({ x: this.x + (Math.random() - 0.5) * 16, y: GROUND + World.WATER - 2, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, life: 0.5, col: '#cfe6f4' }); }
    if (this.punchT > 0.05 || this.blocking) speed = 0;
    if (move !== 0 && !(this.punchT > 0)) this.face = move;

    // knockback decays, input steers
    const target = move * speed;
    if (this.onGround) this.vx = U.lerp(this.vx, target, Math.min(1, dt * 14));
    else this.vx = U.lerp(this.vx, target, Math.min(1, dt * 4));

    if (control && !this.dead && !this.mounted && I.pressed('jump') && this.onGround && !this.blocking) {
      this.vy = -175; this.onGround = false;
      Sound.sfx('jump');
    }
    this.vy += 520 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= this.floor) {
      if (!this.onGround && this.vy > 120) { Sound.sfx('land'); Game.dust(this.x, this.floor, 4); }
      this.y = this.floor; this.vy = 0; this.onGround = true;
    }
    this.x = U.clamp(this.x, bounds[0], bounds[1]);

    if (Math.abs(this.vx) > 5 && this.onGround) {
      const step = Math.floor(this.animT / 2);
      this.animT += dt * Math.abs(this.vx) / 20;
      // a footstep each time a foot lands, on whatever floor we're on
      if (!this.mounted && Math.floor(this.animT / 2) !== step) {
        const I = Game.scene === 'interior' ? Game.interior : null;
        const dirt = !I || (I.house && (I.house.type === 'adobe' || I.house.type === 'barn')) || (I.building && I.building.id === 'stable');
        Sound.sfx(dirt ? 'stepSand' : 'stepWood');
      }
      if (running && Math.random() < dt * 10) Game.dust(this.x - this.face * 6, this.floor, 1);
    } else this.animT = 0;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flashT > 0) this.flashT -= dt;
  }

  // Returns how much damage actually landed.
  hurt(dmg, fromX, attacker) {
    if (this.dead || this.invuln > 0) return 0;
    const facingAttacker = Math.sign(fromX - this.x) === this.face || Math.abs(fromX - this.x) < 3;
    if (this.blocking && facingAttacker) {
      const glove = GLOVES[Game.data.gloves || 0];
      if (this.blockAge < 0.3) {
        Sound.sfx('perfect');
        Game.floater(this.x, this.y - 68, 'PERFECT!', '#f2c94c');
        if (attacker) attacker.stun(1.3);
        Game.spark(this.x + this.face * 10, this.y - 38, '#fff3b0');
        return 0;
      }
      Sound.sfx('block');
      const chip = Math.round(dmg * 0.2 * (1 - glove.guard));
      if (attacker) attacker.stun(0.55);
      this.vx = -this.face * 40;
      Game.spark(this.x + this.face * 10, this.y - 38, '#ffffff');
      if (chip > 0) Game.damage(chip);
      return chip;
    }
    Sound.sfx('hurt');
    this.invuln = 0.8; this.flashT = 0.15;
    this.vx = Math.sign(this.x - fromX || 1) * 90; this.vy = -70; this.onGround = false;
    this.punchT = 0;
    Game.damage(dmg);
    Game.shake(3);
    return dmg;
  }

  // The sheriff's frames, built from the look chosen in the customiser.
  get set() { return Chars.build(Chars.sheriffLook(Game.data.look)); }

  pose() {
    if (this.climb) return 'climb';
    if (this.punchT > 0.06) return 'punch';
    if (this.blocking) return 'block';
    if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
    if (this.invuln > 0.6) return 'hurt';
    if (Math.abs(this.vx) > 5) return this.running ? 'run' : 'walk';
    return 'idle';
  }

  frame() {
    const pose = this.pose();
    if (this.lying) { this.deadT = (this.deadT || 0) + 1 / 60; return Chars.frame(this.set, 'dead', this.deadT * 9); }
    const t = pose === 'punch' ? (0.34 - this.punchT) / 0.34 * 6 : pose === 'idle' ? Game.clock * 6 : pose === 'climb' ? this.climb.t * 14 : this.animT * 2;
    return Chars.frame(this.set, pose, t);
  }

  draw(ctx, camX) {
    if (!this.lying && this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0) return;
    drawFrame(ctx, this.frame(), this.x - camX, this.y, this.face, Chars.ANCHOR, this.flashT > 0);
  }
}

// ------------------------------------------------------------------ enemies
const ENEMY_TYPES = {
  snake: { name: 'Rattlesnake', hp: 22, speed: 16, aggro: 80, range: 26, windup: 0.7, recover: 0.8, dmg: 12, half: 14, anchor: 18,
    loot: { snakemeat: 0.6, rattle: 0.35 } },
  coyote: { name: 'Coyote', hp: 28, speed: 74, aggro: 160, range: 28, windup: 0.5, recover: 0.7, dmg: 10, half: 20, anchor: 26,
    loot: { pelt: 0.7 } },
  bear: { name: 'Bear', hp: 90, speed: 52, aggro: 150, range: 34, windup: 0.75, recover: 0.9, dmg: 22, half: 24, anchor: 24,
    loot: { bearpelt: 0.9, jerky: 0.3 } },
  // bison graze in herds and only charge if one is hit, or if you get close at night
  bison: { name: 'Bison', hp: 80, speed: 96, aggro: 100, range: 36, windup: 0.6, recover: 1.1, dmg: 26, half: 26, anchor: 30, passive: true,
    loot: { steak: 0.8, hide: 0.7 } },
  outlaw: { name: 'Outlaw', hp: 48, speed: 46, aggro: 130, range: 22, windup: 0.6, recover: 0.75, dmg: 15, half: 6, anchor: Chars.ANCHOR,
    loot: { money: 1, jerky: 0.3, bandage: 0.2 } },
};

class Enemy {
  constructor(type, x, opts = {}) {
    this.type = type; this.def = ENEMY_TYPES[type];
    this.x = x; this.y = GROUND; this.vx = 0;
    // canyon enemies are tougher: more health, harder hits
    this.mul = opts.tough ? 1.25 : 1;
    this.hp = Math.round(this.def.hp * this.mul); this.face = -1;
    this.state = 'idle'; this.t = 0; this.animT = 0;
    this.flashT = 0; this.deadT = 0;
    this.home = x; this.fixedId = opts.fixedId;
    this.alerted = false;
    if (type === 'outlaw') this.look = ['outlaw', 'outlaw2', 'outlaw3'][Math.floor(Math.abs(x) / 7) % 3];
    if (type === 'bear') this.black = Math.floor(Math.abs(x) / 13) % 2 === 0;
  }

  get alive() { return this.state !== 'dead'; }

  stun(sec) {
    if (!this.alive) return;
    this.state = 'stun'; this.t = sec;
  }

  hit(dmg, fromX) {
    if (!this.alive) return;
    // hit one bison and the whole herd turns on you
    if (this.def.passive) for (const e of Game.enemies) if (e.type === this.type && Math.abs(e.x - this.x) < 240) { e.angry = true; e.calmT = 14; }
    this.hp -= dmg;
    this.flashT = 0.12;
    this.vx = Math.sign(this.x - fromX || 1) * 110;
    Game.floater(this.x, GROUND - this.height() - 6, String(dmg), '#ffffff');
    if (this.hp <= 0) {
      this.state = 'dead'; this.deadT = 1.2;
      Sound.sfx('ko');
      Game.enemyDefeated(this);
      return;
    }
    Sound.sfx('hit');
    // a hit interrupts a wind-up, so aggressive play is rewarded
    this.state = 'hurt'; this.t = 0.3;
  }

  height() { return { outlaw: 60, coyote: 24, bison: 36, bear: 30 }[this.type] || 16; }

  update(dt, player) {
    const d = this.def;
    this.t -= dt;
    this.flashT -= dt;
    this.moving = false;
    const dx = player.x - this.x, dist = Math.abs(dx);
    const fire = Game.campfireNear(this.x, 70) && Game.isNight();

    // knockback slide
    this.x += this.vx * dt;
    this.vx = U.lerp(this.vx, 0, Math.min(1, dt * 8));

    switch (this.state) {
      case 'dead':
        this.deadT -= dt;
        return;
      case 'idle': {
        if (d.passive) {
          // grazing: amble about, head down now and then
          this.moving = wanderStep(this, dt, 60, 9);
          this.grazing = !this.moving && Math.sin(Game.clock * 0.7 + this.home) > -0.3;
          const night = Game.isNight() && dist < d.aggro;
          if (!(this.angry || night) || player.dead) break;
          this.state = 'chase';
          break;
        }
        if (this.type !== 'snake') this.moving = wanderStep(this, dt, 30, d.speed * 0.35);
        if (dist < d.aggro && !player.dead && !Game.data.sleeping) {
          this.state = 'chase';
          if (!this.alerted) {
            this.alerted = true;
            if (this.type === 'snake') Sound.sfx('rattle');
            if (this.type === 'coyote') Sound.sfx('growl');
            if (this.type === 'bear' || this.type === 'bison') Sound.sfx('roar');
          }
        }
        break;
      }
      case 'chase': {
        if (Math.abs(dx) > 2) this.face = Math.sign(dx);
        if (fire && this.type === 'coyote') {
          // coyotes are scared of the campfire
          this.x -= Math.sign(Game.campfireX() - this.x || 1) * d.speed * dt;
          this.moving = true;
          this.face = -Math.sign(Game.campfireX() - this.x || 1);
          this.animT += dt * 6;
          break;
        }
        if (d.passive && this.angry && (this.calmT -= dt) <= 0 && dist > d.aggro) { this.angry = false; this.state = 'idle'; break; }
        if (dist > d.aggro * 1.8 || player.dead) { this.state = 'idle'; this.angry = false; break; }
        if (dist > d.range) {
          this.x += this.face * d.speed * dt;
          this.animT += dt * d.speed / 7;
          this.moving = true;
        } else {
          this.state = 'windup'; this.t = d.windup;
          if (this.type === 'snake') Sound.sfx('rattle');
          Game.firstWindup();
        }
        break;
      }
      case 'windup':
        this.face = Math.sign(dx) || this.face;
        if (this.t <= 0) {
          this.state = 'attack'; this.t = 0.18;
          // lunge
          this.x += this.face * ({ coyote: 10, snake: 8, bison: 16, bear: 18 }[this.type] || 4);
          if (dist < d.range + 8 && player.y > GROUND - 22) player.hurt(Math.round(d.dmg * this.mul), this.x, this);
        }
        break;
      case 'attack':
        if (this.t <= 0) { this.state = 'recover'; this.t = d.recover; }
        break;
      case 'recover':
      case 'hurt':
      case 'stun':
        if (this.t <= 0) this.state = 'chase';
        break;
    }
  }

  draw(ctx, camX) {
    const x = this.x - camX;
    if (x < -40 || x > W + 40) return;
    if (this.state === 'dead') {
      if (Math.floor(this.deadT * 10) % 2 === 0) return;
    }
    const flash = this.flashT > 0;
    let shake = 0;
    if (this.state === 'windup') shake = Math.floor(Game.clock * 30) % 2 ? 1 : -1;
    let frame, anchor = this.def.anchor;
    if (this.type === 'snake') {
      const s = Sprites.creatures.snake;
      frame = this.state === 'attack' ? s.strike : this.state === 'windup' || this.state === 'chase' ? (Math.floor(Game.clock * 8) % 2 ? s.rattle : s.idle) : s.idle;
    } else if (this.type === 'coyote') {
      const s = Fauna.sets.coyote; anchor = s.anchor;
      frame = this.state === 'attack' ? s.bite
        : this.moving ? Fauna.cycle(this.state === 'chase' ? s.run : s.walk, this.animT / 2) : s.stand;
    } else if (this.type === 'bison') {
      const s = Fauna.sets.bison; anchor = s.anchor;
      frame = this.state === 'attack' || (this.moving && this.state === 'chase') ? Fauna.cycle(s.run, this.animT / 2) : this.moving ? Fauna.cycle(s.walk, this.animT / 2) : this.grazing ? s.graze : s.stand;
    } else if (this.type === 'bear') {
      const s = this.black ? Fauna.sets.blackbear : Fauna.sets.bear; anchor = s.anchor;
      frame = this.state === 'windup' ? s.crouch : this.state === 'attack' ? s.lunge : this.moving ? Fauna.cycle(s.walk, this.animT / 2) : s.stand;
    } else {
      const s = Chars.person(this.look || 'outlaw');
      const st = this.state === 'attack' ? 'punch' : this.state === 'windup' ? 'windup' : this.state === 'hurt' || this.state === 'stun' ? 'hurt'
        : this.moving ? (this.state === 'chase' ? 'run' : 'walk') : 'idle';
      frame = Chars.frame(s, st, st === 'punch' ? 2 : st === 'idle' ? Game.clock * 6 : this.animT * 2);
    }
    if (this.state === 'dead') {
      ctx.globalAlpha = Math.max(0, this.deadT);
    }
    drawFrame(ctx, frame, x + shake, GROUND, this.face, anchor, flash);
    ctx.globalAlpha = 1;
    if (this.state === 'windup' && Math.floor(Game.clock * 10) % 2 === 0) {
      Font.draw(ctx, '!', Math.round(x) - 1, GROUND - this.height() - 14, '#ff4a3a', 2);
    }
    if (this.state === 'stun') {
      const a = Game.clock * 6;
      ctx.fillStyle = '#f2c94c';
      for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(x + Math.cos(a + i * 2.1) * 6), Math.round(GROUND - this.height() - 6 + Math.sin(a + i * 2.1) * 2), 2, 2);
    }
  }
}

// ---------------------------------------------------------------- townsfolk
class NPC {
  constructor(def) {
    Object.assign(this, def);
    this.def = def; this.home = def.x; this.face = def.face || 1; this.animT = 0; this.walking = false;
  }
  update(dt, player) {
    const near = Math.abs(player.x - this.x) < 40 && (this.level || 'street') === player.level;
    this.workT = (this.workT || Math.random()) + dt;
    if (this.work === 'travel') {
      // travelers walk the trail between two points, turning round at each end;
      // they stop to talk when you're right there
      if (near) { this.walking = false; this.face = Math.sign(player.x - this.x) || this.face; return; }
      const [a, b] = this.range;
      if (!this.dir) this.dir = this.face || 1;
      if (this.pause > 0) { this.pause -= dt; this.walking = false; return; }
      const sp = this.speed || 20;
      this.x += this.dir * sp * dt; this.face = this.dir; this.walking = true; this.animT += dt * sp / 7;
      if (this.x > b || this.x < a) { this.x = U.clamp(this.x, a, b); this.dir *= -1; this.pause = 3 + Math.random() * 4; }
      return;
    }
    if (this.work === 'cart') {
      // push the ore cart up and down the rails; pause to chat if you're close
      if (near) { this.walking = false; this.face = Math.sign(player.x - this.x) || this.face; return; }
      const [a, b] = this.range;
      if (!this.dir) this.dir = 1;
      if (this.pause > 0) { this.pause -= dt; this.walking = false; return; }
      this.x += this.dir * 22 * dt; this.face = this.dir; this.walking = true; this.animT += dt * 22 / 7;
      if (this.x > b || this.x < a) { this.x = U.clamp(this.x, a, b); this.dir *= -1; this.pause = 2 + Math.random() * 2; }
      return;
    }
    if (this.work === 'plow' || this.work === 'carry') {
      // walk the furrow (or the hay run) up and back, pausing at each end
      if (near) { this.walking = false; this.face = Math.sign(player.x - this.x) || this.face; return; }
      const [a, b] = this.range, sp = this.work === 'plow' ? 9 : 18;
      if (!this.dir) this.dir = this.face || 1;
      if (this.pause > 0) { this.pause -= dt; this.walking = false; return; }
      this.x += this.dir * sp * dt; this.face = this.dir; this.walking = true; this.animT += dt * sp / 7;
      if (this.work === 'plow' && Math.random() < dt * 6) Game.particles.push({ x: this.x - this.dir * 8, y: GROUND - 2, vx: -this.dir * 10, vy: -20 - Math.random() * 20, life: 0.5, col: '#7a5a3a' });
      if (this.x > b || this.x < a) { this.x = U.clamp(this.x, a, b); this.dir *= -1; this.pause = 2 + Math.random() * 3; }
      return;
    }
    if (this.work === 'hoe' || this.work === 'feed') {
      if (near) { this.face = Math.sign(player.x - this.x) || this.face; this.swinging = false; return; }
      this.face = this.def.face || this.face;
      const per = this.work === 'hoe' ? 1.6 : 2.4, ph = (this.workT % per) / per, was = this.swinging;
      this.swinging = ph > 0.6;
      if (this.swinging && !was && Math.abs(player.x - this.x) < 240) {
        const col = this.work === 'hoe' ? '#6e5236' : '#e8d28a';
        for (let i = 0; i < 6; i++) Game.particles.push({ x: this.x + this.face * (this.work === 'hoe' ? 28 : 16), y: (this.work === 'hoe' ? GROUND - 2 : GROUND - 36), vx: this.face * (10 + Math.random() * 40), vy: this.work === 'hoe' ? -30 - Math.random() * 30 : -10 - Math.random() * 20, life: 0.6, col });
      }
      return;
    }
    if (this.work === 'milk') { if (near) this.face = Math.sign(player.x - this.x) || this.face; return; }
    if (this.work === 'pick') {
      if (near) { this.face = Math.sign(player.x - this.x) || this.face; this.swinging = false; return; }
      this.face = this.def.face || this.face;
      // a swing every 1.3s: the pick comes down with a clink and sparks
      const ph = (this.workT % 1.3) / 1.3, was = this.swinging;
      this.swinging = ph > 0.55;
      if (this.swinging && !was && Math.abs(player.x - this.x) < 220) {
        Sound.sfx('clang');
        for (let i = 0; i < 4; i++) Game.spark(this.x + this.face * 26, (this.y || GROUND) - 2, '#ffe2a0');
      }
      return;
    }
    if (this.wander && !near) {
      this.walking = wanderStep(this, dt, this.wander, 18);
    } else if (!this.wander && Math.abs(this.home - this.x) > 1) {
      // walk back to their usual spot (e.g. Hollis after the intro)
      const dir = Math.sign(this.home - this.x);
      this.x += dir * Math.min(30 * dt, Math.abs(this.home - this.x));
      this.walking = true; this.face = dir; this.animT += dt * 30 / 7;
    } else {
      this.walking = false;
      if (near) this.face = Math.sign(player.x - this.x) || this.face;
      else if (this.def && this.def.face) this.face = this.def.face;
    }
  }
  draw(ctx, camX) {
    const x = this.x - camX;
    if (x < -30 || x > W + 30) return;
    const set = Chars.person(this.kind);
    const y = this.y !== undefined ? this.y : GROUND - 2;
    if (this.front) {
      // behind a counter, facing the player: the counter hides the legs
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 60, 0, 120, Math.round(y - 22));
      ctx.clip();
      drawFrame(ctx, Chars.frame(set, 'idle', Game.clock * 6), x, y - 8, this.face, Chars.ANCHOR);
      ctx.restore();
      return;
    }
    if (this.work === 'pick' && this.swinging !== undefined && !(Math.abs(Game.player.x - this.x) < 40)) {
      const ph = (this.workT % 1.3) / 1.3;
      const f = ph > 0.55 ? set.punch[2] : set.punch[0];
      drawFrame(ctx, f, x, y, this.face, Chars.ANCHOR);
      drawPick(ctx, x, y, this.face, ph > 0.55);
      return;
    }
    const near = Math.abs(Game.player.x - this.x) < 40;
    if ((this.work === 'hoe' || this.work === 'feed') && !near) {
      const ph = (this.workT % (this.work === 'hoe' ? 1.6 : 2.4)) / (this.work === 'hoe' ? 1.6 : 2.4);
      drawFrame(ctx, ph > 0.6 ? set.punch[2] : set.punch[0], x, y, this.face, Chars.ANCHOR);
      if (this.work === 'hoe') drawHoe(ctx, x, y, this.face, ph > 0.6);
      return;
    }
    if (this.work === 'milk' && !near) {
      // on a stool beside the cow, the pail between their knees
      drawFrame(ctx, set.land[0], x, y + 4, this.face, Chars.ANCHOR);
      ctx.drawImage(PAIL_IMG, U.snap(x + this.face * 10 - PAIL_IMG.width / 2), GROUND - PAIL_IMG.height + 2);
      return;
    }
    if (this.work === 'plow') {
      // the horse out front in its traces, the plow between
      Horses.draw(ctx, { type: this.horse || 'bay', face: this.face, vx: this.walking ? 20 : 0, animT: this.animT, saddle: false }, x + this.face * 46, false);
      const px = U.snap(x + this.face * 14);
      if (this.face > 0) ctx.drawImage(PLOW_IMG, px - 6, GROUND - PLOW_IMG.height + 2);
      else { ctx.save(); ctx.translate(px, 0); ctx.scale(-1, 1); ctx.drawImage(PLOW_IMG, -6, GROUND - PLOW_IMG.height + 2); ctx.restore(); }
    }
    const f = this.walking ? Chars.frame(set, 'walk', this.animT * 2) : Chars.frame(set, 'idle', Game.clock * 6 + this.x);
    if (this.work === 'carry') { drawFrame(ctx, f, x, y, this.face, Chars.ANCHOR); ctx.drawImage(BALE_IMG, U.snap(x - BALE_IMG.width / 2 + this.face * 2), U.snap(y) - 74); return; }
    if (this.work === 'cart') ctx.drawImage(CART_IMG, U.snap(x + this.face * 30 - CART_IMG.width / 2), GROUND - CART_IMG.height + 2);
    if (this.wagon) {
      // a covered wagon rolling behind, a mule pulling it in front
      const wx = U.snap(x - this.face * 62);
      if (this.face > 0) ctx.drawImage(WAGON_IMG, wx - WAGON_IMG.width / 2, GROUND - WAGON_IMG.height + 4);
      else { ctx.save(); ctx.translate(wx, 0); ctx.scale(-1, 1); ctx.drawImage(WAGON_IMG, -WAGON_IMG.width / 2, GROUND - WAGON_IMG.height + 4); ctx.restore(); }
      Horses.draw(ctx, { type: this.wagon, face: this.face, vx: this.walking ? 30 : 0, animT: this.animT, saddle: false }, x + this.face * 44, false);
    }
    drawFrame(ctx, f, x, y, this.face, Chars.ANCHOR);
  }
}

// A pickaxe in a miner's hands: raised behind the shoulder, or swung down
// to the rock in front. Drawn in 2px blocks to stay on the pixel grid.
const CART_IMG = Buildings.oreCart();
const PLOW_IMG = U.chunky(Buildings.plow()), BALE_IMG = U.chunky(Buildings.bale()), PAIL_IMG = U.chunky(Buildings.pail());
// a hoe: raised over the shoulder, or chopped down into the soil in front
function drawHoe(ctx, x, y, face, down) {
  const sx = U.snap(x), sy = U.snap(y);
  const [[x0, y0], [x1, y1]] = down ? [[20, -38], [34, -4]] : [[0, -44], [-12, -70]];
  const at = (dx, dy, w, h) => ctx.fillRect(sx + (face > 0 ? dx : -dx - w), sy + dy, w, h);
  ctx.fillStyle = '#2a1a14';
  for (let i = 0; i <= 10; i++) { const t = i / 10; at(U.snap(x0 + (x1 - x0) * t) - 2, U.snap(y0 + (y1 - y0) * t) - 2, 6, 6); }
  ctx.fillStyle = '#c8904e';
  for (let i = 0; i <= 10; i++) { const t = i / 10; at(U.snap(x0 + (x1 - x0) * t), U.snap(y0 + (y1 - y0) * t), 2, 2); }
  ctx.fillStyle = '#2a1a14'; at(x1 - 2, y1 - 2, 10, 6); ctx.fillStyle = '#a8a8b4'; at(x1, y1, 6, 2);
}
const WAGON_IMG = U.chunky(Buildings.wagon());
function drawPick(ctx, x, y, face, down) {
  const sx = U.snap(x), sy = U.snap(y);
  // from the fist to the pick head: swung down onto the rock in front, or
  // raised up behind the shoulder ready to come down
  const [[x0, y0], [x1, y1]] = down ? [[26, -38], [40, -8]] : [[-2, -44], [-16, -66]];
  const at = (dx, dy, w, h) => ctx.fillRect(sx + (face > 0 ? dx : -dx - w), sy + dy, w, h);
  ctx.fillStyle = '#2a1a14';
  for (let i = 0; i <= 10; i++) { const t = i / 10; at(U.snap(x0 + (x1 - x0) * t) - 2, U.snap(y0 + (y1 - y0) * t) - 2, 6, 6); }
  ctx.fillStyle = '#c8904e';
  for (let i = 0; i <= 10; i++) { const t = i / 10; at(U.snap(x0 + (x1 - x0) * t), U.snap(y0 + (y1 - y0) * t), 2, 2); }
  // the iron head, across the end of the handle
  if (down) { ctx.fillStyle = '#2a1a14'; at(x1 - 8, y1 - 4, 18, 8); ctx.fillStyle = '#a8a8b4'; at(x1 - 6, y1 - 2, 14, 4); ctx.fillStyle = '#e0e0ea'; at(x1 - 6, y1 - 2, 6, 2); }
  else { ctx.fillStyle = '#2a1a14'; at(x1 - 10, y1 - 4, 20, 8); ctx.fillStyle = '#a8a8b4'; at(x1 - 8, y1 - 2, 16, 4); ctx.fillStyle = '#e0e0ea'; at(x1 - 8, y1 - 2, 6, 2); }
}

// ---------------------------------------------------------------- campfire
// Drawn fine into a small canvas, then turned into chunky pixels like everything else.
const fireCanvas = U.canvas(40, 30), fireCtx = fireCanvas.getContext('2d');
function drawCampfire(ctx, wx, t) {
  fireCtx.clearRect(0, 0, 40, 30);
  drawFire(fireCtx, 20, 28, t);
  ctx.drawImage(U.chunky(fireCanvas), U.snap(wx) - 20, GROUND - 28);
}
function drawFire(ctx, x, y, t) {
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 8, y - 3, 16, 3);
  ctx.fillStyle = '#7a5232'; ctx.fillRect(x - 6, y - 5, 12, 2);
  ctx.fillStyle = '#6b6b70';
  for (const sx of [-10, -6, 6, 9]) ctx.fillRect(x + sx, y - 2, 3, 2);
  const flames = [['#e8502a', 6, 12], ['#f4a63a', 4, 9], ['#ffe08a', 2, 5]];
  for (const [col, w, h] of flames) {
    ctx.fillStyle = col;
    for (let i = -w; i <= w; i++) {
      const fh = Math.max(1, Math.round(h * (1 - Math.abs(i) / (w + 1)) * (0.75 + 0.25 * Math.sin(t * 13 + i * 1.7))));
      ctx.fillRect(x + i, y - 4 - fh, 1, fh);
    }
  }
  if (Math.floor(t * 6) % 3 === 0) { ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + Math.round(Math.sin(t * 3) * 4), y - 18 - (t * 20) % 10, 1, 1); }
}
