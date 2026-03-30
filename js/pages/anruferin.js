;(() => {
  try {
    if (!window.anruferinPage) {
      console.log('[anruferin] bootstrap: registering stub module');
      window.anruferinPage = {
        init: function(contentEl, titleEl) {
          if (titleEl) {
            titleEl.innerHTML = '<h1>Anruferin</h1><p>Lade Modul…</p>';
            titleEl.style.display = 'block';
          }
          if (contentEl) {
            contentEl.innerHTML = '<div class="card"><div class="card-body">Das Anruferin‑Modul lädt…</div></div>';
          }
        }
      };
      window.callerPage = window.anruferinPage;
      console.log('[anruferin] bootstrap: stub registered', !!window.anruferinPage);
    }
  } catch (e) {
    // ignore bootstrap errors
  }
})();
const anruferinPage = (function () {
  let contentArea = null;
  let titleEl = null;

  // ── API ──────────────────────────────────────────────────────────────────
  const DIRECT_URL = 'https://goarrow.ai/test/fetch_calls.php';
  const SAME_ORIGIN_API = '/api/calls';
  // Fixed CORS proxy URL format
  const PROXY_URL = 'https://corsproxy.io/?' + encodeURIComponent(DIRECT_URL);
  // Alternative proxy if the above doesn't work
  const ALT_PROXY_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(DIRECT_URL);

  let calls = [];

  // ── NORMALISE: works with any key style the server returns ───────────────
  function normalise(raw) {
    return {
      name:      String(raw.name      ?? raw.caller_name    ?? raw.callerName    ?? 'Unbekannt'),
      time:      String(raw.time      ?? raw.call_time       ?? raw.callTime      ?? ''),
      direction: String(raw.direction ?? raw.call_direction  ?? raw.callDirection ?? ''),
      status:    String(raw.status    ?? raw.call_status     ?? raw.callStatus    ?? 'Unknown'),
      ringSec:   Number(raw.ringSec   ?? raw.ring_sec        ?? raw.ringSeconds   ?? 0),
      talkSec:   Number(raw.talkSec   ?? raw.talk_sec        ?? raw.talkSeconds   ?? 0),
      cost:      Number(raw.cost      ?? raw.call_cost       ?? raw.callCost      ?? 0),
    };
  }

  // ── Parse whatever the server returns ────────────────────────────────────
  async function parseResponse(res) {
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error('Server hat kein gültiges JSON gesendet.'); }
    const list = Array.isArray(json)
      ? json
      : (json.data ?? json.calls ?? json.records ?? json.results ?? []);
    if (!Array.isArray(list))
      throw new Error('API hat keine Liste zurückgegeben.');
    if (list.length === 0)
      console.warn('API hat eine leere Liste zurückgegeben.');
    return list.map(normalise);
  }

  // ── FETCH: try direct → try proxy → try alternative proxy ─────────────────
  async function loadCalls() {
    showLoading(true);
    setStatus('', '');

    let data = null;
    let errMsg = '';

    const attempts = [
      { label: 'same-origin', fn: async () => fetch(SAME_ORIGIN_API, { headers: { Accept: 'application/json' } }) },
      { label: 'direkt',      fn: async () => fetch(DIRECT_URL,        { headers: { Accept: 'application/json' }, mode: 'cors' }) },
      { label: 'CORS-Proxy',  fn: async () => fetch(PROXY_URL,         { headers: { Accept: 'application/json' } }) },
      { label: 'alternativ',  fn: async () => fetch(ALT_PROXY_URL,     { headers: { Accept: 'application/json' } }) },
    ];

    for (const a of attempts) {
      try {
        const res = await a.fn();
        data = await parseResponse(res);
        setStatus(a.label === 'same-origin' ? 'success' : (a.label === 'direkt' ? 'success' : 'warning'),
          `✅ ${data.length} Anrufe geladen (${a.label})`);
        break;
      } catch (err) {
        errMsg = err.message;
        console.warn(`Fetch fehlgeschlagen (${a.label}), versuche nächsten…`, err.message);
      }
    }

    if (data && data.length > 0) {
      calls = data;
    } else {
      calls = [];
      setStatus('error', `❌ Fehler: ${errMsg}`);
    }

    showLoading(false);
    renderTable();
  }

  // ── Show call details in modal ───────────────────────────────────────────
  function showCallDetails(call) {
    // Remove existing modal if any
    const existingModal = document.getElementById('callDetailsModal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'callDetailsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Anrufdetails</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <strong>Name:</strong> <span>${call.name}</span>
          </div>
          <div class="detail-row">
            <strong>Zeit:</strong> <span>${formatTime(call.time)}</span>
          </div>
          <div class="detail-row">
            <strong>Richtung:</strong> <span>${call.direction === 'Inbound' ? '📥 Eingehend' : call.direction === 'Outbound' ? '📤 Ausgehend' : call.direction || '—'}</span>
          </div>
          <div class="detail-row">
            <strong>Status:</strong> <span class="status-badge ${getStatusClass(call.status)}">${call.status}</span>
          </div>
          <div class="detail-row">
            <strong>Klingelzeit:</strong> <span>${call.ringSec} Sekunden</span>
          </div>
          <div class="detail-row">
            <strong>Gesprächsdauer:</strong> <span>${call.talkSec} Sekunden</span>
          </div>
          <div class="detail-row">
            <strong>Kosten:</strong> <span class="${call.cost > 0 ? 'cost-positive' : ''}">${call.cost.toFixed(4)} €</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add close functionality
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  // ── HTML ──────────────────────────────────────────────────────────────────
  function getHTML() {
    return `
      <div class="anruferin-container">
        <div class="page-header">
          <div class="page-title">Anruferin / Callcenter</div>
          <div class="filter-bar">
            <input type="text" id="searchInput" class="filter-input" placeholder="🔍 Name / Nummer filtern">
            <select id="statusFilter" class="filter-select">
              <option value="all">Alle Status</option>
              <option value="Answered">Beantwortet</option>
              <option value="Unanswered">Unanswered</option>
              <option value="Redirected">Redirected</option>
 

            </select>
            <button id="refreshBtn" class="refresh-btn">🔄 Aktualisieren</button>
          </div>
          <div id="apiStatusBar" class="api-status-bar" style="display:none;"></div>
        </div>

        <div class="call-table-container">
          <table class="call-table">
            <thead>
              <tr>
                <th>Anrufname</th>
                <th>Anrufzeit</th>
                <th>Richtung</th>
                <th>Status</th>
                <th>Klingende Sek.</th>
                <th>Sprechende Sek.</th>
                <th>Kosten</th>
                <th>Sicht</th>
              </tr>
            </thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
      </div>`;
  }

  // ── STYLES ────────────────────────────────────────────────────────────────
  function addStyles() {
    if (document.getElementById('anruferin-styles')) return;
    const s = document.createElement('style');
    s.id = 'anruferin-styles';
    s.textContent = `
      .anruferin-container{width:100%}
      .page-header{margin-bottom:24px}
      .page-title{font-size:1.8rem;font-weight:700;color:#0f172a;margin-bottom:20px}
      .filter-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
      .filter-input{padding:10px 16px;border:1px solid #e2e8f0;border-radius:40px;font-size:.9rem;width:250px;background:#fff}
      .filter-select{padding:10px 16px;border:1px solid #e2e8f0;border-radius:40px;background:#fff;font-size:.9rem;cursor:pointer}
      .refresh-btn{padding:10px 18px;border:1px solid #e2e8f0;border-radius:40px;background:#fff;font-size:.85rem;cursor:pointer;transition:background .2s}
      .refresh-btn:hover{background:#f1f5f9}
      .refresh-btn:disabled{opacity:.5;cursor:not-allowed}
      .stats-badge{background:#f1f5f9;padding:8px 16px;border-radius:40px;font-size:.85rem;font-weight:500;color:#334155}
      .api-status-bar{margin-top:12px;padding:10px 16px;border-radius:10px;font-size:.82rem;font-weight:500}
      .api-status-bar.success{background:#dcfce7;color:#166534}
      .api-status-bar.warning{background:#fef3c7;color:#92400e}
      .api-status-bar.error{background:#fee2e2;color:#991b1b}
      .loading-row td{text-align:center;padding:50px 20px;color:#64748b}
      .spinner{display:inline-block;width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px}
      @keyframes spin{to{transform:rotate(360deg)}}
      .call-table-container{background:#fff;border-radius:20px;border:1px solid #eef2f8;overflow-x:auto}
      .call-table{width:100%;border-collapse:collapse;min-width:900px}
      .call-table th{text-align:left;padding:16px 12px;background:#f8fafc;color:#475569;font-weight:600;font-size:.8rem;border-bottom:1px solid #e2e8f0}
      .call-table td{padding:12px;border-bottom:1px solid #f1f5f9;font-size:.85rem}
      .call-table tr:hover{background:#f8fafc}
      .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.7rem;font-weight:500}
      .status-answered{background:#dcfce7;color:#166534}
      .status-unanswered{background:#fee2e2;color:#991b1b}
      .status-redirected{background:#fef3c7;color:#92400e}
      .cost-positive{color:#10b981;font-weight:600}
      .act-btn{background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;color:#64748b;transition:all .2s}
      .act-btn:hover{background:#f1f5f9;color:#3b82f6}
      
      /* Modal styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
      }
      
      .modal-content {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        animation: slideUp 0.3s ease;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #0f172a;
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #64748b;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
      }
      
      .modal-close:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
      
      .modal-body {
        padding: 24px;
      }
      
      .detail-row {
        padding: 12px 0;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .detail-row:last-child {
        border-bottom: none;
      }
      
      .detail-row strong {
        color: #475569;
        font-weight: 600;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @media(max-width:768px){
        .filter-bar{flex-direction:column;align-items:stretch}
        .filter-input{width:100%}
      }
    `;
    document.head.appendChild(s);
  }

  // ── UI HELPERS ────────────────────────────────────────────────────────────
  function showLoading(on) {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.disabled = on;
    if (on) {
      const tb = document.getElementById('tableBody');
      if (tb) tb.innerHTML = `<tr class="loading-row"><td colspan="8"><span class="spinner"></span>Daten werden geladen…</td></tr>`;
    }
  }

  function setStatus(type, html) {
    const bar = document.getElementById('apiStatusBar');
    if (!bar) return;
    if (!type) { bar.style.display = 'none'; return; }
    bar.className = `api-status-bar ${type}`;
    bar.innerHTML = html;
    bar.style.display = 'block';
    if (type === 'success') setTimeout(() => { 
      if (bar.style.display === 'block') bar.style.display = 'none'; 
    }, 5000);
  }

  function getStatusClass(s) {
    if (s === 'Answered')   return 'status-answered';
    if (s === 'Unanswered') return 'status-unanswered';
    if (s === 'Redirected') return 'status-redirected';
    return '';
  }

  function formatTime(t) {
    if (!t) return '—';
    const d = new Date(t);
    return isNaN(d) ? t : d.toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  // ── RENDER TABLE ──────────────────────────────────────────────────────────
  function renderTable() {
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const status = document.getElementById('statusFilter')?.value || 'all';
    const tbody  = document.getElementById('tableBody');
    if (!tbody) return;

    const filtered = calls.filter(c =>
      c.name.toLowerCase().includes(search) &&
      (status === 'all' || c.status === status)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px">
        ${calls.length === 0 ? '❌ Keine Daten – API prüfen' : '🔍 Keine Anrufe gefunden'}
      </td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((c, index) => {
      const dir = c.direction === 'Inbound'  ? '📥 Eingehend'
                : c.direction === 'Outbound' ? '📤 Ausgehend'
                : c.direction || '—';
      return `
        <tr data-index="${index}">
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${formatTime(c.time)}</td>
          <td>${dir}</td>
          <td><span class="status-badge ${getStatusClass(c.status)}">${c.status}</span></td>
          <td>${c.ringSec} sec</td>
          <td>${c.talkSec} sec</td>
          <td class="${c.cost > 0 ? 'cost-positive' : ''}">${c.cost.toFixed(4)} €</td>
          <td>
            <button class="act-btn view-details-btn" data-name="${escapeHtml(c.name)}" data-time="${c.time}" data-direction="${c.direction}" data-status="${c.status}" data-ringsec="${c.ringSec}" data-talksec="${c.talkSec}" data-cost="${c.cost}" title="Details">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Add event listeners to all view details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const callData = {
          name: btn.dataset.name,
          time: btn.dataset.time,
          direction: btn.dataset.direction,
          status: btn.dataset.status,
          ringSec: parseInt(btn.dataset.ringsec),
          talkSec: parseInt(btn.dataset.talksec),
          cost: parseFloat(btn.dataset.cost)
        };
        showCallDetails(callData);
      });
    });
  }

  // Helper function to escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl     = titleElement;

    addStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Anruferin</h1><p>Eingehende & ausgehende Anrufe</p>`;
      titleEl.style.display = 'block';
    }

    if (contentArea) {
      contentArea.innerHTML = getHTML();
      document.getElementById('searchInput')?.addEventListener('input',  renderTable);
      document.getElementById('statusFilter')?.addEventListener('change', renderTable);
      document.getElementById('refreshBtn')?.addEventListener('click',  loadCalls);
      loadCalls();
    }
  }

  return { init, reload: loadCalls };
})();

window.anruferinPage = anruferinPage;
console.log('[anruferin] full module registered', !!window.anruferinPage);
// Alias for English route naming
window.callerPage = window.anruferinPage;
console.log('anruferin.js loaded');