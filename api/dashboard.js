export default async function handler(req, res) {
  const target = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads?select=status';
  const serviceRole = process.env.SERVICE_ROLE;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE env var' });
  }

  function normalizeStatusValue(status) {
    return String(status || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function getCanonicalStatus(status) {
    const normalized = normalizeStatusValue(status);
    if (!normalized) return '';
    if (normalized === 'follow up') return 'follow up';
    if (normalized === 'offen') return 'Offen';
    if (normalized === 'tne offen') return 'TNE Offen';
    if (normalized === 'in bearbeitung') return 'in Bearbeitung';
    if (
      normalized === 'auftragsbestätigung' ||
      normalized === 'auftragsbestätigung-offen' ||
      normalized === 'auftragsbestätigung-in bearbeitung' ||
      normalized === 'auftragsbestätigung-follow up' ||
      normalized === 'auftragsbestätigung-ea beauftragung' ||
      normalized === 'auftragsbestätigung-beauftragung' ||
      normalized === 'auftragsbestätigung-nf beauftragung' ||
      normalized === 'auftragsbestatigung' ||
      normalized === 'auftragsbestatigung-offen' ||
      normalized === 'auftragsbestatigung-in bearbeitung' ||
      normalized === 'auftragsbestatigung-follow up' ||
      normalized === 'auftragsbestatigung-ea beauftragung' ||
      normalized === 'auftragsbestatigung-beauftragung' ||
      normalized === 'auftragsbestatigung-nf beauftragung'
    ) {
      return 'Auftragsbestätigung';
    }
    if (normalized === 'beauftragung') return 'Beauftragung';
    if (normalized === 'ea beauftragung' || normalized === 'ea beauftragt') return 'EA Beauftragung';
    if (normalized === 'nf beauftragung' || normalized === 'nf beauftragt') return 'NF Beauftragung';
    return String(status || '').trim();
  }

  try {
    const response = await fetch(target, {
      headers: {
        Accept: 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Supabase HTTP ${response.status}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      return res.status(502).json({ status: 'error', message: 'Upstream sent invalid JSON' });
    }

    if (!Array.isArray(json)) {
      return res.status(502).json({ status: 'error', message: 'Unexpected response shape from Supabase' });
    }

    const counts = {
      Offen: 0,
      'in Bearbeitung': 0,
      'follow up': 0,
      Auftragsbestätigung: 0,
      Beauftragung: 0,
      'EA Beauftragung': 0,
      'NF Beauftragung': 0,
    };

    for (const item of json) {
      const status = getCanonicalStatus(item?.status);
      if (status in counts) {
        counts[status] += 1;
      }
      if (status === 'TNE Offen') {
        counts.Offen += 1;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(counts);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
