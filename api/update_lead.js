export default async function handler(req, res) {
  // Basic CORS + preflight support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const target = 'https://goarrow.ai/test/update_lead.php';

  try {
    // Parse JSON body if sent as a string
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); }
      catch {
        const usp = new URLSearchParams(body);
        body = Object.fromEntries(usp.entries());
      }
    }
    if (body == null || typeof body !== 'object') body = {};

    const params = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });

    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); }
    catch { json = { status: 'success', raw: text }; }

    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
