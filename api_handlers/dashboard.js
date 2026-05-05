import { getServiceRole } from '../lib/env.js';

export default async function handler(req, res) {
  const target = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads?select=status,summe_netto&order=id.asc';
  const serviceRole = getServiceRole();
  const pageSize = 1000;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!serviceRole) {
    return res.status(500).json({ status: 'error', message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var' });
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
    if (normalized === 'nf beauftragung' || normalized === 'nf beauftragt' || normalized === 'nt beauftragt') return 'NF Beauftragung';
    if (normalized === 'infos eingeholt' || normalized === 'nur info eingeholt') return 'Nur Info eingeholt';
    if (normalized === 'falscher kunde') return 'falscher Kunde';
    if (normalized === 'ghoster') return 'Ghoster';
    if (normalized === 'abgesagt') return 'Abgesagt';
    if (normalized === '1x gesagt tot' || normalized === 'abgesagt tot') return 'Abgesagt tot';
    if (normalized === 'storno' || normalized === 'storniert') return 'Storniert';
    if (normalized === 'außerhalb einzugsgebiet' || normalized === 'ausserhalb einzugsgebiet') return 'Außerhalb Einzugsgebiet';
    return String(status || '').trim();
  }

  try {
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

      rows.push(...json);

      if (json.length < pageSize) break;
      start += pageSize;
    }

    const counts = {
      Offen: 0,
      'in Bearbeitung': 0,
      'follow up': 0,
      'Auftragsbestätigung': 0,
      Beauftragung: 0,
      'EA Beauftragung': 0,
      'NF Beauftragung': 0,
      'Nur Info eingeholt': 0,
      'falscher Kunde': 0,
      Ghoster: 0,
      Abgesagt: 0,
      'Abgesagt tot': 0,
      Storniert: 0,
      'Außerhalb Einzugsgebiet': 0,
    };

    let totalSummeNetto = 0;

    for (const item of rows) {
      const status = getCanonicalStatus(item?.status);
      if (status in counts) {
        counts[status] += 1;
      }
      if (status === 'TNE Offen') {
        counts.Offen += 1;
      }

      const amount = Number.parseFloat(String(item?.summe_netto ?? 0).replace(/[^\d,.-]/g, '').replace(',', '.'));
      if (Number.isFinite(amount)) {
        totalSummeNetto += amount;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.status(200).json({
      status: 'success',
      data: counts,
      total_leads: rows.length,
      total_summe_netto: totalSummeNetto,
      ...counts,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
