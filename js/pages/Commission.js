const CommissionPage = (function () {
  let contentArea = null;
  let titleEl = null;
  const LOCAL_DEV_API_ORIGIN = "http://127.0.0.1:3001";
  let commissionsData = [];

  function getConfiguredApiBase() {
    try {
      const runtimeBase = String(window.__API_BASE__ || "").trim().replace(/\/+$/, "");
      if (runtimeBase) return runtimeBase;
    } catch {}

    try {
      const storageBase = String(localStorage.getItem("msdach-api-base") || "").trim().replace(/\/+$/, "");
      if (storageBase) return storageBase;
    } catch {}

    try {
      const hostname = location.hostname || "";
      const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
      if (location.protocol === "file:" || (isLocal && location.port !== "3001")) {
        return LOCAL_DEV_API_ORIGIN;
      }
    } catch {}

    return "";
  }

  function resolveApiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const base = getConfiguredApiBase();
    return base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : path;
  }

  const getHTML = () => `
    <div class="commission-container">
      <div class="commission-header">
        <h1 class="commission-title">Provisionsübersicht</h1>
        <p class="commission-subtitle">Verwalten und verfolgen Sie die Provisionen Ihres Teams</p>
      </div>

      <div class="commission-table-container">
        <div class="table-header-area">
          <h2>Aktuelle Provisionen</h2>
          <div class="table-actions">
            <button class="btn-export" type="button">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportieren
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="commission-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Vertriebler</th>
                <th>Kunde</th>
                <th>Auftragswert</th>
                <th>Typ</th>
                <th>Provisionssatz</th>
                <th>Provision</th>
                <th>Status</th>
                <th>Datum</th>
              </tr>
            </thead>
            <tbody id="commission-table-body">
              <tr><td colspan="9" style="padding:24px;text-align:center;color:#64748b;">Lade Provisionen...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const addCommissionStyles = () => {
    if (document.getElementById("commission-styles")) return;

    const styles = document.createElement("style");
    styles.id = "commission-styles";
    styles.textContent = `
      .commission-container { width: 100%; animation: fadeIn 0.4s ease; }
      .commission-header { margin-bottom: 28px; }
      .commission-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.02em; }
      .commission-subtitle { font-size: 0.95rem; color: #64748b; }
      .commission-table-container { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02); overflow: hidden; }
      .table-header-area { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fafaf9; }
      .table-header-area h2 { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin: 0; }
      .btn-export { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.2s; }
      .btn-export:hover { background: #f8fafc; border-color: #94a3b8; color: #0f172a; }
      .table-wrapper { overflow-x: auto; }
      .commission-table { width: 100%; border-collapse: collapse; text-align: left; }
      .commission-table th { padding: 16px 24px; background: #ffffff; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
      .commission-table td { padding: 16px 24px; font-size: 0.9rem; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
      .commission-table tbody tr:hover { background-color: #f8fafc; }
      .status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; line-height: 1.5; }
      .status-active { background: #ecfdf5; color: #059669; }
      .status-reversed { background: #fee2e2; color: #b91c1c; }
      .status-other { background: #eff6ff; color: #2563eb; }
      .amount-cell { font-weight: 600; }
      .commission-amount { color: #0f172a; font-weight: 700; }
      .type-badge { display:inline-flex; padding:2px 8px; border-radius:9999px; background:#f1f5f9; color:#334155; font-size:0.78rem; font-weight:600; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @media (max-width: 768px) {
        .table-header-area { flex-direction: column; align-items: flex-start; gap: 16px; }
      }
    `;
    document.head.appendChild(styles);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(amount || 0));

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return String(dateString);
    return parsed.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  function getStatusLabel(status) {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "active") return "Aktiv";
    if (normalized === "reversed") return "Storniert";
    return String(status || "—");
  }

  function getStatusClass(status) {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "active") return "status-active";
    if (normalized === "reversed") return "status-reversed";
    return "status-other";
  }

  function renderTable() {
    const tbody = document.getElementById("commission-table-body");
    if (!tbody) return;

    if (!commissionsData.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="padding:24px;text-align:center;color:#64748b;">Keine Provisionsdaten vorhanden.</td></tr>`;
      return;
    }

    tbody.innerHTML = commissionsData
      .map((comm) => `
        <tr>
          <td style="color:#64748b;">#${comm.id}</td>
          <td>${comm.agent || "Unbekannt"}</td>
          <td style="font-weight:500;">${comm.client || "—"}</td>
          <td class="amount-cell" style="color:#64748b;">${formatCurrency(comm.net_order_value)}</td>
          <td><span class="type-badge">${comm.contract_type || "—"} / ${comm.price_tag || "—"}</span></td>
          <td><span class="type-badge">${Number(comm.rate_applied || 0)}%</span></td>
          <td class="amount-cell commission-amount">${formatCurrency(comm.commission_amount)}</td>
          <td><span class="status-badge ${getStatusClass(comm.status)}">${getStatusLabel(comm.status)}</span></td>
          <td style="color:#64748b; font-size:0.85rem;">${formatDate(comm.created_at)}</td>
        </tr>
      `)
      .join("");
  }

  async function loadCommissions() {
    const tbody = document.getElementById("commission-table-body");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="padding:24px;text-align:center;color:#64748b;">Lade Provisionen...</td></tr>`;
    }

    try {
      const response = await fetch(resolveApiUrl("/api/commissions"), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      commissionsData = Array.isArray(data.items) ? data.items : [];
      renderTable();
    } catch (error) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding:24px;text-align:center;color:#b91c1c;">${String(error?.message || "Provisionen konnten nicht geladen werden.")}</td></tr>`;
      }
    }
  }

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    addCommissionStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Provisionen</h1><p>Übersicht der Team-Provisionen</p>`;
      titleEl.style.display = "block";
    }

    if (contentArea) {
      contentArea.innerHTML = getHTML();
      loadCommissions();
    }
  }

  return { init };
})();

window.CommissionPage = CommissionPage;
