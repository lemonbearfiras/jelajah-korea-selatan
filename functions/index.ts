// jelajah-ask — server-only bridge: browser -> this Function -> LLM gateway / Qoder Cloud Agents.
// Secret values are read with Deno.env.get here only; they never reach the browser.
import { createCloudAgentsClient, CloudAgentsError } from './cloud-agents.mjs';

// Copied from sites.get_runtime_context cloudAgents.apiOrigin. Do not substitute.
const CLOUD_API_ORIGIN = 'https://api.qoder.com';
const APP_SCOPE = 'jelajah-korea-selatan:v2';
const APP_META = { app: 'jelajah-korea-selatan', purpose: 'site-chat-assistant-en' };
const AGENT_SYSTEM = 'You are "Jelajah AI", a South Korea travel assistant for Malaysian travellers. ' +
  'Answer in friendly, specific and concise English: maximum 4 sentences, no lists. ' +
  'Focus only on South Korea: destinations (Seoul, Busan, Jeju, Gyeongju, Jeonju, Seoraksan), food, culture, ' +
  'transport (KTX, subway), budget (approx RM1 = ₩300-330), weather and seasons. ' +
  'If a fact is uncertain, say it is an estimate. If the question is off-topic from South Korea or travel, ' +
  'ask the user to ask about South Korea only.';

// OpenAI-compatible gateway for the owner's own API key (application Secret A2AGENT_API_KEY).
const GATEWAY_ORIGIN = 'https://api.a2agent.me';
const GATEWAY_KEY_ENV = 'A2AGENT_API_KEY';
const GATEWAY_TIMEOUT_MS = 12000;
const ASK_DEADLINE_MS = 20000;

const client = createCloudAgentsClient({ origin: CLOUD_API_ORIGIN });

let bindingCache = null;
let ensureChain = Promise.resolve();
let gatewayModelCache = null;
let gatewayChain = Promise.resolve();

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function gatewayKey() {
  const raw = Deno.env.get(GATEWAY_KEY_ENV) || '';
  const key = raw.trim();
  return key.length >= 8 ? key : '';
}

async function gatewayFetch(path, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, timeoutMs || GATEWAY_TIMEOUT_MS);
  try {
    const res = await fetch(GATEWAY_ORIGIN + path, Object.assign({ signal: controller.signal }, init));
    if (!res.ok) throw new CloudAgentsError('ai_service_unavailable', 503, 'not_sent');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function pickGatewayId(ids) {
  if (ids.some(function (id) { return /minimax.?m3/i.test(id); })) {
    return ids.filter(function (id) { return /minimax.?m3/i.test(id); })[0];
  }
  const minimax = ids.filter(function (id) { return /minimax/i.test(id); });
  if (minimax.length) return minimax.sort()[0];
  const deepseek = ids.filter(function (id) { return /deepseek|glm|kimi|qwen/i.test(id); });
  if (deepseek.length) return deepseek.sort()[0];
  return ids.sort()[0];
}

async function pickGatewayModel(key) {
  if (gatewayModelCache) return gatewayModelCache;
  const run = async function () {
    if (gatewayModelCache) return gatewayModelCache;
    const res = await gatewayFetch('/v1/models', { headers: { Authorization: 'Bearer ' + key } });
    const rows = Array.isArray(res?.data) ? res.data : [];
    const ids = rows.map(function (r) { return r && typeof r.id === 'string' ? r.id.trim() : ''; }).filter(Boolean);
    if (!ids.length) throw new CloudAgentsError('ai_resource_not_found', 404, 'not_sent');
    gatewayModelCache = pickGatewayId(ids);
    return gatewayModelCache;
  };
  const result = gatewayChain.then(run, run);
  gatewayChain = result.then(function () {}, function () {});
  return result;
}

// MiniMax streams its chain of thought inside <think>…</think>; only the text after it is the answer.
const THINK_BLOCK = /<think\b[^>]*>[\s\S]*?<\/think>/gi;

function cleanAnswer(raw) {
  return String(raw)
    .replace(THINK_BLOCK, ' ')
    .replace(/<\/?think>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function askViaGateway(key, question, deadline) {
  const model = await pickGatewayModel(key);
  const res = await gatewayFetch('/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: AGENT_SYSTEM }, { role: 'user', content: question }],
      max_tokens: 900,
      temperature: 0.4,
      stream: false,
    }),
  }, Math.max(2000, Math.min(GATEWAY_TIMEOUT_MS, deadline - Date.now())));
  const choices = Array.isArray(res?.choices) ? res.choices : [];
  const content = choices[0]?.message?.content;
  const text = cleanAnswer(typeof content === 'string' ? content : '');
  if (text.length < 3) throw new CloudAgentsError('ai_response_invalid');
  return text.slice(0, 1200);
}

async function pickModel() {
  const res = await client.request('/api/v1/cloud/models');
  const models = Array.isArray(res?.data) ? res.data : [];
  const enabled = models.filter(function (m) { return m && typeof m.id === 'string' && m.is_enabled !== false; });
  if (!enabled.length) throw new CloudAgentsError('ai_resource_not_found', 404, 'not_sent');
  enabled.sort(function (a, b) {
    const pa = typeof a.price_factor === 'number' ? a.price_factor : 1;
    const pb = typeof b.price_factor === 'number' ? b.price_factor : 1;
    return pa - pb || String(a.id).localeCompare(String(b.id));
  });
  return enabled[0].id;
}

async function ensureResource(kind, body, idempotencyKey) {
  const matches = await client.findResources(kind, APP_META);
  const usable = matches.filter(function (m) {
    return kind === 'agents' ? Number.isInteger(m.version) && m.version > 0 : true;
  });
  if (usable.length >= 1) {
    usable.sort(function (a, b) { return String(a.created_at).localeCompare(String(b.created_at)); });
    return usable[0];
  }
  const created = await client.request('/api/v1/cloud/' + kind, {
    method: 'POST',
    body,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
  const prefix = kind === 'agents' ? 'agent_' : 'env_';
  if (!created || typeof created.id !== 'string' || created.id.indexOf(prefix) !== 0) {
    throw new CloudAgentsError('ai_response_invalid');
  }
  return created;
}

async function ensureBinding() {
  const run = async function () {
    if (bindingCache) return bindingCache;
    const model = await pickModel();
    const environment = await ensureResource('environments', {
      name: 'Jelajah AI environment',
      config: { type: 'cloud' },
      metadata: APP_META,
    });
    const agent = await ensureResource('agents', {
      name: 'Jelajah AI',
      model,
      system: AGENT_SYSTEM,
      tools: [],
      metadata: APP_META,
    }, 'jelajah-ai-' + APP_SCOPE);
    bindingCache = {
      agent: { type: 'agent', id: agent.id, version: agent.version },
      environment_id: environment.id,
    };
    return bindingCache;
  };
  const result = ensureChain.then(run, run);
  ensureChain = result.then(function () {}, function () {});
  return result;
}

async function askViaCloud(question, deadline) {
  const binding = await ensureBinding();
  const session = await client.request('/api/v1/cloud/sessions', {
    method: 'POST',
    body: {
      agent: binding.agent,
      environment_id: binding.environment_id,
      title: 'Jelajah AI',
      metadata: { app: 'jelajah-korea-selatan', scope: APP_SCOPE },
    },
  });
  if (!session || typeof session.id !== 'string' || session.id.indexOf('sess_') !== 0) {
    throw new CloudAgentsError('ai_response_invalid');
  }
  await client.request('/api/v1/cloud/sessions/' + session.id + '/events', {
    method: 'POST',
    body: { events: [{ type: 'user.message', content: [{ type: 'text', text: question }] }] },
  });
  while (Date.now() < deadline) {
    await sleep(1200);
    const list = await client.request(
      '/api/v1/cloud/sessions/' + session.id + '/events?order=asc&limit=100&types=agent.message'
    );
    const events = Array.isArray(list?.data) ? list.data : [];
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (!ev || ev.type !== 'agent.message' || !Array.isArray(ev.content)) continue;
      const text = cleanAnswer(
        ev.content
          .filter(function (b) { return b && b.type === 'text' && typeof b.text === 'string'; })
          .map(function (b) { return b.text; })
          .join(' ')
      );
      if (text.length >= 2) return text.slice(0, 1200);
    }
  }
  throw new CloudAgentsError('ai_service_unavailable', 503, 'unknown');
}

async function ask(question) {
  const deadline = Date.now() + ASK_DEADLINE_MS;
  const key = gatewayKey();
  if (!key) return askViaCloud(question, deadline);
  try {
    return await askViaGateway(key, question, deadline);
  } catch (gatewayError) {
    if (Date.now() >= deadline - 3000) throw gatewayError;
    return await askViaCloud(question, deadline);
  }
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function handler(req) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  if (req.method === 'GET' && action === 'health') return json({ ok: true });
  if (req.method !== 'POST' || action !== 'ask') return json({ ok: false, error: 'not_found' }, 404);
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'bad_request' }, 415);
  }
  let raw;
  try {
    raw = await req.text();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }
  if (raw.length > 4096) return json({ ok: false, error: 'too_large' }, 413);
  let q = '';
  try {
    const parsed = JSON.parse(raw);
    q = typeof parsed.q === 'string' ? parsed.q.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }
  if (q.length < 2 || q.length > 300) return json({ ok: false, error: 'bad_request' }, 400);
  try {
    const answer = await ask(q);
    return json({ ok: true, answer });
  } catch (error) {
    const code = error instanceof CloudAgentsError ? error.code : 'ai_service_unavailable';
    const status = error instanceof CloudAgentsError && error.status >= 400 && error.status < 500 ? error.status : 503;
    return json({ ok: false, error: code }, status);
  }
}

Deno.serve(handler);
