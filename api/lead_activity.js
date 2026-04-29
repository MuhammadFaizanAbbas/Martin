export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const targetBase = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/Aktivit%C3%A4tsprotokoll';
  const serviceRole =
    process.env.SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;
  const { lead_id, id } = req.query || {};
  const leadId = String(lead_id || id || '').trim();

  if (!leadId) {
    return res.status(400).json({ status: 'error', message: 'lead_id required' });
  }

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var' });
  }

  const targets = [
    `${targetBase}?select=*&lead_id=eq.${encodeURIComponent(leadId)}`,
    `${targetBase}?select=*&id=eq.${encodeURIComponent(leadId)}`,
  ];
  let lastErrorText = '';

  try {
    for (const target of targets) {
      const response = await fetch(target, {
        headers: {
          Accept: 'application/json',
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
        },
      });

      const text = await response.text();
      if (!response.ok) {
        lastErrorText = text || `Supabase HTTP ${response.status}`;
        continue;
      }

      let json = [];
      try { json = JSON.parse(text); }
      catch {
        return res.status(502).json({ status: 'error', message: 'Supabase sent invalid JSON' });
      }

      if (Array.isArray(json) && json.length) {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60');
        return res.status(200).json(json);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60');
    return res.status(200).json([]);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || lastErrorText || 'Activity fetch failed' });
  }
}
