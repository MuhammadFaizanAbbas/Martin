export default async function handler(req, res) {
  const target = 'https://goarrow.ai/test/fetch_all_leads.php';
  try {
    const r = await fetch(target, { headers: { Accept: 'application/json' } });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch (e) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).json({ status: 'error', message: 'Upstream sent invalid JSON' });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(json);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
