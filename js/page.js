// Main App - Loads page modules dynamically
const App = (function() {
  let currentPage = 'dashboard';

  const contentArea = document.getElementById('contentArea');
  const dynamicTitleEl = document.getElementById('dynamicPageTitle');

  // Load page module dynamically
  async function loadPageModule(pageName) {
    try {
      console.log(`Loading page module: ${pageName}`);
      
      // Remove old script if exists
      const oldScript = document.getElementById('pageScript');
      if (oldScript) {
        oldScript.remove();
        console.log('Removed old page script');
      }

      // Create new script element
      const script = document.createElement('script');
      script.id = 'pageScript';
      
      // ========== TRY DIFFERENT PATHS ==========
      // Try multiple paths to find the correct one
      const paths = [
        `js/pages/${pageName}.js?v=${Date.now()}`,      // Option 1: js/pages/dashboard.js
        `./js/pages/${pageName}.js?v=${Date.now()}`,    // Option 2: ./js/pages/dashboard.js
        `/js/pages/${pageName}.js?v=${Date.now()}`,     // Option 3: /js/pages/dashboard.js
        `${pageName}.js?v=${Date.now()}`,               // Option 4: dashboard.js (root)
        `pages/${pageName}.js?v=${Date.now()}`,         // Option 5: pages/dashboard.js
      ];
      
      // Use first path (you can change this to test)
      script.src = paths[0];
      console.log(`Attempting to load: ${script.src}`);
      
      script.onload = () => {
        console.log(`✅ ${pageName}.js loaded successfully`);
        
        // Check if page module exists
        const pageModule = window[`${pageName}Page`];
        console.log(`Looking for module: ${pageName}Page`, pageModule ? 'Found' : 'Not found');
        
        if (pageModule && typeof pageModule.init === 'function') {
          console.log(`Initializing ${pageName}Page module`);
          pageModule.init(contentArea, dynamicTitleEl);
        } else {
          console.error(`❌ Page module ${pageName}Page not found`);
          console.log('Available modules:', Object.keys(window).filter(k => k.endsWith('Page')));
          
          if (contentArea) {
            contentArea.innerHTML = `
              <div class="card">
                <div class="card-body">
                  <h3>⚠️ Fehler</h3>
                  <p>Die Seite "${pageName}" konnte nicht geladen werden.</p>
                  <p>Datei geladen: <strong>${script.src}</strong></p>
                  <p>Modul "${pageName}Page" wurde nicht gefunden.</p>
                  <hr>
                  <p><strong>Verfügbare Module:</strong> ${Object.keys(window).filter(k => k.endsWith('Page')).join(', ') || 'keine'}</p>
                  <p><strong>Tipp:</strong> Stellen Sie sicher dass die Datei <code>js/pages/${pageName}.js</code> das Modul <code>${pageName}Page</code> exportiert.</p>
                </div>
              </div>
            `;
          }
        }
      };
      
      script.onerror = (e) => {
        console.error(`❌ Failed to load ${pageName}.js from ${script.src}`);
        if (contentArea) {
          contentArea.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h3>⚠️ Fehler beim Laden der Seite</h3>
                <p>Die Datei <strong>${script.src}</strong> wurde nicht gefunden.</p>
                <p><strong>Lösung:</strong></p>
                <ol>
                  <li>Prüfen Sie ob der Ordner <strong>js/pages/</strong> existiert</li>
                  <li>Prüfen Sie ob die Datei <strong>${pageName}.js</strong> in diesem Ordner existiert</li>
                  <li>Prüfen Sie ob der Dateiname korrekt ist (Groß-/Kleinschreibung)</li>
                </ol>
                <p><strong>Aktueller Pfad:</strong> ${window.location.pathname}</p>
              </div>
            </div>
          `;
        }
      };
      
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error loading module:', error);
    }
  }

  function showPage(page) {
    console.log(`📄 Showing page: ${page}`);
    currentPage = page;
    
    // Update sidebar active state
    if (typeof SidebarManager !== 'undefined') {
      SidebarManager.updateActiveStates(currentPage);
    }
    
    // Load page module
    loadPageModule(page);
    
    // Close mobile sidebar
    if (window.innerWidth <= 768 && typeof SidebarManager !== 'undefined') {
      SidebarManager.closeMobileSidebar();
    }
  }

  function bindEvents() {
    console.log('Binding navigation events...');
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`Found ${navItems.length} navigation items`);
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const page = item.getAttribute('data-page');
        if (page) {
          console.log(`Navigation clicked: ${page}`);
          showPage(page);
        }
      });
    });
  }

  function init() {
    console.log('🚀 App initializing...');
    console.log('Current location:', window.location.pathname);
    
    if (!contentArea) {
      console.error('❌ contentArea element not found!');
    }
    if (!dynamicTitleEl) {
      console.error('❌ dynamicTitleEl element not found!');
    } else {
      console.log('✅ dynamicTitleEl found');
    }
    
    bindEvents();
    showPage('dashboard');
    console.log('✅ App initialized successfully');
  }

  return {
    init,
    showPage
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded, starting App...');
  App.init();
});