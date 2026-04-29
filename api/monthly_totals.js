export default async function handler(req, res) {
  const target =
    'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads?select=bearbeiter,summe_netto,datum,created_at&order=datum.asc';
  const serviceRole = process.env.SERVICE_ROLE;
  const pageSize = 1000;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE env var' });
  }

  function getBearbeiter() {
    if (req.method === 'GET') {
      return String(req.query?.bearbeiter || 'Alle').trim() || 'Alle';
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch {
        body = Object.fromEntries(new URLSearchParams(body).entries());
      }
    }
    return String(body?.bearbeiter || 'Alle').trim() || 'Alle';
  }

  function isMissing(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return !normalized || normalized === 'null' || normalized === 'undefined' || normalized === '—' || normalized === '-';
  }

  function parseAmount(value) {
    if (isMissing(value)) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const cleaned = String(value).trim().replace(/[€$\s]/g, '');
    if (/,(\d{1,2})$/.test(cleaned)) {
      return Number.parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return Number.parseFloat(cleaned.replace(/,/g, '')) || 0;
  }

  function monthFromRow(row) {
    const raw = String(row?.datum || row?.created_at || '').trim();
    const match = raw.match(/^(\d{4}-\d{2})/);
    if (!match) return '';
    const [year, month] = match[1].split('-').map(Number);
    if (year < 1900 || month < 1 || month > 12) return '';
    return match[1];
  }

  try {
    const selectedBearbeiter = getBearbeiter();
    const rows = [];
    let start = 0;

    while (true) {
      const end = start + pageSize - 1;
      const response = await fetch(target, {
        headers: {
          Accept: 'application/json',
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          Range: `${start}-${end}`,
          'Range-Unit': 'items',
        },
      });

      const text = await response.text();
      if (!response.ok) {
        return res.status(response.status).json({ status: 'error', message: text || `Supabase HTTP ${response.status}` });
      }

      let batch;
      try {
        batch = JSON.parse(text);
      } catch {
        return res.status(502).json({ status: 'error', message: 'Supabase sent invalid JSON' });
      }

      if (!Array.isArray(batch)) {
        return res.status(502).json({ status: 'error', message: 'Supabase returned unexpected response shape' });
      }

      rows.push(...batch);
      if (batch.length < pageSize) break;
      start += pageSize;
    }

    const totals = new Map();
    for (const row of rows) {
      const bearbeiter = String(row?.bearbeiter ?? '').trim();
      if (selectedBearbeiter !== 'Alle' && bearbeiter !== selectedBearbeiter) continue;

      const month = monthFromRow(row);
      if (!month) continue;
      totals.set(month, (totals.get(month) || 0) + parseAmount(row?.summe_netto));
    }

    const data = [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({
        label,
        month: label,
        value,
        total: value,
        summe_netto: value,
      }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
