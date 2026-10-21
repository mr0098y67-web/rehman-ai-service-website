'use strict';

/*
 * Rehman AI Service - voice callback endpoint (Twilio Functions).
 *
 * The website quote form POSTs the visitor's details here. This function asks
 * the ElevenLabs voice agent (already connected to our Twilio number
 * +1 857 832 7540) to call the visitor back.
 *
 * Deploy: Twilio Console -> Functions -> Create Function (paste this file),
 * then set the environment variable ELEVENLABS_API_KEY.
 * Or deploy with the Twilio CLI: `twilio serverless deploy --functions server`.
 *
 * Request body (JSON):
 *   { name, phone, email, details, services, estimatedTotal, source }
 * Response body (JSON):
 *   { ok: true, scheduled: true, conversation_id, call_sid }
 */

const CONFIG = {
  agentId: process.env.ELEVENLABS_AGENT_ID || 'agent_0501m5cjqewff0hs7qw8fbrecvjb',
  phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || 'phnum_2801m5eyd0szesfv6dyw5hsqgbfh',
  apiKey: process.env.ELEVENLABS_API_KEY || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ||
    'https://rehmanai.publ,https://rehmanai.publicvm.com,http://localhost:8080')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean),
  maxCallsPerHour: parseInt(process.env.MAX_CALLS_PER_HOUR || '20', 10)
};

const RATE = { hits: {} };

function corsHeaders(origin) {
  var allowed = CONFIG.allowedOrigins.indexOf('*') !== -1 ||
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
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return { ok: false, error: 'Phone number is missing.' };
  s = s.replace(/[^\d+]/g, '');
  if (s.indexOf('00') === 0) s = '+' + s.slice(2);
  if (s.charAt(0) === '+') {
    var digits = s.slice(1);
    if (/^\d{8,15}$/.test(digits)) return { ok: true, value: '+' + digits };
    return { ok: false, error: 'Phone number is not a valid international number.' };
  }
  if (s.charAt(0) === '0') {
    var local = s.slice(1);
    if (/^\d{9,10}$/.test(local)) return { ok: true, value: '+92' + local };
  }
  if (/^\d{10,15}$/.test(s)) return { ok: true, value: '+' + s };
  return { ok: false, error: 'Phone number is not a valid international number.' };
}

function rateOk(ip) {
  var now = Date.now();
  var key = ip || 'unknown';
  var bucket = RATE.hits[key];
  if (!bucket || now - bucket.start > 3600000) {
    RATE.hits[key] = { start: now, count: 1 };
    return true;
  }
  bucket.count += 1;
  return bucket.count <= 5;
}

function buildFirstMessage(name, services, estimatedTotal) {
  var who = name ? name : 'there';
  var line = 'Hello ' + who + ', this is the Rehman AI Service assistant calling about the quote request you sent on our website.';
  if (services) line += ' You asked for: ' + String(services).replace(/\s+/g, ' ').slice(0, 300) + '.';
  if (estimatedTotal) line += ' The estimate you built was PKR ' + estimatedTotal + '.';
  line += ' Am I speaking with you?';
  return line;
}

async function placeCall(lead) {
  var body = {
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
  var res = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
    method: 'POST',
    headers: { 'xi-api-key': CONFIG.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  var text = await res.text();
  var data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  if (!res.ok) {
    var message = 'ElevenLabs rejected the call (' + res.status + ').';
    if (data && typeof data.detail === 'string') message = data.detail;
    else if (data && typeof data.message === 'string') message = data.message;
    else if (data && (data.detail || data.message)) message = JSON.stringify(data.detail || data.message);
    else if (text) message = text.slice(0, 300);
    var err = new Error(message);
    err.status = res.status;
    err.detail = data || text;
    throw err;
  }
  return data || {};
}

exports.handler = function (context, callback) {
  var origin = context.request.headers.origin || '';
  var cors = corsHeaders(origin);

  if (context.request.method === 'OPTIONS') {
    callback(null, { statusCode: 204, headers: cors.headers, body: '' });
    return;
  }
  if (!cors.allowed) {
    callback(null, {
      statusCode: 403,
      headers: cors.headers,
      body: JSON.stringify({ ok: false, scheduled: false, error: 'Origin not allowed.' })
    });
    return;
  }

  var payload = context.request.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
  }
  payload = payload || {};

  var phone = normalizePhone(payload.phone || payload.whatsapp);
  if (!phone.ok) {
    callback(null, {
      statusCode: 400,
      headers: cors.headers,
      body: JSON.stringify({ ok: false, scheduled: false, error: phone.error })
    });
    return;
  }
  if (!CONFIG.apiKey) {
    callback(null, {
      statusCode: 503,
      headers: cors.headers,
      body: JSON.stringify({ ok: false, scheduled: false, error: 'ELEVENLABS_API_KEY is not set on the server.' })
    });
    return;
  }

  var lead = {
    name: String(payload.name || '').trim().slice(0, 120),
    phone: phone.value,
    email: String(payload.email || '').trim().slice(0, 160),
    details: payload.details || '',
    services: payload.services || '',
    estimatedTotal: payload.estimatedTotal || '',
    firstMessage: buildFirstMessage(payload.name, payload.services, payload.estimatedTotal)
  };

  placeCall(lead).then(function (result) {
    callback(null, {
      statusCode: 200,
      headers: cors.headers,
      body: JSON.stringify({
        ok: true,
        scheduled: true,
        conversation_id: result.conversation_id || null,
        call_sid: result.callSid || null
      })
    });
  }).catch(function (error) {
    callback(null, {
      statusCode: 502,
      headers: cors.headers,
      body: JSON.stringify({
        ok: false,
        scheduled: false,
        error: error && error.message ? error.message : 'Call could not be started.'
      })
    });
  });
};
