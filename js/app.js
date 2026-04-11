/**
 * app.js
 * Main application entry point.
 * Boots all modules in the correct order after the DOM is ready.
*/

function renderSettingsView() {
  const profileEl = document.getElementById("settings-profile");
  const preferencesEl = document.getElementById("settings-preferences");
  const privacyEl = document.getElementById("settings-privacy");

  if (!profileEl || !preferencesEl || !privacyEl) return;

  profileEl.innerHTML = `
    <div class="glass-card settings-card">
      <h3 class="settings-card-title">Profile</h3>
      <label class="settings-label" for="display-name-input">Your name</label>
      <input
        id="display-name-input"
        class="settings-input"
        type="text"
        placeholder="Enter your name"
        value="${AppState.settings?.displayName || ""}"
      />
    </div>
  `;

  preferencesEl.innerHTML = `
    <div class="glass-card settings-card">
      <h3 class="settings-card-title">Preferences</h3>

      <label class="settings-toggle-row">
        <span>Enable animations</span>
        <input id="animations-toggle" type="checkbox" ${AppState.settings?.animationsEnabled ? "checked" : ""} />
      </label>
    </div>
  `;

  privacyEl.innerHTML = `
    <div class="glass-card settings-card">
      <h3 class="settings-card-title">Privacy</h3>

      <label class="settings-toggle-row">
        <span>Save chat history on this device</span>
        <input id="history-toggle" type="checkbox" ${AppState.settings?.saveHistory ? "checked" : ""} />
      </label>

      <p class="settings-note">
        Your current data is stored locally on this device.
      </p>

      <button id="clear-local-data-btn" class="settings-danger-btn">
        Clear local data
      </button>
    </div>
  `;

  const displayNameInput = document.getElementById("display-name-input");
  const animationsToggle = document.getElementById("animations-toggle");
  const historyToggle = document.getElementById("history-toggle");
  const clearLocalDataBtn = document.getElementById("clear-local-data-btn");

  if (displayNameInput) {
    displayNameInput.addEventListener("input", (e) => {
      AppState.settings.displayName = e.target.value;
      saveAppState();
      renderUserProfile();
    });
  }

  if (animationsToggle) {
    animationsToggle.addEventListener("change", (e) => {
      AppState.settings.animationsEnabled = e.target.checked;
      saveAppState();
      applyAnimationSetting();
    });
  }

  if (historyToggle) {
    historyToggle.addEventListener("change", (e) => {
      AppState.settings.saveHistory = e.target.checked;

      if (!AppState.settings.saveHistory) {
        localStorage.removeItem(AppConfig.storage.appState);
        localStorage.removeItem(AppConfig.storage.userProfile);
        localStorage.removeItem(AppConfig.storage.moodHistory);
        localStorage.removeItem(AppConfig.storage.conversationHistory);
        localStorage.removeItem(AppConfig.storage.journalEntries);
      } else {
        saveAppState();
        persistUserProfile();
      }
    });
  }

  if (clearLocalDataBtn) {
    clearLocalDataBtn.addEventListener("click", () => {
      const confirmed = window.confirm(
        "This will clear your chats, moods, journal entries, and saved settings from this device. Do you want to continue?"
      );

      if (!confirmed) return;

      localStorage.removeItem(AppConfig.storage.appState);
      localStorage.removeItem(AppConfig.storage.userProfile);
      localStorage.removeItem(AppConfig.storage.moodHistory);
      localStorage.removeItem(AppConfig.storage.conversationHistory);
      localStorage.removeItem(AppConfig.storage.journalEntries);

      window.location.reload();
    });
  }
}

function renderUserProfile() {
  const nameEl = document.getElementById("sidebar-user-name");
  const avatarEl = document.querySelector(".user-avatar");

  if (!nameEl || !avatarEl) return;

  const name = AppState.settings?.displayName?.trim();

  nameEl.textContent = name || "You";

  if (!name) {
    avatarEl.textContent = "🌿";
    return;
  }

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    avatarEl.textContent = parts[0][0].toUpperCase();
    return;
  }

  const initials =
    parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();

  avatarEl.textContent = initials;
}

function getMoodChartData() {
  const history = AppState.moodHistory || [];

  const grouped = {};

  history.forEach((entry) => {
    const moodConfig = AppConfig.moods.find((m) => m.id === entry.moodId);
    if (!moodConfig) return;

    const dateKey = new Date(entry.timestamp).toLocaleDateString("en-CA"); // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: new Date(entry.timestamp),
        total: 0,
        count: 0,
        moods: []
      };
    }

    grouped[dateKey].total += moodConfig.score;
    grouped[dateKey].count += 1;
    grouped[dateKey].moods.push(moodConfig);
  });

  return Object.values(grouped)
    .sort((a, b) => a.date - b.date)
    .slice(-7)
    .map((day) => {
      const avgScore = day.total / day.count;

      const closestMood = day.moods.reduce((prev, current) => {
        return Math.abs(current.score - avgScore) < Math.abs(prev.score - avgScore)
          ? current
          : prev;
      });

      return {
        label: day.date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short"
        }),
        value: avgScore,
        color: closestMood.color,
        emoji: closestMood.emoji
      };
    });
}

function renderMoodChart() {
  const chartEl = document.getElementById("mood-chart-card");
  if (!chartEl) return;

  const data = getMoodChartData();

  if (data.length === 0) {
    chartEl.innerHTML = `
      <div class="mood-chart-empty">
        No mood data yet
      </div>
    `;
    return;
  }

  const maxValue = 5;
  const minHeight = 30;
  const maxHeight= 140;

  chartEl.innerHTML = `
    <div class="mood-chart-title">Mood trend</div>
    <div class="mood-chart-bars">
      ${data.map((item) => `
        <div class="mood-chart-bar-group">
          <div class="mood-chart-plot">
            <div 
              class="mood-chart-bar"
              style="
                height: ${minHeight + (item.value / maxValue) * (maxHeight - minHeight)}px;
                background: ${item.color};
              "
            ></div>
          </div>
          <div class="mood-chart-emoji">${item.emoji}</div>
          <div class="mood-chart-label">${item.label}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderJournalView() {
  const editorEl = document.getElementById("journal-editor");
  const listEl = document.getElementById("journal-entries-list");

  if (!editorEl || !listEl) return;

  const searchQuery = AppState.journalSearchQuery || "";

  const allEntries = getJournalEntries().slice().reverse();

  const filterMood = AppState.journalFilterMood || "all";

  const dateFilter = AppState.journalDateFilter || "all";

  // const searchInputEl = document.getElementById("journal-search-input");
  // const searchQuery = searchInputEl ? searchInputEl.value.toLowerCase() : "";

  let entries = allEntries;

  if (dateFilter !== "all") {
    const now = new Date();

    entries = entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);

      if (dateFilter === "today") {
        return (
          entryDate.getDate() === now.getDate() &&
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getFullYear() === now.getFullYear()
        );
      }

      if (dateFilter === "week") {
        const diffMs = now - entryDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }

      if (dateFilter === "month") {
        return (
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }

  if (filterMood !== "all") {
    entries = entries.filter(entry => entry.mood === filterMood);
  }

  if (searchQuery) {
    entries = entries.filter(entry =>
      entry.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const editingJournalEntryId = AppState.editingJournalEntryId || null;

  const journalMoodId =
    AppState.journalDraftMood !== undefined
      ? AppState.journalDraftMood
      : (AppState.currentMood ?? null);

  const currentMoodConfig = AppConfig.moods.find(
    (m) => m.id === journalMoodId
  );

  const moodPreview = currentMoodConfig
    ? `<div 
        class="journal-current-mood"
        style="
          background: ${currentMoodConfig.color}33;
          border: 1px solid ${currentMoodConfig.color}88;
        "
      >
        This entry will be tagged as ${currentMoodConfig.emoji} ${currentMoodConfig.label}
      </div>`
    : `<div class="journal-current-mood journal-current-mood-empty">
        This entry will be saved without a mood tag
      </div>`;

  const journalMoodOptions = `
    <button
      type="button"
      class="journal-mood-pill ${journalMoodId === null ? "active" : ""}"
      data-journal-mood-id=""
    >
      <span>✖</span>
      <span>No mood</span>
    </button>
  ` + AppConfig.moods.map((mood) => `
    <button
      type="button"
      class="journal-mood-pill ${journalMoodId === mood.id ? "active" : ""}"
      data-journal-mood-id="${mood.id}"
      style="--journal-pill-color: ${mood.color};"
    >
      <span>${mood.emoji}</span>
      <span>${mood.label}</span>
    </button>
  `).join("");

  editorEl.innerHTML = `
    <div class="glass-card journal-card">
      <h3 class="journal-card-title">Write for today</h3>
      <textarea
        id="journal-textarea"
        class="journal-textarea"
        placeholder="Write whatever is on your mind..."
        >${editingJournalEntryId
          ? (getJournalEntries().find((e) => String(e.timestamp) === String(editingJournalEntryId))?.content || "")
          : ""}
      </textarea>

      ${moodPreview}

      <div class="journal-mood-selector">
        <div class="journal-mood-selector-label">Mood for this entry</div>
        <div class="journal-mood-pills">
          ${journalMoodOptions}
        </div>
      </div>

      <button id="save-journal-btn" class="journal-save-btn">
        ${editingJournalEntryId ? "Update entry" : "Save entry"}
      </button>
    </div>
  `;

  
  
  const journalFilterOptions = `
    <button
      type="button"
      class="journal-filter-pill ${filterMood === "all" ? "active" : ""}"
      data-journal-filter="all"
    >
      All
    </button>
  ` + AppConfig.moods.map((mood) => `
    <button
      type="button"
      class="journal-filter-pill ${filterMood === mood.id ? "active" : ""}"
      data-journal-filter="${mood.id}"
      style="--journal-pill-color: ${mood.color};"
    >
      ${mood.emoji} ${mood.label}
    </button>
  `).join("");

  const dateFilterOptions = `
    <button class="journal-filter-pill ${dateFilter === "all" ? "active" : ""}" data-date-filter="all">
      All time
    </button>
    <button class="journal-filter-pill ${dateFilter === "today" ? "active" : ""}" data-date-filter="today">
      Today
    </button>
    <button class="journal-filter-pill ${dateFilter === "week" ? "active" : ""}" data-date-filter="week">
      This week
    </button>
    <button class="journal-filter-pill ${dateFilter === "month" ? "active" : ""}" data-date-filter="month">
      This month
    </button>
  `;

  editorEl.innerHTML += `
    <div class="journal-top-bar">
      <input 
        id="journal-search-input" 
        type="text" 
        placeholder="Search..."
        class="journal-search-input"
        value="${searchQuery}"
      />

      <div class="journal-date-filters">
        ${dateFilterOptions}
      </div>
    </div>
  `;

  listEl.innerHTML = `
    <div class="journal-filter-bar">
      ${journalFilterOptions}
    </div>
  `;

  if (entries.length === 0) {
    listEl.innerHTML += `
      <div class="glass-card journal-card journal-empty">
        <div class="journal-empty-title">No entries yet</div>
        <div class="journal-empty-text">Your saved reflections will appear here.</div>
      </div>
    `;
  } else {
    listEl.innerHTML += entries.map((entry) => {
      const moodConfig = AppConfig.moods.find((m) => m.id === entry.mood);
      const moodTag = moodConfig
        ? `<span 
            class="journal-entry-mood"
            style="
              background: ${moodConfig.color}33;
              border: 1px solid ${moodConfig.color}88;
            "
          >${moodConfig.emoji} ${moodConfig.label}</span>`
        : "";

      return `
        <div class="glass-card journal-card">
          
          <div class="journal-entry-meta">
            <div class="journal-entry-time">${new Date(entry.timestamp).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit"
            })}</div>
            ${moodTag}
          </div>

          ${entry.content.length > 180 ? `
            <div class="journal-entry-content collapsed">${entry.content}</div>
            <button class="journal-toggle-btn" type="button">Show more</button>
          ` : `
            <div class="journal-entry-content">${entry.content}</div>
          `}

          <div class="journal-entry-actions">
            <button class="journal-edit-btn" data-id="${entry.timestamp}">Edit</button>
            <button class="journal-delete-btn" data-id="${entry.timestamp}">Delete</button>
          </div>

        </div>
      `;
    }).join("");
  }

  const saveBtn = document.getElementById("save-journal-btn");
  const textarea = document.getElementById("journal-textarea");
  const journalMoodPills = document.querySelectorAll(".journal-mood-pill");

  journalMoodPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const moodId = pill.dataset.journalMoodId;

      AppState.journalDraftMood = moodId ? moodId : null;
      renderJournalView();
    });
  });

  const journalToggleButtons = document.querySelectorAll(".journal-toggle-btn");

  journalToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const contentEl = btn.previousElementSibling;
      if (!contentEl) return;

      const isCollapsed = contentEl.classList.contains("collapsed");

      if (isCollapsed) {
        contentEl.classList.remove("collapsed");
        btn.textContent = "Show less";
      } else {
        contentEl.classList.add("collapsed");
        btn.textContent = "Show more";
      }
    });
  });

  const dateFilterPills = document.querySelectorAll("[data-date-filter]");

  dateFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      AppState.journalDateFilter = pill.dataset.dateFilter || "all";
      renderJournalView();
    });
  });

  const journalFilterPills = document.querySelectorAll(".journal-filter-pill");

  journalFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      AppState.journalFilterMood = pill.dataset.journalFilter || "all";
      renderJournalView();
    });
  });

  const searchInput = document.getElementById("journal-search-input");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      AppState.journalSearchQuery = e.target.value;
      renderJournalView();

      requestAnimationFrame(() => {
        const newSearchInput = document.getElementById("journal-search-input");
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.setSelectionRange(
            newSearchInput.value.length,
            newSearchInput.value.length
          );
        }
      });
    });
  }

  const editButtons = document.querySelectorAll(".journal-edit-btn");

    editButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const entryId = btn.dataset.id;

        const entry = getJournalEntries().find(
          (e) => String(e.timestamp) === String(entryId)
        );

        if (!entry) return;

        const textarea = document.getElementById("journal-textarea");
        if (textarea) {
          textarea.value = entry.content;
          textarea.focus();
        }

        AppState.journalDraftMood = entry.mood || null;
        AppState.editingJournalEntryId = entryId;

        renderJournalView();
      });
    });

  const deleteButtons = document.querySelectorAll(".journal-delete-btn");

  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const entryId = btn.dataset.id;

      AppState.userProfile.journalEntries = getJournalEntries().filter(
        (entry) => String(entry.timestamp) !== String(entryId)
      );

      persistUserProfile();
      saveAppState();
      renderJournalView();
    });
  });

  if (saveBtn && textarea) {
    saveBtn.addEventListener("click", () => {
      const text = textarea.value.trim();
      if (!text) return;

      if (AppState.editingJournalEntryId) {
        // 🔥 UPDATE existing entry
        AppState.userProfile.journalEntries = getJournalEntries().map((entry) => {
          if (String(entry.timestamp) === String(AppState.editingJournalEntryId)) {
            return {
              ...entry,
              content: text,
              mood: AppState.journalDraftMood ?? AppState.currentMood ?? null
            };
          }
          return entry;
        });

        AppState.editingJournalEntryId = null;

      } else {
        // ➕ CREATE new entry
        storeJournalEntry(
          text,
          AppState.journalDraftMood ?? AppState.currentMood ?? null
        );
      }

      AppState.journalDraftMood = null;
      textarea.value = "";

      persistUserProfile();
      saveAppState();
      renderJournalView();
    });
  }
}

function renderInsightsView() {
  const cardsEl = document.getElementById("insights-cards");
  const summaryEl = document.getElementById("weekly-summary");

  if (!cardsEl || !summaryEl) return;

  const moodHistory = AppState.moodHistory || [];
  // ─── Mood trend detection ─────────────────────────────
  let trendInsight = "";

  if (moodHistory.length >= 3) {
    const recent = moodHistory.slice(-3);

    const first = AppConfig.moods.find(m => m.id === recent[0].moodId);
    const last = AppConfig.moods.find(m => m.id === recent[2].moodId);

    if (first && last) {
      if (first.id !== last.id) {
        trendInsight = `There seems to be a shift from <strong>${first.label}</strong> toward <strong>${last.label}</strong> in your recent moods.`;
      } else {
        trendInsight = `Your recent moods have been consistently <strong>${last.label}</strong>.`;
      }
    }
  }

  // ─── Streak detection ─────────────────────────────
  let streakInsight = "";

  if (moodHistory.length > 0) {
    const dates = moodHistory.map(entry => {
      const d = new Date(entry.timestamp);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    });

    const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);

    let streak = 1;

    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const diff = (uniqueDates[i] - uniqueDates[i + 1]) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    if (streak === 1) {
      streakInsight = `You logged your mood today — a good step to stay aware.`;
    } else if (streak <= 3) {
      streakInsight = `You’ve been checking in for <strong>${streak} days</strong> in a row.`;
    } else {
      streakInsight = `You’re on a <strong>${streak}-day streak</strong>. That’s strong consistency.`;
    }
  }

  // ─── Emotional balance insight ─────────────────────────────
  let balanceInsight = "";

  if (moodHistory.length >= 3) {
    const recentMoods = moodHistory.slice(-5);

    const recentScores = recentMoods
      .map((entry) => {
        const moodConfig = AppConfig.moods.find((m) => m.id === entry.moodId);
        return moodConfig ? moodConfig.score : null;
      })
      .filter((score) => score !== null);

    if (recentScores.length > 0) {
      const average =
        recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;

      if (average >= 4.2) {
        balanceInsight = `Your recent check-ins have leaned toward a lighter emotional space.`;
      } else if (average >= 3) {
        balanceInsight = `Your recent moods look fairly balanced, with both lighter and heavier moments.`;
      } else {
        balanceInsight = `Your recent moods have been leaning heavier, which might be a sign to slow down and check in gently.`;
      }
    }
  }

  const journalEntries = getJournalEntries() || [];

  if (moodHistory.length === 0 && journalEntries.length === 0) {
    cardsEl.innerHTML = `
      <div class="glass-card insights-card insights-empty">
        <div class="insights-card-title">No insights yet</div>
        <div class="insights-card-text">
          As you log moods and write journal entries, Serenity will start noticing patterns here.
        </div>
      </div>
    `;
    summaryEl.innerHTML = "";
    return;
  }

  const latestMood = moodHistory[moodHistory.length - 1];
  const latestMoodConfig = latestMood
    ? AppConfig.moods.find((m) => m.id === latestMood.moodId)
    : null;

  const moodCounts = {};
  moodHistory.forEach((entry) => {
    moodCounts[entry.moodId] = (moodCounts[entry.moodId] || 0) + 1;
  });

  let dominantMoodId = null;
  let dominantMoodCount = 0;

  Object.entries(moodCounts).forEach(([moodId, count]) => {
    if (count > dominantMoodCount) {
      dominantMoodId = moodId;
      dominantMoodCount = count;
    }
  });

  const dominantMoodConfig = dominantMoodId
    ? AppConfig.moods.find((m) => m.id === dominantMoodId)
    : null;

  cardsEl.innerHTML = `
    ${latestMoodConfig ? `
      <div class="glass-card insights-card">
        <div class="insights-card-title">Latest mood</div>
        <div class="insights-card-text">
          Your most recent check-in was <strong>${latestMoodConfig.emoji} ${latestMoodConfig.label}</strong>.
        </div>
      </div>
    ` : ""}

    ${dominantMoodConfig ? `
      <div class="glass-card insights-card">
        <div class="insights-card-title">Most frequent mood</div>
        <div class="insights-card-text">
          <strong>${dominantMoodConfig.emoji} ${dominantMoodConfig.label}</strong> has appeared most often in your recent mood logs.
        </div>
      </div>
    ` : ""}

    ${journalEntries.length > 0 ? `
      <div class="glass-card insights-card">
        <div class="insights-card-title">Journal activity</div>
        <div class="insights-card-text">
          You have written <strong>${journalEntries.length}</strong> journal ${journalEntries.length === 1 ? "entry" : "entries"} so far.
        </div>
      </div>
    ` : ""}

    ${streakInsight ? `
      <div class="glass-card insights-card">
        <div class="insights-card-title">Consistency</div>
        <div class="insights-card-text">
          ${streakInsight}
        </div>
      </div>
    ` : ""}

    ${balanceInsight ? `
      <div class="glass-card insights-card">
        <div class="insights-card-title">Emotional pattern</div>
        <div class="insights-card-text">
          ${balanceInsight}
        </div>
      </div>
    ` : ""}
  `;

  summaryEl.innerHTML = `
    <div class="glass-card insights-card">
      <div class="insights-card-title">Weekly reflection</div>
      <div class="insights-card-text">
        ${
          dominantMoodConfig
            ? `Lately, <strong>${dominantMoodConfig.label}</strong> has been showing up the most.`
            : `Your emotional patterns will become clearer as you continue using Serenity.`
        }

        ${trendInsight ? `<br><br>${trendInsight}` : ""}

        ${
          journalEntries.length > 0
            ? ` You’re also building a written record of how things have felt, which will make future insights more meaningful.`
            : ` Adding a few journal entries will make this space more personal and insightful.`
        }
      </div>
    </div>
  `;
}

function applyAnimationSetting() {
  const animationsEnabled = AppState.settings?.animationsEnabled !== false;

  if (animationsEnabled) {
    document.body.classList.remove("reduce-motion");
  } else {
    document.body.classList.add("reduce-motion");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Load persisted user data
  loadUserProfile();
  loadAppState();
  renderUserProfile();
  applyAnimationSetting();

  // 2. Start background effects
  initBackground();

  // 3. Wire up navigation
  initNavigation();
  const userCard = document.getElementById("sidebar-user-card");
  if (userCard) {
    userCard.addEventListener("click", () => {
      navigateTo("settings");
    });
  }

  // 4. Initialise chat (default view)
  initChat();

  // 5. Set initial view
  navigateTo(AppState.currentView);

  function initInfoModal() {
    const infoBtn = document.getElementById("info-btn");
    const modal = document.getElementById("info-modal");
    const closeBtn = document.getElementById("close-info");
    const chatTimeEl = document.getElementById("chat-start-time");

    if (!infoBtn || !modal || !closeBtn || !chatTimeEl) return;

    infoBtn.addEventListener("click", () => {
      const session = AppState.sessions.find(
        (s) => s.id === AppState.activeSessionId
      );

      if (session && session.createdAt) {
        const date = new Date(session.createdAt);
        chatTimeEl.textContent = date.toLocaleString("en-IN",{day: "numeric", month: "short", hour: "numeric", minute:"2-digit"});
      } else {
        chatTimeEl.textContent = "Not available";
      }

      modal.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  }
  initInfoModal();

  // 6. Set environment context based on time of day
  const hour = new Date().getHours();
  let env = "day";
  if (hour >= 5 && hour < 12) env = "morning";
  else if (hour >= 12 && hour < 17) env = "afternoon";
  else if (hour >= 17 && hour < 21) env = "evening";
  else env = "night";
  updateContext({ environment: env });

  console.log(`✦ Serenity ${AppConfig.version} initialised — environment: ${env}`);
});
