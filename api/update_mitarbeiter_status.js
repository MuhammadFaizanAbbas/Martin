import { getServiceRole } from '../lib/env.js';

const TARGET_BASE = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/mitarbeiter';

function jsonResponse(res, status, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!['PATCH', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'PATCH, POST, OPTIONS');
    return jsonResponse(res, 405, { status: 'error', message: 'Method Not Allowed' });
  }

  const serviceRole = getServiceRole();
  if (!serviceRole) {
    return jsonResponse(res, 500, { status: 'error', message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); }
      catch { body = Object.fromEntries(new URLSearchParams(body).entries()); }
    }
    if (!body || typeof body !== 'object') body = {};

    const email = String(body.email || req.query?.email || '').trim().toLowerCase();
    const active = body.aktiv ?? body.active;

    if (!email || typeof active !== 'boolean') {
      return jsonResponse(res, 400, { status: 'error', message: 'email and aktiv boolean are required' });
    }

    const target = `${TARGET_BASE}?email=eq.${encodeURIComponent(email)}`;
    const upstream = await fetch(target, {
      method: 'PATCH',
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ aktiv: active }),
    });

    const text = await upstream.text();
    let payload = [];
    try { payload = text ? JSON.parse(text) : []; }
    catch { payload = { raw: text }; }

    if (!upstream.ok) {
      return jsonResponse(res, upstream.status, {
        status: 'error',
        message: payload?.message || payload?.raw || `Supabase HTTP ${upstream.status}`,
      });
    }

    return jsonResponse(res, 200, { status: 'success', data: payload });
  } catch (err) {
    return jsonResponse(res, 500, { status: 'error', message: err.message });
  }
}
