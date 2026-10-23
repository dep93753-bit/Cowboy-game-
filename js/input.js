// Keyboard + touch buttons + clicks/taps on the game screen, merged into
// named actions. `down` = held, `pressed` = went down this frame.
const Input = (() => {
  const KEYS = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    run: ['ShiftLeft', 'ShiftRight'], jump: ['KeyW', 'ArrowUp', 'Space'],
    punch: ['KeyJ', 'KeyZ'], block: ['KeyK', 'KeyX'], use: ['KeyE'],
    camp: ['KeyC'], horse: ['KeyH'], bag: ['KeyI', 'Tab'], pause: ['Escape', 'KeyP'], mute: ['KeyM'],
    confirm: ['Enter', 'Space', 'KeyE', 'NumpadEnter'], back: ['Escape', 'Backspace'],
  };
  const held = new Set();
  let pressedNow = new Set();
  const touchHeld = new Set();
  const clicks = [];
  let runToggle = false;

  function actionsFor(code) {
    const out = [];
    for (const a in KEYS) if (KEYS[a].includes(code)) out.push(a);
    return out;
  }

  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    Sound.resume();
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    actionsFor(e.code).forEach(a => pressedNow.add(a));
  });
  window.addEventListener('keyup', e => held.delete(e.code));
  // browsers only allow sound after the first click/tap anywhere on the page
  window.addEventListener('pointerdown', () => Sound.resume(), { capture: true });
  window.addEventListener('blur', () => { held.clear(); touchHeld.clear(); });

  function bindTouch(root) {
    root.querySelectorAll('button[data-k]').forEach(btn => {
      const k = btn.dataset.k;
      const on = e => {
        e.preventDefault();
        Sound.resume();
        if (k === 'run') { runToggle = !runToggle; btn.classList.toggle('on', runToggle); return; }
        touchHeld.add(k);
        btn.classList.add('on');
        pressedNow.add(k);
        if (k === 'use') pressedNow.add('confirm');
        if (k === 'pause') pressedNow.add('back');
      };
      const off = e => {
        e.preventDefault();
        if (k === 'run') return;
        touchHeld.delete(k);
        btn.classList.remove('on');
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    });
  }

  function bindScreen(canvas) {
    canvas.addEventListener('pointerdown', e => {
      Sound.resume();
      const r = canvas.getBoundingClientRect();
      clicks.push({ x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
    });
  }

  return {
    bindTouch, bindScreen,
    down(a) {
      if (a === 'run' && runToggle) return true;
      if (touchHeld.has(a)) return true;
      return (KEYS[a] || []).some(c => held.has(c));
    },
    pressed(a) { return pressedNow.has(a); },
    press(a) { pressedNow.add(a); },
    takeClick() { return clicks.shift(); },
    endFrame() { pressedNow = new Set(); clicks.length = 0; },
    clearAll() { pressedNow = new Set(); clicks.length = 0; },
  };
})();
