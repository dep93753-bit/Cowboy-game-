// HTML overlay: HUD, prompts, dialogue boxes, menus, title screen.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const el = {
    hud: $('hud'), prompt: $('prompt'), toast: $('toast'), dialogue: $('dialogue'),
    dlgName: $('dlg-name'), dlgText: $('dlg-text'), menu: $('menu'), menuTitle: $('menu-title'),
    menuSub: $('menu-sub'), menuList: $('menu-list'), menuHint: $('menu-hint'),
    title: $('title'), slots: $('slots'), fade: $('fade'), place: $('hud-place'),
    day: $('hud-day'), time: $('hud-time'), money: $('hud-money'),
  };
  const bars = {
    hp: document.querySelector('.bar.hp'), food: document.querySelector('.bar.food'), rest: document.querySelector('.bar.rest'), horse: document.querySelector('.bar.horse'),
  };

  // ------------------------------------------------------------------ HUD
  const last = {};
  function setBar(name, v) {
    v = Math.round(U.clamp(v, 0, 100));
    if (last[name] === v) return;
    last[name] = v;
    bars[name].querySelector('i').style.width = v + '%';
    bars[name].classList.toggle('low', v <= 20);
  }
  function hud(d) {
    setBar('hp', d.hp); setBar('food', d.hunger); setBar('rest', d.energy);
    const hasHorse = !!d.horse;
    if (last.hasHorse !== hasHorse) { bars.horse.classList.toggle('hidden', !hasHorse); last.hasHorse = hasHorse; }
    if (hasHorse) {
      setBar('horse', d.horse.hunger);
      const nm = d.horse.name.toUpperCase().slice(0, 8);
      if (last.horseName !== nm) { document.getElementById('hud-horse-name').textContent = last.horseName = nm; }
    }
    const day = 'DAY ' + (Math.floor(d.time / 1440) + 1), time = U.fmtTime(d.time), money = '$' + d.money;
    if (last.day !== day) el.day.textContent = last.day = day;
    if (last.time !== time) el.time.textContent = last.time = time;
    if (last.money !== money) el.money.textContent = last.money = money;
  }
  function showHud(on) { el.hud.classList.toggle('hidden', !on); }

  let placeTimer = 0;
  function place(name) {
    el.place.textContent = name;
    el.place.classList.add('show');
    clearTimeout(placeTimer);
    placeTimer = setTimeout(() => el.place.classList.remove('show'), 3000);
  }

  // --------------------------------------------------------- prompt/toast
  let promptText = null;
  function prompt(html) {
    if (html === promptText) return;
    promptText = html;
    el.prompt.classList.toggle('hidden', !html);
    if (html) el.prompt.innerHTML = html;
  }
  let toastTimer = 0;
  function toast(text, sec = 2.6) {
    el.toast.textContent = text;
    el.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.add('hidden'), sec * 1000);
  }

  // ------------------------------------------------------------ dialogue
  let dlg = null;
  function dialogue(lines, onDone) {
    dlg = { lines, i: 0, shown: 0, onDone };
    el.dialogue.classList.remove('hidden');
    stage.classList.add('talking');
    showLine();
  }
  function showLine() {
    const [name, text] = dlg.lines[dlg.i];
    el.dlgName.textContent = name || '';
    dlg.shown = 0; dlg.full = text;
    el.dlgText.textContent = '';
  }
  function dialogueTick(dt) {
    if (!dlg) return false;
    if (dlg.shown < dlg.full.length) {
      dlg.shown = Math.min(dlg.full.length, dlg.shown + dt * 55);
      el.dlgText.textContent = dlg.full.slice(0, Math.floor(dlg.shown));
    }
    if (Input.pressed('confirm') || Input.pressed('punch') || Input.takeClick() || dlgClicked) {
      dlgClicked = false;
      if (dlg.shown < dlg.full.length) {
        dlg.shown = dlg.full.length;
        el.dlgText.textContent = dlg.full;
      } else if (++dlg.i < dlg.lines.length) {
        Sound.sfx('select');
        showLine();
      } else {
        const done = dlg.onDone;
        dlg = null;
        el.dialogue.classList.add('hidden');
        stage.classList.remove('talking');
        if (done) done();
      }
    }
    return true;
  }
  let dlgClicked = false;
  el.dialogue.addEventListener('pointerdown', e => { e.stopPropagation(); dlgClicked = true; });

  // ---------------------------------------------------------------- menus
  // def: { title, sub, build: () => [{label, right, disabled, note, pick}], onClose, hint }
  let menuDef = null, menuSel = 0, menuItems = [];
  function menu(def) {
    menuDef = def;
    menuSel = 0;
    el.menu.classList.remove('hidden');
    stage.classList.add('menu-open');
    renderMenu();
  }
  function renderMenu() {
    const d = menuDef;
    el.menuTitle.textContent = d.title;
    el.menuSub.textContent = typeof d.sub === 'function' ? d.sub() : d.sub || '';
    el.menuHint.textContent = d.hint || (document.body.classList.contains('touch') ? 'Tap an option' : 'W/S choose  ·  E select  ·  Esc close');
    menuItems = d.build();
    el.menuList.innerHTML = '';
    const pickable = menuItems.filter(o => !o.note && !o.disabled);
    menuSel = U.clamp(menuSel, 0, Math.max(0, pickable.length - 1));
    let pi = 0;
    menuItems.forEach(o => {
      if (o.note) {
        const n = document.createElement('div');
        n.className = 'note'; n.textContent = o.note;
        el.menuList.appendChild(n);
        return;
      }
      const b = document.createElement('button');
      b.innerHTML = `<span>${o.label}</span>${o.right !== undefined ? `<span class="r">${o.right}</span>` : ''}`;
      b.disabled = !!o.disabled;
      if (!o.disabled) {
        const myIndex = pi++;
        if (myIndex === menuSel) b.classList.add('sel');
        b.addEventListener('click', e => { e.stopPropagation(); menuSel = myIndex; choose(o); });
        b.addEventListener('pointerenter', () => { menuSel = myIndex; markSel(); });
      }
      el.menuList.appendChild(b);
    });
  }
  function markSel() {
    const btns = [...el.menuList.querySelectorAll('button:not(:disabled)')];
    btns.forEach((b, i) => b.classList.toggle('sel', i === menuSel));
    if (btns[menuSel]) btns[menuSel].scrollIntoView({ block: 'nearest' });
  }
  function choose(o) {
    Sound.sfx('select');
    const res = o.pick ? o.pick() : 'close';
    if (!menuDef) return;
    if (res === 'close') closeMenu();
    else renderMenu();
  }
  function closeMenu() {
    const d = menuDef;
    menuDef = null;
    el.menu.classList.add('hidden');
    stage.classList.remove('menu-open');
    if (d && d.onClose) d.onClose();
  }
  function menuTick() {
    if (!menuDef) return false;
    const pickable = menuItems.filter(o => !o.note && !o.disabled);
    if (Input.pressed('up')) { menuSel = (menuSel - 1 + pickable.length) % pickable.length; markSel(); Sound.sfx('select'); }
    if (Input.pressed('down')) { menuSel = (menuSel + 1) % pickable.length; markSel(); Sound.sfx('select'); }
    if (Input.pressed('confirm') && pickable[menuSel]) choose(pickable[menuSel]);
    else if (Input.pressed('back') || Input.pressed('bag') && menuDef && menuDef.bagCloses) closeMenu();
    return true;
  }

  // ---------------------------------------------------------------- title
  function title(on, slots) {
    el.title.classList.toggle('hidden', !on);
    if (!on) return;
    el.slots.innerHTML = '';
    slots.forEach(s => {
      const row = document.createElement('div');
      row.className = 'slot';
      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = s.data
        ? `<b>SLOT ${s.n}</b> &middot; Day ${Math.floor(s.data.time / 1440) + 1}<br>${s.where}`
        : `<b>SLOT ${s.n}</b> &middot; Empty`;
      row.appendChild(info);
      const go = document.createElement('button');
      go.textContent = s.data ? 'CONTINUE' : 'NEW GAME';
      go.addEventListener('click', () => { Sound.resume(); s.play(); });
      row.appendChild(go);
      if (s.data) {
        const del = document.createElement('button');
        del.className = 'del'; del.textContent = 'X'; del.title = 'Delete save';
        del.addEventListener('click', () => s.remove());
        row.appendChild(del);
      }
      el.slots.appendChild(row);
    });
  }

  // A small text box (used to name your horse).
  function askText(def) {
    menu({
      title: def.title, sub: def.sub || '', hint: 'Type a name, then press Enter',
      build: () => [{ label: 'OK', pick: () => { const v = (input.value || '').trim().slice(0, 14); def.onDone(v || def.value); return 'close'; } }],
    });
    const input = document.createElement('input');
    input.maxLength = 14; input.value = def.value || '';
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { const v = (input.value || '').trim().slice(0, 14); closeMenu(); def.onDone(v || def.value); }
    });
    el.menuList.prepend(input);
    setTimeout(() => { input.focus(); input.select(); }, 30);
  }

  function fade(on) { el.fade.classList.toggle('on', on); }

  return {
    hud, showHud, place, prompt, toast, dialogue, dialogueTick, menu, menuTick, closeMenu, title, fade, askText,
    get busy() { return !!dlg || !!menuDef; },
    get inMenu() { return !!menuDef; },
  };
})();
