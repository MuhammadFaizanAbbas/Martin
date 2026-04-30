import { getServiceRole } from '../lib/env.js';

const SUPABASE_AUTH_BASE = 'https://bmnxecoddcxcwvqukujh.supabase.co/auth/v1';

function jsonResponse(res, status, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function mapAuthUser(user) {
  const meta = user?.user_metadata || {};
  const fullName = String(meta.name || meta.full_name || '').trim();
  const [firstName = '', ...rest] = fullName.split(/\s+/).filter(Boolean);

  return {
    id: user?.id,
    vorname: String(meta.vorname || meta.first_name || firstName || '').trim(),
    nachname: String(meta.nachname || meta.last_name || rest.join(' ') || '').trim(),
    name: fullName,
    email: String(user?.email || '').trim(),
    rolle: String(meta.rolle || meta.role || 'backoffice').trim() || 'backoffice',
    active: !user?.banned_until,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
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

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || body.passwort || '');

    if (!email || !password) {
      return jsonResponse(res, 400, { status: 'error', message: 'Email and password are required' });
    }

    const upstream = await fetch(`${SUPABASE_AUTH_BASE}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const text = await upstream.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; }
    catch { payload = { raw: text }; }

    if (!upstream.ok) {
      return jsonResponse(res, upstream.status, {
        status: 'error',
        message: payload?.msg || payload?.message || payload?.error_description || 'Login failed',
      });
    }

    return jsonResponse(res, 200, {
      status: 'success',
      session: {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_in: payload.expires_in,
        token_type: payload.token_type,
      },
      user: mapAuthUser(payload.user),
    });
  } catch (err) {
    return jsonResponse(res, 500, { status: 'error', message: err.message });
  }
}
