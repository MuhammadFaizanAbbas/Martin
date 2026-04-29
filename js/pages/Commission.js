// Commission Page Module
const CommissionPage = (function() {
  let contentArea = null;
  let titleEl = null;

  // Mock Data for Commissions
  const mockCommissions = [
    { id: '1001', agent: 'Martin Schwaak', client: 'Müller GmbH', amount: 50000, commissionRate: 5, commission: 2500, status: 'Bezahlt', date: '2026-04-10' },
    { id: '1002', agent: 'Philipp Bauer', client: 'Schmidt AG', amount: 35000, commissionRate: 5, commission: 1750, status: 'Ausstehend', date: '2026-04-15' },
    { id: '1003', agent: 'André Klein', client: 'Weber Dach', amount: 120000, commissionRate: 4, commission: 4800, status: 'Bezahlt', date: '2026-04-18' },
    { id: '1004', agent: 'Simon Wagner', client: 'Becker Logistics', amount: 15000, commissionRate: 6, commission: 900, status: 'Ausstehend', date: '2026-04-20' },
    { id: '1005', agent: 'Martin Schwaak', client: 'Hoffmann & Co', amount: 85000, commissionRate: 5, commission: 4250, status: 'In Bearbeitung', date: '2026-04-22' },
    { id: '1006', agent: 'Philipp Bauer', client: 'Schäfer Services', amount: 42000, commissionRate: 7, commission: 2100, status: 'Ausstehend', date: '2026-04-25' },
    { id: '1007', agent: 'André Klein', client: 'Meyer Holdings', amount: 95000, commissionRate: 4.5, commission: 4275, status: 'Bezahlt', date: '2026-04-26' },
    { id: '1008', agent: 'Simon Wagner', client: 'Richter Immobilien', amount: 28000, commissionRate: 6, commission: 1680, status: 'Ausstehend', date: '2026-04-27' },
  ];

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
            <button class="btn-export">
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
                <th>Provisionssatz</th>
                <th>Provision</th>
                <th>Status</th>
                <th>Datum</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody id="commission-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const addCommissionStyles = () => {
    if (document.getElementById('commission-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'commission-styles';
    styles.textContent = `
      .commission-container {
        width: 100%;
        animation: fadeIn 0.4s ease;
      }

      .commission-header {
        margin-bottom: 28px;
      }

      .commission-title {
        font-size: 1.8rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
        letter-spacing: -0.02em;
      }

      .commission-subtitle {
        font-size: 0.95rem;
        color: #64748b;
      }

      .cards-grid-commission {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin-bottom: 32px;
      }

      .comm-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .comm-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
      }

      .comm-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08);
      }

      .comm-card-primary::before { background: linear-gradient(90deg, #3b82f6, #2563eb); }
      .comm-card-warning::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
      .comm-card-success::before { background: linear-gradient(90deg, #10b981, #059669); }
      .comm-card-info::before { background: linear-gradient(90deg, #6366f1, #4f46e5); }

      .comm-card-left {
        flex: 1;
      }

      .comm-card-label {
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .comm-card-value {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
      }

      .comm-icon-box {
        width: 52px;
        height: 52px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .comm-card-primary .comm-icon-box { background: #eff6ff; color: #2563eb; }
      .comm-card-warning .comm-icon-box { background: #fffbeb; color: #d97706; }
      .comm-card-success .comm-icon-box { background: #ecfdf5; color: #059669; }
      .comm-card-info .comm-icon-box { background: #eef2ff; color: #4f46e5; }

      .comm-icon-box svg {
        width: 26px;
        height: 26px;
      }

      /* Table Styles */
      .commission-table-container {
        background: #ffffff;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        overflow: hidden;
      }

      .table-header-area {
        padding: 20px 24px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #fafaf9;
      }

      .table-header-area h2 {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
      }

      .btn-export {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-export:hover {
        background: #f8fafc;
        border-color: #94a3b8;
        color: #0f172a;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .commission-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }

      .commission-table th {
        padding: 16px 24px;
        background: #ffffff;
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #e2e8f0;
      }

      .commission-table td {
        padding: 16px 24px;
        font-size: 0.9rem;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }

      .commission-table tbody tr {
        transition: background-color 0.2s;
      }

      .commission-table tbody tr:hover {
        background-color: #f8fafc;
      }

      .agent-cell {
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        color: #0f172a;
      }

      .agent-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.5;
      }

      .status-paid { background: #ecfdf5; color: #059669; }
      .status-pending { background: #fffbeb; color: #d97706; }
      .status-processing { background: #eff6ff; color: #2563eb; }

      .amount-cell {
        font-family: 'Inter', monospace;
        font-weight: 600;
      }

      .commission-amount {
        color: #0f172a;
        font-weight: 700;
      }

      .btn-action {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: color 0.2s, background 0.2s;
      }

      .btn-action:hover {
        color: #3b82f6;
        background: #eff6ff;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Responsive */
      @media (max-width: 1200px) {
        .cards-grid-commission {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 768px) {
        .cards-grid-commission {
          grid-template-columns: 1fr;
        }
        .table-header-area {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }
      }
    `;
    document.head.appendChild(styles);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('de-DE', options);
  };

  const renderTable = () => {
    const tbody = document.getElementById('commission-table-body');
    if (!tbody) return;

    tbody.innerHTML = mockCommissions.map(comm => {
      const initials = comm.agent.split(' ').map(n => n[0]).join('');
      
      let statusClass = '';
      if (comm.status === 'Bezahlt') statusClass = 'status-paid';
      else if (comm.status === 'Ausstehend') statusClass = 'status-pending';
      else if (comm.status === 'In Bearbeitung') statusClass = 'status-processing';

      return `
        <tr>
          <td style="color: #64748b;">#${comm.id}</td>
          <td>
            <div class="agent-cell">
              ${comm.agent}
            </div>
          </td>
          <td style="font-weight: 500;">${comm.client}</td>
          <td class="amount-cell" style="color: #64748b;">${formatCurrency(comm.amount)}</td>
          <td>
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; color: #475569;">
              ${comm.commissionRate}%
            </span>
          </td>
          <td class="amount-cell commission-amount">${formatCurrency(comm.commission)}</td>
          <td><span class="status-badge ${statusClass}">${comm.status}</span></td>
          <td style="color: #64748b; font-size: 0.85rem;">${formatDate(comm.date)}</td>
          <td>
            <button class="btn-action" title="Details ansehen">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;

    console.log('🚀 Initializing Commission Page...');

    addCommissionStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Provisionen</h1><p>Übersicht der Team-Provisionen</p>`;
      titleEl.style.display = 'block';
    }

    if (contentArea) {
      contentArea.innerHTML = getHTML();
      renderTable();
    }

    console.log('✅ Commission page initialized successfully');
  }

  return { init };
})();

// Register to window object
window.CommissionPage = CommissionPage;