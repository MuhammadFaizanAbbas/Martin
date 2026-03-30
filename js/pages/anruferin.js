const anruferinPage = (function () {
  let contentArea = null;
  let titleEl = null;

  // ── API ──────────────────────────────────────────────────────────────────
  const DIRECT_URL = 'https://goarrow.ai/test/fetch_calls.php';
  // Public CORS proxy — used automatically if direct call fails
  const PROXY_URL  = `https://corsproxy.io/?${encodeURIComponent(DIRECT_URL)}`;

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
    if (!Array.isArray(list) || list.length === 0)
      throw new Error('API hat eine leere Liste zurückgegeben.');
    return list.map(normalise);
  }

  // ── FETCH: try direct → try proxy ─────────────────────────────────────
  async function loadCalls() {
    showLoading(true);
    setStatus('', '');

    let data = null;
    let errMsg = '';

    // 1️⃣ Direct GET
    try {
      const res = await fetch(DIRECT_URL, {
        method:  'GET',
        headers: { Accept: 'application/json' },
        mode:    'cors',
      });
      data = await parseResponse(res);
      setStatus('success', `✅ ${data.length} Anrufe geladen (direkt)`);
    } catch (e1) {
      errMsg = e1.message;
      console.warn('Direct fetch fehlgeschlagen, versuche Proxy…', e1.message);

      // 2️⃣ CORS Proxy fallback
      try {
        const res = await fetch(PROXY_URL, {
          method:  'GET',
          headers: { Accept: 'application/json' },
        });
        data = await parseResponse(res);
        setStatus('warning', `✅ ${data.length} Anrufe geladen (via CORS-Proxy). Bitte CORS-Header auf dem Server hinzufügen.`);
      } catch (e2) {
        errMsg = e2.message;
        console.error('Proxy fetch ebenfalls fehlgeschlagen:', e2.message);
      }
    }

    if (data) {
      calls = data;
    } else {
      calls = [];
      setStatus('error', `❌ Fehler: ${errMsg}`);
    }

    showLoading(false);
    renderTable();
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
            <div class="stats-badge" id="callCountBadge">📞 —</div>
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
    if (type === 'success') setTimeout(() => { bar.style.display = 'none'; }, 5000);
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

    const badge = document.getElementById('callCountBadge');
    if (badge) badge.innerHTML = `📞 ${filtered.length} / ${calls.length} Anrufe`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px">
        ${calls.length === 0 ? '❌ Keine Daten – API prüfen' : '🔍 Keine Anrufe gefunden'}
      </td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      const dir = c.direction === 'Inbound'  ? '📥 Eingehend'
                : c.direction === 'Outbound' ? '📤 Ausgehend'
                : c.direction || '—';
      return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${formatTime(c.time)}</td>
          <td>${dir}</td>
          <td><span class="status-badge ${getStatusClass(c.status)}">${c.status}</span></td>
          <td>${c.ringSec} sec</td>
          <td>${c.talkSec} sec</td>
          <td class="${c.cost > 0 ? 'cost-positive' : ''}">${c.cost.toFixed(4)} €</td>
          <td>
            <button class="act-btn" title="Details">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </td>
        </tr>`;
    }).join('');
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
      document.getElementById('searchInput') ?.addEventListener('input',  renderTable);
      document.getElementById('statusFilter')?.addEventListener('change', renderTable);
      document.getElementById('refreshBtn')  ?.addEventListener('click',  loadCalls);
      loadCalls();
    }
  }

  return { init, reload: loadCalls };
})();

window.anruferinPage = anruferinPage;
console.log('anruferin.js loaded');