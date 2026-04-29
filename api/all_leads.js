export default async function handler(req, res) {
  const supabaseUrl = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads?select=*&order=id.asc';
  const serviceRole = process.env.SERVICE_ROLE;
  const pageSize = 1000;

  if (!serviceRole) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE env var' });
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
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(r.status).json({ status: 'error', message: text || `Supabase HTTP ${r.status}` });
      }

      let batch;
      try {
        batch = JSON.parse(text);
      } catch (e) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(502).json({ status: 'error', message: 'Supabase sent invalid JSON' });
      }

      if (!Array.isArray(batch)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(502).json({ status: 'error', message: 'Supabase returned unexpected response shape' });
      }

      allRows.push(...batch);

      if (batch.length < pageSize) {
        break;
      }

      start += pageSize;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(allRows);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
