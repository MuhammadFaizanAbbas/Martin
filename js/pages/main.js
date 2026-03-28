// Main App - Loads page modules dynamically
const App = (function() {
  let currentPage = 'dashboard';
  let currentModule = null;

  const contentArea = document.getElementById('contentArea');
  const dynamicTitleEl = document.getElementById('dynamicPageTitle');

  // Load page module dynamically
  async function loadPageModule(pageName) {
    try {
      // Remove old script if exists
      const oldScript = document.getElementById('pageScript');
      if (oldScript) {
        oldScript.remove();
      }

      // Create new script element
      const script = document.createElement('script');
      script.id = 'pageScript';
      script.src = `js/pages/${pageName}.js?v=${Date.now()}`;
      script.onload = () => {
        // Initialize page module
        if (window[`${pageName}Page`]) {
          window[`${pageName}Page`].init(contentArea, dynamicTitleEl);
        }
      };
      script.onerror = () => {
        console.error(`Failed to load ${pageName} module`);
        contentArea.innerHTML = `<div class="card"><div class="card-body">Fehler beim Laden der Seite</div></div>`;
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error loading module:', error);
    }
  }

  function showPage(page) {
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
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const page = item.getAttribute('data-page');
        if (page) showPage(page);
      });
    });
  }

  function init() {
    bindEvents();
    showPage('dashboard');
  }

  return {
    init,
    showPage
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});