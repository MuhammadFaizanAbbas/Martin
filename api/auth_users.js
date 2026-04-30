import { getEnvValue, getServiceRole } from '../lib/env.js';

const SUPABASE_AUTH_BASE = 'https://bmnxecoddcxcwvqukujh.supabase.co/auth/v1';

function jsonResponse(res, status, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return { vorname: parts.shift() || '', nachname: parts.join(' ') };
}

function mapAuthUser(user) {
  const meta = user?.user_metadata || {};
  const fullName = String(meta.name || meta.full_name || '').trim();
  const fallbackName = splitName(fullName);
  return {
    id: user?.id,
    vorname: String(meta.vorname || meta.first_name || fallbackName.vorname || '').trim(),
    nachname: String(meta.nachname || meta.last_name || fallbackName.nachname || '').trim(),
    email: String(user?.email || '').trim(),
    passwort: '********',
    rolle: String(meta.rolle || meta.role || 'backoffice').trim() || 'backoffice',
    kurz: String(meta.kurz || '').trim(),
    telefon: String(meta.telefon || '').trim(),
    active: !user?.banned_until,
    delegatedTo: String(meta.delegatedTo || '').trim(),
  };
}

function buildMetadata(body) {
  const vorname = String(body.vorname || body.first_name || '').trim();
  const nachname = String(body.nachname || body.last_name || '').trim();
  const name = String(body.name || [vorname, nachname].filter(Boolean).join(' ')).trim();
  const rolle = String(body.rolle || body.role || 'backoffice').trim() || 'backoffice';
  const kurz = String(
    body.kurz ||
    `${vorname.charAt(0)}${nachname.charAt(0) || vorname.charAt(1) || ''}`.toUpperCase() ||
    'MS'
  ).trim();

  return {
    name,
    full_name: name,
    vorname,
    nachname,
    first_name: vorname,
    last_name: nachname,
    rolle,
    role: rolle,
    kurz,
    telefon: String(body.telefon || '').trim(),
    delegatedTo: String(body.delegatedTo || '').trim(),
  };
}

async function signupRequest(body) {
  const apiKey = getEnvValue('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'ANON_KEY') || getServiceRole();
  if (!apiKey) {
    const error = new Error('Missing SUPABASE_ANON_KEY or SERVICE_ROLE env var');
    error.status = 500;
    throw error;
  }

  const response = await fetch(`${SUPABASE_AUTH_BASE}/signup`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; }
  catch { payload = { raw: text }; }

  if (!response.ok) {
    const error = new Error(payload?.msg || payload?.message || payload?.error_description || `Supabase Auth HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function authRequest(path, options = {}) {
  const serviceRole = getServiceRole();
  if (!serviceRole) {
    const error = new Error('Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var');
    error.status = 500;
    throw error;
  }

  const response = await fetch(`${SUPABASE_AUTH_BASE}${path}`, {
    ...options,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; }
  catch { payload = { raw: text }; }

  if (!response.ok) {
    const error = new Error(payload?.msg || payload?.message || payload?.error_description || `Supabase Auth HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); }
      catch { body = Object.fromEntries(new URLSearchParams(body).entries()); }
    }
    if (!body || typeof body !== 'object') body = {};

    if (req.method === 'GET') {
      const payload = await authRequest('/admin/users?page=1&per_page=1000');
      const users = (payload.users || []).map(mapAuthUser);
      return jsonResponse(res, 200, { status: 'success', data: users, users });
    }

    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || body.passwort || '').trim();
      const metadata = buildMetadata(body);

      if (!email || !password || !metadata.vorname) {
        return jsonResponse(res, 400, { status: 'error', message: 'vorname, email and password are required' });
      }

      const created = await signupRequest({
        email,
        password,
        data: {
          name: metadata.name,
          kurz: metadata.kurz,
          rolle: metadata.rolle,
          telefon: metadata.telefon,
          vorname: metadata.vorname,
          nachname: metadata.nachname,
          role: metadata.role,
        },
      });

      return jsonResponse(res, 200, { status: 'success', data: mapAuthUser(created.user), user: mapAuthUser(created.user), session: created.session });
    }

    if (req.method === 'PATCH') {
      const userId = String(body.id || body.user_id || '').trim();
      if (!userId) return jsonResponse(res, 400, { status: 'error', message: 'id is required' });

      const updatePayload = {
        email: body.email ? String(body.email).trim().toLowerCase() : undefined,
        user_metadata: buildMetadata(body),
      };
      if (body.password || body.passwort) updatePayload.password = String(body.password || body.passwort);
      if (body.active === false) updatePayload.ban_duration = '876000h';
      if (body.active === true) updatePayload.ban_duration = 'none';

      Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);

      const updated = await authRequest(`/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });

      return jsonResponse(res, 200, { status: 'success', data: mapAuthUser(updated), user: mapAuthUser(updated) });
    }

    if (req.method === 'DELETE') {
      const userId = String(req.query?.id || body.id || body.user_id || '').trim();
      if (!userId) return jsonResponse(res, 400, { status: 'error', message: 'id is required' });
      await authRequest(`/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      return jsonResponse(res, 200, { status: 'success' });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE, OPTIONS');
    return jsonResponse(res, 405, { status: 'error', message: 'Method Not Allowed' });
  } catch (err) {
    return jsonResponse(res, err.status || 500, { status: 'error', message: err.message, details: err.payload });
  }
}
