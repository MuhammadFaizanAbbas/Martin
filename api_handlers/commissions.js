import { getServiceRole } from '../lib/env.js';

const SUPABASE_BASE = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1';
const COMMISSIONS_BASE = `${SUPABASE_BASE}/commissions`;
const LEADS_BASE = `${SUPABASE_BASE}/leads`;
const MITARBEITER_BASE = `${SUPABASE_BASE}/mitarbeiter`;

function json(res, status, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  let payload = [];
  try {
    payload = text ? JSON.parse(text) : [];
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.raw || `Supabase HTTP ${response.status}`);
  }

  return payload;
}

function getAgentName(mitarbeiter) {
  const directName = String(mitarbeiter?.name || '').trim();
  if (directName) return directName;

  const splitName = [mitarbeiter?.vorname, mitarbeiter?.nachname]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (splitName) return splitName;

  const altName = [mitarbeiter?.first_name, mitarbeiter?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (altName) return altName;

  return String(mitarbeiter?.email || '').trim() || 'Unbekannt';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return json(res, 405, { status: 'error', message: 'Method Not Allowed' });
  }

  const serviceRole = getServiceRole();
  if (!serviceRole) {
    return json(res, 500, {
      status: 'error',
      message: 'Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var',
    });
  }

  try {
    const headers = {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      Accept: 'application/json',
    };

    const [commissionRows, leadRows, mitarbeiterRows] = await Promise.all([
      fetchJson(
        `${COMMISSIONS_BASE}?select=*&order=created_at.desc.nullslast,id.desc`,
        headers,
      ),
      fetchJson(`${LEADS_BASE}?select=id,name,summe_netto,commission`, headers),
      fetchJson(`${MITARBEITER_BASE}?select=id,name,email`, headers),
    ]);

    const leadMap = new Map(
      (Array.isArray(leadRows) ? leadRows : []).map((lead) => [String(lead.id), lead]),
    );
    const mitarbeiterMap = new Map(
      (Array.isArray(mitarbeiterRows) ? mitarbeiterRows : []).map((item) => [String(item.id), item]),
    );

    const items = (Array.isArray(commissionRows) ? commissionRows : []).map((row) => {
      const lead = leadMap.get(String(row.lead_id)) || {};
      const mitarbeiter = mitarbeiterMap.get(String(row.created_by)) || {};
      const agentName = getAgentName(mitarbeiter);

      return {
        id: row.id,
        lead_id: row.lead_id,
        contract_type: row.contract_type,
        price_tag: row.price_tag,
        rate_applied: row.rate_applied,
        net_order_value: row.net_order_value,
        commission_amount: row.commission_amount,
        status: row.status,
        created_at: row.created_at,
        created_by: row.created_by,
        agent: agentName,
        agent_email: mitarbeiter.email || '',
        client: lead.name || `Lead #${row.lead_id}`,
        lead_commission: lead.commission,
        summe_netto: lead.summe_netto,
      };
    });

    return json(res, 200, { status: 'success', items });
  } catch (error) {
    return json(res, 500, {
      status: 'error',
      message: error?.message || 'Unable to load commissions',
    });
  }
}
