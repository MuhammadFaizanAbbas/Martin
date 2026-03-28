const berichtePage = (function () {

  // ── Sample data (same shape as leadsData in leads.js) ──────────────────────
  const rawData = [
    { status: "Abgesagt",                quelle: "Google",       summe: 3200,  jahr: 2025 },
    { status: "Abgesagt hat",            quelle: "Google",       summe: 7100,  jahr: 2025 },
    { status: "Abgesagt hat",            quelle: "Facebook",     summe: 5400,  jahr: 2024 },
    { status: "Abgesagt hat",            quelle: "Empfehlung",   summe: 6600,  jahr: 2025 },
    { status: "angebot",                 quelle: "Bing",         summe: 1200,  jahr: 2025 },
    { status: "Aufnahme Einzugsgebiet",  quelle: "ChatGPT",      summe: 900,   jahr: 2024 },
    { status: "Beauftrag!",              quelle: "Empfehlung",   summe: 2100,  jahr: 2025 },
    { status: "Beauftragung",            quelle: "Google",       summe: 4300,  jahr: 2025 },
    { status: "EA Beauftragung",         quelle: "Google",       summe: 800,   jahr: 2024 },
    { status: "EA Beauftragung",         quelle: "Facebook",     summe: 1350,  jahr: 2025 },
    { status: "falscher Kunde",          quelle: "Flyer",        summe: 600,   jahr: 2024 },
    { status: "follow up",               quelle: "Instagram",    summe: 3900,  jahr: 2025 },
    { status: "Ghostet",                 quelle: "Empfehlung",   summe: 1100,  jahr: 2025 },
    { status: "In Bearbeitung",          quelle: "Google",       summe: 2800,  jahr: 2025 },
    { status: "In Bearbeitung",          quelle: "Google",       summe: 1900,  jahr: 2024 },
    { status: "In Bearbeitung",          quelle: "MA Baustelle", summe: 4500,  jahr: 2025 },
    { status: "In Bearbeitung - angebot",quelle: "MA Baustelle", summe: 3300,  jahr: 2025 },
    { status: "In Bearbeitung - Preisanforderung", quelle: "Niemand", summe: 700, jahr: 2024 },
    { status: "Infos abgerufen",         quelle: "Bing",         summe: 500,   jahr: 2025 },
    { status: "NF Beauftragung",         quelle: "Google",       summe: 1800,  jahr: 2025 },
    { status: "NF Beauftragung",         quelle: "Facebook",     summe: 2200,  jahr: 2025 },
    { status: "Nur Info eingeholt",      quelle: "ChatGPT",      summe: 1600,  jahr: 2024 },
    { status: "Offen",                   quelle: "Empfehlung",   summe: 950,   jahr: 2025 },
    { status: "Sonstiges",               quelle: "Flyer",        summe: 300,   jahr: 2024 },
    { status: "2025",                    quelle: "Benutzerdienst",summe: 1400, jahr: 2025 },
    { status: "2024",                    quelle: "Ausweichung",  summe: 1700,  jahr: 2024 },
  ];

  let currentFilter = 'Alle';
  let qChart = null;
  let qBarChart = null;
  let sChart = null;
  let sBarChart = null;
  let gChart = null;

  const COLORS = [
    '#2d7a3a','#4caf50','#81c784','#a5d6a7','#388e3c',
    '#f9a825','#ffca28','#f06292','#ab47bc','#7986cb',
    '#4dd0e1','#ff7043','#26a69a','#ec407a','#42a5f5',
    '#8d6e63','#90a4ae','#66bb6a','#ffa726','#26c6da',
  ];

  // ── Filter helper ─────────────────────────────────────────────────────────
  function filtered() {
    if (currentFilter === 'Alle') return rawData;
    return rawData.filter(d => String(d.jahr) === currentFilter);
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

      <!-- Year filter -->
      <div class="b-filter-row">
        <select class="b-select" id="b-year-filter">
          <option value="Alle">Alle</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
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

      <!-- Summe Netto -->
      <div class="b-summe-header">
        <div class="b-section-title" style="margin-bottom:0">Summe Netto</div>
        <select class="b-select" id="b-summe-filter">
          <option value="">Wählen Sie eine Option sume...</option>
          <option value="quelle">Nach Quelle</option>
          <option value="status">Nach Status</option>
        </select>
      </div>
      <div class="b-card b-card-fullwidth" id="summe-chart-wrap" style="display:none">
        <canvas id="summeChart" height="110"></canvas>
      </div>
      <div id="summe-empty" class="b-empty-state">Bitte wählen Sie eine Option aus.</div>
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
    const sel = document.getElementById('b-summe-filter')?.value;
    const wrap  = document.getElementById('summe-chart-wrap');
    const empty = document.getElementById('summe-empty');
    const ctx   = document.getElementById('summeChart');
    if (!wrap || !empty || !ctx) return;

    if (!sel) {
      wrap.style.display  = 'none';
      empty.style.display = 'block';
      return;
    }

    wrap.style.display  = 'block';
    empty.style.display = 'none';

    const data = filtered();
    const grouped = sumBy(data, sel === 'quelle' ? 'quelle' : 'status');
    const labels = Object.keys(grouped);
    const vals   = labels.map(k => grouped[k]);

    // destroy previous summe chart if any
    if (ctx._chart) ctx._chart.destroy();
    const cfg = makeBarConfig(labels, vals, '#2d7a3a');
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

    loadChartJs(() => {
      drawCharts();

      // Year filter
      document.getElementById('b-year-filter')?.addEventListener('change', (e) => {
        currentFilter = e.target.value;
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
console.log('berichte.js loaded - window.berichtePage exists:', !!window.berichtePage);