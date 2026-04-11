/**
 * navigation.js
 * Handles view switching, sidebar state, and navigation events.
 */

// ─── Navigate to a named view ─────────────────────────────────────────────────
function navigateTo(viewId) {
  // Hide all views
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("active");
  });

  // Show target view
  const target = document.getElementById(`${viewId}-view`);
  if (target) {
    target.classList.add("active");
  }

  // Update nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.view === viewId) {
      item.classList.add("active");
    }
  });

  // Update AppState
  AppState.currentView = viewId;
  saveAppState();

  // Close mobile sidebar if open
  const sidebar = document.getElementById("sidebar");
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.remove("open");
  }

  // Lifecycle hook
  onViewEnter(viewId);
}

// ─── View lifecycle hook ──────────────────────────────────────────────────────
function onViewEnter(viewId) {
  switch (viewId) {
    case "chat": {
      const msgList = document.getElementById("message-list");
      if (msgList) msgList.scrollTop = msgList.scrollHeight;
      break;
    }
    case "mood":
      renderMoodTracker();
      renderMoodChart();
      break;
    case "journal":
      renderJournalView();
      break;
    case "settings":
      renderSettingsView();
      break;
    case "insights":
      renderInsightsView();
      break;
    default:
      break;
  }
}

// ─── Wire up sidebar navigation ───────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const newChatBtn = document.getElementById("new-chat-btn");
      if (newChatBtn) newChatBtn.classList.remove("active");
      
      const view = item.dataset.view;
      if (view) navigateTo(view);
    });
  });

  // Mobile hamburger toggle
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");
  if (hamburger && sidebar) {
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Close sidebar on overlay click
  const overlay = document.getElementById("sidebar-overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      if (sidebar) sidebar.classList.remove("open");
    });
  }
}