// Dashboard Page Module
const dashboardPage = (function() {
  let contentArea = null;
  let titleEl = null;

  const getHTML = () => `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1 class="dashboard-title">Dashboard-Übersicht</h1>
        <p class="dashboard-subtitle">Verfolgen Sie die Leistung Ihres Dachbeschichtungsunternehmens</p>
      </div>
      
      <div class="cards-grid-dash">
        <!-- 1. Gesamt-Leads -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Gesamt-Leads</div>
            <div class="card-value">3,244</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>

        <!-- 2. Offen -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Offen</div>
            <div class="card-value">159</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>

        <!-- 3. In Bearbeitung -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">In Bearbeitung</div>
            <div class="card-value">85</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 16V10M12 16V8M17 16v-6" stroke-linecap="round" />
            </svg>
          </div>
        </div>

        <!-- 4. Beauftragung -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Beauftragung</div>
            <div class="card-value">292</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        <!-- 5. EA Beauftragung -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">EA Beauftragung</div>
            <div class="card-value">121</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        <!-- 6. NF Beauftragt -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">NF Beauftragt</div>
            <div class="card-value">251</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        <!-- 7. Nur Info eingeholt -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Nur Info eingeholt</div>
            <div class="card-value">224</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>

        <!-- 8. follow up -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Follow up</div>
            <div class="card-value">190</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>

        <!-- 9. Falscher Kunde -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Falscher Kunde</div>
            <div class="card-value">386</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="17" y1="11" x2="23" y2="11" />
            </svg>
          </div>
        </div>

        <!-- 10. Ghoster -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Ghoster</div>
            <div class="card-value">262</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="17" y1="11" x2="23" y2="11" />
            </svg>
          </div>
        </div>

        <!-- 11. Abgesagt -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Abgesagt</div>
            <div class="card-value">748</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
        </div>

        <!-- 12. Abgesagt tot -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Abgesagt tot</div>
            <div class="card-value">398</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93 19.07 19.07" />
              <path d="M15 9H9v6h6V9z" stroke-width="1.5" />
            </svg>
          </div>
        </div>

        <!-- 13. Storniert -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Storniert</div>
            <div class="card-value">30</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        <!-- 14. Außerhalb Einzugsgebiet -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Außerhalb Einzugsgebiet</div>
            <div class="card-value">34</div>
          </div>
          <div class="icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="17" y1="8" x2="23" y2="14" />
              <line x1="23" y1="8" x2="17" y2="14" />
            </svg>
          </div>
        </div>

        <!-- 15. Nettosumme -->
        <div class="card nettosumme-card">
          <div class="card-left">
            <div class="card-label">Nettosumme</div>
            <div class="card-value nettosumme-value">€ 13.381.032,06</div>
          </div>
          <div class="icon-box nettosumme-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add CSS for dashboard cards
  const addDashboardStyles = () => {
    if (document.getElementById('dashboard-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'dashboard-styles';
    styles.textContent = `
      .dashboard-container {
        width: 100%;
      }
      
      .dashboard-header {
        margin-bottom: 28px;
      }
      
      .dashboard-title {
        font-size: 1.8rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
      }
      
      .dashboard-subtitle {
        font-size: 0.9rem;
        color: #64748b;
      }
      
      .cards-grid-dash {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }
      
      .card {
  background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 22px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
    animation: fadeUp 0.4s ease both;
      }
      
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        border-color: #e2e8f0;
      }
      
      .card-left {
        flex: 1;
      }
      
      .card-label {
        font-size: 12px;
        font-weight: 500;
        color: #64748b;
        margin-bottom: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .card-value {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }
      
      .nettosumme-value {
        font-size: 1.3rem;
        color: #fbbf24;
      }
      
      .icon-box {
        width: 48px;
        height: 48px;
        background: #f0fdf4;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #00a63e;
      }
      
      .icon-box svg {
        width: 24px;
        height: 24px;
      }
      
      .nettosumme-card {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: none;
      }
      
      .nettosumme-card .card-label {
        color: #94a3b8;
      }
      
      .nettosumme-card .card-value {
        color: #fbbf24;
      }
      
      .nettosumme-icon {
        background: rgba(255, 255, 255, 0.1);
        color: #fbbf24;
      }
      
      /* Responsive */
      @media (max-width: 1200px) {
        .cards-grid-dash {
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
      }
      
      @media (max-width: 900px) {
        .cards-grid-dash {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      
      @media (max-width: 600px) {
        .cards-grid-dash {
          grid-template-columns: 1fr;
        }
        
        .dashboard-title {
          font-size: 1.4rem;
        }
        
        .card-value {
          font-size: 1.3rem;
        }
        
        .nettosumme-value {
          font-size: 1.1rem;
        }
      }
    `;
    document.head.appendChild(styles);
  };

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    
    // Add dashboard specific styles
    addDashboardStyles();
    
    // HIDE the main page header (title and subtitle)
    // Because dashboard has its own header inside content
    if (titleEl) {
      titleEl.style.display =  `<h1>Dashboard</h1><p>Übersicht & Statistiken</p>`;
    }
    
    if (contentArea) {
      contentArea.innerHTML = getHTML();
    }
    
    console.log('✅ Dashboard page loaded with 15 cards (main header hidden)');
  }
 

  return { init };
})();

// Register to window object
window.dashboardPage = dashboardPage;
console.log('dashboard.js loaded - window.dashboardPage exists:', !!window.dashboardPage);