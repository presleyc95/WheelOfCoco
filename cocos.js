// Shared data and helpers for the game (index.html) and the admin dashboard (admin.html).

// Crop boxes are squares in the 799x535 source image: [x, y, size]
export const IMG_W = 799, IMG_H = 535;
export const COCOS = [
  { id: "dj", name: "DJ Coco", crop: [8, 150, 108], weight: 24, rarity: "COMMON",
    desc: "Headphones on, notifications off. You are locked in and the beat goes on. Today you ship.",
    power: "Do Not Disturb" },
  { id: "rodeo", name: "Rodeo Coco", crop: [72, 120, 112], weight: 24, rarity: "COMMON",
    desc: "Pink hat, big energy. You will wrangle that backlog like a wild stallion. Yeehaw.",
    power: "Lasso the redlines" },
  { id: "tundra", name: "Tundra Coco", crop: [162, 105, 115], weight: 24, rarity: "COMMON",
    desc: "Cool under pressure. Scope creep, surprise deadlines, angry reviewers: none of it rattles you.",
    power: "Ice-cold focus" },
  { id: "highroller", name: "High Roller Coco", crop: [335, 92, 132], weight: 8, rarity: "RARE",
    desc: "You sit on the throne and guard the golden chest. The house always wins, and today you ARE the house.",
    power: "Double down" },
  { id: "elder", name: "Elder Coco", crop: [478, 95, 132], weight: 8, rarity: "RARE",
    desc: "Ancient wisdom flows through the beard. People will come to you with questions, and you will have answers.",
    power: "Tribal knowledge" },
  { id: "mystic", name: "Mystic Coco", crop: [622, 88, 140], weight: 8, rarity: "RARE",
    desc: "The shades see what others cannot. Trust your gut on every design call. The scepter does not lie.",
    power: "Foresight" },
  { id: "shadow", name: "Shadow Coco", crop: [592, 322, 128], weight: 4, rarity: "LEGENDARY",
    desc: "The forbidden Coco. Few have rolled it. Speak little, judge everything, and walk the halls unseen.",
    power: "Vanish from meetings" },
];

// The daily vault: the most coins anyone can earn per day (algebra + tribute combined).
// The database rules enforce this too, so if you change it, also change DAILY_CAP in
// tools/make_rules.py, regenerate database.rules.json, and republish the rules.
export const DAILY_CAP = 150;
// Vault days roll over at midnight US Central Standard Time (06:00 UTC)
const DAY_MS = 86400000, DAY_OFFSET = 21600000;
export const vaultDay = ms => ms - ((ms - DAY_OFFSET) % DAY_MS);
// Minimum time between two earnings (also enforced by the rules), so scripts can't farm instantly
export const EARN_GAP = 20000;
export const vaultLeft = (p, now) => DAILY_CAP - (p.earn && p.earn.day === vaultDay(now) ? p.earn.today : 0);

export const STAT_KEYS = ["spins", "cocos", "busts", "longestDry", "coinsEarned", "coinsSpent", "coinsLost",
  "games", "boosts", "tributes", "curses", "atonements"];
export const STAT_LABELS = {
  spins: "Lifetime spins", cocos: "Cocos found", busts: "Busts", longestDry: "Longest drought",
  coinsEarned: "Coins earned", coinsSpent: "Coins spent", coinsLost: "Coins lost to the gods",
  games: "Mini-games played", boosts: "Boosts bought",
  tributes: "Tributes paid", curses: "Times cursed", atonements: "Atonements",
};

export function cropStyle(el, crop) {
  const [x, y, s] = crop;
  el.style.backgroundSize = (IMG_W / s * 100) + "% auto";
  el.style.backgroundPosition = (x / (IMG_W - s) * 100) + "% " + (y / (IMG_H - s) * 100) + "%";
}

export function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Player record shape:
// { name, coins, counts: { [cocoId]: n }, latest, dry, boosts: [{ name, chance, spins }],
//   boostDay: { [boostId]: date }, pledgeDay, pledgeDeclined, cursedDay, stats: {...} }
// The database drops empty objects/arrays, so fill in anything missing.
export function normalizePlayer(p) {
  p = p || {};
  p.coins = p.coins || 0;
  p.counts = p.counts || {};
  p.dry = p.dry || 0;
  p.boosts = Array.isArray(p.boosts) ? p.boosts.filter(Boolean) : Object.values(p.boosts || {});
  p.boostDay = p.boostDay || {};
  p.best = p.best || {};
  p.stats = p.stats || {};
  p.stats.since = p.stats.since || today();
  for (const k of STAT_KEYS) p.stats[k] = p.stats[k] || 0;
  return p;
}

// What other players can see about you (stored under public/<uid>)
export function publicProfile(p) {
  return {
    name: p.name,
    coins: p.coins,
    counts: p.counts,
    latest: p.latest || null,
    spins: p.stats.spins,
    cocos: p.stats.cocos,
    longestDry: p.stats.longestDry,
    since: p.stats.since,
    cursedDay: p.cursedDay || null,
  };
}

export function ago(ms) {
  if (!ms) return "a while ago";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " hr ago";
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : d + " days ago";
}

// Database keys can't contain . # $ [ ] /
export const nameKey = name => name.trim().toLowerCase().replace(/[.#$\[\]\/]/g, "_");
