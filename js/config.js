/**
 * config.js
 * Global application configuration, state, and constants.
 * All future AI/API settings and feature flags live here.
 */

// ─── Global Application State ───────────────────────────────────────────────
const AppState = {
  currentView: "chat",
  conversationHistory: [],
  sessions: [],
  activeSessionId: null,
  moodHistory: [],
  currentMood: null,
  moodFilter: "day",
  moodHistoryExpanded: false,
  settings: {
    displayName: "",
    animationsEnabled: true,
    saveHistory: true
  },
  userProfile: {
    name: "",
    age: null,
    conversationHistory: [],
    moodHistory: [],
    journalEntries: [],
  },
  context: {
    environment: null,   // e.g. "morning", "night"
    topic: null,         // e.g. "anxiety", "work"
    emotion: null,       // detected or selected emotion
  },
  sessionStartTime: Date.now(),
  isTyping: false,
};

// ─── App Configuration ───────────────────────────────────────────────────────
const AppConfig = {
  appName: "Serenity",
  version: "1.0.0",

  // AI integration placeholders — fill in when connecting a backend
  ai: {
    endpoint: "",         // e.g. "https://api.example.com/v1/chat"
    model: "",            // e.g. "gpt-4o" or "claude-3-5-sonnet"
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: `You are Serenity, a compassionate AI emotional wellness companion. 
      You speak with warmth, empathy, and without judgment. 
      Your role is to listen, support, and gently guide users toward clarity and calm.`,
  },

  // Local storage keys
  storage: {
    appState: "serenity_app_state",
    userProfile: "serenity_user_profile",
    moodHistory: "serenity_mood_history",
    conversationHistory: "serenity_conversation_history",
    journalEntries: "serenity_journal_entries",
  },

  // Typing simulation settings
  typingDelay: {
    min: 400,
    max: 800,
  },

  // Mood options shown above chat input
  moods: [
    { id: "happy",    label: "Happy",   emoji: "😊", color: "#ffe29a", score: 5 },
    { id: "calm",     label: "Calm",    emoji: "😌", color: "#a8d8b9", score: 4 },
    { id: "anxious",  label: "Anxious", emoji: "😰", color: "#b0c4de", score: 2 },
    { id: "sad",      label: "Sad",     emoji: "😔", color: "#c3aed6", score: 1 },
    { id: "angry",    label: "Angry",   emoji: "😤", color: "#f4a7b9", score: 1 },
    { id: "stressed", label: "Stressed",emoji: "😓", color: "#ffd3b6", score: 2 },
  ],

  // Welcome message shown on first load
  getWelcomeMessage: () => {
    const name = AppState.settings?.displayName?.trim();

    return name
      ? `Hello ${name}, I'm Serenity. This is your space — no pressure, no judgment. How are you feeling today?`
      : "Hello, I'm Serenity. This is your space — no pressure, no judgment. How are you feeling today?";
  },
  
  // Feature flags — toggle future features on/off without code changes
  features: {
    voiceInput: false,
    emotionDetection: false,
    insightsDashboard: false,
    journalAI: false,
  },
};

// ─── Utility: Persist state to localStorage ───────────────────────────────────
function persistUserProfile() {
  try {
    if (AppState.settings && AppState.settings.saveHistory === false) {
      return;
    }

    localStorage.setItem(
      AppConfig.storage.userProfile,
      JSON.stringify(AppState.userProfile)
    );
  } catch (e) {
    console.warn("Serenity: Could not persist user profile.", e);
  }
}

// ─── Utility: Load state from localStorage ────────────────────────────────────
function loadUserProfile() {
  try {
    const stored = localStorage.getItem(AppConfig.storage.userProfile);
    if (stored) {
      const parsed = JSON.parse(stored);
      AppState.userProfile = { ...AppState.userProfile, ...parsed };
      AppState.conversationHistory = parsed.conversationHistory || [];
      AppState.moodHistory = parsed.moodHistory || [];
    }
  } catch (e) {
    console.warn("Serenity: Could not load user profile.", e);
  }
}
