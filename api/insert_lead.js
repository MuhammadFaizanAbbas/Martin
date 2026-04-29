export default async function handler(req, res) {
  // Basic CORS + preflight (harmless even on same-origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const target = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads';
  const serviceRole =
    process.env.SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;
  const allowedColumns = new Set([
    'id',
    'name',
    'erstberatung_telefon',
    'strasse_objekt',
    'angebot',
    'plz',
    'ort',
    'telefon',
    'email',
    'status',
    'einschaetzung_kunde',
    'lead_quelle',
    'kontakt_via',
    'datum',
    'nachfassen',
    'bearbeiter',
    'delegieren',
    'summe_netto',
    'dachflaeche_m2',
    'dachneigung_grad',
    'dacheindeckung',
    'wunsch_farbe',
    'dachpfanne',
    'baujahr_dach',
    'sale_typ',
  ]);

  function normalizeDecimalInput(value) {
    const cleaned = String(value ?? '')
      .trim()
      .replace(/[^\d,.-]/g, '');

    if (!cleaned) return '';

    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      const decimalSeparator = lastComma > lastDot ? ',' : '.';
      const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
      return cleaned
        .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
        .replace(decimalSeparator, '.');
    }

    if (hasComma) {
      return cleaned.replace(/\./g, '').replace(',', '.');
    }

    return cleaned.replace(/,/g, '');
  }

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var' });
  }

  async function fetchNextLeadId() {
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
    try {
      json = JSON.parse(text);
    } catch {
      json = [];
    }

    const maxId = Array.isArray(json) && json.length ? Number(json[0]?.id) : 0;
    return Number.isFinite(maxId) ? maxId + 1 : 1;
  }

  try {
    // Parse body defensively: Vercel functions may provide raw string
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); }
      catch {
        // Try urlencoded
        const usp = new URLSearchParams(body);
        body = Object.fromEntries(usp.entries());
      }
    }
    if (body == null || typeof body !== 'object') body = {};

    const filteredBody = {};
    const droppedFields = [];
    Object.entries(body).forEach(([key, value]) => {
      if (!allowedColumns.has(key)) {
        droppedFields.push(key);
        return;
      }
      if (value === undefined || value === null) return;
      filteredBody[key] = value;
    });

    if (filteredBody.summe_netto != null && filteredBody.summe_netto !== '') {
      filteredBody.summe_netto = normalizeDecimalInput(filteredBody.summe_netto);
    }

    if (filteredBody.id == null || String(filteredBody.id).trim() === '') {
      filteredBody.id = await fetchNextLeadId();
    }

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'apikey': serviceRole,
        'Authorization': `Bearer ${serviceRole}`,
      },
      body: JSON.stringify(filteredBody),
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

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      status: 'success',
      data: json,
      dropped_fields: droppedFields,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
