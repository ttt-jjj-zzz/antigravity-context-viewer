const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');

const brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
const port = Number(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT || 0) || 38290;
const htmlPath = path.join(__dirname, 'index.html');

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
    try {
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      return res.end(html);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Failed to load index.html');
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not Found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[context-viewer-sidecar] Listening on http://127.0.0.1:${server.address().port}`);
});
