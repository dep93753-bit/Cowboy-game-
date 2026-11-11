// Three save slots kept in the browser's localStorage.
const Save = (() => {
  const KEY = n => `dustandbadge.slot${n}`;
  const START_TIME = 8 * 60; // day 1, 8:00 AM (minutes since day 1 began)

  function fresh() {
    return {
      v: 1,
      time: START_TIME,
      x: 92,
      scene: 'world',
      zone: 'road',        // which map: 'road' or 'canyon'
      hp: 100, hunger: 85, energy: 90,
      money: 0,
      inv: { jerky: 2 },
      gloves: 0,
      looted: {},          // houseId -> [container idx searched]
      cleared: {},         // houseId -> true once its danger is dealt with
      fixedKilled: {},     // fixed enemy index -> day it was beaten
      respawn: { x: 92, label: "the Sheriff's Office", zone: 'road' },
      campfire: null,      // x of the current campfire, if any
      flags: {},
      look: { g: 'm', skin: 0, hair: 0, hat: 0, face: 0 },   // set in the character customiser
      playSeconds: 0,
    };
  }

  function load(n) {
    try {
      const raw = localStorage.getItem(KEY(n));
      if (!raw) return null;
      return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function write(n, data) {
    try {
      localStorage.setItem(KEY(n), JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function remove(n) {
    try { localStorage.removeItem(KEY(n)); } catch (e) { /* ignore */ }
  }

  return { fresh, load, write, remove };
})();
