// Storage layer. Uses Firebase Realtime Database when firebase-config.js is filled in,
// otherwise a local test mode backed by localStorage (add ?as=<anything> to the URL to
// pretend to be a different player in another tab).
import { firebaseConfig } from "./firebase-config.js";
import { COCOS, DAILY_CAP, EARN_GAP, vaultDay, normalizePlayer, publicProfile, nameKey } from "./cocos.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
export const isLocal = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE");
const FEED_KEEP = 200; // local mode only

// Applies { "a/b": value } style patches to a plain object (null deletes)
function applyPatch(obj, patch) {
  for (const [path, value] of Object.entries(patch)) {
    const parts = path.split("/");
    let o = obj;
    for (const k of parts.slice(0, -1)) o = o[k] = o[k] && typeof o[k] === "object" ? o[k] : {};
    const last = parts[parts.length - 1];
    if (value === null) delete o[last]; else o[last] = value;
  }
}

// Mirror of the player rules in database.rules.json, so local test mode rejects the same
// writes Firebase would. Returns an error message, or null if the write is allowed.
export function checkPlayerWrite(old, neu, now) {
  const sum = c => COCOS.reduce((s, k) => s + ((c || {})[k.id] || 0), 0);
  if (!neu) return "players can't delete themselves";
  if (old?.name && neu.name !== old.name) return "name is locked";
  if (old?.earn && !neu.earn) return "vault can't be deleted";
  if (!old) {
    if (neu.coins !== 0) return "new players start with 0 coins";
  } else if (neu.coins > old.coins) {
    const e = neu.earn || {}, o = old.earn || {};
    if (!(e.at <= now && e.at > now - 120000)) return "vault timestamp is off";
    if (!(e.at >= (o.at || 0) + EARN_GAP)) return "earning too fast";
    if (e.day !== vaultDay(e.at)) return "vault day is wrong";
    if (e.today > DAILY_CAP) return "daily vault limit reached";
    if (e.today !== (o.day === e.day ? o.today : 0) + neu.coins - old.coins) return "coins don't match the vault";
  }
  if (old?.earn && neu.earn) {
    const e = neu.earn, o = old.earn;
    if (!(e.day <= now && e.at >= o.at && (e.day > o.day || (e.day === o.day && e.today >= o.today)))) return "vault can't be rewound";
  }
  const spent = old && neu.coins < old.coins;
  if (sum(neu.counts) > sum(old?.counts) && !(sum(neu.counts) === sum(old?.counts) + 1 && spent)) return "too many new Cocos";
  for (const k of ["spins", "cocos"]) {
    const n = neu.stats?.[k] ?? 0, o = old?.stats?.[k];
    if (o === undefined ? n !== 0 : n > o && !(n === o + 1 && spent)) return `bad ${k} count`;
  }
  if ((neu.stats?.longestDry || 0) > (neu.stats?.spins || 0)) return "longest drought can't exceed spins";
  return null;
}
function checkPublicWrite(player, pub) {
  if (!pub) return null;
  const p = normalizePlayer(structuredClone(player || {}));
  const real = publicProfile(p);
  for (const k of ["name", "coins", "spins", "cocos", "longestDry"]) if ((pub[k] || 0) !== (real[k] || 0)) return `public ${k} doesn't match`;
  for (const c of COCOS) if (((pub.counts || {})[c.id] || 0) !== (p.counts[c.id] || 0)) return "public collection doesn't match";
  return null;
}

// ---------------------------------------------------------------- local test mode
function localStore() {
  const DB_KEY = "coco-local-db";
  const blank = db => {
    for (const k of ["players", "status", "names", "public", "friends", "feed"]) db[k] = db[k] || {};
    return db;
  };
  const read = () => {
    try { return blank(JSON.parse(localStorage.getItem(DB_KEY)) || {}); } catch (e) { return blank({}); }
  };
  const listeners = new Set();
  const notify = () => { const db = read(); listeners.forEach(fn => fn(db)); };
  addEventListener("storage", e => { if (e.key === DB_KEY) notify(); });
  const listen = fn => { listeners.add(fn); fn(read()); return () => listeners.delete(fn); };
  const edit = fn => {
    const db = read();
    const result = fn(db);
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {}
    notify();
    return result;
  };

  let uid = new URLSearchParams(location.search).get("as");
  if (!uid) {
    try { uid = localStorage.getItem("coco-local-uid"); } catch (e) {}
    if (!uid) { uid = "local-" + Math.random().toString(36).slice(2, 10); try { localStorage.setItem("coco-local-uid", uid); } catch (e) {} }
  } else uid = "local-" + uid;

  const syncPublic = (db, id) => {
    const p = db.players[id];
    if (p?.name) db.public[id] = JSON.parse(JSON.stringify(publicProfile(normalizePlayer(structuredClone(p)))));
    else delete db.public[id];
  };

  return {
    mode: "local",
    get uid() { return uid; },
    serverNow: () => Date.now(),
    async init() {
      const setOnline = online => edit(db => { db.status[uid] = { online, lastChanged: Date.now() }; });
      setOnline(true);
      addEventListener("pagehide", () => setOnline(false));
      return uid;
    },
    watchPlayer(cb) { return listen(db => cb(db.players[uid] || null)); },
    async mutate(fn) {
      const db = read();
      const old = db.players[uid] ? structuredClone(db.players[uid]) : null;
      const p = normalizePlayer(structuredClone(db.players[uid] || {}));
      fn(p);
      const err = checkPlayerWrite(old, JSON.parse(JSON.stringify(p)), Date.now());
      if (err) throw new Error("Permission denied (" + err + ")");
      edit(d => { d.players[uid] = p; });
    },
    async claimName(name) {
      return edit(db => {
        const owner = db.names[nameKey(name)];
        if (owner && owner !== uid) return false;
        db.names[nameKey(name)] = uid;
        const p = normalizePlayer(db.players[uid]);
        p.name = name;
        db.players[uid] = p;
        return true;
      });
    },

    // Social
    async publish(profile) {
      const db = read();
      const err = checkPublicWrite(db.players[uid], profile);
      if (err) throw new Error("Permission denied (" + err + ")");
      edit(d => { d.public[uid] = JSON.parse(JSON.stringify(profile)); });
    },
    watchPublic(cb) { return listen(db => cb(db.public)); },
    watchStatus(cb) { return listen(db => cb(db.status)); },
    watchFriends(cb) { return listen(db => cb(db.friends[uid] || {})); },
    watchFeed(cb, n) {
      return listen(db => cb(Object.entries(db.feed).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-n).map(([id, v]) => ({ id, ...v }))));
    },
    async postFeed(event) {
      edit(db => {
        const id = String(Date.now()).padStart(15, "0") + Math.random().toString(36).slice(2, 6);
        db.feed[id] = { ...event, uid, at: Date.now() };
        const keys = Object.keys(db.feed).sort();
        for (const k of keys.slice(0, Math.max(0, keys.length - FEED_KEEP))) delete db.feed[k];
      });
    },
    async friendRequest(other) { edit(db => { (db.friends[uid] ||= {})[other] = "outgoing"; (db.friends[other] ||= {})[uid] = "incoming"; }); },
    async friendAccept(other) { edit(db => { (db.friends[uid] ||= {})[other] = "accepted"; (db.friends[other] ||= {})[uid] = "accepted"; }); },
    async friendRemove(other) { edit(db => { delete (db.friends[uid] || {})[other]; delete (db.friends[other] || {})[uid]; }); },

    // Admin (local mode: password "admin")
    async adminSignIn(email, password) {
      if (password !== "admin") throw new Error('In local test mode the password is "admin".');
      sessionStorage.setItem("coco-local-admin", email);
      this._authCb?.({ email, uid: "local-admin" });
    },
    async adminSignOut() { sessionStorage.removeItem("coco-local-admin"); this._authCb?.(null); },
    onAdminAuth(cb) {
      this._authCb = cb;
      const email = sessionStorage.getItem("coco-local-admin");
      cb(email ? { email, uid: "local-admin" } : null);
    },
    async isAdmin() { return true; },
    watchAll(cb) { return listen(db => cb(db.players, db.status)); },
    async adminUpdate(id, patch) { edit(db => { db.players[id] = db.players[id] || {}; applyPatch(db.players[id], patch); syncPublic(db, id); }); },
    async adminRename(id, newName) {
      return edit(db => {
        const key = nameKey(newName), owner = db.names[key];
        if (owner && owner !== id) return false;
        const old = db.players[id]?.name;
        if (old) delete db.names[nameKey(old)];
        db.names[key] = id;
        db.players[id].name = newName;
        syncPublic(db, id);
        return true;
      });
    },
    async adminDelete(id) {
      edit(db => {
        const old = db.players[id]?.name;
        if (old && db.names[nameKey(old)] === id) delete db.names[nameKey(old)];
        for (const other of Object.keys(db.friends[id] || {})) delete (db.friends[other] || {})[id];
        delete db.friends[id];
        delete db.players[id];
        delete db.public[id];
        delete db.status[id];
      });
    },
    async adminGrantAll(coins) {
      edit(db => {
        for (const [id, p] of Object.entries(db.players)) { p.coins = Math.max(0, (p.coins || 0) + coins); syncPublic(db, id); }
      });
    },
    async adminClearFeed() { edit(db => { db.feed = {}; }); },
  };
}

// ---------------------------------------------------------------- Firebase
async function firebaseStore(appName) {
  const [{ initializeApp }, A, D] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js"),
    import(SDK + "firebase-database.js"),
  ]);
  // The admin page uses its own app name so its login never replaces a player's session
  const app = initializeApp(firebaseConfig, appName);
  const auth = A.getAuth(app);
  const db = D.getDatabase(app);
  const r = path => D.ref(db, path);
  let uid = null, offset = 0;
  D.onValue(r(".info/serverTimeOffset"), s => { offset = s.val() || 0; });

  // Copy a player's record into their public profile (used after admin edits)
  async function syncPublic(id) {
    const p = (await D.get(r(`players/${id}`))).val();
    await D.set(r(`public/${id}`), p?.name ? publicProfile(normalizePlayer(p)) : null);
  }

  return {
    mode: "firebase",
    get uid() { return uid; },
    serverNow: () => Date.now() + offset,
    async init() {
      const user = await new Promise(res => { const off = A.onAuthStateChanged(auth, u => { off(); res(u); }); });
      uid = (user || (await A.signInAnonymously(auth)).user).uid;
      // Presence: online while connected, offline (with timestamp) when the tab goes away
      const statusRef = r(`status/${uid}`);
      D.onValue(r(".info/connected"), snap => {
        if (!snap.val()) return;
        D.onDisconnect(statusRef).set({ online: false, lastChanged: D.serverTimestamp() })
          .then(() => D.set(statusRef, { online: true, lastChanged: D.serverTimestamp() }));
      });
      return uid;
    },
    watchPlayer(cb) { return D.onValue(r(`players/${uid}`), snap => cb(snap.val())); },
    async mutate(fn) {
      await D.runTransaction(r(`players/${uid}`), cur => { const p = normalizePlayer(cur); fn(p); return p; });
    },
    async claimName(name) {
      const res = await D.runTransaction(r(`names/${nameKey(name)}`), cur => (cur === null || cur === uid ? uid : undefined));
      if (!res.committed || res.snapshot.val() !== uid) return false;
      await D.runTransaction(r(`players/${uid}`), cur => { const p = normalizePlayer(cur); p.name = name; return p; });
      return true;
    },

    // Social
    async publish(profile) { await D.set(r(`public/${uid}`), profile); },
    watchPublic(cb) { return D.onValue(r("public"), s => cb(s.val() || {})); },
    watchStatus(cb) { return D.onValue(r("status"), s => cb(s.val() || {})); },
    watchFriends(cb) { return D.onValue(r(`friends/${uid}`), s => cb(s.val() || {})); },
    watchFeed(cb, n) {
      return D.onValue(D.query(r("feed"), D.limitToLast(n)), s => {
        const items = [];
        s.forEach(c => { items.push({ id: c.key, ...c.val() }); });
        cb(items);
      });
    },
    async postFeed(event) { await D.push(r("feed"), { ...event, uid, at: D.serverTimestamp() }); },
    async friendRequest(other) { await D.update(r(""), { [`friends/${uid}/${other}`]: "outgoing", [`friends/${other}/${uid}`]: "incoming" }); },
    async friendAccept(other) { await D.update(r(""), { [`friends/${uid}/${other}`]: "accepted", [`friends/${other}/${uid}`]: "accepted" }); },
    async friendRemove(other) { await D.update(r(""), { [`friends/${uid}/${other}`]: null, [`friends/${other}/${uid}`]: null }); },

    // Admin
    async adminSignIn(email, password) { await A.signInWithEmailAndPassword(auth, email, password); },
    async adminSignOut() { await A.signOut(auth); },
    onAdminAuth(cb) { A.onAuthStateChanged(auth, u => cb(u && !u.isAnonymous ? u : null)); },
    async isAdmin() {
      try { return (await D.get(r(`admins/${auth.currentUser.uid}`))).val() === true; } catch (e) { return false; }
    },
    watchAll(cb) {
      let players = {}, status = {};
      const off1 = D.onValue(r("players"), s => { players = s.val() || {}; cb(players, status); });
      const off2 = D.onValue(r("status"), s => { status = s.val() || {}; cb(players, status); });
      return () => { off1(); off2(); };
    },
    async adminUpdate(id, patch) { await D.update(r(`players/${id}`), patch); await syncPublic(id); },
    async adminRename(id, newName) {
      const res = await D.runTransaction(r(`names/${nameKey(newName)}`), cur => (cur === null || cur === id ? id : undefined));
      if (!res.committed || res.snapshot.val() !== id) return false;
      const old = (await D.get(r(`players/${id}/name`))).val();
      const patch = { [`players/${id}/name`]: newName };
      if (old && nameKey(old) !== nameKey(newName)) patch[`names/${nameKey(old)}`] = null;
      await D.update(r(""), patch);
      await syncPublic(id);
      return true;
    },
    async adminDelete(id) {
      const old = (await D.get(r(`players/${id}/name`))).val();
      const friends = (await D.get(r(`friends/${id}`))).val() || {};
      const patch = { [`players/${id}`]: null, [`public/${id}`]: null, [`status/${id}`]: null, [`friends/${id}`]: null };
      for (const other of Object.keys(friends)) patch[`friends/${other}/${id}`] = null;
      if (old) patch[`names/${nameKey(old)}`] = null;
      await D.update(r(""), patch);
    },
    async adminGrantAll(coins) {
      const players = (await D.get(r("players"))).val() || {};
      await Promise.all(Object.keys(players).map(async id => {
        await D.runTransaction(r(`players/${id}/coins`), c => Math.max(0, (c || 0) + coins));
        await syncPublic(id);
      }));
    },
    async adminClearFeed() { await D.set(r("feed"), null); },
  };
}

export async function createStore(appName) {
  return isLocal ? localStore() : firebaseStore(appName);
}
