export default async function handler(req, res) {
  const supabaseUrl = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads?select=*&order=id.asc';
  const serviceRole =
    process.env.SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;
  const pageSize = 1000;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var' });
  }

  try {
    const allRows = [];
    let start = 0;

    while (true) {
      const end = start + pageSize - 1;
      const r = await fetch(supabaseUrl, {
        headers: {
          Accept: 'application/json',
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          Range: `${start}-${end}`,
          'Range-Unit': 'items',
        },
      });
      const text = await r.text();
      if (!r.ok) {
        return res.status(r.status).json({ status: 'error', message: text || `Supabase HTTP ${r.status}` });
      }

      let batch;
      try {
        batch = JSON.parse(text);
      } catch (e) {
        return res.status(502).json({ status: 'error', message: 'Supabase sent invalid JSON' });
      }

      if (!Array.isArray(batch)) {
        return res.status(502).json({ status: 'error', message: 'Supabase returned unexpected response shape' });
      }

      allRows.push(...batch);

      if (batch.length < pageSize) {
        break;
      }

      start += pageSize;
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(allRows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
