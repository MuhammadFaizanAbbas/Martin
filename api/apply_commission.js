import { getServiceRole } from '../lib/env.js';

const SUPABASE_BASE = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1';
const LEADS_BASE = `${SUPABASE_BASE}/leads`;
const COMMISSION_RATES_BASE = `${SUPABASE_BASE}/commission_rates`;
const COMMISSIONS_BASE = `${SUPABASE_BASE}/commissions`;
const MITARBEITER_BASE = `${SUPABASE_BASE}/mitarbeiter`;

function json(res, status, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function parseAmount(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const normalized = raw.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error_description || payload?.raw || `Supabase HTTP ${response.status}`);
  }

  return payload;
}

async function getMitarbeiterIdByEmail(email, headers) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;
  const url = `${MITARBEITER_BASE}?select=id&email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`;
  const rows = await fetchJson(url, { headers });
  return Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
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
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const leadId = String(body?.lead_id || body?.id || '').trim();
    const contractType = String(body?.contract_type || '').trim().toUpperCase();
    const priceTag = String(body?.price_tag || '').trim().toUpperCase();
    const createdByEmail = String(body?.created_by_email || '').trim().toLowerCase();

    if (!leadId || !contractType || !priceTag) {
      return json(res, 400, {
        status: 'error',
        message: 'lead_id, contract_type and price_tag are required',
      });
    }

    const headers = {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const today = new Date().toISOString().slice(0, 10);

    const rateUrl =
      `${COMMISSION_RATES_BASE}?contract_type=eq.${encodeURIComponent(contractType)}` +
      `&price_tag=eq.${encodeURIComponent(priceTag)}` +
      `&effective_from=lte.${encodeURIComponent(today)}` +
      `&order=effective_from.desc&limit=1`;
    const rateRows = await fetchJson(rateUrl, { headers });
    const selectedRate = Array.isArray(rateRows) ? rateRows[0] : null;
    if (!selectedRate || selectedRate.rate == null) {
      throw new Error(`No commission rate found for ${contractType} / ${priceTag}`);
    }

    const leadUrl = `${LEADS_BASE}?id=eq.${encodeURIComponent(leadId)}&select=id,summe_netto&limit=1`;
    const leadRows = await fetchJson(leadUrl, { headers });
    const lead = Array.isArray(leadRows) ? leadRows[0] : null;
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    const netOrderValue = round2(parseAmount(lead.summe_netto));
    const rateApplied = round2(Number(selectedRate.rate));
    const commissionAmount = round2((netOrderValue * rateApplied) / 100);
    const createdBy = await getMitarbeiterIdByEmail(createdByEmail, headers);

    const commissionPayload = {
      lead_id: Number(lead.id),
      contract_type: contractType,
      price_tag: priceTag,
      rate_applied: rateApplied,
      net_order_value: netOrderValue,
      commission_amount: commissionAmount,
      status: 'active',
      ...(createdBy ? { created_by: createdBy } : {}),
    };

    const auditRows = await fetchJson(COMMISSIONS_BASE, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(commissionPayload),
    });

    const leadPatchRows = await fetchJson(`${LEADS_BASE}?id=eq.${encodeURIComponent(leadId)}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ commission: commissionAmount }),
    });

    return json(res, 200, {
      status: 'success',
      rate: selectedRate,
      lead: {
        id: lead.id,
        summe_netto: lead.summe_netto,
        net_order_value: netOrderValue,
      },
      commission: {
        contract_type: contractType,
        price_tag: priceTag,
        rate_applied: rateApplied,
        commission_amount: commissionAmount,
        created_by: createdBy,
      },
      audit: auditRows,
      lead_update: leadPatchRows,
    });
  } catch (error) {
    return json(res, error?.status || 500, {
      status: 'error',
      message: error?.message || 'Commission apply failed',
    });
  }
}
