const leadsPage = (function () {
  let contentArea = null;
  let titleEl = null;

  // Leads Data - populated from API
  let leadsData = [];
  let expandedRows = new Set();
  let selectedLeads = new Set();
  let currentEditId = null;
  let currentNotesId = null;

  // Pagination - server-side
  let currentPage = 1;
  const rowsPerPage = 30;
  let totalLeads = 0;
  let totalPages = 0;

  // Store full dataset for client-side pagination
  let fullLeadsData = [];

  // Current filters
  let currentSearch = "";
  let currentStatus = "";
  let currentQuelle = "";

  // ─────────────────────────────────────────────
  // HTML TEMPLATE
  // ─────────────────────────────────────────────
  const getHTML = () => `
    <div class="leads-container">
      <div class="page-title">Leads</div>
      <div class="toolbar">
        <div class="search-box">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Suche..." id="search-input"/>
        </div>
        <select class="select-box" id="filter-status">
          <option value="">Alle Status</option>
          <option value="follow up">follow up</option>
          <option value="Offen">Offen</option>
          <option value="Infos eingeholt">Infos eingeholt</option>
          <option value="Beauftragung">Beauftragung</option>
          <option value="In Bearbeitung">In Bearbeitung</option>
        </select>
        <select class="select-box" id="filter-quelle">
          <option value="">Alle Quellen</option>
          <option value="Empfehlung">Empfehlung</option>
          <option value="Google">Google</option>
          <option value="Facebook">Facebook</option>
          <option value="ChatGPT">ChatGPT</option>
          <option value="Instagram">Instagram</option>
        </select>
        <div class="spacer"></div>
        <button class="btn-primary" id="new-lead-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Neuer Lead
        </button>
      </div>

      <div class="table-label" id="selected-count">Wählen Sie Führen aus: 0</div>

      <div class="table-wrap">
        <table id="leads-table">
          <thead>
            <tr>
              <th><input type="checkbox" class="cb" id="check-all"/></th>
              <th></th>
              <th>Name</th>
              <th>Ort</th>
              <th>Status</th>
              <th>Lead Quelle</th>
              <th>Bearbeiter</th>
              <th>Kategorien</th>
              <th>Delegieren</th>
              <th>Summe Netto</th>
              <th>Datum</th>
              <th>Anruf</th>
              <th>E-Mail</th>
              <th>Notiz</th>
              <th></th>
             </tr>
          </thead>
          <tbody id="leads-tbody">
            <tr><td colspan="15"><div class="empty-state loading-state">⏳ Daten werden geladen...</div></tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination-container" id="pagination-container">
        <button class="pagination-btn" id="prev-page" disabled>« Zurück</button>
        <div class="pagination-pages" id="pagination-pages"></div>
        <div class="pagination-info" id="pagination-info">Seite 1 von 1</div>
        <button class="pagination-btn" id="next-page" disabled>Weiter »</button>
        <div class="pagination-rows-per-page">
          <select id="rowsPerPageSelect" class="rows-per-page-select">
            <option value="50">50 pro Seite</option>
            <option value="100" selected>100 pro Seite</option>
            <option value="200">200 pro Seite</option>
            <option value="500">500 pro Seite</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Edit / Create Panel (Right Side) -->
    <div id="editPanel" class="side-panel">
      <div class="side-panel-header">
        <h3 id="editPanelTitle">Erstellen</h3>
        <button class="close-panel" id="closeEditPanel">&times;</button>
      </div>
      <div class="side-panel-body">
        <form id="editForm">
          <div class="form-group"><label>Salutation</label><select id="editSalutation"><option value="">Wählen...</option><option value="Herr">Herr</option><option value="Frau">Frau</option><option value="Divers">Divers</option></select></div>
          <div class="form-group"><label>Name *</label><input type="text" id="editName" placeholder="Geben Sie den Namen ein" required></div>
          <div class="form-group"><label>Briefberatung Telefon</label><select id="editBriefberatungTelefon"><option value="">Wählen...</option><option value="Ja">Ja</option><option value="Nein">Nein</option></select></div>
          <div class="form-group"><label>Straße Objekt</label><input type="text" id="editStrasseObjekt" placeholder="Hausanschrift..."></div>
          <div class="form-group"><label>Angebot</label><input type="text" id="editAngebot" placeholder="Angebot eingeben"></div>
          <div class="form-row">
            <div class="form-group"><label>Plz</label><input type="text" id="editPlz" placeholder="Postleitzahl"></div>
            <div class="form-group"><label>Ort</label><input type="text" id="editOrt" placeholder="Stadt"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Telefon</label><input type="text" id="editTelefon" placeholder="Telefon-Nummer"></div>
            <div class="form-group"><label>E-Mail</label><input type="email" id="editEmail" placeholder="E-Mail-Adresse"></div>
          </div>
          <div class="form-group"><label>Status</label><select id="editStatus"><option value="Offen">Offen</option><option value="follow up">follow up</option><option value="Infos eingeholt">Infos eingeholt</option><option value="Beauftragung">Beauftragung</option><option value="In Bearbeitung">In Bearbeitung</option></select></div>
          <div class="form-group"><label>Qualification</label><select id="editQualification"><option value="">Wählen...</option><option value="Hoch">Hoch</option><option value="Mittel">Mittel</option><option value="Niedrig">Niedrig</option></select></div>
          <div class="form-group"><label>Lead Quelle</label><input type="text" id="editQuelle" placeholder="Lead-Quelle"></div>
          <div class="form-group"><label>Kontakt Via</label><select id="editKontaktVia"><option value="">Wählen...</option><option value="Telefon">Telefon</option><option value="E-Mail">E-Mail</option><option value="WhatsApp">WhatsApp</option><option value="Persönlich">Persönlich</option><option value="Anruf">Anruf</option><option value="Email">Email</option></select></div>
          <div class="form-row">
            <div class="form-group"><label>Datum</label><input type="date" id="editDatum"></div>
            <div class="form-group"><label>Nachfassen</label><input type="date" id="editNachfassen"></div>
          </div>
          <div class="form-group"><label>Bearbeiter</label><select id="editBearbeiter"><option value="">Wählen...</option><option value="Philipp">Philipp</option><option value="André">André</option><option value="Martin">Martin</option><option value="Simon">Simon</option></select></div>
          <div class="form-group"><label>Summe Netto</label><input type="text" id="editSumme" placeholder="Betrag"></div>
          <div class="form-row">
            <div class="form-group"><label>Dachfläche m²</label><input type="text" id="editDachflaeche" placeholder="Dachfläche"></div>
            <div class="form-group"><label>Dachneigung Grad</label><input type="text" id="editDachneigung" placeholder="Dachneigung"></div>
          </div>
          <div class="form-group"><label>Dacheindeckung</label><select id="editDacheindeckung"><option value="">Wählen...</option><option value="Beton">Beton</option><option value="Ziegel">Ziegel</option><option value="Schiefer">Schiefer</option><option value="Bitumen">Bitumen</option></select></div>
          <div class="form-group"><label>Wunsch Farbe</label><select id="editFarbe"><option value="">Wählen...</option><option value="Anthrazit">Anthrazit</option><option value="Rot">Rot</option><option value="Schwarz">Schwarz</option><option value="Grau">Grau</option><option value="Ziegelrot">Ziegelrot</option><option value="Blauschwarz">Blauschwarz</option></select></div>
          <div class="form-group"><label>Dachpfanne</label><select id="editDachpfanne"><option value="">Wählen...</option><option value="Frankfurter Pfanne">Frankfurter Pfanne</option><option value="Hannoveraner Pfanne">Hannoveraner Pfanne</option><option value="Doppel-S Pfanne">Doppel-S Pfanne</option></select></div>
          <div class="form-group"><label>Baujahr Dach</label><select id="editBaujahr"><option value="">Wählen...</option>${Array.from(
            { length: 80 },
            (_, i) => 2024 - i,
          )
            .map((y) => `<option value="${y}">${y}</option>`)
            .join("")}</select></div>
          <div class="form-group"><label>Zusätzliche Extras</label><input type="text" id="editZusatzExtras" placeholder="Extras"></div>
          <div class="form-group"><label>Sales Typ</label><select id="editSalesTyp"><option value="">Wählen...</option><option value="Inbound">Inbound</option><option value="Outbound">Outbound</option><option value="Empfehlung">Empfehlung</option><option value="Hoch">Hoch</option></select></div>
          <div class="form-group"><label>Kategorie</label><input type="text" id="editKategorie" placeholder="Kategorie"></div>
          <div class="side-panel-footer">
            <button type="button" class="btn-secondary" id="cancelEditBtn">Abbrechen</button>
            <button type="submit" class="btn-primary">Speichern</button>
          </div>
        </form>
      </div>
    </div>
    <div id="panelOverlay" class="panel-overlay"></div>

    <!-- View Modal -->
    <div id="viewModal" class="modal-overlay">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3 id="viewTitle">Lead Details</h3>
          <button class="close-modal" id="closeViewModal">&times;</button>
        </div>
        <div class="modal-body" id="viewContent">
          <div class="view-tabs">
            <button class="view-tab active" data-tab="contact">Kontakt</button>
            <button class="view-tab" data-tab="lead">Lead Info</button>
            <button class="view-tab" data-tab="roof">Dachdetails</button>
            <button class="view-tab" data-tab="notes">Notizen</button>
          </div>
          <div id="viewTabContact" class="view-tab-content active"></div>
          <div id="viewTabLead" class="view-tab-content"></div>
          <div id="viewTabRoof" class="view-tab-content"></div>
          <div id="viewTabNotes" class="view-tab-content"></div>
        </div>
      </div>
    </div>

    <!-- Notes Modal -->
    <div id="notesModal" class="modal-overlay">
      <div class="modal-content modal-medium">
        <div class="modal-header">
          <h3>Notizen</h3>
          <button class="close-modal" id="closeNotesModal">&times;</button>
        </div>
        <div class="modal-body">
          <div id="notesList" class="notes-list"></div>
          <div class="notes-input-area">
            <textarea id="noteInput" rows="3" placeholder="Notiz hinzufügen..."></textarea>
            <button id="saveNoteBtn" class="btn-primary">Notiz speichern</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // ─────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────
  const addLeadsStyles = () => {
    if (document.getElementById("leads-styles")) return;
    const styles = document.createElement("style");
    styles.id = "leads-styles";
    styles.textContent = `
      .leads-container { width: 100%; }
      .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
      .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
      .search-box { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 40px; padding: 8px 16px; gap: 8px; }
      .search-box input { border: none; outline: none; font-size: 0.85rem; width: 200px; }
      .select-box { padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 40px; background: white; font-size: 0.85rem; cursor: pointer; }
      .spacer { flex: 1; }
      .btn-primary { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 40px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; font-size: 0.85rem; }
      .btn-primary:hover { background: #2563eb; }
      .btn-secondary { background: #f1f5f9; color: #334155; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
      .table-label { margin: 16px 0; font-size: 0.85rem; color: #64748b; }
      .table-wrap { overflow-x: auto; background: white; border-radius: 16px; border: 1px solid #eef2f8; }
      #leads-table { width: 100%; border-collapse: collapse; min-width: 1400px; }
      #leads-table th { text-align: left; padding: 14px 12px; background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.8rem; border-bottom: 1px solid #e2e8f0; }
      #leads-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
      #leads-table tr:hover td { background: #f8fafc; }
      .cb { width: 18px; height: 18px; cursor: pointer; }
      .expand-btn { background: none; border: none; cursor: pointer; padding: 4px 8px; color: #64748b; transition: transform 0.2s; }
      .expand-btn.open svg { transform: rotate(90deg); }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 500; }
      .badge-follow { background: #dbeafe; color: #1e40af; }
      .badge-offen { background: #fef3c7; color: #92400e; }
      .badge-info { background: #e0e7ff; color: #4338ca; }
      .badge-beauft { background: #dcfce7; color: #166534; }
      .badge-bearbeitung { background: #fed7aa; color: #9a3412; }
      .tag { display: inline-block; padding: 4px 8px; background: #f1f5f9; border-radius: 12px; font-size: 0.7rem; }
      .assignee-chip { display: inline-block; padding: 4px 10px; background: #eef2ff; border-radius: 20px; font-size: 0.7rem; font-weight: 500; color: #4f46e5; }
      .amount { font-weight: 600; color: #0f172a; }
      .date-cell { color: #64748b; font-size: 0.75rem; }
      .act-btn { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; color: #64748b; transition: all 0.2s; }
      .act-btn:hover { background: #f1f5f9; color: #3b82f6; }
      .actions { display: flex; gap: 4px; }
      .expand-row { display: none; background: #f9fafb; }
      .expand-row.open { display: table-row; }
      .expand-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; }
      .expand-item { display: flex; flex-direction: column; }
      .expand-item label { font-size: 0.7rem; color: #64748b; margin-bottom: 4px; }
      .expand-item span { font-size: 0.85rem; font-weight: 500; color: #0f172a; }

      /* ── Pagination ── */
      .pagination-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        margin-top: 24px;
        padding: 16px;
        flex-wrap: wrap;
      }
      .pagination-btn {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        padding: 8px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.2s;
      }
      .pagination-btn:hover:not(:disabled) { background: #3b82f6; color: white; border-color: #3b82f6; }
      .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .pagination-pages { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      .pagination-page-btn {
        min-width: 36px;
        height: 36px;
        padding: 0 8px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: white;
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pagination-page-btn:hover { background: #eff6ff; border-color: #3b82f6; color: #3b82f6; }
      .pagination-page-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }
      .pagination-info { font-size: 0.82rem; color: #64748b; white-space: nowrap; }
      .pagination-dots { color: #94a3b8; font-size: 0.85rem; padding: 0 4px; }
      .pagination-rows-per-page { margin-left: 16px; }
      .rows-per-page-select {
        padding: 6px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        font-size: 0.82rem;
        cursor: pointer;
      }

      /* ── Loading / Error ── */
      .loading-state { color: #64748b; }
      .empty-state { text-align: center; padding: 40px; color: #64748b; font-size: 0.9rem; }
      .api-error-msg {
        background: #fee2e2; color: #dc2626;
        padding: 12px 20px; border-radius: 8px;
        margin-top: 16px; text-align: center; font-size: 0.85rem;
      }

      /* ── Side Panel ── */
      .panel-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000; }
      .panel-overlay.active { display: block; }
      .side-panel { position: fixed; z-index: 99999; top: 0; right: -520px; width: 520px; height: 100vh; background: white; box-shadow: -4px 0 32px rgba(0,0,0,0.18); transition: right 0.3s ease; display: flex; flex-direction: column; }
      .side-panel.open { right: 0; }
      .side-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
      .side-panel-header h3 { font-size: 1.2rem; font-weight: 600; margin: 0; }
      .close-panel { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
      .side-panel-body { flex: 1; overflow-y: auto; padding: 24px; }
      .side-panel-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #e2e8f0; }

      /* ── Modals ── */
      .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999 !important; justify-content: center; align-items: center; }
      .modal-overlay.active { display: flex; }
      .modal-content { background: white; border-radius: 24px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; animation: modalFadeIn 0.2s ease; }
      @keyframes modalFadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      .modal-large { width: 90%; max-width: 800px; }
      .modal-medium { width: 90%; max-width: 500px; }
      .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
      .modal-header h3 { font-size: 1.3rem; font-weight: 600; margin: 0; }
      .close-modal { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
      .modal-body { flex: 1; overflow-y: auto; padding: 24px; }
      .view-tabs { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; flex-wrap: wrap; }
      .view-tab { background: none; border: none; padding: 10px 20px; font-size: 0.85rem; font-weight: 500; color: #64748b; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s; }
      .view-tab:hover { background: #f1f5f9; color: #1e293b; }
      .view-tab.active { background: #3b82f6; color: white; }
      .view-tab-content { display: none; }
      .view-tab-content.active { display: block; }
      .view-detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
      .view-detail-label { width: 150px; font-weight: 500; color: #64748b; font-size: 0.85rem; }
      .view-detail-value { flex: 1; color: #0f172a; font-size: 0.85rem; }

      /* ── Forms ── */
      .form-group { margin-bottom: 16px; }
      .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.82rem; color: #334155; }
      .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; box-sizing: border-box; }
      .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

      /* ── Notes ── */
      .notes-list { max-height: 300px; overflow-y: auto; margin-bottom: 20px; }
      .note-card { background: #f8fafc; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
      .note-text { font-size: 0.85rem; color: #1e293b; margin-bottom: 8px; }
      .note-meta { display: flex; gap: 16px; font-size: 0.7rem; color: #64748b; }
      .notes-input-area textarea { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; resize: vertical; box-sizing: border-box; margin-bottom: 12px; }

      @media (max-width: 768px) {
        .side-panel { width: 100%; right: -100%; }
        .expand-grid { grid-template-columns: repeat(2, 1fr); }
        .form-row { grid-template-columns: 1fr; }
        .modal-content { width: 95%; max-height: 90vh; }
        .view-detail-row { flex-direction: column; }
        .view-detail-label { width: 100%; margin-bottom: 4px; }
        .pagination-container { flex-direction: column; align-items: center; }
        .pagination-rows-per-page { margin-left: 0; margin-top: 10px; }
      }
    `;
    document.head.appendChild(styles);
  };

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  }

  function formatNumber(num) {
    if (!num || num === "0.00") return "0,00";
    return parseFloat(num).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getStatusClass(status) {
    if (status === "follow up") return "badge-follow";
    if (status === "Infos eingeholt" || status === "Nur Info eingeholt")
      return "badge-info";
    if (
      status === "Beauftragung" ||
      status === "EA Beauftragung" ||
      status === "NF Beauftragung"
    )
      return "badge-beauft";
    if (status === "In Bearbeitung" || status === "in Bearbeitung")
      return "badge-bearbeitung";
    return "badge-offen";
  }

  function mapAPIToLead(apiLead) {
    const status = apiLead.status || "Offen";
    return {
      id: apiLead.id,
      name: apiLead.name || "—",
      ort: apiLead.ort || "—",
      status,
      statusClass: getStatusClass(status),
      quelle: apiLead.lead_quelle || "—",
      bearbeiter: apiLead.bearbeiter || "—",
      kategorie: apiLead.sale_typ || "—",
      summe:
        apiLead.summe_netto && apiLead.summe_netto !== "0.00"
          ? `€ ${formatNumber(apiLead.summe_netto)}`
          : "€ 0,00",
      datum: apiLead.created_at
        ? apiLead.created_at.split(" ")[0]
        : apiLead.datum && apiLead.datum !== "0000-00-00"
          ? apiLead.datum
          : "—",
      nachfassen:
        apiLead.nachfassen !== "0000-00-00" && apiLead.nachfassen
          ? apiLead.nachfassen
          : "",
      salutation: apiLead.salutation || "",
      briefberatungTelefon:
        apiLead.erstberatung_telefon === "WAHR"
          ? "Ja"
          : apiLead.erstberatung_telefon === "FALSCH"
            ? "Nein"
            : "",
      strasseObjekt: apiLead.strasse_objekt || "",
      angebot: apiLead.angebot || "",
      plz: apiLead.plz || "",
      telefon: apiLead.telefon || "",
      email: apiLead.email || "",
      qualification: apiLead.einschaetzung_kunde || "",
      kontaktVia: apiLead.kontakt_via || "",
      dachflaeche: apiLead.dachflaeche_m2 || "",
      dachneigung: apiLead.dachneigung_grad || "",
      dacheindeckung: apiLead.dacheindeckung || "",
      farbe: apiLead.wunsch_farbe || "",
      dachpfanne: apiLead.dachpfanne || "",
      baujahr: apiLead.baujahr_dach || "",
      zusatzExtras: apiLead.zusaetzliche_extras || "",
      salesTyp: apiLead.sale_typ || "",
      notes: [],
    };
  }

  // ─────────────────────────────────────────────
  // API FETCH
  // ─────────────────────────────────────────────
  const EXTERNAL_API_URL = "https://goarrow.ai/test/fetch_lead.php";
  const SAME_ORIGIN_API = "/api/leads";

  async function fetchViaProxy(proxyUrl) {
    const res = await fetch(proxyUrl, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.data))
      throw new Error("Invalid response format");
    return data;
  }

  async function fetchLeadsFromAPI() {
    // 0) Try same-origin API first (works on Vercel)
    try {
      console.log(`🔄 Trying same-origin API: ${SAME_ORIGIN_API}`);
      const res = await fetch(SAME_ORIGIN_API, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.data))
        throw new Error("Invalid response format");
      console.log("✅ Same-origin API success");
      return data;
    } catch (e) {
      console.warn(
        "⚠️ Same-origin API failed, falling back to proxies...",
        e.message,
      );
    }

    const targetUrl = `${EXTERNAL_API_URL}`;

    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://cors-anywhere.herokuapp.com/${targetUrl}`,
    ];

    for (const proxyUrl of proxies) {
      try {
        console.log(`🔄 Trying proxy: ${proxyUrl}`);
        const data = await fetchViaProxy(proxyUrl);
        console.log("✅ Success:", proxyUrl);
        return data;
      } catch (err) {
        console.warn(`⚠️ Proxy failed (${proxyUrl}):`, err.message);
      }
    }

    try {
      console.log(`🔄 Trying direct request: ${targetUrl}`);
      const directResponse = await fetch(targetUrl, {
        headers: { Accept: "application/json" },
        mode: "cors",
      });
      if (!directResponse.ok) throw new Error(`HTTP ${directResponse.status}`);
      const directData = await directResponse.json();
      if (!directData || !Array.isArray(directData.data))
        throw new Error("Invalid response format");
      console.log("✅ Direct request success");
      return directData;
    } catch (err) {
      console.warn(`⚠️ Direct fetch failed:`, err.message);
    }

    throw new Error(
      "All CORS proxies failed. Please enable CORS on https://goarrow.ai/test/fetch_lead.php or use the same-origin API.",
    );
  }

  function showLeadsLoadError(message) {
    const tbody = document.getElementById("leads-tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="15"><div class="empty-state error-state">⚠️ ${message}</div></tr>`;
  }

  // ─────────────────────────────────────────────
  // FILTER DATA
  // ─────────────────────────────────────────────
  function filterData() {
    let filtered = fullLeadsData;

    if (currentSearch) {
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(currentSearch) ||
          lead.ort.toLowerCase().includes(currentSearch),
      );
    }

    if (currentStatus) {
      filtered = filtered.filter((lead) => lead.status === currentStatus);
    }

    if (currentQuelle) {
      filtered = filtered.filter((lead) => lead.quelle === currentQuelle);
    }

    return filtered;
  }

  // ─────────────────────────────────────────────
  // LOAD PAGE
  // ─────────────────────────────────────────────
  async function loadPage(page = 1) {
    currentPage = page;

    const tbody = document.getElementById("leads-tbody");
    if (tbody && fullLeadsData.length === 0) {
      tbody.innerHTML = `<td colspan="15"><div class="empty-state loading-state">⏳ Lade Daten...</div>`;
    }

    try {
      // Only fetch if we don't have data yet
      if (fullLeadsData.length === 0) {
        const result = await fetchLeadsFromAPI();
        fullLeadsData = result.data.map(mapAPIToLead);
      }

      // Apply filters
      const filteredData = filterData();
      totalLeads = filteredData.length;
      totalPages = Math.ceil(totalLeads / rowsPerPage) || 1;

      // Ensure current page is within bounds
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      // Get data for current page
      const start = (currentPage - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      const pageData = filteredData.slice(start, end);

      renderLeads(pageData);
      updatePaginationUI();
    } catch (err) {
      console.error("❌ Failed to load leads:", err);
      showLeadsLoadError(`Daten konnten nicht geladen werden. ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  // RENDER TABLE ROWS
  // ─────────────────────────────────────────────
  function renderLeads(data) {
    const tbody = document.getElementById("leads-tbody");
    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML = `知道<td colspan="15"><div class="empty-state">Keine Leads gefunden.</div>`;
      updateSelectedCount();
      return;
    }

    tbody.innerHTML = "";
    data.forEach((lead) => {
      // Main row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="cb lead-checkbox" data-id="${lead.id}" ${selectedLeads.has(lead.id) ? "checked" : ""}></td>
        <td>
          <button class="expand-btn ${expandedRows.has(lead.id) ? "open" : ""}" onclick="window.toggleExpandLead(${lead.id})">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </td>
        <td><span class="lead-name">${escapeHtml(lead.name)}</span></td>
        <td>${escapeHtml(lead.ort)}</td>
        <td><span class="badge ${lead.statusClass}">${escapeHtml(lead.status)}</span></td>
        <td><span class="tag">${escapeHtml(lead.quelle)}</span></td>
        <td><span class="assignee-chip">${escapeHtml(lead.bearbeiter)}</span></td>
        <td><span class="tag">${escapeHtml(lead.kategorie || "—")}</span></td>
        <td><div style="width:32px;height:32px;border-radius:50%;background:#f0f0f0;"></div></td>
        <td><span class="amount">${escapeHtml(lead.summe)}</span></td>
        <td><span class="date-cell">${escapeHtml(lead.datum)}</span></td>
        <td>
          <button class="act-btn" onclick="window.makeCallLead(${lead.id})">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91A16 16 0 0 0 13.09 15l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/></svg>
          </button>
        </td>
        <td>
          <button class="act-btn" onclick="window.sendEmailLead(${lead.id})">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </button>
        </td>
        <td>
          <button class="act-btn" onclick="window.openNotesLead(${lead.id})">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </button>
        </td>
        <td>
          <div class="actions">
            <button class="act-btn" onclick="window.editLead(${lead.id})" title="Bearbeiten">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="act-btn" onclick="window.viewLead(${lead.id})" title="Ansehen">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="act-btn" onclick="window.deleteLead(${lead.id})" title="Löschen">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      // Expand row
      const xtr = document.createElement("tr");
      xtr.className = `expand-row ${expandedRows.has(lead.id) ? "open" : ""}`;
      xtr.innerHTML = `
        <td colspan="15">
          <div class="expand-grid">
            <div class="expand-item"><label>Dachfläche</label><span>${escapeHtml(lead.dachflaeche || "—")}</span></div>
            <div class="expand-item"><label>Dacheindeckung</label><span>${escapeHtml(lead.dacheindeckung || "—")}</span></div>
            <div class="expand-item"><label>Baujahr</label><span>${escapeHtml(lead.baujahr || "—")}</span></div>
            <div class="expand-item"><label>Dachpfanne</label><span>${escapeHtml(lead.dachpfanne || "—")}</span></div>
            <div class="expand-item"><label>Farbe</label><span>${escapeHtml(lead.farbe || "—")}</span></div>
            <div class="expand-item"><label>Dachneigung</label><span>${escapeHtml(lead.dachneigung || "—")}</span></div>
            <div class="expand-item"><label>Telefon</label><span>${escapeHtml(lead.telefon || "—")}</span></div>
            <div class="expand-item"><label>E-Mail</label><span>${escapeHtml(lead.email || "—")}</span></div>
          </div>
        </td>
      `;
      tbody.appendChild(xtr);
    });

    // Checkbox listeners
    document.querySelectorAll(".lead-checkbox").forEach((cb) =>
      cb.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedLeads.add(id);
        else selectedLeads.delete(id);
        updateSelectedCount();
      }),
    );
    updateSelectedCount();
  }

  // ─────────────────────────────────────────────
  // PAGINATION UI
  // ─────────────────────────────────────────────
  function updatePaginationUI() {
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    const infoEl = document.getElementById("pagination-info");
    const pagesEl = document.getElementById("pagination-pages");

    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn)
      nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
    if (infoEl)
      infoEl.textContent = `Seite ${currentPage} von ${totalPages || 1} (${totalLeads} Leads gesamt)`;

    if (!pagesEl) return;
    pagesEl.innerHTML = "";

    if (totalPages <= 1) return;

    const range = buildPageRange(currentPage, totalPages);
    range.forEach((item) => {
      if (item === "…") {
        const dots = document.createElement("span");
        dots.className = "pagination-dots";
        dots.textContent = "…";
        pagesEl.appendChild(dots);
      } else {
        const btn = document.createElement("button");
        btn.className = `pagination-page-btn ${item === currentPage ? "active" : ""}`;
        btn.textContent = item;
        btn.addEventListener("click", () => goToPage(item));
        pagesEl.appendChild(btn);
      }
    });
  }

  function buildPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push("…");
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("…");
    pages.push(total);
    return pages;
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    loadPage(currentPage);
  }

  // ─────────────────────────────────────────────
  // FILTER (resets to page 1)
  // ─────────────────────────────────────────────
  function applyFilters() {
    currentSearch =
      document.getElementById("search-input")?.value.toLowerCase().trim() || "";
    currentStatus = document.getElementById("filter-status")?.value || "";
    currentQuelle = document.getElementById("filter-quelle")?.value || "";
    currentPage = 1;
    loadPage(1);
  }

  // ─────────────────────────────────────────────
  // SELECTED COUNT
  // ─────────────────────────────────────────────
  function updateSelectedCount() {
    const el = document.getElementById("selected-count");
    if (el) el.textContent = `Wählen Sie Führen aus: ${selectedLeads.size}`;
  }

  // ─────────────────────────────────────────────
  // EXPAND ROW
  // ─────────────────────────────────────────────
  window.toggleExpandLead = (id) => {
    if (expandedRows.has(id)) expandedRows.delete(id);
    else expandedRows.add(id);

    // Update all expand rows
    document.querySelectorAll(".expand-row").forEach((xtr) => {
      const prevRow = xtr.previousElementSibling;
      const checkbox = prevRow?.querySelector(".lead-checkbox");
      if (checkbox && parseInt(checkbox.dataset.id) === id) {
        xtr.classList.toggle("open", expandedRows.has(id));
        const btn = prevRow.querySelector(".expand-btn");
        if (btn) btn.classList.toggle("open", expandedRows.has(id));
      }
    });
  };

  // ─────────────────────────────────────────────
  // PANEL
  // ─────────────────────────────────────────────
  function openPanel(title) {
    document.getElementById("editPanelTitle").textContent = title;
    document.getElementById("editPanel").classList.add("open");
    document.getElementById("panelOverlay").classList.add("active");
  }
  function closePanel() {
    document.getElementById("editPanel").classList.remove("open");
    document.getElementById("panelOverlay").classList.remove("active");
  }

  // ─────────────────────────────────────────────
  // EDIT / VIEW / DELETE
  // ─────────────────────────────────────────────
  window.editLead = (id) => {
    const lead = fullLeadsData.find((l) => l.id == id);
    if (!lead) return;
    currentEditId = id;
    document.getElementById("editSalutation").value = lead.salutation || "";
    document.getElementById("editName").value = lead.name;
    document.getElementById("editBriefberatungTelefon").value =
      lead.briefberatungTelefon || "";
    document.getElementById("editStrasseObjekt").value =
      lead.strasseObjekt || "";
    document.getElementById("editAngebot").value = lead.angebot || "";
    document.getElementById("editPlz").value = lead.plz || "";
    document.getElementById("editOrt").value = lead.ort;
    document.getElementById("editTelefon").value = lead.telefon || "";
    document.getElementById("editEmail").value = lead.email || "";
    document.getElementById("editStatus").value = lead.status;
    document.getElementById("editQualification").value =
      lead.qualification || "";
    document.getElementById("editQuelle").value = lead.quelle;
    document.getElementById("editKontaktVia").value = lead.kontaktVia || "";
    document.getElementById("editDatum").value =
      lead.datum !== "—" ? lead.datum : "";
    document.getElementById("editNachfassen").value = lead.nachfassen || "";
    document.getElementById("editBearbeiter").value = lead.bearbeiter;
    document.getElementById("editSumme").value = lead.summe
      .replace("€", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
    document.getElementById("editDachflaeche").value = lead.dachflaeche || "";
    document.getElementById("editDachneigung").value = lead.dachneigung || "";
    document.getElementById("editDacheindeckung").value =
      lead.dacheindeckung || "";
    document.getElementById("editFarbe").value = lead.farbe || "";
    document.getElementById("editDachpfanne").value = lead.dachpfanne || "";
    document.getElementById("editBaujahr").value = lead.baujahr || "";
    document.getElementById("editZusatzExtras").value = lead.zusatzExtras || "";
    document.getElementById("editSalesTyp").value = lead.salesTyp || "";
    document.getElementById("editKategorie").value = lead.kategorie || "";
    openPanel("Lead bearbeiten");
  };

  window.viewLead = (id) => {
    const lead = fullLeadsData.find((l) => l.id == id);
    if (!lead) return;
    document.getElementById("viewTitle").textContent =
      `${lead.salutation ? lead.salutation + " " : ""}${lead.name}`;
    document.getElementById("viewTabContact").innerHTML = `
      <div class="view-detail-row"><div class="view-detail-label">Anrede</div><div class="view-detail-value">${escapeHtml(lead.salutation || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Name</div><div class="view-detail-value">${escapeHtml(lead.name)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Telefon</div><div class="view-detail-value">${escapeHtml(lead.telefon || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">E-Mail</div><div class="view-detail-value">${escapeHtml(lead.email || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Straße</div><div class="view-detail-value">${escapeHtml(lead.strasseObjekt || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">PLZ / Ort</div><div class="view-detail-value">${escapeHtml(lead.plz ? lead.plz + " " : "")}${escapeHtml(lead.ort)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Kontakt Via</div><div class="view-detail-value">${escapeHtml(lead.kontaktVia || "—")}</div></div>`;
    document.getElementById("viewTabLead").innerHTML = `
      <div class="view-detail-row"><div class="view-detail-label">Status</div><div class="view-detail-value"><span class="badge ${lead.statusClass}">${escapeHtml(lead.status)}</span></div></div>
      <div class="view-detail-row"><div class="view-detail-label">Qualification</div><div class="view-detail-value">${escapeHtml(lead.qualification || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Lead Quelle</div><div class="view-detail-value">${escapeHtml(lead.quelle)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Bearbeiter</div><div class="view-detail-value">${escapeHtml(lead.bearbeiter)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Summe Netto</div><div class="view-detail-value">${escapeHtml(lead.summe)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Angebot</div><div class="view-detail-value">${escapeHtml(lead.angebot || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Sales Typ</div><div class="view-detail-value">${escapeHtml(lead.salesTyp || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Datum</div><div class="view-detail-value">${escapeHtml(lead.datum)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Nachfassen</div><div class="view-detail-value">${escapeHtml(lead.nachfassen || "—")}</div></div>`;
    document.getElementById("viewTabRoof").innerHTML = `
      <div class="view-detail-row"><div class="view-detail-label">Dachfläche (m²)</div><div class="view-detail-value">${escapeHtml(lead.dachflaeche || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Dacheindeckung</div><div class="view-detail-value">${escapeHtml(lead.dacheindeckung || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Baujahr Dach</div><div class="view-detail-value">${escapeHtml(lead.baujahr || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Dachpfanne</div><div class="view-detail-value">${escapeHtml(lead.dachpfanne || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Wunsch Farbe</div><div class="view-detail-value">${escapeHtml(lead.farbe || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Dachneigung Grad</div><div class="view-detail-value">${escapeHtml(lead.dachneigung || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Zusätzliche Extras</div><div class="view-detail-value">${escapeHtml(lead.zusatzExtras || "—")}</div></div>`;
    document.getElementById("viewTabNotes").innerHTML = lead.notes?.length
      ? lead.notes
          .map(
            (n) =>
              `<div class="note-card"><div class="note-text">${escapeHtml(n.text)}</div><div class="note-meta"><span>${escapeHtml(n.author)}</span><span>${escapeHtml(n.date)}</span></div></div>`,
          )
          .join("")
      : '<div class="empty-state">Keine Notizen vorhanden.</div>';

    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.onclick = () => {
        document
          .querySelectorAll(".view-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".view-tab-content")
          .forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        const key = tab.dataset.tab;
        document
          .getElementById(
            `viewTab${key.charAt(0).toUpperCase() + key.slice(1)}`,
          )
          .classList.add("active");
      };
    });
    document.getElementById("viewModal").classList.add("active");
  };

  window.openNotesLead = (id) => {
    currentNotesId = id;
    renderNotesList();
    document.getElementById("noteInput").value = "";
    document.getElementById("notesModal").classList.add("active");
  };

  function renderNotesList() {
    const lead = fullLeadsData.find((l) => l.id == currentNotesId);
    const list = document.getElementById("notesList");
    if (!lead?.notes?.length) {
      list.innerHTML =
        '<div class="empty-state">Noch keine Notizen vorhanden.</div>';
      return;
    }
    list.innerHTML = lead.notes
      .map(
        (n) =>
          `<div class="note-card"><div class="note-text">${escapeHtml(n.text)}</div><div class="note-meta"><span>${escapeHtml(n.author)}</span><span>${escapeHtml(n.date)}</span></div></div>`,
      )
      .join("");
  }

  function saveNote() {
    const txt = document.getElementById("noteInput").value.trim();
    if (!txt) return;
    const lead = fullLeadsData.find((l) => l.id == currentNotesId);
    if (!lead) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    lead.notes = lead.notes || [];
    lead.notes.push({
      text: txt,
      author: "Martin Schwaak",
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    });
    document.getElementById("noteInput").value = "";
    renderNotesList();
  }

  window.deleteLead = (id) => {
    if (confirm("Löschen?")) {
      fullLeadsData = fullLeadsData.filter((l) => l.id != id);
      selectedLeads.delete(id);
      loadPage(currentPage);
    }
  };

  window.makeCallLead = () => alert("Anruf starten");
  window.sendEmailLead = () => alert("E-Mail senden");

  function collectForm() {
    return {
      salutation: document.getElementById("editSalutation").value,
      name: document.getElementById("editName").value,
      briefberatungTelefon: document.getElementById("editBriefberatungTelefon")
        .value,
      strasseObjekt: document.getElementById("editStrasseObjekt").value,
      angebot: document.getElementById("editAngebot").value,
      plz: document.getElementById("editPlz").value,
      ort: document.getElementById("editOrt").value,
      telefon: document.getElementById("editTelefon").value,
      email: document.getElementById("editEmail").value,
      status: document.getElementById("editStatus").value,
      qualification: document.getElementById("editQualification").value,
      quelle: document.getElementById("editQuelle").value,
      kontaktVia: document.getElementById("editKontaktVia").value,
      datum: document.getElementById("editDatum").value,
      nachfassen: document.getElementById("editNachfassen").value,
      bearbeiter: document.getElementById("editBearbeiter").value,
      summe: document.getElementById("editSumme").value,
      dachflaeche: document.getElementById("editDachflaeche").value,
      dachneigung: document.getElementById("editDachneigung").value,
      dacheindeckung: document.getElementById("editDacheindeckung").value,
      farbe: document.getElementById("editFarbe").value,
      dachpfanne: document.getElementById("editDachpfanne").value,
      baujahr: document.getElementById("editBaujahr").value,
      zusatzExtras: document.getElementById("editZusatzExtras").value,
      salesTyp: document.getElementById("editSalesTyp").value,
      kategorie: document.getElementById("editKategorie").value,
    };
  }

  function addLead(data) {
    const raw = parseFloat(data.summe) || 0;
    const newLead = {
      id: Date.now(),
      ...data,
      statusClass: getStatusClass(data.status),
      summe: `€${raw.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
      datum: data.datum || new Date().toISOString().split("T")[0],
      notes: [],
    };
    fullLeadsData.unshift(newLead);
    totalLeads++;
    totalPages = Math.ceil(totalLeads / rowsPerPage);
    loadPage(1);
  }

  function updateLead(id, data) {
    const idx = fullLeadsData.findIndex((l) => l.id == id);
    if (idx === -1) return;
    const raw = parseFloat(data.summe) || 0;
    fullLeadsData[idx] = {
      ...fullLeadsData[idx],
      ...data,
      statusClass: getStatusClass(data.status),
      summe: `€${raw.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
    };
    loadPage(currentPage);
  }

  // ─────────────────────────────────────────────
  // ROWS PER PAGE CHANGE
  // ─────────────────────────────────────────────
  function updateRowsPerPage() {
    const select = document.getElementById("rowsPerPageSelect");
    if (select) {
      const newRowsPerPage = parseInt(select.value);
      if (newRowsPerPage !== rowsPerPage) {
        // Update the constant (in a real app, you'd want to make this dynamic)
        // For simplicity, we'll reload with new setting
        window.location.reload(); // Simple solution - reload to reset with new rows per page
      }
    }
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  async function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    addLeadsStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Alle Leads</h1><p>Complete Lead Übersicht</p>`;
      titleEl.style.display = "block";
    }

    if (!contentArea) return;
    contentArea.innerHTML = getHTML();

    // Initial data load
    await loadPage(1);

    // Filter listeners (debounced search)
    let searchTimer;
    document.getElementById("search-input")?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 350);
    });
    document
      .getElementById("filter-status")
      ?.addEventListener("change", applyFilters);
    document
      .getElementById("filter-quelle")
      ?.addEventListener("change", applyFilters);

    // Rows per page change listener
    document
      .getElementById("rowsPerPageSelect")
      ?.addEventListener("change", updateRowsPerPage);

    // Pagination buttons
    document
      .getElementById("prev-page")
      ?.addEventListener("click", () => goToPage(currentPage - 1));
    document
      .getElementById("next-page")
      ?.addEventListener("click", () => goToPage(currentPage + 1));

    // Select all
    document.getElementById("check-all")?.addEventListener("change", (e) => {
      // Get current page data for select all
      const filteredData = filterData();
      const start = (currentPage - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      const currentPageData = filteredData.slice(start, end);

      document.querySelectorAll(".lead-checkbox").forEach((cb) => {
        cb.checked = e.target.checked;
        const id = parseInt(cb.dataset.id);
        if (e.target.checked) selectedLeads.add(id);
        else selectedLeads.delete(id);
      });
      updateSelectedCount();
    });

    // New lead
    document.getElementById("new-lead-btn")?.addEventListener("click", () => {
      currentEditId = null;
      document.getElementById("editForm").reset();
      openPanel("Erstellen");
    });

    // Panel close
    document
      .getElementById("closeEditPanel")
      ?.addEventListener("click", closePanel);
    document
      .getElementById("cancelEditBtn")
      ?.addEventListener("click", closePanel);
    document
      .getElementById("panelOverlay")
      ?.addEventListener("click", closePanel);

    // Form submit
    document.getElementById("editForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = collectForm();
      if (!data.name) {
        alert("Bitte Name eingeben");
        return;
      }
      if (currentEditId) updateLead(currentEditId, data);
      else addLead(data);
      closePanel();
    });

    // View modal
    document
      .getElementById("closeViewModal")
      ?.addEventListener("click", () =>
        document.getElementById("viewModal").classList.remove("active"),
      );
    document.getElementById("viewModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("viewModal"))
        document.getElementById("viewModal").classList.remove("active");
    });

    // Notes modal
    document
      .getElementById("closeNotesModal")
      ?.addEventListener("click", () =>
        document.getElementById("notesModal").classList.remove("active"),
      );
    document.getElementById("notesModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("notesModal"))
        document.getElementById("notesModal").classList.remove("active");
    });
    document.getElementById("saveNoteBtn")?.addEventListener("click", saveNote);
  }

  return { init };
})();

window.leadsPage = leadsPage;
console.log("leads.js loaded - window.leadsPage exists:", !!window.leadsPage);
