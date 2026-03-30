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

  // Update dashboard with data from API
  const updateDashboardWithData = (data) => {
    if (data.status === 'success' && data.data) {
      console.log('✅ API Data received successfully!');
      console.log('📊 Full API Response:', data);

      // Update total leads
      const totalLeadsEl = document.getElementById('total-leads');
      if (totalLeadsEl) {
        const formattedLeads = formatNumber(data.total_leads);
        totalLeadsEl.textContent = formattedLeads;
        console.log(`📈 Gesamt-Leads: ${formattedLeads}`);
      }

      // Update Nettosumme
      const totalSummeEl = document.getElementById('total-summe');
      if (totalSummeEl) {
        const formattedSumme = formatCurrency(data.total_summe_netto);
        totalSummeEl.textContent = formattedSumme;
        console.log(`💰 Nettosumme: ${formattedSumme}`);
      }

      // Update each status card
      const dataMap = data.data;

      for (const [key, value] of Object.entries(dataMap)) {
        const element = document.getElementById(key);
        if (element) {
          const formattedValue = formatNumber(value);
          element.textContent = formattedValue;
          console.log(`  ✓ ${key}: ${formattedValue}`);
        } else {
          console.warn(`⚠️ Element with ID "${key}" not found in DOM`);
        }
      }

      console.log('🎉 Dashboard update complete!');
      return true;
    } else {
      console.error('❌ Invalid data format from API:', data);
      return false;
    }
  };

  // Show error message on dashboard
  const showErrorMessage = () => {
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
        <strong>⚠️ API Error:</strong> Could not fetch data from https://goarrow.ai/test/dashboard.php<br>
        Please check the API endpoint or contact support.
      `;
      container.appendChild(errorDiv);
    }
  };

  // Fetch via a CORS proxy URL
  const fetchWithProxy = async (proxyUrl) => {
    const response = await fetch(proxyUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || data.status !== 'success') throw new Error('Invalid response format');
    return data;
  };

  // Main fetch function — tries same-origin API, then multiple CORS proxies in order
const fetchDashboardData = async () => {
    const API_URL = 'https://goarrow.ai/test/dashboard.php';
    const SAME_ORIGIN_API = '/api/dashboard';

    // 0) Try same-origin Vercel Function first (works on deployed site)
    try {
      console.log(`🔄 Trying same-origin API: ${SAME_ORIGIN_API}`);
      const res = await fetch(SAME_ORIGIN_API, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sameData = await res.json();
      if (!sameData || sameData.status !== 'success') throw new Error('Invalid response format');
      updateDashboardWithData(sameData);
      return;
    } catch (e) {
      console.warn('⚠️ Same-origin API failed, falling back to proxies...', e.message);
    }

 const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(API_URL)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(API_URL)}`,
    `https://cors-anywhere.herokuapp.com/${API_URL}`,
  ];
  

    console.log('🚀 Fetching data from API:', API_URL);

    for (const proxyUrl of proxies) {
      try {
        console.log(`🔄 Trying proxy: ${proxyUrl}`);
        const data = await fetchWithProxy(proxyUrl);
        console.log('✅ Proxy successful:', proxyUrl);
        updateDashboardWithData(data);
        return;
      } catch (err) {
        console.warn(`⚠️ Proxy failed (${proxyUrl}):`, err.message);
      }
    }

    // Final attempt: direct API call (will work if the API enables CORS)
    try {
      console.log(`🔄 Trying direct request: ${API_URL}`);
      const directRes = await fetch(API_URL, { headers: { 'Accept': 'application/json' }, mode: 'cors' });
      if (!directRes.ok) throw new Error(`HTTP ${directRes.status}`);
      const directData = await directRes.json();
      if (!directData || directData.status !== 'success') throw new Error('Invalid response format');
      updateDashboardWithData(directData);
      return;
    } catch (err) {
      console.warn(`⚠️ Direct fetch failed:`, err.message);
    }

    // All attempts failed
    console.error('❌ All CORS proxies failed. No data loaded.');
    console.log('💡 Permanent fix: Add these headers to dashboard.php on the server:');
    console.log('   header("Access-Control-Allow-Origin: *");');
    console.log('   header("Access-Control-Allow-Methods: GET, OPTIONS");');
    console.log('   header("Access-Control-Allow-Headers: Content-Type");');
    console.log('   header("Content-Type: application/json");');
    showErrorMessage();
  };

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;

    console.log('🚀 Initializing Dashboard Page...');
    console.log('⏰ Start time:', new Date().toLocaleTimeString());

    // Add dashboard specific styles
    addDashboardStyles();

    // HIDE the main page header
      if (titleEl) {
      titleEl.innerHTML = `<h1>Dashboard</h1><p>Verfolgen Sie die Leistung Ihres Dachbeschichtungsunternehmens</p>`;
      titleEl.style.display = 'block';
    }

    if (contentArea) {
      contentArea.innerHTML = getHTML();
      console.log('📄 Dashboard HTML rendered');

      // Fetch live data from API
      fetchDashboardData();
    }

    console.log('✅ Dashboard page initialized successfully');
  }

  return { init };
})();

// Register to window object
window.dashboardPage = dashboardPage;
console.log('📁 dashboard.js loaded - window.dashboardPage exists:', !!window.dashboardPage);