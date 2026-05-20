const state = {
  lang: "en",
  wallet: {
    address: null,
    connected: false,
    manualConnected: false,
    walletMenuOpen: false,
    chainId: null,
    wctDecimals: null,
    wctBalanceRaw: 0n,
    lastBalanceSyncMs: 0,
  },
  token: {
    snapshot: null,
    lastFetchMs: 0,
    history: [],
  },
  overview: {
    range: "24H",
    points: [],
    volumes: [],
    live: false,
  },
  schedule: {
    matches: [],
    loaded: false,
    stageFilter: "ALL",
    lastUpcomingKey: "",
    lastPredictionKey: "",
    lastResultSyncMs: 0,
  },
  chart: {
    range: "24H",
    points: [],
    volumes: [],
    live: false,
  },
  rewards: {
    available: 0,
    claimed: 0,
    poolBnb24h: 0,
    poolBnbOnchainWei: null,
    treasuryAddress: "",
    lastTreasurySyncMs: 0,
  },
  backend: {
    baseUrl: "",
    enabled: false,
    token: null,
    authed: false,
    lastSyncMs: 0,
    syncing: false,
    leaderboardRows: [],
    stream: null,
    loginPromise: null,
  },
};

const CONTRACT_ADDRESS = "";
const BSC_CHAIN_ID_HEX = "0x38";
const BSC_RPC_URL = "https://bsc-rpc.publicnode.com";
const PANCAKE_V2_FACTORY = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";
const WBNB_ADDRESS = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";
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

function getSolProvider() {
  const w = typeof window !== "undefined" ? window : null;
  if (!w) return null;
  const sol = w.solana;
  if (!sol) return null;
  if (typeof sol.connect !== "function") return null;
  return sol;
}

function utf8ToHex(str) {
  try {
    const enc = new TextEncoder().encode(String(str || ""));
    let out = "0x";
    for (let i = 0; i < enc.length; i++) out += enc[i].toString(16).padStart(2, "0");
    return out;
  } catch {
    return "";
  }
}

const I18N = {
  en: {
    "doc.title": "World Cup AI Prediction Market",
    "nav.home": "HOME",
    "nav.tokenomics": "TOKENOMICS",
    "nav.matches": "MATCHES",
    "nav.prediction": "PREDICTION",
    "wallet.myPredictions": "MY PREDICTIONS",
    "nav.whitepaper": "WHITEPAPER",
    "nav.leaderboard": "LEADERBOARD",
    "nav.rewards": "REWARDS",
    "nav.roadmap": "ROADMAP",
    "hero.kicker": "",
    "hero.desc": "The first World Cup AI prediction market.<br />Predict. Compete. Earn SOL Rewards.",
    "hero.buyNow": "BUY NOW",
    "hero.joinPrediction": "JOIN PREDICTION",
    "overview.title": "TOKEN OVERVIEW",
    "overview.contract": "CONTRACT ADDRESS",
    "overview.network": "NETWORK",
    "overview.bnb": "SOLANA",
    "overview.balances": "WALLET BALANCES",
    "overview.bnbBalance": "SOL",
    "overview.wctBalance": "WCT",
    "overview.holdBonusPoints": "HOLD BONUS",
    "overview.tokenPrice": "TOKEN PRICE",
    "overview.marketCap": "MARKET CAP",
    "overview.volume24h": "24H VOLUME",
    "overview.holders": "HOLDERS",
    "overview.totalSupply": "TOTAL SUPPLY",
    "overview.copy": "Copy contract address",
    "chart.price": "PRICE (WCT)",
    "chart.marketCap": "MARKET CAP",
    "chart.volume24h": "24H VOLUME",
    "chart.liquidity": "LIQUIDITY",
    "dash.currentPrice": "CURRENT PRICE",
    "matches.title": "UPCOMING MATCHES",
    "matches.viewAllCta": "VIEW ALL SCHEDULE",
    "matches.allTitle": "ALL MATCHES",
    "matches.backHome": "BACK",
    "matches.loading": "Loading schedule…",
    "matches.loadFailed": "Schedule load failed.",
    "matches.hint": "Filter by stage · View by date",
    "matches.groupStage": "GROUP STAGE",
    "matches.predictNow": "PREDICT NOW",
    "matches.predictTitle": "MATCH PREDICTION",
    "matches.bettors": "SUPPORTERS",
    "matches.lead": "LEADING",
    "matches.daysLeft2": "2 Days Left",
    "stage.all": "ALL",
    "stage.group": "GROUP",
    "stage.r32": "R32",
    "stage.r16": "R16",
    "stage.qf": "QF",
    "stage.sf": "SF",
    "stage.third": "3RD",
    "stage.final": "FINAL",
    "status.upcoming": "UPCOMING",
    "status.live": "LIVE",
    "status.finished": "FINISHED",
    "time.days": "DAYS",
    "time.hours": "HRS",
    "time.mins": "MINS",
    "time.secs": "SECS",
    "common.viewAll": "View All",
    "leaderboard.title": "PREDICTION LEADERBOARD",
    "leaderboard.allTitle": "LEADERBOARD",
    "leaderboard.hintTop100": "Showing up to top 100 addresses",
    "leaderboard.empty": "No leaderboard data yet.",
    "rewards.poolTitle": "REWARDS POOL",
    "rewards.totalRewards": "POOL (SOL)",
    "rewards.viewRewards": "VIEW REWARDS",
    "rewards.rulesHtml": "<b>Prize rules</b>: Top 5 share the prize pool — #1 40%, #2 20%, #3 10%, #4 5%, #5 5%. <b>Tax plan</b>: 80% of trading tax is used for rewards distribution. Remaining 20%: 10% buyback & burn, 10% liquidity. <a href=\"./whitepaper.html\">Details</a>.",
    "rewards.poolEmpty": "No SOL in pool yet",
    "rewards.poolLoading": "Syncing on-chain pool…",
    "rewards.modalTitle": "Your Rewards",
    "rewards.available": "Available",
    "rewards.claimed": "Claimed",
    "rewards.claim": "CLAIM",
    "rewards.hintDisconnected": "Connect wallet to claim rewards.",
    "rewards.hintConnected": "Rewards update after predictions settle.",
    "prediction.title": "PREDICTION",
    "prediction.submit": "SUBMIT",
    "prediction.draw": "DRAW",
    "prediction.betPoints": "",
    "prediction.pool": "POOL",
    "prediction.participants": "PARTICIPANTS",
    "prediction.splitTitle": "SUPPORT SPLIT",
    "prediction.bettors": "SUPPORTERS",
    "prediction.supportRate": "SUPPORT",
    "prediction.rewardRatio": "",
    "prediction.mostBettors": "MOST",
    "prediction.rangeHint": "",
    "prediction.hintDisconnected": "Connect wallet to submit predictions.",
    "prediction.hintConnected": "Submit predictions to join the win-rate leaderboard.",
    "prediction.limitBoost": "Today {left}/{limit} · Boost {boost}X",
    "points.label": "",
    "bets.title": "MY PREDICTIONS",
    "bets.hintDisconnected": "Connect wallet to view your prediction history.",
    "bets.hintConnected": "No predictions yet. Submit below.",
    "bets.empty": "No prediction records yet.",
    "bets.used": "USED",
    "bets.bonus": "BONUS",
    "bets.base": "BASE",
    "bets.goMatch": "GO",
    "bets.win": "WIN",
    "bets.lose": "LOSE",
    "roadmap.title": "ROADMAP",
    "roadmap.copy": "Launch · Listings · Prediction Season · Rewards · Community",
    "social.follow": "FOLLOW US",
    "social.open": "OPEN",
    "wallet.connect": "CONNECT WALLET",
    "wallet.disconnect": "DISCONNECT",
    "toast.noWallet": "No wallet detected. Install MetaMask or a Web3 wallet.",
    "toast.walletConnected": "Wallet connected.",
    "toast.walletDisconnected": "Wallet disconnected.",
    "toast.walletFailed": "Wallet connection failed.",
    "toast.walletRejected": "Wallet connection rejected.",
    "toast.backendUnavailable": "Backend unavailable. Please try again later.",
    "toast.backendLoginFailed": "Backend login failed. Please retry.",
    "toast.backendBetFailed": "Submit failed. Please try again.",
    "toast.networkAddRejected": "Network add rejected.",
    "toast.networkSwitchRejected": "Network switch rejected.",
    "toast.switchToBsc": "Switch to BNB Chain for full functionality.",
    "toast.contractCopied": "Contract address copied.",
    "toast.copyFailed": "Copy failed.",
    "toast.connectToSubmit": "Connect wallet to submit predictions.",
    "toast.predSubmitted": "Prediction submitted: {pick}",
    "toast.betPlaced": "",
    "toast.betRange": "",
    "toast.betClosed": "Predictions close 5 minutes before kickoff.",
    "toast.insufficientPoints": "",
    "toast.alreadyBet": "You already submitted a prediction for this match.",
    "toast.dailyLimit": "Daily limit reached: {limit}/day. Hold ≥100,000 WCT to unlock {holdLimit}/day.",
    "toast.connectToClaim": "Connect wallet to claim rewards.",
    "toast.noRewards": "No rewards available yet.",
    "toast.rewardsClaimed": "Rewards claimed.",
    "chart.deltaFormat": "{sign}{pct}% ({range})",
    "lang.btn.en": "EN",
    "lang.btn.zh": "中文",
  },
  zh: {
    "doc.title": "世界杯AI预测市场",
    "nav.home": "首页",
    "nav.tokenomics": "代币经济",
    "nav.matches": "赛程",
    "nav.prediction": "预测",
    "wallet.myPredictions": "我的预测",
    "nav.whitepaper": "白皮书",
    "nav.leaderboard": "排行榜",
    "nav.rewards": "奖励",
    "nav.roadmap": "路线图",
    "hero.kicker": "",
    "hero.desc": "首个为世界杯打造的 世界杯AI预测市场。<br />预测 · 对战 · 赢取 SOL 奖励。",
    "hero.buyNow": "立即购买",
    "hero.joinPrediction": "参与预测",
    "overview.title": "代币概览",
    "overview.contract": "合约地址",
    "overview.network": "网络",
    "overview.bnb": "SOLANA",
    "overview.balances": "钱包余额",
    "overview.bnbBalance": "SOL",
    "overview.wctBalance": "WCT",
    "overview.holdBonusPoints": "",
    "overview.tokenPrice": "代币价格",
    "overview.marketCap": "市值",
    "overview.volume24h": "24小时成交量",
    "overview.holders": "持有人",
    "overview.totalSupply": "总供应量",
    "overview.copy": "复制合约地址",
    "chart.price": "价格 (WCT)",
    "chart.marketCap": "市值",
    "chart.volume24h": "24小时成交量",
    "chart.liquidity": "流动性",
    "dash.currentPrice": "当前价格",
    "matches.title": "即将开始的比赛",
    "matches.viewAllCta": "查看全部赛程",
    "matches.allTitle": "全部赛程",
    "matches.backHome": "返回",
    "matches.loading": "赛程加载中…",
    "matches.loadFailed": "赛程加载失败。",
    "matches.hint": "按阶段筛选 · 按日期查看",
    "matches.groupStage": "小组赛",
    "matches.predictNow": "立即预测",
    "matches.predictTitle": "比赛预测",
    "matches.bettors": "支持人数",
    "matches.lead": "支持领先",
    "matches.daysLeft2": "剩余 2 天",
    "stage.all": "全部",
    "stage.group": "小组赛",
    "stage.r32": "1/16决赛",
    "stage.r16": "1/8决赛",
    "stage.qf": "1/4决赛",
    "stage.sf": "半决赛",
    "stage.third": "季军赛",
    "stage.final": "总决赛",
    "status.upcoming": "未开始",
    "status.live": "进行中",
    "status.finished": "已结束",
    "time.days": "天",
    "time.hours": "时",
    "time.mins": "分",
    "time.secs": "秒",
    "common.viewAll": "查看全部",
    "leaderboard.title": "预测排行榜",
    "leaderboard.allTitle": "预测排行榜",
    "leaderboard.hintTop100": "最多展示前 100 个地址",
    "leaderboard.empty": "暂无排行数据。",
    "rewards.poolTitle": "奖励池",
    "rewards.totalRewards": "奖池（SOL）",
    "rewards.viewRewards": "查看奖励",
    "rewards.rulesHtml": "<b>获奖机制</b>：前 5 名瓜分奖池——第 1 名 40%，第 2 名 20%，第 3 名 10%，第 4/5 名各 5%。<b>税费规划</b>：交易税费的 80% 用于发放奖励；剩余 20%（10% 回购销毁、10% 流动性）。<a href=\"./whitepaper.html\">查看详情</a>。",
    "rewards.poolEmpty": "奖池暂无 SOL",
    "rewards.poolLoading": "奖池余额同步中…",
    "rewards.modalTitle": "我的奖励",
    "rewards.available": "可领取",
    "rewards.claimed": "已领取",
    "rewards.claim": "领取",
    "rewards.hintDisconnected": "连接钱包后可领取奖励。",
    "rewards.hintConnected": "奖励会在预测结算后更新。",
    "prediction.title": "预测",
    "prediction.submit": "提交",
    "prediction.draw": "平局",
    "prediction.betPoints": "",
    "prediction.pool": "奖池",
    "prediction.participants": "人数",
    "prediction.splitTitle": "支持比例",
    "prediction.bettors": "人数",
    "prediction.supportRate": "支持率",
    "prediction.mostBettors": "最多",
    "prediction.hintDisconnected": "连接钱包后可提交预测。",
    "prediction.hintConnected": "提交预测后参与胜率排行榜。",
    "prediction.limitBoost": "今日剩余 {left}/{limit} · 持币奖励加成 {boost}X",
    "points.label": "",
    "bets.title": "我的预测",
    "bets.hintDisconnected": "连接钱包后可查看预测记录。",
    "bets.hintConnected": "暂无预测记录，去下方进行预测。",
    "bets.empty": "暂无预测记录。",
    "bets.used": "使用",
    "bets.bonus": "额外",
    "bets.base": "基础",
    "bets.goMatch": "前往",
    "bets.win": "赢",
    "bets.lose": "输",
    "roadmap.title": "路线图",
    "roadmap.copy": "启动 · 上线交易所 · 预测赛季 · 奖励 · 社区",
    "social.follow": "关注我们",
    "social.open": "打开",
    "wallet.connect": "连接钱包",
    "wallet.disconnect": "断开连接",
    "toast.noWallet": "未检测到钱包，请安装 MetaMask 或其他 Web3 钱包。",
    "toast.walletConnected": "钱包已连接。",
    "toast.walletDisconnected": "钱包已断开。",
    "toast.walletFailed": "连接失败。",
    "toast.walletRejected": "用户取消连接。",
    "toast.backendUnavailable": "后端不可用，请稍后重试。",
    "toast.backendLoginFailed": "后端登录失败，请重试。",
    "toast.backendBetFailed": "提交失败，请重试。",
    "toast.networkAddRejected": "已取消添加网络。",
    "toast.networkSwitchRejected": "已取消切换网络。",
    "toast.switchToBsc": "请切换到 BNB 链以使用完整功能。",
    "toast.contractCopied": "合约地址已复制。",
    "toast.copyFailed": "复制失败。",
    "toast.connectToSubmit": "请先连接钱包再提交预测。",
    "toast.predSubmitted": "预测已提交：{pick}",
    "toast.betPlaced": "",
    "toast.betRange": "",
    "toast.betClosed": "比赛开始前 5 分钟停止预测。",
    "toast.insufficientPoints": "",
    "toast.alreadyBet": "这场比赛你已经提交过预测。",
    "toast.dailyLimit": "今日预测次数已用完：{limit}次/天。持有 ≥100,000 WCT 可提升至 {holdLimit}次/天。",
    "toast.connectToClaim": "请先连接钱包再领取奖励。",
    "toast.noRewards": "暂时没有可领取奖励。",
    "toast.rewardsClaimed": "奖励已领取。",
    "chart.deltaFormat": "{sign}{pct}%（{range}）",
    "lang.btn.en": "EN",
    "lang.btn.zh": "中文",
  },
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function t(key, vars = {}) {
  const dict = I18N[state.lang] || I18N.en;
  const fallback = I18N.en[key];
  const template = dict[key] ?? fallback ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

function applyTranslations() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  const page = document.body ? document.body.getAttribute("data-page") : null;
  const suffix = page === "whitepaper" ? t("nav.whitepaper") : page === "matches" ? t("nav.matches") : null;
  document.title = suffix ? `${t("doc.title")} - ${suffix}` : t("doc.title");

  const langLabel = document.getElementById("langBtnLabel");
  if (langLabel) langLabel.textContent = state.lang === "en" ? t("lang.btn.zh") : t("lang.btn.en");

  $all("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  $all("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (!key) return;
    el.innerHTML = t(key);
  });
  $all("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (!key) return;
    el.setAttribute("aria-label", t(key));
  });
}

function getInitialLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === "en" || saved === "zh") return saved;
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("zh") ? "zh" : "en";
}

function setLang(next) {
  state.lang = next === "zh" ? "zh" : "en";
  localStorage.setItem(LANG_STORAGE_KEY, state.lang);
  applyTranslations();
  updateWalletUI();
  renderRewards();
  renderChartHint();
  drawChart();
}

function formatNumber(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return `${n.toFixed(2)}`;
}

function formatUSD(n) {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e9) return `${sign}$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(2)}K`;
  return `${sign}$${v.toFixed(2)}`;
}

function formatPriceUsd(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "--";
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${n.toFixed(2)}`;
  if (abs >= 1) return `$${n.toFixed(4)}`;
  if (abs >= 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

async function fetchJsonWithCorsFallback(url) {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.ok) return await res.json();
  } catch {
    // ignore
  }
  const text = await fetchTextWithCorsFallback(url);
  return JSON.parse(text);
}

function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function makeRng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

function toast(message, { timeout = 2600 } = {}) {
  const host = $("#toastHost");
  if (!host) {
    window.alert(String(message || ""));
    return;
  }
  const el = document.createElement("div");
  el.className = "toast";
  const msg = document.createElement("div");
  msg.className = "toast__msg";
  msg.textContent = message;
  const close = document.createElement("button");
  close.className = "toast__close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", () => el.remove());
  el.appendChild(msg);
  el.appendChild(close);
  host.appendChild(el);
  window.setTimeout(() => {
    if (el.isConnected) el.remove();
  }, timeout);
}

function parseFlapTokenSnapshotFromText(text) {
  const cleaned = String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const firstLine = cleaned.split("\n")[0] || "";
  const titleMatch = firstLine.match(/^(.+?)\s*\(\s*\$?([^)]+)\s*\)\s*$/);
  const name = titleMatch ? titleMatch[1].trim() : "";
  const symbol = titleMatch ? titleMatch[2].trim() : "";

  const mcMatch = cleaned.match(/Market Cap\s*\n\s*\$([0-9.,]+)\s*([KMB])?/i);
  const mcText = mcMatch ? `$${mcMatch[1].replace(/,/g, "")}${mcMatch[2] || ""}` : "";

  if (!mcText) return null;
  const raw = `${mcMatch ? `${mcMatch[1].replace(/,/g, "")}${mcMatch[2] || ""}` : ""}`.trim();
  const m2 = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*([KMB])?$/i);
  let marketCap = null;
  if (m2) {
    const n = Number(m2[1]);
    const suf = String(m2[2] || "").toUpperCase();
    const mul = suf === "B" ? 1e9 : suf === "M" ? 1e6 : suf === "K" ? 1e3 : 1;
    const v = n * mul;
    if (Number.isFinite(v) && v > 0) marketCap = v;
  }
  return { name, symbol, mcText, marketCap };
}

async function fetchFlapTokenSnapshot(contract) {
  const addr = String(contract || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  const url = `https://flap.sh/bnb/${addr}`;
  const html = await fetchTextWithCorsFallback(url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc?.body?.innerText || html;
  return parseFlapTokenSnapshotFromText(text);
}

function pickDexPair(pairs) {
  const list = Array.isArray(pairs) ? pairs : [];
  return list
    .filter((p) => p && p.pairAddress && p.priceUsd)
    .sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
}

async function fetchDexScreenerTokenSnapshot(contract) {
  const addr = String(contract || "").trim();
  if (!isSolAddress(addr)) return null;
  const url = `https://api.dexscreener.com/token-pairs/v1/solana/${addr}`;
  const json = await fetchJsonWithCorsFallback(url);
  const pair = pickDexPair(json);
  if (!pair) return null;
  const priceUsd = Number(pair.priceUsd);
  const priceNative = Number(pair.priceNative);
  const liquidityUsd = Number(pair?.liquidity?.usd || 0);
  const volume24hUsd = Number(pair?.volume?.h24 || 0);
  const marketCap = Number(pair?.marketCap || pair?.fdv || 0);
  const change1h = Number(pair?.priceChange?.h1);
  const change6h = Number(pair?.priceChange?.h6);
  const change24h = Number(pair?.priceChange?.h24);
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
    change1h: Number.isFinite(change1h) ? change1h : null,
    change6h: Number.isFinite(change6h) ? change6h : null,
    change24h: Number.isFinite(change24h) ? change24h : null,
  };
}

async function fetchBackendTokenSnapshot(contract) {
  const base = getBackendBaseUrl();
  if (!base) return null;
  const addr = String(contract || "").trim();
  if (!isSolAddress(addr)) return null;
  const url = `${base}/v1/sol/token?mint=${encodeURIComponent(addr)}`;
  const json = await fetchJsonWithCorsFallback(url);
  const snap = json && typeof json === "object" ? json.snapshot : null;
  if (!snap || typeof snap !== "object") return null;
  return {
    source: String(snap.source || "backend-sol"),
    url: String(snap.url || ""),
    pairAddress: String(snap.pairAddress || ""),
    name: String(snap.name || ""),
    symbol: String(snap.symbol || ""),
    priceUsd: typeof snap.priceUsd === "number" && Number.isFinite(snap.priceUsd) ? snap.priceUsd : null,
    priceNative: typeof snap.priceNative === "number" && Number.isFinite(snap.priceNative) ? snap.priceNative : null,
    liquidityUsd: typeof snap.liquidityUsd === "number" && Number.isFinite(snap.liquidityUsd) ? snap.liquidityUsd : null,
    volume24hUsd: typeof snap.volume24hUsd === "number" && Number.isFinite(snap.volume24hUsd) ? snap.volume24hUsd : null,
    marketCap: typeof snap.marketCap === "number" && Number.isFinite(snap.marketCap) ? snap.marketCap : null,
    totalSupply: typeof snap.totalSupply === "number" && Number.isFinite(snap.totalSupply) ? snap.totalSupply : null,
    holders: typeof snap.holders === "number" && Number.isFinite(snap.holders) ? snap.holders : null,
  };
}

function pow10n(n) {
  const p = Math.max(0, Math.floor(Number(n || 0)));
  let x = 1n;
  for (let i = 0; i < p; i++) x *= 10n;
  return x;
}

function pad32Hex(hexNo0x) {
  const h = String(hexNo0x || "").replace(/^0x/i, "").toLowerCase();
  return h.padStart(64, "0");
}

function pad32Address(addr) {
  return pad32Hex(String(addr || "").replace(/^0x/i, ""));
}

function decodeAddressWord(hexWord) {
  const h = String(hexWord || "").replace(/^0x/i, "").toLowerCase();
  if (h.length < 40) return "0x0000000000000000000000000000000000000000";
  return `0x${h.slice(-40)}`;
}

function decodeAbiString(hexData) {
  const h = String(hexData || "").replace(/^0x/i, "");
  if (h.length < 128) return "";
  const offset = Number(BigInt(`0x${h.slice(0, 64)}`));
  const start = offset * 2;
  if (h.length < start + 64) return "";
  const len = Number(BigInt(`0x${h.slice(start, start + 64)}`));
  const bytesStart = start + 64;
  const bytesEnd = bytesStart + len * 2;
  if (h.length < bytesEnd) return "";
  const bytes = h.slice(bytesStart, bytesEnd);
  let out = "";
  for (let i = 0; i < bytes.length; i += 2) {
    const code = parseInt(bytes.slice(i, i + 2), 16);
    if (Number.isFinite(code) && code) out += String.fromCharCode(code);
  }
  return out;
}

function ratioBigIntToNumber(num, den, precision = 18) {
  const n = typeof num === "bigint" ? num : 0n;
  const d = typeof den === "bigint" ? den : 0n;
  if (d === 0n) return null;
  const p = Math.max(0, Math.min(24, Math.floor(Number(precision || 18))));
  const scaled = (n * pow10n(p)) / d;
  const asNum = Number(scaled) / Math.pow(10, p);
  return Number.isFinite(asNum) ? asNum : null;
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

async function rpcEthCall(to, data) {
  const result = await rpcRequest(BSC_RPC_URL, "eth_call", [{ to, data }, "latest"]);
  return String(result || "0x");
}

async function rpcGetBalance(address) {
  const addr = String(address || "");
  if (!isHexAddress(addr)) return 0n;
  const result = await rpcRequest(BSC_RPC_URL, "eth_getBalance", [addr, "latest"]);
  return hexToBigInt(String(result || "0x0"));
}

async function rpcGetPair(tokenA, tokenB) {
  const data = `0xe6a43905${pad32Address(tokenA)}${pad32Address(tokenB)}`;
  const out = await rpcEthCall(PANCAKE_V2_FACTORY, data);
  return decodeAddressWord(out);
}

async function rpcTokenDecimals(token) {
  const out = await rpcEthCall(token, "0x313ce567");
  return Number(BigInt(out || "0x0"));
}

async function rpcTokenTotalSupply(token) {
  const out = await rpcEthCall(token, "0x18160ddd");
  return BigInt(out || "0x0");
}

async function rpcTokenName(token) {
  const out = await rpcEthCall(token, "0x06fdde03");
  return decodeAbiString(out);
}

async function rpcTokenSymbol(token) {
  const out = await rpcEthCall(token, "0x95d89b41");
  return decodeAbiString(out);
}

async function rpcPairToken0(pair) {
  const out = await rpcEthCall(pair, "0x0dfe1681");
  return decodeAddressWord(out);
}

async function rpcPairToken1(pair) {
  const out = await rpcEthCall(pair, "0xd21220a7");
  return decodeAddressWord(out);
}

async function rpcPairReserves(pair) {
  const out = await rpcEthCall(pair, "0x0902f1ac");
  const h = String(out || "").replace(/^0x/i, "");
  if (h.length < 128) return { r0: 0n, r1: 0n };
  const r0 = BigInt(`0x${h.slice(0, 64)}`);
  const r1 = BigInt(`0x${h.slice(64, 128)}`);
  return { r0, r1 };
}

async function rpcV2PriceBaseInQuote(pair, base, quote) {
  const [t0, t1, res, d0, d1] = await Promise.all([rpcPairToken0(pair), rpcPairToken1(pair), rpcPairReserves(pair), rpcTokenDecimals(base), rpcTokenDecimals(quote)]);
  const baseLc = String(base || "").toLowerCase();
  const quoteLc = String(quote || "").toLowerCase();
  if (String(t0).toLowerCase() === baseLc && String(t1).toLowerCase() === quoteLc) {
    const num = res.r1 * pow10n(d0);
    const den = res.r0 * pow10n(d1);
    const price = ratioBigIntToNumber(num, den, 18);
    return { price, reserveBase: res.r0, reserveQuote: res.r1, token0: t0, token1: t1, dec0: d0, dec1: d1 };
  }
  if (String(t0).toLowerCase() === quoteLc && String(t1).toLowerCase() === baseLc) {
    const num = res.r0 * pow10n(d1);
    const den = res.r1 * pow10n(d0);
    const price = ratioBigIntToNumber(num, den, 18);
    return { price, reserveBase: res.r1, reserveQuote: res.r0, token0: t0, token1: t1, dec0: d0, dec1: d1 };
  }
  return { price: null, reserveBase: 0n, reserveQuote: 0n, token0: t0, token1: t1, dec0: d0, dec1: d1 };
}

function changeFromHistoryMs(history, nowMs, lookbackMs) {
  const h = Array.isArray(history) ? history : [];
  const now = Number(nowMs || 0);
  const target = now - Number(lookbackMs || 0);
  if (!now || !Number.isFinite(target)) return null;
  let best = null;
  for (let i = h.length - 1; i >= 0; i--) {
    const ts = Number(h[i]?.ts || 0);
    const priceUsd = Number(h[i]?.priceUsd);
    if (!Number.isFinite(ts) || !Number.isFinite(priceUsd) || !(priceUsd > 0)) continue;
    if (ts <= target) {
      best = priceUsd;
      break;
    }
  }
  if (!best) return null;
  const last = h.length ? Number(h[h.length - 1]?.priceUsd) : null;
  if (!Number.isFinite(last) || !(last > 0)) return null;
  return ((last - best) / best) * 100;
}

async function fetchOnchainTokenSnapshot(contract) {
  const addr = String(contract || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;

  const [pairWbnb, pairUsdt, pairBnbUsdt] = await Promise.all([
    rpcGetPair(addr, WBNB_ADDRESS),
    rpcGetPair(addr, USDT_ADDRESS),
    rpcGetPair(WBNB_ADDRESS, USDT_ADDRESS),
  ]);
  const zero = "0x0000000000000000000000000000000000000000";
  if (pairWbnb === zero && pairUsdt === zero) return null;

  const [metaName, metaSymbol, tokenDec, supplyRaw] = await Promise.all([rpcTokenName(addr), rpcTokenSymbol(addr), rpcTokenDecimals(addr), rpcTokenTotalSupply(addr)]);
  const supply = ratioBigIntToNumber(supplyRaw, pow10n(tokenDec), 6);

  let bnbUsd = null;
  if (pairBnbUsdt !== zero) {
    const bnbUsdInfo = await rpcV2PriceBaseInQuote(pairBnbUsdt, WBNB_ADDRESS, USDT_ADDRESS);
    bnbUsd = bnbUsdInfo.price;
  }

  let pair = pairWbnb;
  let quote = WBNB_ADDRESS;
  if (pair === zero) {
    pair = pairUsdt;
    quote = USDT_ADDRESS;
  }

  const priceInfo = await rpcV2PriceBaseInQuote(pair, addr, quote);
  const priceInQuote = priceInfo.price;

  let priceUsd = null;
  let priceNative = null;
  let liquidityUsd = null;

  if (quote === WBNB_ADDRESS) {
    priceNative = priceInQuote;
    if (typeof priceNative === "number" && Number.isFinite(priceNative) && typeof bnbUsd === "number" && Number.isFinite(bnbUsd)) priceUsd = priceNative * bnbUsd;
    const reserveWbnb = ratioBigIntToNumber(priceInfo.reserveQuote, pow10n(18), 6);
    if (typeof reserveWbnb === "number" && Number.isFinite(reserveWbnb) && typeof bnbUsd === "number" && Number.isFinite(bnbUsd)) liquidityUsd = reserveWbnb * bnbUsd * 2;
  } else {
    priceUsd = priceInQuote;
    if (typeof priceUsd === "number" && Number.isFinite(priceUsd) && typeof bnbUsd === "number" && Number.isFinite(bnbUsd) && bnbUsd > 0) priceNative = priceUsd / bnbUsd;
    const reserveUsdt = ratioBigIntToNumber(priceInfo.reserveQuote, pow10n(18), 6);
    if (typeof reserveUsdt === "number" && Number.isFinite(reserveUsdt)) liquidityUsd = reserveUsdt * 2;
  }

  const marketCap = typeof priceUsd === "number" && Number.isFinite(priceUsd) && typeof supply === "number" && Number.isFinite(supply) ? priceUsd * supply : null;

  return {
    source: "rpc",
    url: "",
    pairAddress: pair,
    name: metaName || "",
    symbol: metaSymbol || "",
    priceUsd: typeof priceUsd === "number" && Number.isFinite(priceUsd) ? priceUsd : null,
    priceNative: typeof priceNative === "number" && Number.isFinite(priceNative) ? priceNative : null,
    liquidityUsd: typeof liquidityUsd === "number" && Number.isFinite(liquidityUsd) ? liquidityUsd : null,
    volume24hUsd: null,
    marketCap: typeof marketCap === "number" && Number.isFinite(marketCap) ? marketCap : null,
    totalSupply: typeof supply === "number" && Number.isFinite(supply) ? supply : null,
    change1h: null,
    change6h: null,
    change24h: null,
  };
}

function pickChangeForRange(snapshot, range) {
  const s = snapshot || {};
  if (range === "1H") return s.change1h;
  if (range === "24H") return s.change24h;
  if (range === "7D") return s.change24h;
  if (range === "ALL") return s.change24h;
  return s.change24h;
}

async function refreshTokenSnapshot() {
  const now = Date.now();
  if (state.token.lastFetchMs && now - state.token.lastFetchMs < 15000) return;
  state.token.lastFetchMs = now;
  const mint = getMintAddress();
  if (!mint) {
    state.token.snapshot = null;
    updateLiveSeries();
    await refreshOnchainTreasuryPool();
    renderRewards();
    drawOverview();
    drawChart();
    return;
  }
  let dex = null;
  let backendSnap = null;
  try {
    dex = await fetchDexScreenerTokenSnapshot(mint);
  } catch {
    dex = null;
  }
  try {
    backendSnap = await fetchBackendTokenSnapshot(mint);
  } catch {
    backendSnap = null;
  }

  if (backendSnap) {
    const merged = { ...backendSnap };
    if (dex) {
      if (!merged.url) merged.url = String(dex.url || "");
      if (!merged.pairAddress) merged.pairAddress = String(dex.pairAddress || "");
      if (!(typeof merged.volume24hUsd === "number" && Number.isFinite(merged.volume24hUsd))) merged.volume24hUsd = dex.volume24hUsd;
    }
    state.token.snapshot = { ...merged, ts: now };
  } else if (dex) {
    state.token.snapshot = { ...dex, ts: now };
  } else {
    state.token.snapshot = null;
  }

  const price = state.token.snapshot && typeof state.token.snapshot.priceUsd === "number" ? state.token.snapshot.priceUsd : null;
  if (typeof price === "number" && Number.isFinite(price) && price > 0) {
    const hist = Array.isArray(state.token.history) ? state.token.history : [];
    const last = hist.length ? hist[hist.length - 1] : null;
    if (!last || now - Number(last.ts || 0) >= 5000) hist.push({ ts: now, priceUsd: price });
    else last.priceUsd = price;
    const cutoff = now - 8 * 24 * 60 * 60 * 1000;
    while (hist.length && Number(hist[0].ts || 0) < cutoff) hist.shift();
    while (hist.length > 5000) hist.shift();
    state.token.history = hist;
  }

  const snap0 = state.token.snapshot;
  if (snap0 && isMarketLiveSnapshot(snap0)) {
    const c1 = changeFromHistoryMs(state.token.history, now, 60 * 60 * 1000);
    const c6 = changeFromHistoryMs(state.token.history, now, 6 * 60 * 60 * 1000);
    const c24 = changeFromHistoryMs(state.token.history, now, 24 * 60 * 60 * 1000);
    if (!(typeof snap0.change1h === "number" && Number.isFinite(snap0.change1h)) && typeof c1 === "number" && Number.isFinite(c1)) snap0.change1h = c1;
    if (!(typeof snap0.change6h === "number" && Number.isFinite(snap0.change6h)) && typeof c6 === "number" && Number.isFinite(c6)) snap0.change6h = c6;
    if (!(typeof snap0.change24h === "number" && Number.isFinite(snap0.change24h)) && typeof c24 === "number" && Number.isFinite(c24)) snap0.change24h = c24;
  }

  updateLiveSeries();
  const snap = state.token.snapshot;
  const v24 = snap && typeof snap.volume24hUsd === "number" ? snap.volume24hUsd : null;
  const pUsd = snap && typeof snap.priceUsd === "number" ? snap.priceUsd : null;
  const pNat = snap && typeof snap.priceNative === "number" ? snap.priceNative : null;
  const solUsd = typeof pUsd === "number" && typeof pNat === "number" && pNat > 0 ? pUsd / pNat : null;
  if (typeof v24 === "number" && Number.isFinite(v24) && v24 > 0 && typeof solUsd === "number" && Number.isFinite(solUsd) && solUsd > 0) {
    state.rewards.poolBnb24h = (v24 * TRADING_FEE_RATE) / solUsd;
  } else {
    state.rewards.poolBnb24h = 0;
  }
  await refreshOnchainTreasuryPool();
  renderRewards();
  drawOverview();
  drawChart();
}

function rangeWindowMs(range) {
  if (range === "1H") return 60 * 60 * 1000;
  if (range === "24H") return 24 * 60 * 60 * 1000;
  if (range === "7D") return 7 * 24 * 60 * 60 * 1000;
  if (range === "ALL") return 30 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function rangePointCount(range) {
  if (range === "1H") return 60;
  if (range === "24H") return 96;
  if (range === "7D") return 140;
  if (range === "ALL") return 220;
  return 96;
}

function buildSeriesFromHistory(range) {
  const raw = Array.isArray(state.token.history) ? state.token.history : [];
  const hist = raw
    .map((p) => ({ ts: Number(p?.ts || 0), priceUsd: Number(p?.priceUsd) }))
    .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.priceUsd) && p.priceUsd > 0)
    .sort((a, b) => a.ts - b.ts);

  if (hist.length < 1) return null;

  const now = Date.now();
  const count = rangePointCount(range);
  const win = rangeWindowMs(range);
  const coverageMs = Math.max(0, hist[hist.length - 1].ts - hist[0].ts);
  const effectiveWinMs = coverageMs > 0 && coverageMs < win * 0.3 ? Math.max(10 * 60 * 1000, Math.min(win, Math.floor(coverageMs * 1.1))) : win;
  const start = now - effectiveWinMs;
  const stepMs = count > 1 ? Math.floor(effectiveWinMs / (count - 1)) : effectiveWinMs;

  if (hist.length === 1) {
    const points = new Array(count).fill(hist[0].priceUsd);
    const volumes = new Array(count).fill(0.05);
    return { points, volumes, effectiveWinMs, coverageMs };
  }

  const windowed = hist.filter((p) => p.ts >= start);
  if (windowed.length >= 2 && windowed.length < Math.max(6, Math.floor(count * 0.15))) {
    const first = windowed[0].priceUsd;
    const last = windowed[windowed.length - 1].priceUsd;
    const points = new Array(count).fill(first);
    for (let i = 0; i < count; i++) {
      const k = count > 1 ? i / (count - 1) : 1;
      points[i] = first + (last - first) * k;
    }
    const volumes = [];
    for (let i = 0; i < points.length; i++) {
      if (i === 0) volumes.push(0.05);
      else {
        const prev = points[i - 1];
        const cur = points[i];
        const pct = prev > 0 ? Math.abs((cur - prev) / prev) : 0;
        volumes.push(Math.min(1, Math.max(0.05, pct * 10)));
      }
    }
    return { points, volumes, effectiveWinMs, coverageMs };
  }

  let idx = 0;
  let lastPrice = null;
  while (idx < hist.length && hist[idx].ts < start) {
    lastPrice = hist[idx].priceUsd;
    idx += 1;
  }
  if (lastPrice === null) lastPrice = hist[0].priceUsd;

  const points = new Array(count).fill(lastPrice);
  for (let i = 0; i < count; i++) {
    const t = start + i * stepMs;
    while (idx < hist.length && hist[idx].ts <= t) {
      lastPrice = hist[idx].priceUsd;
      idx += 1;
    }
    points[i] = lastPrice;
  }

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    if (!(prev > 0)) continue;
    const ratio = cur / prev;
    if (ratio > 5) points[i] = prev * 5;
    else if (ratio < 0.2) points[i] = prev * 0.2;
  }

  const alpha = 0.35;
  for (let i = 1; i < points.length; i++) {
    points[i] = points[i - 1] * (1 - alpha) + points[i] * alpha;
  }

  const volumes = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      volumes.push(0.05);
      continue;
    }
    const prev = points[i - 1];
    const cur = points[i];
    const pct = prev > 0 ? Math.abs((cur - prev) / prev) : 0;
    volumes.push(Math.min(1, Math.max(0.05, pct * 10)));
  }

  if (points.length < 2) return null;
  return { points, volumes, effectiveWinMs, coverageMs };
}

function updateLiveSeries() {
  const series = buildSeriesFromHistory(state.chart.range);
  if (series) {
    state.chart.points = series.points;
    state.chart.volumes = series.volumes;
    state.chart.live = true;
    state.chart.effectiveWinMs = series.effectiveWinMs;
    state.chart.coverageMs = series.coverageMs;
  } else {
    state.chart.live = false;
    state.chart.effectiveWinMs = null;
    state.chart.coverageMs = null;
  }
  const ov = buildSeriesFromHistory("24H");
  if (ov) {
    state.overview.points = ov.points;
    state.overview.volumes = ov.volumes;
    state.overview.live = true;
    state.overview.effectiveWinMs = ov.effectiveWinMs;
    state.overview.coverageMs = ov.coverageMs;
  } else {
    state.overview.live = false;
    state.overview.effectiveWinMs = null;
    state.overview.coverageMs = null;
  }
  renderChartHint();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderChartHint() {
  const el = document.getElementById("chartHint");
  if (!el) return;
  const win = rangeWindowMs(state.chart.range);
  const eff = Number(state.chart.effectiveWinMs || 0);
  if (!state.chart.live || !eff || eff >= win * 0.85) {
    el.textContent = "";
    return;
  }
  const mins = Math.max(1, Math.round(eff / 60000));
  el.textContent = state.lang === "zh" ? `数据收集中，当前展示最近 ${mins} 分钟` : `Collecting data · Showing last ${mins}m`;
}

function isMarketLiveSnapshot(snap) {
  const s = snap || {};
  return (
    (s.source === "rpc" || s.source === "dexscreener" || s.source === "backend" || s.source === "backend-sol") &&
    typeof s.priceUsd === "number" &&
    Number.isFinite(s.priceUsd) &&
    s.priceUsd > 0
  );
}

function isSolAddress(addr) {
  const raw = String(addr || "").trim();
  if (!raw) return false;
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw)) return false;
  return true;
}

function getMintAddress() {
  const meta = document.querySelector('meta[name="wct-mint"]');
  const fromMeta = meta && typeof meta.content === "string" ? meta.content.trim() : "";
  const fromLs = (localStorage.getItem("wct_mint") || "").trim();
  const raw = fromLs || fromMeta || "";
  return isSolAddress(raw) ? raw : "";
}

function updateContractUI() {
  const el = $("#contractAddr");
  if (!el) return;
  const mint = getMintAddress();
  el.dataset.full = mint || "";
  el.textContent = mint ? truncateAddress(mint) : "--";
}

function normAddress(addr) {
  const raw = String(addr || "").trim();
  return isHexAddress(raw) ? raw.toLowerCase() : raw;
}

function isHexAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(addr || ""));
}

function pow10BigInt(d) {
  const n = Math.max(0, Math.floor(Number(d || 0)));
  let r = 1n;
  for (let i = 0; i < n; i++) r *= 10n;
  return r;
}

function getWctWholeBalance() {
  const bal = typeof state.wallet.wctBalanceRaw === "bigint" ? state.wallet.wctBalanceRaw : 0n;
  const dec = Math.max(0, Math.floor(Number(state.wallet.wctDecimals ?? 18)));
  return bal / pow10BigInt(dec);
}

function getPredictionBoost(wholeWct) {
  const w = typeof wholeWct === "bigint" ? wholeWct : 0n;
  if (w >= BOOST_TIER_10M) return 2;
  if (w >= BOOST_TIER_5M) return 1.5;
  if (w >= BOOST_TIER_1M) return 1;
  return 1;
}

function dailyPredKey(addr) {
  const a = normAddress(addr);
  if (!a) return null;
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `wct_pred_day_${a}_${yyyy}${mm}${dd}`;
}

function getTodayPredictionCount(addr) {
  const k = dailyPredKey(addr);
  if (!k) return 0;
  const raw = localStorage.getItem(k);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function bumpTodayPredictionCount(addr) {
  const k = dailyPredKey(addr);
  if (!k) return;
  const next = getTodayPredictionCount(addr) + 1;
  localStorage.setItem(k, String(next));
}

function getDailyPredictionLimit(wholeWct) {
  const w = typeof wholeWct === "bigint" ? wholeWct : 0n;
  return w >= DAILY_PRED_LIMIT_MIN_HOLD ? DAILY_PRED_LIMIT_HOLD : DAILY_PRED_LIMIT_NO_HOLD;
}

function getTreasuryAddress() {
  const fromLs = (localStorage.getItem(TREASURY_STORAGE_KEY) || "").trim();
  const meta = document.querySelector('meta[name="wct-prize-pool"]');
  const fromMeta = meta && typeof meta.content === "string" ? meta.content.trim() : "";
  const raw = fromLs || fromMeta;
  return isSolAddress(raw) ? raw : "";
}

function getBackendBaseUrl() {
  const meta = document.querySelector('meta[name="wct-backend"]');
  const fromMeta = meta && typeof meta.content === "string" ? meta.content.trim() : "";
  const fromLs = (localStorage.getItem(BACKEND_STORAGE_KEY) || "").trim();
  if (fromLs) {
    const raw = fromLs;
    if (!/^https?:\/\//i.test(raw)) return "";
    return raw.replace(/\/+$/g, "");
  }
  const host = typeof window !== "undefined" ? String(window.location?.hostname || "") : "";
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8787";
  const raw = fromMeta;
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw.replace(/\/+$/g, "");
}

function backendTokenKey(addr) {
  const a = normAddress(addr);
  return a ? `${BACKEND_TOKEN_PREFIX}${a}` : null;
}

function getBackendToken(addr) {
  const k = backendTokenKey(addr);
  if (!k) return null;
  const raw = (localStorage.getItem(k) || "").trim();
  return raw || null;
}

function setBackendToken(addr, token) {
  const k = backendTokenKey(addr);
  if (!k) return;
  if (!token) localStorage.removeItem(k);
  else localStorage.setItem(k, String(token));
}

function initBackendState() {
  if (state.backend.stream && state.backend.stream.es) {
    try {
      state.backend.stream.es.close();
    } catch {
    }
  }
  state.backend.baseUrl = getBackendBaseUrl();
  state.backend.enabled = Boolean(state.backend.baseUrl);
  state.backend.token = state.wallet.address ? getBackendToken(state.wallet.address) : null;
  state.backend.authed = false;
  state.backend.lastSyncMs = 0;
  state.backend.syncing = false;
  state.backend.leaderboardRows = [];
  state.backend.stream = null;
  state.backend.loginPromise = null;

  state.rewards.treasuryAddress = getTreasuryAddress();
  state.rewards.lastTreasurySyncMs = 0;
}

async function backendFetch(path, { method = "GET", headers = {}, body } = {}) {
  const base = state.backend.baseUrl;
  if (!base) throw new Error("no_backend");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const h = { ...(headers || {}) };
  if (state.backend.token) h.Authorization = `Bearer ${state.backend.token}`;
  if (body !== undefined && body !== null && !h["Content-Type"]) h["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers: h,
    body: body !== undefined && body !== null ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    let err = "";
    try {
      const j = await res.json();
      err = j && j.error ? String(j.error) : "";
    } catch {
      err = "";
    }
    const e = new Error(err || `HTTP_${res.status}`);
    e.status = res.status;
    throw e;
  }
  return await res.json();
}

function cssEscapeCompat(s) {
  const raw = String(s ?? "");
  if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") return CSS.escape(raw);
  return raw.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c.codePointAt(0).toString(16)} `);
}

function poolLeaderFromCounts(counts) {
  const c = counts || { HOME: 0, DRAW: 0, AWAY: 0 };
  const h = Math.max(0, Math.floor(Number(c.HOME || 0)));
  const d = Math.max(0, Math.floor(Number(c.DRAW || 0)));
  const a = Math.max(0, Math.floor(Number(c.AWAY || 0)));
  if (h === d && d === a) return null;
  if (h >= d && h >= a) return "HOME";
  if (a >= h && a >= d) return "AWAY";
  return "DRAW";
}

function updatePoolDomForMatch(matchId) {
  const id = String(matchId || "");
  if (!id) return;
  const pool = getPool(id);
  const participantsCount =
    typeof pool.participantsCount === "number" && Number.isFinite(pool.participantsCount)
      ? Math.max(0, Math.floor(pool.participantsCount))
      : Object.keys(pool.participants || {}).length;
  const counts =
    pool.counts && typeof pool.counts === "object"
      ? {
          HOME: Math.max(0, Math.floor(Number(pool.counts.HOME || 0))),
          DRAW: Math.max(0, Math.floor(Number(pool.counts.DRAW || 0))),
          AWAY: Math.max(0, Math.floor(Number(pool.counts.AWAY || 0))),
        }
      : (() => {
          const c = { HOME: 0, DRAW: 0, AWAY: 0 };
          Object.values(pool.participants || {}).forEach((v) => {
            const p = v?.pick;
            if (p === "HOME" || p === "DRAW" || p === "AWAY") c[p] += 1;
          });
          return c;
        })();
  const totalVotes = counts.HOME + counts.DRAW + counts.AWAY;
  const leader = poolLeaderFromCounts(counts);

  const match = state.schedule.matches.find((m) => m.id === id) || null;
  const homeLabel = match ? match.home : "";
  const awayLabel = match ? match.away : "";
  const drawLabel = t("prediction.draw");
  const mostLabel = t("prediction.mostBettors");

  const cards = $all(`.predPick[data-match-id="${cssEscapeCompat(id)}"]`);
  cards.forEach((card) => {
    const p = card.querySelector(".predPoolRow__v");
    if (p) p.textContent = formatPts(participantsCount);

    const rows = Array.from(card.querySelectorAll(".predSplitRow"));
    const base = [
      { pick: "HOME", label: homeLabel },
      { pick: "DRAW", label: drawLabel },
      { pick: "AWAY", label: awayLabel },
    ];
    rows.forEach((row, i) => {
      const metaNum = row.querySelector(".predSplitRow__num");
      const metaRatio = row.querySelector(".predSplitRow__ratio");
      const fill = row.querySelector(".predSplitRow__fill");
      const name = row.querySelector(".predSplitRow__name");
      const info = base[i] || null;
      if (!info) return;
      const n = info.pick === "HOME" ? counts.HOME : info.pick === "AWAY" ? counts.AWAY : counts.DRAW;
      if (metaNum) metaNum.textContent = formatPts(n);
      if (metaRatio) metaRatio.textContent = `${pct(n, totalVotes).toFixed(0)}%`;
      if (fill) fill.style.width = `${pct(n, totalVotes).toFixed(2)}%`;
      const isLead = leader && leader === info.pick;
      row.classList.toggle("is-lead", Boolean(isLead));
      if (name) {
        const label = info.label || "";
        if (isLead && label) {
          name.innerHTML = `${label} <span class="predSplitTag">${mostLabel}</span>`;
        } else {
          name.textContent = label;
        }
      }
    });
  });

  const rows = $all(`.allMatchRow[data-match-id="${cssEscapeCompat(id)}"]`);
  rows.forEach((row) => {
    const statVals = row.querySelectorAll(".allMatchRow__statVal");
    const bettorsEl = statVals && statVals[0] ? statVals[0] : null;
    const leadEl = statVals && statVals[1] ? statVals[1] : null;
    if (bettorsEl) bettorsEl.textContent = formatPts(participantsCount);
    if (leadEl && match) {
      const homeBettors = counts.HOME;
      const awayBettors = counts.AWAY;
      leadEl.textContent = homeBettors === awayBettors ? "--" : homeBettors > awayBettors ? match.home : match.away;
    }
  });
}

function scheduleLeaderboardRefresh() {
  if (!state.backend.enabled) return;
  const s = state.backend.stream;
  if (!s) return;
  if (s.leaderboardTimer) return;
  s.leaderboardTimer = window.setTimeout(() => {
    s.leaderboardTimer = null;
    backendSyncLeaderboard()
      .then(() => renderLeaderboard())
      .catch(() => {});
  }, 1200);
}

function backendStartStream() {
  if (!state.backend.enabled) return;
  if (state.backend.stream && state.backend.stream.es) return;
  if (typeof EventSource === "undefined") return;
  const url = `${state.backend.baseUrl}/v1/stream`;
  const es = new EventSource(url);
  const stream = {
    es,
    connected: false,
    lastMsgMs: 0,
    leaderboardTimer: null,
  };
  state.backend.stream = stream;

  es.onopen = () => {
    stream.connected = true;
  };
  es.onerror = () => {
    stream.connected = false;
  };
  es.onmessage = (ev) => {
    stream.lastMsgMs = Date.now();
    let data = null;
    try {
      data = JSON.parse(String(ev.data || ""));
    } catch {
      data = null;
    }
    if (!data || typeof data !== "object") return;
    const type = String(data.type || "");
    if (type === "pool") {
      const matchId = String(data.matchId || "");
      const pool = data.pool && typeof data.pool === "object" ? data.pool : null;
      if (matchId && pool) {
        const counts = pool.counts && typeof pool.counts === "object" ? pool.counts : { HOME: 0, DRAW: 0, AWAY: 0 };
        const participantsCount = typeof pool.participantsCount === "number" ? pool.participantsCount : counts.HOME + counts.DRAW + counts.AWAY;
        const settled = Boolean(pool.settled);
        const result = pool.result ? String(pool.result) : null;
        setPool(matchId, { totals: pool.totals || { HOME: 0, DRAW: 0, AWAY: 0 }, counts, participantsCount, participants: {}, settled, result });
        updatePoolDomForMatch(matchId);
      }
      scheduleLeaderboardRefresh();
      return;
    }
    if (type === "result") {
      scheduleLeaderboardRefresh();
      backendSyncAll({ force: true }).catch(() => {});
      return;
    }
    if (type === "leaderboard") {
      scheduleLeaderboardRefresh();
      return;
    }
  };
}

async function backendEnsureLogin({ interactive } = {}) {
  if (!state.backend.enabled) return false;
  const provider = getSolProvider();
  if (!provider || !state.wallet.address) return false;
  const addr = state.wallet.address;

  if (state.backend.loginPromise) {
    try {
      return await state.backend.loginPromise;
    } catch {
      return false;
    }
  }

  const token = getBackendToken(addr);
  if (token && token === state.backend.token) {
    try {
      const me = await backendFetch("/v1/me");
      if (me && me.address) {
        state.backend.authed = true;
        return true;
      }
    } catch {
      setBackendToken(addr, null);
      state.backend.token = null;
      state.backend.authed = false;
    }
  }

  if (!interactive) return false;

  state.backend.loginPromise = (async () => {
    let nonce = null;
    try {
      const r = await backendFetch(`/v1/nonce?address=${encodeURIComponent(addr)}`);
      nonce = r;
    } catch {
      toast(t("toast.backendUnavailable"));
      return false;
    }
    const message = nonce && nonce.message ? String(nonce.message) : "";
    if (!message) {
      toast(t("toast.backendLoginFailed"));
      return false;
    }

    const bytesToBase64 = (u8) => {
      const b = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8 || []);
      let s = "";
      for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      return btoa(s);
    };

    let signature = "";
    try {
      const msgBytes = new TextEncoder().encode(message);
      const signed = await provider.signMessage(msgBytes, "utf8");
      const sigBytes = signed && signed.signature ? signed.signature : signed;
      if (sigBytes && (sigBytes instanceof Uint8Array || ArrayBuffer.isView(sigBytes))) signature = `base64:${bytesToBase64(sigBytes)}`;
    } catch (e) {
      const code = Number(e?.code || 0);
      const msg = String(e?.message || "").toLowerCase();
      if (code === 4001 || msg.includes("rejected")) {
        toast(t("toast.backendLoginFailed"));
        state.backend.authed = false;
        return false;
      }
    }
    if (!signature) {
      toast(t("toast.backendLoginFailed"));
      state.backend.authed = false;
      return false;
    }
    try {
      const r2 = await backendFetch("/v1/login", { method: "POST", body: { address: addr, signature } });
      const tok = r2 && r2.token ? String(r2.token) : "";
      if (!tok) throw new Error("no_token");
      state.backend.token = tok;
      setBackendToken(addr, tok);
      state.backend.authed = true;
      return true;
    } catch (e) {
      const msg = String(e?.message || "");
      const status = Number(e?.status || 0);
      if (msg === "db_unavailable" || status === 503) {
        toast(t("toast.backendUnavailable"));
        state.backend.authed = false;
        return false;
      }
      toast(t("toast.backendLoginFailed"));
      state.backend.authed = false;
      return false;
    }
  })();

  try {
    return await state.backend.loginPromise;
  } finally {
    state.backend.loginPromise = null;
  }
}

async function backendSyncMe() {
  if (!state.backend.enabled || !state.backend.authed || !state.wallet.address) return;
  const addr = normAddress(state.wallet.address);
  const me = await backendFetch("/v1/me");
  if (!me) return;
  trackLeaderboardAddress(addr);
}

async function backendSyncLeaderboard() {
  if (!state.backend.enabled) return;
  const r = await backendFetch("/v1/leaderboard?limit=100&eligibleMin=20");
  const rowsRaw = Array.isArray(r?.rows) ? r.rows : [];
  const rows = rowsRaw.filter((x) => Boolean(x?.eligible));
  state.backend.leaderboardRows = rows;
  const addrs = rows.map((x) => normAddress(x.address)).filter(Boolean);
  localStorage.setItem(leaderboardIndexKey(), JSON.stringify(addrs));
}

async function backendSyncPools() {
  if (!state.backend.enabled) return;
  if (!state.schedule.loaded || !state.schedule.matches.length) return;
  const ids = state.schedule.matches.map((m) => String(m.id)).filter(Boolean);
  const chunkSize = 60;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const q = chunk.map((id) => encodeURIComponent(id)).join(",");
    const r = await backendFetch(`/v1/pools?matchIds=${q}`);
    const pools = r && r.pools && typeof r.pools === "object" ? r.pools : {};
    chunk.forEach((id) => {
      const p = pools[id] || null;
      const totals = p?.totals || { HOME: 0, DRAW: 0, AWAY: 0 };
      const counts = p?.counts || { HOME: 0, DRAW: 0, AWAY: 0 };
      const participantsCount = typeof p?.participantsCount === "number" ? p.participantsCount : counts.HOME + counts.DRAW + counts.AWAY;
      const settled = Boolean(p?.settled);
      const result = p?.result ? String(p.result) : null;
      setPool(id, { totals, counts, participantsCount, participants: {}, settled, result });
      updatePoolDomForMatch(id);
    });
  }
}

async function backendSyncBets() {
  if (!state.backend.enabled || !state.backend.authed || !state.wallet.address) return;
  const addr = state.wallet.address;
  let r = null;
  try {
    r = await backendFetch("/v1/predictions?limit=120");
  } catch {
    r = await backendFetch("/v1/bets?limit=120");
  }
  const rows = Array.isArray(r?.rows) ? r.rows : [];
  const obj = {};
  rows.forEach((b) => {
    if (!b || !b.matchId) return;
    const id = String(b.matchId);
    const match = state.schedule.matches.find((m) => m.id === id) || null;
    obj[id] = {
      matchId: id,
      pick: b.pick,
      amount: b.amount,
      spentBonus: b.spentBonus,
      spentBase: b.spentBase,
      ts: b.createdAt,
      result: b.result,
      payout: b.payout,
      settledAt: b.settledAt,
      match: match
        ? {
            id: match.id,
            date: match.date,
            time: match.time,
            stage: match.stage,
            home: match.home,
            away: match.away,
            kickoffIso: match.kickoffIso,
            kickoffMs: match.kickoffMs,
          }
        : null,
    };
  });
  setUserBets(addr, obj);
}

async function backendSyncAll({ force } = {}) {
  if (!state.backend.enabled) return;
  const now = Date.now();
  if (!force && state.backend.lastSyncMs && now - state.backend.lastSyncMs < 15000) return;
  if (state.backend.syncing) return;
  state.backend.syncing = true;
  try {
    if (state.wallet.address) await backendEnsureLogin();
    if (state.wallet.address && state.backend.authed) await backendSyncMe();
    await backendSyncLeaderboard();
    await backendSyncPools();
    if (state.wallet.address && state.backend.authed) await backendSyncBets();
    renderMyBets();
    renderLeaderboard();
    renderPredictionMatches();
    renderAllMatches();
  } catch {
  } finally {
    state.backend.lastSyncMs = Date.now();
    state.backend.syncing = false;
  }
}

async function refreshOnchainTreasuryPool() {
  const addr = state.rewards.treasuryAddress || getTreasuryAddress();
  state.rewards.treasuryAddress = addr;
  if (!addr || !isSolAddress(addr)) {
    state.rewards.poolBnbOnchainWei = null;
    return;
  }
  const now = Date.now();
  if (state.rewards.lastTreasurySyncMs && now - state.rewards.lastTreasurySyncMs < 15000) return;
  state.rewards.lastTreasurySyncMs = now;
  try {
    const base = getBackendBaseUrl();
    if (!base) throw new Error("no_backend");
    const url = `${base}/v1/sol/pool?address=${encodeURIComponent(addr)}`;
    const json = await fetchJsonWithCorsFallback(url);
    const lamports = typeof json?.lamports === "number" && Number.isFinite(json.lamports) ? BigInt(Math.max(0, Math.floor(json.lamports))) : null;
    state.rewards.poolBnbOnchainWei = lamports;
  } catch {
    state.rewards.poolBnbOnchainWei = null;
  }
}

function pointsKey(addr) {
  const a = normAddress(addr);
  return a ? `wct_points_${a}` : null;
}

function rankKey(addr) {
  const a = normAddress(addr);
  return a ? `wct_rank_${a}` : null;
}

function getRankPoints(addr) {
  const k = rankKey(addr);
  if (!k) return 0;
  const raw = localStorage.getItem(k);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function setRankPoints(addr, points) {
  const k = rankKey(addr);
  if (!k) return;
  localStorage.setItem(k, String(Math.max(0, Math.floor(Number(points || 0)))));
}

function addRankPoints(addr, delta) {
  const d = Math.max(0, Math.floor(Number(delta || 0)));
  if (!d) return;
  setRankPoints(addr, getRankPoints(addr) + d);
}

function leaderboardIndexKey() {
  return "wct_leader_index";
}

function getLeaderboardIndex() {
  const raw = localStorage.getItem(leaderboardIndexKey());
  const parsed = safeJson(raw);
  return Array.isArray(parsed) ? parsed.map(normAddress).filter(Boolean) : [];
}

function trackLeaderboardAddress(addr) {
  const a = normAddress(addr);
  if (!a) return;
  const list = getLeaderboardIndex();
  if (list.includes(a)) return;
  list.push(a);
  localStorage.setItem(leaderboardIndexKey(), JSON.stringify(list));
}

function crownSvg(kind) {
  return `
    <svg class="leaderCrown leaderCrown--${kind}" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7l5 4 3-6 3 6 5-4-1.25 11H5.25L4 7Z" fill="currentColor"/>
      <path d="M6 20h12v2H6v-2Z" fill="currentColor"/>
    </svg>
  `;
}

function renderLeaderboardHost(hostId, limit) {
  const host = $(`#${hostId}`);
  if (!host) return;

  const safeLimit = Math.max(0, Math.floor(Number(limit || 0)));
  if (!safeLimit) {
    host.innerHTML = "";
    return;
  }

  const toRowClass = (i) => (i === 0 ? "leaderRow is-1" : i === 1 ? "leaderRow is-2" : i === 2 ? "leaderRow is-3" : "leaderRow");
  const toBadge = (i) => (i === 0 ? crownSvg("gold") : i === 1 ? crownSvg("silver") : i === 2 ? crownSvg("bronze") : "");

  let rows = [];

  if (state.backend.enabled && Array.isArray(state.backend.leaderboardRows) && state.backend.leaderboardRows.length) {
    rows = state.backend.leaderboardRows
      .map((r) => ({
        addr: normAddress(r.address),
        rate: Math.max(0, Math.min(1, Number(r.winRate || 0))),
        settled: Math.max(0, Math.floor(Number(r.settled || 0))),
      }))
      .filter((r) => r.addr)
      .slice(0, safeLimit);
  } else {
    if (state.wallet.address) trackLeaderboardAddress(state.wallet.address);
    const addrs = getLeaderboardIndex();
    const stats = (addr) => {
      const bets = getUserBets(addr);
      const ids = Object.keys(bets || {});
      let total = 0;
      let correct = 0;
      ids.forEach((id) => {
        const b = bets[id] || {};
        const result = b.result || null;
        const pick = b.pick || null;
        if (!result || !pick) return;
        total += 1;
        if (pick === result) correct += 1;
      });
      const rate = total > 0 ? correct / total : 0;
      const score = total > 0 ? rate * Math.log1p(total) : 0;
      return { total, correct, rate, score };
    };
    rows = addrs
      .map((a) => ({ addr: a, ...stats(a) }))
      .filter((r) => r.total >= MIN_LEADERBOARD_MATCHES)
      .sort((x, y) => y.score - x.score || y.rate - x.rate || y.correct - x.correct || y.total - x.total || x.addr.localeCompare(y.addr))
      .map((r) => ({ addr: r.addr, rate: r.rate, settled: r.total }))
      .slice(0, safeLimit);
  }

  if (!rows.length) {
    host.innerHTML = `<li class="leaderEmpty">${t("leaderboard.empty")}</li>`;
    return;
  }

  host.innerHTML = rows
    .map((r, i) => {
      const cls = toRowClass(i);
      const pctText = r.settled > 0 ? `${(r.rate * 100).toFixed(1)}%` : "--";
      const badge = toBadge(i);
      return `
        <li class="${cls}">
          <div class="leaderRow__rank">${i + 1}</div>
          <div class="leaderRow__main">
            <div class="leaderRow__addr mono" title="${r.addr}">${truncateAddress(r.addr)}</div>
            <div class="leaderRow__rate mono">${pctText}</div>
          </div>
          <div class="leaderRow__badge" aria-hidden="true">${badge}</div>
        </li>
      `;
    })
    .join("");
}

function renderLeaderboard() {
  renderLeaderboardHost("leaderList", 5);
  renderLeaderboardHost("leaderListFull", 100);
}

function getPoints(addr) {
  const k = pointsKey(addr);
  if (!k) return 0;
  const raw = localStorage.getItem(k);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function setPoints(addr, points) {
  const k = pointsKey(addr);
  if (!k) return;
  localStorage.setItem(k, String(Math.max(0, Math.floor(Number(points || 0)))));
}

function bonusKey(addr) {
  const a = normAddress(addr);
  return a ? `wct_bonus_${a}` : null;
}

function bonusSpentKey(addr) {
  const a = normAddress(addr);
  return a ? `wct_bonus_spent_${a}` : null;
}

function getBonusComputed(addr) {
  const k = bonusKey(addr);
  if (!k) return 0;
  const raw = localStorage.getItem(k);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function setBonusComputed(addr, points) {
  const k = bonusKey(addr);
  if (!k) return;
  localStorage.setItem(k, String(Math.max(0, Math.floor(Number(points || 0)))));
}

function getBonusSpent(addr) {
  const k = bonusSpentKey(addr);
  if (!k) return 0;
  const raw = localStorage.getItem(k);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function setBonusSpent(addr, points) {
  const k = bonusSpentKey(addr);
  if (!k) return;
  localStorage.setItem(k, String(Math.max(0, Math.floor(Number(points || 0)))));
}

function getBonusAvailable(addr) {
  const computed = getBonusComputed(addr);
  const spent = getBonusSpent(addr);
  return Math.max(0, computed - spent);
}

function getTotalPoints(addr) {
  return getPoints(addr) + getBonusAvailable(addr);
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

function syncBonusPointsFromWallet() {
  return;
}

function initPointsIfNeeded(addr) {
  return;
}

function renderWalletBalanceExtras() {
  return;
}

function updatePointsUI() {
  return;
}

function hexToBigInt(hex) {
  if (!hex || hex === "0x") return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

function pad64(hexNo0x) {
  return String(hexNo0x || "").padStart(64, "0");
}

function encodeAddressParam(addr) {
  return pad64(normAddress(addr).replace(/^0x/, ""));
}

function formatUnitsShort(value, decimals, maxFrac = 6) {
  const d = Math.max(0, Math.floor(Number(decimals || 0)));
  const v = typeof value === "bigint" ? value : BigInt(String(value || "0"));
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const s = abs.toString();
  if (d === 0) return (neg ? "-" : "") + s;
  const whole = s.length > d ? s.slice(0, s.length - d) : "0";
  const fracRaw = s.length > d ? s.slice(s.length - d) : s.padStart(d, "0");
  const frac = fracRaw.slice(0, maxFrac).replace(/0+$/g, "");
  return (neg ? "-" : "") + (frac ? `${whole}.${frac}` : whole);
}

async function fetchWalletBalances() {
  const addr = state.wallet.address;
  const provider = getSolProvider();
  if (!provider || !addr) {
    setText("bnbBalance", "--");
    setText("wctBalance", "--");
    setText("wctBalanceHero", "--");
    state.wallet.wctBalanceRaw = 0n;
    return;
  }
  const now = Date.now();
  if (state.wallet.lastBalanceSyncMs && now - state.wallet.lastBalanceSyncMs < 12000) return;
  state.wallet.lastBalanceSyncMs = now;

  const base = getBackendBaseUrl();
  if (!base) {
    setText("bnbBalance", "--");
    setText("wctBalance", "--");
    setText("wctBalanceHero", "--");
    state.wallet.wctBalanceRaw = 0n;
    updateWalletUI();
    return;
  }
  try {
    const url = `${base}/v1/sol/wallet?address=${encodeURIComponent(addr)}`;
    const json = await fetchJsonWithCorsFallback(url);
    const lamports = typeof json?.lamports === "number" && Number.isFinite(json.lamports) ? BigInt(Math.max(0, Math.floor(json.lamports))) : null;
    if (lamports !== null) setText("bnbBalance", formatUnitsShort(lamports, 9, 4));
    else setText("bnbBalance", "--");

    const tokenRawStr = json?.tokenRaw !== undefined && json?.tokenRaw !== null ? String(json.tokenRaw) : "";
    const tokenDec = typeof json?.tokenDecimals === "number" && Number.isFinite(json.tokenDecimals) ? Math.max(0, Math.floor(json.tokenDecimals)) : null;
    if (tokenRawStr && /^\d+$/.test(tokenRawStr) && tokenDec !== null) {
      const bal = BigInt(tokenRawStr);
      state.wallet.wctDecimals = tokenDec;
      state.wallet.wctBalanceRaw = bal;
      setText("wctBalance", formatUnitsShort(bal, tokenDec, 6));
      setText("wctBalanceHero", formatUnitsShort(bal, tokenDec, 6));
    } else {
      setText("wctBalance", "--");
      setText("wctBalanceHero", "--");
      state.wallet.wctBalanceRaw = 0n;
    }
  } catch {
    setText("bnbBalance", "--");
    setText("wctBalance", "--");
    setText("wctBalanceHero", "--");
    state.wallet.wctBalanceRaw = 0n;
  }
  updateWalletUI();
}

function updateWalletUI() {
  const label = $("#walletBtnLabel");
  const disconnectBtn = $("#disconnectWalletBtn");
  const copyAddrBtn = $("#copyWalletAddressBtn");
  const menu = $("#walletMenu");
  const connectBtn = $("#connectWalletBtn");
  const hint = $("#predictionHint");
  const matchesHint = $("#matchesPredictHint");
  const betsHint = $("#betsHint");
  const claimHint = $("#claimHint");
  const claimBtn = $("#claimRewardsBtn");

  const isConnected = !!(state.wallet.address && state.wallet.connected && state.wallet.manualConnected);

  if (isConnected) {
    if (label) label.textContent = truncateAddress(state.wallet.address);
    if (menu) menu.hidden = !state.wallet.walletMenuOpen;
    if (disconnectBtn) disconnectBtn.hidden = false;
    if (copyAddrBtn) {
      copyAddrBtn.hidden = false;
      copyAddrBtn.textContent = state.wallet.address;
    }
    if (connectBtn) connectBtn.setAttribute("aria-expanded", String(!!state.wallet.walletMenuOpen));
    const wholeWct = getWctWholeBalance();
    const limit = getDailyPredictionLimit(wholeWct);
    const used = getTodayPredictionCount(state.wallet.address);
    const left = Math.max(0, limit - used);
    const boost = getPredictionBoost(wholeWct);
    const info = t("prediction.limitBoost", { left, limit, boost });
    if (hint) hint.textContent = `${t("prediction.hintConnected")} · ${info}`;
    if (matchesHint) matchesHint.textContent = `${t("prediction.hintConnected")} · ${info}`;
    if (betsHint) betsHint.textContent = t("bets.hintConnected");
    if (claimHint) claimHint.textContent = t("rewards.hintConnected");
    if (claimBtn) claimBtn.disabled = false;
  } else {
    if (label) label.textContent = t("wallet.connect");
    if (menu) menu.hidden = true;
    if (disconnectBtn) disconnectBtn.hidden = true;
    if (copyAddrBtn) copyAddrBtn.hidden = true;
    if (connectBtn) connectBtn.setAttribute("aria-expanded", "false");
    if (hint) hint.textContent = t("prediction.hintDisconnected");
    if (matchesHint) matchesHint.textContent = t("prediction.hintDisconnected");
    if (betsHint) betsHint.textContent = t("bets.hintDisconnected");
    if (claimHint) claimHint.textContent = t("rewards.hintDisconnected");
    if (claimBtn) claimBtn.disabled = false;
  }
  renderMyBets();
  renderLeaderboard();
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
  } catch {
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

async function connectWallet() {
  const provider = getSolProvider();
  if (!provider) {
    const msg = t("toast.noWallet");
    toast(msg);
    try {
      window.alert(msg);
    } catch {
    }
    return;
  }

  try {
    const res = await provider.connect();
    const pk = res?.publicKey || provider.publicKey;
    state.wallet.address = pk ? String(pk.toString()) : null;
    state.wallet.connected = !!state.wallet.address;
    state.wallet.manualConnected = !!state.wallet.address;
    state.wallet.walletMenuOpen = false;
    state.wallet.wctDecimals = null;
    state.wallet.wctBalanceRaw = 0n;
    state.wallet.lastBalanceSyncMs = 0;
    initBackendState();
    hydrateRewardsFromAddress();
    updateWalletUI();
    fetchWalletBalances();
    if (state.wallet.address && state.backend.enabled) {
      backendSyncAll({ force: true });
    }
    toast(state.wallet.address ? t("toast.walletConnected") : t("toast.walletFailed"));
  } catch {
    toast(t("toast.walletRejected"));
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

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  ta.remove();
  return Promise.resolve();
}

function setupCopyContract() {
  const btn = $("#copyContractBtn");
  const el = $("#contractAddr");
  if (!btn || !el) return;
  btn.addEventListener("click", async () => {
    const full = el.dataset.full || CONTRACT_ADDRESS;
    try {
      await copyText(full);
      toast(t("toast.contractCopied"));
    } catch {
      toast(t("toast.copyFailed"));
    }
  });
}

function generateSeries(range) {
  const map = {
    "1H": { points: 60, drift: 0.00000002, noise: 0.00000009, vol: 1800 },
    "24H": { points: 96, drift: 0.00000012, noise: 0.00000018, vol: 2600 },
    "7D": { points: 140, drift: 0.00000025, noise: 0.00000035, vol: 3600 },
    "30D": { points: 180, drift: 0.00000055, noise: 0.0000008, vol: 5200 },
    ALL: { points: 220, drift: 0.0000009, noise: 0.0000012, vol: 7200 },
  };
  const cfg = map[range] || map["24H"];
  const seed = Array.from(range).reduce((a, c) => a + c.charCodeAt(0) * 17, 1337);
  const rnd = makeRng(seed);

  const base = 0.00011 + rnd() * 0.00003;
  let price = base;
  let trend = cfg.drift * (0.7 + rnd() * 0.6);
  const points = [];
  const volumes = [];

  for (let i = 0; i < cfg.points; i++) {
    const t = i / (cfg.points - 1);
    trend = trend * 0.94 + (rnd() - 0.5) * cfg.noise * 0.16;
    const meanRevert = (base - price) * 0.012;
    const noise = (rnd() - 0.5) * cfg.noise * 1.35;
    const wave = Math.sin((t + 0.08) * Math.PI * 2) * cfg.noise * 0.24;
    const spike = rnd() < 0.055 ? (rnd() - 0.5) * cfg.noise * 5.2 : 0;
    const step = trend + meanRevert + noise + wave + spike;
    price = Math.max(0.00001, price + step);
    points.push(price);

    const v = cfg.vol * (0.45 + rnd() * 0.9) * (0.75 + Math.sin((t + 0.12) * Math.PI * 2) * 0.25);
    volumes.push(Math.max(120, v));
  }

  return { points, volumes };
}

function drawChart() {
  const canvas = $("#priceChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  const cssW = canvas.clientWidth;
  const parentH = canvas.parentElement ? canvas.parentElement.clientHeight : 0;
  const cssH = parentH > 0 ? parentH : Math.max(140, Math.round((cssW * 220) / 1100));
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const pad = { l: 14, r: 14, t: 14, b: 18 };
  const w = cssW - pad.l - pad.r;
  const h = cssH - pad.t - pad.b;

  const snap = state.token.snapshot;
  const marketLive = isMarketLiveSnapshot(snap);
  let points = state.chart.points;
  const volumes = state.chart.volumes;
  if (!marketLive) {
    setText("priceValue", "--");
    setText("midPriceValue", "--");
    setText("miniPrice", "--");
    setText("midVolValue", "--");
    setText("midLiqValue", "--");
    setText("miniMcap", "--");
    setText("miniVol", "--");
    setText("miniHolders", "--");
    setText("miniSupply", "--");
    const miniPriceDelta = $("#miniPriceDelta");
    if (miniPriceDelta) {
      miniPriceDelta.textContent = "--";
      miniPriceDelta.classList.remove("up");
      miniPriceDelta.classList.remove("down");
    }
    const priceDelta = $("#priceDelta");
    if (priceDelta) {
      priceDelta.textContent = "--";
      priceDelta.classList.remove("up");
      priceDelta.classList.remove("down");
    }
    return;
  }
  if (!points.length) {
    const snapPrice0 = snap && typeof snap.priceUsd === "number" && Number.isFinite(snap.priceUsd) ? snap.priceUsd : null;
    setText("midPriceValue", snapPrice0 ? formatPriceUsd(snapPrice0) : "--");
    setText("miniPrice", snapPrice0 ? formatPriceUsd(snapPrice0) : "--");

    const vol0 = snap && typeof snap.volume24hUsd === "number" && Number.isFinite(snap.volume24hUsd) ? snap.volume24hUsd : null;
    const liq0 = snap && typeof snap.liquidityUsd === "number" && Number.isFinite(snap.liquidityUsd) ? snap.liquidityUsd : null;
    const mcap0 = snap && typeof snap.marketCap === "number" && Number.isFinite(snap.marketCap) && snap.marketCap > 0 ? snap.marketCap : null;
    const supply0 = snap && typeof snap.totalSupply === "number" && Number.isFinite(snap.totalSupply) && snap.totalSupply > 0 ? snap.totalSupply : null;
    const holders0 = snap && typeof snap.holders === "number" && Number.isFinite(snap.holders) && snap.holders > 0 ? snap.holders : null;

    setText("midVolValue", vol0 === null ? "--" : formatUSD(vol0));
    setText("midLiqValue", liq0 === null ? "--" : formatUSD(liq0));
    setText("miniMcap", mcap0 === null ? "--" : formatUSD(mcap0));
    setText("miniVol", vol0 === null ? "--" : formatUSD(vol0));
    setText("miniHolders", holders0 === null ? "--" : formatNumber(holders0));
    setText("miniSupply", supply0 === null ? "--" : formatNumber(supply0));
    return;
  }

  const snapPrice = snap && typeof snap.priceUsd === "number" && Number.isFinite(snap.priceUsd) ? snap.priceUsd : null;
  if (!state.chart.live && snapPrice && points.length) {
    const lastRaw = points[points.length - 1];
    const ratio = lastRaw > 0 ? snapPrice / lastRaw : 1;
    if (Number.isFinite(ratio) && ratio > 0) points = points.map((p) => p * ratio);
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const lastForSpan = points[points.length - 1];
  const spanRaw = max - min;
  const padSpan = Math.max(spanRaw * 0.15, Math.abs(lastForSpan) * 0.002, 1e-12);
  const minDraw = min - padSpan;
  const maxDraw = max + padSpan;
  const span = Math.max(1e-12, maxDraw - minDraw);

  const toXY = (i, v) => {
    const x = pad.l + (i / (points.length - 1)) * w;
    const y = pad.t + (1 - (v - minDraw) / span) * h;
    return { x, y };
  };

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(180,92,255,0.06)";
  for (let i = 0; i <= 6; i++) {
    const x = pad.l + (w * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + h);
    ctx.stroke();
  }
  ctx.restore();

  const vMax = volumes.length ? Math.max(1e-9, Math.max(...volumes)) : 1;
  const barCount = volumes.length;
  const barW = barCount ? w / barCount : 0;
  for (let i = 0; i < barCount; i++) {
    const v = volumes[i];
    const bh = (v / vMax) * h * 0.42;
    const x = pad.l + i * barW;
    const y = pad.t + h - bh;
    const grad = ctx.createLinearGradient(0, y, 0, pad.t + h);
    grad.addColorStop(0, "rgba(180,92,255,0.55)");
    grad.addColorStop(1, "rgba(122,43,255,0.03)");
    ctx.fillStyle = grad;
    const bw = barW * 0.56;
    const bx = x + barW * 0.22;
    const r = Math.min(3.5, bw * 0.35, bh * 0.25);
    ctx.beginPath();
    ctx.moveTo(bx, y + bh);
    ctx.lineTo(bx, y + r);
    ctx.quadraticCurveTo(bx, y, bx + r, y);
    ctx.lineTo(bx + bw - r, y);
    ctx.quadraticCurveTo(bx + bw, y, bx + bw, y + r);
    ctx.lineTo(bx + bw, y + bh);
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = "rgba(180,92,255,0.22)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }

  const lineGrad = ctx.createLinearGradient(pad.l, pad.t, pad.l + w, pad.t);
  lineGrad.addColorStop(0, "rgba(122,43,255,1)");
  lineGrad.addColorStop(1, "rgba(180,92,255,1)");

  ctx.save();
  const areaGrad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
  areaGrad.addColorStop(0, "rgba(180,92,255,0.20)");
  areaGrad.addColorStop(0.65, "rgba(122,43,255,0.06)");
  areaGrad.addColorStop(1, "rgba(122,43,255,0.01)");
  ctx.fillStyle = areaGrad;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = toXY(i, points[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(180,92,255,0.45)";
  ctx.shadowBlur = 26;
  ctx.lineWidth = 5.2;
  ctx.strokeStyle = "rgba(180,92,255,0.18)";
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = toXY(i, points[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(180,92,255,0.55)";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = lineGrad;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = toXY(i, points[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  const markerStep = Math.max(6, Math.floor(points.length / 34));
  ctx.save();
  ctx.fillStyle = "rgba(180,92,255,0.75)";
  ctx.shadowColor = "rgba(180,92,255,0.5)";
  ctx.shadowBlur = 10;
  for (let i = markerStep; i < points.length - 1; i += markerStep) {
    const p = toXY(i, points[i]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const lastPt = toXY(points.length - 1, points[points.length - 1]);
  ctx.save();
  ctx.shadowColor = "rgba(180,92,255,0.8)";
  ctx.shadowBlur = 22;
  ctx.strokeStyle = "rgba(180,92,255,0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(lastPt.x, lastPt.y, 6.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(244,240,255,0.96)";
  ctx.beginPath();
  ctx.arc(lastPt.x, lastPt.y, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const last = points[points.length - 1];
  const first = points[0];
  const delta = first > 0 ? ((last - first) / first) * 100 : 0;
  const snapDelta = snap ? pickChangeForRange(snap, state.chart.range) : null;
  const deltaPct = typeof snapDelta === "number" && Number.isFinite(snapDelta) ? snapDelta : delta;

  const priceText = marketLive ? formatPriceUsd(snapPrice) : "--";
  setText("midPriceValue", priceText);
  setText("miniPrice", priceText);

  const miniPriceDelta = $("#miniPriceDelta");
  if (miniPriceDelta) {
    if (!marketLive) {
      miniPriceDelta.textContent = "--";
      miniPriceDelta.classList.remove("up");
      miniPriceDelta.classList.remove("down");
    } else {
      const d24 = snap && typeof snap.change24h === "number" && Number.isFinite(snap.change24h) ? snap.change24h : deltaPct;
      const up24 = d24 >= 0;
      miniPriceDelta.textContent = t("chart.deltaFormat", { sign: up24 ? "+" : "", pct: Number(d24).toFixed(2), range: "24H" });
      miniPriceDelta.classList.toggle("up", up24);
      miniPriceDelta.classList.toggle("down", !up24);
    }
  }

  const vol = marketLive && snap && typeof snap.volume24hUsd === "number" && Number.isFinite(snap.volume24hUsd) ? snap.volume24hUsd : null;
  const liq = marketLive && snap && typeof snap.liquidityUsd === "number" && Number.isFinite(snap.liquidityUsd) ? snap.liquidityUsd : null;
  const mcap =
    marketLive && snap && typeof snap.marketCap === "number" && Number.isFinite(snap.marketCap) && snap.marketCap > 0 ? snap.marketCap : null;

  setText("midVolValue", vol === null ? "--" : formatUSD(vol));
  setText("midLiqValue", liq === null ? "--" : formatUSD(liq));
  setText("miniMcap", mcap === null ? "--" : formatUSD(mcap));
  setText("miniVol", vol === null ? "--" : formatUSD(vol));

  const holders = marketLive && snap && typeof snap.holders === "number" && Number.isFinite(snap.holders) && snap.holders > 0 ? snap.holders : null;
  setText("miniHolders", holders === null ? "--" : formatNumber(holders));
  const supply = marketLive && snap && typeof snap.totalSupply === "number" && Number.isFinite(snap.totalSupply) && snap.totalSupply > 0 ? snap.totalSupply : null;
  setText("miniSupply", supply === null ? "--" : formatNumber(supply));
}

function drawOverview() {
  const canvas = $("#overviewChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  const cssW = canvas.clientWidth;
  const parentH = canvas.parentElement ? canvas.parentElement.clientHeight : 0;
  const cssH = parentH > 0 ? parentH : 84;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const pad = { l: 8, r: 8, t: 8, b: 8 };
  const w = cssW - pad.l - pad.r;
  const h = cssH - pad.t - pad.b;

  const snap = state.token.snapshot;
  const marketLive = isMarketLiveSnapshot(snap);
  let points = state.overview.points;
  if (!marketLive) {
    setText("priceValue", "--");
    const priceDelta = $("#priceDelta");
    if (priceDelta) {
      priceDelta.textContent = "--";
      priceDelta.classList.remove("up");
      priceDelta.classList.remove("down");
    }
    return;
  }
  if (!points.length) {
    const snapPrice0 = snap && typeof snap.priceUsd === "number" && Number.isFinite(snap.priceUsd) ? snap.priceUsd : null;
    setText("priceValue", snapPrice0 ? formatPriceUsd(snapPrice0) : "--");
    const priceDelta = $("#priceDelta");
    if (priceDelta) {
      const d0 = snap && typeof snap.change24h === "number" && Number.isFinite(snap.change24h) ? snap.change24h : null;
      if (typeof d0 === "number") {
        const up0 = d0 >= 0;
        priceDelta.textContent = t("chart.deltaFormat", { sign: up0 ? "+" : "", pct: Number(d0).toFixed(2), range: "24H" });
        priceDelta.classList.toggle("up", up0);
        priceDelta.classList.toggle("down", !up0);
      } else {
        priceDelta.textContent = "--";
        priceDelta.classList.remove("up");
        priceDelta.classList.remove("down");
      }
    }
    return;
  }

  const snapPrice = snap && typeof snap.priceUsd === "number" && Number.isFinite(snap.priceUsd) ? snap.priceUsd : null;
  if (!state.overview.live && snapPrice && points.length) {
    const lastRaw = points[points.length - 1];
    const ratio = lastRaw > 0 ? snapPrice / lastRaw : 1;
    if (Number.isFinite(ratio) && ratio > 0) points = points.map((p) => p * ratio);
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const lastForSpan = points[points.length - 1];
  const spanRaw = max - min;
  const padSpan = Math.max(spanRaw * 0.15, Math.abs(lastForSpan) * 0.002, 1e-12);
  const minDraw = min - padSpan;
  const maxDraw = max + padSpan;
  const span = Math.max(1e-12, maxDraw - minDraw);

  const toXY = (i, v) => {
    const x = pad.l + (i / (points.length - 1)) * w;
    const y = pad.t + (1 - (v - minDraw) / span) * h;
    return { x, y };
  };

  const lineGrad = ctx.createLinearGradient(pad.l, pad.t, pad.l + w, pad.t);
  lineGrad.addColorStop(0, "rgba(122,43,255,1)");
  lineGrad.addColorStop(1, "rgba(180,92,255,1)");

  ctx.save();
  const areaGrad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
  areaGrad.addColorStop(0, "rgba(180,92,255,0.16)");
  areaGrad.addColorStop(0.65, "rgba(122,43,255,0.05)");
  areaGrad.addColorStop(1, "rgba(122,43,255,0.01)");
  ctx.fillStyle = areaGrad;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = toXY(i, points[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(180,92,255,0.55)";
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = lineGrad;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = toXY(i, points[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  const last = points[points.length - 1];
  const first = points[0];
  const delta = first > 0 ? ((last - first) / first) * 100 : 0;
  const d24 = snap && typeof snap.change24h === "number" && Number.isFinite(snap.change24h) ? snap.change24h : delta;
  const isUp = d24 >= 0;
  const priceText = snapPrice ? formatPriceUsd(snapPrice) : "--";
  setText("priceValue", priceText);

  const priceDelta = $("#priceDelta");
  if (priceDelta) {
    priceDelta.textContent = t("chart.deltaFormat", { sign: isUp ? "+" : "", pct: Number(d24).toFixed(2), range: "24H" });
    priceDelta.classList.toggle("up", isUp);
    priceDelta.classList.toggle("down", !isUp);
  }
}

function setRange(range) {
  state.chart.range = range;
  const series = buildSeriesFromHistory(range);
  if (series) {
    state.chart.points = series.points;
    state.chart.volumes = series.volumes;
    state.chart.live = true;
    state.chart.effectiveWinMs = series.effectiveWinMs;
    state.chart.coverageMs = series.coverageMs;
  } else {
    state.chart.points = [];
    state.chart.volumes = [];
    state.chart.live = false;
    state.chart.effectiveWinMs = null;
    state.chart.coverageMs = null;
  }
  renderChartHint();
  drawChart();
}

function setupRangeTabs() {
  const btns = $all(".rangeTabs__btn");
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      btns.forEach((x) => x.classList.toggle("is-active", x === b));
      setRange(b.dataset.range || "24H");
    });
  });
}

function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function teamLogoUrl(teamName) {
  const cleaned = String(teamName || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned || cleaned === "待定") return "";

  const overrides = {
    英格兰: "https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg",
    苏格兰: "https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg",
  };
  const direct = overrides[cleaned];
  if (direct) return direct;

  const codes = {
    乌兹别克斯坦: "uz",
    乌拉圭: "uy",
    伊拉克: "iq",
    伊朗: "ir",
    佛得角: "cv",
    克罗地亚: "hr",
    刚果民主共和国: "cd",
    加拿大: "ca",
    加纳: "gh",
    南非: "za",
    卡塔尔: "qa",
    厄瓜多尔: "ec",
    哥伦比亚: "co",
    土耳其: "tr",
    埃及: "eg",
    塞内加尔: "sn",
    墨西哥: "mx",
    奥地利: "at",
    巴拉圭: "py",
    巴拿马: "pa",
    库拉索: "cw",
    德国: "de",
    挪威: "no",
    捷克: "cz",
    摩洛哥: "ma",
    新西兰: "nz",
    日本: "jp",
    比利时: "be",
    沙特阿拉伯: "sa",
    法国: "fr",
    波黑: "ba",
    海地: "ht",
    澳大利亚: "au",
    瑞典: "se",
    瑞士: "ch",
    科特迪瓦: "ci",
    突尼斯: "tn",
    约旦: "jo",
    美国: "us",
    葡萄牙: "pt",
    西班牙: "es",
    阿尔及利亚: "dz",
    阿根廷: "ar",
    韩国: "kr",
  };
  const code = codes[cleaned];
  if (code) return `https://flagcdn.com/w40/${code}.png`;

  return `https://www.mengyinnews.cn/images/logo/${encodeURIComponent(cleaned)}.png`;
}

function flagGradient(teamName) {
  const hue = hashHue(String(teamName || ""));
  return `linear-gradient(180deg, hsla(${hue}, 85%, 55%, 1), hsla(${(hue + 28) % 360}, 85%, 40%, 1))`;
}

function stageFromDate(dateStr) {
  const d = Date.parse(`${dateStr}T00:00:00+08:00`);
  const inRange = (a, b) => d >= Date.parse(`${a}T00:00:00+08:00`) && d <= Date.parse(`${b}T23:59:59+08:00`);
  if (inRange("2026-06-12", "2026-06-27")) return "GROUP";
  if (inRange("2026-06-28", "2026-07-03")) return "R32";
  if (inRange("2026-07-04", "2026-07-07")) return "R16";
  if (inRange("2026-07-09", "2026-07-10")) return "QF";
  if (inRange("2026-07-14", "2026-07-15")) return "SF";
  if (inRange("2026-07-18", "2026-07-18")) return "THIRD";
  if (inRange("2026-07-20", "2026-07-20")) return "FINAL";
  return "GROUP";
}

function stageLabel(stage) {
  const key =
    stage === "GROUP"
      ? "stage.group"
      : stage === "R32"
        ? "stage.r32"
        : stage === "R16"
          ? "stage.r16"
          : stage === "QF"
            ? "stage.qf"
            : stage === "SF"
              ? "stage.sf"
              : stage === "THIRD"
                ? "stage.third"
                : stage === "FINAL"
                  ? "stage.final"
                  : "stage.all";
  return t(key);
}

function parseMengyinScheduleFromText(text) {
  const cleaned = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const dateRe = /2026-\d{2}-\d{2}/g;
  const dates = [];
  let m = null;
  while ((m = dateRe.exec(cleaned))) dates.push({ date: m[0], idx: m.index });
  if (!dates.length) return [];

  const blocks = dates.map((d, i) => {
    const end = i + 1 < dates.length ? dates[i + 1].idx : cleaned.length;
    return { date: d.date, text: cleaned.slice(d.idx, end) };
  });

  const matches = [];
  for (const b of blocks) {
    const stage = stageFromDate(b.date);
    const re = /(\d{2}:\d{2})\s+([^\n]+?)\s+\d+\s*VS\s*\d+\s+([^\n]+?)(?:\s+直播入口|\n|$)/g;
    let mm = null;
    while ((mm = re.exec(b.text))) {
      const time = mm[1].trim();
      const home = mm[2].trim();
      const away = mm[3].trim();
      const kickoffIso = `${b.date}T${time}:00+08:00`;
      const kickoffMs = Date.parse(kickoffIso);
      if (!Number.isFinite(kickoffMs)) continue;
      matches.push({
        id: `${b.date}_${time}_${home}_${away}`.replace(/\s+/g, "_"),
        date: b.date,
        time,
        stage,
        home,
        away,
        kickoffIso,
        kickoffMs,
      });
    }
  }

  const uniq = new Map();
  matches.forEach((x) => {
    if (!uniq.has(x.id)) uniq.set(x.id, x);
  });
  return Array.from(uniq.values()).sort((a, b) => a.kickoffMs - b.kickoffMs);
}

function parseMengyinResultsFromText(text) {
  const cleaned = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const dateRe = /2026-\d{2}-\d{2}/g;
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
      results.push({ id, date: b.date, time, home, away, homeScore, awayScore });
    }
  }

  const uniq = new Map();
  results.forEach((x) => {
    if (!uniq.has(x.id)) uniq.set(x.id, x);
  });
  return Array.from(uniq.values());
}

async function fetchTextWithCorsFallback(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch {
    // ignore
  }
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res2 = await fetch(proxy);
  if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
  return await res2.text();
}

function outcomeFromScore(homeScore, awayScore) {
  const h = Math.max(0, Math.floor(Number(homeScore || 0)));
  const a = Math.max(0, Math.floor(Number(awayScore || 0)));
  if (h > a) return "HOME";
  if (a > h) return "AWAY";
  return "DRAW";
}

async function syncResultsFromMengyin() {
  if (!state.schedule.loaded) return;
  const now = Date.now();
  if (state.schedule.lastResultSyncMs && now - state.schedule.lastResultSyncMs < 60 * 1000) return;
  state.schedule.lastResultSyncMs = now;

  const url = "https://www.mengyinnews.cn/#fixtures";
  let text = "";
  try {
    const html = await fetchTextWithCorsFallback(url);
    const doc = new DOMParser().parseFromString(html, "text/html");
    text = doc?.body?.innerText || html;
  } catch {
    return;
  }

  const list = parseMengyinResultsFromText(text);
  if (!list.length) return;
  const map = new Map(list.map((r) => [r.id, r]));

  const settleWindowMs = 2 * 60 * 60 * 1000;
  const drawGuardMs = 6 * 60 * 60 * 1000;
  let changed = false;

  for (const m of state.schedule.matches) {
    if (!m || !m.id) continue;
    if (getMatchResultPick(m.id)) continue;

    const end = Number(m.kickoffMs || 0) + settleWindowMs;
    if (!Number.isFinite(end) || now < end) continue;

    const r = map.get(String(m.id));
    if (!r) continue;

    const is00 = Number(r.homeScore) === 0 && Number(r.awayScore) === 0;
    if (is00 && now < Number(m.kickoffMs || 0) + drawGuardMs) continue;

    setMatchResultPick(m.id, outcomeFromScore(r.homeScore, r.awayScore));
    settleMatchIfPossible(m.id);
    changed = true;
  }

  if (changed) {
    renderPredictionMatches();
    renderMyBets();
    renderLeaderboard();
    renderAllMatches();
  }
}


async function loadSchedule() {
  if (state.schedule.loaded) return;
  try {
    const res = await fetch("./schedule.json", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json?.matches) ? json.matches : [];
      state.schedule.matches = list
        .map((m) => ({
          ...m,
          kickoffMs: Number(m.kickoffMs),
        }))
        .filter((m) => Number.isFinite(m.kickoffMs));
      state.schedule.loaded = true;
      if (!state.backend.enabled) syncResultsFromMengyin();
      backendSyncAll({ force: true });
      return;
    }
  } catch {
    // ignore
  }

  const url = "https://www.mengyinnews.cn/#fixtures";
  const html = await fetchTextWithCorsFallback(url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc?.body?.innerText || html;
  const matches = parseMengyinScheduleFromText(text);
  state.schedule.matches = matches;
  state.schedule.loaded = true;
  if (!state.backend.enabled) syncResultsFromMengyin();
  backendSyncAll({ force: true });
}

function formatWhen(match) {
  if (state.lang === "zh") return `${match.date} ${match.time}`;
  try {
    const dt = new Date(match.kickoffIso);
    const fmt = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai",
    });
    return fmt.format(dt).replace(",", "") + ` - ${match.time}`;
  } catch {
    return `${match.date} - ${match.time}`;
  }
}

function matchStatus(match, nowMs) {
  const start = match.kickoffMs;
  const end = start + 2 * 60 * 60 * 1000;
  if (nowMs < start) return "UPCOMING";
  if (nowMs >= start && nowMs < end) return "LIVE";
  return "FINISHED";
}

function isBetOpen(match, nowMs) {
  const now = Number(nowMs || 0);
  const start = Number(match?.kickoffMs || 0);
  if (!Number.isFinite(now) || !Number.isFinite(start)) return false;
  if (now >= start) return false;
  return now < start - BET_CLOSE_BEFORE_MS;
}

function renderMatchCard(match) {
  const homeLogo = teamLogoUrl(match.home);
  const awayLogo = teamLogoUrl(match.away);
  const homeGrad = flagGradient(match.home);
  const awayGrad = flagGradient(match.away);
  return `
    <article class="card matchCard" data-kickoff="${match.kickoffIso}">
      <div class="matchCard__meta">
        <div class="matchCard__tag">${stageLabel(match.stage)}</div>
        <div class="matchCard__when">${formatWhen(match)}</div>
      </div>
      <div class="matchCard__teams">
        <div class="team">
          <span class="flag" style="background-image:${homeGrad}" aria-hidden="true">
            <img class="flag__img" src="${homeLogo}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"/>
          </span>
          <div class="team__code">${match.home}</div>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <span class="flag" style="background-image:${awayGrad}" aria-hidden="true">
            <img class="flag__img" src="${awayLogo}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"/>
          </span>
          <div class="team__code">${match.away}</div>
        </div>
      </div>
      <div class="matchCard__countdown">
        <div class="countBox"><div class="countBox__num" data-part="d">00</div><div class="countBox__lbl" data-i18n="time.days">${t("time.days")}</div></div>
        <div class="countBox"><div class="countBox__num" data-part="h">00</div><div class="countBox__lbl" data-i18n="time.hours">${t("time.hours")}</div></div>
        <div class="countBox"><div class="countBox__num" data-part="m">00</div><div class="countBox__lbl" data-i18n="time.mins">${t("time.mins")}</div></div>
        <div class="countBox"><div class="countBox__num" data-part="s">00</div><div class="countBox__lbl" data-i18n="time.secs">${t("time.secs")}</div></div>
      </div>
      <button class="btn btn--soft matchCard__cta" type="button" data-open="prediction" data-match-id="${match.id}">${t("matches.predictNow")}</button>
    </article>
  `;
}

function renderUpcomingMatches() {
  const host = $("#upcomingMatches");
  if (!host) return;
  if (!state.schedule.loaded) {
    host.innerHTML = `<div class="matchEmpty">${t("matches.loading")}</div>`;
    return;
  }

  const now = Date.now();
  const durationMs = 2 * 60 * 60 * 1000;
  const notFinished = state.schedule.matches.filter((m) => now < m.kickoffMs + durationMs);
  const upcomingList = notFinished.filter((m) => m.kickoffMs > now);
  const liveList = notFinished.filter((m) => m.kickoffMs <= now);
  const upcoming = upcomingList.concat(liveList).slice(0, 3);
  const key = upcoming.map((m) => m.id).join("|");
  if (key === state.schedule.lastUpcomingKey) return;
  state.schedule.lastUpcomingKey = key;

  if (!upcoming.length) {
    host.innerHTML = `<div class="matchEmpty">${t("status.finished")}</div>`;
    return;
  }
  host.innerHTML = upcoming.map(renderMatchCard).join("");
  applyTranslations();
}

function poolKey(matchId) {
  return `wct_pool_${String(matchId || "")}`;
}

function getPool(matchId) {
  const raw = localStorage.getItem(poolKey(matchId));
  const parsed = safeJson(raw);
  const totals = parsed?.totals || {};
  const participants = parsed?.participants || {};
  const countsRaw = parsed?.counts || null;
  const participantsCountRaw = parsed?.participantsCount;
  const settled = Boolean(parsed?.settled);
  const result = parsed?.result || null;
  const counts =
    countsRaw && typeof countsRaw === "object"
      ? {
          HOME: Math.max(0, Math.floor(Number(countsRaw.HOME || 0))),
          DRAW: Math.max(0, Math.floor(Number(countsRaw.DRAW || 0))),
          AWAY: Math.max(0, Math.floor(Number(countsRaw.AWAY || 0))),
        }
      : null;
  const participantsCountFromRaw = participantsCountRaw === null || participantsCountRaw === undefined ? NaN : Number(participantsCountRaw);
  return {
    totals: {
      HOME: Math.max(0, Math.floor(Number(totals.HOME || 0))),
      DRAW: Math.max(0, Math.floor(Number(totals.DRAW || 0))),
      AWAY: Math.max(0, Math.floor(Number(totals.AWAY || 0))),
    },
    participants: typeof participants === "object" && participants ? participants : {},
    counts,
    participantsCount: Number.isFinite(participantsCountFromRaw)
      ? Math.max(0, Math.floor(participantsCountFromRaw))
      : counts
        ? counts.HOME + counts.DRAW + counts.AWAY
        : Object.keys(participants || {}).length,
    settled,
    result,
  };
}

function setPool(matchId, pool) {
  localStorage.setItem(poolKey(matchId), JSON.stringify(pool));
}

function formatPts(n) {
  return String(Math.max(0, Math.floor(Number(n || 0))));
}

function pct(n, d) {
  const nn = Number(n || 0);
  const dd = Number(d || 0);
  if (!Number.isFinite(nn) || !Number.isFinite(dd) || dd <= 0) return 0;
  return Math.max(0, Math.min(100, (nn / dd) * 100));
}

function rewardTextForPick(winPool, totalPool) {
  const w = Math.max(0, Math.floor(Number(winPool || 0)));
  const t = Math.max(0, Math.floor(Number(totalPool || 0)));
  if (t <= 0 || w <= 0) return "--";
  const lose = t - w;
  if (lose <= 0) return "x1.00 (+0%)";
  const mult = 1 + lose / w;
  const gainPct = (mult - 1) * 100;
  return `x${mult.toFixed(2)} (+${Math.round(gainPct)}%)`;
}

function renderPredictionCard(match) {
  const now = Date.now();
  const disabled = !isBetOpen(match, now);
  const pool = getPool(match.id);
  const participantsCount =
    typeof pool.participantsCount === "number" && Number.isFinite(pool.participantsCount)
      ? Math.max(0, Math.floor(pool.participantsCount))
      : Object.keys(pool.participants || {}).length;
  const counts =
    pool.counts && typeof pool.counts === "object"
      ? {
          HOME: Math.max(0, Math.floor(Number(pool.counts.HOME || 0))),
          DRAW: Math.max(0, Math.floor(Number(pool.counts.DRAW || 0))),
          AWAY: Math.max(0, Math.floor(Number(pool.counts.AWAY || 0))),
        }
      : (() => {
          const c = { HOME: 0, DRAW: 0, AWAY: 0 };
          Object.values(pool.participants || {}).forEach((v) => {
            const p = v?.pick;
            if (p === "HOME" || p === "DRAW" || p === "AWAY") c[p] += 1;
          });
          return c;
        })();
  const totalVotes = counts.HOME + counts.DRAW + counts.AWAY;
  const leader =
    counts.HOME === counts.DRAW && counts.DRAW === counts.AWAY
      ? null
      : counts.HOME >= counts.DRAW && counts.HOME >= counts.AWAY
        ? "HOME"
        : counts.AWAY >= counts.HOME && counts.AWAY >= counts.DRAW
          ? "AWAY"
          : "DRAW";

  const homeLogo = teamLogoUrl(match.home);
  const awayLogo = teamLogoUrl(match.away);
  const homeGrad = flagGradient(match.home);
  const awayGrad = flagGradient(match.away);

  return `
    <div class="predPick" data-kickoff="${match.kickoffIso}" data-match-id="${match.id}">
      <div class="predPick__head">
        <div class="predPick__title">${match.home} <span class="predPick__vs">VS</span> ${match.away}</div>
        <div class="predPick__meta">
          <span class="predPick__when">${formatWhen(match)} · ${stageLabel(match.stage)}</span>
          <span class="predPick__countdown" data-countdown></span>
        </div>
      </div>
      <div class="predPick__teams">
        <span class="predTeam">
          <span class="flag flag--sm" style="background-image:${homeGrad}" aria-hidden="true">
            <img class="flag__img" src="${homeLogo}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"/>
          </span>
          <span class="predTeam__name">${match.home}</span>
        </span>
        <span class="predTeam">
          <span class="flag flag--sm" style="background-image:${awayGrad}" aria-hidden="true">
            <img class="flag__img" src="${awayLogo}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"/>
          </span>
          <span class="predTeam__name">${match.away}</span>
        </span>
      </div>
      <div class="seg ${disabled ? "is-disabled" : ""}" role="radiogroup" aria-label="Prediction">
        <button class="seg__btn is-active" type="button" data-pick="HOME" ${disabled ? "disabled" : ""}>${match.home}</button>
        <button class="seg__btn" type="button" data-pick="DRAW" ${disabled ? "disabled" : ""}>${t("prediction.draw")}</button>
        <button class="seg__btn" type="button" data-pick="AWAY" ${disabled ? "disabled" : ""}>${match.away}</button>
      </div>
      <div class="predPoolRow">
        <span class="predPoolRow__item"><span class="predPoolRow__k" data-i18n="prediction.participants">${t("prediction.participants")}</span> <span class="predPoolRow__v">${formatPts(participantsCount)}</span></span>
      </div>
      <div class="predSplit">
        <div class="predSplit__head">
          <span class="predSplit__title" data-i18n="prediction.splitTitle">${t("prediction.splitTitle")}</span>
          <span class="predSplit__cols">
            <span class="predSplit__col" data-i18n="prediction.bettors">${t("prediction.bettors")}</span>
            <span class="predSplit__col" data-i18n="prediction.supportRate">${t("prediction.supportRate")}</span>
          </span>
        </div>
        <div class="predSplitRow ${leader === "HOME" ? "is-lead" : ""}">
          <div class="predSplitRow__name">${match.home}${leader === "HOME" ? ` <span class="predSplitTag">${t("prediction.mostBettors")}</span>` : ""}</div>
          <div class="predSplitRow__bar"><span class="predSplitRow__fill" style="width:${pct(counts.HOME, totalVotes).toFixed(2)}%"></span></div>
          <div class="predSplitRow__meta"><span class="predSplitRow__num">${formatPts(counts.HOME)}</span><span class="predSplitRow__ratio">${pct(counts.HOME, totalVotes).toFixed(0)}%</span></div>
        </div>
        <div class="predSplitRow ${leader === "DRAW" ? "is-lead" : ""}">
          <div class="predSplitRow__name">${t("prediction.draw")}${leader === "DRAW" ? ` <span class="predSplitTag">${t("prediction.mostBettors")}</span>` : ""}</div>
          <div class="predSplitRow__bar"><span class="predSplitRow__fill" style="width:${pct(counts.DRAW, totalVotes).toFixed(2)}%"></span></div>
          <div class="predSplitRow__meta"><span class="predSplitRow__num">${formatPts(counts.DRAW)}</span><span class="predSplitRow__ratio">${pct(counts.DRAW, totalVotes).toFixed(0)}%</span></div>
        </div>
        <div class="predSplitRow ${leader === "AWAY" ? "is-lead" : ""}">
          <div class="predSplitRow__name">${match.away}${leader === "AWAY" ? ` <span class="predSplitTag">${t("prediction.mostBettors")}</span>` : ""}</div>
          <div class="predSplitRow__bar"><span class="predSplitRow__fill" style="width:${pct(counts.AWAY, totalVotes).toFixed(2)}%"></span></div>
          <div class="predSplitRow__meta"><span class="predSplitRow__num">${formatPts(counts.AWAY)}</span><span class="predSplitRow__ratio">${pct(counts.AWAY, totalVotes).toFixed(0)}%</span></div>
        </div>
      </div>
      <button class="btn btn--soft predPick__submit" type="button" data-bet-submit="${match.id}" ${disabled ? "disabled" : ""} data-i18n="prediction.submit">${t("prediction.submit")}</button>
    </div>
  `;
}

function renderPredictionMatches({ forceMatchId } = {}) {
  const host = $("#predictionList");
  if (!host) return;
  if (!state.schedule.loaded) {
    host.innerHTML = "";
    return;
  }
  const now = Date.now();
  const durationMs = 2 * 60 * 60 * 1000;
  const notFinished = state.schedule.matches.filter((m) => now < m.kickoffMs + durationMs);
  const upcoming = notFinished.filter((m) => m.kickoffMs > now).slice(0, 3);
  if (forceMatchId) {
    const forced = notFinished.find((m) => m.id === forceMatchId) || state.schedule.matches.find((m) => m.id === forceMatchId);
    if (forced && !upcoming.some((m) => m.id === forced.id)) {
      if (upcoming.length >= 3) upcoming[upcoming.length - 1] = forced;
      else upcoming.push(forced);
      upcoming.sort((a, b) => a.kickoffMs - b.kickoffMs);
    }
  }
  const key = upcoming.map((m) => m.id).join("|");
  if (key === state.schedule.lastPredictionKey && host.childElementCount) return;
  state.schedule.lastPredictionKey = key;
  host.innerHTML = upcoming.length ? upcoming.map(renderPredictionCard).join("") : "";
  applyTranslations();
}

function pickLabelForMatch(match, pick) {
  if (pick === "HOME") return match.home;
  if (pick === "AWAY") return match.away;
  if (pick === "DRAW") return t("prediction.draw");
  return String(pick || "");
}

function resultTag(match, result, pick) {
  if (!result) {
    const st = match ? matchStatus(match, Date.now()) : "UPCOMING";
    const key = st === "FINISHED" ? "status.finished" : st === "LIVE" ? "status.live" : "status.upcoming";
    return { cls: "myBetTag", text: t(key) };
  }
  const ok = pick === result;
  return ok ? { cls: "myBetTag myBetTag--win", text: t("bets.win") } : { cls: "myBetTag myBetTag--lose", text: t("bets.lose") };
}

function renderMyBets() {
  const host = $("#myBetsList");
  if (!host) return;
  if (!state.wallet.address) {
    host.innerHTML = "";
    return;
  }
  const bets = getUserBets(state.wallet.address);
  const ids = Object.keys(bets || {});
  if (!ids.length) {
    host.innerHTML = `<div class="matchEmpty">${t("bets.empty")}</div>`;
    return;
  }

  const rows = ids
    .map((id) => {
      const b = bets[id] || {};
      const match = state.schedule.matches.find((m) => m.id === id) || b.match || null;
      if (!match || !match.home || !match.away) return null;
      const pick = b.pick;
      const result = b.result || null;
      const tag = resultTag(match, result, pick);
      const goBtn =
        matchStatus(match, Date.now()) === "UPCOMING"
          ? `<button class="btn btn--ghost btn--xs myBetRow__cta" type="button" data-open="prediction" data-match-id="${match.id}" data-i18n="bets.goMatch">${t("bets.goMatch")}</button>`
          : "";
      return { kickoffMs: match.kickoffMs, html: `
        <div class="myBetRow">
          <div class="myBetRow__main">
            <div class="myBetRow__title">${match.home} VS ${match.away}</div>
            <div class="myBetRow__sub">
              <span class="${tag.cls}">${tag.text}</span>
              <span class="myBetTag">${formatWhen(match)}</span>
              <span class="myBetTag">${stageLabel(match.stage)}</span>
              <span class="myBetTag">${pickLabelForMatch(match, pick)}</span>
            </div>
          </div>
          <div class="myBetRow__right">
            ${goBtn}
          </div>
        </div>
      ` };
    })
    .filter(Boolean)
    .sort((a, b) => b.kickoffMs - a.kickoffMs);

  host.innerHTML = rows.map((r) => r.html).join("");
  applyTranslations();
}

function renderAllMatches() {
  const host = $("#allMatches");
  if (!host) return;
  if (!state.schedule.loaded) {
    host.innerHTML = `<div class="matchEmpty">${t("matches.loading")}</div>`;
    return;
  }

  const stage = state.schedule.stageFilter;
  const list = stage === "ALL" ? state.schedule.matches : state.schedule.matches.filter((m) => m.stage === stage);

  const byDate = new Map();
  list.forEach((m) => {
    if (!byDate.has(m.date)) byDate.set(m.date, []);
    byDate.get(m.date).push(m);
  });

  const now = Date.now();
  const dates = Array.from(byDate.keys()).sort();
  host.innerHTML = dates
    .map((d) => {
      const items = byDate.get(d) || [];
      const rows = items
        .map((m) => {
          const st = matchStatus(m, now);
          const badge =
            st === "UPCOMING"
              ? `<span class="matchStatus matchStatus--up">${t("status.upcoming")}</span>`
              : st === "LIVE"
                ? `<span class="matchStatus matchStatus--live">${t("status.live")}</span>`
                : `<span class="matchStatus matchStatus--done">${t("status.finished")}</span>`;
          const pool = getPool(m.id);
          const participantsCount =
            typeof pool.participantsCount === "number" && Number.isFinite(pool.participantsCount)
              ? Math.max(0, Math.floor(pool.participantsCount))
              : Object.keys(pool.participants || {}).length;
          let homeBettors = 0;
          let awayBettors = 0;
          if (pool.counts && typeof pool.counts === "object") {
            homeBettors = Math.max(0, Math.floor(Number(pool.counts.HOME || 0)));
            awayBettors = Math.max(0, Math.floor(Number(pool.counts.AWAY || 0)));
          } else {
            Object.values(pool.participants || {}).forEach((v) => {
              const p = v?.pick;
              if (p === "HOME") homeBettors += 1;
              else if (p === "AWAY") awayBettors += 1;
            });
          }
          const leadCountry = homeBettors === awayBettors ? "--" : homeBettors > awayBettors ? m.home : m.away;
          return `
            <div class="allMatchRow" data-kickoff="${m.kickoffIso}" data-match-id="${m.id}">
              <div class="allMatchRow__time">${m.time}</div>
              <div class="allMatchRow__teams">
                <span class="allMatchRow__team">
                  <span class="flag flag--sm" style="background-image:${flagGradient(m.home)}" aria-hidden="true">
                    <img class="flag__img" src="${teamLogoUrl(m.home)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"/>
                  </span>
                  <span class="allMatchRow__teamName">${m.home}</span>
                </span>
                <span class="allMatchRow__vs">VS</span>
                <span class="allMatchRow__team">
                  <span class="flag flag--sm" style="background-image:${flagGradient(m.away)}" aria-hidden="true">
                    <img class="flag__img" src="${teamLogoUrl(m.away)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"/>
                  </span>
                  <span class="allMatchRow__teamName">${m.away}</span>
                </span>
              </div>
              <div class="allMatchRow__sub">
                <div class="allMatchRow__meta">
                  <span class="allMatchRow__stage">${stageLabel(m.stage)}</span>
                  ${badge}
                </div>
                <div class="allMatchRow__stats" aria-label="Bettors">
                  <span class="allMatchRow__stat">
                    <span class="allMatchRow__statKey" data-i18n="matches.bettors">${t("matches.bettors")}</span>
                    <span class="allMatchRow__statVal">${formatPts(participantsCount)}</span>
                  </span>
                  <span class="allMatchRow__statSep">·</span>
                  <span class="allMatchRow__stat">
                    <span class="allMatchRow__statKey" data-i18n="matches.lead">${t("matches.lead")}</span>
                    <span class="allMatchRow__statVal">${leadCountry}</span>
                  </span>
                </div>
              </div>
              <button class="allMatchRow__cta" type="button" data-match-predict="${encodeURIComponent(m.id)}" data-i18n="matches.predictNow">${t("matches.predictNow")}</button>
            </div>
          `;
        })
        .join("");
      return `<div class="matchDay"><div class="matchDay__head">${d}</div><div class="matchDay__body">${rows}</div></div>`;
    })
    .join("");
}

function openMatchesPredictModal(matchIdRaw) {
  const modal = $("#matchesPredictModal");
  const body = $("#matchesPredictBody");
  if (!modal || !body) return;
  const matchId = decodeURIComponent(String(matchIdRaw || ""));
  const m = state.schedule.matches.find((x) => x.id === matchId) || null;
  if (!m) return;
  body.innerHTML = renderPredictionCard(m);
  applyTranslations();
  updateCountdownsInDom();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeMatchesPredictModal() {
  const modal = $("#matchesPredictModal");
  const body = $("#matchesPredictBody");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (body) body.innerHTML = "";
}

function setupMatchesPredictModal() {
  const modal = $("#matchesPredictModal");
  const list = $("#allMatches");
  if (!modal || !list) return;

  modal.addEventListener("click", (e) => {
    const closeBtn = e.target.closest('[data-close="matchPredict"]');
    if (closeBtn) closeMatchesPredictModal();
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-match-predict]");
    if (!btn || !list.contains(btn)) return;
    const id = btn.getAttribute("data-match-predict");
    if (!id) return;
    openMatchesPredictModal(id);
  });
}

function setupStageTabs() {
  const host = $("#matchesStageTabs");
  if (!host) return;
  const stages = [
    { code: "ALL", label: t("stage.all") },
    { code: "GROUP", label: t("stage.group") },
    { code: "R32", label: t("stage.r32") },
    { code: "R16", label: t("stage.r16") },
    { code: "QF", label: t("stage.qf") },
    { code: "SF", label: t("stage.sf") },
    { code: "THIRD", label: t("stage.third") },
    { code: "FINAL", label: t("stage.final") },
  ];
  host.innerHTML = `
    <div class="stageTabs">
      ${stages
        .map(
          (s) =>
            `<button type="button" class="stageTabs__btn ${state.schedule.stageFilter === s.code ? "is-active" : ""}" data-stage="${s.code}">${s.label}</button>`,
        )
        .join("")}
    </div>
  `;
  $all(".stageTabs__btn", host).forEach((btn) => {
    btn.addEventListener("click", () => {
      state.schedule.stageFilter = btn.getAttribute("data-stage") || "ALL";
      setupStageTabs();
      renderAllMatches();
      applyTranslations();
    });
  });
}

function updateCountdownsInDom() {
  const cards = $all(".matchCard");
  const now = Date.now();
  cards.forEach((card) => {
    const kickoffStr = card.getAttribute("data-kickoff");
    const kickoff = kickoffStr ? Date.parse(kickoffStr) : NaN;
    if (!Number.isFinite(kickoff)) return;
    const diff = Math.max(0, kickoff - now);
    const total = Math.floor(diff / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = { d, h, m, s };
    $all("[data-part]", card).forEach((el) => {
      const p = el.getAttribute("data-part");
      const v = parts[p] ?? 0;
      el.textContent = String(v).padStart(2, "0");
    });
    const btn = $(".matchCard__cta", card);
    if (btn) btn.disabled = diff <= BET_CLOSE_BEFORE_MS;
  });

  const preds = $all(".predPick");
  preds.forEach((card) => {
    const kickoffStr = card.getAttribute("data-kickoff");
    const kickoff = kickoffStr ? Date.parse(kickoffStr) : NaN;
    if (!Number.isFinite(kickoff)) return;
    const diff = Math.max(0, kickoff - now);
    const total = Math.floor(diff / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const txt = d > 0 ? `${String(d).padStart(2, "0")}D ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const el = $("[data-countdown]", card);
    if (el) el.textContent = txt;

    const closed = kickoff - now <= BET_CLOSE_BEFORE_MS;
    const seg = $(".seg", card);
    const input = $(".predBetRow__input", card);
    const submit = $("[data-bet-submit]", card);
    if (seg) seg.classList.toggle("is-disabled", closed);
    $all(".seg__btn", card).forEach((b) => (b.disabled = closed));
    if (input) input.disabled = closed;
    if (submit) submit.disabled = closed;
  });

  const rows = $all(".allMatchRow");
  rows.forEach((row) => {
    const kickoffStr = row.getAttribute("data-kickoff");
    const kickoff = kickoffStr ? Date.parse(kickoffStr) : NaN;
    if (!Number.isFinite(kickoff)) return;
    const btn = $(".allMatchRow__cta", row);
    if (!btn) return;
    btn.disabled = kickoff - now <= BET_CLOSE_BEFORE_MS;
  });
}

function startScheduleTicker() {
  updateCountdownsInDom();
  window.setInterval(() => {
    renderUpcomingMatches();
    renderPredictionMatches();
    if (state.schedule.loaded) {
      if (!state.backend.enabled) {
        syncResultsFromMengyin();
        const now = Date.now();
        const durationMs = 2 * 60 * 60 * 1000;
        state.schedule.matches.forEach((m) => {
          if (now >= m.kickoffMs + durationMs) settleMatchIfPossible(m.id);
        });
      } else {
        backendSyncAll();
      }
    }
    if (state.wallet.address && getSolProvider()) {
      const now = Date.now();
      if (!state.wallet.lastBalanceSyncMs || now - state.wallet.lastBalanceSyncMs >= 15000) {
        state.wallet.lastBalanceSyncMs = now;
        fetchWalletBalances();
      }
    }
    updateCountdownsInDom();
  }, 1000);
}

function setupNavActive() {
  const links = $all(".nav__link");
  const ids = links.map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("#"));
  const sections = ids
    .map((id) => document.getElementById(id.slice(1)))
    .filter(Boolean);

  if (!sections.length) return;
  const obs = new IntersectionObserver(
    (entries) => {
      const best = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!best) return;
      const id = `#${best.target.id}`;
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
    },
    { root: null, threshold: [0.35, 0.6, 0.9] },
  );
  sections.forEach((s) => obs.observe(s));
}

function setupSmoothScroll() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-open="prediction"]');
    if (btn) {
      const matchId = btn.getAttribute("data-match-id");
      scrollToPredictionMatch(matchId);
      return;
    }
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute("href");
    const el = href ? document.querySelector(href) : null;
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function scrollToPredictionMatch(matchId) {
  const el = $("#prediction");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  renderPredictionMatches(matchId ? { forceMatchId: matchId } : undefined);
  window.setTimeout(() => {
    if (!matchId) return;
    const card = document.querySelector(`.predPick[data-match-id="${CSS.escape(matchId)}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("is-focus");
    window.setTimeout(() => card.classList.remove("is-focus"), 1400);
  }, 60);
}

function openRewardsModal() {
  const modal = $("#rewardsModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeRewardsModal() {
  const modal = $("#rewardsModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function setupRewardsModal() {
  const openBtn = $("#viewRewardsBtn");
  if (openBtn) openBtn.addEventListener("click", openRewardsModal);
  document.addEventListener("click", (e) => {
    const close = e.target.closest("[data-close='rewards']");
    if (close) closeRewardsModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRewardsModal();
  });

  const claimBtn = $("#claimRewardsBtn");
  if (claimBtn) {
    claimBtn.addEventListener("click", () => {
      if (!state.wallet.address) {
        toast(t("toast.connectToClaim"));
        return;
      }
      if (state.rewards.available <= 0) {
        toast(t("toast.noRewards"));
        return;
      }
      state.rewards.claimed += state.rewards.available;
      state.rewards.available = 0;
      persistRewardsForAddress();
      renderRewards();
      toast(t("toast.rewardsClaimed"));
    });
  }
}

function rewardKey() {
  return state.wallet.address ? `wct_rewards_${normAddress(state.wallet.address)}` : null;
}

function hydrateRewardsFromAddress() {
  const k = rewardKey();
  if (!k) {
    state.rewards.available = 0;
    state.rewards.claimed = 0;
    renderRewards();
    return;
  }
  try {
    const raw = localStorage.getItem(k);
    if (!raw) {
      state.rewards.available = 0;
      state.rewards.claimed = 0;
      renderRewards();
      return;
    }
    const parsed = JSON.parse(raw);
    state.rewards.available = Number(parsed.available || 0);
    state.rewards.claimed = Number(parsed.claimed || 0);
  } catch {
    state.rewards.available = 0;
    state.rewards.claimed = 0;
  }
  renderRewards();
}

function persistRewardsForAddress() {
  const k = rewardKey();
  if (!k) return;
  localStorage.setItem(
    k,
    JSON.stringify({
      available: Number(state.rewards.available || 0),
      claimed: Number(state.rewards.claimed || 0),
    }),
  );
}

function renderRewards() {
  setText("rewardAvailable", state.rewards.available.toFixed(2));
  setText("rewardClaimed", state.rewards.claimed.toFixed(2));
  const hintEl = document.getElementById("rewardsPoolHint");
  const onchainWei = state.rewards.poolBnbOnchainWei;
  if (typeof onchainWei === "bigint") {
    setText("rewardsPoolValue", formatUnitsShort(onchainWei, 9, 4));
    if (hintEl) hintEl.textContent = onchainWei > 0n ? "" : t("rewards.poolEmpty");
    return;
  }
  const pool = Number(state.rewards.poolBnb24h || 0);
  setText("rewardsPoolValue", pool > 0 ? pool.toFixed(2) : "--");
  if (hintEl) hintEl.textContent = pool > 0 ? "" : t("rewards.poolLoading");
}

function resultKey(matchId) {
  return `wct_result_${String(matchId || "")}`;
}

function setMatchResultPick(matchId, pick) {
  localStorage.setItem(resultKey(matchId), String(pick || ""));
}

function getMatchResultPick(matchId) {
  const raw = localStorage.getItem(resultKey(matchId));
  return raw ? String(raw) : null;
}

function userBetsKey(addr) {
  const a = normAddress(addr);
  return a ? `wct_bets_${a}` : null;
}

function getUserBets(addr) {
  const k = userBetsKey(addr);
  const parsed = k ? safeJson(localStorage.getItem(k)) : null;
  return parsed && typeof parsed === "object" ? parsed : {};
}

function setUserBets(addr, bets) {
  const k = userBetsKey(addr);
  if (!k) return;
  localStorage.setItem(k, JSON.stringify(bets || {}));
}

function setUserBet(addr, matchId, data) {
  const bets = getUserBets(addr);
  bets[String(matchId)] = { ...(bets[String(matchId)] || {}), ...(data || {}) };
  setUserBets(addr, bets);
}

function settleMatchIfPossible(matchId) {
  const result = getMatchResultPick(matchId);
  if (!result) return;
  const pool = getPool(matchId);
  if (pool.settled) return;

  const parts = pool.participants || {};
  const entries = Object.entries(parts).map(([addr, v]) => ({
    addr: normAddress(addr),
    pick: v?.pick,
  }));
  if (!entries.length) {
    pool.settled = true;
    pool.result = result;
    setPool(matchId, pool);
    return;
  }

  entries.forEach((e) => {
    if (!e.addr) return;
    trackLeaderboardAddress(e.addr);
    setUserBet(e.addr, matchId, { result, correct: e.pick === result, settledAt: Date.now() });
  });
  pool.settled = true;
  pool.result = result;
  setPool(matchId, pool);
  renderMyBets();
  renderLeaderboard();
}

async function placePrediction(matchId, pick) {
  if (!state.wallet.address) {
    toast(t("toast.connectToSubmit"));
    return;
  }
  if (!getSolProvider()) {
    toast(t("toast.noWallet"));
    return;
  }
  if (!state.schedule.loaded) return;
  const match = state.schedule.matches.find((m) => m.id === matchId);
  if (!match) return;
  if (!isBetOpen(match, Date.now())) {
    toast(t("toast.betClosed"));
    return;
  }
  const addr = normAddress(state.wallet.address);
  if (state.backend.enabled) {
    const ok = await backendEnsureLogin({ interactive: true });
    if (!ok) return;
    try {
      await backendFetch("/v1/predictions", { method: "POST", body: { matchId, pick } });
      bumpTodayPredictionCount(addr);
      await backendSyncAll({ force: true });
      toast(t("toast.predSubmitted", { pick: pickLabelForMatch(match, pick) }));
      return;
    } catch (e) {
      const msg = String(e?.message || "");
      const status = Number(e?.status || 0);
      if (msg === "already_bet") {
        toast(t("toast.alreadyBet"));
        return;
      }
      if (msg === "bet_closed") {
        toast(t("toast.betClosed"));
        return;
      }
      if (msg === "daily_limit" || status === 429) {
        const wholeWct = getWctWholeBalance();
        const limit = getDailyPredictionLimit(wholeWct);
        toast(t("toast.dailyLimit", { limit, holdLimit: DAILY_PRED_LIMIT_HOLD }));
        return;
      }
      if (status >= 400 && status < 500) {
        toast(t("toast.backendBetFailed"));
        return;
      }
      toast(t("toast.backendUnavailable"));
      return;
    }
  }
  const pool = getPool(matchId);
  if (pool.participants && pool.participants[addr]) {
    toast(t("toast.alreadyBet"));
    return;
  }

  if (!state.wallet.wctDecimals || !state.wallet.lastBalanceSyncMs || Date.now() - state.wallet.lastBalanceSyncMs > 60000) {
    await fetchWalletBalances();
  }

  const wholeWct = getWctWholeBalance();
  const limit = getDailyPredictionLimit(wholeWct);
  const used = getTodayPredictionCount(addr);
  if (used >= limit) {
    toast(t("toast.dailyLimit", { limit, holdLimit: DAILY_PRED_LIMIT_HOLD }));
    return;
  }

  const ts = Date.now();
  pool.participants[addr] = { pick, ts };
  const c = pool.counts && typeof pool.counts === "object" ? pool.counts : { HOME: 0, DRAW: 0, AWAY: 0 };
  if (pick === "HOME" || pick === "DRAW" || pick === "AWAY") c[pick] = Math.max(0, Math.floor(Number(c[pick] || 0))) + 1;
  pool.counts = c;
  pool.participantsCount = Object.keys(pool.participants || {}).length;
  setPool(matchId, pool);

  trackLeaderboardAddress(addr);
  bumpTodayPredictionCount(addr);
  setUserBet(addr, matchId, {
    matchId,
    pick,
    ts,
    result: null,
    correct: null,
    match: {
      id: match.id,
      date: match.date,
      time: match.time,
      stage: match.stage,
      home: match.home,
      away: match.away,
      kickoffIso: match.kickoffIso,
      kickoffMs: match.kickoffMs,
    },
  });
  renderMyBets();
  renderLeaderboard();
  updateWalletUI();
  toast(t("toast.predSubmitted", { pick: pickLabelForMatch(match, pick) }));
}

function setupPredictionBetsForHost(host) {
  if (!host || host.dataset.predBound === "1") return;
  host.dataset.predBound = "1";

  host.addEventListener("click", (e) => {
    const segBtn = e.target.closest(".seg__btn");
    if (segBtn && host.contains(segBtn)) {
      const seg = segBtn.closest(".seg");
      if (!seg || seg.classList.contains("is-disabled")) return;
      $all(".seg__btn", seg).forEach((b) => b.classList.toggle("is-active", b === segBtn));
      return;
    }

    const submit = e.target.closest("[data-bet-submit]");
    if (!submit || !host.contains(submit)) return;
    const card = submit.closest(".predPick");
    const matchId = submit.getAttribute("data-bet-submit");
    const seg = card ? $(".seg", card) : null;
    const pick = seg?.querySelector(".seg__btn.is-active")?.getAttribute("data-pick") || "DRAW";
    placePrediction(matchId, pick);

    if (host.id === "predictionList") {
      renderPredictionMatches();
    } else if (host.id === "matchesPredictBody") {
      const m = state.schedule.matches.find((x) => x.id === String(matchId)) || null;
      if (m) {
        host.innerHTML = renderPredictionCard(m);
        applyTranslations();
      }
    }
  });
}

function setupPredictionBets() {
  setupPredictionBetsForHost($("#predictionList"));
  setupPredictionBetsForHost($("#matchesPredictBody"));
}

function safeJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setupResizeRedraw() {
  let t = null;
  window.addEventListener("resize", () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => {
      drawOverview();
      drawChart();
    }, 120);
  });
}

function setupFxReveal() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const selector = [
    ".card",
    ".matchCard",
    ".predPick",
    ".matchDay",
    ".allMatchRow",
    ".leaderRow",
    ".myBetRow",
    ".modal__panel",
  ].join(",");

  const seen = new WeakSet();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((ent) => {
        if (!ent.isIntersecting) return;
        const el = ent.target;
        el.classList.add("is-inview");
        io.unobserve(el);
      });
    },
    { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
  );

  function scan(root = document) {
    const list = Array.from(root.querySelectorAll(selector));
    list.forEach((el, i) => {
      if (seen.has(el)) return;
      seen.add(el);
      el.classList.add("fx-reveal");
      el.style.setProperty("--reveal-delay", `${Math.min((i % 7) * 60, 300)}ms`);
      io.observe(el);
    });
  }

  scan();

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        if (n.matches && n.matches(selector)) scan(n.parentNode || document);
        else scan(n);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

function setupCoin3d() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  const host = document.querySelector(".coin--img");
  const tilt = host ? host.querySelector(".coin__tilt") : null;
  if (!host || !tilt) return;

  let raf = 0;
  let next = null;

  const apply = () => {
    raf = 0;
    if (!next) return;
    const { rx, ry } = next;
    tilt.style.setProperty("--coin-rx", `${rx}deg`);
    tilt.style.setProperty("--coin-ry", `${ry}deg`);
  };

  const setFromEvent = (e) => {
    const r = host.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(1, r.width);
    const py = (e.clientY - r.top) / Math.max(1, r.height);
    const maxX = 10;
    const maxY = 14;
    const ry = (px - 0.5) * (maxY * 2);
    const rx = (0.5 - py) * (maxX * 2);
    next = { rx: Math.max(-maxX, Math.min(maxX, rx)), ry: Math.max(-maxY, Math.min(maxY, ry)) };
    if (raf) return;
    raf = window.requestAnimationFrame(apply);
  };

  const reset = () => {
    next = { rx: 0, ry: 0 };
    if (raf) return;
    raf = window.requestAnimationFrame(apply);
  };

  host.addEventListener("pointermove", setFromEvent);
  host.addEventListener("pointerleave", reset);
  host.addEventListener("pointerdown", setFromEvent);
  reset();
}

function boot() {
  window.__WCT_BOOTED = false;
  try {
    state.lang = getInitialLang();
    initBackendState();
    backendStartStream();
    applyTranslations();
    setupFxReveal();
    setupCoin3d();
    updateContractUI();
    setupCopyContract();
    setupRangeTabs();
    state.overview.points = [];
    state.overview.volumes = [];
    drawOverview();
    setRange("24H");
    setupResizeRedraw();
    setupSmoothScroll();
    setupNavActive();
    setupRewardsModal();
    setupPredictionBets();
    window.WCT = {
      setMatchResult(matchId, pick) {
        setMatchResultPick(matchId, pick);
        settleMatchIfPossible(matchId);
        renderPredictionMatches();
        renderLeaderboard();
      },
    };

    updateWalletUI();
    hydrateRewardsFromAddress();
    setupWalletListeners();
    tryRestoreWalletSession();

    const connectBtn = $("#connectWalletBtn");
    if (connectBtn) {
      connectBtn.addEventListener("click", () => {
        const isConnected = !!(state.wallet.address && state.wallet.connected && state.wallet.manualConnected);
        if (!isConnected) {
          connectWallet();
          return;
        }
        state.wallet.walletMenuOpen = !state.wallet.walletMenuOpen;
        updateWalletUI();
      });
    }
    const disconnectBtn = $("#disconnectWalletBtn");
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnectWallet);
    const copyWalletBtn = $("#copyWalletAddressBtn");
    if (copyWalletBtn) {
      copyWalletBtn.addEventListener("click", async () => {
        const addr = state.wallet.address ? String(state.wallet.address) : "";
        if (!addr) return;
        try {
          await copyText(addr);
          toast(state.lang === "zh" ? "钱包地址已复制" : "Wallet address copied");
        } catch {
          toast(t("toast.copyFailed"));
        }
      });
    }
    const myPredBtn = $("#myPredictionsBtn");
    if (myPredBtn) {
      myPredBtn.addEventListener("click", () => {
        state.wallet.walletMenuOpen = false;
        updateWalletUI();
        const el = $("#myPredictions");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.location.hash = "#myPredictions";
      });
    }

    document.addEventListener("pointerdown", (e) => {
      const isConnected = !!(state.wallet.address && state.wallet.connected && state.wallet.manualConnected);
      if (!isConnected || !state.wallet.walletMenuOpen) return;
      const tEl = e.target instanceof Element ? e.target : null;
      if (!tEl) return;
      if (tEl.closest("#connectWalletBtn") || tEl.closest("#walletMenu")) return;
      state.wallet.walletMenuOpen = false;
      updateWalletUI();
    });

    const langBtn = $("#langToggleBtn");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        setLang(state.lang === "en" ? "zh" : "en");
        setupStageTabs();
        renderUpcomingMatches();
        renderPredictionMatches();
        renderAllMatches();
      });
    }

    const page = document.body ? document.body.getAttribute("data-page") : null;
    const isMatchesPage = page === "matches";
    const isWhitepaperPage = page === "whitepaper";
    const initialMatchId = new URLSearchParams(window.location.search).get("match");

    if (!isWhitepaperPage && !isMatchesPage) {
      refreshTokenSnapshot();
      window.setInterval(() => refreshTokenSnapshot(), 15000);
      window.setInterval(() => fetchWalletBalances(), 15000);
    }

    if (!isWhitepaperPage) {
      loadSchedule()
        .then(() => {
          if (isMatchesPage) {
            setupStageTabs();
            renderAllMatches();
            setupMatchesPredictModal();
          } else {
            renderUpcomingMatches();
            renderPredictionMatches();
            renderMyBets();
            if (initialMatchId) scrollToPredictionMatch(initialMatchId);
          }
        })
        .catch(() => {
          toast(t("matches.loadFailed"));
          const host = isMatchesPage ? $("#allMatches") : $("#upcomingMatches");
          if (host) host.innerHTML = `<div class="matchEmpty">${t("matches.loadFailed")}</div>`;
        })
        .finally(() => {
          startScheduleTicker();
        });
    }

    window.__WCT_BOOTED = true;
  } catch {
    const connectBtn = $("#connectWalletBtn");
    if (connectBtn) connectBtn.addEventListener("click", connectWallet);
    try {
      window.alert("页面初始化失败，请刷新后重试");
    } catch {
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
