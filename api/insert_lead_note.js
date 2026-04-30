import { getServiceRole } from '../lib/env.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Use POST to insert a lead note.',
      required_fields: ['lead_id', 'text'],
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({
      status: 'error',
      message: 'Method Not Allowed',
      allowed_methods: ['GET', 'POST', 'OPTIONS'],
    });
  }

  const target = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads_notizen';
  const serviceRole = getServiceRole();

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var' });
  }

  async function fetchNextNoteId() {
    const idLookupUrl = `${target}?select=id&order=id.desc&limit=1`;
    const response = await fetch(idLookupUrl, {
      headers: {
        Accept: 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Supabase HTTP ${response.status}`);
    }

    let json = [];
    try { json = JSON.parse(text); }
    catch { json = []; }

    const maxId = Array.isArray(json) && json.length ? Number(json[0]?.id) : 0;
    return Number.isFinite(maxId) ? maxId + 1 : 1;
  }

  function formatSupabaseDateTime(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  async function leadExists(leadId) {
    const lookupUrl =
      `https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads?select=id&id=eq.${encodeURIComponent(leadId)}&limit=1`;
    const response = await fetch(lookupUrl, {
      headers: {
        Accept: 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Supabase HTTP ${response.status}`);
    }

    let json = [];
    try { json = JSON.parse(text); }
    catch { json = []; }

    return Array.isArray(json) && json.length > 0;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); }
      catch {
        const usp = new URLSearchParams(body);
        body = Object.fromEntries(usp.entries());
      }
    }
    if (body == null || typeof body !== 'object') body = {};

    const payload = {
      id: String(body.id || '').trim(),
      lead_id: String(body.lead_id || body.id || '').trim(),
      note: String(body.note || body.text || '').trim(),
      created_at: String(body.created_at || '').trim(),
      created_by: String(body.created_by || body.author || body.user || '').trim(),
    };

    if (!payload.lead_id || !payload.note) {
      return res.status(400).json({ status: 'error', message: 'lead_id and note are required' });
    }

    if (!payload.id) {
      payload.id = await fetchNextNoteId();
    }

    if (!payload.created_at) {
      payload.created_at = formatSupabaseDateTime();
    }

    const exists = await leadExists(payload.lead_id);
    if (!exists) {
      return res.status(400).json({
        status: 'error',
        message: `Lead ${payload.lead_id} existiert nicht in Supabase 'leads'. Notiz kann nicht gespeichert werden.`,
      });
    }

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        "apikey": serviceRole,
        "Authorization": `Bearer ${serviceRole}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        status: 'error',
        message: text || `Supabase HTTP ${upstream.status}`,
      });
    }
    let json;
    try { json = JSON.parse(text); }
    catch { json = { status: 'success', raw: text }; }

    return res.status(200).json({ status: 'success', data: json });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
