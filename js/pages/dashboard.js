// Dashboard Page Module
const dashboardPage = (function() {
  let contentArea = null;
  let titleEl = null;
  
  // Supabase direct configuration
  const SUPABASE_URL = 'https://bmnxecoddcxcwvqukujh.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // You need to add your anon key
  const LEADS_CACHE_KEY = 'msdach-leads-cache-v1';

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
            <div class="card-value" id="total-leads">--</div>
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
            <div class="card-value" id="Offen">--</div>
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
            <div class="card-value" id="in Bearbeitung">--</div>
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
            <div class="card-value" id="Beauftragung">--</div>
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
            <div class="card-value" id="EA Beauftragung">--</div>
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
            <div class="card-value" id="NF Beauftragung">--</div>
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
            <div class="card-value" id="Nur Info eingeholt">--</div>
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

        <!-- 8. Follow up -->
        <div class="card">
          <div class="card-left">
            <div class="card-label">Follow up</div>
            <div class="card-value" id="follow up">--</div>
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
            <div class="card-value" id="falscher Kunde">--</div>
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
            <div class="card-value" id="Ghoster">--</div>
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
            <div class="card-value" id="Abgesagt">--</div>
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
            <div class="card-value" id="Abgesagt tot">--</div>
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
            <div class="card-value" id="Storniert">--</div>
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
            <div class="card-value" id="Außerhalb Einzugsgebiet">--</div>
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
            <div class="card-value nettosumme-value" id="total-summe">--</div>
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

      @keyframes fadeUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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

  // Normalize status to match frontend expectations
  const normalizeStatus = (status) => {
    const value = String(status || '').trim().toLowerCase();
    if (!value) return '';
    
    const statusMap = {
      'offen': 'Offen',
      'tne offen': 'Offen',
      'in bearbeitung': 'in Bearbeitung',
      'follow up': 'follow up',
      'beauftragung': 'Beauftragung',
      'ea beauftragung': 'EA Beauftragung',
      'ea beauftragt': 'EA Beauftragung',
      'nf beauftragung': 'NF Beauftragung',
      'nf beauftragt': 'NF Beauftragung',
      'nur info eingeholt': 'Nur Info eingeholt',
      'infos eingeholt': 'Nur Info eingeholt',
      'falscher kunde': 'falscher Kunde',
      'ghoster': 'Ghoster',
      'abgesagt': 'Abgesagt',
      'abgesagt tot': 'Abgesagt tot',
      '1x gesagt tot': 'Abgesagt tot',
      'storniert': 'Storniert',
      'storno': 'Storniert',
      'außerhalb einzugsgebiet': 'Außerhalb Einzugsgebiet',
      'ausserhalb einzugsgebiet': 'Außerhalb Einzugsgebiet'
    };
    
    return statusMap[value] || '';
  };

  // Format number with commas (German format)
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Format currency with proper German format
  const formatCurrency = (num) => {
    const [integer, decimal] = num.toFixed(2).split('.');
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `€ ${formattedInteger}.${decimal}`;
  };

  // Fetch leads directly from Supabase
  const fetchLeadsFromSupabase = async () => {
    try {
      const url = `${SUPABASE_URL}/rest/v1/leads?select=status,summe_netto`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const leads = await response.json();
      
      if (!Array.isArray(leads)) {
        throw new Error('Invalid response format from Supabase');
      }

      return leads;
    } catch (error) {
      console.error('Error fetching from Supabase:', error);
      throw error;
    }
  };

  // Process leads and update dashboard
  const processAndUpdateDashboard = (leads) => {
    // Initialize counters
    const counts = {
      'Offen': 0,
      'in Bearbeitung': 0,
      'Beauftragung': 0,
      'EA Beauftragung': 0,
      'NF Beauftragung': 0,
      'Nur Info eingeholt': 0,
      'follow up': 0,
      'falscher Kunde': 0,
      'Ghoster': 0,
      'Abgesagt': 0,
      'Abgesagt tot': 0,
      'Storniert': 0,
      'Außerhalb Einzugsgebiet': 0,
    };

    let totalSummeNetto = 0;
    let totalLeads = leads.length;

    // Process each lead
    leads.forEach(lead => {
      // Calculate summe_netto
      const summeNetto = parseFloat(lead?.summe_netto) || 0;
      if (!isNaN(summeNetto)) {
        totalSummeNetto += summeNetto;
      }

      // Count status
      const status = normalizeStatus(lead?.status);
      if (status && counts.hasOwnProperty(status)) {
        counts[status] += 1;
      }
    });

    // Update DOM
    const totalLeadsEl = document.getElementById('total-leads');
    if (totalLeadsEl) {
      totalLeadsEl.textContent = formatNumber(totalLeads);
    }

    const totalSummeEl = document.getElementById('total-summe');
    if (totalSummeEl) {
      totalSummeEl.textContent = formatCurrency(totalSummeNetto);
    }

    // Update each status card
    for (const [key, value] of Object.entries(counts)) {
      const element = document.getElementById(key);
      if (element) {
        element.textContent = formatNumber(value);
      }
    }

    // Cache the leads for offline use
    try {
      localStorage.setItem(LEADS_CACHE_KEY, JSON.stringify({ leads, timestamp: Date.now() }));
    } catch (e) {
      console.warn('Could not cache leads:', e);
    }

    console.log('✅ Dashboard updated successfully!', {
      totalLeads,
      totalSummeNetto: formatCurrency(totalSummeNetto),
      counts
    });
  };

  // Show error message on dashboard
  const showErrorMessage = (error) => {
    document.querySelectorAll('.card-value').forEach(el => {
      if (el.textContent === '--') el.textContent = 'Error';
    });

    const container = document.querySelector('.dashboard-container');
    if (container && !document.querySelector('.api-error-message')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'api-error-message';
      errorDiv.style.cssText = `
        background: #fee2e2;
        color: #dc2626;
        padding: 12px 20px;
        border-radius: 8px;
        margin-top: 20px;
        text-align: center;
        font-size: 14px;
      `;
      errorDiv.innerHTML = `
        <strong>⚠️ Error:</strong> Could not fetch leads from Supabase<br>
        ${error?.message || 'Please check your configuration or try again later.'}
      `;
      container.appendChild(errorDiv);
    }
  };

  // Main fetch function
  const fetchDashboardData = async () => {
    try {
      const leads = await fetchLeadsFromSupabase();
      processAndUpdateDashboard(leads);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      // Try to use cached data
      try {
        const cached = localStorage.getItem(LEADS_CACHE_KEY);
        if (cached) {
          const { leads } = JSON.parse(cached);
          if (leads && leads.length) {
            console.log('Using cached leads data');
            processAndUpdateDashboard(leads);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not read cache:', e);
      }
      
      showErrorMessage(error);
    }
  };

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;

    console.log('🚀 Initializing Dashboard Page...');
    
    // Check if Supabase key is configured
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
      console.error('❌ Supabase Anon Key not configured!');
      console.log('Please add your Supabase anon key to the SUPABASE_ANON_KEY variable');
    }

    // Add dashboard specific styles
    addDashboardStyles();

    // Hide/show main page header
    if (titleEl) {
      titleEl.innerHTML = `<h1>Dashboard</h1><p>Verfolgen Sie die Leistung Ihres Dachbeschichtungsunternehmens</p>`;
      titleEl.style.display = 'block';
    }

    if (contentArea) {
      contentArea.innerHTML = getHTML();
      console.log('📄 Dashboard HTML rendered');

      // Fetch live data from Supabase
      fetchDashboardData();
      
      // Refresh data every 5 minutes
      setInterval(fetchDashboardData, 5 * 60 * 1000);
    }

    console.log('✅ Dashboard page initialized successfully');
  }

  return { init };
})();

// Register to window object
window.dashboardPage = dashboardPage;
console.log('📁 dashboard.js loaded - window.dashboardPage exists:', !!window.dashboardPage);