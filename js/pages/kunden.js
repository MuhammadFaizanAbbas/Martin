const kundenPage = (function () {
  let contentArea = null;
  let titleEl = null;

  // ── API URLs ──────────────────────────────────────────────────────────────
  // Prefer same-origin Vercel API routes; fall back to direct + public proxies locally
  const SO_LEADS = "/api/leads";
  const SO_DASHBOARD = "/api/dashboard";
  const REMOTE_LEADS_URL = "https://goarrow.ai/test/fetch_all_leads.php";
  const REMOTE_DASHBOARD_URL = "https://goarrow.ai/test/dashboard.php";

  // CORS proxies (fallback)
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

  // ── Status mapping ────────────────────────────────────────────────────────
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

  // ── Helper: Fetch with CORS handling ──────────────────────────────────────
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

  // Race primary endpoint with staggered fallbacks to reduce tail latency
  async function fetchFirstAvailable(urlsWithDelay) {
    const controllers = urlsWithDelay.map(() => new AbortController());
    const promises = urlsWithDelay.map((cfg, idx) =>
      fetchDelayed(cfg.url, cfg.delay || 0, controllers[idx])
    );

    try {
      const result = await Promise.any(promises);
      // Abort remaining requests
      controllers.forEach((c) => {
        try { c.abort(); } catch {}
      });
      return result;
    } catch (err) {
      return { success: false, error: "All endpoints failed" };
    }
  }

  // ── Fetch leads from API ──────────────────────────────────────────────────
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

    // Accept multiple upstream shapes
    const rawList = Array.isArray(result.data)
      ? result.data
      : (result.data.data || result.data.leads || result.data.items || []);

    // Transform API data to our internal format
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
    }));
  }

  // ── Fetch dashboard stats from API ────────────────────────────────────────
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

  // ── Load all data ─────────────────────────────────────────────────────────
  async function loadAllData() {
    if (isLoading) return;
    isLoading = true;

    const tbody = document.getElementById("kunden-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state">⏳ Daten werden geladen...</div></tr>`;
    }

    // Kick off both requests without blocking UI
    fetchLeads()
      .then((leads) => {
        leadsData = leads;
        renderKunden();
      })
      .catch((e) => {
        console.error("Leads load failed", e);
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state">❌ Fehler beim Laden der Leads.</div></tr>`;
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

  // ── Format number for display ─────────────────────────────────────────────
  function formatNumber(num) {
    if (!num || num === "0.00") return "0,00";
    return parseFloat(num).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ── Get status badge class ────────────────────────────────────────────────
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

  // ── Get stat definitions with real counts ─────────────────────────────────
  function getStatDefinitions() {
    return [
      {
        key: "offen",
        label: "Offen",
        count: dashboardStats.Offen || 0,
        filter: (l) => l.status === "Offen",
      },
      {
        key: "bearbeitung",
        label: "in Bearbeitung",
        count: dashboardStats["in Bearbeitung"] || 0,
        filter: (l) => l.status === "in Bearbeitung",
      },
      {
        key: "followup",
        label: "Follow up",
        count: dashboardStats["follow up"] || 0,
        filter: (l) => l.status === "follow up",
      },
      {
        key: "auftrags",
        label: "Auftragsbestätigung",
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

  // ── Render stats cards with real data ─────────────────────────────────────
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

  // ── Main render function ──────────────────────────────────────────────────
  function renderKunden() {
    // Check if we have data
    if (!leadsData.length) {
      renderStats();
      return;
    }

    renderStats();

    const statDefs = getStatDefinitions();
    const activeDef = statDefs.find((d) => d.key === kundenActiveFilter);

    // Filter pill - safely check if element exists
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

    // Search filter
    const searchInput = document.getElementById("kunden-search");
    const searchTerm = (searchInput?.value || "").toLowerCase();

    // Apply filters
    let data = leadsData.slice();
    if (activeDef && activeDef.filter) {
      data = data.filter(activeDef.filter);
    }
    if (searchTerm) {
      data = data.filter(
        (l) =>
          l.name.toLowerCase().includes(searchTerm) ||
          l.ort.toLowerCase().includes(searchTerm),
      );
    }

    filteredData = data;

    const tbody = document.getElementById("kunden-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!filteredData.length) {
      tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state">Keine Kunden in dieser Kategorie.</div></tr>`;
      updateCount();
      return;
    }

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

        
          
            <div style="width:18px;height:18px;background:white;border-radius:50%;position:absolute;top:2px;left:2px;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></div>
          </div>
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
          <button class="act-btn-green" onclick="window.callKunde(${lead.id})" title="Anrufen">
            <svg width="14" height="14" fill="white" stroke="white" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91A16 16 0 0 0 13.09 15l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/>
            </svg>
          </button>
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

      // Expand row
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
      </div></td>`;
      tbody.appendChild(xtr);
    });

    // Checkbox listeners
    document.querySelectorAll(".kunden-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedKunden.add(id);
        else selectedKunden.delete(id);
        updateCount();
      });
    });

    updateCount();
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

  // ── Global window functions ───────────────────────────────────────────────
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

  window.viewKunde = (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (!lead) return;
    const displayName =
      (lead.salutation ? lead.salutation + " " : "") + lead.name;
    const titleEl = document.getElementById("kundenViewTitle");
    const contentEl = document.getElementById("kundenViewContent");
    if (titleEl) titleEl.textContent = displayName + " – Details";
    if (contentEl) {
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
      `;
    }
    const modal = document.getElementById("kundenViewModal");
    if (modal) modal.classList.add("active");
  };

  window.callKunde = (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (lead && lead.telefon) {
      alert(`Anruf wird gestartet: ${lead.telefon}`);
      // window.location.href = `tel:${lead.telefon}`;
    } else {
      alert("Keine Telefonnummer vorhanden");
    }
  };

  window.delegateKunde = (id) => alert(`Lead ${id} delegieren`);
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

  window.toggleDelegate = (id, el) => {
    const on = el.dataset.on === "true";
    el.dataset.on = String(!on);
    el.style.background = !on ? "#22c55e" : "#e2e8f0";
    const slider = el.querySelector("div");
    if (slider) slider.style.left = !on ? "22px" : "2px";
    console.log(`Delegate lead ${id}: ${!on ? "assigned" : "unassigned"}`);
  };

  // ── Status modal save ─────────────────────────────────────────────────────
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

  // ── Add styles (same as before) ──────────────────────────────────────────
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
      .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
      .search-box { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 40px; padding: 8px 16px; gap: 8px; }
      .search-box input { border: none; outline: none; font-size: 0.85rem; width: 220px; height: 30px; }
      .spacer { flex: 1; }
      .table-label { margin: 8px 0 16px; font-size: 0.85rem; color: #64748b; }
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
      .k-modal-overlay { display: none; position: fixed; z-index:9999; inset: 0; background: rgba(0,0,0,0.45);  justify-content: center; align-items: center; }
      .k-modal-overlay.active { display: flex; }
      .k-modal-content { background: white; border-radius: 20px; width: 90%; max-width: 580px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; animation: kmodalIn 0.2s ease; }
      .k-modal-sm { max-width: 460px; }
      @keyframes kmodalIn { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }
      .k-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
      .k-modal-header h3 { font-size: 1.2rem; font-weight: 700; margin: 0; color: #0f172a; }
      .k-close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #94a3b8; line-height: 1; }
      .k-modal-body { flex: 1; overflow-y: auto; padding: 20px 24px 24px; }
      .k-full-select { width: 100%; padding: 11px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; background: white; color: #64748b; }
      .k-btn-green { background: #22c55e; color: white; border: none; padding: 12px 28px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
      .k-btn-green:hover { background: #16a34a; }
      .k-view-section { margin-bottom: 20px; }
      .k-view-section h4 { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin-bottom: 10px; padding-bottom: 7px; border-bottom: 1px solid #e2e8f0; }
      .k-detail-row { display: flex; padding: 9px 0; border-bottom: 1px solid #f8fafc; }
      .k-detail-label { width: 150px; font-weight: 500; color: #64748b; font-size: 0.83rem; flex-shrink: 0; }
      .k-detail-value { flex: 1; color: #0f172a; font-size: 0.83rem; }
      .empty-state { text-align: center; padding: 40px; color: #94a3b8; font-size: 0.9rem; }
      @media (max-width: 768px) { .expand-grid { grid-template-columns: repeat(2, 1fr); } .k-modal-content { width: 96%; } }
    `;
    document.head.appendChild(s);
  }

  // ── HTML template ─────────────────────────────────────────────────────────
  function getHTML() {
    return `
      <div class="kunden-container">
        <div class="page-title">Meine Kunden</div>
        <div class="kunden-stats" id="kunden-stats"></div>
        <div id="kunden-filter-pill" style="display:none"></div>
        <div class="toolbar">
          <div class="search-box">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Suche..." id="kunden-search"/>
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

  // ── Init ──────────────────────────────────────────────────────────────────
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

    // Load data from APIs
    loadAllData();

    // Search input listener
    document.getElementById("kunden-search")?.addEventListener("input", () => {
      renderKunden();
    });

    // Check-all checkbox
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
      });

    // View modal close
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

    // Status modal close
    document
      .getElementById("closeStatusModal")
      ?.addEventListener("click", () => {
        document.getElementById("statusModal")?.classList.remove("active");
      });
    document.getElementById("statusModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("statusModal"))
        document.getElementById("statusModal")?.classList.remove("active");
    });

    // Status modal save
    document
      .getElementById("statusModalSaveBtn")
      ?.addEventListener("click", saveStatusUpdate);

    console.log("✅ Kunden page loaded with real API data");
  }

  return { init };
})();

window.kundenPage = kundenPage;
// Alias for English route naming
window.customersPage = window.kundenPage;
console.log("kunden.js loaded - window.kundenPage exists:", !!window.kundenPage);