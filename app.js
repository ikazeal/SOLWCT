"use strict";

const $ = (s) => document.querySelector(s);
const $all = (s) => document.querySelectorAll(s);

const state = {
  lang: localStorage.getItem("wct_lang") || "zh",
  token: {
    snapshot: null,
    lastUpdateMs: 0,
    history: [],
    priceHistory: [],
    loading: false,
  },
  chart: {
    range: "24H",
    points: [],
    volumes: [],
    live: false,
    effectiveWinMs: null,
    coverageMs: null,
  },
  overview: {
    points: [],
    live: false,
  },
  wallet: {
    address: null,
    connected: false,
    manualConnected: false,
    walletMenuOpen: false,
    wctBalanceRaw: 0n,
    wctDecimals: null,
    lastBalanceSyncMs: 0,
  },
  schedule: {
    matches: [],
    loaded: false,
    lastResultSyncMs: 0,
    filterStage: "ALL",
  },
  prediction: {
    modalOpen: false,
    currentMatchId: null,
  },
  backend: {
    enabled: false,
    url: null,
    jwt: null,
    loading: false,
  },
};

const I18N = {
  zh: {
    "nav.matches": "赛程预测",
    "nav.leaderboard": "排行榜",
    "nav.whitepaper": "白皮书",
    "nav.connect": "连接钱包",
    "nav.connected": "已连接",
    "nav.walletMenu": "钱包菜单",
    "nav.copyAddress": "复制地址",
    "nav.disconnect": "断开连接",
    "hero.title": "WORLDCUP TOKEN (WCT)",
    "hero.subtitle": "全球首个基于 Solana 的世界杯预测市场代币。预测胜负，瓜分 SOL 奖池。",
    "hero.buy": "立即购买 WCT",
    "hero.chart": "价格图表",
    "card.price": "当前价格",
    "card.mcap": "当前市值",
    "card.vol": "24H 交易量",
    "card.liq": "总流动性",
    "card.holders": "持币人数",
    "card.supply": "总供应量",
    "card.pool": "SOL 奖池余额",
    "card.poolHint": "页面展示口径为“奖池地址的链上原生 SOL 余额”。",
    "chart.range": "时间范围",
    "chart.deltaFormat": "{sign}{pct}% ({range})",
    "matches.upcoming": "近期热门赛程",
    "matches.viewAll": "查看全部赛程",
    "matches.predictNow": "立即预测",
    "matches.loading": "正在加载赛程...",
    "matches.noUpcoming": "暂无近期赛程",
    "matches.allTitle": "2026 世界杯完整赛程",
    "matches.filterAll": "全部",
    "matches.filterGroup": "小组赛",
    "matches.filterR32": "32 强",
    "matches.filterR16": "16 强",
    "matches.filterQF": "1/4 决赛",
    "matches.filterSF": "半决赛",
    "matches.filterFinal": "决赛",
    "matches.noMatches": "该阶段暂无赛程",
    "stage.all": "全部",
    "stage.group": "小组赛",
    "stage.r32": "32 强",
    "stage.r16": "16 强",
    "stage.qf": "1/4 决赛",
    "stage.sf": "半决赛",
    "stage.third": "三四名决赛",
    "stage.final": "决赛",
    "pred.title": "提交预测",
    "pred.choose": "请选择您预测的结果",
    "pred.home": "主胜",
    "pred.draw": "平局",
    "pred.away": "客胜",
    "pred.points": "预测积分",
    "pred.pointsHint": "预测积分将决定您在排行榜的排名。持有 WCT 可获得额外积分加成。",
    "pred.submit": "提交预测",
    "pred.submitting": "提交中...",
    "pred.success": "预测提交成功！",
    "pred.failed": "预测提交失败，请重试。",
    "pred.closed": "该场比赛预测已截止",
    "leader.title": "预测排行榜",
    "leader.subtitle": "综合胜率与活跃度排名。前 5 名瓜分 SOL 奖池。",
    "leader.rank": "排名",
    "leader.user": "用户地址",
    "leader.winRate": "胜率",
    "leader.points": "积分",
    "leader.viewFull": "查看完整排行榜",
    "leader.loading": "正在加载排行榜...",
    "leader.empty": "暂无数据",
    "leader.fullTitle": "全球预测英雄榜 (Top 100)",
    "rewards.title": "SOL 奖池奖励",
    "rewards.rules": "奖励规则",
    "rewards.rulesHtml": "<b>获奖机制</b>：前 5 名瓜分奖池——第 1 名 40%，第 2 名 20%，第 3 名 10%，第 4/5 名各 5%。<b>税费规划</b>：交易税费的 90% 用于发放奖励；剩余 10% 用于营销活动。<a href=\"./whitepaper.html\">查看详情</a>。",
    "rewards.my": "我的预测记录",
    "rewards.noBets": "您还没有提交过预测",
    "rewards.loginHint": "请连接钱包查看您的预测记录与奖励",
    "footer.rights": "© 2026 WorldCup Token (WCT). All rights reserved.",
    "time.days": "天",
    "time.hours": "时",
    "time.mins": "分",
    "time.secs": "秒",
    "toast.walletConnected": "钱包已连接",
    "toast.walletDisconnected": "钱包已断开",
    "toast.walletFailed": "钱包连接失败，请确保插件已解锁并处于 Solana 网络。",
    "toast.walletRejected": "用户取消连接",
    "toast.noWallet": "未检测到 Solana 钱包，请安装 Phantom 或其他支持 Solana 的钱包。",
    "toast.copySuccess": "地址已复制",
    "toast.contractCopied": "合约地址已复制",
    "toast.copyFailed": "复制失败",
    "toast.switchBsc": "请切换到 Solana 网络",
    "toast.predSuccess": "预测成功",
    "toast.predLimit": "今日预测次数已达上限",
    "toast.predClosed": "预测已截止",
    "toast.authFailed": "身份验证失败，请重新连接",
  },
  en: {
    "nav.matches": "Fixtures",
    "nav.leaderboard": "Leaderboard",
    "nav.whitepaper": "Whitepaper",
    "nav.connect": "Connect Wallet",
    "nav.connected": "Connected",
    "nav.walletMenu": "Wallet Menu",
    "nav.copyAddress": "Copy Address",
    "nav.disconnect": "Disconnect",
    "hero.title": "WORLDCUP TOKEN (WCT)",
    "hero.subtitle": "The world's first Solana-based World Cup prediction market token. Predict & share the SOL prize pool.",
    "hero.buy": "Buy WCT Now",
    "hero.chart": "Price Chart",
    "card.price": "Current Price",
    "card.mcap": "Market Cap",
    "card.vol": "24H Volume",
    "card.liq": "Total Liquidity",
    "card.holders": "Holders",
    "card.supply": "Total Supply",
    "card.pool": "SOL Prize Pool",
    "card.poolHint": "Displays the on-chain native SOL balance of the prize pool address.",
    "chart.range": "Time Range",
    "chart.deltaFormat": "{sign}{pct}% ({range})",
    "matches.upcoming": "Upcoming Matches",
    "matches.viewAll": "View All Fixtures",
    "matches.predictNow": "Predict Now",
    "matches.loading": "Loading fixtures...",
    "matches.noUpcoming": "No upcoming matches",
    "matches.allTitle": "2026 World Cup Schedule",
    "matches.filterAll": "All",
    "matches.filterGroup": "Group",
    "matches.filterR32": "R32",
    "matches.filterR16": "R16",
    "matches.filterQF": "Quarter-finals",
    "matches.filterSF": "Semi-finals",
    "matches.filterFinal": "Final",
    "matches.noMatches": "No matches for this stage",
    "stage.all": "All",
    "stage.group": "Group Stage",
    "stage.r32": "Round of 32",
    "stage.r16": "Round of 16",
    "stage.qf": "Quarter-finals",
    "stage.sf": "Semi-finals",
    "stage.third": "Third Place",
    "stage.final": "Final",
    "pred.title": "Submit Prediction",
    "pred.choose": "Choose your prediction",
    "pred.home": "Home Win",
    "pred.draw": "Draw",
    "pred.away": "Away Win",
    "pred.points": "Prediction Points",
    "pred.pointsHint": "Points determine your rank. Holding WCT gives you extra bonus points.",
    "pred.submit": "Submit Prediction",
    "pred.submitting": "Submitting...",
    "pred.success": "Prediction submitted!",
    "pred.failed": "Submission failed, please try again.",
    "pred.closed": "Prediction closed for this match",
    "leader.title": "Prediction Leaderboard",
    "leader.subtitle": "Ranked by win rate & activity. Top 5 share the SOL prize pool.",
    "leader.rank": "Rank",
    "leader.user": "User Address",
    "leader.winRate": "Win Rate",
    "leader.points": "Points",
    "leader.viewFull": "View Full Leaderboard",
    "leader.loading": "Loading leaderboard...",
    "leader.empty": "No data yet",
    "leader.fullTitle": "Global Prediction Heroes (Top 100)",
    "rewards.title": "SOL Prize Pool Rewards",
    "rewards.rules": "Reward Rules",
    "rewards.rulesHtml": "<b>Prize rules</b>: Top 5 share the prize pool — #1 40%, #2 20%, #3 10%, #4 5%, #5 5%. <b>Tax plan</b>: 90% of trading tax is used for rewards distribution. Remaining 10% for marketing activities. <a href=\"./whitepaper.html\">Details</a>.",
    "rewards.my": "My Predictions",
    "rewards.noBets": "You haven't submitted any predictions yet",
    "rewards.loginHint": "Connect wallet to view your predictions & rewards",
    "footer.rights": "© 2026 WorldCup Token (WCT). All rights reserved.",
    "time.days": "d",
    "time.hours": "h",
    "time.mins": "m",
    "time.secs": "s",
    "toast.walletConnected": "Wallet connected",
    "toast.walletDisconnected": "Wallet disconnected",
    "toast.walletFailed": "Wallet connection failed. Ensure it's unlocked and on Solana network.",
    "toast.walletRejected": "User rejected connection",
    "toast.noWallet": "Solana wallet not detected. Please install Phantom or another Solana wallet.",
    "toast.copySuccess": "Address copied",
    "toast.contractCopied": "Contract address copied",
    "toast.copyFailed": "Copy failed",
    "toast.switchBsc": "Please switch to Solana network",
    "toast.predSuccess": "Prediction success",
    "toast.predLimit": "Daily limit reached",
    "toast.predClosed": "Prediction closed",
    "toast.authFailed": "Auth failed, please reconnect",
  },
};

const CONTRACT_ADDRESS = "";
const LANG_STORAGE_KEY = "wct_lang";
const BACKEND_STORAGE_KEY = "wct_backend";
const BACKEND_TOKEN_PREFIX = "wct_backend_token_";
const TREASURY_STORAGE_KEY = "wct_treasury";
const POINTS_INITIAL = 5000;
const BET_MIN = 100;
const BET_MAX = 500;
const BET_CLOSE_BEFORE_MS = 5 * 60 * 1000;
const MIN_LEADERBOARD_MATCHES = 20;
const DAILY_PRED_LIMIT_NO_HOLD = 1;
const DAILY_PRED_LIMIT_HOLD = 5;
const DAILY_PRED_LIMIT_MIN_HOLD = 100000n;
const BOOST_TIER_1M = 1000000n;
const BOOST_TIER_5M = 5000000n;
const BOOST_TIER_10M = 10000000n;
const WCT_BONUS_UNIT = 100000n;
const WCT_BONUS_POINTS = 10n;
const WCT_BONUS_TIER_5M = 5000000n;
const WCT_BONUS_TIER_10M = 10000000n;
const MAX_SAFE_POINTS = 9007199254740991;
const TRADING_FEE_RATE = 0.03;

function t(key, params = {}) {
  let s = I18N[state.lang][key] || I18N["en"][key] || key;
  Object.keys(params).forEach((k) => {
    s = s.replace(`{${k}}`, params[k]);
  });
  return s;
}

function setLang(l) {
  state.lang = l;
  localStorage.setItem(LANG_STORAGE_KEY, l);
  document.documentElement.lang = l;
  updateUI();
}

function updateUI() {
  $all("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  $all("[data-i18n-html]").forEach((el) => {
    const key = el.dataset.i18nHtml;
    el.innerHTML = t(key);
  });
  $all("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });
  updateWalletUI();
  renderUpcomingMatches();
  renderPredictionMatches();
  renderLeaderboard();
  renderMyBets();
  renderAllMatches();
}

function toast(msg, duration = 3000) {
  const host = $("#toastHost");
  if (!host) return;
  const id = "t_" + Date.now();
  const el = document.createElement("div");
  el.className = "toast";
  el.id = id;
  el.innerHTML = `
    <div class="toast__msg">${msg}</div>
    <button class="toast__close" type="button" aria-label="Close">×</button>
  `;
  host.appendChild(el);
  const close = () => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 300);
  };
  el.querySelector(".toast__close").onclick = close;
  setTimeout(close, duration);
}

function formatUSD(v) {
  if (v === null || v === undefined) return "--";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(2) + "K";
  return "$" + Number(v).toFixed(2);
}

function formatNumber(v) {
  if (v === null || v === undefined) return "--";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return Math.floor(v).toLocaleString();
}

function formatPriceUsd(v) {
  if (v === null || v === undefined) return "--";
  if (v < 0.000001) return "$" + v.toFixed(10);
  if (v < 0.001) return "$" + v.toFixed(8);
  return "$" + v.toFixed(6);
}

function shortAddr(a) {
  if (!a) return "";
  return a.slice(0, 4) + "..." + a.slice(-4);
}

function getSolProvider() {
  const w = typeof window !== "undefined" ? window : null;
  if (!w) return null;

  // 1. 优先检查 Phantom (通过 phantom 命名空间)
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana;

  // 2. 检查全局 solana 注入
  if (w.solana) {
    // 处理多提供者
    if (w.solana.providers?.length) {
      return w.solana.providers.find(p => p.isPhantom) || w.solana.providers[0];
    }
    return w.solana;
  }

  return null;
}

async function connectWallet() {
  const provider = getSolProvider();
  
  if (!provider) {
    toast(t("toast.noWallet"));
    return;
  }

  try {
    console.log("Connecting to Solana wallet...");
    
    // 如果已经授权，直接使用已有的公钥
    if (provider.isConnected && provider.publicKey) {
      console.log("Wallet already connected.");
    } else {
      // 弹出 Phantom 授权窗口
      await provider.connect();
    }

    const pk = provider.publicKey;
    if (!pk) throw new Error("No public key after connect()");

    const addr = String(pk.toString());
    console.log("Connected address:", addr);

    // 立即更新状态，显示已连接
    state.wallet.address = addr;
    state.wallet.connected = true;
    state.wallet.manualConnected = true;
    state.wallet.walletMenuOpen = false;

    updateWalletUI();
    toast(t("toast.walletConnected"));

    // 异步执行后续同步，不阻塞 UI 反馈
    setTimeout(async () => {
      try {
        initBackendState();
        hydrateRewardsFromAddress();
        await fetchWalletBalances();
        if (state.backend.enabled) {
          await backendSyncAll({ force: true });
        }
      } catch (e) {
        console.warn("Post-connection sync error:", e);
      }
    }, 10);

  } catch (err) {
    console.error("Wallet connection failed:", err);
    const msg = String(err?.message || err || "").toLowerCase();
    if (msg.includes("rejected") || msg.includes("denied")) {
      toast(t("toast.walletRejected"));
    } else {
      toast(t("toast.walletFailed"));
    }
  }
}

function disconnectWallet() {
  try {
    const provider = getSolProvider();
    if (provider && typeof provider.disconnect === "function") provider.disconnect();
  } catch {
  }
  state.wallet.address = null;
  state.wallet.connected = false;
  state.wallet.manualConnected = false;
  state.wallet.walletMenuOpen = false;
  state.wallet.wctDecimals = null;
  state.wallet.wctBalanceRaw = 0n;
  state.wallet.lastBalanceSyncMs = 0;
  initBackendState();
  setText("bnbBalance", "--");
  setText("wctBalance", "--");
  setText("wctBalanceHero", "--");
  updateWalletUI();
  toast(t("toast.walletDisconnected"));
}

function setupWalletListeners() {
  const provider = getSolProvider();
  if (!provider || typeof provider.on !== "function") return;
  const handleAddress = (pk) => {
    const addr = pk ? String(pk.toString()) : "";
    state.wallet.address = addr || null;
    state.wallet.connected = !!state.wallet.address;
    if (!state.wallet.address) {
      state.wallet.manualConnected = false;
      state.wallet.walletMenuOpen = false;
    } else if (!state.wallet.manualConnected) {
      state.wallet.walletMenuOpen = false;
    }
    state.wallet.wctDecimals = null;
    state.wallet.wctBalanceRaw = 0n;
    state.wallet.lastBalanceSyncMs = 0;
    initBackendState();
    hydrateRewardsFromAddress();
    updateWalletUI();
    fetchWalletBalances();
    if (state.wallet.address && state.backend.enabled) backendSyncAll({ force: true });
  };

  provider.on("connect", (pk) => handleAddress(pk || provider.publicKey));
  provider.on("disconnect", () => handleAddress(null));
  provider.on("accountChanged", (pk) => handleAddress(pk || provider.publicKey));
}

async function tryRestoreWalletSession() {
  const provider = getSolProvider();
  if (!provider) return;
  try {
    const res = await provider.connect({ onlyIfTrusted: true });
    const pk = res?.publicKey || provider.publicKey;
    const addr = pk ? String(pk.toString()) : "";
    if (!addr) return;
    state.wallet.address = addr;
    state.wallet.connected = true;
    state.wallet.manualConnected = true;
    state.wallet.walletMenuOpen = false;
  } catch (err) {
    return;
  }
  state.wallet.wctDecimals = null;
  state.wallet.wctBalanceRaw = 0n;
  state.wallet.lastBalanceSyncMs = 0;
  initBackendState();
  hydrateRewardsFromAddress();
  updateWalletUI();
  fetchWalletBalances();
  if (state.backend.enabled) backendSyncAll({ force: true });
}

function updateWalletUI() {
  const btn = $("#connectWalletBtn");
  const menu = $("#walletMenu");
  const addrEl = $("#walletAddrShort");
  if (!btn || !menu || !addrEl) return;
  if (state.wallet.connected && state.wallet.address) {
    btn.classList.add("is-connected");
    btn.innerHTML = `
      <div class="btnConnect__icon" aria-hidden="true"></div>
      <span class="btnConnect__text">${shortAddr(state.wallet.address)}</span>
    `;
    addrEl.textContent = shortAddr(state.wallet.address);
    menu.classList.toggle("is-open", state.wallet.walletMenuOpen);
  } else {
    btn.classList.remove("is-connected");
    btn.innerHTML = `
      <div class="btnConnect__icon" aria-hidden="true"></div>
      <span class="btnConnect__text" data-i18n="nav.connect">${t("nav.connect")}</span>
    `;
    menu.classList.remove("is-open");
  }
}

async function rpcRequest(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json && json.error) throw new Error(String(json.error?.message || "RPC error"));
  return json?.result;
}

function changeFromHistoryMs(history, nowMs, lookbackMs) {
  if (!history || history.length < 2) return 0;
  const target = nowMs - lookbackMs;
  let start = history[0].v;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].t <= target) {
      start = history[i].v;
      break;
    }
  }
  const end = history[history.length - 1].v;
  if (start === 0) return 0;
  return ((end - start) / start) * 100;
}

function pickChangeForRange(snap, range) {
  if (!snap) return 0;
  if (range === "1H") return snap.priceChangeH1 || 0;
  if (range === "24H") return snap.priceChangeH24 || 0;
  if (range === "7D") return snap.priceChangeD7 || 0;
  if (range === "30D") return snap.priceChangeD30 || 0;
  return snap.priceChangeH24 || 0;
}

function buildSeriesFromHistory(range) {
  const history = state.token.priceHistory;
  if (!history || !history.length) return null;
  const now = Date.now();
  let lookback = 24 * 3600 * 1000;
  if (range === "1H") lookback = 3600 * 1000;
  if (range === "7D") lookback = 7 * 24 * 3600 * 1000;
  if (range === "30D") lookback = 30 * 24 * 3600 * 1000;
  if (range === "ALL") lookback = now - history[0].t;

  const target = now - lookback;
  const filtered = history.filter((h) => h.t >= target);
  if (filtered.length < 2) return null;

  const points = filtered.map((h) => h.v);
  const volumes = points.map((p, i) => {
    const seed = i * 1337 + (range.charCodeAt(0) || 0);
    const r = ((seed % 100) / 100) * 0.5 + 0.5;
    return p * 10000 * r;
  });

  return {
    points,
    volumes,
    effectiveWinMs: lookback,
    coverageMs: filtered[filtered.length - 1].t - filtered[0].t,
  };
}

async function refreshTokenSnapshot() {
  const mint = getWctMint();
  if (!mint) return;
  state.token.loading = true;
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (res.ok) {
      const json = await res.json();
      const p = json?.pairs?.[0];
      if (p) {
        state.token.snapshot = {
          priceUsd: Number(p.priceUsd),
          marketCap: Number(p.fdv || p.marketCap || 0),
          volume24hUsd: Number(p.volume?.h24 || 0),
          liquidityUsd: Number(p.liquidity?.usd || 0),
          priceChangeH1: Number(p.priceChange?.h1 || 0),
          priceChangeH24: Number(p.priceChange?.h24 || 0),
          priceChangeD7: 0,
          priceChangeD30: 0,
        };
        state.token.priceHistory.push({ t: Date.now(), v: state.token.snapshot.priceUsd });
        if (state.token.priceHistory.length > 500) state.token.priceHistory.shift();
      }
    }
  } catch (e) {
    console.warn("DexScreener fetch failed:", e);
  }
  state.token.loading = false;
  state.token.lastUpdateMs = Date.now();
  drawOverview();
  drawChart();
}

function getWctMint() {
  const el = $('meta[name="wct-mint"]');
  return el ? el.content : "";
}

function getPrizePoolAddr() {
  const el = $('meta[name="wct-prize-pool"]');
  return el ? el.content : "";
}

async function fetchPrizePoolBalance() {
  const addr = getPrizePoolAddr();
  if (!addr) return;
  const rpc = "https://api.mainnet-beta.solana.com";
  try {
    const res = await rpcRequest(rpc, "getBalance", [addr]);
    const bal = Number(res || 0) / 1e9;
    setText("prizePoolBalance", bal.toFixed(2) + " SOL");
  } catch (e) {
    console.warn("Prize pool fetch failed:", e);
  }
}

async function fetchWalletBalances() {
  if (!state.wallet.address) return;
  const rpc = "https://api.mainnet-beta.solana.com";
  try {
    const res = await rpcRequest(rpc, "getBalance", [state.wallet.address]);
    const bal = Number(res || 0) / 1e9;
    setText("bnbBalance", bal.toFixed(4) + " SOL");
  } catch (e) {
    console.warn("Wallet balance fetch failed:", e);
  }
}

function setText(id, txt) {
  const el = $("#" + id);
  if (el) el.textContent = txt;
}

function isMarketLiveSnapshot(snap) {
  return snap && typeof snap.priceUsd === "number" && snap.priceUsd > 0;
}

function renderChartHint() {
  const el = $("#chartHint");
  if (!el) return;
  el.textContent = t("chart.range") + ": " + state.chart.range;
}

function initBackendState() {
  const url = $('meta[name="backend-url"]')?.content;
  if (!url) {
    state.backend.enabled = false;
    return;
  }
  state.backend.url = url;
  state.backend.enabled = true;
  const stored = localStorage.getItem(BACKEND_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.jwt) state.backend.jwt = parsed.jwt;
    } catch {
    }
  }
}

async function backendSyncAll(opts = {}) {
  if (!state.backend.enabled || !state.backend.url) return;
  // TODO: Implement actual backend sync logic if needed
}

function hydrateRewardsFromAddress() {
  // TODO: Load rewards data for the current address
}

function setupCopyHandlers() {
  $all("[data-copy]").forEach((el) => {
    el.addEventListener("click", async () => {
      const txt = el.dataset.copy;
      if (!txt) return;
      try {
        await copyText(txt);
        toast(t("toast.copySuccess"));
      } catch {
        toast(t("toast.copyFailed"));
      }
    });
  });
}

function setupWalletMenu() {
  const btn = $("#connectWalletBtn");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    if (state.wallet.connected) {
      e.stopPropagation();
      state.wallet.walletMenuOpen = !state.wallet.walletMenuOpen;
      updateWalletUI();
    } else {
      connectWallet();
    }
  });

  document.addEventListener("click", () => {
    if (state.wallet.walletMenuOpen) {
      state.wallet.walletMenuOpen = false;
      updateWalletUI();
    }
  });

  $("#disconnectBtn")?.addEventListener("click", disconnectWallet);
  $("#copyAddrBtn")?.addEventListener("click", () => {
    if (state.wallet.address) {
      copyText(state.wallet.address).then(() => toast(t("toast.copySuccess")));
    }
  });
}

function init() {
  setLang(state.lang);
  initBackendState();
  setupRangeTabs();
  setupWalletMenu();
  setupCopyHandlers();
  setupWalletListeners();
  tryRestoreWalletSession();
  
  loadSchedule().then(() => {
    updateUI();
  });

  refreshTokenSnapshot();
  fetchPrizePoolBalance();
  
  setInterval(refreshTokenSnapshot, 30000);
  setInterval(fetchPrizePoolBalance, 60000);
  setInterval(fetchWalletBalances, 30000);

  window.addEventListener("resize", () => {
    drawChart();
    drawOverview();
  });
}

document.addEventListener("DOMContentLoaded", init);

function getMatchResultPick(id) {
  return localStorage.getItem("wct_result_" + id);
}

function setMatchResultPick(id, res) {
  localStorage.setItem("wct_result_" + id, res);
}

function settleMatchIfPossible(id) {
  // Logic to settle match points
}

function renderPredictionMatches() {
  // Implementation for rendering matches in prediction section
}

function renderMyBets() {
  // Implementation for rendering user bets
}

function renderLeaderboard() {
  // Implementation for rendering leaderboard
}

function renderAllMatches() {
  // Implementation for rendering all matches
}

function renderUpcomingMatches() {
  const host = $("#upcomingMatches");
  if (!host) return;
  if (!state.schedule.loaded) {
    host.innerHTML = `<div class="matchEmpty">${t("matches.loading")}</div>`;
    return;
  }
  // Simplified rendering for upcoming matches
  host.innerHTML = state.schedule.matches.slice(0, 3).map(m => renderMatchCard(m)).join("");
}

function renderMatchCard(match) {
  const homeLogo = teamLogoUrl(match.home);
  const awayLogo = teamLogoUrl(match.away);
  const homeGrad = flagGradient(match.home);
  const awayGrad = flagGradient(match.away);
  return `
    <article class="card matchCard">
      <div class="matchCard__meta">
        <div class="matchCard__tag">${stageLabel(match.stage)}</div>
        <div class="matchCard__when">${match.date} ${match.time}</div>
      </div>
      <div class="matchCard__teams">
        <div class="team">
          <span class="flag" style="background-image:${homeGrad}">
            <img class="flag__img" src="${homeLogo}" alt="" onerror="this.style.display='none'"/>
          </span>
          <div class="team__code">${match.home}</div>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <span class="flag" style="background-image:${awayGrad}">
            <img class="flag__img" src="${awayLogo}" alt="" onerror="this.style.display='none'"/>
          </span>
          <div class="team__code">${match.away}</div>
        </div>
      </div>
      <button class="btn btn--soft matchCard__cta" type="button" onclick="toast('${t("toast.noWallet")}')">${t("matches.predictNow")}</button>
    </article>
  `;
}

function stageLabel(stage) {
  const stages = {
    GROUP: t("stage.group"),
    R32: t("stage.r32"),
    R16: t("stage.r16"),
    QF: t("stage.qf"),
    SF: t("stage.sf"),
    THIRD: t("stage.third"),
    FINAL: t("stage.final")
  };
  return stages[stage] || t("stage.all");
}

function teamLogoUrl(teamName) {
  return `https://flagcdn.com/w40/un.png`; // Fallback placeholder
}

function flagGradient(teamName) {
  return `linear-gradient(180deg, #14F195, #00FFA3)`;
}

async function loadSchedule() {
  state.schedule.matches = [
    { id: "m1", home: "Argentina", away: "France", date: "2026-06-12", time: "20:00", stage: "GROUP", kickoffMs: Date.now() + 86400000 },
    { id: "m2", home: "Brazil", away: "Germany", date: "2026-06-13", time: "18:00", stage: "GROUP", kickoffMs: Date.now() + 172800000 },
    { id: "m3", home: "Spain", away: "Japan", date: "2026-06-14", time: "21:00", stage: "GROUP", kickoffMs: Date.now() + 259200000 }
  ];
  state.schedule.loaded = true;
}

function makeRng(seed) {
  let m = 0x80000000;
  let a = 1103515245;
  let c = 12345;
  let state = seed ? seed : Math.floor(Math.random() * (m - 1));
  return function() {
    state = (a * state + c) % m;
    return state / (m - 1);
  };
}
