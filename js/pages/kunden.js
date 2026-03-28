const kundenPage = (function () {

  let contentArea = null;
  let titleEl = null;

  // ── Shared leads data ──────────────────────────────────────────────────────
  function getLeadsData() {
    if (window.sharedLeadsData && window.sharedLeadsData.length) return window.sharedLeadsData;
    return [
      { id: 1,  name: "André",             salutation: "",      ort: "Dahlenburg",   status: "Offen",       statusClass: "badge-offen",  quelle: "Google",    bearbeiter: "André",  summe: "$5000.00", datum: "0000-00-00", dachflaeche: "150.00", dacheindeckung: "Beton",   dachalter: "2016", dachpfanne: "Doppel-S Pfanne", farbe: "Anthrazit", dachneigung: "25°", strasse: "Am Beberbusch 8" },
      { id: 2,  name: "Erhand...",          salutation: "Herr",  ort: "Borna",        status: "Offen",       statusClass: "badge-offen",  quelle: "Google",    bearbeiter: "Simon",  summe: "$0.00",    datum: "2026-03-23", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 3,  name: "Erhand...",          salutation: "Herr",  ort: "Borna",        status: "Offen",       statusClass: "badge-offen",  quelle: "Google",    bearbeiter: "Philipp",summe: "$",        datum: "2026-03-23", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 4,  name: "Stefan...",          salutation: "Herr",  ort: "Südharz",      status: "Offen",       statusClass: "badge-offen",  quelle: "Instagram", bearbeiter: "André",  summe: "$",        datum: "2026-03-22", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 5,  name: "Philipp...",         salutation: "Herr",  ort: "Deutsch Evern",status: "Offen",       statusClass: "badge-offen",  quelle: "Google",    bearbeiter: "Martin", summe: "$0.00",    datum: "2026-03-20", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 6,  name: "Test Abdullah",      salutation: "",      ort: "Bremen",       status: "Offen",       statusClass: "badge-offen",  quelle: "ChatGPT",   bearbeiter: "Philipp",summe: "$3400.00", datum: "2026-03-25", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 7,  name: "André...",           salutation: "Herr",  ort: "Stadland",     status: "Offen",       statusClass: "badge-offen",  quelle: "Google",    bearbeiter: "Martin", summe: "$",        datum: "2026-03-19", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 8,  name: "Frau...",            salutation: "Frau",  ort: "Hannover",     status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "Philipp",summe: "$",        datum: "2026-03-19", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 9,  name: "Herr Uwe Harmas",   salutation: "Herr",  ort: "Bleckede",     status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "André",  summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 10, name: "Marius...",          salutation: "Herr",  ort: "Buxtehude",    status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "Martin", summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 11, name: "Nadine Pavlovs",     salutation: "",      ort: "Schwerin",     status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "",       summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 12, name: "Martin...",          salutation: "Herr",  ort: "Jessen",       status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "Philipp",summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 13, name: "Klaus...",           salutation: "Herr",  ort: "Bad...",       status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "André",  summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 14, name: "Mekan...",           salutation: "Herr",  ort: "Detmold",      status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "Martin", summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 15, name: "Herr Jan Pützler",  salutation: "Herr",  ort: "Münster",      status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "",       summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 16, name: "Jendrik Ideler",    salutation: "",      ort: "Beverstedt",   status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "Philipp",summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 17, name: "Robert...",          salutation: "Herr",  ort: "Schwelm",      status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "André",  summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 18, name: "Katja Ritter",      salutation: "",      ort: "Berlin",       status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "Martin", summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 19, name: "Herr...",            salutation: "Herr",  ort: "Hamburg",      status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "",       summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 20, name: "Carsten...",         salutation: "",      ort: "Norderstedt",  status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "Philipp",summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 21, name: "Frau...",            salutation: "Frau",  ort: "Burgdorf",     status: "Offen",       statusClass: "badge-offen",  quelle: "",          bearbeiter: "André",  summe: "$",        datum: "2026-03-18", dachflaeche: "",       dacheindeckung: "",        dachalter: "",     dachpfanne: "",                farbe: "",          dachneigung: "",    strasse: "" },
      { id: 22, name: "Philipp Kruse",     salutation: "Herr",  ort: "Deutsch Evern",status: "follow up",   statusClass: "badge-follow", quelle: "Empfehlung",bearbeiter: "Philip", summe: "€5.500,00",datum: "2024-03-28", dachflaeche: "194",    dacheindeckung: "Beton",   dachalter: "1986", dachpfanne: "Frankfurter Pfanne",farbe: "Anthrazit", dachneigung: "25°", strasse: "Am Brahmbusch 3" },
      { id: 23, name: "Test B",            salutation: "",      ort: "Aremen",       status: "Infos...",    statusClass: "badge-info",   quelle: "Facebook",  bearbeiter: "Philip", summe: "€3.200,00",datum: "2024-03-26", dachflaeche: "160",    dacheindeckung: "Schiefer",dachalter: "1975", dachpfanne: "—",               farbe: "Schwarz",   dachneigung: "28°", strasse: "Birkenweg 5" },
      { id: 24, name: "Test A",            salutation: "",      ort: "Bremen",       status: "Beauftragung",statusClass: "badge-beauft", quelle: "ChatGPT",   bearbeiter: "Philip", summe: "€3.230,00",datum: "2024-03-25", dachflaeche: "175",    dacheindeckung: "Bitumen", dachalter: "2010", dachpfanne: "—",               farbe: "Grau",      dachneigung: "12°", strasse: "Am Hafen 8" },
      { id: 25, name: "EA Lead",           salutation: "Herr",  ort: "München",      status: "EA Beauftragung",statusClass: "badge-beauft",quelle: "Google",   bearbeiter: "André",  summe: "€4.000,00",datum: "2024-03-20", dachflaeche: "200",    dacheindeckung: "Ziegel",  dachalter: "2005", dachpfanne: "Hannoveraner Pfanne",farbe: "Rot",      dachneigung: "30°", strasse: "Hauptstr. 1" },
      { id: 26, name: "NF Lead",           salutation: "Frau",  ort: "Berlin",       status: "NF Beauftragt",statusClass: "badge-beauft", quelle: "Empfehlung",bearbeiter: "Philip", summe: "€2.800,00",datum: "2024-03-15", dachflaeche: "180",    dacheindeckung: "Schiefer",dachalter: "1990", dachpfanne: "—",               farbe: "Grau",      dachneigung: "20°", strasse: "Berliner Str. 5" },
    ];
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let expandedRows    = new Set();
  let selectedKunden  = new Set();
  let checkedEdit     = new Set(); // tracks which rows have edit-checkbox checked
  let kundenActiveFilter = 'offen'; // default = Offen
  let currentPage     = 1;
  let rowsPerPage     = 20;
  let filteredData    = [];

  // ── Stat card definitions ──────────────────────────────────────────────────
  const KSTAT_DEFS = [
    { key: 'offen',      label: 'Offen',              filter: l => l.status === 'Offen' },
    { key: 'bearbeitung',label: 'in Bearbeitung',     filter: l => l.status === 'Infos...' },
    { key: 'followup',   label: 'Follow up',          filter: l => l.status === 'follow up' },
    { key: 'auftrags',   label: 'Auftragsbestätigung',filter: l => l.status === 'Auftragsbestätigung' },
    {
      key: 'beauft', label: 'Beauftragung', isMulti: true,
      filter: l => ['Beauftragung','EA Beauftragung','NF Beauftragt'].includes(l.status)
    },
  ];

  // ── HTML ──────────────────────────────────────────────────────────────────
  const getHTML = () => `
    <div class="kunden-container">
      <div class="page-title">Meine Kunden</div>

      <div class="kunden-stats" id="kunden-stats"></div>

      <div id="kunden-filter-pill" style="display:none"></div>

      <div class="toolbar">
        <div class="search-box">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="search" id="kunden-search"/>
        </div>
        <div class="spacer"></div>
      </div>

      <div class="table-label" id="kunden-selected-count">Wählen Sie Leads aus: 0</div>

      <div class="table-wrap">
        <table id="kunden-table">
          <thead>
            <tr>
              <th><input type="checkbox" class="cb" id="kunden-check-all"/></th>
              <th></th>
              <th>Führen Name</th>
              <th>Ort</th>
              <th>Status</th>
              <th>Lead Quelle</th>
              <th>Bearbeiter</th>
              <th>Delegieren</th>
              <th>Summe Netto</th>
              <th>Datum</th>
              <th>Sicht</th>
              <th>Anruf</th>
              <th>Bearbeiten</th>
              <th>Karte</th>
            </tr>
          </thead>
          <tbody id="kunden-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- View Modal -->
    <div id="kundenViewModal" class="k-modal-overlay">
      <div class="k-modal-content">
        <div class="k-modal-header">
          <h3 id="kundenViewTitle">Kunden Details</h3>
          <button class="k-close-btn" id="closeKundenViewModal">&times;</button>
        </div>
        <div class="k-modal-body" id="kundenViewContent"></div>
      </div>
    </div>

    <!-- Status Modal (edit checkbox) -->
    <div id="statusModal" class="k-modal-overlay">
      <div class="k-modal-content k-modal-sm">
        <div class="k-modal-header">
          <h3>Status</h3>
          <button class="k-close-btn" id="closeStatusModal">&times;</button>
        </div>
        <div class="k-modal-body">
          <div class="form-group">
            <select id="statusModalSelect" class="k-full-select">
              <option value="">Wählen Sie einen Kunden</option>
              <option value="Offen">Offen</option>
              <option value="follow up">follow up</option>
              <option value="Infos...">Infos...</option>
              <option value="Beauftragung">Beauftragung</option>
              <option value="EA Beauftragung">EA Beauftragung</option>
              <option value="NF Beauftragt">NF Beauftragt</option>
              <option value="Auftragsbestätigung">Auftragsbestätigung</option>
            </select>
          </div>
          <div style="text-align:right; margin-top:20px;">
            <button id="statusModalSaveBtn" class="k-btn-green">Aktualisierungsstatus</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel Overlay -->
    <div id="kundenPanelOverlay" class="k-panel-overlay"></div>
  `;

  // ── CSS ───────────────────────────────────────────────────────────────────
  function addKundenStyles() {
    if (document.getElementById('kunden-styles')) return;
    const s = document.createElement('style');
    s.id = 'kunden-styles';
    s.textContent = `
      .kunden-container { width: 100%; }
      .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-bottom: 20px; }

      /* ── Stat cards ── */
      .kunden-stats { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
      .kstat-card {
        background: white; border-radius: 16px; padding: 18px 22px;
        flex: 1; min-width: 130px; cursor: pointer;
        border: 2px solid transparent; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        transition: all 0.18s; position: relative;
      }
      .kstat-card:hover { border-color: #cbd5e1; }
      .kstat-card.active { border-color: #22c55e; background: #f0fdf4; }
      .kstat-active-dot { position:absolute; top:12px; right:12px; width:8px; height:8px; background:#22c55e; border-radius:50%; display:none; }
      .kstat-card.active .kstat-active-dot { display:block; }
      .kstat-lbl { font-size: 0.78rem; color: #64748b; margin-bottom: 6px; }
      .kstat-val { font-size: 2rem; font-weight: 700; color: #0f172a; }
      .kstat-multi { margin-top: 4px; }
      .kstat-multi-row { display:flex; justify-content:space-between; font-size:0.78rem; padding:5px 0; color:#475569; border-bottom:1px solid #f1f5f9; }
      .kstat-multi-row:last-child { border-bottom:none; }
      .kstat-multi-row span:last-child { font-weight:600; color:#0f172a; }

      /* ── Filter pill ── */
      .active-filter-pill { display:inline-flex; align-items:center; gap:8px; background:#f0fdf4; padding:8px 16px; border-radius:40px; font-size:0.85rem; color:#166534; margin-bottom:16px; }
      .active-filter-pill button { background:none; border:none; cursor:pointer; font-size:1rem; color:#166534; padding:0 4px; }

      /* ── Toolbar ── */
      .toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
      .search-box { display:flex; align-items:center; background:white; border:1px solid #e2e8f0; border-radius:40px; padding:8px 16px; gap:8px; }
      .search-box input { border:none; outline:none; font-size:0.85rem; width:220px; }
      .spacer { flex:1; }
      .table-label { margin: 8px 0 16px; font-size:0.85rem; color:#64748b; }

      /* ── Table ── */
      .table-wrap { overflow-x:auto; background:white; border-radius:16px; border:1px solid #eef2f8; }
      #kunden-table { width:100%; border-collapse:collapse; min-width:1300px; }
      #kunden-table th { text-align:left; padding:13px 10px; background:#f8fafc; color:#475569; font-weight:600; font-size:0.78rem; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
      #kunden-table td { padding:11px 10px; border-bottom:1px solid #f1f5f9; font-size:0.83rem; vertical-align:middle; }
      #kunden-table tr:hover { background:#f8fafc; }
      .cb { width:16px; height:16px; cursor:pointer; accent-color:#22c55e; }
      .expand-btn { background:none; border:none; cursor:pointer; padding:3px 6px; color:#94a3b8; }
      .expand-btn.open svg { transform:rotate(90deg); }
      .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.7rem; font-weight:500; }
      .badge-follow { background:#dbeafe; color:#1e40af; }
      .badge-offen  { background:#fef3c7; color:#92400e; }
      .badge-info   { background:#e0e7ff; color:#4338ca; }
      .badge-beauft { background:#dcfce7; color:#166534; }
      .tag { display:inline-block; padding:3px 8px; background:#f1f5f9; border-radius:12px; font-size:0.72rem; }
      .assignee-chip { display:inline-block; padding:3px 10px; background:#eef2ff; border-radius:20px; font-size:0.72rem; font-weight:500; color:#4f46e5; }
      .amount { font-weight:600; color:#0f172a; }
      .date-cell { color:#64748b; font-size:0.75rem; white-space:nowrap; }

      /* ── Action buttons ── */
      .act-btn { background:none; border:none; cursor:pointer; padding:5px 7px; border-radius:7px; color:#64748b; transition:all 0.18s; display:inline-flex; align-items:center; justify-content:center; }
      .act-btn:hover { background:#f1f5f9; color:#3b82f6; }
      .act-btn-green { background:#22c55e; border:none; cursor:pointer; padding:7px 9px; border-radius:9px; color:white; display:inline-flex; align-items:center; justify-content:center; }
      .act-btn-green:hover { background:#16a34a; }
      .act-btn-outline { background:none; border:1.5px solid #e2e8f0; cursor:pointer; padding:5px 7px; border-radius:7px; color:#94a3b8; display:inline-flex; align-items:center; justify-content:center; }
      .act-btn-green-outline { background:none; border:1.5px solid #22c55e; cursor:pointer; padding:5px 7px; border-radius:7px; color:#22c55e; display:inline-flex; align-items:center; justify-content:center; }

      /* Bearbeiten cell */
      .bearbeiten-cell { display:flex; align-items:center; gap:6px; }
      .edit-cb { width:15px; height:15px; cursor:pointer; accent-color:#22c55e; }
      .edit-icon-btn { background:none; border:none; cursor:pointer; padding:4px; border-radius:6px; color:#64748b; display:inline-flex; align-items:center; transition:all 0.18s; }
      .edit-icon-btn:hover:not(:disabled) { background:#f1f5f9; color:#3b82f6; }
      .edit-icon-btn:disabled { color:#d1d5db; cursor:not-allowed; }

      /* ── Expanded row ── */
      .expand-row { display:none; background:#f9fafb; }
      .expand-row.open { display:table-row; }
      .expand-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; padding:16px; }
      .expand-item { display:flex; flex-direction:column; }
      .expand-item label { font-size:0.7rem; color:#64748b; margin-bottom:3px; }
      .expand-item span { font-size:0.83rem; font-weight:500; color:#0f172a; }

      /* ── Pagination ── */
      .pagination-container { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:18px; padding:12px 4px; }
      .pg-btn, .pg-num { padding:7px 13px; border:1px solid #e2e8f0; background:white; border-radius:8px; cursor:pointer; font-size:0.83rem; color:#334155; transition:all 0.15s; }
      .pg-num.active { background:#22c55e; border-color:#22c55e; color:white; }
      .pg-dots { padding:0 6px; color:#94a3b8; }
      .pg-right { display:flex; align-items:center; gap:12px; margin-left:auto; }
      .pg-info { font-size:0.82rem; color:#64748b; }
      .pg-rows-sel { padding:7px 10px; border:1px solid #e2e8f0; border-radius:8px; background:white; font-size:0.82rem; cursor:pointer; }

      /* ── Modals ── */
      .k-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:3000; justify-content:center; align-items:center; }
      .k-modal-overlay.active { display:flex; }
      .k-modal-content { background:white; border-radius:20px; top: 120px;
    position: absolute; width:90%; max-width:580px; max-height:85vh; overflow:hidden; display:flex; flex-direction:column; animation:kmodalIn 0.2s ease; }
      .k-modal-sm { max-width:460px; }
      @keyframes kmodalIn { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
      .k-modal-header { display:flex; justify-content:space-between; align-items:center; padding:18px 24px; border-bottom:1px solid #e2e8f0; flex-shrink:0; }
      .k-modal-header h3 { font-size:1.2rem; font-weight:700; margin:0; color:#0f172a; }
      .k-close-btn { background:none; border:none; font-size:1.4rem; cursor:pointer; color:#94a3b8; line-height:1; }
      .k-modal-body { flex:1; overflow-y:auto; padding:20px 24px 24px; }
      .k-full-select { width:100%; padding:11px 14px; border:1px solid #e2e8f0; border-radius:10px; font-size:0.9rem; background:white; color:#64748b; }
      .k-btn-green { background:#22c55e; color:white; border:none; padding:12px 28px; border-radius:10px; font-size:0.95rem; font-weight:600; cursor:pointer; transition:background 0.15s; }
      .k-btn-green:hover { background:#16a34a; }

      /* ── View detail ── */
      .k-view-section { margin-bottom:20px; }
      .k-view-section h4 { font-size:0.95rem; font-weight:600; color:#0f172a; margin-bottom:10px; padding-bottom:7px; border-bottom:1px solid #e2e8f0; }
      .k-detail-row { display:flex; padding:9px 0; border-bottom:1px solid #f8fafc; }
      .k-detail-label { width:150px; font-weight:500; color:#64748b; font-size:0.83rem; flex-shrink:0; }
      .k-detail-value { flex:1; color:#0f172a; font-size:0.83rem; }

      /* Panel overlay */
      .k-panel-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.25); z-index:2000; }
      .k-panel-overlay.active { display:block; }

      /* Form */
      .form-group { margin-bottom:14px; }
      .form-group label { display:block; margin-bottom:5px; font-weight:500; font-size:0.82rem; color:#334155; }
      .form-group input, .form-group select { width:100%; padding:9px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:0.87rem; box-sizing:border-box; }

      .empty-state { text-align:center; padding:40px; color:#94a3b8; font-size:0.9rem; }

      @media(max-width:768px){
        .expand-grid{grid-template-columns:repeat(2,1fr);}
        .k-modal-content{width:96%;}
      }
    `;
    document.head.appendChild(s);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getDefByKey(key) { return KSTAT_DEFS.find(d => d.key === key) || null; }

  function statusClass(status) {
    if (status === 'follow up') return 'badge-follow';
    if (status === 'Offen')    return 'badge-offen';
    if (status === 'Infos...') return 'badge-info';
    return 'badge-beauft';
  }

  // ── Stat cards ────────────────────────────────────────────────────────────
  function renderStats() {
    const el = document.getElementById('kunden-stats');
    if (!el) return;
    const leads = getLeadsData();
    let html = '';

    KSTAT_DEFS.forEach(def => {
      const isActive = kundenActiveFilter === def.key;
      if (def.isMulti) {
        const bCount  = leads.filter(l => l.status === 'Beauftragung').length;
        const eaCount = leads.filter(l => l.status === 'EA Beauftragung').length;
        const nfCount = leads.filter(l => l.status === 'NF Beauftragt').length;
        html += `<div class="kstat-card${isActive?' active':''}" onclick="window.setKundenFilter('${def.key}')" style="min-width:190px;flex:1.5">
          <div class="kstat-active-dot"></div>
          <div class="kstat-lbl">${def.label}</div>
          <div class="kstat-multi">
            <div class="kstat-multi-row"><span>Beauftragung</span><span>${bCount}</span></div>
            <div class="kstat-multi-row"><span>EA Beauftragung</span><span>${eaCount}</span></div>
            <div class="kstat-multi-row"><span>NF Beauftragung</span><span>${nfCount}</span></div>
          </div>
        </div>`;
      } else {
        const count = def.filter ? leads.filter(def.filter).length : 0;
        html += `<div class="kstat-card${isActive?' active':''}" onclick="window.setKundenFilter('${def.key}')">
          <div class="kstat-active-dot"></div>
          <div class="kstat-lbl">${def.label}</div>
          <div class="kstat-val">${count}</div>
        </div>`;
      }
    });
    el.innerHTML = html;
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function renderKunden() {
    renderStats();

    const leads = getLeadsData();
    const def   = getDefByKey(kundenActiveFilter);

    // filter pill
    const pillEl = document.getElementById('kunden-filter-pill');
    if (def) {
      pillEl.style.display = 'block';
      pillEl.innerHTML = `<span class="active-filter-pill">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        Gefiltert: ${def.label}
        <button onclick="window.clearKundenFilter()" title="Filter entfernen">✕</button>
      </span>`;
    } else {
      pillEl.style.display = 'none';
    }

    // search
    const q = (document.getElementById('kunden-search')?.value || '').toLowerCase();

    let data = leads.slice();
    if (def && def.filter) data = data.filter(def.filter);
    if (q) data = data.filter(l => l.name.toLowerCase().includes(q) || l.ort.toLowerCase().includes(q));

    filteredData = data;
    const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const pageData = filteredData.slice((currentPage-1)*rowsPerPage, currentPage*rowsPerPage);

    const tbody = document.getElementById('kunden-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!pageData.length) {
      tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state">Keine Kunden in dieser Kategorie.</div></td></tr>`;
      updateCount();
      renderPagination(totalPages);
      return;
    }

    pageData.forEach(lead => {
      const isExp  = expandedRows.has(lead.id);
      const editCb = checkedEdit.has(lead.id);
      const displayName = (lead.salutation ? lead.salutation + ' ' : '') + lead.name;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="cb kunden-cb" data-id="${lead.id}" ${selectedKunden.has(lead.id)?'checked':''}></td>
        <td>
          <button class="expand-btn ${isExp?'open':''}" onclick="window.toggleKundenExpand(${lead.id})">
            <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </td>
        <td><span style="font-weight:500">${esc(displayName)}</span></td>
        <td style="font-size:0.8rem;color:#64748b">${esc(lead.ort)}</td>
        <td><span class="badge ${lead.statusClass||statusClass(lead.status)}">${esc(lead.status)}</span></td>
        <td>${lead.quelle ? `<span class="tag">${esc(lead.quelle)}</span>` : ''}</td>
        <td>${lead.bearbeiter ? `<span class="assignee-chip">${esc(lead.bearbeiter)}</span>` : ''}</td>
        <td>
          <div style="width:42px;height:22px;background:#e2e8f0;border-radius:11px;position:relative;cursor:pointer;transition:background 0.2s" 
               onclick="window.toggleDelegate(${lead.id},this)" data-on="false">
            <div style="width:18px;height:18px;background:white;border-radius:50%;position:absolute;top:2px;left:2px;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></div>
          </div>
        </td>
        <td><span class="amount">${esc(lead.summe)}</span></td>
        <td><span class="date-cell">${esc(lead.datum)}</span></td>
        <td>
          <button class="act-btn" onclick="window.viewKunde(${lead.id})" title="Details anzeigen">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </td>
        <td>
          <button class="act-btn-green" onclick="window.callKunde(${lead.id})" title="Anrufen">
            <svg width="14" height="14" fill="white" stroke="white" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91A16 16 0 0 0 13.09 15l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/>
            </svg>
          </button>
        </td>
        <td>
          <div class="bearbeiten-cell">
            <input type="checkbox" class="edit-cb" data-id="${lead.id}" ${editCb?'checked':''} 
              onchange="window.toggleEditCheck(${lead.id},this)">
            <button class="edit-icon-btn" onclick="window.editKundeClick(${lead.id})" ${editCb?'':'disabled'} title="Bearbeiten">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="act-btn-outline" onclick="window.openStatusModal(${lead.id})" title="Status">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </td>
        <td>
          <button class="act-btn-green-outline" onclick="window.openKarte(${lead.id})" title="Karte">
            <svg width="14" height="14" fill="none" stroke="#22c55e" stroke-width="2" viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);

      // expand row
      const xtr = document.createElement('tr');
      xtr.className = `expand-row${isExp?' open':''}`;
      xtr.innerHTML = `<td colspan="14"><div class="expand-grid">
        <div class="expand-item"><label>Dachfläche (m²)</label><span>${esc(lead.dachflaeche||'—')}</span></div>
        <div class="expand-item"><label>Dacheindeckung</label><span>${esc(lead.dacheindeckung||'—')}</span></div>
        <div class="expand-item"><label>Baujahr Dach</label><span>${esc(lead.dachalter||'—')}</span></div>
        <div class="expand-item"><label>Dachpfanne</label><span>${esc(lead.dachpfanne||'—')}</span></div>
        <div class="expand-item"><label>Wunsch Farbe</label><span>${esc(lead.farbe||'—')}</span></div>
        <div class="expand-item"><label>Dachneigung Grad</label><span>${esc(lead.dachneigung||'—')}</span></div>
        <div class="expand-item"><label>Straße</label><span>${esc(lead.strasse||'—')}</span></div>
      </div></td>`;
      tbody.appendChild(xtr);
    });

    // checkbox listeners
    document.querySelectorAll('.kunden-cb').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedKunden.add(id);
        else selectedKunden.delete(id);
        updateCount();
      });
    });

    updateCount();
    renderPagination(totalPages);
  }

  function updateCount() {
    const el = document.getElementById('kunden-selected-count');
    if (el) el.textContent = `Wählen Sie Leads aus: ${selectedKunden.size}`;
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  function renderPagination(totalPages) {
    document.querySelector('.pagination-container')?.remove();
    if (totalPages <= 1) return;

    const wrap = document.createElement('div');
    wrap.className = 'pagination-container';

    const prev = document.createElement('button');
    prev.className = 'pg-btn';
    prev.textContent = '«';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { if (currentPage>1){currentPage--;renderKunden();} };
    wrap.appendChild(prev);

    const maxV = 5, start = Math.max(1,currentPage-2), end = Math.min(totalPages,start+maxV-1);
    if (start>1) { addPgBtn(wrap,1); if(start>2){addDots(wrap);} }
    for (let i=start;i<=end;i++) addPgBtn(wrap,i);
    if (end<totalPages) { if(end<totalPages-1){addDots(wrap);} addPgBtn(wrap,totalPages); }

    const next = document.createElement('button');
    next.className = 'pg-btn';
    next.textContent = '»';
    next.disabled = currentPage===totalPages;
    next.onclick = () => { if(currentPage<totalPages){currentPage++;renderKunden();} };
    wrap.appendChild(next);

    const right = document.createElement('div');
    right.className = 'pg-right';
    const s = (currentPage-1)*rowsPerPage+1, e2 = Math.min(currentPage*rowsPerPage,filteredData.length);
    right.innerHTML = `<span class="pg-info">${s}-${e2} von ${filteredData.length}</span>`;
    const sel = document.createElement('select');
    sel.className = 'pg-rows-sel';
    [10,20,50,100].forEach(v=>{
      const o=document.createElement('option');
      o.value=v; o.textContent=v+' pro Seite';
      if(v===rowsPerPage)o.selected=true;
      sel.appendChild(o);
    });
    sel.onchange=e=>{rowsPerPage=parseInt(e.target.value);currentPage=1;renderKunden();};
    right.appendChild(sel);
    wrap.appendChild(right);

    document.querySelector('.table-wrap')?.insertAdjacentElement('afterend',wrap);
  }
  function addPgBtn(wrap,i){
    const b=document.createElement('button');
    b.className='pg-num'+(i===currentPage?' active':'');
    b.textContent=i;
    b.onclick=()=>{currentPage=i;renderKunden();};
    wrap.appendChild(b);
  }
  function addDots(wrap){
    const s=document.createElement('span');s.className='pg-dots';s.textContent='...';wrap.appendChild(s);
  }

  // ── Global window functions ───────────────────────────────────────────────
  window.setKundenFilter = (key) => { kundenActiveFilter=key; currentPage=1; renderKunden(); };
  window.clearKundenFilter = () => { kundenActiveFilter=null; currentPage=1; renderKunden(); };
  window.toggleKundenExpand = (id) => {
    if(expandedRows.has(id)) expandedRows.delete(id); else expandedRows.add(id);
    renderKunden();
  };

  window.toggleEditCheck = (id, cbEl) => {
    if(cbEl.checked) checkedEdit.add(id); else checkedEdit.delete(id);
    // enable/disable the edit button in same cell
    const btn = cbEl.parentElement?.querySelector('.edit-icon-btn');
    if(btn) btn.disabled = !cbEl.checked;
  };

  window.editKundeClick = (id) => {
    if(!checkedEdit.has(id)) return;
    window.openStatusModal(id);
  };

  // Status Modal
  let statusModalLeadId = null;
  window.openStatusModal = (id) => {
    statusModalLeadId = id;
    const leads = getLeadsData();
    const lead = leads.find(l=>l.id===id);
    const sel = document.getElementById('statusModalSelect');
    if(sel && lead) sel.value = lead.status || '';
    document.getElementById('statusModal').classList.add('active');
  };

  window.viewKunde = (id) => {
    const leads = getLeadsData();
    const lead = leads.find(l=>l.id===id);
    if(!lead) return;
    const displayName = (lead.salutation?lead.salutation+' ':'')+lead.name;
    document.getElementById('kundenViewTitle').textContent = displayName+' – Details';
    document.getElementById('kundenViewContent').innerHTML = `
      <div class="k-view-section">
        <h4>Kontaktinformationen</h4>
        <div class="k-detail-row"><div class="k-detail-label">Anrede</div><div class="k-detail-value">${esc(lead.salutation||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Name</div><div class="k-detail-value">${esc(lead.name)}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Ort</div><div class="k-detail-value">${esc(lead.ort)}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Straße</div><div class="k-detail-value">${esc(lead.strasse||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Telefon</div><div class="k-detail-value">${esc(lead.telefon||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">E-Mail</div><div class="k-detail-value">${esc(lead.email||'—')}</div></div>
      </div>
      <div class="k-view-section">
        <h4>Lead Informationen</h4>
        <div class="k-detail-row"><div class="k-detail-label">Status</div><div class="k-detail-value"><span class="badge ${lead.statusClass||statusClass(lead.status)}">${esc(lead.status)}</span></div></div>
        <div class="k-detail-row"><div class="k-detail-label">Lead Quelle</div><div class="k-detail-value">${esc(lead.quelle||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Bearbeiter</div><div class="k-detail-value">${esc(lead.bearbeiter||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Summe Netto</div><div class="k-detail-value">${esc(lead.summe)}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Datum</div><div class="k-detail-value">${esc(lead.datum)}</div></div>
      </div>
      <div class="k-view-section">
        <h4>Dachdetails</h4>
        <div class="k-detail-row"><div class="k-detail-label">Dachfläche (m²)</div><div class="k-detail-value">${esc(lead.dachflaeche||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Dacheindeckung</div><div class="k-detail-value">${esc(lead.dacheindeckung||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Baujahr Dach</div><div class="k-detail-value">${esc(lead.dachalter||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Dachpfanne</div><div class="k-detail-value">${esc(lead.dachpfanne||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Wunsch Farbe</div><div class="k-detail-value">${esc(lead.farbe||'—')}</div></div>
        <div class="k-detail-row"><div class="k-detail-label">Dachneigung Grad</div><div class="k-detail-value">${esc(lead.dachneigung||'—')}</div></div>
      </div>
    `;
    document.getElementById('kundenViewModal').classList.add('active');
  };

  window.callKunde   = () => alert('Anruf wird gestartet...');
  window.delegateKunde = (id) => alert(`Lead ${id} delegieren`);
  window.openKarte   = (id) => {
    const leads = getLeadsData();
    const lead = leads.find(l=>l.id===id);
    if(lead && lead.strasse) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(lead.strasse+' '+lead.ort)}`, '_blank');
    } else alert('Keine Adresse vorhanden');
  };
  window.toggleDelegate = (id, el) => {
    const on = el.dataset.on === 'true';
    el.dataset.on = String(!on);
    el.style.background = !on ? '#22c55e' : '#e2e8f0';
    el.querySelector('div').style.left = !on ? '22px' : '2px';
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl     = titleElement;
    addKundenStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Meine Kunden</h1><p>Bestandskunden Übersicht mit Filter</p>`;
      titleEl.style.display = 'block';
    }
    if (!contentArea) return;
    contentArea.innerHTML = getHTML();
    renderKunden();

    // search
    document.getElementById('kunden-search')?.addEventListener('input', () => { currentPage=1; renderKunden(); });

    // check-all
    document.getElementById('kunden-check-all')?.addEventListener('change', e => {
      document.querySelectorAll('.kunden-cb').forEach(cb => {
        cb.checked = e.target.checked;
        const id = parseInt(cb.dataset.id);
        if(e.target.checked) selectedKunden.add(id); else selectedKunden.delete(id);
      });
      updateCount();
    });

    // View modal close
    document.getElementById('closeKundenViewModal')?.addEventListener('click', () => {
      document.getElementById('kundenViewModal').classList.remove('active');
    });
    document.getElementById('kundenViewModal')?.addEventListener('click', e => {
      if(e.target===document.getElementById('kundenViewModal'))
        document.getElementById('kundenViewModal').classList.remove('active');
    });

    // Status modal close
    document.getElementById('closeStatusModal')?.addEventListener('click', () => {
      document.getElementById('statusModal').classList.remove('active');
    });
    document.getElementById('statusModal')?.addEventListener('click', e => {
      if(e.target===document.getElementById('statusModal'))
        document.getElementById('statusModal').classList.remove('active');
    });

    // Status modal save
    document.getElementById('statusModalSaveBtn')?.addEventListener('click', () => {
      const newStatus = document.getElementById('statusModalSelect').value;
      if(!newStatus) { alert('Bitte Status wählen'); return; }
      // Update in shared data if available
      const leads = getLeadsData();
      const lead = leads.find(l=>l.id===statusModalLeadId);
      if(lead) {
        lead.status = newStatus;
        lead.statusClass = statusClass(newStatus);
      }
      document.getElementById('statusModal').classList.remove('active');
      renderKunden();
    });

    console.log('✅ Kunden page loaded');
  }

  return { init };
})();

window.kundenPage = kundenPage;
console.log('kunden.js loaded - window.kundenPage exists:', !!window.kundenPage);