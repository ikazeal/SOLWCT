import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clampInt(n, min = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.floor(v));
}

function makeEmpty() {
  return {
    users: {},
    nonces: {},
    sessions: {},
    pools: {},
    betsByMatch: {},
    betsByAddress: {},
  };
}

export function createStore(filePath) {
  const state = makeEmpty();
  let loaded = false;
  let saving = Promise.resolve();

  async function load() {
    if (loaded) return state;
    await mkdir(dirname(filePath), { recursive: true }).catch(() => {});
    let raw = "";
    try {
      raw = await readFile(filePath, "utf8");
    } catch {
      raw = "";
    }
    const parsed = safeJsonParse(raw);
    const next = parsed && typeof parsed === "object" ? parsed : {};
    state.users = next.users && typeof next.users === "object" ? next.users : {};
    state.nonces = next.nonces && typeof next.nonces === "object" ? next.nonces : {};
    state.sessions = next.sessions && typeof next.sessions === "object" ? next.sessions : {};
    state.pools = next.pools && typeof next.pools === "object" ? next.pools : {};
    state.betsByMatch = next.betsByMatch && typeof next.betsByMatch === "object" ? next.betsByMatch : {};
    state.betsByAddress = next.betsByAddress && typeof next.betsByAddress === "object" ? next.betsByAddress : {};
    loaded = true;
    return state;
  }

  async function save() {
    await load();
    const tmp = `${filePath}.tmp`;
    const payload = JSON.stringify(state);
    saving = saving.then(async () => {
      await writeFile(tmp, payload, "utf8");
      await rename(tmp, filePath);
    });
    return saving;
  }

  function getUser(address) {
    const u = state.users[address];
    if (!u) return null;
    return {
      address,
      basePoints: clampInt(u.basePoints, 0),
      rankPoints: clampInt(u.rankPoints, 0),
      bonusSpent: clampInt(u.bonusSpent, 0),
      createdAt: clampInt(u.createdAt, 0),
      updatedAt: clampInt(u.updatedAt, 0),
    };
  }

  function setUser(address, next) {
    const existing = getUser(address) || { address, basePoints: 0, rankPoints: 0, bonusSpent: 0, createdAt: 0, updatedAt: 0 };
    state.users[address] = {
      ...existing,
      ...next,
      basePoints: clampInt(next.basePoints ?? existing.basePoints, 0),
      rankPoints: clampInt(next.rankPoints ?? existing.rankPoints, 0),
      bonusSpent: clampInt(next.bonusSpent ?? existing.bonusSpent, 0),
      createdAt: clampInt(next.createdAt ?? existing.createdAt, 0),
      updatedAt: clampInt(next.updatedAt ?? existing.updatedAt, 0),
    };
  }

  function getPool(matchId) {
    const p = state.pools[matchId];
    if (!p) {
      return {
        matchId,
        totals: { HOME: 0, DRAW: 0, AWAY: 0 },
        counts: { HOME: 0, DRAW: 0, AWAY: 0 },
        participantsCount: 0,
        settled: false,
        result: null,
        updatedAt: 0,
      };
    }
    const totals = p.totals && typeof p.totals === "object" ? p.totals : {};
    const counts = p.counts && typeof p.counts === "object" ? p.counts : {};
    const t = {
      HOME: clampInt(totals.HOME, 0),
      DRAW: clampInt(totals.DRAW, 0),
      AWAY: clampInt(totals.AWAY, 0),
    };
    const c = {
      HOME: clampInt(counts.HOME, 0),
      DRAW: clampInt(counts.DRAW, 0),
      AWAY: clampInt(counts.AWAY, 0),
    };
    return {
      matchId,
      totals: t,
      counts: c,
      participantsCount: c.HOME + c.DRAW + c.AWAY,
      settled: Boolean(p.settled),
      result: p.result ? String(p.result) : null,
      updatedAt: clampInt(p.updatedAt, 0),
    };
  }

  function setPool(matchId, next) {
    const existing = getPool(matchId);
    state.pools[matchId] = {
      matchId,
      totals: next.totals || existing.totals,
      counts: next.counts || existing.counts,
      settled: next.settled ?? existing.settled,
      result: next.result ?? existing.result,
      updatedAt: clampInt(next.updatedAt ?? existing.updatedAt, 0),
    };
  }

  function getBet(address, matchId) {
    const byAddr = state.betsByAddress[address] && typeof state.betsByAddress[address] === "object" ? state.betsByAddress[address] : null;
    const b = byAddr ? byAddr[matchId] : null;
    return b && typeof b === "object" ? { ...b } : null;
  }

  function setBet(address, matchId, bet) {
    if (!state.betsByAddress[address] || typeof state.betsByAddress[address] !== "object") state.betsByAddress[address] = {};
    if (!state.betsByMatch[matchId] || typeof state.betsByMatch[matchId] !== "object") state.betsByMatch[matchId] = {};
    state.betsByAddress[address][matchId] = { ...(state.betsByAddress[address][matchId] || {}), ...(bet || {}), matchId, address };
    state.betsByMatch[matchId][address] = { ...(state.betsByMatch[matchId][address] || {}), ...(bet || {}), matchId, address };
  }

  function listBetsByAddress(address) {
    const byAddr = state.betsByAddress[address] && typeof state.betsByAddress[address] === "object" ? state.betsByAddress[address] : {};
    return Object.values(byAddr)
      .filter(Boolean)
      .map((b) => ({ ...b }))
      .sort((a, b) => clampInt(b.createdAt, 0) - clampInt(a.createdAt, 0));
  }

  function listUnsettledBetsByMatch(matchId) {
    const byMatch = state.betsByMatch[matchId] && typeof state.betsByMatch[matchId] === "object" ? state.betsByMatch[matchId] : {};
    return Object.values(byMatch)
      .filter((b) => b && !b.settledAt)
      .map((b) => ({ ...b }));
  }

  function cleanup({ nowMs, nonceTtlMs, sessionTtlMs }) {
    const now = clampInt(nowMs, 0);
    Object.keys(state.nonces || {}).forEach((addr) => {
      const n = state.nonces[addr];
      if (!n || clampInt(n.expiresAt, 0) <= now) delete state.nonces[addr];
    });
    Object.keys(state.sessions || {}).forEach((tok) => {
      const s = state.sessions[tok];
      if (!s || clampInt(s.expiresAt, 0) <= now) delete state.sessions[tok];
    });
    if (nonceTtlMs || sessionTtlMs) return;
  }

  return {
    state,
    load,
    save,
    getUser,
    setUser,
    getPool,
    setPool,
    getBet,
    setBet,
    listBetsByAddress,
    listUnsettledBetsByMatch,
    cleanup,
  };
}

