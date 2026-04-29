export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Use POST to insert an activity.',
      required_fields: ['lead_id', 'description'],
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const target = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/Aktivit%C3%A4tsprotokoll';
  const serviceRole = process.env.SERVICE_ROLE;

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE env var' });
  }

  async function fetchNextActivityId() {
    const lookupUrl = `${target}?select=id&order=id.desc&limit=1`;
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

    const maxId = Array.isArray(json) && json.length ? Number(json[0]?.id) : 0;
    return Number.isFinite(maxId) ? maxId + 1 : 1;
  }

  function compactPayload(payload) {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    );
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

  async function tryInsert(payload) {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      const error = new Error(text || `Supabase HTTP ${upstream.status}`);
      error.status = upstream.status;
      throw error;
    }

    let json;
    try { json = JSON.parse(text); }
    catch { json = { status: 'success', raw: text }; }
    return json;
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

    const actor = String(body.from || body.user || body.author || body.created_by || 'System').trim() || 'System';
    const leadId = String(body.lead_id || body.id || '').trim();
    const description = String(
      body.description ||
      body.activity_text ||
      body.activity ||
      body.text ||
      body.message ||
      ''
    ).trim();
    if (!leadId || !description) {
      return res.status(400).json({ status: 'error', message: 'lead_id and description are required' });
    }

    const exists = await leadExists(leadId);
    if (!exists) {
      return res.status(400).json({
        status: 'error',
        message: `Lead ${leadId} existiert nicht in Supabase 'leads'. Aktivität kann nicht gespeichert werden.`,
      });
    }

    const nextId = await fetchNextActivityId();

    const payloadVariants = [
      compactPayload({
        id: nextId,
        lead_id: leadId,
        description,
        created_by: actor,
      }),
      compactPayload({
        id: nextId,
        lead_id: leadId,
        description,
        created_by: actor,
        from: actor,
        user: actor,
      }),
      compactPayload({
        id: nextId,
        lead_id: leadId,
        description,
        from: actor,
      }),
      compactPayload({
        id: nextId,
        lead_id: leadId,
        description,
      }),
    ];

    let lastError = null;
    for (const variant of payloadVariants) {
      try {
        const result = await tryInsert(variant);
        return res.status(200).json({ status: 'success', data: result });
      } catch (err) {
        lastError = err;
      }
    }

    return res.status(lastError?.status || 500).json({
      status: 'error',
      message: lastError?.message || 'Activity insert failed',
      attempted_payloads: payloadVariants,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
