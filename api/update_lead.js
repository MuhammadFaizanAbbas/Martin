export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const target = 'https://goarrow.ai/test/update_lead.php';

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
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

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(json);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
