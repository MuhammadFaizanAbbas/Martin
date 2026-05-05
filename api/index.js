import applyCommission from '../api_handlers/apply_commission.js';
import authUsers from '../api_handlers/auth_users.js';
import calls from '../api_handlers/calls.js';
import commissions from '../api_handlers/commissions.js';
import dashboard from '../api_handlers/dashboard.js';
import insertActivity from '../api_handlers/insert_activity.js';
import insertLead from '../api_handlers/insert_lead.js';
import insertLeadNote from '../api_handlers/insert_lead_note.js';
import leads from '../api_handlers/leads.js';
import leadActivity from '../api_handlers/lead_activity.js';
import leadNotes from '../api_handlers/lead_notes.js';
import monthlyTotals from '../api_handlers/monthly_totals.js';
import updateDelegieren from '../api_handlers/update_delegieren.js';
import updateLead from '../api_handlers/update_lead.js';

const handlers = {
  apply_commission: applyCommission,
  auth_users: authUsers,
  calls,
  commissions,
  dashboard,
  insert_activity: insertActivity,
  insert_lead: insertLead,
  insert_lead_note: insertLeadNote,
  leads,
  lead_activity: leadActivity,
  lead_notes: leadNotes,
  monthly_totals: monthlyTotals,
  update_delegieren: updateDelegieren,
  update_lead: updateLead,
};

function getRouteName(req) {
  const queryPath = req.query?.path;
  if (typeof queryPath === 'string' && queryPath.trim()) {
    return queryPath.split('/')[0];
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  const apiIndex = parts.indexOf('api');
  return apiIndex >= 0 ? parts[apiIndex + 1] : parts[0];
}

export default async function handler(req, res) {
  const routeName = getRouteName(req);
  const routeHandler = handlers[routeName];

  if (!routeHandler) {
    return res.status(404).json({
      status: 'error',
      message: `API route not found: ${routeName || '/'}`,
    });
  }

  return routeHandler(req, res);
}
