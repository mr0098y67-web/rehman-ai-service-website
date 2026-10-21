'use strict';

/*
 * Rehman AI Service - voice callback endpoint (standalone Node server).
 *
 * Same behaviour as server/twilio-function.js, for running on any host that
 * can expose an HTTPS URL (VPS, tunnel, etc).
 *
 *   node server/standalone.js
 *
 * Environment variables (see server/.env.example):
 *   ELEVENLABS_API_KEY      (required)
 *   ELEVENLABS_AGENT_ID     (optional, has a default)
 *   ELEVENLABS_PHONE_NUMBER_ID (optional, has a default)
 *   ALLOWED_ORIGINS         (optional, comma separated)
 *   PORT                    (optional, default 8787)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

/* Tiny .env loader so the key never has to live in the code. */
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(function (line) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) return;
      const value = m[2].replace(/^["']|["']$/g, '');
      if (value && !process.env[m[1]]) process.env[m[1]] = value;
    });
  }
} catch (e) { /* .env is optional */ }

const CONFIG = {
  agentId: process.env.ELEVENLABS_AGENT_ID || 'agent_0501m5cjqewff0hs7qw8fbrecvjb',
  phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || 'phnum_2801m5eyd0szesfv6dyw5hsqgbfh',
  apiKey: process.env.ELEVENLABS_API_KEY || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ||
    'https://rehmanai.publ,https://rehmanai.publicvm.com,http://localhost:8080')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean)
};

const RATE = { hits: {} };

function corsHeaders(origin) {
  const allowed = CONFIG.allowedOrigins.indexOf('*') !== -1 ||
    (!!origin && CONFIG.allowedOrigins.indexOf(origin) !== -1);
  return {
    headers: {
      'Access-Control-Allow-Origin': allowed ? (origin || '*') : (CONFIG.allowedOrigins[0] || '*'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin'
    },
    allowed: allowed
  };
}

function normalizePhone(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return { ok: false, error: 'Phone number is missing.' };
  s = s.replace(/[^\d+]/g, '');
  if (s.indexOf('00') === 0) s = '+' + s.slice(2);
  if (s.charAt(0) === '+') {
    const digits = s.slice(1);
    if (/^\d{8,15}$/.test(digits)) return { ok: true, value: '+' + digits };
    return { ok: false, error: 'Phone number is not a valid international number.' };
  }
  if (s.charAt(0) === '0') {
    const local = s.slice(1);
    if (/^\d{9,10}$/.test(local)) return { ok: true, value: '+92' + local };
  }
  if (/^\d{10,15}$/.test(s)) return { ok: true, value: '+' + s };
  return { ok: false, error: 'Phone number is not a valid international number.' };
}

function rateOk(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const bucket = RATE.hits[key];
  if (!bucket || now - bucket.start > 3600000) {
    RATE.hits[key] = { start: now, count: 1 };
    return true;
  }
  bucket.count += 1;
  return bucket.count <= 5;
}

function buildFirstMessage(name, services, estimatedTotal) {
  let line = 'Hello ' + (name ? name : 'there') +
    ', this is the Rehman AI Service assistant calling about the quote request you sent on our website.';
  if (services) line += ' You asked for: ' + String(services).replace(/\s+/g, ' ').slice(0, 300) + '.';
  if (estimatedTotal) line += ' The estimate you built was PKR ' + estimatedTotal + '.';
  line += ' Am I speaking with you?';
  return line;
}

async function placeCall(lead) {
  const body = {
    agent_id: CONFIG.agentId,
    agent_phone_number_id: CONFIG.phoneNumberId,
    to_number: lead.phone,
    conversation_initiation_client_data: {
      user_id: 'website-lead-' + Date.now(),
      dynamic_variables: {
        customer_name: lead.name || 'there',
        customer_phone: lead.phone,
        services_requested: String(lead.services || '').slice(0, 500),
        project_details: String(lead.details || '').slice(0, 500),
        estimated_total: lead.estimatedTotal ? String(lead.estimatedTotal) : ''
      },
      conversation_config_override: {
        agent: { first_message: lead.firstMessage }
      }
    }
  };
  const res = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
    method: 'POST',
    headers: { 'xi-api-key': CONFIG.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  if (!res.ok) {
    let message = 'ElevenLabs rejected the call (' + res.status + ').';
    if (data && typeof data.detail === 'string') message = data.detail;
    else if (data && typeof data.message === 'string') message = data.message;
    else if (data && (data.detail || data.message)) message = JSON.stringify(data.detail || data.message);
    else if (text) message = text.slice(0, 300);
    const err = new Error(message);
    err.status = res.status;
    err.detail = data || text;
    throw err;
  }
  return data || {};
}

function handleLead(payload, origin, ip) {
  const cors = corsHeaders(origin);
  if (!cors.allowed) {
    return Promise.resolve({ status: 403, body: { ok: false, scheduled: false, error: 'Origin not allowed.' } });
  }
  if (!rateOk(ip)) {
    return Promise.resolve({ status: 429, body: { ok: false, scheduled: false, error: 'Too many callback requests. Please try again later.' } });
  }
  const phone = normalizePhone(payload.phone || payload.whatsapp);
  if (!phone.ok) {
    return Promise.resolve({ status: 400, body: { ok: false, scheduled: false, error: phone.error } });
  }
  if (!CONFIG.apiKey) {
    return Promise.resolve({ status: 503, body: { ok: false, scheduled: false, error: 'ELEVENLABS_API_KEY is not set on the server.' } });
  }
  const lead = {
    name: String(payload.name || '').trim().slice(0, 120),
    phone: phone.value,
    email: String(payload.email || '').trim().slice(0, 160),
    details: payload.details || '',
    services: payload.services || '',
    estimatedTotal: payload.estimatedTotal || '',
    firstMessage: buildFirstMessage(payload.name, payload.services, payload.estimatedTotal)
  };
  return placeCall(lead).then(function (result) {
    return {
      status: 200,
      body: {
        ok: true,
        scheduled: true,
        conversation_id: result.conversation_id || null,
        call_sid: result.callSid || null
      }
    };
  }).catch(function (error) {
    return {
      status: 502,
      body: { ok: false, scheduled: false, error: error && error.message ? error.message : 'Call could not be started.' }
    };
  });
}

const server = http.createServer(function (req, res) {
  const origin = req.headers.origin || '';
  const cors = corsHeaders(origin);
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket.remoteAddress || '');

  if (req.method === 'GET' && req.url.indexOf('/health') === 0) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true, apiKeyConfigured: !!CONFIG.apiKey, agentId: CONFIG.agentId }));
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors.headers);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, Object.assign({ 'Content-Type': 'application/json' }, cors.headers));
    res.end(JSON.stringify({ ok: false, scheduled: false, error: 'Method not allowed.' }));
    return;
  }

  let raw = '';
  req.on('data', function (chunk) {
    raw += chunk;
    if (raw.length > 20000) { req.destroy(); }
  });
  req.on('end', function () {
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch (e) { payload = {}; }
    handleLead(payload || {}, origin, ip).then(function (result) {
      res.writeHead(result.status, Object.assign({ 'Content-Type': 'application/json' }, cors.headers));
      res.end(JSON.stringify(result.body));
    }).catch(function (error) {
      res.writeHead(500, Object.assign({ 'Content-Type': 'application/json' }, cors.headers));
      res.end(JSON.stringify({ ok: false, scheduled: false, error: error && error.message ? error.message : 'Server error.' }));
    });
  });
});

const PORT = parseInt(process.env.PORT || '8787', 10);
server.listen(PORT, function () {
  console.log('Rehman AI callback server listening on port ' + PORT +
    ' (api key ' + (CONFIG.apiKey ? 'configured' : 'MISSING') + ')');
});
