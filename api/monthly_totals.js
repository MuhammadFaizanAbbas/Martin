export default async function handler(req, res) {
  const target = 'https://goarrow.ai/test/fetch_monthly_totals.php';

  // CORS preflight support for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // Accept JSON or form input; extract bearbeiter
    let bearbeiter = 'Alle';
    if (req.method === 'POST') {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
        bearbeiter = body.bearbeiter ?? 'Alle';
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        let body = req.body;
        if (typeof body === 'string') {
          const p = new URLSearchParams(body);
          body = Object.fromEntries(p.entries());
        }
        body = body ?? {};
        bearbeiter = body.bearbeiter ?? 'Alle';
      }
    }

    // Forward to upstream as application/x-www-form-urlencoded via POST
    const params = new URLSearchParams();
    params.append('bearbeiter', String(bearbeiter));
    const r = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: params.toString(),
    });

    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch (e) {
      return res.status(502).json({ status: 'error', message: 'Upstream sent invalid JSON' });
    }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}