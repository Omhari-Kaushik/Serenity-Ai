/**
 * memory.js
 * Manages conversation memory, user context, and session data.
 * Designed as a drop-in layer for future AI memory systems.
 */

function createNewSession() {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: "New Chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentMood: null,
    messages: [],
  };
}

function ensureActiveSession() {
  if (!AppState.sessions) {
    AppState.sessions = [];
  }

  if (!AppState.activeSessionId) {
    const session = createNewSession();
    AppState.sessions.push(session);
    AppState.activeSessionId = session.id;
  }

  let activeSession = AppState.sessions.find(
    (session) => session.id === AppState.activeSessionId
  );

  if (!activeSession) {
    activeSession = createNewSession();
    AppState.sessions.push(activeSession);
    AppState.activeSessionId = activeSession.id;
  }

  return activeSession;
}

function generateSessionTitle(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) return "New Chat";

  const userMessages = messages
    .filter((entry) => entry && entry.role === "user" && entry.content)
    .map((entry) => String(entry.content).trim().toLowerCase());

  if (!userMessages.length) return "New Chat";

  const combined = userMessages.join(" ");

  // --- Stress / Burnout ---
  if (
    combined.includes("pressure") ||
    combined.includes("stress") ||
    combined.includes("tired") ||
    combined.includes("exhausted") ||
    combined.includes("burnout") ||
    combined.includes("sleep")
  ) {
    return "Feeling Burnt Out and Pressured";
  }
  // --- Pressure after success / imposter syndrome ---
  if (
    combined.includes("promoted") ||
    combined.includes("promotion") ||
    combined.includes("deserve it") ||
    combined.includes("mess this up") ||
    combined.includes("expectations")
  ) {
    return "Dealing with New Expectations";
  }
  // --- Self-doubt / comparison ---
  if (
    combined.includes("not good enough") ||
    combined.includes("behind") ||
    combined.includes("others better") ||
    combined.includes("not improving") ||
    combined.includes("failure")
  ) {
    return "Feeling Behind and Doubting Myself";
  }

  // --- Loneliness ---
  if (combined.includes("lonely") || combined.includes("alone")) {
    return "Loneliness and Connection";
  }

  // --- Grief ---
  if (
    combined.includes("sad") ||
    combined.includes("grief") ||
    combined.includes("loss")
  ) {
    return "Grief and Sadness";
  }

  // --- Decisions ---
  if (
    combined.includes("choose") ||
    combined.includes("decision") ||
    combined.includes("options")
  ) {
    return "Difficult Decisions";
  }

  // --- Communication ---
  if (
    combined.includes("talk to them") ||
    combined.includes("let it go") ||
    combined.includes("speak up")
  ) {
    return "Whether to Speak Up";
  }

  // --- Career ---
  if (
    combined.includes("placements") ||
    combined.includes("skills") ||
    combined.includes("career") ||
    combined.includes("job")
  ) {
    return "Career and Direction";
  }

  // --- Confusion / stuck ---
  if (
    combined.includes("confused") ||
    combined.includes("lost") ||
    combined.includes("stuck")
  ) {
    return "Feeling Lost and Stuck";
  }

  // --- Fallback (clean short title) ---
  const firstUsefulMessage = userMessages.find((msg) => msg.length > 3);
  if (!firstUsefulMessage) return "New Chat";

  let cleaned = firstUsefulMessage
    .replace(/[^\w\s]/g, "")
    .trim();

  let words = cleaned.split(/\s+/);

  const stopWords = ["i", "am", "is", "are", "the", "a", "an", "to", "of", "and"];
  words = words.filter(word => !stopWords.includes(word));

  words = words.slice(0, 4);

  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ─── Store a message in conversation history ─────────────────────────────────
function storeConversationMemory(role, content, metadata = {}) {
  const entry = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    type: metadata.type || "text",
    content,
    timestamp: new Date().toISOString(),
    mood: AppState.context.emotion || null,
    context: {
      ...AppState.context
    },
    ...metadata,
  };

  AppState.conversationHistory.push(entry);

  const activeSession = ensureActiveSession();
  activeSession.messages = [...AppState.conversationHistory];
  activeSession.updatedAt = new Date().toISOString();

  if (activeSession.title === "New Chat" || !activeSession.title) {
    activeSession.title = generateSessionTitle(activeSession.messages);
  }

  AppState.userProfile.conversationHistory = AppState.conversationHistory;
  persistUserProfile();
  return entry;
}

// ─── Update the active context ────────────────────────────────────────────────
function updateContext(updates = {}) {
  AppState.context = { ...AppState.context, ...updates };
  saveAppState();
}

// ─── Store a mood entry ───────────────────────────────────────────────────────
function storeMoodEntry(moodId, note = "") {
  const mood = AppConfig.moods.find((m) => m.id === moodId);
  if (!mood) return;

  const entry = {
    id: `mood_${Date.now()}`,
    moodId,
    label: mood.label,
    emoji: mood.emoji,
    color: mood.color,
    note,
    timestamp: new Date().toISOString(),
  };

  AppState.moodHistory.push(entry);
  AppState.userProfile.moodHistory = AppState.moodHistory;
  AppState.context.emotion = moodId;
  persistUserProfile();
  saveAppState();
  return entry;
}

// ─── Retrieve recent conversation window ─────────────────────────────────────
function getRecentConversationWindow(turns = 10) {
  return AppState.conversationHistory.slice(-turns);
}

// ─── Clear session memory ─────────────────────────────────────────────────────
function clearSessionMemory() {
  if (!AppState.sessions || AppState.sessions.length === 0) return;

  // Find index of current session
  const currentIndex = AppState.sessions.findIndex(
    (s) => s.id === AppState.activeSessionId
  );

  if (currentIndex === -1) return;

  // Remove current session
  AppState.sessions.splice(currentIndex, 1);

  // Decide next session
  let nextSession = null;

  if (AppState.sessions.length > 0) {
    nextSession =
      AppState.sessions[currentIndex] ||
      AppState.sessions[currentIndex - 1] ||
      AppState.sessions[0];
  } else {
    // If no sessions left → create new one
    nextSession = createNewSession();
    AppState.sessions.push(nextSession);
  }

  AppState.activeSessionId = nextSession.id;
  AppState.conversationHistory = nextSession.messages || [];
  AppState.currentMood = nextSession.currentMood || null;

  // Reset context
  AppState.context = {
    environment: AppState.context.environment,
    topic: null,
    emotion: null,
  };

  AppState.userProfile.conversationHistory =
    AppState.conversationHistory;

  persistUserProfile();
  saveAppState();
}

//
function startNewChatSession() {
  const newSession = createNewSession();

  if (!AppState.sessions) {
    AppState.sessions = [];
  }

  AppState.sessions.push(newSession);
  AppState.activeSessionId = newSession.id;
  AppState.conversationHistory = [];
  AppState.currentMood = null;

  AppState.context = {
    environment: AppState.context.environment,
    topic: null,
    emotion: null,
  };

  AppState.userProfile.conversationHistory = [];
  persistUserProfile();
  saveAppState();
}

// ─── Journal entry management ─────────────────────────────────────────────────
function storeJournalEntry(content, mood = null) {
  if (!AppState.userProfile.journalEntries) {
    AppState.userProfile.journalEntries = [];
  }

  const entry = {
    id: `journal_${Date.now()}`,
    content,
    mood,
    timestamp: new Date().toISOString(),
  };

  AppState.userProfile.journalEntries.push(entry);
  persistUserProfile();
  saveAppState();
  return entry;
}

function getJournalEntries() {
  return AppState.userProfile.journalEntries || [];
}

// ─── Save full app state ──────────────────────────────────────────────────────
function saveAppState() {
  try {
    if (AppState.settings && AppState.settings.saveHistory === false) {
      return;
    }

    localStorage.setItem(
      AppConfig.storage.appState,
      JSON.stringify(AppState)
    );
  } catch (e) {
    console.warn("Serenity: Could not save app state.", e);
  }
}

// ─── Load full app state ──────────────────────────────────────────────────────
function loadAppState() {
  try {
    const stored = localStorage.getItem(AppConfig.storage.appState);

    if (!stored) return false;

    const parsed = JSON.parse(stored);

    AppState.currentView = parsed.currentView || "chat";
    AppState.sessions = parsed.sessions || [];
    AppState.activeSessionId = parsed.activeSessionId || null;
    AppState.conversationHistory = parsed.conversationHistory || [];
    AppState.moodHistory = parsed.moodHistory || [];
    AppState.currentMood = parsed.currentMood || null;

    AppState.settings = {
      ...AppState.settings,
      ...(parsed.settings || {})
    };

    AppState.userProfile = {
      ...AppState.userProfile,
      ...(parsed.userProfile || {})
    };

    AppState.context = {
      ...AppState.context,
      ...(parsed.context || {})
    };

    const activeSession = ensureActiveSession();
    AppState.conversationHistory = activeSession.messages || [];
    AppState.currentMood = activeSession.currentMood || null;

    AppState.sessionStartTime = parsed.sessionStartTime || Date.now();
    AppState.isTyping = false;

    return true;
  } catch (e) {
    console.warn("Serenity: Could not load app state.", e);
    return false;
  }
}