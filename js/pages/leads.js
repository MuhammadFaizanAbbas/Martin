const leadsPage = (function () {
  let contentArea = null;
  let titleEl = null;

  // Leads Data (same as yours, keeping it compact)
  let leadsData = [
    {
      id: 1,
      name: "Philipp Kruse",
      ort: "Deutsch Evern",
      status: "follow up",
      statusClass: "badge-follow",
      quelle: "Empfehlung",
      bearbeiter: "Philip",
      summe: "€5.500,00",
      datum: "2024-03-28",
      nachfassen: "",
      salutation: "Herr",
      briefberatungTelefon: "",
      strasseObjekt: "Am Brahmbusch 3",
      angebot: "",
      plz: "21379",
      telefon: "+49 151 1234567",
      email: "philipp@example.com",
      qualification: "Hoch",
      kontaktVia: "Telefon",
      dachflaeche: "194.00",
      dachneigung: "25°",
      dacheindeckung: "Beton",
      dachpfanne: "Frankfurter Pfanne",
      farbe: "Anthrazit",
      baujahr: "1986",
      zusatzExtras: "",
      salesTyp: "Inbound",
      kategorie: "Wohnhaus",
      notes: [
        {
          text: "Interessiert an Dachsanierung",
          author: "Martin Schwaak",
          date: "2024-03-28 10:30:00",
        },
      ],
    },
    {
      id: 2,
      name: "André",
      ort: "Dahlenburg",
      status: "Offen",
      statusClass: "badge-offen",
      quelle: "Google",
      bearbeiter: "André",
      summe: "€5.000,00",
      datum: "2024-03-27",
      nachfassen: "2024-04-03",
      salutation: "Herr",
      briefberatungTelefon: "",
      strasseObjekt: "Hauptstraße 12",
      angebot: "",
      plz: "21368",
      telefon: "+49 152 7654321",
      email: "andre@example.com",
      qualification: "Mittel",
      kontaktVia: "E-Mail",
      dachflaeche: "210.00",
      dachneigung: "35°",
      dacheindeckung: "Ziegel",
      dachpfanne: "Hannoveraner Pfanne",
      farbe: "Rot",
      baujahr: "2001",
      zusatzExtras: "",
      salesTyp: "Outbound",
      kategorie: "Einfamilienhaus",
      notes: [
        {
          text: "Rückruf vereinbart für Montag",
          author: "Martin Schwaak",
          date: "2024-03-27 14:30:00",
        },
      ],
    },
    {
      id: 3,
      name: "Test B",
      ort: "Aremen",
      status: "Infos...",
      statusClass: "badge-info",
      quelle: "Facebook",
      bearbeiter: "Philip",
      summe: "€3.200,00",
      datum: "2024-03-26",
      nachfassen: "",
      salutation: "Frau",
      briefberatungTelefon: "",
      strasseObjekt: "Birkenweg 5",
      angebot: "",
      plz: "21376",
      telefon: "+49 170 9876543",
      email: "testb@example.com",
      qualification: "Niedrig",
      kontaktVia: "WhatsApp",
      dachflaeche: "160.00",
      dachneigung: "28°",
      dacheindeckung: "Schiefer",
      dachpfanne: "—",
      farbe: "Schwarz",
      baujahr: "1975",
      zusatzExtras: "",
      salesTyp: "Empfehlung",
      kategorie: "Mehrfamilienhaus",
      notes: [
        {
          text: "Broschüre angefordert",
          author: "Martin Schwaak",
          date: "2024-03-26 09:15:00",
        },
      ],
    },
    {
      id: 4,
      name: "Test A",
      ort: "Bremen",
      status: "Beauftragung",
      statusClass: "badge-beauft",
      quelle: "ChatGPT",
      bearbeiter: "Philip",
      summe: "€3.230,00",
      datum: "2024-03-25",
      nachfassen: "",
      salutation: "Herr",
      briefberatungTelefon: "",
      strasseObjekt: "Am Hafen 8",
      angebot: "",
      plz: "28195",
      telefon: "+49 160 4567890",
      email: "testa@example.com",
      qualification: "Hoch",
      kontaktVia: "Persönlich",
      dachflaeche: "175.00",
      dachneigung: "12°",
      dacheindeckung: "Bitumen",
      dachpfanne: "—",
      farbe: "Grau",
      baujahr: "2010",
      zusatzExtras: "",
      salesTyp: "Inbound",
      kategorie: "Gewerbe",
      notes: [
        {
          text: "Vertrag unterschrieben",
          author: "Martin Schwaak",
          date: "2024-03-25 16:45:00",
        },
      ],
    },
  ];

  let nextId = 5;
  let expandedRows = new Set();
  let selectedLeads = new Set();
  let currentEditId = null;
  let currentNotesId = null;

  const getHTML = () => `
    <div class="leads-container">
      <div class="page-title">Leads</div>
      <div class="toolbar">
        <div class="search-box">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Suche..." id="search-input" />
        </div>
        <select class="select-box" id="filter-status">
          <option value="">Alle Status</option>
          <option value="follow up">follow up</option>
          <option value="Offen">Offen</option>
          <option value="Infos...">Infos...</option>
          <option value="Beauftragung">Beauftragung</option>
        </select>
        <select class="select-box" id="filter-quelle">
          <option value="">Alle Quellen</option>
          <option value="Empfehlung">Empfehlung</option>
          <option value="Google">Google</option>
          <option value="Facebook">Facebook</option>
          <option value="ChatGPT">ChatGPT</option>
        </select>
        <div class="spacer"></div>
        <button class="btn-primary" id="new-lead-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Neuer Lead
        </button>
      </div>

      <div class="table-label" id="selected-count">Wählen Sie Führen aus: 0</div>

      <div class="table-wrap">
        <table id="leads-table">
          <thead>
            <tr>
              <th><input type="checkbox" class="cb" id="check-all" /></th>
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
             </thead>
          <tbody id="leads-tbody"></tbody>
         </table>
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
          <div class="form-group"><label>Straße Objekt</label><input type="text" id="editStrasseObjekt" placeholder="Geben Sie die Hausanschrift..."></div>
          <div class="form-group"><label>Angebot</label><input type="text" id="editAngebot" placeholder="Angebot eingeben"></div>
          <div class="form-row"><div class="form-group"><label>Plz</label><input type="text" id="editPlz" placeholder="Postleitzahl"></div><div class="form-group"><label>Ort</label><input type="text" id="editOrt" placeholder="Stadt"></div></div>
          <div class="form-row"><div class="form-group"><label>Telefon</label><input type="text" id="editTelefon" placeholder="Telefon-Nummer"></div><div class="form-group"><label>E-Mail</label><input type="email" id="editEmail" placeholder="E-Mail-Adresse"></div></div>
          <div class="form-group"><label>Status</label><select id="editStatus"><option value="Offen">Offen</option><option value="follow up">follow up</option><option value="Infos...">Infos...</option><option value="Beauftragung">Beauftragung</option></select></div>
          <div class="form-group"><label>Qualification</label><select id="editQualification"><option value="">Wählen...</option><option value="Hoch">Hoch</option><option value="Mittel">Mittel</option><option value="Niedrig">Niedrig</option></select></div>
          <div class="form-group"><label>Lead Quelle</label><input type="text" id="editQuelle" placeholder="Lead-Quelle"></div>
          <div class="form-group"><label>Kontakt Via</label><select id="editKontaktVia"><option value="">Wählen...</option><option value="Telefon">Telefon</option><option value="E-Mail">E-Mail</option><option value="WhatsApp">WhatsApp</option><option value="Persönlich">Persönlich</option></select></div>
          <div class="form-row"><div class="form-group"><label>Datum</label><input type="date" id="editDatum"></div><div class="form-group"><label>Nachfassen</label><input type="date" id="editNachfassen"></div></div>
          <div class="form-group"><label>Bearbeiter</label><select id="editBearbeiter"><option value="">Wählen...</option><option value="Philip">Philip</option><option value="André">André</option><option value="Martin Schwaak">Martin Schwaak</option></select></div>
          <div class="form-group"><label>Summe Netto</label><input type="text" id="editSumme" placeholder="Betrag"></div>
          <div class="form-row"><div class="form-group"><label>Dachfläche m²</label><input type="text" id="editDachflaeche" placeholder="Dachfläche"></div><div class="form-group"><label>Dachneigung Grad</label><input type="text" id="editDachneigung" placeholder="Dachneigung"></div></div>
          <div class="form-group"><label>Dacheindeckung</label><select id="editDacheindeckung"><option value="">Wählen...</option><option value="Beton">Beton</option><option value="Ziegel">Ziegel</option><option value="Schiefer">Schiefer</option><option value="Bitumen">Bitumen</option></select></div>
          <div class="form-group"><label>Wunsch Farbe</label><select id="editFarbe"><option value="">Wählen...</option><option value="Anthrazit">Anthrazit</option><option value="Rot">Rot</option><option value="Schwarz">Schwarz</option><option value="Grau">Grau</option></select></div>
          <div class="form-group"><label>Dachpfanne</label><select id="editDachpfanne"><option value="">Wählen...</option><option value="Frankfurter Pfanne">Frankfurter Pfanne</option><option value="Hannoveraner Pfanne">Hannoveraner Pfanne</option></select></div>
          <div class="form-group"><label>Baujahr Dach</label><select id="editBaujahr"><option value="">Wählen...</option>${Array.from(
            { length: 80 },
            (_, i) => 2024 - i,
          )
            .map((y) => `<option value="${y}">${y}</option>`)
            .join("")}</select></div>
          <div class="form-group"><label>Zusätzliche Extras</label><input type="text" id="editZusatzExtras" placeholder="Extras"></div>
          <div class="form-group"><label>Sales Typ</label><select id="editSalesTyp"><option value="">Wählen...</option><option value="Inbound">Inbound</option><option value="Outbound">Outbound</option><option value="Empfehlung">Empfehlung</option></select></div>
          <div class="form-group"><label>Kategorie</label><input type="text" id="editKategorie" placeholder="Kategorie"></div>
          <div class="side-panel-footer">
            <button type="button" class="btn-secondary" id="cancelEditBtn">Abbrechen</button>
            <button type="submit" class="btn-primary">Speichern</button>
          </div>
        </form>
      </div>
    </div>
    <div id="panelOverlay" class="panel-overlay"></div>
    
    <!-- View Modal (Center Popup) -->
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
    
    <!-- Notes Modal (Center Popup) -->
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

  // Add CSS
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
      #leads-table tr:hover { background: #f8fafc; }
      .cb { width: 18px; height: 18px; cursor: pointer; }
      .expand-btn { background: none; border: none; cursor: pointer; padding: 4px 8px; color: #64748b; transition: transform 0.2s; }
      .expand-btn.open svg { transform: rotate(90deg); }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 500; }
      .badge-follow { background: #dbeafe; color: #1e40af; }
      .badge-offen { background: #fef3c7; color: #92400e; }
      .badge-info { background: #e0e7ff; color: #4338ca; }
      .badge-beauft { background: #dcfce7; color: #166534; }
      .tag { display: inline-block; padding: 4px 8px; background: #f1f5f9; border-radius: 12px; font-size: 0.7rem; }
      .assignee-chip { display: inline-block; padding: 4px 10px; background: #eef2ff; border-radius: 20px; font-size: 0.7rem; font-weight: 500; color: #4f46e5; }
      .amount { font-weight: 600; color: #0f172a; }
      .date-cell { color: #64748b; font-size: 0.75rem; }
      .act-btn { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; color: #64748b; transition: all 0.2s; }
      .act-btn:hover { background: #f1f5f9; color: #3b82f6; }
      .actions { display: flex; gap: 4px; }
      .expand-row { display: none; background: #f9fafb; }
      .expand-row.open { display: table-row; }
      .expand-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; background: #f9fafb; }
      .expand-item { display: flex; flex-direction: column; }
      .expand-item label { font-size: 0.7rem; color: #64748b; margin-bottom: 4px; }
      .expand-item span { font-size: 0.85rem; font-weight: 500; color: #0f172a; }

      /* Side Panel */
      .panel-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000; }
      .panel-overlay.active { display: block; }
      .side-panel { position: fixed; z-index:99999; top: 0px; border-radius: 20px; right: -520px; width: 520px; height: 700px; background: white; box-shadow: -4px 0 32px rgba(0,0,0,0.18);  transition: right 0.3s ease; display: flex; flex-direction: column; }
      .side-panel.open { right: 0; }
      .side-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: white; flex-shrink: 0; }
      .side-panel-header h3 { font-size: 1.2rem; font-weight: 600; margin: 0; }
      .close-panel { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
      .side-panel-body { flex: 1; overflow-y: auto; padding: 24px; }
      .side-panel-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: white;  bottom: 0; z-index: 10; }

      /* Modal Styles */
      .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 3000; justify-content: center; align-items: center; }
      .modal-overlay.active { display: flex; }
      .modal-content { background: white; border-radius: 24px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; margin: 0 auto; animation: modalFadeIn 0.2s ease; width: 90%; max-width: 800px; }
      @keyframes modalFadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      .modal-large { width: 90%; max-width: 800px; }
      .modal-medium { width: 90%; max-width: 500px; }
      .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: white; flex-shrink: 0; }
      .modal-header h3 { font-size: 1.3rem; font-weight: 600; margin: 0; }
      .close-modal { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
      .modal-body { flex: 1; overflow-y: auto; padding: 24px; }

      /* View Tabs */
      .view-tabs { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; padding-bottom: 0; }
      .view-tab { background: none; border: none; padding: 10px 20px; font-size: 0.85rem; font-weight: 500; color: #64748b; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s; }
      .view-tab:hover { background: #f1f5f9; color: #1e293b; }
      .view-tab.active { background: #3b82f6; color: white; }
      .view-tab-content { display: none; }
      .view-tab-content.active { display: block; }
      .view-detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
      .view-detail-label { width: 150px; font-weight: 500; color: #64748b; font-size: 0.85rem; }
      .view-detail-value { flex: 1; color: #0f172a; font-size: 0.85rem; }
      .view-section { margin-bottom: 24px; }
      .view-section h4 { font-size: 1rem; font-weight: 600; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }

      /* Forms */
      .form-group { margin-bottom: 16px; }
      .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.82rem; color: #334155; }
      .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.88rem; box-sizing: border-box; }
      .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

      /* Notes */
      .notes-list { max-height: 300px; overflow-y: auto; margin-bottom: 20px; }
      .note-card { background: #f8fafc; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
      .note-text { font-size: 0.85rem; color: #1e293b; margin-bottom: 8px; }
      .note-meta { display: flex; gap: 16px; font-size: 0.7rem; color: #64748b; }
      .notes-input-area textarea { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; resize: vertical; box-sizing: border-box; margin-bottom: 12px; }
      .empty-state { text-align: center; padding: 40px; color: #64748b; }

      @media (max-width: 768px) {
        .side-panel { width: 100%; right: -100%; }
        .expand-grid { grid-template-columns: repeat(2, 1fr); }
        .form-row { grid-template-columns: 1fr; }
        .modal-content { width: 95%; max-height: 90vh; }
        .view-detail-row { flex-direction: column; }
        .view-detail-label { width: 100%; margin-bottom: 4px; }
      }
    `;
    document.head.appendChild(styles);
  };

  // Render leads table (simplified)
  function renderLeads(data) {
    const tbody = document.getElementById("leads-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="15"><div class="empty-state">Keine Leads gefunden.</div></td></tr>`;
      updateSelectedCount();
      return;
    }
    data.forEach((lead) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="cb lead-checkbox" data-id="${lead.id}" ${selectedLeads.has(lead.id) ? "checked" : ""}></td>
        <td><button class="expand-btn ${expandedRows.has(lead.id) ? "open" : ""}" onclick="window.toggleExpandLead(${lead.id})"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button></td>
        <td><span class="lead-name">${lead.name}</span></td>
        <td>${lead.ort}</td>
        <td><span class="badge ${lead.statusClass}">${lead.status}</span></td>
        <td><span class="tag">${lead.quelle}</span></td>
        <td><span class="assignee-chip">${lead.bearbeiter}</span></td>
        <td><span class="tag">${lead.kategorie || "—"}</span></td>
      <td><div style="width:32px;height:32px;border-radius:50%;background:#f0f0f0;"></div></td>
        <td><span class="amount">${lead.summe}</span></td>
        <td><span class="date-cell">${lead.datum}</span></td>
        <td><button class="act-btn" onclick="window.makeCallLead(${lead.id})"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91A16 16 0 0 0 13.09 15l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/></svg></button></td>
        <td><button class="act-btn" onclick="window.sendEmailLead(${lead.id})"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
</button></td>
        <td><button class="act-btn" onclick="window.openNotesLead(${lead.id})">          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
</button></td>
        <td><div class="actions"><button class="act-btn" onclick="window.editLead(${lead.id})">            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
</button><button class="act-btn" onclick="window.viewLead(${lead.id})">            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
</button><button class="act-btn" onclick="window.deleteLead(${lead.id})">🗑️</button></div></td>
      `;
      tbody.appendChild(tr);
      const xtr = document.createElement("tr");
      xtr.className = `expand-row ${expandedRows.has(lead.id) ? "open" : ""}`;
      xtr.innerHTML = `<td colspan="15"><div class="expand-grid"><div class="expand-item"><label>Dachfläche</label><span>${lead.dachflaeche || "—"}</span></div><div class="expand-item"><label>Dacheindeckung</label><span>${lead.dacheindeckung || "—"}</span></div><div class="expand-item"><label>Baujahr</label><span>${lead.baujahr || "—"}</span></div><div class="expand-item"><label>Dachpfanne</label><span>${lead.dachpfanne || "—"}</span></div><div class="expand-item"><label>Farbe</label><span>${lead.farbe || "—"}</span></div><div class="expand-item"><label>Dachneigung</label><span>${lead.dachneigung || "—"}</span></div><div class="expand-item"><label>Telefon</label><span>${lead.telefon || "—"}</span></div><div class="expand-item"><label>E-Mail</label><span>${lead.email || "—"}</span></div></div></td>`;
      tbody.appendChild(xtr);
    });
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

  function updateSelectedCount() {
    const el = document.getElementById("selected-count");
    if (el) el.textContent = `Wählen Sie Führen aus: ${selectedLeads.size}`;
  }
  function filterLeads() {
    const searchTerm =
      document.getElementById("search-input")?.value.toLowerCase() || "";
    const statusFilter = document.getElementById("filter-status")?.value || "";
    const quelleFilter = document.getElementById("filter-quelle")?.value || "";
    const filtered = leadsData.filter(
      (lead) =>
        (searchTerm === "" ||
          lead.name.toLowerCase().includes(searchTerm) ||
          lead.ort.toLowerCase().includes(searchTerm)) &&
        (statusFilter === "" || lead.status === statusFilter) &&
        (quelleFilter === "" || lead.quelle === quelleFilter),
    );
    renderLeads(filtered);
  }

  window.toggleExpandLead = (id) => {
    if (expandedRows.has(id)) expandedRows.delete(id);
    else expandedRows.add(id);
    filterLeads();
  };
  function openPanel(title) {
    document.getElementById("editPanelTitle").textContent = title;
    document.getElementById("editPanel").classList.add("open");
    document.getElementById("panelOverlay").classList.add("active");
  }
  function closePanel() {
    document.getElementById("editPanel").classList.remove("open");
    document.getElementById("panelOverlay").classList.remove("active");
  }

  window.editLead = (id) => {
    const lead = leadsData.find((l) => l.id === id);
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
    document.getElementById("editDatum").value = lead.datum;
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
    const lead = leadsData.find((l) => l.id === id);
    if (!lead) return;
    document.getElementById("viewTitle").textContent =
      `${lead.salutation ? lead.salutation + " " : ""}${lead.name}`;
    // Contact Tab
    document.getElementById("viewTabContact").innerHTML =
      `<div class="view-section"><div class="view-detail-row"><div class="view-detail-label">Anrede</div><div class="view-detail-value">${lead.salutation || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Name</div><div class="view-detail-value">${lead.name}</div></div><div class="view-detail-row"><div class="view-detail-label">Telefon</div><div class="view-detail-value">${lead.telefon || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">E-Mail</div><div class="view-detail-value">${lead.email || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Straße</div><div class="view-detail-value">${lead.strasseObjekt || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">PLZ / Ort</div><div class="view-detail-value">${lead.plz ? lead.plz + " " : ""}${lead.ort}</div></div><div class="view-detail-row"><div class="view-detail-label">Kontakt Via</div><div class="view-detail-value">${lead.kontaktVia || "—"}</div></div></div>`;
    // Lead Info Tab
    document.getElementById("viewTabLead").innerHTML =
      `<div class="view-section"><div class="view-detail-row"><div class="view-detail-label">Status</div><div class="view-detail-value"><span class="badge ${lead.statusClass}">${lead.status}</span></div></div><div class="view-detail-row"><div class="view-detail-label">Qualification</div><div class="view-detail-value">${lead.qualification || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Lead Quelle</div><div class="view-detail-value">${lead.quelle}</div></div><div class="view-detail-row"><div class="view-detail-label">Bearbeiter</div><div class="view-detail-value">${lead.bearbeiter}</div></div><div class="view-detail-row"><div class="view-detail-label">Summe Netto</div><div class="view-detail-value">${lead.summe}</div></div><div class="view-detail-row"><div class="view-detail-label">Angebot</div><div class="view-detail-value">${lead.angebot || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Sales Typ</div><div class="view-detail-value">${lead.salesTyp || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Datum</div><div class="view-detail-value">${lead.datum}</div></div><div class="view-detail-row"><div class="view-detail-label">Nachfassen</div><div class="view-detail-value">${lead.nachfassen || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Kategorie</div><div class="view-detail-value">${lead.kategorie || "—"}</div></div></div>`;
    // Roof Details Tab
    document.getElementById("viewTabRoof").innerHTML =
      `<div class="view-section"><div class="view-detail-row"><div class="view-detail-label">Dachfläche (m²)</div><div class="view-detail-value">${lead.dachflaeche || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Dacheindeckung</div><div class="view-detail-value">${lead.dacheindeckung || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Baujahr Dach</div><div class="view-detail-value">${lead.baujahr || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Dachpfanne</div><div class="view-detail-value">${lead.dachpfanne || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Wunsch Farbe</div><div class="view-detail-value">${lead.farbe || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Dachneigung Grad</div><div class="view-detail-value">${lead.dachneigung || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Zusätzliche Extras</div><div class="view-detail-value">${lead.zusatzExtras || "—"}</div></div><div class="view-detail-row"><div class="view-detail-label">Briefberatung Tel.</div><div class="view-detail-value">${lead.briefberatungTelefon || "—"}</div></div></div>`;
    // Notes Tab
    document.getElementById("viewTabNotes").innerHTML =
      `<div class="view-section">${lead.notes?.length ? lead.notes.map((n) => `<div class="note-card"><div class="note-text">${n.text}</div><div class="note-meta"><span>${n.author}</span><span>${n.date}</span></div></div>`).join("") : '<div class="empty-state">Keine Notizen vorhanden.</div>'}</div>`;

    // Tab switching
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.onclick = () => {
        document
          .querySelectorAll(".view-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".view-tab-content")
          .forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document
          .getElementById(
            `viewTab${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}`,
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
    const lead = leadsData.find((l) => l.id === currentNotesId);
    const list = document.getElementById("notesList");
    if (!lead || !lead.notes?.length) {
      list.innerHTML =
        '<div class="empty-state">Noch keine Notizen vorhanden.</div>';
      return;
    }
    list.innerHTML = lead.notes
      .map(
        (n) =>
          `<div class="note-card"><div class="note-text">${n.text}</div><div class="note-meta"><span>${n.author}</span><span>${n.date}</span></div></div>`,
      )
      .join("");
  }
  function saveNote() {
    const txt = document.getElementById("noteInput").value.trim();
    if (!txt) return;
    const lead = leadsData.find((l) => l.id === currentNotesId);
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
    filterLeads();
  }
  window.deleteLead = (id) => {
    if (confirm("Löschen?")) {
      leadsData = leadsData.filter((l) => l.id !== id);
      selectedLeads.delete(id);
      filterLeads();
    }
  };
  window.delegateLead = (id) => alert(`Lead ${id} delegieren`);
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
      id: nextId++,
      ...data,
      statusClass:
        data.status === "follow up"
          ? "badge-follow"
          : data.status === "Offen"
            ? "badge-offen"
            : data.status === "Infos..."
              ? "badge-info"
              : "badge-beauft",
      summe: `€${raw.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
      datum: data.datum || new Date().toISOString().split("T")[0],
      notes: [],
    };
    leadsData.unshift(newLead);
    filterLeads();
  }
  function updateLead(id, data) {
    const idx = leadsData.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const raw = parseFloat(data.summe) || 0;
    leadsData[idx] = {
      ...leadsData[idx],
      ...data,
      statusClass:
        data.status === "follow up"
          ? "badge-follow"
          : data.status === "Offen"
            ? "badge-offen"
            : data.status === "Infos..."
              ? "badge-info"
              : "badge-beauft",
      summe: `€${raw.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
    };
    filterLeads();
  }

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    addLeadsStyles();
    if (titleEl) {
      titleEl.innerHTML = `<h1>Alle Leads</h1><p>Complete Lead Übersicht</p>`;
      titleEl.style.display = "block";
    }
    if (!contentArea) return;
    contentArea.innerHTML = getHTML();
    filterLeads();
    document
      .getElementById("search-input")
      ?.addEventListener("input", filterLeads);
    document
      .getElementById("filter-status")
      ?.addEventListener("change", filterLeads);
    document
      .getElementById("filter-quelle")
      ?.addEventListener("change", filterLeads);
    document.getElementById("check-all")?.addEventListener("change", (e) => {
      document.querySelectorAll(".lead-checkbox").forEach((cb) => {
        cb.checked = e.target.checked;
        const id = parseInt(cb.dataset.id);
        if (e.target.checked) selectedLeads.add(id);
        else selectedLeads.delete(id);
      });
      updateSelectedCount();
    });
    document.getElementById("new-lead-btn")?.addEventListener("click", () => {
      currentEditId = null;
      document.getElementById("editForm").reset();
      openPanel("Erstellen");
    });
    document
      .getElementById("closeEditPanel")
      ?.addEventListener("click", closePanel);
    document
      .getElementById("cancelEditBtn")
      ?.addEventListener("click", closePanel);
    document
      .getElementById("panelOverlay")
      ?.addEventListener("click", closePanel);
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
    document
      .getElementById("closeViewModal")
      ?.addEventListener("click", () =>
        document.getElementById("viewModal").classList.remove("active"),
      );
    document.getElementById("viewModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("viewModal"))
        document.getElementById("viewModal").classList.remove("active");
    });
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

// window.leadsPage = leadsPage;
window.leadsPage = leadsPage;
console.log("leads.js loaded - window.leadsPage exists:", !!window.leadsPage);
