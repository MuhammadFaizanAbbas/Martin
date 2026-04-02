const kundenPage = (function () {
  let contentArea = null;
  let titleEl = null;
  let fullLeadsData = [];
  let notesCache = new Map();
  let activityCache = new Map();

  // ── API URLs ──────────────────────────────────────────────────────────────
  const SO_LEADS = "/api/leads";
  const SO_DASHBOARD = "/api/dashboard";
  const REMOTE_LEADS_URL = "https://goarrow.ai/test/fetch_all_leads.php";
  const REMOTE_DASHBOARD_URL = "https://goarrow.ai/test/dashboard.php";
  const ACTIVITY_FETCH_SAME = "/api/lead_activity";
  const NOTES_FETCH_SAME = "/api/lead_notes";

  const PROXY_LEADS_URL = `https://corsproxy.io/?${encodeURIComponent(REMOTE_LEADS_URL)}`;
  const PROXY_DASHBOARD_URL = `https://corsproxy.io/?${encodeURIComponent(REMOTE_DASHBOARD_URL)}`;
  const ALT_PROXY_LEADS_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(REMOTE_LEADS_URL)}`;
  const ALT_PROXY_DASHBOARD_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(REMOTE_DASHBOARD_URL)}`;

  // ── State ──────────────────────────────────────────────────────────────────
  let leadsData = [];
  let dashboardStats = {};
  let expandedRows = new Set();
  let selectedKunden = new Set();
  let checkedEdit = new Set();
  let kundenActiveFilter = "offen";
  let filteredData = [];
  let isLoading = false;
  
  // New filter states
  let statusFilter = "";
  let leadSourceFilter = "";
  let ortSearchTerm = "";

  const STATUS_MAPPING = {
    Offen: "Offen",
    "follow up": "follow up",
    "Infos eingeholt": "Infos...",
    "Nur Info eingeholt": "Infos...",
    "in Bearbeitung": "in Bearbeitung",
    Beauftragung: "Beauftragung",
    "EA Beauftragung": "EA Beauftragung",
    "NF Beauftragung": "NF Beauftragung",
    Abgesagt: "Abgesagt",
    "Abgesagt tot": "Abgesagt tot",
    "Außerhalb Einzugsgebiet": "Außerhalb",
    "falscher Kunde": "falscher Kunde",
    Ghoster: "Ghoster",
    Storniert: "Storniert",
  };

  function httpGetJson(url, controller) {
    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller?.signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, data };
    });
  }

  function fetchDelayed(url, delayMs, controller) {
    return new Promise((resolve, reject) => {
      const start = () => {
        httpGetJson(url, controller).then(resolve).catch(reject);
      };
      if (delayMs > 0) setTimeout(start, delayMs);
      else start();
    });
  }

  async function fetchFirstAvailable(urlsWithDelay) {
    const controllers = urlsWithDelay.map(() => new AbortController());
    const promises = urlsWithDelay.map((cfg, idx) =>
      fetchDelayed(cfg.url, cfg.delay || 0, controllers[idx])
    );

    try {
      const result = await Promise.any(promises);
      controllers.forEach((c) => {
        try { c.abort(); } catch {}
      });
      return result;
    } catch (err) {
      return { success: false, error: "All endpoints failed" };
    }
  }

  function isStaticLocalHost() {
    return (
      typeof location !== "undefined" &&
      (location.protocol === "file:" ||
        /^(localhost|127\.0\.0\.1)$/i.test(location.hostname || ""))
    );
  }

  async function fetchNotesForLead(leadId) {
    const cacheBust = `_ts=${Date.now()}`;
    try {
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      const res = await fetch(`${NOTES_FETCH_SAME}?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`, { 
        headers: { Accept: 'application/json' },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || data.notes || []);
      const normalized = (list || []).map(n => ({ 
        text: String(n.text || n.note || n.message || ''), 
        author: String(n.author || n.user || 'Created at'), 
        date: String(n.date || n.created_at || '') 
      }));
      notesCache.set(String(leadId), normalized);
      const idx = leadsData.findIndex(l => String(l.id) === String(leadId));
      if (idx !== -1) leadsData[idx].notes = normalized;
      return normalized;
    } catch (err) {
      console.warn('Same-origin notes fetch failed, trying proxies:', err.message);
    }
    
    const target = `https://goarrow.ai/test/fetch_lead_notes.php?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`;
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(target)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    ];
    for (const url of proxies) {
      try {
        const r = await fetch(url, {
          headers: { Accept: 'application/json' },
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data.data || data.notes || []);
        const normalized = (list || []).map(n => ({ 
          text: String(n.text || n.note || n.message || ''), 
          author: String(n.author || n.user || 'System'), 
          date: String(n.date || n.created_at || '') 
        }));
        notesCache.set(String(leadId), normalized);
        const idx = leadsData.findIndex(l => String(l.id) === String(leadId));
        if (idx !== -1) leadsData[idx].notes = normalized;
        return normalized;
      } catch (e) {
        console.warn('Notes proxy failed:', url, e.message);
      }
    }
    return [];
  }

  async function fetchActivityForLead(leadId) {
    const cacheBust = `_ts=${Date.now()}`;
    const normalize = (a) => {
      const text = a.text || a.activity || a.action || a.event || a.message || a.desc || a.description || '';
      const by = a.from || a.by || a.user || a.username || a.author || a.created_by || 'System';
      let at = a.at || a.datetime || a.timestamp || a.date_time || a.date || a.created_at || '';
      if (!at) {
        const d = a.activity_date || a.activityDate || a.date;
        const t = a.activity_time || a.activityTime || a.time;
        if (d || t) at = `${d || ''}${d && t ? ' ' : ''}${t || ''}`.trim();
      }
      return { text: String(text || ''), by: String(by || 'System'), at: String(at || '') };
    };

    async function tryFetch(url) {
      const r = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      console.log('🔎 Activity raw data:', data);
      const list = Array.isArray(data) ? data : (data.data || data.activity || data.items || []);
      return (list || []).map(normalize);
    }

    try {
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      let list = await tryFetch(`${ACTIVITY_FETCH_SAME}?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`);
      if (!list.length) {
        list = await tryFetch(`${ACTIVITY_FETCH_SAME}?id=${encodeURIComponent(leadId)}&${cacheBust}`);
      }
      if (list.length) {
        activityCache.set(String(leadId), list);
        return list;
      }
    } catch (err) {
      console.warn('Same-origin activity fetch failed:', err.message);
    }

    const base = 'https://goarrow.ai/test/fetch_activity.php';
    const targets = [
      `${base}?lead_id=${encodeURIComponent(leadId)}&${cacheBust}`,
      `${base}?id=${encodeURIComponent(leadId)}&${cacheBust}`,
    ];
    const proxies = (t) => [
      `https://corsproxy.io/?${encodeURIComponent(t)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(t)}`,
    ];
    for (const t of targets) {
      for (const url of proxies(t)) {
        try {
          const list = await tryFetch(url);
          if (list.length) {
            activityCache.set(String(leadId), list);
            return list;
          }
        } catch (e) {
          console.warn('Activity proxy failed:', url, e.message);
        }
      }
    }
    return [];
  }

  async function fetchLeads() {
    const result = await fetchFirstAvailable([
      { url: SO_LEADS, delay: 0 },
      { url: REMOTE_LEADS_URL, delay: 700 },
      { url: PROXY_LEADS_URL, delay: 1100 },
      { url: ALT_PROXY_LEADS_URL, delay: 1400 },
    ]);
    if (!result.success || !result.data) {
      console.error("Failed to fetch leads:", result.error);
      return [];
    }

    const rawList = Array.isArray(result.data)
      ? result.data
      : (result.data.data || result.data.leads || result.data.items || []);

    return (rawList || []).map((apiLead) => ({
      id: apiLead.id,
      name: apiLead.name || "—",
      salutation: apiLead.salutation || "",
      ort: apiLead.ort || "—",
      status: STATUS_MAPPING[apiLead.status] || apiLead.status || "Offen",
      statusClass: getStatusClass(apiLead.status),
      quelle: apiLead.lead_quelle || "—",
      bearbeiter: apiLead.bearbeiter || "—",
      summe: apiLead.summe_netto
        ? `$ ${formatNumber(apiLead.summe_netto)}`
        : "$ 0,00",
      datum: apiLead.created_at
        ? apiLead.created_at.split(" ")[0]
        : apiLead.datum || "—",
      dachflaeche: apiLead.dachflaeche_m2 || "",
      dacheindeckung: apiLead.dacheindeckung || "",
      dachalter: apiLead.baujahr_dach || "",
      dachpfanne: apiLead.dachpfanne || "",
      farbe: apiLead.wunsch_farbe || "",
      dachneigung: apiLead.dachneigung_grad
        ? `${apiLead.dachneigung_grad}°`
        : "",
      strasse: apiLead.strasse_objekt || "",
      telefon: apiLead.telefon || "",
      email: apiLead.email || "",
      nachfassen: apiLead.nachfassen,
      delegieren: apiLead.delegieren,
      notes: [],
      activities: [],
    }));
  }

  async function fetchDashboardStats() {
    const result = await fetchFirstAvailable([
      { url: SO_DASHBOARD, delay: 0 },
      { url: REMOTE_DASHBOARD_URL, delay: 700 },
      { url: PROXY_DASHBOARD_URL, delay: 1100 },
      { url: ALT_PROXY_DASHBOARD_URL, delay: 1400 },
    ]);

    if (!result.success || !result.data) {
      console.error("Failed to fetch dashboard stats:", result.error);
      return {};
    }

    if (result.data.data && typeof result.data.data === 'object') return result.data.data;
    if (typeof result.data === 'object') return result.data;
    return {};
  }

  async function loadAllData() {
    if (isLoading) return;
    isLoading = true;

    const tbody = document.getElementById("kunden-tbody");
    if (tbody) {
      tbody.innerHTML = `<td colspan="14"><div class="empty-state">⏳ Daten werden geladen...</div>`;
    }

    fetchLeads()
      .then((leads) => {
        leadsData = leads;
        fullLeadsData = leads;
        populateFilterOptions();
        renderKunden();
      })
      .catch((e) => {
        console.error("Leads load failed", e);
        if (tbody) {
          tbody.innerHTML = `|<td colspan="14"><div class="empty-state">❌ Fehler beim Laden der Leads.</div>`;
        }
      })
      .finally(() => {
        isLoading = false;
      });

    fetchDashboardStats()
      .then((stats) => {
        dashboardStats = stats;
        renderStats();
      })
      .catch((e) => {
        console.warn("Dashboard stats load failed", e);
      });
  }

  // Populate filter dropdowns with unique values
  function populateFilterOptions() {
    // Get unique statuses
    const uniqueStatuses = [...new Set(leadsData.map(lead => lead.status).filter(s => s && s !== "—"))];
    const statusSelect = document.getElementById("filter-status");
    if (statusSelect) {
      statusSelect.innerHTML = '<option value="">Alle Status</option>' + 
        uniqueStatuses.map(status => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('');
    }
    
    // Get unique lead sources
    const uniqueSources = [...new Set(leadsData.map(lead => lead.quelle).filter(s => s && s !== "—"))];
    const sourceSelect = document.getElementById("filter-source");
    if (sourceSelect) {
      sourceSelect.innerHTML = '<option value="">Alle Quellen</option>' + 
        uniqueSources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join('');
    }
  }

  // Apply all filters
  function applyFilters() {
    renderKunden();
  }

  // Reset all filters
  function resetFilters() {
    statusFilter = "";
    leadSourceFilter = "";
    ortSearchTerm = "";
    
    const statusSelect = document.getElementById("filter-status");
    const sourceSelect = document.getElementById("filter-source");
    const ortInput = document.getElementById("filter-ort");
    
    if (statusSelect) statusSelect.value = "";
    if (sourceSelect) sourceSelect.value = "";
    if (ortInput) ortInput.value = "";
    
    renderKunden();
  }

  function formatNumber(num) {
    if (!num || num === "0.00") return "0,00";
    return parseFloat(num).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getStatusClass(status) {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "follow up") return "badge-follow";
    if (statusLower === "offen") return "badge-offen";
    if (
      statusLower === "infos eingeholt" ||
      statusLower === "nur info eingeholt"
    )
      return "badge-info";
    if (
      statusLower === "beauftragung" ||
      statusLower === "ea beauftragung" ||
      statusLower === "nf beauftragung"
    )
      return "badge-beauft";
    if (statusLower === "in bearbeitung") return "badge-bearbeitung";
    return "badge-offen";
  }

  function shouldShowPhoneIcon() {
    if (kundenActiveFilter === "bearbeitung") return false;
    if (kundenActiveFilter === "beauft") return false;
    return true;
  }

  function shouldShowEmailIcon() {
    if (kundenActiveFilter === "offen") return false;
    if (kundenActiveFilter === "beauft") return false;
    return true;
  }

  function getStatDefinitions() {
    return [
      {
        key: "offen",
        label: "Offen",
        icon: "📞",
        count: dashboardStats.Offen || 0,
        filter: (l) => l.status === "Offen",
      },
      {
        key: "bearbeitung",
        label: "in Bearbeitung",
        icon: "📞",
        count: dashboardStats["in Bearbeitung"] || 0,
        filter: (l) => l.status === "in Bearbeitung",
      },
      {
        key: "followup",
        label: "follow up",
        icon: "📞",
        count: dashboardStats["follow up"] || 0,
        filter: (l) => l.status === "follow up",
      },
      {
        key: "auftrags",
        label: "Auftragsbestätigung",
        icon: "📞",
        count: 0,
        filter: (l) => l.status === "Auftragsbestätigung",
      },
      {
        key: "beauft",
        label: "Beauftragung",
        isMulti: true,
        counts: {
          beauftragung: dashboardStats.Beauftragung || 0,
          eaBeauftragung: dashboardStats["EA Beauftragung"] || 0,
          nfBeauftragung: dashboardStats["NF Beauftragung"] || 0,
        },
        filter: (l) =>
          ["Beauftragung", "EA Beauftragung", "NF Beauftragung"].includes(
            l.status,
          ),
      },
    ];
  }

  function renderStats() {
    const el = document.getElementById("kunden-stats");
    if (!el) return;

    const statDefs = getStatDefinitions();
    let html = "";

    statDefs.forEach((def) => {
      const isActive = kundenActiveFilter === def.key;

      if (def.isMulti) {
        html += `<div class="kstat-card${isActive ? " active" : ""}" onclick="window.setKundenFilter('${def.key}')" style="min-width: 190px; flex: 1.5">
          <div class="kstat-active-dot"></div>
          <div class="kstat-lbl">${def.label}</div>
          <div class="kstat-multi">
            <div class="kstat-multi-row"><span>Beauftragung</span><span>${def.counts.beauftragung}</span></div>
            <div class="kstat-multi-row"><span>EA Beauftragung</span><span>${def.counts.eaBeauftragung}</span></div>
            <div class="kstat-multi-row"><span>NF Beauftragung</span><span>${def.counts.nfBeauftragung}</span></div>
          </div>
        </div>`;
      } else {
        html += `<div class="kstat-card${isActive ? " active" : ""}" onclick="window.setKundenFilter('${def.key}')">
          <div class="kstat-active-dot"></div>
          <div class="kstat-lbl">${def.label}</div>
          <div class="kstat-val">${def.count}</div>
        </div>`;
      }
    });

    el.innerHTML = html;
  }

  function updateMassEmailButton() {
    const massEmailBtn = document.getElementById("mass-email-btn");
    const selectedCount = selectedKunden.size;
    
    if (massEmailBtn) {
      if (selectedCount > 0) {
        massEmailBtn.style.display = "flex";
        massEmailBtn.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-10 7L2 7"/>
          </svg>
          Senden Sie Massen-E-Mails (${selectedCount})
        `;
      } else {
        massEmailBtn.style.display = "none";
      }
    }
  }

  function openMassEmailModal() {
    if (selectedKunden.size === 0) return;
    
    const selectedLeads = leadsData.filter(lead => selectedKunden.has(lead.id));
    
    const modalHtml = `
      <div id="massEmailModal" class="k-modal-overlay">
        <div class="k-modal-content" style="max-width: 650px;">
          <div class="k-modal-header">
            <h3>Senden Sie Massen-E-Mails</h3>
            <button class="k-close-btn" id="closeMassEmailModal">&times;</button>
          </div>
          <div class="k-modal-body">
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">Choose an E-Mail</label>
              <select id="email-template-select" class="k-full-select">
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
            
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">Name</label>
              <div style="padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a;">
                ${selectedLeads.map(lead => {
                  const displayName = (lead.salutation ? lead.salutation + " " : "") + lead.name;
                  return `<div style="margin-bottom: 5px;">${escapeHtml(displayName)}</div>`;
                }).join('')}
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">E-Mail</label>
              <div style="padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a;">
                ${selectedLeads.map(lead => {
                  return `<div style="margin-bottom: 5px;">${escapeHtml(lead.email || "—")}</div>`;
                }).join('')}
              </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
              <button type="button" id="cancelMassEmail" class="k-btn-outline" style="padding: 10px 24px; border: 1px solid #e2e8f0; background: white; border-radius: 8px; cursor: pointer;">Abbrechen</button>
              <button type="button" id="sendMassEmail" class="k-btn-green" style="padding: 10px 24px;">E-Mail senden</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const existingModal = document.getElementById("massEmailModal");
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById("massEmailModal");
    const closeBtn = document.getElementById("closeMassEmailModal");
    const cancelBtn = document.getElementById("cancelMassEmail");
    const sendBtn = document.getElementById("sendMassEmail");
    
    const closeModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    };
    
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    sendBtn?.addEventListener('click', () => {
      const selectedTemplate = document.getElementById("email-template-select")?.value || "";
      
      const emailData = selectedLeads.map(lead => {
        return {
          id: lead.id,
          name: (lead.salutation ? lead.salutation + " " : "") + lead.name,
          email: lead.email,
          datum: lead.datum,
        };
      });
      
      const massEmailData = {
        template: selectedTemplate,
        recipients: emailData,
        date: new Date().toISOString()
      };
      
      console.log("Sending mass email:", massEmailData);
      alert(`E-Mails werden gesendet:\n\nTemplate: ${selectedTemplate}\nEmpfänger: ${emailData.length}\n\nDetails in Console einsehbar`);
      
      closeModal();
    });
    
    modal.classList.add('active');
  }

  function renderKunden() {
    if (!leadsData.length) {
      renderStats();
      return;
    }

    renderStats();

    const statDefs = getStatDefinitions();
    const activeDef = statDefs.find((d) => d.key === kundenActiveFilter);

    const pillEl = document.getElementById("kunden-filter-pill");
    if (pillEl) {
      if (activeDef) {
        pillEl.style.display = "block";
        pillEl.innerHTML = `<span class="active-filter-pill">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Gefiltert: ${activeDef.label}
          <button onclick="window.clearKundenFilter()" title="Filter entfernen">✕</button>
        </span>`;
      } else {
        pillEl.style.display = "none";
      }
    }

    // Get filter values
    const searchInput = document.getElementById("kunden-search");
    const searchTerm = (searchInput?.value || "").toLowerCase();
    statusFilter = document.getElementById("filter-status")?.value || "";
    leadSourceFilter = document.getElementById("filter-source")?.value || "";
    ortSearchTerm = (document.getElementById("filter-ort")?.value || "").toLowerCase();

    // Apply filters
    let data = leadsData.slice();
    
    // Apply status card filter
    if (activeDef && activeDef.filter) {
      data = data.filter(activeDef.filter);
    }
    
    // Apply status dropdown filter
    if (statusFilter) {
      data = data.filter(l => l.status === statusFilter);
    }
    
    // Apply lead source dropdown filter
    if (leadSourceFilter) {
      data = data.filter(l => l.quelle === leadSourceFilter);
    }
    
    // Apply search term filter (name or ort)
    if (searchTerm) {
      data = data.filter(
        (l) =>
          l.name.toLowerCase().includes(searchTerm) ||
          l.ort.toLowerCase().includes(searchTerm),
      );
    }
    
    // Apply ort search filter
    if (ortSearchTerm) {
      data = data.filter(
        (l) =>
          l.ort.toLowerCase().includes(ortSearchTerm),
      );
    }

    filteredData = data;

    const tbody = document.getElementById("kunden-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!filteredData.length) {
      tbody.innerHTML = `<td colspan="14"><div class="empty-state">Keine Kunden in dieser Kategorie.</div>`;
      updateCount();
      return;
    }

    const showPhoneIcon = shouldShowPhoneIcon();
    const showEmailIcon = shouldShowEmailIcon();

    filteredData.forEach((lead) => {
      const isExp = expandedRows.has(lead.id);
      const editCb = checkedEdit.has(lead.id);
      const displayName =
        (lead.salutation ? lead.salutation + " " : "") + lead.name;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <tr>
          <td>
          <input type="checkbox" class="cb kunden-cb" data-id="${lead.id}" ${selectedKunden.has(lead.id) ? "checked" : ""}>
         </td>
         <td>
          <button class="expand-btn ${isExp ? "open" : ""}" onclick="window.toggleKundenExpand(${lead.id})">
            <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
         </td>
         <td><span style="font-weight:500">${escapeHtml(displayName)}</span></td>
        <td style="font-size:0.8rem;color:#64748b">${escapeHtml(lead.ort)}</td>
         <td><span class="badge ${lead.statusClass}">${escapeHtml(lead.status)}</span></td>
         <td>${lead.quelle ? `<span class="tag">${escapeHtml(lead.quelle)}</span>` : ""}</td>
         <td>${lead.bearbeiter ? `<span class="assignee-chip">${escapeHtml(lead.bearbeiter)}</span>` : ""}</td>
         <td>
          <div style="width:32px;height:32px;border-radius:50%;background:#f0f0f0;"></div>
         </td>
         <td><span class="amount">${escapeHtml(lead.summe)}</span></td>
         <td><span class="date-cell">${escapeHtml(lead.datum)}</span></td>
         <td>
          <button class="act-btn" onclick="window.viewKunde(${lead.id})" title="Details anzeigen">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
         </td>
         <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${showPhoneIcon ? `
              <button class="act-btn-green" onclick="window.callKunde(${lead.id})" title="Anrufen">
                <svg width="14" height="14" fill="white" stroke="white" stroke-width="1.5" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91A16 16 0 0 0 13.09 15l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/>
                </svg>
              </button>
            ` : ''}
            ${showEmailIcon ? `
              <button class="act-btn-email" onclick="window.sendEmailToKunde(${lead.id})" title="E-Mail senden">
                <svg width="14" height="14" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-10 7L2 7"/>
                </svg>
              </button>
            ` : ''}
          </div>
         </td>
         <td>
          <div class="bearbeiten-cell">
            <input type="checkbox" class="edit-cb" data-id="${lead.id}" ${editCb ? "checked" : ""} 
              onchange="window.toggleEditCheck(${lead.id},this)">
            <button class="edit-icon-btn" onclick="window.editKundeClick(${lead.id})" ${editCb ? "" : "disabled"} title="Bearbeiten">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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

      const xtr = document.createElement("tr");
      xtr.className = `expand-row${isExp ? " open" : ""}`;
      xtr.innerHTML = `<td colspan="14"><div class="expand-grid">
        <div class="expand-item"><label>Dachfläche (m²)</label><span>${escapeHtml(lead.dachflaeche || "—")}</span></div>
        <div class="expand-item"><label>Dacheindeckung</label><span>${escapeHtml(lead.dacheindeckung || "—")}</span></div>
        <div class="expand-item"><label>Baujahr Dach</label><span>${escapeHtml(lead.dachalter || "—")}</span></div>
        <div class="expand-item"><label>Dachpfanne</label><span>${escapeHtml(lead.dachpfanne || "—")}</span></div>
        <div class="expand-item"><label>Wunsch Farbe</label><span>${escapeHtml(lead.farbe || "—")}</span></div>
        <div class="expand-item"><label>Dachneigung Grad</label><span>${escapeHtml(lead.dachneigung || "—")}</span></div>
        <div class="expand-item"><label>Straße</label><span>${escapeHtml(lead.strasse || "—")}</span></div>
        <div class="expand-item"><label>Telefon</label><span>${escapeHtml(lead.telefon || "—")}</span></div>
        <div class="expand-item"><label>E-Mail</label><span>${escapeHtml(lead.email || "—")}</span></div>
      </div>`;
      tbody.appendChild(xtr);
    });

    document.querySelectorAll(".kunden-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedKunden.add(id);
        else selectedKunden.delete(id);
        updateCount();
        updateMassEmailButton();
      });
    });

    updateCount();
    updateMassEmailButton();
  }

  function updateCount() {
    const el = document.getElementById("kunden-selected-count");
    if (el) el.textContent = `Wählen Sie Leads aus: ${selectedKunden.size}`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.setKundenFilter = (key) => {
    kundenActiveFilter = key;
    renderKunden();
  };
  window.clearKundenFilter = () => {
    kundenActiveFilter = null;
    renderKunden();
  };
  window.toggleKundenExpand = (id) => {
    if (expandedRows.has(id)) expandedRows.delete(id);
    else expandedRows.add(id);
    renderKunden();
  };

  window.toggleEditCheck = (id, cbEl) => {
    if (cbEl.checked) checkedEdit.add(id);
    else checkedEdit.delete(id);
    const btn = cbEl.parentElement?.querySelector(".edit-icon-btn");
    if (btn) btn.disabled = !cbEl.checked;
  };

  window.editKundeClick = (id) => {
    if (!checkedEdit.has(id)) return;
    window.openStatusModal(id);
  };

  let statusModalLeadId = null;
  window.openStatusModal = (id) => {
    statusModalLeadId = id;
    const lead = leadsData.find((l) => l.id === id);
    const sel = document.getElementById("statusModalSelect");
    if (sel && lead) sel.value = lead.status || "";
    const modal = document.getElementById("statusModal");
    if (modal) modal.classList.add("active");
  };

  window.viewKunde = async (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (!lead) return;
    
    const titleEl = document.getElementById("kundenViewTitle");
    const contentEl = document.getElementById("kundenViewContent");
    if (titleEl) titleEl.textContent = (lead.salutation ? lead.salutation + " " : "") + lead.name + " – Details";
    if (contentEl) {
      contentEl.innerHTML = `<div style="text-align: center; padding: 40px;">⏳ Lade Notizen und Aktivitäten...</div>`;
    }
    
    const [notes, activities] = await Promise.all([
      fetchNotesForLead(lead.id),
      fetchActivityForLead(lead.id)
    ]);
    
    if (contentEl) {
      let notesHtml = '';
      if (notes && notes.length > 0) {
        notesHtml = notes.map(note => `
          <div class="timeline-item">
            <div class="timeline-icon">📝</div>
            <div class="timeline-content">
              <div class="timeline-text">${escapeHtml(note.text)}</div>
              <div class="timeline-meta">
                <span class="timeline-author">${escapeHtml(note.author)}</span>
                <span class="timeline-date">${escapeHtml(note.date || 'Kein Datum')}</span>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        notesHtml = `<div class="empty-notes">Keine Notizen vorhanden</div>`;
      }
      
      let activitiesHtml = '';
      if (activities && activities.length > 0) {
        activitiesHtml = activities.map(activity => `
          <div class="timeline-item">
            <div class="timeline-icon">📋</div>
            <div class="timeline-content">
              <div class="timeline-text">${escapeHtml(activity.text)}</div>
              <div class="timeline-meta">
                <span class="timeline-author">${escapeHtml(activity.by)}</span>
                <span class="timeline-date">${escapeHtml(activity.at || 'Kein Datum')}</span>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        activitiesHtml = `<div class="empty-activities">Keine Aktivitäten vorhanden</div>`;
      }
      
      contentEl.innerHTML = `
        <div class="k-view-section">
          <h4>Kontaktinformationen</h4>
          <div class="k-detail-row"><div class="k-detail-label">Anrede</div><div class="k-detail-value">${escapeHtml(lead.salutation || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Name</div><div class="k-detail-value">${escapeHtml(lead.name)}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Ort</div><div class="k-detail-value">${escapeHtml(lead.ort)}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Straße</div><div class="k-detail-value">${escapeHtml(lead.strasse || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Telefon</div><div class="k-detail-value">${escapeHtml(lead.telefon || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">E-Mail</div><div class="k-detail-value">${escapeHtml(lead.email || "—")}</div></div>
        </div>
        <div class="k-view-section">
          <h4>Lead Informationen</h4>
          <div class="k-detail-row"><div class="k-detail-label">Status</div><div class="k-detail-value"><span class="badge ${lead.statusClass}">${escapeHtml(lead.status)}</span></div></div>
          <div class="k-detail-row"><div class="k-detail-label">Lead Quelle</div><div class="k-detail-value">${escapeHtml(lead.quelle || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Bearbeiter</div><div class="k-detail-value">${escapeHtml(lead.bearbeiter || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Summe Netto</div><div class="k-detail-value">${escapeHtml(lead.summe)}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Datum</div><div class="k-detail-value">${escapeHtml(lead.datum)}</div></div>
        </div>
        <div class="k-view-section">
          <h4>Dachdetails</h4>
          <div class="k-detail-row"><div class="k-detail-label">Dachfläche (m²)</div><div class="k-detail-value">${escapeHtml(lead.dachflaeche || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Dacheindeckung</div><div class="k-detail-value">${escapeHtml(lead.dacheindeckung || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Baujahr Dach</div><div class="k-detail-value">${escapeHtml(lead.dachalter || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Dachpfanne</div><div class="k-detail-value">${escapeHtml(lead.dachpfanne || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Wunsch Farbe</div><div class="k-detail-value">${escapeHtml(lead.farbe || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Dachneigung Grad</div><div class="k-detail-value">${escapeHtml(lead.dachneigung || "—")}</div></div>
        </div>
        
        <div class="k-view-section">
          <h4>📝 Notiz anzeigen</h4>
          <div class="timeline-container">
            ${notesHtml}
          </div>
        </div>
        
        <div class="k-view-section">
          <h4>⏱️ Aktivitätszeitleiste</h4>
          <div class="timeline-container">
            ${activitiesHtml}
          </div>
        </div>
      `;
    }
    const modal = document.getElementById("kundenViewModal");
    if (modal) modal.classList.add("active");
  };

  window.callKunde = async (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (lead && lead.telefon) {
      let phoneNumber = String(lead.telefon).replace(/[\s\-\(\)]/g, '');
      
      if (phoneNumber.startsWith('0') && !phoneNumber.startsWith('+')) {
        phoneNumber = '+49' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('00')) {
        phoneNumber = '+49' + phoneNumber;
      }
      
      const baseUrl = "https://msdach.3cx.eu:5001/webclient/#/call";
      const callUrl = `${baseUrl}?phone=${encodeURIComponent(phoneNumber)}`;
      
      console.log(`📞 Calling ${lead.name} (ID: ${lead.id}) at ${phoneNumber}`);
      console.log(`🔗 Opening 3CX: ${callUrl}`);
      
      window.open(callUrl, "_blank");
      
      try {
        const activityData = {
          lead_id: lead.id,
          lead_name: lead.name,
          action: "call_initiated",
          phone: lead.telefon,
          phone_formatted: phoneNumber,
          timestamp: new Date().toISOString(),
          user: lead.bearbeiter || "current_user",
          source: "kunden_page_phone_icon"
        };
        
        console.log("✅ Call logged:", activityData);
      } catch (err) {
        console.warn("⚠️ Failed to log call activity:", err.message);
      }
      
    } else {
      alert("Keine Telefonnummer vorhanden für diesen Kunden.");
    }
  };

  window.sendEmailToKunde = (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (lead && lead.email) {
      alert(`E-Mail wird gesendet an: ${lead.email}`);
    } else {
      alert("Keine E-Mail Adresse vorhanden");
    }
  };

  window.openKarte = (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (lead && (lead.strasse || lead.ort)) {
      const address = `${lead.strasse || ""} ${lead.ort || ""}`;
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(address)}`,
        "_blank",
      );
    } else {
      alert("Keine Adresse vorhanden");
    }
  };

  window.openMassEmailModal = openMassEmailModal;

  function saveStatusUpdate() {
    const newStatus = document.getElementById("statusModalSelect")?.value;
    if (!newStatus) {
      alert("Bitte Status wählen");
      return;
    }

    const lead = leadsData.find((l) => l.id === statusModalLeadId);
    if (lead) {
      lead.status = newStatus;
      lead.statusClass = getStatusClass(newStatus);
      console.log(`Lead ${statusModalLeadId} status updated to ${newStatus}`);
    }

    const modal = document.getElementById("statusModal");
    if (modal) modal.classList.remove("active");
    renderKunden();
  }

  function addKundenStyles() {
    if (document.getElementById("kunden-styles")) return;
    const s = document.createElement("style");
    s.id = "kunden-styles";
    s.textContent = `
      .kunden-container { width: 100%; }
      .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
      .kunden-stats { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
      .kstat-card { background: white; border-radius: 16px; padding: 18px 22px; flex: 1; min-width: 130px; cursor: pointer; border: 2px solid transparent; box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: all 0.18s; position: relative; }
      .kstat-card:hover { border-color: #cbd5e1; }
      .kstat-card.active { border-color: #22c55e; background: #f0fdf4; }
      .kstat-active-dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: none; }
      .kstat-card.active .kstat-active-dot { display: block; }
      .kstat-lbl { font-size: 0.78rem; color: #64748b; margin-bottom: 6px; }
      .kstat-val { font-size: 2rem; font-weight: 700; color: #0f172a; }
      .kstat-multi { margin-top: 4px; }
      .kstat-multi-row { display: flex; justify-content: space-between; font-size: 0.78rem; padding: 5px 0; color: #475569; border-bottom: 1px solid #f1f5f9; }
      .kstat-multi-row:last-child { border-bottom: none; }
      .kstat-multi-row span:last-child { font-weight: 600; color: #0f172a; }
      .active-filter-pill { display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; padding: 8px 16px; border-radius: 40px; font-size: 0.85rem; color: #166534; margin-bottom: 16px; }
      .active-filter-pill button { background: none; border: none; cursor: pointer; font-size: 1rem; color: #166534; padding: 0 4px; }
      .filter-section { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: flex-end; }
      .filter-group { display: flex; flex-direction: column; gap: 6px; }
      .filter-group label { font-size: 0.75rem; font-weight: 500; color: #64748b; }
      .filter-group select, .filter-group input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; background: white; min-width: 180px; }
      .filter-group select:focus, .filter-group input:focus { outline: none; border-color: #22c55e; }
      .filter-actions { display: flex; gap: 8px; margin-left: auto; align-items: center; }
      .reset-filter-btn { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #475569; transition: all 0.2s; }
      .reset-filter-btn:hover { background: #e2e8f0; }
      .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
      .search-box { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 40px; padding: 8px 16px; gap: 8px; flex: 1; max-width: 300px; }
      .search-box input { border: none; outline: none; font-size: 0.85rem; width: 100%; height: 30px; }
      .spacer { flex: 1; }
      .table-label { margin: 8px 0 16px; font-size: 0.85rem; color: #64748b; }
      .mass-email-btn {
        display: none;
        align-items: center;
        gap: 8px;
        background: #22c55e;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }
      .mass-email-btn:hover { background: #16a34a; }
      .mass-email-btn svg { stroke: white; }
      .table-wrap { overflow-x: auto; background: white; border-radius: 16px; border: 1px solid #eef2f8; }
      #kunden-table { width: 100%; border-collapse: collapse; min-width: 1300px; }
      #kunden-table th { text-align: left; padding: 13px 10px; background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.78rem; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
      #kunden-table td { padding: 11px 10px; border-bottom: 1px solid #f1f5f9; font-size: 0.83rem; vertical-align: middle; }
      #kunden-table tr:hover { background: #f8fafc; }
      .cb { width: 16px; height: 16px; cursor: pointer; accent-color: #22c55e; }
      .expand-btn { background: none; border: none; cursor: pointer; padding: 3px 6px; color: #94a3b8; }
      .expand-btn.open svg { transform: rotate(90deg); }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 500; }
      .badge-follow { background: #dbeafe; color: #1e40af; }
      .badge-offen  { background: #fef3c7; color: #92400e; }
      .badge-info   { background: #e0e7ff; color: #4338ca; }
      .badge-beauft { background: #dcfce7; color: #166534; }
      .badge-bearbeitung { background: #fed7aa; color: #9a3412; }
      .tag { display: inline-block; padding: 3px 8px; background: #f1f5f9; border-radius: 12px; font-size: 0.72rem; }
      .assignee-chip { display: inline-block; padding: 3px 10px; background: #eef2ff; border-radius: 20px; font-size: 0.72rem; font-weight: 500; color: #4f46e5; }
      .amount { font-weight: 600; color: #0f172a; }
      .date-cell { color: #64748b; font-size: 0.75rem; white-space: nowrap; }
      .act-btn { background: none; border: none; cursor: pointer; padding: 5px 7px; border-radius: 7px; color: #64748b; transition: all 0.18s; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn:hover { background: #f1f5f9; color: #3b82f6; }
      .act-btn-green { background: #22c55e; border: none; cursor: pointer; padding: 7px 9px; border-radius: 9px; color: white; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn-green:hover { background: #16a34a; }
      .act-btn-email { background: #3b82f6; border: none; cursor: pointer; padding: 7px 9px; border-radius: 9px; color: white; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn-email:hover { background: #2563eb; }
      .act-btn-outline { background: none; border: 1.5px solid #e2e8f0; cursor: pointer; padding: 5px 7px; border-radius: 7px; color: #94a3b8; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn-green-outline { background: none; border: 1.5px solid #22c55e; cursor: pointer; padding: 5px 7px; border-radius: 7px; color: #22c55e; display: inline-flex; align-items: center; justify-content: center; }
      .bearbeiten-cell { display: flex; align-items: center; gap: 6px; }
      .edit-cb { width: 15px; height: 15px; cursor: pointer; accent-color: #22c55e; }
      .edit-icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: #64748b; display: inline-flex; align-items: center; transition: all 0.18s; }
      .edit-icon-btn:hover:not(:disabled) { background: #f1f5f9; color: #3b82f6; }
      .edit-icon-btn:disabled { color: #d1d5db; cursor: not-allowed; }
      .expand-row { display: none; background: #f9fafb; }
      .expand-row.open { display: table-row; }
      .expand-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; }
      .expand-item { display: flex; flex-direction: column; }
      .expand-item label { font-size: 0.7rem; color: #64748b; margin-bottom: 3px; }
      .expand-item span { font-size: 0.83rem; font-weight: 500; color: #0f172a; }
      .k-modal-overlay { display: none; position: fixed; z-index:9999; inset: 0; background: rgba(0,0,0,0.45); justify-content: center; align-items: center; }
      .k-modal-overlay.active { display: flex; }
      .k-modal-content { background: white; border-radius: 20px; width: 90%; max-width: 650px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; animation: kmodalIn 0.2s ease; }
      .k-modal-sm { max-width: 460px; }
      @keyframes kmodalIn { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }
      .k-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
      .k-modal-header h3 { font-size: 1.2rem; font-weight: 700; margin: 0; color: #0f172a; }
      .k-close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #94a3b8; line-height: 1; }
      .k-modal-body { flex: 1; overflow-y: auto; padding: 24px; }
      .k-full-select { width: 100%; padding: 11px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; background: white; color: #64748b; }
      .k-full-input { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-family: inherit; }
      .k-full-input:focus { outline: none; border-color: #22c55e; }
      .k-btn-green { background: #22c55e; color: white; border: none; padding: 12px 28px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
      .k-btn-green:hover { background: #16a34a; }
      .k-btn-outline { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
      .k-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
      .k-view-section { margin-bottom: 20px; }
      .k-view-section h4 { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin-bottom: 10px; padding-bottom: 7px; border-bottom: 1px solid #e2e8f0; }
      .k-detail-row { display: flex; padding: 9px 0; border-bottom: 1px solid #f8fafc; }
      .k-detail-label { width: 150px; font-weight: 500; color: #64748b; font-size: 0.83rem; flex-shrink: 0; }
      .k-detail-value { flex: 1; color: #0f172a; font-size: 0.83rem; }
      .empty-state { text-align: center; padding: 40px; color: #94a3b8; font-size: 0.9rem; }
      .empty-notes, .empty-activities { text-align: center; padding: 20px; color: #94a3b8; font-size: 0.85rem; background: #f8fafc; border-radius: 8px; }
      .timeline-container { max-height: 300px; overflow-y: auto; }
      .timeline-item { display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9; }
      .timeline-icon { width: 32px; height: 32px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
      .timeline-content { flex: 1; }
      .timeline-text { font-size: 0.85rem; color: #0f172a; margin-bottom: 4px; }
      .timeline-meta { display: flex; gap: 12px; font-size: 0.7rem; color: #64748b; }
      .timeline-author { font-weight: 500; }
      .timeline-date { color: #94a3b8; }
      @media (max-width: 768px) { .expand-grid { grid-template-columns: repeat(2, 1fr); } .k-modal-content { width: 96%; } .filter-section { flex-direction: column; align-items: stretch; } .filter-group select, .filter-group input { width: 100%; } .filter-actions { margin-left: 0; } }
    `;
    document.head.appendChild(s);
  }

  function getHTML() {
    return `
      <div class="kunden-container">
        <div class="page-title">Meine Kunden</div>
        <div class="kunden-stats" id="kunden-stats"></div>
        <div id="kunden-filter-pill" style="display:none"></div>
        
        <!-- Filter Section -->
        <div class="filter-section">
        
          <div class="filter-group">
            <label>Lead Quelle</label>
            <select id="filter-source" onchange="window.applyFilters()">
              <option value="">Alle Quellen</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Ort</label>
            <input type="text" id="filter-ort" placeholder="Ort suchen..." oninput="window.applyFilters()" />
          </div>
          <div class="filter-actions">
            <button class="reset-filter-btn" onclick="window.resetFilters()">Filter zurücksetzen</button>
          </div>
        </div>
        
        <div class="toolbar">
          <div class="search-box">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Name oder Ort suchen..." id="kunden-search"/>
          </div>
          <div class="spacer"></div>
          <button id="mass-email-btn" class="mass-email-btn" onclick="window.openMassEmailModal()" style="display: none;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-10 7L2 7"/>
            </svg>
            Senden Sie Massen-E-Mails
          </button>
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
                <th>Aktionen</th>
                <th>Bearbeiten</th>
                <th>Karte</th>
              </tr>
            </thead>
            <tbody id="kunden-tbody"></tbody>
           </table>
        </div>
      </div>

      <div id="kundenViewModal" class="k-modal-overlay">
        <div class="k-modal-content">
          <div class="k-modal-header">
            <h3 id="kundenViewTitle">Kunden Details</h3>
            <button class="k-close-btn" id="closeKundenViewModal">&times;</button>
          </div>
          <div class="k-modal-body" id="kundenViewContent"></div>
        </div>
      </div>

      <div id="statusModal" class="k-modal-overlay">
        <div class="k-modal-content k-modal-sm">
          <div class="k-modal-header">
            <h3>Status ändern</h3>
            <button class="k-close-btn" id="closeStatusModal">&times;</button>
          </div>
          <div class="k-modal-body">
            <div class="form-group">
              <select id="statusModalSelect" class="k-full-select">
                <option value="">Status auswählen</option>
                <option value="Offen">Offen</option>
                <option value="follow up">Follow up</option>
                <option value="Infos...">Infos...</option>
                <option value="in Bearbeitung">In Bearbeitung</option>
                <option value="Beauftragung">Beauftragung</option>
                <option value="EA Beauftragung">EA Beauftragung</option>
                <option value="NF Beauftragung">NF Beauftragung</option>
              </select>
            </div>
            <div style="text-align:right; margin-top:20px;">
              <button id="statusModalSaveBtn" class="k-btn-green">Speichern</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    addKundenStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Meine Kunden</h1><p>Bestandskunden Übersicht mit Filter</p>`;
      titleEl.style.display = "block";
    }

    if (!contentArea) return;
    contentArea.innerHTML = getHTML();

    loadAllData();

    // Expose filter functions globally
    window.applyFilters = () => {
      applyFilters();
    };
    window.resetFilters = () => {
      resetFilters();
    };

    document.getElementById("kunden-search")?.addEventListener("input", () => {
      renderKunden();
    });

    document
      .getElementById("kunden-check-all")
      ?.addEventListener("change", (e) => {
        document.querySelectorAll(".kunden-cb").forEach((cb) => {
          cb.checked = e.target.checked;
          const id = parseInt(cb.dataset.id);
          if (e.target.checked) selectedKunden.add(id);
          else selectedKunden.delete(id);
        });
        updateCount();
        updateMassEmailButton();
      });

    document
      .getElementById("closeKundenViewModal")
      ?.addEventListener("click", () => {
        document.getElementById("kundenViewModal")?.classList.remove("active");
      });
    document
      .getElementById("kundenViewModal")
      ?.addEventListener("click", (e) => {
        if (e.target === document.getElementById("kundenViewModal"))
          document
            .getElementById("kundenViewModal")
            ?.classList.remove("active");
      });

    document
      .getElementById("closeStatusModal")
      ?.addEventListener("click", () => {
        document.getElementById("statusModal")?.classList.remove("active");
      });
    document.getElementById("statusModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("statusModal"))
        document.getElementById("statusModal")?.classList.remove("active");
    });

    document
      .getElementById("statusModalSaveBtn")
      ?.addEventListener("click", saveStatusUpdate);

    console.log("✅ Kunden page loaded with filters and 3CX phone integration");
  }

  return { init };
})();

window.kundenPage = kundenPage;
window.customersPage = window.kundenPage;
console.log("kunden.js loaded - window.kundenPage exists with filters and 3CX phone integration");
