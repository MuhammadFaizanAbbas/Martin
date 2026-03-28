const anruferinPage = (function() {
  let contentArea = null;
  let titleEl = null;
  
  // Call Data
  const callDataRaw = [
    { name: "Sara Rose (103)", time: "2026-03-26 07:33:44", direction: "Outbound", status: "Unanswered", ringSec: 28, talkSec: 0, cost: 0.0000 },
    { name: "Sara Rose (103)", time: "2026-03-26 07:34:15", direction: "Outbound", status: "Answered", ringSec: 13, talkSec: 53, cost: 0.8900 },
    { name: "+491705685584", time: "2026-03-26 07:46:11", direction: "Inbound", status: "Redirected", ringSec: 12, talkSec: 0, cost: 0.0000 },
    { name: "+491705685584", time: "2026-03-26 07:46:11", direction: "Inbound", status: "Answered", ringSec: 12, talkSec: 374, cost: 0.0000 },
    { name: "Maja Bunny (102)", time: "2026-03-26 07:51:20", direction: "Outbound", status: "Answered", ringSec: 16, talkSec: 130, cost: 2.1800 },
    { name: "Maja Bunny (102)", time: "2026-03-26 07:53:50", direction: "Outbound", status: "Answered", ringSec: 10, talkSec: 40, cost: 0.6700 },
    { name: "Maja Bunny (102)", time: "2026-03-26 07:55:22", direction: "Outbound", status: "Answered", ringSec: 32, talkSec: 36, cost: 0.6200 },
    { name: "Maja Bunny (102)", time: "2026-03-26 07:56:53", direction: "Outbound", status: "Answered", ringSec: 1, talkSec: 52, cost: 0.8700 },
    { name: "Maja Bunny (102)", time: "2026-03-26 07:59:14", direction: "Outbound", status: "Answered", ringSec: 18, talkSec: 47, cost: 0.7800 },
    { name: "Maja Bunny (102)", time: "2026-03-26 08:00:21", direction: "Outbound", status: "Answered", ringSec: 17, talkSec: 32, cost: 0.5500 },
    { name: "+4917624142140", time: "2026-03-26 08:03:34", direction: "Inbound", status: "Answered", ringSec: 9, talkSec: 27, cost: 0.0000 },
    { name: "+4917681196590", time: "2026-03-26 08:03:45", direction: "Inbound", status: "Redirected", ringSec: 10, talkSec: 0, cost: 0.0000 },
    { name: "+4917681196590", time: "2026-03-26 08:03:45", direction: "Inbound", status: "Answered", ringSec: 10, talkSec: 93, cost: 0.0000 },
    { name: "Jaren Lubken (104)", time: "2026-03-26 08:05:17", direction: "NaN", status: "Answered", ringSec: 2, talkSec: 10, cost: 0.0000 },
    { name: "+4917681196590", time: "2026-03-26 08:05:29", direction: "Inbound", status: "Answered", ringSec: 0, talkSec: 582, cost: 0.0000 },
    { name: "+491734133843", time: "2026-03-26 08:04:04", direction: "Inbound", status: "Redirected", ringSec: 8, talkSec: 0, cost: 0.0000 },
    { name: "+491734133843", time: "2026-03-26 08:04:04", direction: "Inbound", status: "Answered", ringSec: 8, talkSec: 0, cost: 0.0000 },
    { name: "+491734133843", time: "2026-03-26 08:04:13", direction: "Inbound", status: "Answered", ringSec: 0, talkSec: 52, cost: 0.0000 },
    { name: "+4917624142140", time: "2026-03-26 08:04:14", direction: "Inbound", status: "Answered", ringSec: 0, talkSec: 0, cost: 0.0000 },
    { name: "Andrés Kassebaum (107)", time: "2026-03-26 08:04:33", direction: "NaN", status: "Answered", ringSec: 7, talkSec: 32, cost: 0.0000 },
    { name: "Maja Bunny (102)", time: "2026-03-26 08:10:42", direction: "Outbound", status: "Answered", ringSec: 5, talkSec: 41, cost: 0.6900 },
    { name: "+491512771117", time: "2026-03-26 08:22:01", direction: "Inbound", status: "Redirected", ringSec: 10, talkSec: 0, cost: 0.0000 },
    { name: "+491512771117", time: "2026-03-26 08:22:01", direction: "Inbound", status: "Answered", ringSec: 10, talkSec: 15, cost: 0.0000 }
  ];

  let calls = [...callDataRaw];

  const getHTML = () => `
    <div class="anruferin-container">
      <div class="page-header">
        <div class="page-title">Anruferin / Callcenter</div>
        <div class="filter-bar">
          <input type="text" id="searchInput" class="filter-input" placeholder="🔍 Name / Nummer filtern">
          <select id="statusFilter" class="filter-select">
            <option value="all">Alle Status</option>
            <option value="Answered">Beantwortet</option>
            <option value="Unanswered">Unanswered</option>
            <option value="Redirected">Redirected</option>
          </select>
          <div class="stats-badge" id="callCountBadge">📞 ${calls.length} Anrufe</div>
        </div>
      </div>
      
  
      
      <div class="call-table-container">
        <table class="call-table">
          <thead>
            <tr>
              <th>Anrufname</th>
              <th>Anrufzeit</th>
              <th>Richtung</th>
              <th>Status</th>
              <th>Klingende Sek.</th>
              <th>Sprechende Sek.</th>
              <th>Kosten</th>
              <th>Sicht</th>
             </thead>
          <tbody id="tableBody">
            <!-- dynamic rows injected -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Add CSS for anruferin page
  const addAnruferinStyles = () => {
    if (document.getElementById('anruferin-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'anruferin-styles';
    styles.textContent = `
      .anruferin-container {
        width: 100%;
      }
      
      .page-header {
        margin-bottom: 24px;
      }
      
      .page-title {
        font-size: 1.8rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 20px;
      }
      
      .filter-bar {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      
      .filter-input {
        padding: 10px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 40px;
        font-size: 0.9rem;
        width: 250px;
        background: white;
      }
      
      .filter-select {
        padding: 10px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 40px;
        background: white;
        font-size: 0.9rem;
        cursor: pointer;
      }
      
      .stats-badge {
        background: #f1f5f9;
        padding: 8px 16px;
        border-radius: 40px;
        font-size: 0.85rem;
        font-weight: 500;
        color: #334155;
      }
      
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin-bottom: 28px;
      }
      
      .summary-card {
        background: white;
        border-radius: 20px;
        padding: 20px;
        text-align: center;
        border: 1px solid #eef2f8;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      
      .summary-label {
        font-size: 0.8rem;
        color: #64748b;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .summary-number {
        font-size: 2rem;
        font-weight: 700;
        color: #0f172a;
      }
      
      .call-table-container {
        background: white;
        border-radius: 20px;
        border: 1px solid #eef2f8;
        overflow-x: auto;
      }
      
      .call-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 900px;
      }
      
      .call-table th {
        text-align: left;
        padding: 16px 12px;
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
        font-size: 0.8rem;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .call-table td {
        padding: 12px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.85rem;
      }
      
      .call-table tr:hover {
        background: #f8fafc;
      }
      
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: 500;
      }
      
      .status-answered {
        background: #dcfce7;
        color: #166534;
      }
      
      .status-unanswered {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .status-redirected {
        background: #fef3c7;
        color: #92400e;
      }
      
      .cost-positive {
        color: #10b981;
        font-weight: 600;
      }
      
      .visibility-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        background: #22c55e;
        border-radius: 50%;
        box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
      }
       .act-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        color: #64748b;
        transition: all 0.2s;
      }
      
      .act-btn:hover {
        background: #f1f5f9;
        color: #3b82f6;
      }
      
      .actions {
        display: flex;
        gap: 4px;
      }
      @media (max-width: 768px) {
        .summary-cards {
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .filter-bar {
          flex-direction: column;
          align-items: stretch;
        }
        .filter-input {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(styles);
  };

  function getStatusClass(status) {
    if (status === "Answered") return "status-answered";
    if (status === "Unanswered") return "status-unanswered";
    if (status === "Redirected") return "status-redirected";
    return "status-answered";
  }

  function formatCost(cost) {
    return cost.toFixed(4) + " €";
  }

  function formatTime(timeStr) {
    const date = new Date(timeStr);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function updateStats() {
    const answeredTotal = calls.filter(c => c.status === "Answered").length;
    const unansweredTotal = calls.filter(c => c.status === "Unanswered").length;
    const redirectedTotal = calls.filter(c => c.status === "Redirected").length;
    const totalCostSum = calls.reduce((sum, c) => sum + c.cost, 0);
    
    const answeredEl = document.getElementById('answeredCount');
    const unansweredEl = document.getElementById('unansweredCount');
    const redirectedEl = document.getElementById('redirectedCount');
    const totalCostEl = document.getElementById('totalCost');
    const countBadge = document.getElementById('callCountBadge');
    
    if (answeredEl) answeredEl.textContent = answeredTotal;
    if (unansweredEl) unansweredEl.textContent = unansweredTotal;
    if (redirectedEl) redirectedEl.textContent = redirectedTotal;
    if (totalCostEl) totalCostEl.textContent = `€${totalCostSum.toFixed(2)}`;
    if (countBadge) countBadge.innerHTML = `📞 ${calls.length} Anrufe`;
  }

  function renderTable() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    
    let filtered = calls.filter(call => {
      const matchName = call.name.toLowerCase().includes(searchTerm);
      const matchStatus = statusFilter === 'all' || call.status === statusFilter;
      return matchName && matchStatus;
    });
    
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">🔍 Keine Anrufe gefunden</td></tr>';
      return;
    }
    
    tbody.innerHTML = filtered.map(call => {
      const statusClass = getStatusClass(call.status);
      const costFormatted = formatCost(call.cost);
      const timeFormatted = formatTime(call.time);
      const hasCost = call.cost > 0;
      
      return `
        <tr>
          <td><strong>${call.name}</strong></td>
          <td>${timeFormatted}</td>
          <td>${call.direction === 'Inbound' ? '📥 Eingehend' : call.direction === 'Outbound' ? '📤 Ausgehend' : call.direction}</td>
          <td><span class="status-badge ${statusClass}">${call.status}</span></td>
          <td>${call.ringSec} sec</td>
          <td>${call.talkSec} sec</td>
          <td class="${hasCost ? 'cost-positive' : ''}">${costFormatted}</td>
          <td><button class="act-btn"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
</td>
        </tr>
      `;
    }).join('');
    
    updateStats();
  }

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    
    addAnruferinStyles();
    
    // Set header title
    if (titleEl) {
      titleEl.innerHTML = `<h1>Anruferin</h1><p>Eingehende & ausgehende Anrufe</p>`;
      titleEl.style.display = 'block';
    }
    
    if (contentArea) {
      contentArea.innerHTML = getHTML();
      renderTable();
      
      // Event Listeners
      const searchInput = document.getElementById('searchInput');
      const statusFilter = document.getElementById('statusFilter');
      
      if (searchInput) searchInput.addEventListener('input', renderTable);
      if (statusFilter) statusFilter.addEventListener('change', renderTable);
    }
    
    console.log('✅ Anruferin page loaded with call data');
  }

  return { init };
})();

window.anruferinPage = anruferinPage;
console.log('anruferin.js loaded');