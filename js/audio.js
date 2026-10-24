// Chiptune music + sound effects, synthesised with the Web Audio API.
// Songs are written as note strings: "A4" plays a note, "-" holds it, "." rests.
const Sound = (() => {
  let ac = null, master, musicBus, sfxBus, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem('db.muted') === '1'; } catch (e) { /* storage blocked */ }

  const SONGS = {
    town: {
      bpm: 132,
      lead: 'D5 - F#5 - A5 - F#5 - G5 - E5 - C#5 - A4 - D5 - F#5 - A5 - D6 - C#6 - A5 - E5 - - - B4 - D5 - G5 - B5 - A5 - F#5 - D5 - A4 - G4 - B4 - E5 - C#5 - D5 - - - . . . .',
      bass: 'D3 . A3 . D3 . A3 . A2 . E3 . A2 . E3 . G2 . D3 . G2 . D3 . A2 . E3 . D3 . A3 .',
      drums: 'k . h . s . h . ',
      leadWave: 'square', vol: 0.5,
    },
    desert: {
      bpm: 84,
      lead: 'A4 - - - E5 - - - D5 - C5 - B4 - A4 - G4 - - - A4 - B4 - C5 - - - B4 - - - A4 - - - E4 - - - G4 - A4 - C5 - B4 - A4 - - - - - - - . . . . . . . .',
      bass: 'A2 - - - E3 - - - A2 - - - E3 - - - G2 - - - D3 - - - A2 - - - E3 - - - ',
      drums: 'k . . . h . . . k . k . h . . . ',
      leadWave: 'square', vol: 0.42,
    },
    night: {
      bpm: 66,
      lead: 'E4 - - - G4 - - - B4 - - - - - - - A4 - - - G4 - - - F#4 - - - - - - - E4 - - - D4 - - - E4 - - - - - - - . . . . . . . . . . . . . . . .',
      bass: 'E2 - - - - - - - B2 - - - - - - - C3 - - - - - - - B2 - - - - - - - ',
      drums: '',
      leadWave: 'triangle', vol: 0.55,
    },
    fight: {
      bpm: 150,
      lead: 'A4 A4 C5 A4 D5 A4 E5 D5 C5 C5 A4 C5 B4 G4 A4 - A4 A4 C5 A4 D5 A4 E5 G5 F5 E5 D5 C5 B4 G4 A4 -',
      bass: 'A2 A2 A3 A2 A2 A2 G2 G3 F2 F2 F3 F2 E2 E2 E3 E2',
      drums: 'k h s h k k s h',
      leadWave: 'square', vol: 0.45,
    },
    title: {
      bpm: 76,
      lead: 'E4 - - - A4 - - - B4 - C5 - B4 - - - A4 - - - E4 - - - G4 - - - - - - - E4 - - - A4 - - - B4 - C5 - D5 - - - E5 - - - D5 - C5 - B4 - - - - - - -',
      bass: 'A2 - - - - - - - E2 - - - - - - - C3 - - - - - - - E2 - - - - - - - ',
      drums: '',
      leadWave: 'square', vol: 0.4,
    },
  };

  // Real recordings (all CC0, see assets/CREDITS.md). The synth songs and
  // synth effects below are only used if a file can't be loaded.
  const MUSIC_FILES = { title: 'title', canyon: 'canyon', prairie: 'prairie', forest: 'forest', town: 'town', saloon: 'saloon', desert: 'desert', night: 'night', fight: 'fight', house: 'house', death: 'death' };
  const SFX_FILES = {
    punch: { f: ['sounds_impact3', 'sounds_impact4'], v: 0.35 },
    hit: { f: ['wpn_punch1', 'wpn_punch2', 'wpn_punch3'], v: 0.8 },
    hurt: { f: ['damage_hit3', 'damage_hit5', 'damage_hit7'], v: 0.8 },
    block: { f: ['sounds_impact1', 'sounds_impact6', 'sounds_impact7'], v: 0.7 },
    perfect: { f: ['sounds_powerup15', 'sounds_powerup5'], v: 0.6 },
    ko: { f: ['wpn_punch4', 'sounds_impact10'], v: 0.8, all: true },
    jump: { f: ['movement_jump10', 'movement_jump11'], v: 0.5 },
    land: { f: ['movement_jump10_landing', 'movement_jump11_landing'], v: 0.5 },
    stepSand: { f: ['movement_footsteps1a', 'movement_footsteps1b', 'movement_footsteps5'], v: 0.25, rate: 0.85 },
    stepWood: { f: ['movement_footsteps1a', 'movement_footsteps1b', 'movement_footsteps5'], v: 0.3, rate: 1.1 },
    hoof: { f: ['movement_footsteps1a', 'movement_footsteps1b'], v: 0.3, rate: 0.7 },
    pickup: { f: ['sounds_interaction1', 'sounds_interaction14', 'sounds_interaction7'], v: 0.6 },
    coin: { f: ['coin_double1', 'coin_double2', 'coin_double3'], v: 0.6 },
    eat: { f: ['sounds_powerup6'], v: 0.5 },
    door: { f: ['movement_dooropen1', 'movement_dooropen2'], v: 0.6 },
    doorClose: { f: ['movement_dooropen3', 'movement_dooropen4'], v: 0.6 },
    search: { f: ['sounds_interaction18', 'sounds_interaction19', 'sounds_interaction22'], v: 0.5 },
    latch: { f: ['sounds_interaction9'], v: 0.6 },
    select: { f: ['menu_move1'], v: 0.4 },
    clang: { f: ['sounds_impact1', 'sounds_impact6'], v: 0.35, rate: 1.6 },
  };
  const buffers = {};
  const canFetch = /^https?:/.test(location.protocol);
  function loadSamples() {
    if (!canFetch) return;
    const names = new Set();
    for (const k in SFX_FILES) SFX_FILES[k].f.forEach(n => names.add(n));
    names.forEach(n => {
      fetch(`assets/sfx/${n}.mp3`).then(r => (r.ok ? r.arrayBuffer() : Promise.reject())).then(b => ac.decodeAudioData(b))
        .then(buf => { buffers[n] = buf; }).catch(() => {});
    });
  }
  function playSample(name) {
    const def = SFX_FILES[name];
    if (!def) return false;
    const list = def.f.filter(n => buffers[n]);
    if (!list.length) return false;
    const pick = def.all ? list : [list[Math.floor(Math.random() * list.length)]];
    for (const n of pick) {
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = buffers[n];
      src.playbackRate.value = (def.rate || 1) * (0.93 + Math.random() * 0.14);
      g.gain.value = def.v;
      src.connect(g); g.connect(sfxBus);
      src.start();
    }
    return true;
  }

  function freq(name) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(name);
    if (!m) return 0;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const midi = (Number(m[3]) + 1) * 12 + base;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Turn a note string into [{step, len, f}] events.
  function parse(str) {
    const t = str.trim().split(/\s+/).filter(Boolean);
    const ev = [];
    t.forEach((tok, i) => {
      if (tok === '-' || tok === '.') return;
      let len = 1;
      while (t[i + len] === '-') len++;
      ev.push({ step: i, len, tok, f: freq(tok) });
    });
    return { ev, n: t.length };
  }

  function init() {
    if (ac) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(schedule, 50);
    loadSamples();
    if (pendingSong) { const n = pendingSong; songName = null; play(n); }
  }

  function resume() { init(); if (ac && ac.state === 'suspended') ac.resume(); }

  // ------------------------------------------------------------ voices
  function tone(dest, type, f, t, dur, vol, slideTo) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dest, t, dur, vol, hp = 1000, lp = 12000) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f1 = ac.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
    const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------- music
  let song = null, songName = null, songGain = null, step = 0, nextTime = 0, parts = null, wantVol = 1, pendingSong = null;
  const tracks = {};       // name -> { el, gain }
  let track = null;        // currently playing recorded track
  const FILE_VOL = 0.55;
  function fadeTrack(t, to, sec, then) {
    if (t.gain) { t.gain.gain.setTargetAtTime(to, ac.currentTime, sec / 3); if (then) setTimeout(then, sec * 1000); return; }
    // file:// pages can't route audio elements through Web Audio, so fade the element itself
    const from = t.el.volume, t0 = performance.now();
    clearInterval(t.timer);
    t.timer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
      t.el.volume = U.clamp(from + (to - from) * k, 0, 1);
      if (k >= 1) { clearInterval(t.timer); if (then) then(); }
    }, 40);
  }
  function playFile(name) {
    let t = tracks[name];
    if (!t) {
      const el = new Audio(`assets/music/${MUSIC_FILES[name]}.mp3`);
      el.loop = name !== 'death';
      el.preload = 'auto';
      t = tracks[name] = { el, gain: null, failed: false };
      if (canFetch) {
        try { const src = ac.createMediaElementSource(el); t.gain = ac.createGain(); t.gain.gain.value = 0; src.connect(t.gain); t.gain.connect(master); } catch (e) { t.gain = null; }
      }
      if (!t.gain) el.volume = 0;
      el.addEventListener('error', () => { t.failed = true; if (songName === name) { track = null; startSynth(name); } });
    }
    if (t.failed) return false;
    track = t;
    t.el.currentTime = name === 'death' ? 0 : t.el.currentTime;
    const p = t.el.play();
    if (p && p.catch) p.catch(() => {});
    fadeTrack(t, FILE_VOL * wantVol, 1.2);
    return true;
  }
  function stopTrack(t) {
    fadeTrack(t, 0, 1.2, () => { if (track !== t) t.el.pause(); });
  }
  function play(name) {
    if (name === songName) return;
    songName = name;
    if (!ac) { pendingSong = name; return; }
    if (track) { stopTrack(track); track = null; }
    if (songGain) { const old = songGain; old.gain.setTargetAtTime(0, ac.currentTime, 0.4); setTimeout(() => old.disconnect(), 2500); songGain = null; song = null; }
    if (MUSIC_FILES[name] && playFile(name)) return;
    startSynth(name);
  }
  function startSynth(name) {
    if (songGain) {
      const old = songGain;
      old.gain.setTargetAtTime(0, ac.currentTime, 0.4);
      setTimeout(() => old.disconnect(), 2500);
    }
    song = SONGS[name] || (['canyon', 'prairie', 'forest'].includes(name) ? SONGS.desert : null);
    if (!song) { songGain = null; return; }
    songGain = ac.createGain();
    songGain.gain.setValueAtTime(0, ac.currentTime);
    songGain.gain.setTargetAtTime(song.vol * wantVol, ac.currentTime + 0.3, 0.5);
    songGain.connect(musicBus);
    parts = { lead: parse(song.lead), bass: parse(song.bass), drums: song.drums.trim().split(/\s+/).filter(Boolean) };
    step = 0; nextTime = ac.currentTime + 0.35;
  }
  // Duck music indoors / in menus.
  function musicVolume(v) {
    if (v === wantVol) return;
    wantVol = v;
    if (ac && songGain && song) songGain.gain.setTargetAtTime(song.vol * v, ac.currentTime, 0.3);
    if (ac && track) fadeTrack(track, FILE_VOL * v, 0.6);
  }

  function schedule() {
    if (!ac || !song || !songGain) return;
    const stepDur = 60 / song.bpm / 2;
    while (nextTime < ac.currentTime + 0.2) {
      for (const [k, p] of [['lead', parts.lead], ['bass', parts.bass]]) {
        if (!p.n) continue;
        const s = step % p.n;
        for (const e of p.ev) {
          if (e.step !== s || !e.f) continue;
          if (k === 'lead') tone(songGain, song.leadWave, e.f, nextTime, e.len * stepDur * 0.95, 0.16);
          else tone(songGain, 'triangle', e.f, nextTime, e.len * stepDur * 0.9, 0.34);
        }
      }
      if (parts.drums.length) {
        const d = parts.drums[step % parts.drums.length];
        if (d === 'k') tone(songGain, 'sine', 120, nextTime, 0.12, 0.5, 40);
        else if (d === 'h') noise(songGain, nextTime, 0.04, 0.12, 6000);
        else if (d === 's') noise(songGain, nextTime, 0.12, 0.22, 1500, 6000);
      }
      step++;
      nextTime += stepDur;
    }
  }

  // --------------------------------------------------------------- sfx
  const SFX = {
    punch: t => noise(sfxBus, t, 0.08, 0.35, 800, 4000),
    hit: t => { tone(sfxBus, 'square', 140, t, 0.12, 0.3, 50); noise(sfxBus, t, 0.08, 0.4, 300, 3000); },
    block: t => { tone(sfxBus, 'square', 900, t, 0.06, 0.18, 500); tone(sfxBus, 'square', 1300, t + 0.03, 0.05, 0.12); },
    perfect: t => { tone(sfxBus, 'square', 1200, t, 0.06, 0.2); tone(sfxBus, 'square', 1800, t + 0.06, 0.1, 0.2); },
    hurt: t => tone(sfxBus, 'square', 330, t, 0.25, 0.3, 90),
    jump: t => tone(sfxBus, 'square', 260, t, 0.14, 0.15, 520),
    land: t => noise(sfxBus, t, 0.05, 0.15, 200, 1200),
    pickup: t => { tone(sfxBus, 'square', 660, t, 0.07, 0.18); tone(sfxBus, 'square', 990, t + 0.07, 0.1, 0.18); },
    coin: t => { tone(sfxBus, 'square', 1046, t, 0.06, 0.16); tone(sfxBus, 'square', 1568, t + 0.06, 0.16, 0.16); },
    door: t => { noise(sfxBus, t, 0.25, 0.15, 200, 900); tone(sfxBus, 'sawtooth', 180, t, 0.3, 0.05, 240); },
    search: t => noise(sfxBus, t, 0.3, 0.12, 1000, 3000),
    rattle: t => { for (let i = 0; i < 8; i++) noise(sfxBus, t + i * 0.045, 0.03, 0.12, 4000); },
    growl: t => tone(sfxBus, 'sawtooth', 110, t, 0.3, 0.12, 80),
    howl: t => tone(sfxBus, 'sine', 500, t, 1.3, 0.12, 820),
    select: t => tone(sfxBus, 'square', 880, t, 0.04, 0.1),
    bark: t => { tone(sfxBus, 'square', 420, t, 0.08, 0.12, 260); tone(sfxBus, 'square', 400, t + 0.14, 0.08, 0.1, 240); },
    cluck: t => { tone(sfxBus, 'square', 700, t, 0.04, 0.06, 900); tone(sfxBus, 'square', 650, t + 0.07, 0.05, 0.06, 500); },
    moo: t => { tone(sfxBus, 'sawtooth', 150, t, 0.6, 0.09, 120); tone(sfxBus, 'square', 110, t + 0.1, 0.5, 0.05, 95); },
    roar: t => { tone(sfxBus, 'sawtooth', 120, t, 0.5, 0.16, 70); noise(sfxBus, t, 0.4, 0.08, 200, 1500); },
    piano: t => [523, 659, 784, 659, 698, 880, 784, 523].forEach((f, i) => tone(sfxBus, 'triangle', f, t + i * 0.14, 0.3, 0.2)),
    eat: t => { noise(sfxBus, t, 0.06, 0.2, 2000); noise(sfxBus, t + 0.12, 0.06, 0.2, 2000); },
    fire: t => noise(sfxBus, t, 0.4, 0.1, 300, 2000),
    die: t => { tone(sfxBus, 'square', 440, t, 0.2, 0.25); tone(sfxBus, 'square', 330, t + 0.2, 0.2, 0.25); tone(sfxBus, 'square', 220, t + 0.4, 0.5, 0.25); },
    ko: t => { tone(sfxBus, 'square', 220, t, 0.1, 0.25, 110); noise(sfxBus, t + 0.05, 0.2, 0.25, 200, 1500); },
  };
  function sfx(name) {
    if (!ac || muted) return;
    if (playSample(name)) return;
    if (SFX[name]) SFX[name](ac.currentTime + 0.005);
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('db.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master) master.gain.value = muted ? 0 : 0.5;
    for (const k in tracks) if (!tracks[k].gain) tracks[k].el.muted = muted;
    return muted;
  }

  // What's playing right now (handy for debugging from the browser console).
  function status() {
    return {
      song: songName,
      file: track ? { src: track.el.src.split('/').pop(), playing: !track.el.paused, time: Math.round(track.el.currentTime) } : null,
      synth: !!songGain,
      samplesLoaded: Object.keys(buffers).length,
    };
  }

  return { resume, play, sfx, musicVolume, toggleMute, status, get muted() { return muted; } };
})();
