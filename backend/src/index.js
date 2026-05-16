import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { createStore } from "./store.js";

const PORT = Number(process.env.PORT || 8787);
const STORE_PATH = String(process.env.STORE_PATH || process.env.DB_PATH || "./data/store.json");
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*");
const SCHEDULE_URL = String(process.env.SCHEDULE_URL || "http://localhost:4173/schedule.json");

const BSC_RPC_URL = String(process.env.BSC_RPC_URL || "https://bsc-rpc.publicnode.com");
const WCT_CONTRACT = String(process.env.WCT_CONTRACT || "0x0000000000000000000000000000000000000000").toLowerCase();

const POINTS_INITIAL = 5000;
const BET_MIN = 100;
const BET_MAX = 500;
const BET_CLOSE_BEFORE_MS = 5 * 60 * 1000;

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SETTLE_WINDOW_MS = 2 * 60 * 60 * 1000;
const DRAW_GUARD_MS = 6 * 60 * 60 * 1000;

const MAX_SAFE_POINTS = 9007199254740991;
const WCT_BONUS_UNIT = 100000n;
const WCT_BONUS_POINTS = 10n;
const WCT_BONUS_TIER_5M = 5000000n;
const WCT_BONUS_TIER_10M = 10000000n;

function nowMs() {
  return Date.now();
}

function normAddress(addr) {
  return String(addr || "").toLowerCase();
}

function isAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(addr || ""));
}

function safeInt(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.floor(v) : fallback;
}

function clampInt(n, min = 0) {
  return Math.max(min, safeInt(n, min));
}

function randHex(bytes = 16) {
  return ethers.hexlify(ethers.randomBytes(bytes));
}

function jsonOk(res, data) {
  res.status(200).json(data);
}

function jsonErr(res, status, message) {
  res.status(status).json({ error: String(message || "error") });
}

function buildLoginMessage({ address, nonce, issuedAt, origin }) {
  const o = String(origin || "WCT");
  return `WCT Login\nOrigin: ${o}\nAddress: ${address}\nNonce: ${nonce}\nIssued At: ${new Date(issuedAt).toISOString()}`;
}

function pow10BigInt(d) {
  const n = Math.max(0, Math.floor(Number(d || 0)));
  let r = 1n;
  for (let i = 0; i < n; i++) r *= 10n;
  return r;
}

function computeWctBonusPoints(balanceRaw, decimals) {
  const bal = typeof balanceRaw === "bigint" ? balanceRaw : 0n;
  const dec = Math.max(0, Math.floor(Number(decimals ?? 18)));
  const whole = bal / pow10BigInt(dec);
  let bonus = 0n;
  if (whole >= WCT_BONUS_TIER_10M) {
    bonus = 150n;
  } else if (whole >= WCT_BONUS_TIER_5M) {
    bonus = 70n;
  } else {
    const units = whole / WCT_BONUS_UNIT;
    bonus = units * WCT_BONUS_POINTS;
  }
  const max = BigInt(MAX_SAFE_POINTS);
  const capped = bonus > max ? max : bonus;
  return Number(capped);
}

const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
const erc20 = new ethers.Interface([
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);

async function fetchWctBonusComputed(address) {
  if (!isAddress(address) || !isAddress(WCT_CONTRACT) || WCT_CONTRACT === "0x0000000000000000000000000000000000000000") return 0;
  try {
    const decData = erc20.encodeFunctionData("decimals", []);
    const balData = erc20.encodeFunctionData("balanceOf", [address]);
    const [decHex, balHex] = await Promise.all([
      provider.call({ to: WCT_CONTRACT, data: decData }),
      provider.call({ to: WCT_CONTRACT, data: balData }),
    ]);
    const dec = Number(erc20.decodeFunctionResult("decimals", decHex)[0] ?? 18);
    const bal = BigInt(balHex);
    return computeWctBonusPoints(bal, dec);
  } catch {
    return 0;
  }
}

function parseMengyinResultsFromText(text) {
  const cleaned = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const dateRe = /\d{4}-\d{2}-\d{2}/g;
  const dates = [];
  let m = null;
  while ((m = dateRe.exec(cleaned))) dates.push({ date: m[0], idx: m.index });
  if (!dates.length) return [];

  const blocks = dates.map((d, i) => {
    const end = i + 1 < dates.length ? dates[i + 1].idx : cleaned.length;
    return { date: d.date, text: cleaned.slice(d.idx, end) };
  });

  const results = [];
  for (const b of blocks) {
    const re = /(\d{2}:\d{2})\s+([^\n]+?)\s+(\d+)\s*VS\s*(\d+)\s+([^\n]+?)(?:\s+直播入口|\n|$)/g;
    let mm = null;
    while ((mm = re.exec(b.text))) {
      const time = mm[1].trim();
      const home = mm[2].trim();
      const homeScore = Math.max(0, Math.floor(Number(mm[3] || 0)));
      const awayScore = Math.max(0, Math.floor(Number(mm[4] || 0)));
      const away = mm[5].trim();
      const id = `${b.date}_${time}_${home}_${away}`.replace(/\s+/g, "_");
      results.push({ id, homeScore, awayScore });
    }
  }
  const uniq = new Map();
  results.forEach((x) => {
    if (!uniq.has(x.id)) uniq.set(x.id, x);
  });
  return Array.from(uniq.values());
}

function outcomeFromScore(homeScore, awayScore) {
  const h = Math.max(0, Math.floor(Number(homeScore || 0)));
  const a = Math.max(0, Math.floor(Number(awayScore || 0)));
  if (h > a) return "HOME";
  if (a > h) return "AWAY";
  return "DRAW";
}

const scheduleCache = {
  loadedAt: 0,
  map: new Map(),
};

async function loadScheduleCache() {
  const now = nowMs();
  if (scheduleCache.loadedAt && now - scheduleCache.loadedAt < 60 * 1000 && scheduleCache.map.size) return scheduleCache.map;
  const res = await fetch(SCHEDULE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Schedule HTTP ${res.status}`);
  const data = await res.json();
  const matches = Array.isArray(data?.matches) ? data.matches : [];
  const map = new Map();
  matches.forEach((x) => {
    if (!x || !x.id) return;
    const kickoffMs = safeInt(x.kickoffMs, NaN);
    if (!Number.isFinite(kickoffMs)) return;
    map.set(String(x.id), { id: String(x.id), kickoffMs });
  });
  scheduleCache.loadedAt = now;
  scheduleCache.map = map;
  return map;
}

function buildCorsOptions() {
  if (ALLOWED_ORIGINS === "*" || !ALLOWED_ORIGINS.trim()) return { origin: "*" };
  const allow = new Set(
    ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return {
    origin(origin, cb) {
      if (!origin) return cb(null, false);
      return cb(null, allow.has(origin));
    },
  };
}

const store = createStore(STORE_PATH);

async function ensureUser(address) {
  await store.load();
  const a = normAddress(address);
  const existing = store.getUser(a);
  if (existing) return existing;
  const now = nowMs();
  store.setUser(a, { address: a, basePoints: POINTS_INITIAL, rankPoints: 0, bonusSpent: 0, createdAt: now, updatedAt: now });
  await store.save();
  return store.getUser(a);
}

async function auth(req, res, next) {
  await store.load();
  store.cleanup({ nowMs: nowMs(), nonceTtlMs: NONCE_TTL_MS, sessionTtlMs: SESSION_TTL_MS });
  const raw = String(req.headers.authorization || "");
  const token = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length).trim() : "";
  if (!token) return jsonErr(res, 401, "missing_token");
  const sess = store.state.sessions[token];
  if (!sess) return jsonErr(res, 401, "invalid_token");
  if (clampInt(sess.expiresAt, 0) <= nowMs()) {
    delete store.state.sessions[token];
    await store.save();
    return jsonErr(res, 401, "expired_token");
  }
  req.auth = { token, address: normAddress(sess.address) };
  next();
}

async function settleMatch(matchId, result) {
  await store.load();
  const id = String(matchId || "");
  if (!id) return false;
  if (result !== "HOME" && result !== "DRAW" && result !== "AWAY") return false;

  const pool = store.getPool(id);
  if (pool.settled) return true;

  const bets = store.listUnsettledBetsByMatch(id).map((b) => ({
    ...b,
    address: normAddress(b.address),
    amount: clampInt(b.amount, 0),
  }));

  const settledAt = nowMs();
  const markPool = () => {
    store.setPool(id, {
      totals: pool.totals,
      counts: pool.counts,
      settled: true,
      result,
      updatedAt: settledAt,
    });
  };

  if (!bets.length) {
    markPool();
    await store.save();
    return true;
  }

  for (const b of bets) {
    await ensureUser(b.address);
  }

  if (result === "DRAW") {
    bets.forEach((b) => {
      const u = store.getUser(b.address);
      store.setUser(b.address, { ...u, basePoints: u.basePoints + b.amount, updatedAt: settledAt });
      store.setBet(b.address, id, { settledResult: result, payout: b.amount, profit: 0, settledAt });
    });
    markPool();
    await store.save();
    return true;
  }

  const winners = bets.filter((b) => b.pick === result);
  const losers = bets.filter((b) => b.pick !== result);
  const totalWin = winners.reduce((a, b) => a + b.amount, 0);
  const totalLose = losers.reduce((a, b) => a + b.amount, 0);

  if (totalWin <= 0) {
    bets.forEach((b) => {
      const u = store.getUser(b.address);
      store.setUser(b.address, { ...u, basePoints: u.basePoints + b.amount, updatedAt: settledAt });
      store.setBet(b.address, id, { settledResult: result, payout: b.amount, profit: 0, settledAt });
    });
    markPool();
    await store.save();
    return true;
  }

  const win = BigInt(totalWin);
  const lose = BigInt(totalLose);
  const bonuses = winners.map((w) => {
    const amt = BigInt(w.amount);
    const prod = amt * lose;
    const bonus = prod / win;
    const rem = prod % win;
    return { ...w, bonus: Number(bonus), rem };
  });
  let bonusSum = bonuses.reduce((a, b) => a + clampInt(b.bonus, 0), 0);
  let remainder = totalLose - bonusSum;
  if (remainder > 0) {
    bonuses
      .sort((a, b) => (a.rem === b.rem ? 0 : a.rem > b.rem ? -1 : 1))
      .slice(0, remainder)
      .forEach((b) => {
        b.bonus = clampInt(b.bonus, 0) + 1;
      });
  }
  const bonusByAddr = new Map(bonuses.map((b) => [b.address, clampInt(b.bonus, 0)]));

  bets.forEach((b) => {
    const extra = b.pick === result ? bonusByAddr.get(b.address) || 0 : 0;
    const payout = b.pick === result ? b.amount + extra : 0;
    const u = store.getUser(b.address);
    if (b.pick === result) {
      store.setUser(b.address, { ...u, basePoints: u.basePoints + payout, rankPoints: u.rankPoints + extra, updatedAt: settledAt });
      store.setBet(b.address, id, { settledResult: result, payout, profit: extra, settledAt });
    } else {
      store.setBet(b.address, id, { settledResult: result, payout: 0, profit: 0, settledAt });
    }
  });

  markPool();
  await store.save();
  return true;
}

async function syncAndSettle() {
  let schedule = null;
  try {
    schedule = await loadScheduleCache();
  } catch {
    schedule = null;
  }
  if (!schedule || !schedule.size) return;

  let html = "";
  try {
    const res = await fetch("https://www.mengyinnews.cn/#fixtures", { cache: "no-store" });
    if (!res.ok) return;
    html = await res.text();
  } catch {
    return;
  }
  const list = parseMengyinResultsFromText(html);
  if (!list.length) return;
  const map = new Map(list.map((r) => [String(r.id), r]));

  const now = nowMs();
  for (const m of schedule.values()) {
    const kickoffMs = safeInt(m.kickoffMs, NaN);
    if (!Number.isFinite(kickoffMs)) continue;
    const end = kickoffMs + SETTLE_WINDOW_MS;
    if (now < end) continue;

    const pool = store.getPool(m.id);
    if (pool.settled) continue;

    const r = map.get(String(m.id));
    if (!r) continue;
    const is00 = safeInt(r.homeScore, 0) === 0 && safeInt(r.awayScore, 0) === 0;
    if (is00 && now < kickoffMs + DRAW_GUARD_MS) continue;
    await settleMatch(m.id, outcomeFromScore(r.homeScore, r.awayScore));
  }
}

const app = express();
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "128kb" }));

app.get("/health", (req, res) => jsonOk(res, { ok: true }));

app.get("/v1/nonce", async (req, res) => {
  await store.load();
  const address = normAddress(req.query.address);
  if (!isAddress(address)) return jsonErr(res, 400, "invalid_address");
  const origin = String(req.headers.origin || req.headers.host || "WCT");
  const nonce = randHex(16);
  const issuedAt = nowMs();
  const expiresAt = issuedAt + NONCE_TTL_MS;
  store.state.nonces[address] = { nonce, issuedAt, expiresAt };
  await store.save();
  const message = buildLoginMessage({ address, nonce, issuedAt, origin });
  jsonOk(res, { address, nonce, issuedAt, expiresAt, message });
});

app.post("/v1/login", async (req, res) => {
  await store.load();
  const address = normAddress(req.body?.address);
  const signature = String(req.body?.signature || "");
  if (!isAddress(address)) return jsonErr(res, 400, "invalid_address");
  if (!signature) return jsonErr(res, 400, "missing_signature");
  const nonceRow = store.state.nonces[address];
  if (!nonceRow) return jsonErr(res, 400, "missing_nonce");
  if (clampInt(nonceRow.expiresAt, 0) <= nowMs()) return jsonErr(res, 400, "expired_nonce");
  const origin = String(req.headers.origin || req.headers.host || "WCT");
  const message = buildLoginMessage({ address, nonce: String(nonceRow.nonce), issuedAt: clampInt(nonceRow.issuedAt, nowMs()), origin });
  let recovered = "";
  try {
    recovered = normAddress(ethers.verifyMessage(message, signature));
  } catch {
    return jsonErr(res, 400, "bad_signature");
  }
  if (recovered !== address) return jsonErr(res, 401, "signature_mismatch");

  delete store.state.nonces[address];
  await ensureUser(address);

  const token = randHex(32);
  const createdAt = nowMs();
  const expiresAt = createdAt + SESSION_TTL_MS;
  store.state.sessions[token] = { token, address, createdAt, expiresAt };
  await store.save();
  jsonOk(res, { token, address, expiresAt });
});

app.get("/v1/me", auth, async (req, res) => {
  const address = req.auth.address;
  const u = await ensureUser(address);
  const bonusComputed = await fetchWctBonusComputed(address);
  const bonusSpent = clampInt(u.bonusSpent, 0);
  const bonusAvailable = Math.max(0, bonusComputed - bonusSpent);
  const basePoints = clampInt(u.basePoints, 0);
  const rankPoints = clampInt(u.rankPoints, 0);
  const totalPoints = basePoints + bonusAvailable;
  jsonOk(res, { address, basePoints, rankPoints, bonusComputed, bonusSpent, bonusAvailable, totalPoints });
});

app.get("/v1/leaderboard", async (req, res) => {
  await store.load();
  const limit = Math.max(1, Math.min(50, safeInt(req.query.limit, 10)));
  const rows = Object.keys(store.state.users || {})
    .map((a) => store.getUser(a))
    .filter(Boolean)
    .sort((x, y) => y.rankPoints - x.rankPoints || x.address.localeCompare(y.address))
    .slice(0, limit);
  jsonOk(res, { rows: rows.map((r) => ({ address: r.address, rankPoints: r.rankPoints })) });
});

app.get("/v1/pools", async (req, res) => {
  await store.load();
  const raw = String(req.query.matchIds || "");
  const ids = raw
    .split(",")
    .map((s) => decodeURIComponent(s.trim()))
    .filter(Boolean)
    .slice(0, 200);
  if (!ids.length) return jsonOk(res, { pools: {} });
  const map = Object.create(null);
  ids.forEach((id) => {
    map[id] = store.getPool(String(id));
  });
  jsonOk(res, { pools: map });
});

app.get("/v1/bets", auth, async (req, res) => {
  const address = req.auth.address;
  const limit = Math.max(1, Math.min(200, safeInt(req.query.limit, 100)));
  const rows = store
    .listBetsByAddress(address)
    .slice(0, limit)
    .map((b) => ({
      matchId: String(b.matchId),
      pick: String(b.pick),
      amount: clampInt(b.amount, 0),
      spentBase: clampInt(b.spentBase, 0),
      spentBonus: clampInt(b.spentBonus, 0),
      createdAt: clampInt(b.createdAt, 0),
      result: b.settledResult ? String(b.settledResult) : null,
      payout: b.payout === null || b.payout === undefined ? null : clampInt(b.payout, 0),
      profit: b.profit === null || b.profit === undefined ? null : clampInt(b.profit, 0),
      settledAt: b.settledAt === null || b.settledAt === undefined ? null : clampInt(b.settledAt, 0),
    }));
  jsonOk(res, { rows });
});

app.post("/v1/bets", auth, async (req, res) => {
  const address = req.auth.address;
  const matchId = String(req.body?.matchId || "");
  const pick = String(req.body?.pick || "");
  const amount = Math.max(0, safeInt(req.body?.amount, 0));

  if (!matchId) return jsonErr(res, 400, "missing_matchId");
  if (pick !== "HOME" && pick !== "DRAW" && pick !== "AWAY") return jsonErr(res, 400, "invalid_pick");
  if (amount < BET_MIN || amount > BET_MAX) return jsonErr(res, 400, "invalid_amount");

  let kickoffMs = NaN;
  try {
    const schedule = await loadScheduleCache();
    kickoffMs = safeInt(schedule.get(matchId)?.kickoffMs, NaN);
  } catch {
    kickoffMs = NaN;
  }
  if (!Number.isFinite(kickoffMs)) return jsonErr(res, 400, "match_not_found");
  if (nowMs() >= kickoffMs - BET_CLOSE_BEFORE_MS) return jsonErr(res, 400, "bet_closed");

  await store.load();
  const existingBet = store.getBet(address, matchId);
  if (existingBet) return jsonErr(res, 400, "already_bet");

  const bonusComputed = await fetchWctBonusComputed(address);
  const u = await ensureUser(address);
  const bonusAvail = Math.max(0, bonusComputed - clampInt(u.bonusSpent, 0));
  const useBonus = Math.min(amount, bonusAvail);
  const useBase = amount - useBonus;
  if (useBase > clampInt(u.basePoints, 0)) return jsonErr(res, 400, "insufficient_points");

  const createdAt = nowMs();
  store.setUser(address, { ...u, basePoints: u.basePoints - useBase, bonusSpent: u.bonusSpent + useBonus, updatedAt: createdAt });

  const pool = store.getPool(matchId);
  if (pool.settled) return jsonErr(res, 400, "bet_closed");
  const totals = { ...pool.totals };
  const counts = { ...pool.counts };
  totals[pick] = clampInt(totals[pick], 0) + amount;
  counts[pick] = clampInt(counts[pick], 0) + 1;
  store.setPool(matchId, { totals, counts, settled: false, result: null, updatedAt: createdAt });

  store.setBet(address, matchId, {
    matchId,
    address,
    pick,
    amount,
    spentBase: useBase,
    spentBonus: useBonus,
    createdAt,
    settledResult: null,
    payout: null,
    profit: null,
    settledAt: null,
  });

  await store.save();

  const me = store.getUser(address);
  const bonusSpent = clampInt(me.bonusSpent, 0);
  const bonusAvailable = Math.max(0, bonusComputed - bonusSpent);
  jsonOk(res, {
    ok: true,
    me: {
      address,
      basePoints: clampInt(me.basePoints, 0),
      rankPoints: clampInt(me.rankPoints, 0),
      bonusComputed,
      bonusSpent,
      bonusAvailable,
      totalPoints: clampInt(me.basePoints, 0) + bonusAvailable,
    },
    pool: store.getPool(matchId),
    bet: store.getBet(address, matchId),
  });
});

setInterval(() => {
  syncAndSettle();
}, 60 * 1000);

await store.load();
app.listen(PORT, () => {
  process.stdout.write(`wct-backend listening on :${PORT}\n`);
});

