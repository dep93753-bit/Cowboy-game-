// The lawman, enemies, townsfolk and small effects.

// Draw a sprite frame anchored at its feet. Sprites face right; flip for left.
function drawFrame(ctx, frame, x, y, face, anchor, flash) {
  const img = flash ? frame.flash : frame.img;
  const dx = Math.round(x), dy = Math.round(y - img.height + 1);
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
    if (this.y >= GROUND) {
      if (!this.onGround && this.vy > 120) { Sound.sfx('land'); Game.dust(this.x, GROUND, 4); }
      this.y = GROUND; this.vy = 0; this.onGround = true;
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
      if (running && Math.random() < dt * 10) Game.dust(this.x - this.face * 6, GROUND, 1);
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
        Game.floater(this.x, this.y - 54, 'PERFECT!', '#f2c94c');
        if (attacker) attacker.stun(1.3);
        Game.spark(this.x + this.face * 10, this.y - 30, '#fff3b0');
        return 0;
      }
      Sound.sfx('block');
      const chip = Math.round(dmg * 0.2 * (1 - glove.guard));
      if (attacker) attacker.stun(0.55);
      this.vx = -this.face * 40;
      Game.spark(this.x + this.face * 10, this.y - 30, '#ffffff');
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

  pose() {
    if (this.punchT > 0.06) return 'punch';
    if (this.blocking) return 'block';
    if (!this.onGround) return 'jump';
    if (Math.abs(this.vx) > 5) return 'walk' + (Math.floor(this.animT) % 4);
    return 'idle';
  }

  draw(ctx, camX) {
    const set = Sprites.people.lawman;
    if (this.lying) {
      const img = set.idle.img;
      ctx.save();
      ctx.translate(Math.round(this.x - camX), GROUND + 1);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, 0, -Math.round(img.height / 2));
      ctx.restore();
      return;
    }
    if (this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0) return;
    let bob = 0;
    if (this.pose() === 'idle') bob = Math.floor(Game.clock * 1.5) % 2;
    drawFrame(ctx, set[this.pose()], this.x - camX, this.y + bob, this.face, Sprites.ANCHOR_X, this.flashT > 0);
  }
}

// ------------------------------------------------------------------ enemies
const ENEMY_TYPES = {
  snake: { name: 'Rattlesnake', hp: 22, speed: 16, aggro: 80, range: 19, windup: 0.7, recover: 0.8, dmg: 12, half: 8, anchor: 9,
    loot: { snakemeat: 0.6, rattle: 0.35 } },
  coyote: { name: 'Coyote', hp: 28, speed: 74, aggro: 160, range: 20, windup: 0.5, recover: 0.7, dmg: 10, half: 11, anchor: 13,
    loot: { pelt: 0.7 } },
  outlaw: { name: 'Outlaw', hp: 48, speed: 46, aggro: 130, range: 22, windup: 0.6, recover: 0.75, dmg: 15, half: 6, anchor: Sprites.ANCHOR_X,
    loot: { money: 1, jerky: 0.3, bandage: 0.2 } },
};

class Enemy {
  constructor(type, x, opts = {}) {
    this.type = type; this.def = ENEMY_TYPES[type];
    this.x = x; this.y = GROUND; this.vx = 0;
    this.hp = this.def.hp; this.face = -1;
    this.state = 'idle'; this.t = 0; this.animT = 0;
    this.flashT = 0; this.deadT = 0;
    this.home = x; this.fixedId = opts.fixedId;
    this.alerted = false;
  }

  get alive() { return this.state !== 'dead'; }

  stun(sec) {
    if (!this.alive) return;
    this.state = 'stun'; this.t = sec;
  }

  hit(dmg, fromX) {
    if (!this.alive) return;
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

  height() { return this.type === 'outlaw' ? 48 : this.type === 'coyote' ? 14 : 10; }

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
        if (this.type !== 'snake') this.moving = wanderStep(this, dt, 30, d.speed * 0.35);
        if (dist < d.aggro && !player.dead && !Game.data.sleeping) {
          this.state = 'chase';
          if (!this.alerted) {
            this.alerted = true;
            if (this.type === 'snake') Sound.sfx('rattle');
            if (this.type === 'coyote') Sound.sfx('growl');
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
        if (dist > d.aggro * 1.8 || player.dead) { this.state = 'idle'; break; }
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
          this.x += this.face * (this.type === 'coyote' ? 8 : this.type === 'snake' ? 6 : 4);
          if (dist < d.range + 8 && player.y > GROUND - 22) player.hurt(d.dmg, this.x, this);
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
      const s = Sprites.creatures.coyote;
      frame = this.state === 'attack' ? s.bite
        : this.moving ? (Math.floor(this.animT / 2) % 2 ? s.run0 : s.run1) : s.stand;
    } else {
      const s = Sprites.people.outlaw;
      const pose = this.state === 'attack' ? 'punch' : this.state === 'windup' ? 'block'
        : this.moving ? 'walk' + (Math.floor(this.animT) % 4) : 'idle';
      frame = s[pose];
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
    const near = Math.abs(player.x - this.x) < 40;
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
    const set = Sprites.people[this.kind];
    const pose = this.walking ? 'walk' + (Math.floor(this.animT) % 4) : 'idle';
    if (this.front && set.front) {
      // behind a counter, facing the player: only the upper body shows
      const img = set.front.img;
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(this.y - 22 - img.height + 1));
      return;
    }
    drawFrame(ctx, set[pose], x, this.y !== undefined ? this.y : GROUND - 2, this.face, Sprites.ANCHOR_X);
  }
}

// ---------------------------------------------------------------- campfire
function drawCampfire(ctx, x, t) {
  x = Math.round(x);
  const y = GROUND;
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
