// Sidebar Module - Handles sidebar interactions, mobile menu
const SidebarManager = (function() {
  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const logoutBtn = document.getElementById('logoutBtn');

  // Mobile sidebar functions
  function closeMobileSidebar() {
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.remove('active');
    }
  }

  function openMobileSidebar() {
    if (sidebar) {
      sidebar.classList.add('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.add('active');
    }
  }

  // Update active state for navigation items
  function updateActiveStates(currentPage) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(function(item) {
      item.classList.remove('active');
    });
    
    // Add active class to current page button
    var activeButton = document.querySelector('.nav-item[data-page="' + currentPage + '"]');
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }

  function ensureLogoutConfirmModal() {
    var existing = document.getElementById('logoutConfirmModal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'logoutConfirmModal';
    modal.className = 'logout-confirm-modal';
    modal.innerHTML = `
      <div class="logout-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logoutConfirmTitle">
        <div class="logout-confirm-icon">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <h2 id="logoutConfirmTitle">Abmelden?</h2>
        <p>Moechten Sie sich wirklich abmelden?</p>
        <div class="logout-confirm-actions">
          <button type="button" class="logout-confirm-cancel" id="logoutCancelBtn">Abbrechen</button>
          <button type="button" class="logout-confirm-submit" id="logoutConfirmBtn">Abmelden</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function closeLogoutConfirm() {
    var modal = document.getElementById('logoutConfirmModal');
    if (modal) modal.classList.remove('active');
  }

  function performLogout() {
    if (window.MSDachAuth && typeof window.MSDachAuth.logout === 'function') {
      window.MSDachAuth.logout();
      return;
    }
    if (typeof PageManager !== 'undefined') {
      PageManager.showPage('dashboard');
    }
  }

  // Handle logout
  function handleLogout() {
    var modal = ensureLogoutConfirmModal();
    modal.classList.add('active');

    var cancelBtn = document.getElementById('logoutCancelBtn');
    var confirmBtn = document.getElementById('logoutConfirmBtn');

    if (cancelBtn) cancelBtn.onclick = closeLogoutConfirm;
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        closeLogoutConfirm();
        performLogout();
      };
    }
    modal.onclick = function(event) {
      if (event.target === modal) closeLogoutConfirm();
    };
  }

  // Add close button INSIDE sidebar for mobile
  function addCloseButton() {
    // Check if close button already exists
    if (document.getElementById('mobileCloseBtn')) return;
    
    // Create close button element
    var closeBtn = document.createElement('button');
    closeBtn.id = 'mobileCloseBtn';
    closeBtn.className = 'mobile-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close sidebar');
    closeBtn.onclick = function() {
      closeMobileSidebar();
    };
    
    // Insert close button at the top of sidebar (inside sidebar, before sidebar-logo)
    var sidebarHeader = sidebar.querySelector('.sidebar-logo');
    if (sidebarHeader) {
      sidebarHeader.style.position = 'relative';
      sidebarHeader.appendChild(closeBtn);
    }
  }

  // Event binding
  function bindEvents() {
    // Mobile menu toggle
    if (menuToggleBtn) {
      menuToggleBtn.addEventListener('click', function() {
        openMobileSidebar();
      });
    }

    // Mobile overlay click
    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', closeMobileSidebar);
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // Window resize - auto close mobile sidebar on larger screens
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        closeMobileSidebar();
      }
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') closeLogoutConfirm();
    });
  }

  // Add CSS for mobile close button
  function addCloseButtonStyles() {
    if (document.getElementById('mobile-close-styles')) return;
    
    var style = document.createElement('style');
    style.id = 'mobile-close-styles';
    style.textContent = `
      /* Close button - hidden by default, shows only when sidebar is open on mobile */
      .mobile-close-btn {
           display: none;
    position: absolute;
    top: 16px;
    right: -40px;
    width: 32px;
    height: 32px;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    color: white;
    font-size: 20px;
    font-weight: 300;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 100;
    align-items: center;
    justify-content: center;
      }
      
      .mobile-close-btn:hover {
         background: #0f172a;
  transform: scale(1.05);
      }
      
      /* On mobile, when sidebar is open, show close button */
      @media (max-width: 768px) {
        .sidebar.mobile-open .mobile-close-btn {
          display: flex;
        }
      }
      
      /* Ensure sidebar-logo has relative position */
      .sidebar-logo {
        position: relative;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize sidebar
  function init() {
    addCloseButtonStyles();
    addCloseButton();
    bindEvents();
  }

  // Public API
  return {
    init: init,
    updateActiveStates: updateActiveStates,
    closeMobileSidebar: closeMobileSidebar,
    openMobileSidebar: openMobileSidebar
  };
})();

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  SidebarManager.init();
});
