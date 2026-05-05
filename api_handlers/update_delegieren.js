import { getServiceRole } from '../lib/env.js';

const LEADS_BASE = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!['POST', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'POST, PATCH, OPTIONS');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const serviceRole = getServiceRole();
  if (!serviceRole) {
    return res.status(500).json({
      status: 'error',
      message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    if (body == null || typeof body !== 'object') body = {};

    const bearbeiter = String(body.bearbeiter || '').trim();
    const delegieren = String(body.delegieren || '').trim();

    if (!bearbeiter || !delegieren) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: bearbeiter and delegieren',
      });
    }

    const target = `${LEADS_BASE}?bearbeiter=eq.${encodeURIComponent(bearbeiter)}`;
    const upstream = await fetch(target, {
      method: 'PATCH',
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ delegieren }),
    });

    const text = await upstream.text();
    let payload = [];
    try {
      payload = text ? JSON.parse(text) : [];
    } catch {
      payload = { raw: text };
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        status: 'error',
        message: payload?.message || payload?.raw || `Supabase HTTP ${upstream.status}`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: payload,
      updated: Array.isArray(payload) ? payload.length : 0,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
