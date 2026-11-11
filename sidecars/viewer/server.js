const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');

const brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
const port = Number(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT || 0) || 38290;

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
      totalLimit: 250000,
      limitLabel: '250k',
      modelName: 'Gemini 3.8 Flash',
      pct: 0,
      remainingTokens: 250000,
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
  let modelName = 'Gemini 3.8 Flash';
  let defaultLimit = 250000;
  let defaultLabel = '250k';
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
        // Only inspect explicit user settings changes for model detection
        if (s.content && typeof s.content === 'string' && s.content.includes('USER_SETTINGS_CHANGE')) {
          if (s.content.includes('Claude') || s.content.includes('claude')) {
            modelName = 'Claude 3.5';
            defaultLimit = 200000;
            defaultLabel = '200k';
          } else if (s.content.includes('Gemini') || s.content.includes('gemini')) {
            modelName = 'Gemini 3.8 Flash';
            defaultLimit = 250000;
            defaultLabel = '250k';
          }
        }
        if (s.input_tokens || s.cache_read_tokens) {
          latestInput = s.input_tokens || 0;
          latestCache = s.cache_read_tokens || 0;
        }
      } catch (e) {}
    }
  } catch (e) {}

  let totalLimit = defaultLimit;
  let limitLabel = defaultLabel;

  if (overrideLimit === '200k') {
    totalLimit = 200000;
    limitLabel = '200k';
    modelName = 'Claude (200k)';
  } else if (overrideLimit === '1m' || overrideLimit === '1M') {
    totalLimit = 1000000;
    limitLabel = '1M';
    modelName = 'Gemini (1M 上限)';
  } else if (overrideLimit === '250k') {
    totalLimit = 250000;
    limitLabel = '250k';
    modelName = 'Gemini (250k 压缩线)';
  }

  const usedTokens = latestInput + latestCache;
  const pct = Math.min(100, Math.round((usedTokens / totalLimit) * 1000) / 10);
  const remainingTokens = Math.max(0, totalLimit - usedTokens);

  return {
    id: item.id,
    usedTokens,
    totalLimit,
    limitLabel,
    modelName,
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
<title>会话上下文监控</title>
<style>
  :root {
    --bg: #f8fafc;
    --fg: #0f172a;
    --card: #ffffff;
    --border: #e2e8f0;
    --primary: #2563eb;
    --green: #16a34a;
    --yellow: #d97706;
    --red: #dc2626;
    --bar-bg: #e2e8f0;
    --sub: #64748b;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #181825;
      --fg: #cdd6f4;
      --card: #1e1e2e;
      --border: #313244;
      --primary: #89b4fa;
      --green: #a6e3a1;
      --yellow: #f9e2af;
      --red: #f38ba8;
      --bar-bg: #313244;
      --sub: #a6adc8;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif;
    padding: 14px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 18px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .model-pill {
    font-size: 13px;
    font-weight: 600;
    color: var(--primary);
    background: rgba(37, 99, 235, 0.1);
    padding: 5px 12px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .compact-pill {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.3s;
  }
  .limit-bar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .limit-label-hint {
    font-size: 11px;
    color: var(--sub);
  }
  .limit-switch {
    display: flex;
    gap: 4px;
    background: var(--bar-bg);
    padding: 2px;
    border-radius: 8px;
  }
  .switch-btn {
    border: none;
    background: transparent;
    color: var(--sub);
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .switch-btn.active {
    background: var(--card);
    color: var(--fg);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  /* Big stat numbers */
  .stat-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-top: 2px;
  }
  .used-display {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .used-val {
    font-size: 34px;
    font-weight: 800;
    font-family: "JetBrains Mono", Consolas, Monaco, monospace;
    color: var(--fg);
    line-height: 1;
  }
  .total-val {
    font-size: 16px;
    font-weight: 600;
    color: var(--sub);
  }
  .pct-tag {
    font-size: 28px;
    font-weight: 800;
    font-family: "JetBrains Mono", Consolas, monospace;
    color: var(--green);
  }

  /* Progress bar */
  .bar-wrapper {
    background: var(--bar-bg);
    height: 16px;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(0,0,0,0.04);
  }
  .bar-fill {
    height: 100%;
    width: 0%;
    background: var(--green);
    border-radius: 8px;
    transition: width 0.4s ease, background 0.3s;
  }

  /* Detail line */
  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--sub);
    margin-top: -4px;
  }
  .detail-row strong {
    color: var(--fg);
  }

  /* Status message */
  .status-cue {
    font-size: 12px;
    text-align: center;
    padding: 9px 12px;
    border-radius: 8px;
    background: rgba(22, 163, 74, 0.08);
    border: 1px solid rgba(22, 163, 74, 0.2);
    color: var(--green);
    font-weight: 600;
    line-height: 1.4;
  }
</style>
</head>
<body>

<div class="card">
  <!-- Top: Model name & Compaction Badge -->
  <div class="header-row">
    <div class="model-pill">
      <span>🛰️</span>
      <span id="modelLabel">Gemini 3.8 Flash</span>
    </div>
    <div class="compact-pill" id="compactPill">
      <span>🔄</span>
      <span id="compactCountText">未发生压缩 (0次)</span>
    </div>
  </div>

  <!-- Scale switcher: 250k (Compaction Line) / 1M (Model Limit) / 200k (Claude) -->
  <div class="limit-bar-row">
    <span class="limit-label-hint">监控尺度:</span>
    <div class="limit-switch">
      <button class="switch-btn active" id="btn250k" onclick="setLimit('250k')">250k 压缩线</button>
      <button class="switch-btn" id="btn1M" onclick="setLimit('1m')">1M 上限</button>
      <button class="switch-btn" id="btn200k" onclick="setLimit('200k')">200k</button>
    </div>
  </div>

  <!-- Big Numbers: 70.8k / 250k    28.3% -->
  <div class="stat-row">
    <div class="used-display">
      <span class="used-val" id="usedVal">0k</span>
      <span class="total-val">/ <span id="limitVal">250k</span></span>
    </div>
    <div class="pct-tag" id="pctVal">0%</div>
  </div>

  <!-- Progress bar -->
  <div class="bar-wrapper">
    <div class="bar-fill" id="barFill"></div>
  </div>

  <!-- Exact details -->
  <div class="detail-row">
    <span>已用: <strong id="exactUsed">0</strong></span>
    <span>剩余: <strong id="exactRemain">250,000</strong> (<span id="remainPct">100%</span>)</span>
    <span>已压缩: <strong id="exactCompacts">0 次</strong></span>
  </div>

  <!-- Status banner -->
  <div class="status-cue" id="statusCue">
    🟢 空间充裕，记忆完整无损（0次压缩）
  </div>
</div>

<script>
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'theme-change') {
      const vars = event.data.payload?.cssVariables || {};
      for (const [k, v] of Object.entries(vars)) {
        document.documentElement.style.setProperty(k, v);
      }
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const convId = urlParams.get('conversationId') || 'auto';
  let currentLimit = '250k'; // Default to 250k compaction line for accurate warning

  const modelLabel = document.getElementById('modelLabel');
  const compactPill = document.getElementById('compactPill');
  const compactCountText = document.getElementById('compactCountText');
  const usedVal = document.getElementById('usedVal');
  const limitVal = document.getElementById('limitVal');
  const pctVal = document.getElementById('pctVal');
  const barFill = document.getElementById('barFill');
  const exactUsed = document.getElementById('exactUsed');
  const exactRemain = document.getElementById('exactRemain');
  const remainPct = document.getElementById('remainPct');
  const exactCompacts = document.getElementById('exactCompacts');
  const statusCue = document.getElementById('statusCue');
  const btn250k = document.getElementById('btn250k');
  const btn1M = document.getElementById('btn1M');
  const btn200k = document.getElementById('btn200k');

  function setLimit(lim) {
    currentLimit = lim;
    btn250k.classList.toggle('active', lim === '250k');
    btn1M.classList.toggle('active', lim === '1m');
    btn200k.classList.toggle('active', lim === '200k');
    update();
  }

  function formatK(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  async function update() {
    try {
      let q = '?conversationId=' + encodeURIComponent(convId);
      if (currentLimit) q += '&limit=' + currentLimit;
      const res = await fetch('/api/context' + q);
      const data = await res.json();
      if (!data) return;

      modelLabel.textContent = data.modelName || 'Gemini 3.8 Flash';
      limitVal.textContent = data.limitLabel || '250k';

      usedVal.textContent = formatK(data.usedTokens || 0);
      pctVal.textContent = data.pct + '%';
      barFill.style.width = Math.min(100, data.pct) + '%';

      exactUsed.textContent = (data.usedTokens || 0).toLocaleString();
      exactRemain.textContent = (data.remainingTokens || 0).toLocaleString();
      remainPct.textContent = (100 - data.pct).toFixed(1) + '%';

      const compacts = data.compactionCount || 0;
      exactCompacts.textContent = compacts + ' 次';

      // Update Compaction Pill styling
      if (compacts === 0) {
        compactCountText.textContent = '记忆未压缩 (0次)';
        compactPill.style.background = 'rgba(22, 163, 74, 0.1)';
        compactPill.style.color = 'var(--green)';
      } else if (compacts === 1) {
        compactCountText.textContent = '已压缩 1 次 (轻度)';
        compactPill.style.background = 'rgba(37, 99, 235, 0.1)';
        compactPill.style.color = 'var(--primary)';
      } else if (compacts === 2) {
        compactCountText.textContent = '已压缩 2 次 (建议收尾)';
        compactPill.style.background = 'rgba(217, 119, 6, 0.12)';
        compactPill.style.color = 'var(--yellow)';
      } else {
        compactCountText.textContent = '已压缩 ' + compacts + ' 次 (建议新开)';
        compactPill.style.background = 'rgba(220, 38, 38, 0.12)';
        compactPill.style.color = 'var(--red)';
      }

      // Progress bar colors
      if (data.pct < 60) {
        pctVal.style.color = 'var(--green)';
        barFill.style.background = 'var(--green)';
      } else if (data.pct < 85) {
        pctVal.style.color = 'var(--yellow)';
        barFill.style.background = 'var(--yellow)';
      } else {
        pctVal.style.color = 'var(--red)';
        barFill.style.background = 'var(--red)';
      }

      // Dynamic guidance banner
      if (compacts >= 3) {
        statusCue.style.color = 'var(--red)';
        statusCue.style.background = 'rgba(220, 38, 38, 0.08)';
        statusCue.style.borderColor = 'rgba(220, 38, 38, 0.2)';
        statusCue.textContent = '🔴 已经历 ' + compacts + ' 次压缩，记忆衰减严重，强烈建议开启新对话！';
      } else if (compacts === 2) {
        statusCue.style.color = 'var(--yellow)';
        statusCue.style.background = 'rgba(217, 119, 6, 0.08)';
        statusCue.style.borderColor = 'rgba(217, 119, 6, 0.2)';
        statusCue.textContent = '🟠 已经历 2 次压缩（记忆进入衰退期），建议收尾当前任务并开新对话';
      } else if (data.pct >= 88) {
        statusCue.style.color = 'var(--red)';
        statusCue.style.background = 'rgba(220, 38, 38, 0.08)';
        statusCue.style.borderColor = 'rgba(220, 38, 38, 0.2)';
        statusCue.textContent = '🔴 距 250k 压缩警戒线不足 12%，即将触发自动压缩';
      } else if (data.pct >= 70) {
        statusCue.style.color = 'var(--yellow)';
        statusCue.style.background = 'rgba(217, 119, 6, 0.08)';
        statusCue.style.borderColor = 'rgba(217, 119, 6, 0.2)';
        statusCue.textContent = '🟡 上下文已消耗超 70%，可输入 /compact 提前整理记忆';
      } else if (compacts === 1) {
        statusCue.style.color = 'var(--green)';
        statusCue.style.background = 'rgba(22, 163, 74, 0.08)';
        statusCue.style.borderColor = 'rgba(22, 163, 74, 0.2)';
        statusCue.textContent = '🟢 已经历 1 次压缩，当前上下文状态良好';
      } else {
        statusCue.style.color = 'var(--green)';
        statusCue.style.background = 'rgba(22, 163, 74, 0.08)';
        statusCue.style.borderColor = 'rgba(22, 163, 74, 0.2)';
        statusCue.textContent = '🟢 空间非常充裕，记忆完整无损（未压缩）';
      }
    } catch (e) {}
  }

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
