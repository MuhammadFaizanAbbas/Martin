export default async function handler(req, res) {
  const targetBase = 'https://goarrow.ai/test/fetch_activity.php';
  const { lead_id, id } = req.query || {};
  const leadId = lead_id || id;
  if (!leadId) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ status: 'error', message: 'lead_id required' });
  }
  const target = `${targetBase}?lead_id=${encodeURIComponent(leadId)}`;
  try {
    const r = await fetch(target, { headers: { Accept: 'application/json' } });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); }
    catch { json = { status: 'success', raw: text }; }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60');
    return res.status(200).json(json);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
