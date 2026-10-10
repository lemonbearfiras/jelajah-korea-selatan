// jelajah-ask — server-only bridge: browser -> this Function -> Qoder Cloud Agents.
// QODER_PAT is read only inside the cloud client here; it never reaches the browser.
import { createCloudAgentsClient, CloudAgentsError } from './cloud-agents.mjs';

// Copied from sites.get_runtime_context cloudAgents.apiOrigin. Do not substitute.
const CLOUD_API_ORIGIN = 'https://api.qoder.com';
const APP_SCOPE = 'jelajah-korea-selatan:v1';
const APP_META = { app: 'jelajah-korea-selatan', purpose: 'site-chat-assistant' };
const AGENT_SYSTEM = 'Kau ialah "Jelajah AI", pembantu pelancongan Korea Selatan untuk pelancong Malaysia. ' +
  'Jawab dalam Bahasa Melayu yang mesra, spesifik dan ringkas: maksimum 4 ayat, tiada senarai. ' +
  'Fokus hanya Korea Selatan: destinasi (Seoul, Busan, Jeju, Gyeongju, Jeonju, Seoraksan), makanan, budaya, ' +
  'pengangkutan (KTX, subway), bajet (anggaran RM1 = ₩300-330), cuaca dan musim. ' +
  'Jika fakta tidak pasti, nyatakan ia anggaran. Jika soalan di luar topik Korea Selatan atau pelancongan, ' +
  'minta pengguna bertanya tentang Korea Selatan sahaja.';

const client = createCloudAgentsClient({ origin: CLOUD_API_ORIGIN });

let bindingCache = null;
let ensureChain = Promise.resolve();

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
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

async function ask(question) {
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
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await sleep(1200);
    const list = await client.request(
      '/api/v1/cloud/sessions/' + session.id + '/events?order=asc&limit=100&types=agent.message'
    );
    const events = Array.isArray(list?.data) ? list.data : [];
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (!ev || ev.type !== 'agent.message' || !Array.isArray(ev.content)) continue;
      const text = ev.content
        .filter(function (b) { return b && b.type === 'text' && typeof b.text === 'string'; })
        .map(function (b) { return b.text; })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length >= 2) return text.slice(0, 1200);
    }
  }
  throw new CloudAgentsError('ai_service_unavailable', 503, 'unknown');
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
