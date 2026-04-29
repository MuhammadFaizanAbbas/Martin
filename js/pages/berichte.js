const berichtePage = (function () {

  // Live data populated from API
  let rawData = [];

  // Same-origin first, fallback remote
  // const SO_LEADS = '/api/all_leads';
  // const REMOTE_LEADS_URL = 'https://goarrow.ai/test/fetch_all_leads.php';

  const SO_LEADS = '/api/all_leads';
  const REMOTE_LEADS_URL = 'https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads?select=created_at,monat,summe_netto,bearbeiter,lead_quelle,status';

  async function fetchLeadsForReports() {
    const tryFetch = async (url) => {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };

    const PROXY1 = `https://corsproxy.io/?${encodeURIComponent(REMOTE_LEADS_URL)}`;
    const PROXY2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(REMOTE_LEADS_URL)}`;

    const isLocalStatic = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    const candidates = isLocalStatic
      ? [PROXY1, PROXY2, REMOTE_LEADS_URL, SO_LEADS]
      : [SO_LEADS, REMOTE_LEADS_URL, PROXY1, PROXY2];

    let data = null;
    const errors = [];
    for (const url of candidates) {
      try { data = await tryFetch(url); break; }
      catch (e) { errors.push(`${url}: ${e.message}`); }
    }
    if (!data) {
      console.warn('Berichte fetch failed. Tried ->', errors.join(' | '));
      return [];
    }

    const list = Array.isArray(data) ? data : (data.data || data.leads || data.items || []);
    return (list || []).map(item => ({
      status: item.status || 'Offen',
      quelle: item.lead_quelle || '—',
      summe: parseFloat(String(item.summe_netto || '0').replace(/[€$\s]/g,'').replace(/\./g,'').replace(/,/g,'.')) || 0,
      bearbeiter: item.bearbeiter || '—',
      monat: String(item.created_at || item.datum || '').slice(0,7)
    }));
  }

  let currentFilter = 'Alle';
  let qChart = null;
  let qBarChart = null;
  let sChart = null;
  let sBarChart = null;
  let gChart = null;
  let monthlyTotals = [];

  const COLORS = [
    '#2d7a3a','#4caf50','#81c784','#a5d6a7','#388e3c',
    '#f9a825','#ffca28','#f06292','#ab47bc','#7986cb',
    '#4dd0e1','#ff7043','#26a69a','#ec407a','#42a5f5',
    '#8d6e63','#90a4ae','#66bb6a','#ffa726','#26c6da',
  ];

  // ── Filter helper ─────────────────────────────────────────────────────────
  function filtered() {
    if (currentFilter === 'Alle') return rawData;
    return rawData.filter(d => (d.bearbeiter || '—') === currentFilter);
  }

  // ── Group by key ──────────────────────────────────────────────────────────
  function groupBy(arr, key) {
    return arr.reduce((acc, d) => {
      acc[d[key]] = (acc[d[key]] || 0) + 1;
      return acc;
    }, {});
  }

  function sumBy(arr, key) {
    return arr.reduce((acc, d) => {
      acc[d[key]] = (acc[d[key]] || 0) + d.summe;
      return acc;
    }, {});
  }

  // ── HTML ──────────────────────────────────────────────────────────────────
  const getHTML = () => `
    <div class="berichte-container">
      <div class="berichte-header">
        <div class="berichte-title-block">
          <div class="berichte-title">Berichte und Analysen</div>
          <div class="berichte-sub">Umfassende Geschäftseinblicke und Datenexporte</div>
        </div>
      </div>

      <!-- Bearbeiter filter -->
      <div class="b-filter-row">
        <select class="b-select" id="b-year-filter">
          <option value="Alle">Alle</option>
          <option value="Philipp">Philipp</option>
          <option value="Martin">Martin</option>
          <option value="André">André</option>
          <option value="Simon">Simon</option>
        </select>
      </div>

      <!-- Gesamtzusammenfassung -->
      <div class="b-section-title">Gesamtzusammenfassung</div>
      <div class="b-card b-card-fullwidth">
        <canvas id="gesamtChart" height="110"></canvas>
      </div>

      <!-- Performance nach Quelle -->
      <div class="b-section-title">Performance nach Quelle</div>
      <div class="b-card b-two-col">
        <div class="b-donut-wrap">
          <canvas id="quelleDonut"></canvas>
        </div>
        <div class="b-bar-wrap">
          <canvas id="quelleBar" height="200"></canvas>
        </div>
      </div>

      <!-- Status-Übersicht -->
      <div class="b-section-title">Status-Übersicht</div>
      <div class="b-card b-two-col">
        <div class="b-donut-wrap">
          <canvas id="statusDonut"></canvas>
        </div>
        <div class="b-bar-wrap">
          <canvas id="statusBar" height="200"></canvas>
        </div>
      </div>

      <!-- Summe Netto (Monatswerte) -->
      <div class="b-summe-header">
        <div class="b-section-title" style="margin-bottom:0">Summe Netto</div>
        <select class="b-select" id="b-summe-filter">
          <option value="">Wählen Sie eine Option sume...</option>
<<<<<<< HEAD
=======
          <option value="Alle">Alle</option>
>>>>>>> eb17abbedcf4a8620a0783e7b569e410f0cbe9c7
          <option value="2025-01">2025-01</option>
          <option value="2025-02">2025-02</option>
          <option value="2025-03">2025-03</option>
          <option value="2025-04">2025-04</option>
          <option value="2025-05">2025-05</option>
          <option value="2025-06">2025-06</option>
<<<<<<< HEAD
          <option value="2025-07">2025-07</option>
=======
>>>>>>> eb17abbedcf4a8620a0783e7b569e410f0cbe9c7
          <option value="2025-08">2025-08</option>
          <option value="2025-09">2025-09</option>
          <option value="2025-10">2025-10</option>
          <option value="2025-11">2025-11</option>
          <option value="2025-12">2025-12</option>
<<<<<<< HEAD
           <option value="2025-11">2025-11</option>
          <option value="2026-01">2026-01</option>
          <option value="2026-02">2026-02</option>
          <option value="2026-03">2025-03</option>
          <option value="2026-04">2025-04</option>
          <option value="2026-05">2025-05</option>
          <option value="2026-06">2025-05</option>
=======
          <option value="2026-01">2026-01</option>
          <option value="2026-02">2026-02</option>
          <option value="2026-03">2026-03</option>
          <option value="2026-04">2026-04</option>
          <option value="2026-05">2026-05</option>
          <option value="2026-06">2026-06</option>
          <option value="2027-07">2027-07</option>
>>>>>>> eb17abbedcf4a8620a0783e7b569e410f0cbe9c7
        </select>
      </div>
      <div class="b-card b-card-fullwidth" id="summe-chart-wrap" style="display:none">
        <canvas id="summeChart" height="110"></canvas>
      </div>
      <div id="summe-empty" class="b-empty-state">Keine Daten verfügbar.</div>
    </div>
  `;

  // ── CSS ───────────────────────────────────────────────────────────────────
  function addStyles() {
    if (document.getElementById('berichte-styles')) return;
    const s = document.createElement('style');
    s.id = 'berichte-styles';
    s.textContent = `
      .berichte-container { width: 100%; padding-bottom: 60px; }

      .berichte-header { margin-bottom: 24px; }
      .berichte-title {
        font-size: 1.45rem;
        font-weight: 700;
        color: #0f172a;
      }
      .berichte-sub {
        font-size: 0.85rem;
        color: #64748b;
        margin-top: 3px;
      }

      .b-filter-row { margin-bottom: 28px; }

      .b-select {
        padding: 8px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        font-size: 0.85rem;
        color: #334155;
        cursor: pointer;
        min-width: 160px;
      }

      .b-section-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        margin: 36px 0 16px;
      }

      .b-card {
        background: white;
        border: 1px solid #e8edf4;
        border-radius: 16px;
        padding: 24px;
      }

      .b-card-fullwidth { width: 100%; box-sizing: border-box; overflow-x: auto; }

      .b-two-col {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }

      .b-donut-wrap {
        flex: 0 0 240px;
        height: 240px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .b-bar-wrap {
        flex: 1;
        min-width: 0;
        overflow-x: auto;
      }

      .b-summe-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 36px;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;
      }

      .b-empty-state {
        color: #94a3b8;
        font-size: 0.9rem;
        padding: 32px 0;
        text-align: center;
      }

      @media (max-width: 700px) {
        .b-two-col { flex-direction: column; }
        .b-donut-wrap { flex: 0 0 200px; height: 200px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Load Chart.js dynamically ─────────────────────────────────────────────
  function loadChartJs(cb) {
    if (window.Chart) { cb(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.onload = cb;
    document.head.appendChild(script);
  }

  // ── Monthly totals fetch (Summe Netto) ───────────────────────────────────
  async function fetchMonthlyTotals(bearbeiter = 'Alle') {
    const SO = '/api/monthly_totals';
    const REMOTE = 'https://goarrow.ai/test/fetch_monthly_totals.php';
    const PROXY1 = `https://corsproxy.io/?${encodeURIComponent(REMOTE)}`;

    const tryPostJson = async (url, body, timeoutMs = 2500) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
          cache: 'no-store',
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } finally { clearTimeout(t); }
    };

    const tryPostForm = async (url, body, timeoutMs = 2500) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const params = new URLSearchParams();
        Object.entries(body).forEach(([k,v]) => params.append(k, v ?? ''));
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: params.toString(),
          cache: 'no-store',
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } finally { clearTimeout(t); }
    };

    const isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    const candidates = isLocal
      ? [() => tryPostForm(PROXY1, { bearbeiter }), () => tryPostForm(REMOTE, { bearbeiter }), () => tryPostJson(SO, { bearbeiter })]
      : [() => tryPostJson(SO, { bearbeiter }), () => tryPostForm(REMOTE, { bearbeiter }), () => tryPostForm(PROXY1, { bearbeiter })];

    let data = null; const errs = [];
    for (const fn of candidates) {
      try { data = await fn(); break; } catch (e) { errs.push(e.message); }
    }
    if (!data) { console.warn('Monthly totals fetch failed:', errs.join(' | ')); return []; }
    const list = Array.isArray(data) ? data : (data.data || data.items || data.totals || []);

    const toNumber = (val) => {
      if (typeof val === 'number' && isFinite(val)) return val;
      const s = String(val ?? '0').trim().replace(/[€\s]/g, '');
      // If string ends with ",dd" it's EU decimal with thousand dots
      if (/,\d{1,2}$/.test(s) && s.includes('.')) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
      }
      // Otherwise, treat commas as thousand separators and keep '.' decimals
      return parseFloat(s.replace(/,/g, '')) || 0;
    };

    return (list || []).map(x => {
      const label = x.month || x.monat || x.label || x.date || x.period || '';
      const rawVal = x.total ?? x.sum ?? x.summe ?? x.summe_netto ?? 0;
      const value = toNumber(rawVal);
      return { label: String(label), value };
    });
  }

  function populateMonthsDropdown() {
    const sel = document.getElementById('b-summe-filter');
    if (!sel) return;
    const current = sel.value || '';

    // Helper to build a continuous YYYY-MM range
    const monthRange = (startYM, endYM) => {
      const out = [];
      const [sy, sm] = startYM.split('-').map(n => parseInt(n, 10));
      const [ey, em] = endYM.split('-').map(n => parseInt(n, 10));
      if (!sy || !sm || !ey || !em) return out;
      let y = sy, m = sm;
      while (y < ey || (y === ey && m <= em)) {
        out.push(`${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}`);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
      return out;
    };

    // If Bearbeiter is "Alle", disable month selection entirely
    if (currentFilter === 'Alle') {
      sel.innerHTML = '<option value="">Wählen Sie eine Option sume...</option>';
      sel.value = '';
      sel.disabled = true;
      // Also hide the chart/empty message via drawSumme()
      return;
    }

    let labels = [];
    if (Array.isArray(monthlyTotals) && monthlyTotals.length) {
      const apiMonths = monthlyTotals.map(m => String(m.label)).filter(Boolean);
      labels = Array.from(new Set(apiMonths)).sort();
    }
    if (!labels.length) {
      // Build from available data (respect current Bearbeiter)
      const scope = (currentFilter === 'Alle')
        ? rawData
        : rawData.filter(d => (d.bearbeiter || '—') === currentFilter);
      const months = scope.map(d => String(d.monat || '').slice(0,7)).filter(Boolean);
      const uniq = Array.from(new Set(months)).sort();
      if (uniq.length) {
        const min = uniq[0];
        const max = uniq[uniq.length - 1];
        labels = monthRange(min, max);
      } else {
        labels = [];
      }
    }

    // Rebuild options: placeholder + Alle + months
    sel.innerHTML = [
      '<option value="">Wählen Sie eine Option sume...</option>',
      '<option value="Alle">Alle</option>',
      ...labels.map(m => `<option value="${m}">${m}</option>`)
    ].join('');

    // Restore selection if still present
    if (current && Array.from(sel.options).some(o => o.value === current)) {
      sel.value = current;
    }
    sel.disabled = false;
  }

  // ── Chart helpers ─────────────────────────────────────────────────────────
  function destroyAll() {
    [qChart, qBarChart, sChart, sBarChart, gChart].forEach(c => c && c.destroy());
    qChart = qBarChart = sChart = sBarChart = gChart = null;
  }

  function makeBarConfig(labels, values, color = '#2d7a3a') {
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: color,
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              maxRotation: 90,
              minRotation: 45,
              font: { size: 10 },
              color: '#64748b'
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 10 }, color: '#64748b' },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    };
  }

  function makeDonutConfig(labels, values) {
    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed}`
            }
          }
        }
      }
    };
  }

  // ── Draw all charts ───────────────────────────────────────────────────────
  function drawCharts() {
    destroyAll();
    const data = filtered();

    // ── 1. Gesamtzusammenfassung (status count bar) ──
    const statusCount = groupBy(data, 'status');
    const gLabels = Object.keys(statusCount);
    const gVals   = gLabels.map(k => statusCount[k]);
    const gCtx = document.getElementById('gesamtChart');
    if (gCtx) {
      const cfg = makeBarConfig(gLabels, gVals, '#2d7a3a');
      cfg.options.maintainAspectRatio = false;
      gCtx.parentElement.style.height = '280px';
      gChart = new Chart(gCtx, cfg);
    }

    // ── 2. Performance nach Quelle ──
    const quelleCount = groupBy(data, 'quelle');
    const qLabels = Object.keys(quelleCount);
    const qVals   = qLabels.map(k => quelleCount[k]);

    const qDonutCtx = document.getElementById('quelleDonut');
    if (qDonutCtx) qChart = new Chart(qDonutCtx, makeDonutConfig(qLabels, qVals));

    const qBarCtx = document.getElementById('quelleBar');
    if (qBarCtx) {
      const cfg = makeBarConfig(qLabels, qVals, '#b0bec5');
      cfg.options.maintainAspectRatio = false;
      qBarCtx.parentElement.style.minHeight = '220px';
      qBarChart = new Chart(qBarCtx, cfg);
    }

    // ── 3. Status-Übersicht ──
    const sLabels = Object.keys(statusCount);
    const sVals   = sLabels.map(k => statusCount[k]);

    const sDonutCtx = document.getElementById('statusDonut');
    if (sDonutCtx) sChart = new Chart(sDonutCtx, makeDonutConfig(sLabels, sVals));

    const sBarCtx = document.getElementById('statusBar');
    if (sBarCtx) {
      const cfg = makeBarConfig(sLabels, sVals, '#2d7a3a');
      cfg.options.maintainAspectRatio = false;
      sBarCtx.parentElement.style.minHeight = '220px';
      sBarChart = new Chart(sBarCtx, cfg);
    }

    // ── 4. Summe Netto – depends on dropdown ──
    drawSumme();
  }

  function drawSumme() {
    const sel = document.getElementById('b-summe-filter')?.value || '';
    const wrap  = document.getElementById('summe-chart-wrap');
    const empty = document.getElementById('summe-empty');
    const ctx   = document.getElementById('summeChart');
    if (!wrap || !empty || !ctx) return;

    // If Bearbeiter = Alle OR no month selected, show nothing
    if (currentFilter === 'Alle' || !sel) { wrap.style.display='none'; empty.style.display='block'; return; }

    // Helpers
    function monthRange(startYM, endYM) {
      const out = [];
      const [sy, sm] = startYM.split('-').map(n => parseInt(n, 10));
      const [ey, em] = endYM.split('-').map(n => parseInt(n, 10));
      if (!sy || !sm || !ey || !em) return out;
      let y = sy, m = sm;
      while (y < ey || (y === ey && m <= em)) {
        out.push(`${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}`);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
      return out;
    }

    // Build month labels helper (API preferred)
    const apiMonths = Array.isArray(monthlyTotals) ? monthlyTotals.map(m => String(m.label)).filter(Boolean) : [];
    let fullRangeLabels = Array.from(new Set(apiMonths)).sort();
    if (!fullRangeLabels.length) {
      const base = (currentFilter === 'Alle') ? rawData : rawData.filter(d => (d.bearbeiter || '—') === currentFilter);
      const months = base.map(d => String(d.monat || '').slice(0,7)).filter(Boolean);
      const uniq = Array.from(new Set(months)).sort();
      if (uniq.length) {
        const min = uniq[0];
        const max = uniq[uniq.length - 1];
        fullRangeLabels = monthRange(min, max);
      } else {
        fullRangeLabels = [];
      }
    }

    // Fast lookup map for API totals
    const apiMap = new Map((monthlyTotals || []).map(m => [String(m.label), Number(m.value || m.total || 0)]));

    let labels = [];
    let vals = [];

    // Person selected: prefer API totals; fallback to leads
    const useApi = apiMap.size > 0;
    if (sel === 'Alle') {
      labels = fullRangeLabels;
      if (useApi) {
        vals = labels.map(m => Number(apiMap.get(m) || 0));
      } else {
        const personLeads = rawData.filter(d => (d.bearbeiter || '—') === currentFilter);
        vals = labels.map(mon => {
          const list = personLeads.filter(d => (d.monat || '').startsWith(mon));
          return list.reduce((acc, d) => acc + (d.summe || 0), 0);
        });
      }
    } else {
      labels = [sel];
      if (useApi) {
        vals = [Number(apiMap.get(sel) || 0)];
      } else {
        const personLeads = rawData.filter(d => (d.bearbeiter || '—') === currentFilter);
        const list = personLeads.filter(d => (d.monat || '').startsWith(sel));
        vals = [list.reduce((acc, d) => acc + (d.summe || 0), 0)];
      }
    }

    wrap.style.display  = 'block';
    empty.style.display = 'none';

    // destroy previous summe chart if any
    if (ctx._chart) ctx._chart.destroy();
    const cfg = makeBarConfig(labels, vals, '#2d7a3a');
    // Fixed y-axis slab: 200k, 400k, 600k, ... without year restriction
    const step = 200000;
    const maxVal = Math.max(0, ...vals);
    const suggestedMax = Math.ceil((maxVal + step) / step) * step;
    cfg.options.scales.y.ticks.stepSize = step;
    cfg.options.scales.y.suggestedMax = suggestedMax;
    cfg.options.maintainAspectRatio = false;
    ctx.parentElement.style.height = '280px';
    ctx._chart = new Chart(ctx, cfg);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(contentEl, titleEl) {
    addStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Berichte</h1><p>Berichte und Analysen</p>`;
      titleEl.style.display = 'block';
    }

    if (!contentEl) return;
    contentEl.innerHTML = getHTML();

    loadChartJs(async () => {
      // Load live data
      rawData = await fetchLeadsForReports();
      // Also fetch monthly totals (per-Bearbeiter, POST)
      try {
        monthlyTotals = await fetchMonthlyTotals('Alle');
      } catch (_) { monthlyTotals = []; }
      currentFilter = 'Alle';
      const ddl = document.getElementById('b-year-filter');
      if (ddl) ddl.value = 'Alle';
      // If monthly totals exist, prefer those to populate month dropdown
      try { populateMonthsDropdown(); } catch (_) {}
      drawCharts();
      // Summe Netto renders once a month and specific Bearbeiter are selected

      // Bearbeiter filter
      document.getElementById('b-year-filter')?.addEventListener('change', async (e) => {
        currentFilter = e.target.value || 'Alle';
        // Refresh monthly totals for the selected Bearbeiter and repopulate months
        try {
          monthlyTotals = await fetchMonthlyTotals(currentFilter);
        } catch (_) { monthlyTotals = []; }
        populateMonthsDropdown();
        // If a person is selected, auto-select 'Alle' in the month dropdown
        const mSel = document.getElementById('b-summe-filter');
        if (mSel) {
          if (currentFilter === 'Alle') {
            mSel.value = '';
          } else if ([...mSel.options].some(o => o.value === 'Alle')) {
            mSel.value = 'Alle';
          }
        }
        drawCharts();
      });

      // Summe dropdown
      document.getElementById('b-summe-filter')?.addEventListener('change', drawSumme);
    });

    console.log('✅ Berichte page loaded');
  }

  return { init };
})();

window.berichtePage = berichtePage;
// Alias for English route naming
window.reportsPage = window.berichtePage;
console.log('berichte.js loaded - window.berichtePage exists:', !!window.berichtePage);