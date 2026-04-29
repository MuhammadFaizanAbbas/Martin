export default async function handler(req, res) {
  const targetBase = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads_notizen';
  const serviceRole =
    process.env.SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;
  const { lead_id, id } = req.query || {};
  const leadId = lead_id || id;
  if (!leadId) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ status: 'error', message: 'lead_id required' });
  }

  if (!serviceRole) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var' });
  }

  const target = `${targetBase}?select=*&lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc.nullslast`;
  try {
    const r = await fetch(target, {
      headers: {
        Accept: 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    });
    const text = await r.text();
    if (!r.ok) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(r.status).json({ status: 'error', message: text || `Supabase HTTP ${r.status}` });
    }
    let json;
    try { json = JSON.parse(text); }
    catch {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).json({ status: 'error', message: 'Supabase sent invalid JSON' });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60');
    return res.status(200).json(json);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
