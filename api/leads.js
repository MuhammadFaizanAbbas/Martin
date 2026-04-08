export default async function handler(req, res) {
  const targets = [
    'https://goarrow.ai/test/fetch_all_leads.php',
    'https://goarrow.ai/test/fetch_lead.php',
  ];
  try {
    let lastError = null;

    for (const target of targets) {
      try {
        const r = await fetch(target, { headers: { Accept: 'application/json' } });
        const text = await r.text();
        let json;

        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error('Upstream sent invalid JSON');
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(200).json(json);
      } catch (err) {
        lastError = err;
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({
      status: 'error',
      message: lastError?.message || 'All lead upstreams failed',
    });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
