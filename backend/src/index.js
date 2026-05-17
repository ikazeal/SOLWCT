import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*");
const SCHEDULE_URL = String(process.env.SCHEDULE_URL || "http://localhost:4173/schedule.json");

const RAW_DATABASE_URL = String(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || "");
const DATABASE_SSL = String(process.env.DATABASE_SSL || "true").toLowerCase() !== "false";

const BSC_RPC_URL = String(process.env.BSC_RPC_URL || "https://bsc-rpc.publicnode.com");
const WCT_CONTRACT = String(process.env.WCT_CONTRACT || "0x0000000000000000000000000000000000000000").toLowerCase();

const BET_CLOSE_BEFORE_MS = 5 * 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SETTLE_WINDOW_MS = 2 * 60 * 60 * 1000;
const DRAW_GUARD_MS = 6 * 60 * 60 * 1000;

const DAILY_PRED_LIMIT_MIN_HOLD = 100000n;
const DAILY_PRED_LIMIT_NO_HOLD = 1;
const DAILY_PRED_LIMIT_HOLD = 5;

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

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
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

function getDailyPredictionLimit(wholeWct) {
  const w = typeof wholeWct === "bigint" ? wholeWct : 0n;
  return w >= DAILY_PRED_LIMIT_MIN_HOLD ? DAILY_PRED_LIMIT_HOLD : DAILY_PRED_LIMIT_NO_HOLD;
}

function normalizeDatabaseUrl(url) {
  const raw = String(url || "");
  if (!raw) return "";
  const m = raw.match(/^(postgres(?:ql)?:\/\/[^:]+:)([^@]*)(@[\s\S]+)$/i);
  if (!m) return raw;
  const prefix = m[1];
  let password = m[2] || "";
  const suffix = m[3];
  password = password.replace(/\[/g, "%5B").replace(/\]/g, "%5D").replace(/!/g, "%21");
  return `${prefix}${password}${suffix}`;
}

const DATABASE_URL = normalizeDatabaseUrl(RAW_DATABASE_URL);

function ensureDbUrl() {
  if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
}

ensureDbUrl();

const db = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 30_000,
});

async function dbQuery(text, params) {
  return await db.query(text, params);
}

async function ensureDbSchema() {
  await dbQuery("alter table if exists public.nonces add column if not exists origin text", []);
}

const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
const erc20 = new ethers.Interface([
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);

async function fetchWctBonusComputed(address) {
  if (!isAddress(address) || !isAddress(WCT_CONTRACT) || WCT_CONTRACT === "0x0000000000000000000000000000000000000000") return 0n;
  try {
    const decData = erc20.encodeFunctionData("decimals", []);
    const balData = erc20.encodeFunctionData("balanceOf", [address]);
    const [decHex, balHex] = await Promise.all([
      provider.call({ to: WCT_CONTRACT, data: decData }),
      provider.call({ to: WCT_CONTRACT, data: balData }),
    ]);
    const dec = Number(erc20.decodeFunctionResult("decimals", decHex)[0] ?? 18);
    const bal = BigInt(balHex);
    const whole = bal / pow10BigInt(dec);
    return whole;
  } catch {
    return 0n;
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
      if (!origin) return cb(null, true);
      if (allow.has("*")) return cb(null, true);
      if (origin === "null") return cb(null, true);
      return cb(null, allow.has(origin));
    },
  };
}

async function auth(req, res, next) {
  try {
    const raw = String(req.headers.authorization || "");
    const token = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length).trim() : "";
    if (!token) return jsonErr(res, 401, "missing_token");
    const now = nowMs();
    const row = await dbQuery("select token, address, extract(epoch from expires_at)*1000 as expires_at_ms from public.sessions where token = $1 limit 1", [token]);
    const sess = row.rows && row.rows[0] ? row.rows[0] : null;
    if (!sess) return jsonErr(res, 401, "invalid_token");
    const expiresAt = clampInt(sess.expires_at_ms, 0);
    if (expiresAt <= now) {
      await dbQuery("delete from public.sessions where token = $1", [token]);
      return jsonErr(res, 401, "expired_token");
    }
    req.auth = { token, address: normAddress(sess.address) };
    return next();
  } catch {
    return jsonErr(res, 503, "db_unavailable");
  }
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

    const r = map.get(String(m.id));
    if (!r) continue;
    const is00 = safeInt(r.homeScore, 0) === 0 && safeInt(r.awayScore, 0) === 0;
    if (is00 && now < kickoffMs + DRAW_GUARD_MS) continue;
    const outcome = outcomeFromScore(r.homeScore, r.awayScore);
    await dbQuery(
      "insert into public.match_results(match_id, result, settled_at, updated_at) values ($1, $2, now(), now()) on conflict (match_id) do update set result = excluded.result, updated_at = now()",
      [String(m.id), outcome],
    );
  }
}

const app = express();
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "128kb" }));

app.get("/health", (req, res) => jsonOk(res, { ok: true }));

app.get("/v1/nonce", wrap(async (req, res) => {
  const address = normAddress(req.query.address);
  if (!isAddress(address)) return jsonErr(res, 400, "invalid_address");
  const origin = String((req.headers.origin ?? req.headers.host ?? "WCT") || "WCT");
  const nonce = randHex(16);
  const issuedAt = nowMs();
  const expiresAt = issuedAt + NONCE_TTL_MS;
  await dbQuery(
    "insert into public.nonces(address, nonce, origin, issued_at, expires_at) values ($1, $2, $3, to_timestamp($4/1000.0), to_timestamp($5/1000.0)) on conflict (address) do update set nonce = excluded.nonce, origin = excluded.origin, issued_at = excluded.issued_at, expires_at = excluded.expires_at",
    [address, nonce, origin, issuedAt, expiresAt],
  );
  const message = buildLoginMessage({ address, nonce, issuedAt, origin });
  jsonOk(res, { address, nonce, issuedAt, expiresAt, message });
}));

app.post("/v1/login", wrap(async (req, res) => {
  const address = normAddress(req.body?.address);
  const signature = String(req.body?.signature || "");
  if (!isAddress(address)) return jsonErr(res, 400, "invalid_address");
  if (!signature) return jsonErr(res, 400, "missing_signature");
  const nonceRes = await dbQuery(
    "select address, nonce, origin, extract(epoch from issued_at)*1000 as issued_at_ms, extract(epoch from expires_at)*1000 as expires_at_ms from public.nonces where address = $1 limit 1",
    [address],
  );
  const nonceRow = nonceRes.rows && nonceRes.rows[0] ? nonceRes.rows[0] : null;
  if (!nonceRow) return jsonErr(res, 400, "missing_nonce");
  if (clampInt(nonceRow.expires_at_ms, 0) <= nowMs()) return jsonErr(res, 400, "expired_nonce");
  const origin = nonceRow.origin ? String(nonceRow.origin) : String((req.headers.origin ?? req.headers.host ?? "WCT") || "WCT");
  const message = buildLoginMessage({ address, nonce: String(nonceRow.nonce), issuedAt: clampInt(nonceRow.issued_at_ms, nowMs()), origin });
  let recovered = "";
  try {
    recovered = normAddress(ethers.verifyMessage(message, signature));
  } catch {
    return jsonErr(res, 400, "bad_signature");
  }
  if (recovered !== address) return jsonErr(res, 401, "signature_mismatch");

  await dbQuery("delete from public.nonces where address = $1", [address]);

  const token = randHex(32);
  const createdAt = nowMs();
  const expiresAt = createdAt + SESSION_TTL_MS;
  await dbQuery(
    "insert into public.sessions(token, address, created_at, expires_at) values ($1, $2, to_timestamp($3/1000.0), to_timestamp($4/1000.0))",
    [token, address, createdAt, expiresAt],
  );
  jsonOk(res, { token, address, expiresAt });
}));

app.get("/v1/me", auth, wrap(async (req, res) => {
  const address = req.auth.address;
  jsonOk(res, { address });
}));

app.get("/v1/leaderboard", wrap(async (req, res) => {
  const limit = Math.max(1, Math.min(50, safeInt(req.query.limit, 10)));
  const q = await dbQuery(
    `
      with stats as (
        select
          p.address as address,
          count(*) filter (where r.result is not null) as total,
          count(*) filter (where r.result is not null and p.pick = r.result) as correct
        from public.predictions p
        left join public.match_results r on r.match_id = p.match_id
        group by p.address
      )
      select
        address,
        total::int as total,
        correct::int as correct,
        case when total > 0 then (correct::float / total) else 0 end as win_rate,
        case when total > 0 then (correct::float / total) * ln(1 + total) else 0 end as score
      from stats
      where total >= 20
      order by score desc, total desc, address asc
      limit $1
    `,
    [limit],
  );
  const rows = (q.rows || []).map((r) => ({
    address: normAddress(r.address),
    matches: clampInt(r.total, 0),
    correct: clampInt(r.correct, 0),
    winRate: Number(r.win_rate || 0),
    score: Number(r.score || 0),
  }));
  jsonOk(res, { rows });
}));

app.get("/v1/pools", wrap(async (req, res) => {
  const raw = String(req.query.matchIds || "");
  const ids = raw
    .split(",")
    .map((s) => decodeURIComponent(s.trim()))
    .filter(Boolean)
    .slice(0, 200);
  if (!ids.length) return jsonOk(res, { pools: {} });
  const countsRes = await dbQuery(
    "select match_id, pick, count(*)::int as c from public.predictions where match_id = any($1) group by match_id, pick",
    [ids],
  );
  const resultsRes = await dbQuery("select match_id, result from public.match_results where match_id = any($1)", [ids]);
  const countsByMatch = new Map();
  (countsRes.rows || []).forEach((r) => {
    const mid = String(r.match_id || "");
    const pick = String(r.pick || "");
    const c = clampInt(r.c, 0);
    if (!mid) return;
    if (pick !== "HOME" && pick !== "DRAW" && pick !== "AWAY") return;
    if (!countsByMatch.has(mid)) countsByMatch.set(mid, { HOME: 0, DRAW: 0, AWAY: 0 });
    countsByMatch.get(mid)[pick] = c;
  });
  const resultByMatch = new Map();
  (resultsRes.rows || []).forEach((r) => {
    const mid = String(r.match_id || "");
    const result = String(r.result || "");
    if (!mid) return;
    if (result !== "HOME" && result !== "DRAW" && result !== "AWAY") return;
    resultByMatch.set(mid, result);
  });
  const pools = Object.create(null);
  ids.forEach((id) => {
    const counts = countsByMatch.get(id) || { HOME: 0, DRAW: 0, AWAY: 0 };
    const participantsCount = counts.HOME + counts.DRAW + counts.AWAY;
    const result = resultByMatch.get(id) || null;
    pools[id] = {
      totals: { HOME: 0, DRAW: 0, AWAY: 0 },
      counts,
      participantsCount,
      settled: Boolean(result),
      result,
      updatedAt: nowMs(),
    };
  });
  jsonOk(res, { pools });
}));

async function listPredictionsForAddress(address, limit) {
  const q = await dbQuery(
    `
      select
        p.match_id,
        p.pick,
        extract(epoch from p.created_at)*1000 as created_at_ms,
        r.result as result,
        extract(epoch from r.settled_at)*1000 as settled_at_ms
      from public.predictions p
      left join public.match_results r on r.match_id = p.match_id
      where p.address = $1
      order by p.created_at desc
      limit $2
    `,
    [address, limit],
  );
  return (q.rows || []).map((b) => ({
    matchId: String(b.match_id),
    pick: String(b.pick),
    amount: 0,
    spentBase: 0,
    spentBonus: 0,
    createdAt: clampInt(b.created_at_ms, 0),
    result: b.result ? String(b.result) : null,
    payout: null,
    profit: null,
    settledAt: b.settled_at_ms === null || b.settled_at_ms === undefined ? null : clampInt(b.settled_at_ms, 0),
  }));
}

app.get("/v1/predictions", auth, wrap(async (req, res) => {
  const address = req.auth.address;
  const limit = Math.max(1, Math.min(200, safeInt(req.query.limit, 100)));
  const rows = await listPredictionsForAddress(address, limit);
  jsonOk(res, { rows });
}));

app.get("/v1/bets", auth, wrap(async (req, res) => {
  const address = req.auth.address;
  const limit = Math.max(1, Math.min(200, safeInt(req.query.limit, 100)));
  const rows = await listPredictionsForAddress(address, limit);
  jsonOk(res, { rows });
}));

async function countTodayPredictions(address) {
  const q = await dbQuery(
    `
      select count(*)::int as c
      from public.predictions
      where address = $1
        and created_at >= date_trunc('day', now())
        and created_at < date_trunc('day', now()) + interval '1 day'
    `,
    [address],
  );
  const c = q.rows && q.rows[0] ? q.rows[0].c : 0;
  return clampInt(c, 0);
}

async function computePool(matchId) {
  const q = await dbQuery("select pick, count(*)::int as c from public.predictions where match_id = $1 group by pick", [matchId]);
  const counts = { HOME: 0, DRAW: 0, AWAY: 0 };
  (q.rows || []).forEach((r) => {
    const pick = String(r.pick || "");
    if (pick !== "HOME" && pick !== "DRAW" && pick !== "AWAY") return;
    counts[pick] = clampInt(r.c, 0);
  });
  const participantsCount = counts.HOME + counts.DRAW + counts.AWAY;
  const rr = await dbQuery("select result from public.match_results where match_id = $1 limit 1", [matchId]);
  const result = rr.rows && rr.rows[0] && rr.rows[0].result ? String(rr.rows[0].result) : null;
  return {
    totals: { HOME: 0, DRAW: 0, AWAY: 0 },
    counts,
    participantsCount,
    settled: Boolean(result),
    result,
    updatedAt: nowMs(),
  };
}

app.post("/v1/predictions", auth, wrap(async (req, res) => {
  const address = req.auth.address;
  const matchId = String(req.body?.matchId || "");
  const pick = String(req.body?.pick || "");

  if (!matchId) return jsonErr(res, 400, "missing_matchId");
  if (pick !== "HOME" && pick !== "DRAW" && pick !== "AWAY") return jsonErr(res, 400, "invalid_pick");

  let kickoffMs = NaN;
  try {
    const schedule = await loadScheduleCache();
    kickoffMs = safeInt(schedule.get(matchId)?.kickoffMs, NaN);
  } catch {
    kickoffMs = NaN;
  }
  if (!Number.isFinite(kickoffMs)) return jsonErr(res, 400, "match_not_found");
  if (nowMs() >= kickoffMs - BET_CLOSE_BEFORE_MS) return jsonErr(res, 400, "bet_closed");

  const wholeWct = await fetchWctBonusComputed(address);
  const limit = getDailyPredictionLimit(wholeWct);
  const used = await countTodayPredictions(address);
  if (used >= limit) return jsonErr(res, 429, "daily_limit");

  const createdAt = nowMs();
  const ins = await dbQuery(
    `
      insert into public.predictions(address, match_id, pick, created_at)
      values ($1, $2, $3, to_timestamp($4/1000.0))
      on conflict (address, match_id) do nothing
      returning id
    `,
    [address, matchId, pick, createdAt],
  );
  if (!ins.rows || !ins.rows.length) return jsonErr(res, 400, "already_bet");

  const pool = await computePool(matchId);
  jsonOk(res, { ok: true, pool, prediction: { matchId, pick, createdAt } });
}));

setInterval(() => {
  syncAndSettle().catch(() => {});
}, 60 * 1000);

app.use((err, req, res, next) => {
  const msg = err && err.message ? String(err.message) : "backend_error";
  if (msg.toLowerCase().includes("connect")) return jsonErr(res, 503, "db_unavailable");
  return jsonErr(res, 503, "backend_error");
});

ensureDbSchema()
  .catch(() => {})
  .finally(() => {
    app.listen(PORT, () => {
      process.stdout.write(`wct-backend listening on :${PORT}\n`);
    });
  });
