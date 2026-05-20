import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { Connection, PublicKey } from "@solana/web3.js";
import pg from "pg";
import bs58 from "bs58";
import nacl from "tweetnacl";

const { Pool } = pg;

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*");
const SCHEDULE_URL = String(process.env.SCHEDULE_URL || "http://localhost:4173/schedule.json");

const RAW_DATABASE_URL = String(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || "");
const DATABASE_SSL = String(process.env.DATABASE_SSL || "true").toLowerCase() !== "false";

const BSC_RPC_URL = String(process.env.BSC_RPC_URL || "https://bsc-rpc.publicnode.com");
const WCT_CONTRACT = String(process.env.WCT_CONTRACT || "0xD57302103E268A7B161cA26A1e978f26d2097777").toLowerCase();
const SOL_RPC_URL = String(process.env.SOL_RPC_URL || "https://api.mainnet-beta.solana.com");
const SOL_WCT_MINT = String(process.env.SOL_WCT_MINT || "").trim();

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
  const raw = String(addr || "").trim();
  return isAddress(raw) ? raw.toLowerCase() : raw;
}

function isAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(addr || ""));
}

function isSolAddress(addr) {
  const raw = String(addr || "").trim();
  if (!raw) return false;
  try {
    const pk = new PublicKey(raw);
    return Boolean(pk && pk.toBase58() === raw);
  } catch {
    return false;
  }
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

function kickoffMsFromMatchId(matchId) {
  const raw = String(matchId || "");
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}:\d{2})_/);
  if (!m) return NaN;
  const iso = `${m[1]}T${m[2]}:00+08:00`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : NaN;
}

function decodeSignatureBytes(signature) {
  const raw = String(signature || "").trim();
  if (!raw) return null;
  const s = raw.startsWith("base64:") ? raw.slice("base64:".length) : raw;
  const looksBase64 = /[+/=]/.test(s) || /^[A-Za-z0-9+/]+={0,2}$/.test(s);
  if (looksBase64) {
    try {
      const b = Buffer.from(s, "base64");
      return b && b.length ? new Uint8Array(b) : null;
    } catch {
    }
  }
  try {
    const b = bs58.decode(s);
    return b && b.length ? new Uint8Array(b) : null;
  } catch {
  }
  try {
    const b = Buffer.from(s, "base64");
    return b && b.length ? new Uint8Array(b) : null;
  } catch {
    return null;
  }
}

function verifyEvmLoginMessage({ address, signature, message }) {
  const target = normAddress(address);
  const sig = String(signature || "");
  const msg = String(message || "");
  const variants = Array.from(new Set([msg, msg.replace(/\r\n/g, "\n"), msg.replace(/\n/g, "\r\n")])).filter(Boolean);

  let badSig = true;
  for (const m of variants) {
    const payloads = [m, ethers.toUtf8Bytes(m)];
    for (const p of payloads) {
      try {
        const recovered = normAddress(ethers.verifyMessage(p, sig));
        badSig = false;
        if (recovered === target) return { ok: true };
      } catch {
        continue;
      }
    }
  }
  return { ok: false, reason: badSig ? "bad_signature" : "signature_mismatch" };
}

function verifySolLoginMessage({ address, signature, message }) {
  const target = String(address || "").trim();
  if (!isSolAddress(target)) return { ok: false, reason: "invalid_address" };
  const sigBytes = decodeSignatureBytes(signature);
  if (!sigBytes) return { ok: false, reason: "bad_signature" };
  const msg = String(message || "");
  const variants = Array.from(new Set([msg, msg.replace(/\r\n/g, "\n"), msg.replace(/\n/g, "\r\n")])).filter(Boolean);
  const pkBytes = new PublicKey(target).toBytes();
  for (const m of variants) {
    const msgBytes = new TextEncoder().encode(m);
    try {
      if (nacl.sign.detached.verify(msgBytes, sigBytes, pkBytes)) return { ok: true };
    } catch {
      continue;
    }
  }
  return { ok: false, reason: "signature_mismatch" };
}

function verifyLoginMessage({ address, signature, message }) {
  const raw = String(address || "").trim();
  if (isAddress(raw)) return verifyEvmLoginMessage({ address: raw, signature, message });
  if (isSolAddress(raw)) return verifySolLoginMessage({ address: raw, signature, message });
  return { ok: false, reason: "invalid_address" };
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

const db =
  DATABASE_URL
    ? new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
        max: 5,
        idleTimeoutMillis: 30_000,
      })
    : null;

async function dbQuery(text, params) {
  if (!db) throw new Error("db_unavailable");
  return await db.query(text, params);
}

async function ensureDbSchema() {
  if (!db) return;
  await dbQuery("alter table if exists public.nonces add column if not exists origin text", []);
  await dbQuery("alter table if exists public.nonces add column if not exists message text", []);
}

const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
const solConnection = new Connection(SOL_RPC_URL, "confirmed");
const erc20 = new ethers.Interface([
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);

const PANCAKE_V2_FACTORY = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";
const WBNB_ADDRESS = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";

const v2Factory = new ethers.Interface(["function getPair(address,address) view returns (address)"]);
const v2Pair = new ethers.Interface([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)",
]);

function parseCompactUsd(text) {
  const raw = String(text || "").trim();
  const m = raw.match(/^\$?\s*([0-9]+(?:\.[0-9]+)?)\s*([KMB])?\s*$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const suf = String(m[2] || "").toUpperCase();
  const mul = suf === "B" ? 1e9 : suf === "M" ? 1e6 : suf === "K" ? 1e3 : 1;
  return n * mul;
}

function ratioBigIntToNumber(num, den, precision = 18) {
  const n = typeof num === "bigint" ? num : 0n;
  const d = typeof den === "bigint" ? den : 0n;
  if (d === 0n) return null;
  const p = Math.max(0, Math.min(24, Math.floor(Number(precision || 18))));
  const scaled = (n * pow10BigInt(p)) / d;
  const asNum = Number(scaled) / Math.pow(10, p);
  return Number.isFinite(asNum) ? asNum : null;
}

function norm0x(addr) {
  const a = normAddress(addr);
  return isAddress(a) ? a : "";
}

async function callHex(to, data) {
  const out = await provider.call({ to, data });
  return String(out || "0x");
}

async function tokenDecimals(token) {
  const decHex = await callHex(token, erc20.encodeFunctionData("decimals", []));
  return Number(erc20.decodeFunctionResult("decimals", decHex)[0] ?? 18);
}

async function tokenTotalSupply(token) {
  const out = await callHex(token, "0x18160ddd");
  return BigInt(out || "0x0");
}

async function v2GetPair(a, b) {
  const out = await callHex(PANCAKE_V2_FACTORY, v2Factory.encodeFunctionData("getPair", [a, b]));
  const addr = ethers.getAddress(`0x${out.replace(/^0x/i, "").slice(-40)}`);
  return normAddress(addr);
}

async function v2PairMeta(pair) {
  const [t0Hex, t1Hex, resHex] = await Promise.all([
    callHex(pair, v2Pair.encodeFunctionData("token0", [])),
    callHex(pair, v2Pair.encodeFunctionData("token1", [])),
    callHex(pair, v2Pair.encodeFunctionData("getReserves", [])),
  ]);
  const t0 = normAddress(ethers.getAddress(`0x${t0Hex.replace(/^0x/i, "").slice(-40)}`));
  const t1 = normAddress(ethers.getAddress(`0x${t1Hex.replace(/^0x/i, "").slice(-40)}`));
  const decoded = v2Pair.decodeFunctionResult("getReserves", resHex);
  const r0 = BigInt(decoded[0] ?? 0n);
  const r1 = BigInt(decoded[1] ?? 0n);
  return { token0: t0, token1: t1, r0, r1 };
}

async function fetchFlapMarketCapUsd(contract) {
  const addr = String(contract || "").trim();
  if (!isAddress(addr)) return null;
  const url = `https://flap.sh/bnb/${addr}`;
  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  const text = await res.text();
  const m = text.match(/Market\s*Cap[\s\S]*?\$([0-9.,]+)\s*([KMB])?/i);
  if (!m) return null;
  const v = `${String(m[1] || "").replace(/,/g, "")}${m[2] || ""}`;
  return parseCompactUsd(v);
}

async function fetchBscScanHolders(contract) {
  const addr = String(contract || "").trim();
  if (!isAddress(addr)) return null;
  const url = `https://bscscan.com/token/${addr}`;
  const res = await fetch(url, { cache: "no-store", headers: { "user-agent": "Mozilla/5.0" } }).catch(() => null);
  if (!res || !res.ok) return null;
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n");
  const m = text.match(/Holders\s*\n\s*([0-9,]+)/i);
  if (!m) return null;
  const n = Number(String(m[1] || "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function fetchBackendTokenSnapshot(contract) {
  const addr = norm0x(contract) || norm0x(WCT_CONTRACT);
  if (!addr) return null;

  const [dec, supplyRaw] = await Promise.all([tokenDecimals(addr), tokenTotalSupply(addr)]);
  const totalSupply = ratioBigIntToNumber(supplyRaw, pow10BigInt(dec), 6);

  const zero = "0x0000000000000000000000000000000000000000";
  const [pairWbnb, pairUsdt, pairBnbUsdt] = await Promise.all([v2GetPair(addr, WBNB_ADDRESS), v2GetPair(addr, USDT_ADDRESS), v2GetPair(WBNB_ADDRESS, USDT_ADDRESS)]);

  let bnbUsd = null;
  if (pairBnbUsdt && pairBnbUsdt !== normAddress(zero)) {
    const meta = await v2PairMeta(pairBnbUsdt);
    const dWbnb = 18;
    const dUsdt = 18;
    const num = meta.token0 === normAddress(WBNB_ADDRESS) ? meta.r1 * pow10BigInt(dWbnb) : meta.r0 * pow10BigInt(dWbnb);
    const den = meta.token0 === normAddress(WBNB_ADDRESS) ? meta.r0 * pow10BigInt(dUsdt) : meta.r1 * pow10BigInt(dUsdt);
    bnbUsd = ratioBigIntToNumber(num, den, 18);
  }

  let priceUsd = null;
  let priceNative = null;
  let liquidityUsd = null;
  let pairAddress = "";

  const hasWbnbPair = pairWbnb && pairWbnb !== normAddress(zero);
  const hasUsdtPair = pairUsdt && pairUsdt !== normAddress(zero);

  if (hasWbnbPair) {
    pairAddress = pairWbnb;
    const meta = await v2PairMeta(pairWbnb);
    const tokenDec = dec;
    const quoteDec = 18;
    const tokenIs0 = meta.token0 === normAddress(addr);
    const rToken = tokenIs0 ? meta.r0 : meta.r1;
    const rQuote = tokenIs0 ? meta.r1 : meta.r0;
    const num = rQuote * pow10BigInt(tokenDec);
    const den = rToken * pow10BigInt(quoteDec);
    priceNative = ratioBigIntToNumber(num, den, 18);
    if (typeof priceNative === "number" && Number.isFinite(priceNative) && typeof bnbUsd === "number" && Number.isFinite(bnbUsd)) priceUsd = priceNative * bnbUsd;
    const reserveWbnb = ratioBigIntToNumber(rQuote, pow10BigInt(18), 6);
    if (typeof reserveWbnb === "number" && Number.isFinite(reserveWbnb) && typeof bnbUsd === "number" && Number.isFinite(bnbUsd)) liquidityUsd = reserveWbnb * bnbUsd * 2;
  } else if (hasUsdtPair) {
    pairAddress = pairUsdt;
    const meta = await v2PairMeta(pairUsdt);
    const tokenDec = dec;
    const quoteDec = 18;
    const tokenIs0 = meta.token0 === normAddress(addr);
    const rToken = tokenIs0 ? meta.r0 : meta.r1;
    const rQuote = tokenIs0 ? meta.r1 : meta.r0;
    const num = rQuote * pow10BigInt(tokenDec);
    const den = rToken * pow10BigInt(quoteDec);
    priceUsd = ratioBigIntToNumber(num, den, 18);
    if (typeof priceUsd === "number" && Number.isFinite(priceUsd) && typeof bnbUsd === "number" && Number.isFinite(bnbUsd) && bnbUsd > 0) priceNative = priceUsd / bnbUsd;
    const reserveUsdt = ratioBigIntToNumber(rQuote, pow10BigInt(18), 6);
    if (typeof reserveUsdt === "number" && Number.isFinite(reserveUsdt)) liquidityUsd = reserveUsdt * 2;
  }

  let marketCap = null;
  if (typeof priceUsd === "number" && Number.isFinite(priceUsd) && typeof totalSupply === "number" && Number.isFinite(totalSupply)) marketCap = priceUsd * totalSupply;

  if (!(typeof marketCap === "number" && Number.isFinite(marketCap) && marketCap > 0)) {
    const flapMc = await fetchFlapMarketCapUsd(addr);
    if (typeof flapMc === "number" && Number.isFinite(flapMc) && flapMc > 0) {
      marketCap = flapMc;
      if (!(typeof priceUsd === "number" && Number.isFinite(priceUsd) && priceUsd > 0) && typeof totalSupply === "number" && Number.isFinite(totalSupply) && totalSupply > 0) {
        priceUsd = flapMc / totalSupply;
        if (typeof bnbUsd === "number" && Number.isFinite(bnbUsd) && bnbUsd > 0) priceNative = priceUsd / bnbUsd;
      }
    }
  }

  const holders = await fetchBscScanHolders(addr);

  return {
    source: "backend",
    contract: addr,
    pairAddress,
    priceUsd: typeof priceUsd === "number" && Number.isFinite(priceUsd) ? priceUsd : null,
    priceNative: typeof priceNative === "number" && Number.isFinite(priceNative) ? priceNative : null,
    liquidityUsd: typeof liquidityUsd === "number" && Number.isFinite(liquidityUsd) ? liquidityUsd : null,
    volume24hUsd: null,
    marketCap: typeof marketCap === "number" && Number.isFinite(marketCap) ? marketCap : null,
    totalSupply: typeof totalSupply === "number" && Number.isFinite(totalSupply) ? totalSupply : null,
    holders: typeof holders === "number" && Number.isFinite(holders) ? holders : null,
    ts: nowMs(),
  };
}

function pickDexPair(pairs) {
  const list = Array.isArray(pairs) ? pairs : [];
  return list
    .filter((p) => p && p.pairAddress && p.priceUsd)
    .sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
}

async function fetchDexScreenerSolTokenSnapshot(mint) {
  const addr = String(mint || "").trim();
  if (!isSolAddress(addr)) return null;
  const url = `https://api.dexscreener.com/token-pairs/v1/solana/${addr}`;
  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json().catch(() => null);
  const pair = pickDexPair(json);
  if (!pair) return null;
  const priceUsd = Number(pair.priceUsd);
  const priceNative = Number(pair.priceNative);
  const liquidityUsd = Number(pair?.liquidity?.usd || 0);
  const volume24hUsd = Number(pair?.volume?.h24 || 0);
  const marketCap = Number(pair?.marketCap || pair?.fdv || 0);
  return {
    source: "dexscreener",
    url: String(pair.url || ""),
    pairAddress: String(pair.pairAddress || ""),
    name: String(pair?.baseToken?.name || ""),
    symbol: String(pair?.baseToken?.symbol || ""),
    priceUsd: Number.isFinite(priceUsd) ? priceUsd : null,
    priceNative: Number.isFinite(priceNative) ? priceNative : null,
    liquidityUsd: Number.isFinite(liquidityUsd) ? liquidityUsd : null,
    volume24hUsd: Number.isFinite(volume24hUsd) ? volume24hUsd : null,
    marketCap: Number.isFinite(marketCap) ? marketCap : null,
    ts: nowMs(),
  };
}

async function fetchSolTokenSupplyUi(mint) {
  const addr = String(mint || "").trim();
  if (!isSolAddress(addr)) return null;
  try {
    const pk = new PublicKey(addr);
    const s = await solConnection.getTokenSupply(pk);
    const ui = s?.value?.uiAmount;
    const uiStr = s?.value?.uiAmountString;
    const v = uiStr !== undefined && uiStr !== null ? Number(uiStr) : Number(ui);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

async function fetchSolscanHoldersCount(mint) {
  const addr = String(mint || "").trim();
  if (!isSolAddress(addr)) return null;
  const headers = { accept: "application/json", "user-agent": "Mozilla/5.0" };

  const metaUrl = `https://public-api.solscan.io/token/meta?tokenAddress=${addr}`;
  const metaRes = await fetch(metaUrl, { cache: "no-store", headers }).catch(() => null);
  if (metaRes && metaRes.ok) {
    const meta = await metaRes.json().catch(() => null);
    const candidates = [meta?.holders, meta?.holder, meta?.holderCount, meta?.holdersCount, meta?.data?.holders, meta?.data?.holderCount, meta?.data?.total];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
  }

  const holdersUrl = `https://public-api.solscan.io/token/holders?tokenAddress=${addr}&limit=1&offset=0`;
  const holdersRes = await fetch(holdersUrl, { cache: "no-store", headers }).catch(() => null);
  if (!holdersRes || !holdersRes.ok) return null;
  const holdersJson = await holdersRes.json().catch(() => null);
  const candidates = [holdersJson?.total, holdersJson?.totalCount, holdersJson?.data?.total, holdersJson?.data?.totalCount];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return null;
}

async function fetchSolBalanceLamports(address) {
  const addr = String(address || "").trim();
  if (!isSolAddress(addr)) return null;
  try {
    const pk = new PublicKey(addr);
    const lamports = await solConnection.getBalance(pk, "confirmed");
    return Number.isFinite(lamports) ? Math.max(0, Math.floor(lamports)) : null;
  } catch {
    return null;
  }
}

async function fetchWctBonusComputed(address) {
  const addr = String(address || "").trim();
  if (isAddress(addr)) {
    if (!isAddress(WCT_CONTRACT) || WCT_CONTRACT === "0x0000000000000000000000000000000000000000") return 0n;
    try {
      const decData = erc20.encodeFunctionData("decimals", []);
      const balData = erc20.encodeFunctionData("balanceOf", [addr]);
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

  if (isSolAddress(addr)) {
    const mint = String(SOL_WCT_MINT || "").trim();
    if (!isSolAddress(mint)) return 0n;
    try {
      const ownerPk = new PublicKey(addr);
      const mintPk = new PublicKey(mint);
      const resp = await solConnection.getParsedTokenAccountsByOwner(ownerPk, { mint: mintPk });
      const list = Array.isArray(resp?.value) ? resp.value : [];
      let decimals = null;
      let sumRaw = 0n;
      for (const it of list) {
        const info = it?.account?.data?.parsed?.info;
        const ta = info?.tokenAmount;
        const amt = ta?.amount !== undefined && ta?.amount !== null ? String(ta.amount) : "";
        const dec = ta?.decimals !== undefined && ta?.decimals !== null ? Number(ta.decimals) : NaN;
        if (!amt || !/^\d+$/.test(amt)) continue;
        if (Number.isFinite(dec) && dec >= 0) decimals = decimals === null ? dec : decimals;
        sumRaw += BigInt(amt);
      }
      const d = decimals === null ? 0 : Math.max(0, Math.floor(Number(decimals)));
      return sumRaw / pow10BigInt(d);
    } catch {
      return 0n;
    }
  }

  return 0n;
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

const mem = {
  nonces: new Map(),
  sessions: new Map(),
  predictions: new Map(),
  predictionsByAddr: new Map(),
  results: new Map(),
};

const sseClients = new Set();

function sseWrite(res, data) {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
  }
}

function sseBroadcast(data) {
  for (const res of Array.from(sseClients)) {
    if (!res || res.writableEnded) {
      sseClients.delete(res);
      continue;
    }
    sseWrite(res, data);
  }
}

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
    if (!db) {
      const sess = mem.sessions.get(token) || null;
      if (!sess) return jsonErr(res, 401, "invalid_token");
      const expiresAt = clampInt(sess.expiresAt, 0);
      if (expiresAt <= now) {
        mem.sessions.delete(token);
        return jsonErr(res, 401, "expired_token");
      }
      req.auth = { token, address: normAddress(sess.address) };
      return next();
    }
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
    if (!db) {
      const mid = String(m.id);
      const prev = mem.results.get(mid) || null;
      const prevRes = prev && prev.result ? String(prev.result) : "";
      if (prevRes !== outcome) mem.results.set(mid, { matchId: mid, result: outcome, settledAt: nowMs() });
    } else {
      await dbQuery(
        "insert into public.match_results(match_id, result, settled_at, updated_at) values ($1, $2, now(), now()) on conflict (match_id) do update set result = excluded.result, updated_at = now()",
        [String(m.id), outcome],
      );
    }
    sseBroadcast({ type: "result", matchId: String(m.id), result: outcome, ts: nowMs() });
  }
}

const app = express();
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "128kb" }));

app.get("/health", (req, res) => jsonOk(res, { ok: true }));

app.get("/v1/token", wrap(async (req, res) => {
  const contract = String(req.query.contract || "").trim();
  const snap = await fetchBackendTokenSnapshot(contract);
  jsonOk(res, { snapshot: snap });
}));

app.get("/v1/sol/token", wrap(async (req, res) => {
  const mint = String(req.query.mint || SOL_WCT_MINT || "").trim();
  if (!isSolAddress(mint)) return jsonOk(res, { snapshot: null });
  const [dex, totalSupply, holders, ts] = await Promise.all([
    fetchDexScreenerSolTokenSnapshot(mint),
    fetchSolTokenSupplyUi(mint),
    fetchSolscanHoldersCount(mint),
    Promise.resolve(nowMs()),
  ]);

  const priceUsd = dex && typeof dex.priceUsd === "number" && Number.isFinite(dex.priceUsd) ? dex.priceUsd : null;
  const supply = typeof totalSupply === "number" && Number.isFinite(totalSupply) ? totalSupply : null;
  const marketCapDex = dex && typeof dex.marketCap === "number" && Number.isFinite(dex.marketCap) ? dex.marketCap : null;
  const marketCap = marketCapDex !== null ? marketCapDex : typeof priceUsd === "number" && typeof supply === "number" ? priceUsd * supply : null;

  jsonOk(res, {
    snapshot: {
      source: "backend-sol",
      mint,
      url: dex ? String(dex.url || "") : "",
      pairAddress: dex ? String(dex.pairAddress || "") : "",
      name: dex ? String(dex.name || "") : "",
      symbol: dex ? String(dex.symbol || "") : "",
      priceUsd,
      priceNative: dex && typeof dex.priceNative === "number" && Number.isFinite(dex.priceNative) ? dex.priceNative : null,
      liquidityUsd: dex && typeof dex.liquidityUsd === "number" && Number.isFinite(dex.liquidityUsd) ? dex.liquidityUsd : null,
      volume24hUsd: dex && typeof dex.volume24hUsd === "number" && Number.isFinite(dex.volume24hUsd) ? dex.volume24hUsd : null,
      marketCap: typeof marketCap === "number" && Number.isFinite(marketCap) ? marketCap : null,
      totalSupply: supply,
      holders: typeof holders === "number" && Number.isFinite(holders) ? holders : null,
      ts,
    },
  });
}));

app.get("/v1/sol/pool", wrap(async (req, res) => {
  const address = String(req.query.address || "").trim();
  const lamports = await fetchSolBalanceLamports(address);
  const sol = typeof lamports === "number" ? lamports / 1e9 : null;
  jsonOk(res, { address, lamports, sol, ts: nowMs() });
}));

app.get("/v1/sol/wallet", wrap(async (req, res) => {
  const address = String(req.query.address || "").trim();
  if (!isSolAddress(address)) return jsonOk(res, { address, lamports: null, sol: null, tokenWhole: null, tokenRaw: null, tokenDecimals: null, ts: nowMs() });
  const [lamports] = await Promise.all([fetchSolBalanceLamports(address)]);

  let tokenRaw = null;
  let tokenDecimals = null;
  let tokenWhole = null;
  if (isSolAddress(SOL_WCT_MINT)) {
    try {
      const ownerPk = new PublicKey(address);
      const mintPk = new PublicKey(String(SOL_WCT_MINT).trim());
      const resp = await solConnection.getParsedTokenAccountsByOwner(ownerPk, { mint: mintPk });
      const list = Array.isArray(resp?.value) ? resp.value : [];
      let dec = null;
      let sumRaw = 0n;
      for (const it of list) {
        const info = it?.account?.data?.parsed?.info;
        const ta = info?.tokenAmount;
        const amt = ta?.amount !== undefined && ta?.amount !== null ? String(ta.amount) : "";
        const d = ta?.decimals !== undefined && ta?.decimals !== null ? Number(ta.decimals) : NaN;
        if (!amt || !/^\d+$/.test(amt)) continue;
        if (Number.isFinite(d) && d >= 0) dec = dec === null ? d : dec;
        sumRaw += BigInt(amt);
      }
      tokenRaw = sumRaw.toString();
      tokenDecimals = dec === null ? 0 : Math.max(0, Math.floor(Number(dec)));
      tokenWhole = (sumRaw / pow10BigInt(tokenDecimals)).toString();
    } catch {
      tokenRaw = null;
      tokenDecimals = null;
      tokenWhole = null;
    }
  }

  const sol = typeof lamports === "number" ? lamports / 1e9 : null;
  jsonOk(res, { address, lamports, sol, tokenWhole, tokenRaw, tokenDecimals, ts: nowMs() });
}));

app.get("/v1/stream", (req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  sseClients.add(res);
  sseWrite(res, { type: "hello", ts: nowMs() });

  const t = setInterval(() => {
    try {
      res.write(":keepalive\n\n");
    } catch {
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(t);
    sseClients.delete(res);
    try {
      res.end();
    } catch {
    }
  });
});

app.get("/v1/nonce", wrap(async (req, res) => {
  const address = normAddress(req.query.address);
  if (!isAddress(address) && !isSolAddress(address)) return jsonErr(res, 400, "invalid_address");
  const origin = String((req.headers.origin ?? req.headers.host ?? "WCT") || "WCT");
  const nonce = randHex(16);
  const issuedAt = nowMs();
  const expiresAt = issuedAt + NONCE_TTL_MS;
  const message = buildLoginMessage({ address, nonce, issuedAt, origin });
  if (!db) {
    mem.nonces.set(address, { address, nonce, origin, message, issuedAt, expiresAt });
    return jsonOk(res, { address, nonce, issuedAt, expiresAt, message });
  }
  await dbQuery(
    "insert into public.nonces(address, nonce, origin, message, issued_at, expires_at) values ($1, $2, $3, $4, to_timestamp($5/1000.0), to_timestamp($6/1000.0)) on conflict (address) do update set nonce = excluded.nonce, origin = excluded.origin, message = excluded.message, issued_at = excluded.issued_at, expires_at = excluded.expires_at",
    [address, nonce, origin, message, issuedAt, expiresAt],
  );
  jsonOk(res, { address, nonce, issuedAt, expiresAt, message });
}));

app.post("/v1/login", wrap(async (req, res) => {
  const address = normAddress(req.body?.address);
  const signature = String(req.body?.signature || "");
  if (!isAddress(address) && !isSolAddress(address)) return jsonErr(res, 400, "invalid_address");
  if (!signature) return jsonErr(res, 400, "missing_signature");
  if (!db) {
    const nonceRow = mem.nonces.get(address) || null;
    if (!nonceRow) return jsonErr(res, 400, "missing_nonce");
    if (clampInt(nonceRow.expiresAt, 0) <= nowMs()) return jsonErr(res, 400, "expired_nonce");
    const message = String(nonceRow.message || "") || buildLoginMessage({
      address,
      nonce: String(nonceRow.nonce),
      issuedAt: clampInt(nonceRow.issuedAt, nowMs()),
      origin: nonceRow.origin ? String(nonceRow.origin) : String((req.headers.origin ?? req.headers.host ?? "WCT") || "WCT"),
    });
    const v = verifyLoginMessage({ address, signature, message });
    if (!v.ok) return jsonErr(res, v.reason === "bad_signature" ? 400 : 401, v.reason);
    mem.nonces.delete(address);
    const token = randHex(32);
    const createdAt = nowMs();
    const expiresAt = createdAt + SESSION_TTL_MS;
    mem.sessions.set(token, { token, address, expiresAt });
    return jsonOk(res, { token, address, expiresAt });
  }
  const nonceRes = await dbQuery(
    "select address, nonce, origin, message, extract(epoch from issued_at)*1000 as issued_at_ms, extract(epoch from expires_at)*1000 as expires_at_ms from public.nonces where address = $1 limit 1",
    [address],
  );
  const nonceRow = nonceRes.rows && nonceRes.rows[0] ? nonceRes.rows[0] : null;
  if (!nonceRow) return jsonErr(res, 400, "missing_nonce");
  if (clampInt(nonceRow.expires_at_ms, 0) <= nowMs()) return jsonErr(res, 400, "expired_nonce");
  const message = String(nonceRow.message || "") || buildLoginMessage({
    address,
    nonce: String(nonceRow.nonce),
    issuedAt: clampInt(nonceRow.issued_at_ms, nowMs()),
    origin: nonceRow.origin ? String(nonceRow.origin) : String((req.headers.origin ?? req.headers.host ?? "WCT") || "WCT"),
  });
  const v = verifyLoginMessage({ address, signature, message });
  if (!v.ok) return jsonErr(res, v.reason === "bad_signature" ? 400 : 401, v.reason);

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
  const limit = Math.max(1, Math.min(100, safeInt(req.query.limit, 10)));
  const eligibleMin = Math.max(1, Math.min(1000, safeInt(req.query.eligibleMin, 20)));
  if (!db) {
    const rows = [];
    for (const [addr, list] of Array.from(mem.predictionsByAddr.entries())) {
      const picks = Array.isArray(list) ? list : [];
      const total = picks.length;
      let settled = 0;
      let correct = 0;
      for (const p of picks) {
        const mid = String(p?.matchId || "");
        const pick = String(p?.pick || "");
        const r = mem.results.get(mid) || null;
        const result = r && r.result ? String(r.result) : "";
        if (!result) continue;
        settled += 1;
        if (pick === result) correct += 1;
      }
      if (settled < eligibleMin) continue;
      const winRate = settled > 0 ? correct / settled : 0;
      const score = settled > 0 ? winRate * Math.log(1 + settled) : 0;
      rows.push({
        address: normAddress(addr),
        matches: Math.max(0, total),
        settled: Math.max(0, settled),
        correct: Math.max(0, correct),
        winRate,
        score,
        eligible: settled >= eligibleMin,
      });
    }
    rows.sort((a, b) => {
      const ds = (b.score || 0) - (a.score || 0);
      if (ds) return ds;
      const dw = (b.winRate || 0) - (a.winRate || 0);
      if (dw) return dw;
      const dset = (b.settled || 0) - (a.settled || 0);
      if (dset) return dset;
      const dc = (b.correct || 0) - (a.correct || 0);
      if (dc) return dc;
      return String(a.address).localeCompare(String(b.address));
    });
    return jsonOk(res, { rows: rows.slice(0, limit) });
  }
  const q = await dbQuery(
    `
      with stats as (
        select
          p.address as address,
          count(*) as total,
          count(*) filter (where r.result is not null) as settled,
          count(*) filter (where r.result is not null and p.pick = r.result) as correct
        from public.predictions p
        left join public.match_results r on r.match_id = p.match_id
        group by p.address
      )
      select
        address,
        total::int as total,
        settled::int as settled,
        correct::int as correct,
        case when settled > 0 then (correct::float / settled) else 0 end as win_rate,
        case when settled > 0 then (correct::float / settled) * ln(1 + settled) else 0 end as score
      from stats
      where settled >= $2
      order by score desc, win_rate desc, settled desc, correct desc, address asc
      limit $1
    `,
    [limit, eligibleMin],
  );
  const rows = (q.rows || []).map((r) => ({
    address: normAddress(r.address),
    matches: clampInt(r.total, 0),
    settled: clampInt(r.settled, 0),
    correct: clampInt(r.correct, 0),
    winRate: Number(r.win_rate || 0),
    score: Number(r.score || 0),
    eligible: clampInt(r.settled, 0) >= eligibleMin,
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
  if (!db) {
    const idSet = new Set(ids.map(String));
    const countsByMatch = new Map();
    for (const p of Array.from(mem.predictions.values())) {
      const mid = String(p?.matchId || "");
      if (!idSet.has(mid)) continue;
      const pick = String(p?.pick || "");
      if (pick !== "HOME" && pick !== "DRAW" && pick !== "AWAY") continue;
      if (!countsByMatch.has(mid)) countsByMatch.set(mid, { HOME: 0, DRAW: 0, AWAY: 0 });
      countsByMatch.get(mid)[pick] += 1;
    }
    const pools = Object.create(null);
    ids.forEach((id) => {
      const counts = countsByMatch.get(id) || { HOME: 0, DRAW: 0, AWAY: 0 };
      const participantsCount = counts.HOME + counts.DRAW + counts.AWAY;
      const r = mem.results.get(id) || null;
      const result = r && r.result ? String(r.result) : null;
      pools[id] = {
        totals: { HOME: 0, DRAW: 0, AWAY: 0 },
        counts,
        participantsCount,
        settled: Boolean(result),
        result,
        updatedAt: nowMs(),
      };
    });
    return jsonOk(res, { pools });
  }
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
  if (!db) {
    const addr = normAddress(address);
    const list = mem.predictionsByAddr.get(addr) || [];
    const rows = (Array.isArray(list) ? list : [])
      .slice()
      .sort((a, b) => clampInt(b?.createdAt, 0) - clampInt(a?.createdAt, 0))
      .slice(0, limit);
    return rows.map((b) => {
      const mid = String(b?.matchId || "");
      const r = mem.results.get(mid) || null;
      const result = r && r.result ? String(r.result) : null;
      const settledAt = r && r.settledAt ? clampInt(r.settledAt, 0) : null;
      return {
        matchId: mid,
        pick: String(b?.pick || ""),
        amount: 0,
        spentBase: 0,
        spentBonus: 0,
        createdAt: clampInt(b?.createdAt, 0),
        result,
        payout: null,
        profit: null,
        settledAt,
      };
    });
  }
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
  if (!db) {
    const addr = normAddress(address);
    const list = mem.predictionsByAddr.get(addr) || [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const end = start + 24 * 60 * 60 * 1000;
    let c = 0;
    for (const p of Array.isArray(list) ? list : []) {
      const ts = clampInt(p?.createdAt, 0);
      if (ts >= start && ts < end) c += 1;
    }
    return c;
  }
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
  if (!db) {
    const mid = String(matchId || "");
    const counts = { HOME: 0, DRAW: 0, AWAY: 0 };
    for (const p of Array.from(mem.predictions.values())) {
      const pmid = String(p?.matchId || "");
      if (pmid !== mid) continue;
      const pick = String(p?.pick || "");
      if (pick !== "HOME" && pick !== "DRAW" && pick !== "AWAY") continue;
      counts[pick] += 1;
    }
    const participantsCount = counts.HOME + counts.DRAW + counts.AWAY;
    const r = mem.results.get(mid) || null;
    const result = r && r.result ? String(r.result) : null;
    return {
      totals: { HOME: 0, DRAW: 0, AWAY: 0 },
      counts,
      participantsCount,
      settled: Boolean(result),
      result,
      updatedAt: nowMs(),
    };
  }
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
  if (!Number.isFinite(kickoffMs)) kickoffMs = kickoffMsFromMatchId(matchId);
  if (!Number.isFinite(kickoffMs)) return jsonErr(res, 400, "match_not_found");
  if (nowMs() >= kickoffMs - BET_CLOSE_BEFORE_MS) return jsonErr(res, 400, "bet_closed");

  const wholeWct = await fetchWctBonusComputed(address);
  const limit = getDailyPredictionLimit(wholeWct);
  const used = await countTodayPredictions(address);
  if (used >= limit) return jsonErr(res, 429, "daily_limit");

  const createdAt = nowMs();
  if (!db) {
    const key = `${normAddress(address)}::${matchId}`;
    if (mem.predictions.has(key)) return jsonErr(res, 400, "already_bet");
    const row = { address: normAddress(address), matchId, pick, createdAt };
    mem.predictions.set(key, row);
    if (!mem.predictionsByAddr.has(row.address)) mem.predictionsByAddr.set(row.address, []);
    mem.predictionsByAddr.get(row.address).push(row);
    const pool = await computePool(matchId);
    sseBroadcast({ type: "pool", matchId, pool, ts: nowMs() });
    sseBroadcast({ type: "leaderboard", ts: nowMs() });
    return jsonOk(res, { ok: true, pool, prediction: { matchId, pick, createdAt } });
  }
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
  sseBroadcast({ type: "pool", matchId, pool, ts: nowMs() });
  sseBroadcast({ type: "leaderboard", ts: nowMs() });
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
