const leadsPage = (function () {
  let contentArea = null;
  let titleEl = null;

  // Leads Data - populated from API
  let leadsData = [];
  let expandedRows = new Set();
  let selectedLeads = new Set();
  let currentEditId = null;
  let currentNotesId = null;
  let currentViewLeadId = null;
  // Cache for fetched notes per lead id
  // Map<leadId, Array<{text, author, date}>>
  let notesCache = new Map();
  let activityCache = new Map();

  // Pagination - server-side
  let currentPage = 1;
  const rowsPerPage = 30;
  let totalLeads = 0;
  let totalPages = 0;

  // Store full dataset for client-side pagination
  let fullLeadsData = [];

  // Optimistic cache until reload
  let pendingCreates = []; // Array of temp leads (ids are negative)
  let pendingUpdates = new Map(); // Map<id:string, partialLead>

  // Current filters
  let currentSearch = "";
  let currentStatus = "";
  let currentQuelle = "";
  let currentBearbeiter = "";  // Add this line
  let currentDelegieren = "";  // Add this line

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
          <option value="In Bearbeitung">In Bearbeitung</option>
          <option value="Infos eingeholt">Infos eingeholt</option>
          <option value="Beauftragung">Beauftragung</option>
          <option value="Beauftragt">Beauftragt</option>
          <option value="EA beauftragt">EA beauftragt</option>
          <option value="NT beauftragt">NT beauftragt</option>
          <option value="In Bearbeitung - Angebot">In Bearbeitung - Angebot</option>
          <option value="In Bearbeitung - Preischätzung">In Bearbeitung - Preischätzung</option>
          <option value="Abgesagt">Abgesagt</option>
          <option value="1x gesagt tot">1x gesagt tot</option>
          <option value="Falscher Kunde">Falscher Kunde</option>
          <option value="Storno">Storno</option>
          <option value="Ghoster">Ghoster</option>
        </select>
        <select class="select-box" id="filter-quelle">
          <option value="">Alle Quellen</option>
          <option value="Google">Google</option>
          <option value="Facebook">Facebook</option>
          <option value="ChatGPT">ChatGPT</option>
          <option value="Instagram">Instagram</option>
          <option value="kleinanzeigen">kleinanzeigen</option>
          <option value="Empfehlung">Empfehlung</option>
          <option value="Newsletter">Newsletter</option>
          <option value="Bestandskunde">Bestandskunde</option>
          <option value="MA Baustelle">MA Baustelle</option>
          <option value="Empfehlungskarte">Empfehlungskarte</option>
          <option value="Aussendienst">Aussendienst</option>
          <option value="Platzhalter">Platzhalter</option>
          <option value="Buswerbung">Buswerbung</option>
          <option value="Autowerbung">Autowerbung</option>
          <option value="bing">bing</option>
          <option value="Flyer">Flyer</option>
          <option value="Solar">Solar</option>
        </select>
        <select class="select-box" id="filter-bearbeiter">
          <option value="">Alle Bearbeiter</option>
          <option value="Philipp">Philipp</option>
          <option value="André">André</option>
          <option value="Martin">Martin</option>
          <option value="Simon">Simon</option>
          </select>
<select class="select-box" id="filter-delegieren">      
    <option value="">Alle Delegieren</option>
          <option value="Philipp">Philipp</option>
          <option value="André">André</option>
          <option value="Martin">Martin</option>
          <option value="Simon">Simon</option>
          </select>
        <div class="spacer"></div>
        <button class="btn-primary" id="new-lead-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Neuer Lead
        </button>
      </div>

      <div class="table-label-head" id="selected-count">
        <span id="selected-count-text">Wählen Sie Führen aus: 0</span>
        <button id="mass-email-btn" class="mass-email-btn" style="display:none;">
          <svg width="12" height="12" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24" style="margin-right: 6px;">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span id="mass-email-btn-text">Senden Sie Massen-E-Mails</span>
        </button>
      </div>

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

              <th>Delegieren</th>
              <th>Summe Netto</th>
              <th>Datum</th>
              <th>Aktionen</th>
              </tr>
          </thead>
          <tbody id="leads-tbody">
            <tr><td colspan="11"><div class="empty-state loading-state">⏳ Daten werden geladen...</div></td></tr>
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
          <div class="form-group"><label>ID</label><input type="text" id="editId" placeholder="—" readonly></div>
          <div class="form-group"><label>Salutation</label><select id="editSalutation"><option value="">Wählen...</option><option value="Herr">Herr</option><option value="Frau">Frau</option><option value="Divers">Divers</option></select></div>
          <div class="form-group"><label>Name *</label><input type="text" id="editName" placeholder="Geben Sie den Namen ein" required></div>
          <div class="form-group"><label>Briefberatung Telefon</label>
<select id="editBriefberatungTelefon">
  <option value="">Wählen...</option>
  <option value="Ja">FALSCH</option>
  <option value="Nein">WAHR</option>
</select>
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
          <div class="form-group"><label>Status</label><select id="editStatus">
          <option value="Offen">Offen</option>
       <option value="follow up">follow up</option>
          <option value="In Bearbeitung">In Bearbeitung</option>
          <option value="Infos eingeholt">Infos eingeholt</option>
          <option value="Beauftragung">Beauftragung</option>
          <option value="Beauftragt">Beauftragt</option>
          <option value="EA beauftragt">EA beauftragt</option>
          <option value="NT beauftragt">NT beauftragt</option>
          <option value="In Bearbeitung - Angebot">In Bearbeitung - Angebot</option>
          <option value="In Bearbeitung - Preischätzung">In Bearbeitung - Preischätzung</option>
          <option value="Abgesagt">Abgesagt</option>
          <option value="1x gesagt tot">1x gesagt tot</option>
          <option value="Falscher Kunde">Falscher Kunde</option>
          <option value="Storno">Storno</option>
          <option value="Ghoster">Ghoster</option>
          </select>
          </div>
          <div class="form-group"><label>Qualification</label>
          <select id="editQualification">
          <option value="">Wählen...</option>
          <option value="Hoch">Hoch</option>
          <option value="Mittel">Mittel</option>
          <option value="Niedrig">Niedrig</option>
          </select>
          </div>
          <div class="form-group"><label>Lead Quelle</label>
               <select id="editQuelle">
          <option value="Google">Google</option>
          <option value="Facebook">Facebook</option>
          <option value="ChatGPT">ChatGPT</option>
          <option value="Instagram">Instagram</option>
          <option value="kleinanzeigen">kleinanzeigen</option>
          <option value="Empfehlung">Empfehlung</option>
          <option value="Newsletter">Newsletter</option>
          <option value="Bestandskunde">Bestandskunde</option>
          <option value="MA Baustelle">MA Baustelle</option>
          <option value="Empfehlungskarte">Empfehlungskarte</option>
          <option value="Aussendienst">Aussendienst</option>
          <option value="Platzhalter">Platzhalter</option>
          <option value="Buswerbung">Buswerbung</option>
          <option value="Autowerbung">Autowerbung</option>
          <option value="bing">bing</option>
          <option value="Flyer">Flyer</option>
          <option value="Solar">Solar</option>
          </select>
          </div>
          <div class="form-group"><label>Kontakt Via</label><select id="editKontaktVia">
          <option value="">Wählen...</option>
          <option value="Telefon">Telefon</option>
          <option value="E-Mail">E-Mail</option>
          <option value="Leadformular">Leadformular</option>
          <option value="Anruf">Anruf</option>

          </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Datum</label><input type="date" id="editDatum"></div>
            <div class="form-group"><label>Nachfassen</label><input type="date" id="editNachfassen"></div>
          </div>
          <div class="form-group"><label>Bearbeiter</label><select id="editBearbeiter"><option value="">Wählen...</option><option value="Philipp">Philipp</option><option value="André">André</option><option value="Martin">Martin</option><option value="Simon">Simon</option></select></div>
          <div class="form-group"><label>Delegieren</label><select id="editDelegieren"><option value="">Wählen...</option><option value="Philipp">Philipp</option><option value="André">André</option><option value="Martin">Martin</option><option value="Simon">Simon</option></select></div>
          <div class="form-group"><label>Summe Netto</label><input type="text" id="editSumme" placeholder="Betrag"></div>
          <div class="form-row">
            <div class="form-group"><label>Dachfläche m²</label><input type="text" id="editDachflaeche" placeholder="Dachfläche"></div>
            <div class="form-group"><label>Dachneigung Grad</label>
            <select id="editDachneigung">
            <option value="">Wählen...</option>
            <option value="0-15°">0-15°</option>
            <option value="15-25°">15-25°</option>
            <option value="25-45°">25-45°</option>
            <option value="45-55°">45-55°</option>
            <option value="über 55 Grad">über 55 Grad</option>
            </select>
            </div>
          </div>
          <div class="form-group"><label>Dacheindeckung</label>
          <select id="editDacheindeckung">
          <option value="">Wählen...</option>
          <option value="Beton">Beton</option>
          <option value="Ton">Ton</option>
          <option value="Metall">Metall</option>
          <option value="Eternit">Eternit</option>
          <option value="Engobe">Engobe</option>
          <option value="Glasiert">Glasiert</option>
          <option value="Asbest">Asbest</option>
          <option value="Echt Schiefer">Echt Schiefer</option>
          <option value="Tegalit">Tegalit</option>
          </select>
          </div>
          <div class="form-group"><label>Wunsch Farbe</label>
          <select id="editFarbe">
          <option value="">Wählen...</option>
          <option value="Anthrazit">Anthrazit</option>
          <option value="Rot">Rot</option>
          <option value="Schwarz">Schwarz</option>
          <option value="Grau">Grau</option>
          <option value="Ziegelrot">Ziegelrot</option>
          <option value="Blauschwarz">Blauschwarz</option>
          <option value="Schiefergrau">Schiefergrau</option>
          <option value="Stahlblau">Stahlblau</option>
          <option value="Bordeaux">Bordeaux</option>
          <option value="Moosgrün">Moosgrün</option>
          <option value="Oxidrot">Oxidrot</option>
          <option value="Klassikrot">Klassikrot</option>
          </select>
          </div>
          <div class="form-group"><label>Dachpfanne</label>
          <select id="editDachpfanne">
          <option value="">Wählen...</option>
          <option value="Frankfurter Pfanne">Frankfurter Pfanne</option>
          <option value="Harzer Pfanne">Harzer Pfanne</option>
          <option value="Doppel-S Pfanne">Doppel-S Pfanne</option>
          <option value="Taunus Pfanne">Taunus Pfanne</option>
          <option value="Hohlpfanne">Hohlpfanne</option>
          <option value="Doppelmuldenziegel">Doppelmuldenziegel</option>
          <option value="Biberschwanz">Biberschwanz</option>
          <option value="Tegalit">Tegalit</option>
          <option value="Sonstige">Sonstige</option>
          <option value="Unbekannt">Unbekannt</option>
          </select>
          </div>
          <div class="form-group"><label>Baujahr Dach</label
          ><select id="editBaujahr"><option value="">Wählen...</option>${Array.from(
            { length: 80 },
            (_, i) => 2024 - i,
          )
            .map((y) => `<option value="${y}">${y}</option>`)
            .join("")}</select></div>
          <div class="form-group"><label>Zusätzliche Extras</label><input type="text" id="editZusatzExtras" placeholder="Extras"></div>
          <div class="form-group"><label>Sales Typ</label>
          <select id="editSalesTyp">
          <option value="">Wählen...</option>
          <option value="Inbound">Hoch</option>
          <option value="Outbound">Normal</option>
        
          </select>
          </div>
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
            <button class="view-tab" data-tab="activity">Aktivitätszeitleiste</button>
          </div>
          <div id="viewTabContact" class="view-tab-content active"></div>
          <div id="viewTabLead" class="view-tab-content"></div>
          <div id="viewTabRoof" class="view-tab-content"></div>
          <div id="viewTabNotes" class="view-tab-content"></div>
          <div id="viewTabActivity" class="view-tab-content"></div>
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

    <!-- Mass Email Modal -->
    <div id="massEmailModal" class="modal-overlay">
      <div class="modal-content modal-medium">
        <div class="modal-header">
          <h3>Senden Sie Massen-E-Mails</h3>
          <button class="close-modal" id="closeMassEmailModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Vorlage</label>
            <select id="emailTemplateSelect" class="k-full-select">
              <option value="">Choose an E-Mail</option>
              <option value="E1">E1</option>
              <option value="E2">E2</option>
              <option value="E3">E3</option>
              <option value="E4">E4</option>
              <option value="E5">E5</option>
              <option value="E6">E6</option>
              <option value="E7">E7</option>
              <option value="E8">E8</option>
              <option value="E9">E9</option>
              <option value="E10">E10</option>
            </select>
          </div>
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="emailSubjectInput" placeholder="Name" class="k-full-select">
          </div>
          <div class="form-group">
            <label>E-Mail</label>
            <input type="email" id="massEmailAddressInput" placeholder="E-Mail" class="k-full-select">
          </div>
          <div style="text-align:right; margin-top:20px;">
            <button id="sendMassEmailBtn" class="k-btn-green">E-Mail senden</button>
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
      .page-title { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
      .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
      .search-box { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 40px; padding: 6px 12px; gap: 6px; }
      .search-box input { border: none; outline: none; font-size: 0.8rem; width: 150px; }
      .select-box { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 40px; background: white; font-size: 0.8rem; cursor: pointer; }
      .spacer { flex: 1; min-width: 12px; }
      .btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 16px; border-radius: 40px; display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500; font-size: 0.8rem; white-space: nowrap; }
      .btn-primary:hover { background: #2563eb; }
      .btn-secondary { background: #f1f5f9; color: #334155; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
      .table-label { margin: 12px 0; font-size: 0.8rem; color: #64748b; }
      .table-label-head { margin: 12px 0; font-size: 0.8rem; color: #64748b;    display: flex;
    align-items: center;
    justify-content: space-between; }
      .table-wrap { overflow-x: hidden; background: white; border-radius: 16px; border: 1px solid #eef2f8;  }
      #leads-table { width: 100%; border-collapse: collapse; min-width: auto; table-layout: fixed; }
      #leads-table th { text-align: left; padding: 9px 6px; background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.75rem; border-bottom: 1px solid #e2e8f0; white-space: nowrap; vertical-align: middle; }
      #leads-table td { padding: 8px 4px; border-bottom: 1px solid #f1f5f9; font-size: 0.78rem; line-height: 1.35; vertical-align: middle; overflow-wrap: anywhere; }
      #leads-table tr:hover td { background: #f8fafc; }
      #leads-table th:nth-child(1), #leads-table td:nth-child(1) { width: 15px; }
      #leads-table th:nth-child(2), #leads-table td:nth-child(2) { width: 15px; }
      #leads-table th:nth-child(3), #leads-table td:nth-child(3) { width: 80px;  }
      #leads-table th:nth-child(4), #leads-table td:nth-child(4) { width: 70px; }
      #leads-table th:nth-child(5), #leads-table td:nth-child(5) { width: 50px; }
      #leads-table th:nth-child(6), #leads-table td:nth-child(6) { width: 50px; }
      #leads-table th:nth-child(7), #leads-table td:nth-child(7) { width: 50px; }
      #leads-table th:nth-child(8), #leads-table td:nth-child(8) { width: 40px; }
      #leads-table th:nth-child(9), #leads-table td:nth-child(9) { width: 60px; text-align: center; }
      #leads-table th:nth-child(10), #leads-table td:nth-child(10) { width: 60px; }
      #leads-table th:nth-child(11), #leads-table td:nth-child(11) { width: 82px; }
      #leads-table th:nth-child(12), #leads-table td:nth-child(12) { width: 152px; }
      .cb { width: 16px; height: 16px; cursor: pointer; }
      .expand-btn { background: none; border: none; cursor: pointer; padding: 3px 6px; color: #64748b; transition: transform 0.2s; }
      .expand-btn.open svg { transform: rotate(90deg); }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 16px; font-size: 0.65rem; font-weight: 500; }
      .badge-follow { background: #dbeafe; color: #1e40af; }
      .badge-offen { background: #fef3c7; color: #92400e; }
      .badge-info { background: #e0e7ff; color: #4338ca; }
      .badge-beauft { background: #dcfce7; color: #166534; }
      .badge-bearbeitung { background: #fed7aa; color: #9a3412; }
      .tag { display: inline-block; padding: 3px 6px; background: #f1f5f9; border-radius: 10px; font-size: 0.65rem; }
      .assignee-chip { display: inline-block; padding: 3px 8px; background: #eef2ff; border-radius: 16px; font-size: 0.65rem; font-weight: 500; color: #4f46e5; }
      .lead-id { font-size: 0.65rem; color: #94a3b8; margin-top: 1px; }
      .lead-name { display: block; font-weight: 600; color: #0f172a; white-space: normal; overflow-wrap: anywhere; }
      .badge, .tag, .assignee-chip { max-width: 100%; white-space: normal; overflow-wrap: anywhere; line-height: 1.35; }
      .amount { font-weight: 600; color: #0f172a; }
      .date-cell { color: #64748b; font-size: 0.7rem; }
      .delegate-dot {     display: inline-block;
    padding: 3px 8px;
    background: #eef2ff;
    border-radius: 16px;
    font-size: 0.65rem;
    font-weight: 500;
 border-radius: 20px; background: #f1f5f9; border: 1px solid #e2e8f0; margin: 0 auto; }
      .act-btn { background: none; border: none; cursor: pointer; width: 28px; height: 28px; padding: 0; border-radius: 6px; color: #64748b; transition: all 0.2s; font-size: 0.75rem; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
      .act-btn:hover { background: #f1f5f9; color: #3b82f6; }
      .actions-cell { white-space: nowrap; }
      .actions { display: flex; gap: 3px; flex-wrap: nowrap; align-items: center; justify-content: flex-start; }
      .expand-row { display: none; background: #f9fafb; }
      .expand-row.open { display: table-row; }
      .expand-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; }
      .expand-item { display: flex; flex-direction: column; }
      .expand-item label { font-size: 0.65rem; color: #64748b; margin-bottom: 3px; }
      .expand-item span { font-size: 0.8rem; font-weight: 500; color: #0f172a; }

      /* ── Pagination ── */
      .pagination-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding: 12px;
        flex-wrap: wrap;
      }
      .pagination-btn {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        padding: 6px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 500;
        transition: all 0.2s;
      }
      .pagination-btn:hover:not(:disabled) { background: #3b82f6; color: white; border-color: #3b82f6; }
      .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .pagination-pages { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
      .pagination-page-btn {
        min-width: 32px;
        height: 32px;
        padding: 0 6px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: white;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pagination-page-btn:hover { background: #eff6ff; border-color: #3b82f6; color: #3b82f6; }
      .pagination-page-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }
      .pagination-info { font-size: 0.75rem; color: #64748b; white-space: nowrap; }
      .pagination-dots { color: #94a3b8; font-size: 0.75rem; padding: 0 2px; }
      .pagination-rows-per-page { margin-left: 12px; }
      .rows-per-page-select {
        padding: 4px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: white;
        font-size: 0.75rem;
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
.panel-overlay { 
  display: none; 
  position: fixed; 
  inset: 0; 
  background: rgba(0,0,0,0.3); 
  z-index: 2000; 
}
// .panel-overlay.active { display: block; }
.side-panel { 
  position: fixed; 
  z-index: 99999;  /* Increased from 99999 to ensure it's above everything */
  top: 0; 
  right: -520px; 
  width: 520px; 
  height: 100vh; 
  background: white; 
  box-shadow: -4px 0 32px rgba(0,0,0,0.18); 
  transition: right 0.3s ease; 
  display: flex; 
  flex-direction: column; 
}
      .side-panel.open { right: 0; }
      .side-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
      .side-panel-header h3 { font-size: 1.2rem; font-weight: 600; margin: 0; }
      .close-panel { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
      .side-panel-body { flex: 1; overflow-y: auto; padding: 24px; }
      .side-panel-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #e2e8f0; }

      /* ── Modals ── */
      /* Scoped modals for Leads to avoid cross-page conflicts */
      #viewModal, #notesModal, #massEmailModal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; justify-content: center; align-items: center; }
      #viewModal.active, #notesModal.active, #massEmailModal.active { display: flex; }
      #viewModal .modal-content, #notesModal .modal-content, #massEmailModal .modal-content { background: white; border-radius: 24px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; animation: modalFadeIn 0.2s ease; }
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

      /* Mass Email Button */
      .mass-email-btn {
        background: #22c55e;
        color: white;
        border: none;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        margin-left: 12px;
        height: 40px;
        align-items: center;
        display: inline-flex;
      }
      .mass-email-btn:hover {
        background: #16a34a;
      }

      .k-btn-green {
        background: #22c55e;
        color: white;
        border: none;
        padding: 12px 28px;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .k-btn-green:hover { background: #16a34a; }
      .k-full-select {
        width: 100%;
        padding: 11px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.9rem;
        background: white;
        color: #64748b;
      }

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

      @media (max-width: 768px) {
        .table-wrap { overflow-x: hidden; }
        #leads-table { min-width: 100%; table-layout: fixed; }
      }

      /* Activity timeline */
      #viewTabActivity { padding-top: 6px; }
      .activity-wrap { max-height: 380px; overflow: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
      .activity-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px; }
      .activity-text { color: #334155; font-size: 0.92rem; line-height: 1.5; }
      .activity-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 0.82rem; color: #94a3b8; }
      .activity-by { color: #64748b; }
      .activity-by strong { color: #0f172a; font-weight: 600; }
      .activity-time { color: #94a3b8; }
    `;
    document.head.appendChild(styles);
  };

  // ─────────────────────────────────────────────
  // TOASTS (lightweight, no dependency)
  // ─────────────────────────────────────────────
  function addToastStyles() {
    if (document.getElementById("toast-styles")) return;
    const s = document.createElement("style");
    s.id = "toast-styles";
    s.textContent = `
      .toast-container { position: fixed; top: 16px; right: 16px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
      .toast { min-width: 280px; max-width: 380px; padding: 12px 14px; border-radius: 10px; color: #0f172a; background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.08); font-size: 0.9rem; display: grid; grid-template-columns: 6px 1fr auto; align-items: center; gap: 12px; opacity: 0; transform: translateX(16px); animation: toastIn 200ms ease forwards; pointer-events: auto; position: relative; overflow: hidden; }
      .toast .toast-accent { width: 6px; height: 100%; border-radius: 6px; }
      .toast .toast-close { background: transparent; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; line-height: 1; padding: 2px 4px; border-radius: 6px; }
      .toast .toast-close:hover { background: #f1f5f9; color: #475569; }
      .toast .toast-progress { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: rgba(0,0,0,0.06); }
      .toast .toast-progress > div { height: 100%; width: 100%; transform-origin: left center; background: #3b82f6; }
      .toast-success { border-color: #bbf7d0; }
      .toast-success .toast-accent { background: #22c55e; }
      .toast-success .toast-progress > div { background: #22c55e; }
      .toast-error { border-color: #fecaca; }
      .toast-error .toast-accent { background: #ef4444; }
      .toast-error .toast-progress > div { background: #ef4444; }
      .toast-info { border-color: #c7d2fe; }
      .toast-info .toast-accent { background: #3b82f6; }
      .toast-info .toast-progress > div { background: #3b82f6; }
      @keyframes toastIn { to { opacity: 1; transform: translateX(0); } }
      @keyframes toastOut { to { opacity: 0; transform: translateX(16px); } }
    `;
    document.head.appendChild(s);
  }

  function ensureToastContainer() {
    let c = document.getElementById("toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-container";
      c.className = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, type = "success", duration = 2500) {
    addToastStyles();
    const container = ensureToastContainer();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    const accent = document.createElement("div");
    accent.className = "toast-accent";
    const content = document.createElement("div");
    content.textContent = message;
    const close = document.createElement("button");
    close.className = "toast-close";
    close.setAttribute("aria-label", "Schließen");
    close.textContent = "×";
    const progress = document.createElement("div");
    progress.className = "toast-progress";
    const bar = document.createElement("div");
    progress.appendChild(bar);
    el.appendChild(accent);
    el.appendChild(content);
    el.appendChild(close);
    el.appendChild(progress);
    container.appendChild(el);

    let start = performance.now();
    let stopped = false;
    const tick = (t) => {
      const elapsed = t - start;
      const pct = Math.max(0, 1 - elapsed / duration);
      bar.style.transform = `scaleX(${pct})`;
      if (!stopped && elapsed < duration) {
        rafId = requestAnimationFrame(tick);
      } else {
        hide();
      }
    };
    const hide = () => {
      stopped = true;
      el.style.animation = "toastOut 180ms ease forwards";
      setTimeout(() => el.remove(), 200);
    };
    let rafId = requestAnimationFrame(tick);
    close.addEventListener("click", hide);
    el.addEventListener("mouseenter", () => {
      stopped = true;
    });
    el.addEventListener("mouseleave", () => {
      if (bar.style.transform) {
        start =
          performance.now() -
          duration *
            (1 - parseFloat(bar.style.transform.replace("scaleX(", "")));
        stopped = false;
        rafId = requestAnimationFrame(tick);
      }
    });
    return { hide };
  }

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

  // ─────────────────────────────────────────────
  // ACTIVITY API - Insert call activity
  // ─────────────────────────────────────────────
  const INSERT_ACTIVITY_API = "/api/insert_activity";
  const INSERT_ACTIVITY_DIRECT = "https://goarrow.ai/test/insert_activity.php";
  const INSERT_NOTE_DIRECT = "https://goarrow.ai/test/insert_lead_note.php";

  function resolveActivityActor(preferred = "") {
    const candidates = [
      preferred,
      typeof currentBearbeiter === "string" ? currentBearbeiter : "",

    ];
    for (const value of candidates) {
      const normalized = String(value || "").trim();
      if (normalized && normalized !== "—") return normalized;
    }
    return "System";
  }

  function addOptimisticActivity(leadId, activity) {
    const key = String(leadId);
    const existing = activityCache.get(key) || [];
    const merged = [activity, ...existing];
    activityCache.set(key, merged);
  }

  async function insertActivity(leadId, activityType, activityText, meta = {}) {
    const actor = resolveActivityActor(meta.from || meta.user || meta.author);
    const payload = {
      lead_id: leadId,
      from: actor,
      description: activityText,
      activity_type: activityType,
      activity_text: activityText,
      action: activityType,
      user: actor,
      created_by: actor,
      phone: meta.phone || "",
      email: meta.email || "",
      lead_name: meta.leadName || "",
      timestamp: new Date().toISOString(),
    };
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });

    try {
      // Try same-origin API first
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      const res = await fetch(INSERT_ACTIVITY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && (data.status === "success" || data.success === true))
        return data;
      return data;
    } catch (err) {
      console.warn(
        "Activity insert via same-origin failed, trying direct...",
        err.message,
      );

      // Try direct endpoint as fallback
      try {
        if (isStaticLocalHost()) throw new Error("Static localhost direct CORS");
        const res = await fetch(INSERT_ACTIVITY_DIRECT, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
          mode: "cors",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { status: "success", raw: text };
        }
      } catch (directErr) {
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(INSERT_ACTIVITY_DIRECT)}`;
          const res = await fetch(proxyUrl, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch {
            return { status: "success", raw: text };
          }
        } catch (proxyErr) {
          directErr = proxyErr;
        }
        console.error("Activity insert failed:", directErr);
        throw new Error(
          `Aktivität konnte nicht gespeichert werden: ${directErr.message}`,
        );
      }
    }
  }

  // ─────────────────────────────────────────────
  // CALL FUNCTIONALITY
  // ─────────────────────────────────────────────
  async function makeCall(leadId) {
    const lead = fullLeadsData.find((l) => l.id == leadId);
    if (!lead) {
      showToast("Lead nicht gefunden", "error", 2000);
      return;
    }

    const phoneNumber = lead.telefon;
    const leadName = `${lead.salutation ? lead.salutation + " " : ""}${lead.name}`;

    // Check if phone number is empty
    if (!phoneNumber || phoneNumber.trim() === "") {
      showToast(`Keine Telefonnummer für ${leadName} vorhanden`, "error", 3000);
      return;
    }

    // Clean phone number - remove spaces, dashes, etc.
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

    // Build 3CX Web Client URL
    const baseUrl = "https://msdach.3cx.eu:5001/webclient/#/call";
    const callUrl = `${baseUrl}?phone=${encodeURIComponent(cleanPhone)}`;

    const callWindow = window.open(callUrl, "_blank");
    if (!callWindow) {
      showToast("Anruf konnte nicht geöffnet werden", "error", 3000);
      return;
    }

    const actor = resolveActivityActor(lead.bearbeiter);
    const activityText = `${actor} rief an ${phoneNumber}`;
    addOptimisticActivity(leadId, {
      text: activityText,
      by: actor,
      at: new Date().toLocaleString(),
    });

    try {
      await insertActivity(leadId, "call", activityText, {
        from: actor,
        phone: phoneNumber,
        leadName,
      });
      console.log(`Activity recorded for lead ${leadId}: ${activityText}`);
    } catch (error) {
      console.error("Failed to record call activity:", error);
    }

    showToast(`Anruf wird gestartet: ${phoneNumber}`, "success", 3000);
  }

  // ─────────────────────────────────────────────
  // REFRESH (force re-fetch from API)
  // ─────────────────────────────────────────────
  async function refreshLeads() {
    const tbody = document.getElementById("leads-tbody");
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state loading-state">⏳ Lade Daten...</div></td></tr>`;
    fullLeadsData = [];
    expandedRows.clear();
    selectedLeads.clear();
    await loadPage(1);
  }

  // After creating a lead, the upstream may take seconds to reflect it.
  // Poll a few times to surface the new data sooner.
  function schedulePostCreateSync() {
    // Immediate refresh already happens; also refresh at 10s and 20s
    setTimeout(() => {
      refreshLeads();
    }, 10000);
    setTimeout(() => {
      refreshLeads();
      showToast("Leads aktualisiert", "info", 1500);
    }, 20000);
  }

  function formatNumber(num) {
    if (!num || num === "0.00") return "0,00";
    return parseFloat(num).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Lightweight identity to dedupe pending creates once upstream reflects them
  function leadKey(lead) {
    return [lead.name || "", lead.email || "", lead.telefon || ""]
      .map((s) => String(s).trim().toLowerCase())
      .join("|");
  }

  function euro(amount) {
    const raw = parseFloat(amount) || 0;
    return `$ ${raw.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
  }

  function applyPendingUpdates(list) {
    return list.map((l) => {
      const upd = pendingUpdates.get(String(l.id));
      if (!upd) return l;
      const merged = { ...l, ...upd };
      if (upd.status) merged.statusClass = getStatusClass(upd.status);
      if (upd.summe != null) merged.summe = euro(upd.summe);
      return merged;
    });
  }

  function mergeAfterFetch(baseList) {
    const withUpdates = applyPendingUpdates(baseList);
    const serverKeys = new Set(withUpdates.map(leadKey));
    const creates = pendingCreates.filter((pc) => !serverKeys.has(leadKey(pc)));
    return [...creates, ...withUpdates];
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

  function firstNonEmpty(...values) {
    for (const value of values) {
      const normalized = String(value ?? "").trim();
      if (normalized && normalized !== "—" && normalized !== "null") {
        return normalized;
      }
    }
    return "";
  }

  function extractLeadList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    return payload.data || payload.leads || payload.items || payload.results || [];
  }

  function mapAPIToLead(apiLead) {
    const status = firstNonEmpty(apiLead.status, apiLead.lead_status) || "Offen";
    const quelle =
      firstNonEmpty(apiLead.lead_quelle, apiLead.quelle, apiLead.source) || "—";
    const bearbeiter =
      firstNonEmpty(apiLead.bearbeiter, apiLead.owner, apiLead.assignee) || "—";
    const delegieren =
      firstNonEmpty(apiLead.delegieren, apiLead.delegate, apiLead.delegated_to) ||
      "—";
    const kategorie =
      firstNonEmpty(apiLead.kategorie, apiLead.sale_typ, apiLead.sales_typ) || "—";
    const netto =
      firstNonEmpty(
        apiLead.summe_netto,
        apiLead.summe,
        apiLead.total_netto,
        apiLead.total,
      ) || "0.00";

    return {
      id: apiLead.id,
      name: apiLead.name || "—",
      ort: apiLead.ort || "—",
      status,
      statusClass: getStatusClass(status),
      quelle,
      bearbeiter,
      delegieren,
      summe:
        netto !== "0.00"
          ? `$ ${formatNumber(netto)}`
          : "$ 0,00",
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
  const INSERT_API_DIRECT = "https://goarrow.ai/test/insert_lead.php";
  const INSERT_API_SAME = "/api/insert_lead";
  const UPDATE_API_DIRECT = "https://goarrow.ai/test/update_lead.php";
  const UPDATE_API_SAME = "/api/update_lead";
  const NOTES_FETCH_SAME = "/api/lead_notes";
  const NOTES_INSERT_SAME = "/api/insert_lead_note";
  const ACTIVITY_FETCH_SAME = "/api/lead_activity";
  const SAME_ORIGIN_API = "/api/leads";
  const BULK_EMAIL_WEBHOOK_URL =
    "https://msdach.app.n8n.cloud/webhook/send_bulk_emails";

  // ─────────────────────────────────────────────
  // ERROR HELPERS (friendlier messages)
  // ─────────────────────────────────────────────
  function stripHtml(text) {
    if (!text) return "";
    try {
      return String(text)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      return String(text);
    }
  }

  function friendlyApiError(context, raw) {
    const msg = (raw || "").toString();
    const isStaticLocal = isStaticLocalHost();
    if (isStaticLocal && /501|Unsupported method|404/.test(msg)) {
      return `${context}: Lokaler Static-Server unterstützt /api nicht. Bitte 'vercel dev' starten oder über Proxy testen.`;
    }
    if (/CORS|Access-Control-Allow-Origin/.test(msg)) {
      return `${context}: Vom Browser blockiert (CORS). Nutzen Sie die gleichen /api Routen (Vercel/vercel dev).`;
    }
    if (/400|Bad Request/.test(msg)) {
      return `${context}: Backend hat 400 zurückgegeben. Prüfen Sie Pflichtfelder (lead_id, status, summe_netto).`;
    }
    if (/Failed to fetch/.test(msg)) {
      return `${context}: Netzwerk-/CORS-Problem. Bitte erneut versuchen oder vercel dev nutzen.`;
    }
    return `${context}: ${msg}`;
  }

  async function fetchViaProxy(proxyUrl) {
    const res = await fetch(proxyUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.data))
      throw new Error("Invalid response format");
    return data;
  }

  function isStaticLocalHost() {
    return (
      typeof location !== "undefined" &&
      (location.protocol === "file:" ||
        /^(localhost|127\.0\.0\.1)$/i.test(location.hostname || ""))
    );
  }

  async function fetchLeadsFromAPI() {
    const cacheBust = `_ts=${Date.now()}`;
    // 0) Try same-origin API first (works on Vercel)
    try {
      console.log(`🔄 Trying same-origin API: ${SAME_ORIGIN_API}`);
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      const sameOriginUrl = `${SAME_ORIGIN_API}?${cacheBust}`;
      const res = await fetch(sameOriginUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!extractLeadList(data).length && !Array.isArray(data?.data))
        throw new Error("Invalid response format");
      console.log("✅ Same-origin API success");
      return data;
    } catch (e) {
      console.warn(
        "⚠️ Same-origin API failed, falling back to proxies...",
        e.message,
      );
    }

    const targetUrl = `${EXTERNAL_API_URL}?${cacheBust}`;

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
        cache: "no-store",
      });
      if (!directResponse.ok) throw new Error(`HTTP ${directResponse.status}`);
      const directData = await directResponse.json();
      if (!extractLeadList(directData).length && !Array.isArray(directData?.data))
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

  async function createLeadOnAPI(payload) {
    // 1) Same-origin (Vercel)
    try {
      const res = await fetch(INSERT_API_SAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && (data.status === "success" || data.success === true))
        return data;
      // If unknown shape but exists, still return it
      if (data) return data;
      throw new Error("Invalid response format");
    } catch (err) {
      console.warn(
        "Create via same-origin failed, trying direct (may hit CORS locally)",
        err.message,
      );
    }

    // 2) Direct to external (will likely be blocked by CORS in browser locally)
    try {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
      const res = await fetch(INSERT_API_DIRECT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        mode: "cors",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { status: "success", raw: text };
      }
    } catch (err) {
      console.warn("Direct create failed:", err.message);
      // 3) Proxy fallback for local static
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(INSERT_API_DIRECT)}`;
        const params = new URLSearchParams();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.append(k, String(v));
        });
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { status: "success", raw: text };
        }
      } catch (proxyErr) {
        throw new Error(
          friendlyApiError("Erstellen fehlgeschlagen", proxyErr.message),
        );
      }
    }
  }

function normalizeUpdateResponse(data, rawText = "") {
  const raw = String(rawText || "").trim();
  if (
    data === false ||
    data == null ||
    data?.success === false ||
    data?.status === false ||
    String(data?.status || "").toLowerCase() === "error" ||
    raw.toLowerCase() === "false"
  ) {
    throw new Error(data?.message || data?.error || raw || "Backend returned false");
  }
  return data;
}

async function updateLeadOnAPI(id, payload) {
  const leadId = String(id ?? payload?.lead_id ?? payload?.id ?? "").trim();
  if (!leadId || leadId === "null" || leadId === "undefined") {
    throw new Error("Lead ID fehlt");
  }

  const mappedPayload = {
    id: leadId,
    lead_id: leadId,
    status: payload.status,
    sale_typ: payload.sale_typ,
    bearbeiter: payload.bearbeiter,
    name: payload.name,
    salutation: payload.salutation,
    erstberatung_telefon: payload.erstberatung_telefon,
    strasse_objekt: payload.strasse_objekt,
    angebot: payload.angebot,
    plz: payload.plz,
    ort: payload.ort,
    telefon: payload.telefon,
    email: payload.email,
    einschaetzung_kunde: payload.einschaetzung_kunde,
    lead_quelle: payload.lead_quelle,
    kontakt_via: payload.kontakt_via,
    datum: payload.datum,
    nachfassen: payload.nachfassen,
    summe_netto: payload.summe_netto,
    dachflaeche_m2: payload.dachflaeche_m2,
    dachneigung_grad: payload.dachneigung_grad,
    dacheindeckung: payload.dacheindeckung,
    wunsch_farbe: payload.wunsch_farbe,
    dachpfanne: payload.dachpfanne,
    baujahr_dach: payload.baujahr_dach,
    zusaetzliche_extras: payload.zusaetzliche_extras,
 };

  Object.keys(mappedPayload).forEach((key) => {
    if (mappedPayload[key] === undefined || mappedPayload[key] === null) {
      delete mappedPayload[key];
    }
  });

  console.log("Sending update payload:", mappedPayload);

  const formParams = new URLSearchParams();
  Object.entries(mappedPayload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formParams.append(key, String(value));
    }
  });

  try {
    if (isStaticLocalHost()) throw new Error("Static localhost without /api");
    const response = await fetch(UPDATE_API_SAME, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(mappedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = normalizeUpdateResponse(await response.json());
    console.log("Update response:", data);
    return data;
  } catch (error) {
    if (isStaticLocalHost()) {
      console.log("Skipping same-origin update on static localhost");
    } else {
      console.warn(
        "Update via same-origin failed, trying direct (may hit CORS locally)",
        error.message,
      );
    }
  }

  if (!isStaticLocalHost()) {
    try {
      const response = await fetch(UPDATE_API_DIRECT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formParams,
        mode: "cors",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: "success", raw: text };
      }
      return normalizeUpdateResponse(data, text);
    } catch (error) {
      console.warn("Direct update failed, trying proxy", error.message);
    }
  } else {
    console.log("Skipping direct update on static localhost; using proxy");
  }

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(UPDATE_API_DIRECT)}`;
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formParams,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: "success", raw: text };
    }
    return normalizeUpdateResponse(data, text);
  } catch (error) {
    console.error("Update failed:", error);
    throw new Error(friendlyApiError("Update fehlgeschlagen", error.message));
  }
}

  function showLeadsLoadError(message) {
    const tbody = document.getElementById("leads-tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state error-state">⚠️ ${message}</div></td></tr>`;
  }

  // ─────────────────────────────────────────────
  // NOTES API HELPERS
  // ─────────────────────────────────────────────
  async function fetchNotesForLead(leadId) {
    const cacheBust = `_ts=${Date.now()}`;
    // 1) Same-origin on Vercel
    try {
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      const res = await fetch(
        `${NOTES_FETCH_SAME}?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || data.notes || [];
      const normalized = (list || []).map((n) => ({
        text: String(n.text || n.note || n.message || ""),
        author: String(n.author || n.user || "Created at"),
        date: String(n.date || n.created_at || ""),
      }));
      notesCache.set(String(leadId), normalized);
      const idx = fullLeadsData.findIndex(
        (l) => String(l.id) === String(leadId),
      );
      if (idx !== -1) fullLeadsData[idx].notes = normalized;
      return normalized;
    } catch (err) {
      console.warn(
        "Same-origin notes fetch failed, trying proxies:",
        err.message,
      );
    }
    // 2) Proxy fallback for local testing
    const target = `https://goarrow.ai/test/fetch_lead_notes.php?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`;
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(target)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    ];
    for (const url of proxies) {
      try {
        const r = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const list = Array.isArray(data) ? data : data.data || data.notes || [];
        const normalized = (list || []).map((n) => ({
          text: String(n.text || n.note || n.message || ""),
          author: String(n.author || n.user || "System"),
          date: String(n.date || n.created_at || ""),
        }));
        notesCache.set(String(leadId), normalized);
        const idx = fullLeadsData.findIndex(
          (l) => String(l.id) === String(leadId),
        );
        if (idx !== -1) fullLeadsData[idx].notes = normalized;
        return normalized;
      } catch (e) {
        console.warn("Notes proxy failed:", url, e.message);
      }
    }
    return [];
  }

  async function createNoteForLead(leadId, text) {
    const body = { lead_id: leadId, note: text, text };
    const params = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    try {
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      const res = await fetch(NOTES_INSERT_SAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(INSERT_NOTE_DIRECT)}`;
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const textResp = await res.text();
        try {
          return JSON.parse(textResp);
        } catch {
          return { status: "success", raw: textResp };
        }
      } catch (proxyErr) {
        throw new Error(`Notiz konnte nicht gespeichert werden: ${proxyErr.message}`);
      }
    }
  }

  // ─────────────────────────────────────────────
  // ACTIVITY API HELPERS
  // ─────────────────────────────────────────────
  async function fetchActivityForLead(leadId) {
    const cacheBust = `_ts=${Date.now()}`;
    const activityKey = String(leadId);
    // Normalizer tolerant to different API field names
    const normalize = (a) => {
      const text =
        a.text ||
        a.activity ||
        a.action ||
        a.event ||
        a.message ||
        a.desc ||
        a.description ||
        "";
      const by =
        a.from ||
        a.by ||
        a.user ||
        a.username ||
        a.author ||
        a.created_by ||
        "System";
      let at =
        a.at ||
        a.datetime ||
        a.timestamp ||
        a.date_time ||
        a.date ||
        a.created_at ||
        "";
      if (!at) {
        const d = a.activity_date || a.activityDate || a.date;
        const t = a.activity_time || a.activityTime || a.time;
        if (d || t) at = `${d || ""}${d && t ? " " : ""}${t || ""}`.trim();
      }
      return {
        text: String(text || ""),
        by: String(by || "System"),
        at: String(at || ""),
      };
    };

    async function tryFetch(url) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const r = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        console.log("🔎 Activity raw data:", data);
        const list = Array.isArray(data)
          ? data
          : data.data || data.activity || data.items || [];
        return (list || []).map(normalize);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // 1) Same-origin first with lead_id, then id
    try {
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      let list = await tryFetch(
        `${ACTIVITY_FETCH_SAME}?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`,
      );
      if (!list.length) {
        list = await tryFetch(
          `${ACTIVITY_FETCH_SAME}?id=${encodeURIComponent(leadId)}&${cacheBust}`,
        );
      }
      if (list.length) {
        activityCache.set(activityKey, list);
        return list;
      }
      activityCache.set(activityKey, []);
      return [];
    } catch (err) {
      console.warn("Same-origin activity fetch failed:", err.message);
    }

    // 2) Proxy fallback for local (lead_id then id)
    const base = "https://goarrow.ai/test/fetch_activity.php";
    const targets = [
      `${base}?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`,
      `${base}?id=${encodeURIComponent(leadId)}&${cacheBust}`,
    ];
    const proxies = (t) => [
      `https://corsproxy.io/?${encodeURIComponent(t)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(t)}`,
    ];
    for (let i = 0; i < targets.length; i += 1) {
      const t = targets[i];
      let gotResponseForTarget = false;
      for (const url of proxies(t)) {
        try {
          const list = await tryFetch(url);
          gotResponseForTarget = true;
          if (list.length) {
            activityCache.set(activityKey, list);
            return list;
          }
          break;
        } catch (e) {
          console.warn("Activity proxy failed:", url, e.message);
        }
      }
      if (gotResponseForTarget && i === targets.length - 1) {
        activityCache.set(activityKey, []);
        return [];
      }
    }
    return activityCache.get(activityKey) || [];
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
    // Add Bearbeiter filter
    if (currentBearbeiter) {
      filtered = filtered.filter(
        (lead) => lead.bearbeiter === currentBearbeiter,
      );
    }
    if (currentDelegieren) {
      filtered = filtered.filter(
        (lead) => lead.delegieren === currentDelegieren,
      );
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
      tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state loading-state">⏳ Lade Daten...</div></td></tr>`;
    }

    try {
      // Only fetch if we don't have data yet
      if (fullLeadsData.length === 0) {
        const result = await fetchLeadsFromAPI();
        fullLeadsData = mergeAfterFetch(extractLeadList(result).map(mapAPIToLead));
      } else {
        // Ensure dataset reflects optimistic cache as well
        fullLeadsData = mergeAfterFetch(fullLeadsData);
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
      tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state">Keine Leads gefunden.</div></td></tr>`;
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
        <td><span class="lead-name">${escapeHtml(lead.name)}</span>
        </td>
        <td>${escapeHtml(lead.ort)}</td>
        <td><span class="badge ${lead.statusClass}">${escapeHtml(lead.status)}</span></td>
        <td><span class="tag">${escapeHtml(lead.quelle)}</span></td>
        <td><span class="assignee-chip">${escapeHtml(lead.bearbeiter)}</span></td>
        <td><div class="delegate-dot" >${escapeHtml(lead.delegieren || "—")}</div></td>
        
        <td><span class="amount">${escapeHtml(lead.summe)}</span></td>
        <td><span class="date-cell">${escapeHtml(lead.datum)}</span></td>
        <td class="actions-cell">
          <div class="actions">
            <button class="act-btn call-btn" data-lead-id="${lead.id}" title="Anrufen">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91A16 16 0 0 0 13.09 15l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/></svg>
            </button>
            <button class="act-btn" onclick="window.sendEmailLead(${lead.id})" title="E-Mail senden">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </button>
            <button class="act-btn" onclick="window.openNotesLead(${lead.id})" title="Notizen">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </button>
            <button class="act-btn" onclick="window.editLead(${lead.id})" title="Bearbeiten">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="act-btn" onclick="window.viewLead(${lead.id})" title="Ansehen">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      // Expand row
      const xtr = document.createElement("tr");
      xtr.className = `expand-row ${expandedRows.has(lead.id) ? "open" : ""}`;
      xtr.innerHTML = `
        <td colspan="11">
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

    // Attach call button event listeners
    document.querySelectorAll(".call-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const leadId = parseInt(btn.dataset.leadId);
        makeCall(leadId);
      });
    });

    // Checkbox listeners
    document.querySelectorAll(".lead-checkbox").forEach((cb) =>
      cb.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedLeads.add(id);
        else selectedLeads.delete(id);
        updateSelectedCount();
        updateMassEmailButtonVisibility();
      }),
    );
    updateSelectedCount();
    updateMassEmailButtonVisibility();
  }

  // ─────────────────────────────────────────────
  // MASS EMAIL FUNCTIONALITY
  // ─────────────────────────────────────────────
  function updateMassEmailButtonVisibility() {
    let massEmailBtn = document.getElementById("mass-email-btn");
    const massEmailBtnText = document.getElementById("mass-email-btn-text");
    if (!massEmailBtn) return;

    if (selectedLeads.size > 0) {
      massEmailBtn.style.display = "inline-flex";
      if (massEmailBtnText) {
        massEmailBtnText.textContent = `Senden Sie Massen-E-Mails (${selectedLeads.size})`;
      }
    } else {
      massEmailBtn.style.display = "none";
    }
  }

  let currentEmailLeadId = null;

  async function triggerBulkEmailWebhook({ emails, names, action, source }) {
    const payload = {
      emails: emails.join(","),
      names: names.join(","),
      action: action || "",
      source: source || "",
    };
    const params = new URLSearchParams(payload);
    console.log("Bulk email webhook payload:", payload);

    const webhookUrl = `${BULK_EMAIL_WEBHOOK_URL}?${params.toString()}`;
    console.log("Bulk email webhook URL:", webhookUrl);

    try {
      const response = await fetch(webhookUrl, {
        method: "GET",
        cache: "no-store",
      });
      const responseText = await response.text();

      console.log("Bulk email webhook status:", response.status, response.statusText);
      console.log("Bulk email webhook response:", responseText);

      if (!response.ok) {
        throw new Error(`Webhook HTTP ${response.status}: ${responseText}`);
      }

      return {
        success: true,
        status: response.status,
        responseText,
      };
    } catch (error) {
      console.warn("Bulk email webhook failed:", error);
      throw new Error(error.message || "Bulk email webhook call fehlgeschlagen");
    }
  }

  function openMassEmailModal(lead = null) {
    // If opened for a specific lead (from row action), allow opening without selection
    // Otherwise require selected leads
    if (!lead && selectedLeads.size === 0) {
      showToast("Bitte wählen Sie zuerst Leads aus", "error", 2000);
      return;
    }

    currentEmailLeadId = lead ? lead.id : null;

    // Reset / prefill form
    const selectEl = document.getElementById("emailTemplateSelect");
    const nameEl = document.getElementById("emailSubjectInput");
    const emailEl = document.getElementById("massEmailAddressInput");
    if (selectEl) selectEl.value = "";
    if (lead) {
      if (nameEl) nameEl.value = lead.name || "";
      if (emailEl) emailEl.value = lead.email || "";
      if (nameEl) nameEl.readOnly = true;
      if (emailEl) emailEl.readOnly = true;
    } else {
      // From selection: if exactly one selected, prefill; in all cases keep read-only
      const list = fullLeadsData.filter((l) => selectedLeads.has(l.id));
      if (list.length === 1) {
        const only = list[0];
        if (nameEl) nameEl.value = only.name || "";
        if (emailEl) emailEl.value = only.email || "";
      } else {
        if (nameEl) nameEl.value = "";
        if (emailEl) emailEl.value = "";
      }
      if (nameEl) nameEl.readOnly = true;
      if (emailEl) emailEl.readOnly = true;
    }

    const modal = document.getElementById("massEmailModal");
    if (modal) modal.classList.add("active");
  }

  async function sendMassEmails() {
    const selectedEmailTemplate = document.getElementById(
      "emailTemplateSelect",
    )?.value;
    const subjectText = document.getElementById("emailSubjectInput")?.value; // Name (single mode is read-only)
    const singleEmail =
      document.getElementById("massEmailAddressInput")?.value || "";

    if (!selectedEmailTemplate) {
      showToast("Bitte wählen Sie eine E-Mail-Vorlage aus", "error", 2000);
      return;
    }

    if (!subjectText || subjectText.trim() === "") {
      showToast("Bitte geben Sie einen Betreff/Namen ein", "error", 2000);
      return;
    }

    let leadsWithEmails = [];
    if (currentEmailLeadId != null) {
      const lead = fullLeadsData.find(
        (l) => String(l.id) === String(currentEmailLeadId),
      );
      const name = (lead?.name || "").trim();
      const email = (lead?.email || "").trim();
      if (!email) {
        showToast("Keine E-Mail-Adresse vorhanden", "error", 2000);
        return;
      }
      leadsWithEmails = [{ name, email }];
    } else {
      // Get selected leads emails
      const selectedLeadsList = fullLeadsData.filter((lead) =>
        selectedLeads.has(lead.id),
      );
      leadsWithEmails = selectedLeadsList.filter(
        (lead) => lead.email && lead.email.trim() !== "",
      );
    }

    if (leadsWithEmails.length === 0) {
      showToast(
        "Keine der ausgewählten Leads hat eine E-Mail-Adresse",
        "error",
        2000,
      );
      return;
    }

    if (!/^E(?:10|[1-9])$/.test(selectedEmailTemplate)) {
      showToast("Ungültige E-Mail-Vorlage", "error", 2200);
      return;
    }

    const recipients = leadsWithEmails.map((item) => item.email.trim());
    const recipientNames = leadsWithEmails.map((item) =>
      String(item.name || subjectText || "").trim(),
    );
    const source = resolveActivityActor(currentBearbeiter);
    const sendBtn = document.getElementById("sendMassEmailBtn");
    const originalText = sendBtn?.textContent || "E-Mail senden";

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = "Wird gesendet...";
    }

    try {
      const webhookResult = await triggerBulkEmailWebhook({
        emails: recipients,
        names: recipientNames,
        action: selectedEmailTemplate,
        source,
      });

      console.log("Bulk email webhook success:", webhookResult);
      document.getElementById("massEmailModal")?.classList.remove("active");
      showToast(
        `${selectedEmailTemplate} bulk email ${recipients.length} Empfänger ko send trigger ho gaya`,
        "success",
        3000,
      );
    } catch (error) {
      showToast(error.message || "Bulk email send fehlgeschlagen", "error", 3000);
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
      }
    }
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
    currentBearbeiter =
      document.getElementById("filter-bearbeiter")?.value || ""; // Add this line
     currentDelegieren =
    document.getElementById("filter-delegieren")?.value || "";  // Make sure this matches HTML id
    currentPage = 1;
    loadPage(1);
  }

  // ─────────────────────────────────────────────
  // SELECTED COUNT
  // ─────────────────────────────────────────────
  function updateSelectedCount() {
    const el = document.getElementById("selected-count-text");
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
    console.log("Opening panel:", title); // Add this line
    document.getElementById("editPanelTitle").textContent = title;
    document.getElementById("editPanel").classList.add("open");
    document.getElementById("panelOverlay").classList.add("active");
  }
  function closePanel() {
    console.log("Closing panel");
    const panel = document.getElementById("editPanel");
    const overlay = document.getElementById("panelOverlay");

    if (panel) panel.classList.remove("open");
    if (overlay) overlay.classList.remove("active");

    // Reset form and edit ID
    if (document.getElementById("editForm")) {
      document.getElementById("editForm").reset();
    }
    currentEditId = null;
  }

  // ─────────────────────────────────────────────
  // EDIT / VIEW / DELETE
  // ─────────────────────────────────────────────
  window.editLead = (id) => {
    const lead = fullLeadsData.find((l) => l.id == id);
    if (!lead) return;
    currentEditId = id;

    // Helper function to safely set values
    const setFieldValue = (elementId, value) => {
      const el = document.getElementById(elementId);
      if (el) el.value = value;
    };

    setFieldValue("editId", String(lead.id || ""));
    setFieldValue("editSalutation", lead.salutation || "");
    setFieldValue("editName", lead.name);
     // FIX: Briefberatung Telefon - convert "Ja"/"Nein" back to original values
  let briefberatungValue = "";
  if (lead.briefberatungTelefon === "Ja") {
    briefberatungValue = "Nein"; // Because in HTML, Nein = WAHR
  } else if (lead.briefberatungTelefon === "Nein") {
    briefberatungValue = "Ja"; // Because in HTML, Ja = FALSCH
  }
    setFieldValue("editBriefberatungTelefon", briefberatungValue);
    setFieldValue("editStrasseObjekt", lead.strasseObjekt || "");
    setFieldValue("editAngebot", lead.angebot || "");
    setFieldValue("editPlz", lead.plz || "");
    setFieldValue("editOrt", lead.ort);
    setFieldValue("editTelefon", lead.telefon || "");
    setFieldValue("editEmail", lead.email || "");
    setFieldValue("editStatus", lead.status);
    setFieldValue("editQualification", lead.qualification || "");
    setFieldValue("editQuelle", lead.quelle);
    setFieldValue("editKontaktVia", lead.kontaktVia || "");
    setFieldValue("editDatum", lead.datum !== "—" ? lead.datum : "");
    setFieldValue("editNachfassen", lead.nachfassen || "");
    setFieldValue("editBearbeiter", lead.bearbeiter);
    setFieldValue("editDelegieren", lead.delegieren || "");  // ADD THIS LINE
    setFieldValue(
      "editSumme",
      lead.summe
        .replace(/[$$]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim(),
    );
    setFieldValue("editDachflaeche", lead.dachflaeche || "");
    setFieldValue("editDachneigung", lead.dachneigung || "");
    setFieldValue("editDacheindeckung", lead.dacheindeckung || "");
    setFieldValue("editFarbe", lead.farbe || "");
    setFieldValue("editDachpfanne", lead.dachpfanne || "");
    setFieldValue("editBaujahr", lead.baujahr || "");
    setFieldValue("editZusatzExtras", lead.zusatzExtras || "");
    setFieldValue("editSalesTyp", lead.salesTyp || "");

    openPanel("Lead bearbeiten");
  };

  window.viewLead = (id) => {
    const lead = fullLeadsData.find((l) => l.id == id);
    if (!lead) return;
    currentViewLeadId = id;
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
      <div class="view-detail-row"><div class="view-detail-label">ID</div><div class="view-detail-value">${escapeHtml(String(lead.id))}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Qualification</div><div class="view-detail-value">${escapeHtml(lead.qualification || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Lead Quelle</div><div class="view-detail-value">${escapeHtml(lead.quelle)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Bearbeiter</div><div class="view-detail-value">${escapeHtml(lead.bearbeiter)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Delegieren</div><div class="view-detail-value">${escapeHtml(lead.delegieren || '—')}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Summe Netto</div><div class="view-detail-value">${escapeHtml(lead.summe)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Angebot</div><div class="view-detail-value">${escapeHtml(lead.angebot || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Sales Typ</div><div class="view-detail-value">${escapeHtml(lead.salesTyp || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Datum</div><div class="view-detail-value">${escapeHtml(lead.datum)}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Nachfassen</div><div class="view-detail-value">${escapeHtml(lead.nachfassen || "—")}</div></div>`;
    document.getElementById("viewTabRoof").innerHTML = `
      <div class="view-detail-row"><div class="view-detail-label">Dachfläche (m²)</div><div class="view-detail-value">${escapeHtml(lead.dachflaeche || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Dacheindeckung</div><div class="view-detail-value">${escapeHtml(lead.dacheindeckung || "—")}</div></div>
       <div class="view-detail-row"><div class="view-detail-label">Erstberatung Telefon / Briefberatung Telefon</div><div class="view-detail-value">${escapeHtml(lead.briefberatungTelefon || "—")}</div></div>

      <div class="view-detail-row"><div class="view-detail-label">Baujahr Dach</div><div class="view-detail-value">${escapeHtml(lead.baujahr || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Dachpfanne</div><div class="view-detail-value">${escapeHtml(lead.dachpfanne || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Wunsch Farbe</div><div class="view-detail-value">${escapeHtml(lead.farbe || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Dachneigung Grad</div><div class="view-detail-value">${escapeHtml(lead.dachneigung || "—")}</div></div>
      <div class="view-detail-row"><div class="view-detail-label">Zusätzliche Extras</div><div class="view-detail-value">${escapeHtml(lead.zusatzExtras || "—")}</div></div>`;
    const notesEl = document.getElementById("viewTabNotes");
    if (notesEl) {
      notesEl.innerHTML =
        '<div class="empty-state loading-state">⏳ Lade Notizen…</div>';
      fetchNotesForLead(id)
        .then(() => {
          if (String(currentViewLeadId) !== String(id)) return;
          const currentLead = fullLeadsData.find((l) => l.id == id);
          notesEl.innerHTML = currentLead?.notes?.length
            ? currentLead.notes
                .map(
                  (n) =>
                    `<div class="note-card"><div class="note-text">${escapeHtml(n.text)}</div><div class="note-meta"><span>${escapeHtml(n.author)}</span><span>${escapeHtml(n.date)}</span></div></div>`,
                )
                .join("")
            : '<div class="empty-state">Keine Notizen vorhanden.</div>';
        })
        .catch(() => {
          if (String(currentViewLeadId) !== String(id)) return;
          notesEl.innerHTML =
            '<div class="empty-state">Notizen konnten nicht geladen werden.</div>';
        });
    }

    // Activity timeline (lazy fetch)
    const activityEl = document.getElementById("viewTabActivity");
    if (activityEl) {
      activityEl.innerHTML =
        '<div class="empty-state loading-state">⏳ Lade Aktivitäten…</div>';
      let activitySettled = false;
      const activityFallbackTimer = setTimeout(() => {
        if (activitySettled) return;
        if (String(currentViewLeadId) !== String(id)) return;
        activityEl.innerHTML =
          '<div class="empty-state">Keine Aktivitäten gefunden.</div>';
      }, 2200);
      fetchActivityForLead(id)
        .then((list) => {
          activitySettled = true;
          clearTimeout(activityFallbackTimer);
          if (String(currentViewLeadId) !== String(id)) return;
          if (!list.length) {
            activityEl.innerHTML =
              '<div class="empty-state">Keine Aktivitäten gefunden.</div>';
            return;
          }
          const cards = list
            .map(
              (a) => `
          <div class="activity-card">
            <div class="activity-text">${escapeHtml(a.text || "")}</div>
            <div class="activity-meta">
              <div class="activity-by">Erstellt von: <strong>${escapeHtml(a.by || "System")}</strong></div>
              <div class="activity-time">${escapeHtml(a.at || "—")}</div>
            </div>
          </div>
        `,
            )
            .join("");
          activityEl.innerHTML = `<div class="activity-wrap">${cards}</div>`;
        })
        .catch(() => {
          activitySettled = true;
          clearTimeout(activityFallbackTimer);
          if (String(currentViewLeadId) !== String(id)) return;
          activityEl.innerHTML =
            '<div class="empty-state">Aktivitäten konnten nicht geladen werden.</div>';
        });
    }

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
    // Always fetch latest notes before showing
    if (id != null) {
      fetchNotesForLead(id).then(() => renderNotesList());
    } else {
      renderNotesList();
    }
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
    createNoteForLead(currentNotesId, txt)
      .then(async () => {
        showToast("Notiz gespeichert. Synchronisiere…", "success", 2200);
        document.getElementById("noteInput").value = "";
        const optimisticNote = {
          text: txt,
          author: "You",
          date: new Date().toLocaleString(),
        };
        const existingNotes = Array.isArray(lead.notes) ? lead.notes : [];
        const mergedNotes = [optimisticNote, ...existingNotes];
        lead.notes = mergedNotes;
        notesCache.set(String(currentNotesId), mergedNotes);
        renderNotesList();
        await fetchNotesForLead(currentNotesId);
        renderNotesList();
        await refreshLeads();
        schedulePostCreateSync();
      })
      .catch((err) => {
        showToast(
          err.message || "Notiz speichern fehlgeschlagen",
          "error",
          2800,
        );
      });
  }

  window.deleteLead = (id) => {
    if (confirm("Löschen?")) {
      fullLeadsData = fullLeadsData.filter((l) => l.id != id);
      selectedLeads.delete(id);
      loadPage(currentPage);
    }
  };

  window.sendEmailLead = async (id) => {
    const lead = fullLeadsData.find((l) => l.id == id);
    if (!lead) {
      showToast("Lead nicht gefunden", "error", 2000);
      return;
    }
    const email = (lead.email || "").trim();
    const leadName =
      `${lead.salutation ? lead.salutation + " " : ""}${lead.name || ""}`.trim();

    if (!email) {
      showToast("Keine E-Mail-Adresse vorhanden", "error", 2200);
      return;
    }

    const to = encodeURIComponent(email);
    const subject = encodeURIComponent("Project Update");
    const body = encodeURIComponent("Hi,\n\nHere is the update.\n\nRegards,");
    const composeUrl = `https://hex2013.com/owa/?path=/mail/action/compose&to=${to}&subject=${subject}&body=${body}`;
    const composeWindow = window.open(composeUrl, "_blank");
    if (!composeWindow) {
      showToast("E-Mail-Fenster konnte nicht geöffnet werden", "error", 2600);
      return;
    }

    const actor = resolveActivityActor(lead.bearbeiter);
    const activityText = `${actor} öffnete E-Mail an ${email}`;
    addOptimisticActivity(id, {
      text: activityText,
      by: actor,
      at: new Date().toLocaleString(),
    });

    try {
      await insertActivity(id, "email", activityText, {
        from: actor,
        email,
        leadName,
      });
    } catch (e) {
      console.warn(
        "E-Mail Aktivität konnte nicht gespeichert werden:",
        e?.message || e,
      );
    }
  };

  // Safely read an input/select value by id; returns empty string if missing
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
  }

  function collectForm() {
    return {
      salutation: val("editSalutation"),
      name: val("editName"),
      briefberatungTelefon: val("editBriefberatungTelefon"),
      strasseObjekt: val("editStrasseObjekt"),
      angebot: val("editAngebot"),
      plz: val("editPlz"),
      ort: val("editOrt"),
      telefon: val("editTelefon"),
      email: val("editEmail"),
      status: val("editStatus"),
      qualification: val("editQualification"),
      quelle: val("editQuelle"),
      kontaktVia: val("editKontaktVia"),
      datum: val("editDatum"),
      nachfassen: val("editNachfassen"),
      bearbeiter: val("editBearbeiter"),
    delegieren: val("editDelegieren"),  // Make sure this line exists
      summe: val("editSumme"),
      dachflaeche: val("editDachflaeche"),
      dachneigung: val("editDachneigung"),
      dacheindeckung: val("editDacheindeckung"),
      farbe: val("editFarbe"),
      dachpfanne: val("editDachpfanne"),
      baujahr: val("editBaujahr"),
      zusatzExtras: val("editZusatzExtras"),
      salesTyp: val("editSalesTyp"),
    };
  }

  function addLead(data) {
    const raw = parseFloat(data.summe) || 0;
    const newLead = {
      id: Date.now(),
      ...data,
      statusClass: getStatusClass(data.status),
      summe: `$ ${raw.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
      datum: data.datum || new Date().toISOString().split("T")[0],
      notes: [],
    };
    fullLeadsData.unshift(newLead);
    totalLeads++;
    totalPages = Math.ceil(totalLeads / rowsPerPage);
    loadPage(1);
  }

  // Add a temporary lead so UI reflects creation instantly until reload
  function addPendingCreate(data) {
    const tempLead = {
      id: -Date.now(),
      ...data,
      statusClass: getStatusClass(data.status),
      summe: `$ ${(parseFloat(data.summe) || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
      datum: data.datum || new Date().toISOString().split("T")[0],
      notes: [],
    };
    pendingCreates.unshift(tempLead);
    // Rebuild current view with optimistic cache
    fullLeadsData = mergeAfterFetch(fullLeadsData);
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
      summe: `$ ${raw.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
    };
    // Track as pending update until backend reflects it
    pendingUpdates.set(String(id), data);
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

    // filter-bearbeiter
    document
      .getElementById("filter-bearbeiter")
      ?.addEventListener("change", applyFilters);
    
      // filter-delegieren
    document
      .getElementById("filter-delegieren")
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
      updateMassEmailButtonVisibility();
    });

    document
      .getElementById("mass-email-btn")
      ?.addEventListener("click", () => openMassEmailModal());

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
    document
      .getElementById("editForm")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = collectForm();
        if (!data.name) {
          alert("Bitte Name eingeben");
          return;
        }
// In the form submit handler, when updating existing lead:
// In your form submit handler for update:
if (currentEditId) {
  try {
    const editId = String(currentEditId).trim();
    if (!editId || editId === "null" || editId === "undefined") {
      throw new Error("Lead ID fehlt");
    }

    const data = collectForm();
    
    // Map to correct field names for PHP API
    const payload = {
      id: editId,
      lead_id: editId,
      name: data.name,
      salutation: data.salutation,
      erstberatung_telefon: data.briefberatungTelefon,
      strasse_objekt: data.strasseObjekt,
      angebot: data.angebot,
      plz: data.plz,
      ort: data.ort,
      telefon: data.telefon,
      email: data.email,
      status: data.status,
      einschaetzung_kunde: data.qualification,
      lead_quelle: data.quelle,
      kontakt_via: data.kontaktVia,
      datum: data.datum,
      nachfassen: data.nachfassen,
      bearbeiter: data.bearbeiter,
      summe_netto: data.summe,
      dachflaeche_m2: data.dachflaeche,
      dachneigung_grad: data.dachneigung,
      dacheindeckung: data.dacheindeckung,
      wunsch_farbe: data.farbe,
      dachpfanne: data.dachpfanne,
      baujahr_dach: data.baujahr,
      zusaetzliche_extras: data.zusatzExtras,
      sale_typ: data.salesTyp,

    };
    
    showToast("Updating lead...", "info", 1000);
    
    // Call the update function
    const response = await updateLeadOnAPI(editId, payload);
    console.log("Update response:", response);

    const rowsUpdated = Number(response?.rows_updated);
    if (false && Number.isFinite(rowsUpdated) && rowsUpdated === 0) {
      closePanel();
      showToast("Keine geänderten Werte gespeichert", "info", 2500);
      await refreshLeads();
      return;
    }

    updateLead(editId, data);
    closePanel();
    showToast("Lead updated successfully!", "success", 2000);
    await refreshLeads();
    
  } catch (err) {
    console.error("Update error:", err);
    showToast(err.message || "Update failed", "error", 3000);
  }
  return;
}
        try {
          const payload = {
            salutation: data.salutation,
            name: data.name,
            erstberatung_telefon: data.briefberatungTelefon,
            strasse_objekt: data.strasseObjekt,
            angebot: data.angebot,
            plz: data.plz,
            ort: data.ort,
            telefon: data.telefon,
            email: data.email,
            status: data.status,
            einschaetzung_kunde: data.qualification,
            lead_quelle: data.quelle,
            kontakt_via: data.kontaktVia,
            datum: data.datum,
            nachfassen: data.nachfassen,
            bearbeiter: data.bearbeiter,
            summe_netto: data.summe,
            dachflaeche_m2: data.dachflaeche,
            dachneigung_grad: data.dachneigung,
            dacheindeckung: data.dacheindeckung,
            wunsch_farbe: data.farbe,
            dachpfanne: data.dachpfanne,
            baujahr_dach: data.baujahr,
            zusaetzliche_extras: data.zusatzExtras,
            sale_typ: data.salesTyp,

          };
          // Hide panel immediately and add optimistic row
          closePanel();
          addPendingCreate(data);
          const resp = await createLeadOnAPI(payload);
          console.log("🆕 Create response:", resp);
          showToast("Lead wurde erstellt. Synchronisiere…", "success", 2200);
          await refreshLeads();
          schedulePostCreateSync();
        } catch (err) {
          showToast(err.message || "Erstellen fehlgeschlagen", "error", 2800);
        }
      });

    // View modal
    document
      .getElementById("closeViewModal")
      ?.addEventListener("click", () =>
        (currentViewLeadId = null,
        document.getElementById("viewModal").classList.remove("active")),
      );
    document.getElementById("viewModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("viewModal"))
        (currentViewLeadId = null,
        document.getElementById("viewModal").classList.remove("active"));
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

    // Mass Email modal
    document
      .getElementById("closeMassEmailModal")
      ?.addEventListener("click", () =>
        document.getElementById("massEmailModal").classList.remove("active"),
      );
    document
      .getElementById("massEmailModal")
      ?.addEventListener("click", (e) => {
        if (e.target === document.getElementById("massEmailModal"))
          document.getElementById("massEmailModal").classList.remove("active");
      });
    document
      .getElementById("sendMassEmailBtn")
      ?.addEventListener("click", sendMassEmails);
  }

  return { init };
})();

window.leadsPage = leadsPage;
console.log("leads.js loaded - window.leadsPage exists:", !!window.leadsPage);
