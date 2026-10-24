// Every item in the game. `food` restores hunger, `heal` restores health.
// `price` = store buy price, `sell` = what the store pays you.
const ITEMS = {
  jerky: { name: 'Beef Jerky', food: 25, price: 3, sell: 1 },
  beans: { name: 'Can of Beans', food: 40, price: 5, sell: 2 },
  peaches: { name: 'Canned Peaches', food: 30, price: 4, sell: 2 },
  biscuit: { name: 'Hardtack Biscuit', food: 15, price: 2, sell: 1 },
  snakemeat: { name: 'Snake Meat', food: 20, sell: 1 },
  bandage: { name: 'Bandage', heal: 35, price: 6, sell: 2 },
  horsefeed: { name: 'Horse Feed', price: 3, sell: 1, note: 'For a horse. The stable is empty for now.' },
  pelt: { name: 'Coyote Pelt', sell: 5 },
  watch: { name: 'Pocket Watch', sell: 8 },
  spoon: { name: 'Silver Spoon', sell: 4 },
  harmonica: { name: 'Harmonica', sell: 6 },
  rattle: { name: 'Snake Rattle', sell: 3 },
  steak: { name: 'Bison Steak', food: 45, sell: 3 },
  hide: { name: 'Bison Hide', sell: 7 },
  bearpelt: { name: 'Bear Pelt', sell: 9 },
  apple: { name: 'Apple', food: 12, price: 1, sell: 1 },
  bread: { name: 'Loaf of Bread', food: 30, price: 3, sell: 1 },
};

// Brawling glove upgrades: extra punch damage and better blocking.
const GLOVES = [
  { name: 'Bare Knuckles', dmg: 0, guard: 0 },
  { name: 'Leather Gloves', dmg: 5, guard: 0.5, price: 25 },
];

// What can turn up when searching furniture in an abandoned house.
const LOOT_TABLE = {
  jerky: 14, beans: 10, peaches: 8, biscuit: 10, bandage: 12, horsefeed: 10,
  money: 20, watch: 3, spoon: 4, harmonica: 3, nothing: 16,
};
