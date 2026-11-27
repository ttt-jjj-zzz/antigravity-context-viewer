const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');

const brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
const port = Number(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT || 0) || 38290;

const SCALE_CONFIG = {
  '1m': { limit: 1000000, label: '1M' },
  '500k': { limit: 500000, label: '500k' },
  '200k': { limit: 200000, label: '200k' }
};

function listAllConversations() {
  if (!fs.existsSync(brainDir)) return [];
  try {
    const entries = fs.readdirSync(brainDir, { withFileTypes: true });
    const list = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      if (id === 'tempmediaStorage' || id.startsWith('.')) continue;

      const fullLog = path.join(brainDir, id, '.system_generated', 'logs', 'transcript_full.jsonl');
      const normLog = path.join(brainDir, id, '.system_generated', 'logs', 'transcript.jsonl');
      const logPath = fs.existsSync(fullLog) ? fullLog : (fs.existsSync(normLog) ? normLog : null);
      if (!logPath) continue;

      let mtime = 0;
      try {
        const stat = fs.statSync(logPath);
        mtime = stat.mtimeMs;
      } catch (e) {
        continue;
      }

      list.push({ id, mtime, logPath });
    }
    list.sort((a, b) => b.mtime - a.mtime);
    return list;
  } catch (e) {
    return [];
  }
}

function getConversationData(targetId, overrideLimit) {
  const list = listAllConversations();
  if (list.length === 0) {
    return {
      id: null,
      usedTokens: 0,
      totalLimit: 1000000,
      limitLabel: '1M',
      activeScale: '1m',
      modelName: 'Gemini',
      modelFamily: 'gemini',
      pct: 0,
      remainingTokens: 1000000,
      compactionCount: 0
    };
  }

  let item = null;
  if (targetId && targetId !== 'auto') {
    item = list.find(x => x.id === targetId);
  }
  if (!item) {
    item = list[0];
  }

  let latestInput = 0;
  let latestCache = 0;
  let modelName = 'Gemini';
  let modelFamily = 'gemini';
  let defaultScale = '1m';
  let compactionCount = 0;

  try {
    const raw = fs.readFileSync(item.logPath, 'utf8');
    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const s = JSON.parse(trimmed);
        // Accurate detection of Antigravity system compaction
        if (s.type === 'CHECKPOINT' && s.source === 'SYSTEM') {
          compactionCount++;
        }
        // Only inspect explicit USER_INPUT settings changes for model detection
        if (s.type === 'USER_INPUT' && s.content && typeof s.content === 'string') {
          const idx = s.content.indexOf('<USER_SETTINGS_CHANGE>');
          if (idx !== -1) {
            const block = s.content.slice(idx);
            const m = block.match(/changed setting `Model Selection` from .*? to ([^.\r\n]+)/i);
            if (m && m[1]) {
              const target = m[1].trim();
              if (/claude/i.test(target)) {
                modelName = 'Claude';
                modelFamily = 'claude';
                defaultScale = '200k';
              } else {
                modelName = 'Gemini';
                modelFamily = 'gemini';
                defaultScale = '1m';
              }
            }
          }
        }
        if (s.input_tokens || s.cache_read_tokens) {
          latestInput = s.input_tokens || 0;
          latestCache = s.cache_read_tokens || 0;
        }
      } catch (e) {}
    }
  } catch (e) {}

  const normOverride = overrideLimit ? overrideLimit.toLowerCase() : '';
  const activeScale = SCALE_CONFIG[normOverride] ? normOverride : defaultScale;
  const { limit: totalLimit, label: limitLabel } = SCALE_CONFIG[activeScale];

  const usedTokens = latestInput + latestCache;
  const pct = Math.min(100, Math.round((usedTokens / totalLimit) * 1000) / 10);
  const remainingTokens = Math.max(0, totalLimit - usedTokens);

  return {
    id: item.id,
    usedTokens,
    totalLimit,
    limitLabel,
    activeScale,
    modelName,
    modelFamily,
    pct,
    remainingTokens,
    compactionCount,
    latestInput,
    latestCache
  };
}

function getHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>上下文监控</title>
<style>
  /* Google Material Design 3 / Gemini Palette */
  :root {
    --md-bg: #f0f4f9;
    --md-surface: #ffffff;
    --md-surface-container: #f0f4f9;
    --md-surface-container-high: #e1e6ed;
    --md-on-surface: #1f1f1f;
    --md-on-surface-variant: #444746;
    --md-outline-variant: #dde3ea;
    --md-primary: #0b57d0;
    --md-primary-container: #d3e3fd;
    --md-on-primary-container: #041e49;

    --md-blue: #1a73e8;
    --md-green: #146c2e;
    --md-green-bg: #e6f4ea;
    --md-amber: #b06000;
    --md-amber-bar: #f9ab00;
    --md-amber-bg: #fef7e0;
    --md-red: #b3261e;
    --md-red-bar: #d93025;
    --md-red-bg: #fce8e6;
    --md-info-bg: #edf2fa;

    --md-shadow: 0 1px 2px rgba(60, 64, 67, 0.08), 0 4px 14px rgba(60, 64, 67, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --md-bg: #131314;
      --md-surface: #1e1f20;
      --md-surface-container: #282a2c;
      --md-surface-container-high: #333537;
      --md-on-surface: #e3e3e3;
      --md-on-surface-variant: #c4c7c5;
      --md-outline-variant: rgba(255, 255, 255, 0.08);
      --md-primary: #a8c7fa;
      --md-primary-container: #004a77;
      --md-on-primary-container: #c2e7ff;

      --md-blue: #8ab4f8;
      --md-green: #6dd58c;
      --md-green-bg: rgba(109, 213, 140, 0.12);
      --md-amber: #fdd663;
      --md-amber-bar: #fdd663;
      --md-amber-bg: rgba(253, 214, 99, 0.12);
      --md-red: #f2b8b5;
      --md-red-bar: #f28b82;
      --md-red-bg: rgba(242, 184, 181, 0.14);
      --md-info-bg: rgba(168, 199, 250, 0.12);

      --md-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    }
  }

  :root[data-theme="dark"] {
    --md-bg: #131314;
    --md-surface: #1e1f20;
    --md-surface-container: #282a2c;
    --md-surface-container-high: #333537;
    --md-on-surface: #e3e3e3;
    --md-on-surface-variant: #c4c7c5;
    --md-outline-variant: rgba(255, 255, 255, 0.08);
    --md-primary: #a8c7fa;
    --md-primary-container: #004a77;
    --md-on-primary-container: #c2e7ff;

    --md-blue: #8ab4f8;
    --md-green: #6dd58c;
    --md-green-bg: rgba(109, 213, 140, 0.12);
    --md-amber: #fdd663;
    --md-amber-bar: #fdd663;
    --md-amber-bg: rgba(253, 214, 99, 0.12);
    --md-red: #f2b8b5;
    --md-red-bar: #f28b82;
    --md-red-bg: rgba(242, 184, 181, 0.14);
    --md-info-bg: rgba(168, 199, 250, 0.12);

    --md-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--md-bg);
    color: var(--md-on-surface);
    font-family: "Google Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
    padding: 16px;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .card {
    background: var(--md-surface);
    border: 1px solid var(--md-outline-variant);
    border-radius: 24px;
    padding: 20px;
    box-shadow: var(--md-shadow);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* Header: Model Identity + M3 Segmented Pill Switch */
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .model-identity {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px 5px 9px;
    background: var(--md-surface-container);
    border-radius: 9999px;
  }

  .model-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .model-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--md-on-surface);
    letter-spacing: -0.01em;
  }

  /* Material 3 Segmented Control */
  .segmented-group {
    display: inline-flex;
    align-items: center;
    background: var(--md-surface-container);
    padding: 3px;
    border-radius: 9999px;
    gap: 2px;
  }

  .seg-btn {
    border: none;
    background: transparent;
    color: var(--md-on-surface-variant);
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    padding: 5px 11px;
    border-radius: 9999px;
    cursor: pointer;
    transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s;
  }

  .seg-btn:hover:not(.active) {
    background: var(--md-surface-container-high);
  }

  .seg-btn.active {
    background: var(--md-primary-container);
    color: var(--md-on-primary-container);
    font-weight: 600;
  }

  /* Hero Stat Row */
  .hero-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .hero-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .hero-numbers {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .used-val {
    font-size: 36px;
    font-weight: 500;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: var(--md-on-surface);
    line-height: 1.05;
  }

  .limit-val {
    font-size: 15px;
    font-weight: 400;
    color: var(--md-on-surface-variant);
  }

  .pct-val {
    font-size: 22px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--md-blue);
    transition: color 0.3s;
  }

  /* Material 3 Progress Track + 500k Reference Tick */
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .bar-track {
    position: relative;
    height: 10px;
    background: var(--md-surface-container-high);
    border-radius: 9999px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    width: 0%;
    border-radius: 9999px;
    background: linear-gradient(90deg, #4285f4 0%, #1a73e8 100%);
    transition: width 0.45s cubic-bezier(0.2, 0, 0, 1), background 0.3s;
  }

  .bar-tick {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
    background: var(--md-surface);
    opacity: 0.75;
    pointer-events: none;
  }

  .bar-scale-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--md-on-surface-variant);
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
  }

  /* 3-Column Tonal Stat Tiles */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .metric-tile {
    background: var(--md-surface-container);
    border-radius: 16px;
    padding: 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background-color 0.25s;
  }

  .metric-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--md-on-surface-variant);
    white-space: nowrap;
  }

  .metric-value {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--md-on-surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Tonal Status Banner */
  .status-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 16px;
    background: var(--md-info-bg);
    color: var(--md-primary);
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.4;
    transition: background-color 0.3s, color 0.3s;
  }

  .status-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
</head>
<body>

<div class="card">
  <!-- Header -->
  <div class="header-row">
    <div class="model-identity">
      <div class="model-icon" id="modelIcon"></div>
      <span class="model-name" id="modelLabel">Gemini</span>
    </div>
    <div class="segmented-group" role="tablist" aria-label="上下文刻度">
      <button class="seg-btn active" id="btn1M" onclick="setLimit('1m')">1M</button>
      <button class="seg-btn" id="btn500k" onclick="setLimit('500k')">500k</button>
      <button class="seg-btn" id="btn200k" onclick="setLimit('200k')">200k</button>
    </div>
  </div>

  <!-- Hero Usage + Material 3 Progress -->
  <div class="hero-section">
    <div class="hero-row">
      <div class="hero-numbers">
        <span class="used-val" id="usedVal">0</span>
        <span class="limit-val">/ <span id="limitVal">1M</span></span>
      </div>
      <div class="pct-val" id="pctVal">0%</div>
    </div>

    <div class="progress-container">
      <div class="bar-track">
        <div class="bar-fill" id="barFill"></div>
        <div class="bar-tick" id="barTick" title="500k 参考线"></div>
      </div>
      <div class="bar-scale-labels" id="scaleLabels">
        <span>0</span>
        <span id="midLabel">500k</span>
        <span id="endLabel">1M</span>
      </div>
    </div>
  </div>

  <!-- Tonal Metric Tiles -->
  <div class="metrics-grid">
    <div class="metric-tile">
      <span class="metric-label">已用 Tokens</span>
      <span class="metric-value" id="exactUsed">0</span>
    </div>
    <div class="metric-tile">
      <span class="metric-label">剩余额度</span>
      <span class="metric-value" id="exactRemain">1,000,000</span>
    </div>
    <div class="metric-tile" id="compactTile">
      <span class="metric-label">自动压缩</span>
      <span class="metric-value" id="exactCompacts">0 次</span>
    </div>
  </div>

  <!-- Material 3 Status Banner -->
  <div class="status-banner" id="statusBanner">
    <div class="status-icon" id="statusIcon"></div>
    <span id="statusText">记忆完整无损，空间非常充裕</span>
  </div>
</div>

<script>
  const GEMINI_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><defs><linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4285F4"/><stop offset="50%" stop-color="#9B72CB"/><stop offset="100%" stop-color="#D96570"/></linearGradient></defs><path d="M12 2C12.3 7.3 16.7 11.7 22 12C16.7 12.3 12.3 16.7 12 22C11.7 16.7 7.3 12.3 2 12C7.3 11.7 11.7 7.3 12 2Z" fill="url(#gGrad)"/></svg>';
  const CLAUDE_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M12 2.5L14.2 8.8L20.5 6.8L16.3 12L20.5 17.2L14.2 15.2L12 21.5L9.8 15.2L3.5 17.2L7.7 12L3.5 6.8L9.8 8.8L12 2.5Z" fill="#D97757"/></svg>';

  const ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
  const ICON_INFO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
  const ICON_WARN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';

  // Sync dark/light mode when Antigravity host broadcasts theme changes
  function parseLuminance(colorStr) {
    if (!colorStr) return null;
    const hex = colorStr.trim().match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      const n = parseInt(hex[1], 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const rgb = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgb) {
      return 0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3]);
    }
    return null;
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'theme-change') {
      const kind = event.data.payload?.themeKind;
      if (kind && /dark/i.test(kind)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        return;
      }
      if (kind && /light/i.test(kind)) {
        document.documentElement.setAttribute('data-theme', 'light');
        return;
      }
      const vars = event.data.payload?.cssVariables || {};
      const bg = vars['--vscode-editor-background'] || vars['--bg'] || vars['background'];
      const lum = parseLuminance(bg);
      if (lum !== null) {
        document.documentElement.setAttribute('data-theme', lum < 128 ? 'dark' : 'light');
      }
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const convId = urlParams.get('conversationId') || 'auto';
  let manualLimit = null;
  let lastConvId = null;

  const modelIcon = document.getElementById('modelIcon');
  const modelLabel = document.getElementById('modelLabel');
  const usedVal = document.getElementById('usedVal');
  const limitVal = document.getElementById('limitVal');
  const pctVal = document.getElementById('pctVal');
  const barFill = document.getElementById('barFill');
  const barTick = document.getElementById('barTick');
  const midLabel = document.getElementById('midLabel');
  const endLabel = document.getElementById('endLabel');
  const exactUsed = document.getElementById('exactUsed');
  const exactRemain = document.getElementById('exactRemain');
  const exactCompacts = document.getElementById('exactCompacts');
  const compactTile = document.getElementById('compactTile');
  const statusBanner = document.getElementById('statusBanner');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const btn1M = document.getElementById('btn1M');
  const btn500k = document.getElementById('btn500k');
  const btn200k = document.getElementById('btn200k');

  function setLimit(lim) {
    manualLimit = lim;
    syncButtons(lim);
    update();
  }

  function syncButtons(activeScale) {
    btn1M.classList.toggle('active', activeScale === '1m');
    btn500k.classList.toggle('active', activeScale === '500k');
    btn200k.classList.toggle('active', activeScale === '200k');
    if (activeScale === '1m') {
      barTick.style.display = 'block';
      midLabel.textContent = '500k';
      endLabel.textContent = '1M';
    } else if (activeScale === '500k') {
      barTick.style.display = 'none';
      midLabel.textContent = '250k';
      endLabel.textContent = '500k';
    } else {
      barTick.style.display = 'none';
      midLabel.textContent = '100k';
      endLabel.textContent = '200k';
    }
  }

  function formatK(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  function setBanner(bg, color, iconSvg, text) {
    statusBanner.style.background = bg;
    statusBanner.style.color = color;
    statusIcon.innerHTML = iconSvg;
    statusText.textContent = text;
  }

  async function update() {
    try {
      let q = '?conversationId=' + encodeURIComponent(convId);
      if (manualLimit) q += '&limit=' + manualLimit;
      const res = await fetch('/api/context' + q);
      const data = await res.json();
      if (!data) return;

      if (lastConvId && lastConvId !== data.id) {
        manualLimit = null;
      }
      lastConvId = data.id;

      const activeScale = data.activeScale || '1m';
      syncButtons(activeScale);

      const isClaude = data.modelFamily === 'claude';
      modelLabel.textContent = isClaude ? 'Claude' : 'Gemini';
      modelIcon.innerHTML = isClaude ? CLAUDE_SVG : GEMINI_SVG;
      limitVal.textContent = data.limitLabel || '1M';

      const used = data.usedTokens || 0;
      usedVal.textContent = formatK(used);
      pctVal.textContent = data.pct + '%';
      barFill.style.width = Math.min(100, data.pct) + '%';

      exactUsed.textContent = used.toLocaleString();
      exactRemain.textContent = (data.remainingTokens || 0).toLocaleString();

      const compacts = data.compactionCount || 0;
      exactCompacts.textContent = compacts + ' 次';

      // Tonal highlight on compaction tile when >= 2
      if (compacts >= 3) {
        compactTile.style.background = 'var(--md-red-bg)';
        exactCompacts.style.color = 'var(--md-red)';
      } else if (compacts === 2) {
        compactTile.style.background = 'var(--md-amber-bg)';
        exactCompacts.style.color = 'var(--md-amber)';
      } else {
        compactTile.style.background = 'var(--md-surface-container)';
        exactCompacts.style.color = 'var(--md-on-surface)';
      }

      // Google Material 3 Progress Bar colors
      const warnPct = activeScale === '1m' ? 50 : 60;
      const dangerPct = activeScale === '1m' ? 80 : 85;
      if (data.pct < warnPct) {
        pctVal.style.color = 'var(--md-blue)';
        barFill.style.background = 'linear-gradient(90deg, #4285f4 0%, #1a73e8 100%)';
      } else if (data.pct < dangerPct) {
        pctVal.style.color = 'var(--md-amber)';
        barFill.style.background = 'var(--md-amber-bar)';
      } else {
        pctVal.style.color = 'var(--md-red)';
        barFill.style.background = 'var(--md-red-bar)';
      }

      // Dynamic guidance banner
      if (compacts >= 3) {
        setBanner('var(--md-red-bg)', 'var(--md-red)', ICON_WARN, '已经历 ' + compacts + ' 次自动压缩，记忆衰减严重，建议开新对话');
      } else if (compacts === 2) {
        setBanner('var(--md-amber-bg)', 'var(--md-amber)', ICON_WARN, '已经历 2 次自动压缩，建议收尾当前任务后开新对话');
      } else if (activeScale === '1m' && data.pct >= 80) {
        setBanner('var(--md-red-bg)', 'var(--md-red)', ICON_WARN, '已超 800k，接近 1M 上限，随时可能触发压缩');
      } else if (activeScale === '1m' && data.pct >= 50) {
        setBanner('var(--md-amber-bg)', 'var(--md-amber)', ICON_INFO, '已过 500k 参考线，可按需输入 /compact 整理记忆');
      } else if (activeScale !== '1m' && data.pct >= 88) {
        setBanner('var(--md-red-bg)', 'var(--md-red)', ICON_WARN, '接近 ' + data.limitLabel + ' 刻度上限，可切回 1M 或使用 /compact');
      } else if (activeScale !== '1m' && data.pct >= 70) {
        setBanner('var(--md-amber-bg)', 'var(--md-amber)', ICON_INFO, '当前刻度已消耗超 70%，可提前输入 /compact');
      } else if (compacts === 1) {
        setBanner('var(--md-info-bg)', 'var(--md-primary)', ICON_INFO, '已经历 1 次压缩，当前上下文状态良好');
      } else {
        setBanner('var(--md-green-bg)', 'var(--md-green)', ICON_CHECK, '记忆完整无损，空间非常充裕');
      }
    } catch (e) {}
  }

  modelIcon.innerHTML = GEMINI_SVG;
  statusIcon.innerHTML = ICON_CHECK;
  update();
  setInterval(update, 1500);
</script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/context') {
    const convId = parsedUrl.query.conversationId;
    const limit = parsedUrl.query.limit;
    const data = getConversationData(convId === 'auto' ? null : convId, limit);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify(data));
  }

  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    return res.end(getHtml());
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not Found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[context-viewer-sidecar] Listening on http://127.0.0.1:${server.address().port}`);
});
