/**
 * chat.js
 * Chat interface logic: rendering messages, input handling,
 * typing indicators, mood selector, and AI integration stubs.
 */

async function sendMessageToAI(userMessage, conversationHistory = []) {
  try {
    const API_BASE =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://serenity-backend-dosd.onrender.com";

    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: userMessage,
        history: conversationHistory,
        mood: AppState.currentMood
      })
    });

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("AI request failed:", error);
    return null;
  }
}

async function detectEmotion(text) {
  return null;
}

async function saveToLongTermMemory(entry) {
  // Future hook
}

const SIMULATED_RESPONSES = [
  "I hear you. That sounds really challenging. Would you like to tell me more about what's been on your mind?",
  "Thank you for sharing that with me. It takes courage to open up. How long have you been feeling this way?",
  "I'm here with you, and I'm listening. What you're feeling is completely valid.",
  "That makes a lot of sense given what you're going through. What would feel most helpful right now — to talk it through, or just to be heard?",
  "I want you to know that whatever you're carrying, you don't have to carry it alone. I'm right here.",
  "It sounds like you've been holding a lot. Let's take a breath together and just sit with this for a moment.",
  "Your feelings matter. There's no rush here — take all the time you need.",
  "I notice you mentioned that. Can you tell me a little more about what that felt like for you?"
];

function getSimulatedResponse() {
  return SIMULATED_RESPONSES[Math.floor(Math.random() * SIMULATED_RESPONSES.length)];
}

let chatInitialized = false;
let moodSelectorInitialized = false;
let isSendingMessage = false;

function formatAssistantContent(text) {
  if (!text) return "";

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/(?:^|\n)- (.*?)(?=\n|$)/g, "<li>$1</li>")
    .replace(/(<li>.*?<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function renderMessage(role, content, timestamp = null) {
  const list = document.getElementById("message-list");
  if (!list) return;

  const time = timestamp ? new Date(timestamp) : new Date();
  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (role === "assistant") {
    bubble.innerHTML = formatAssistantContent(content);
  } else {
    bubble.textContent = content;
  }

  const ts = document.createElement("span");
  ts.className = "message-time";
  ts.textContent = timeStr;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "✦";
    wrapper.appendChild(avatar);
  }

  wrapper.appendChild(bubble);
  wrapper.appendChild(ts);
  list.appendChild(wrapper);

  if (list.children.length > 120) {
    list.removeChild(list.firstChild);
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      wrapper.classList.add("visible");
    }, 60);
  });

  scrollToBottom();
}

function showTypingIndicator() {
  const list = document.getElementById("message-list");
  if (!list || document.getElementById("typing-indicator")) return;

  const indicator = document.createElement("div");
  indicator.className = "message-wrapper assistant";
  indicator.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "✦";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble typing-bubble";
  bubble.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;

  indicator.appendChild(avatar);
  indicator.appendChild(bubble);
  list.appendChild(indicator);

  requestAnimationFrame(() => indicator.classList.add("visible"));
  scrollToBottom();
  AppState.isTyping = true;
}

function hideTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
  AppState.isTyping = false;
}
// 
function showSlowResponseNotice() {
  const list = document.getElementById("message-list");
  if (!list || document.getElementById("slow-response-notice")) return;

  const notice = document.createElement("div");
  notice.className = "message-wrapper assistant";
  notice.id = "slow-response-notice";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "✦";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = "Still with you... just taking a moment to respond.";

  notice.appendChild(avatar);
  notice.appendChild(bubble);
  list.appendChild(notice);

  requestAnimationFrame(() => notice.classList.add("visible"));
  scrollToBottom();
}

function hideSlowResponseNotice() {
  const notice = document.getElementById("slow-response-notice");
  if (notice) notice.remove();
}
// 
function scrollToBottom(behavior = "smooth") {
  const list = document.getElementById("message-list");
  if (!list) return;

  list.scrollTo({
    top: list.scrollHeight,
    behavior
  });
}

function formatAndRenderAssistantMessage(text) {
  if (!text) return;

  const cleaned = text
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  renderMessage("assistant", cleaned);
}

async function handleSend() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  
  const text = input.value.trim();


  if (!text || AppState.isTyping || isSendingMessage) return;

  isSendingMessage = true;
  input.value = "";
  input.style.height = "auto";
  toggleSendBtn(false);
  input.disabled=true;

  renderMessage("user", text);

  const userEntry = storeConversationMemory("user", text);
  saveAppState();
  renderSessionList();

  const emotion = await detectEmotion(text);
  if (emotion) updateContext({ emotion });
  
  showTypingIndicator();

  setTimeout(() => {
    if (AppState.isTyping) {
      showSlowResponseNotice();
    }
  }, 6000);

setTimeout(async () => {
  try {
    const contextWindow = getRecentConversationWindow(6);

    let reply = await sendMessageToAI(text, contextWindow);

    if (typeof reply !== "string" || !reply.trim()) {
      reply = "Hmm… something didn’t come through properly. Can you try saying that again?";
    }

        //     let reply = await sendMessageToAI(text, contextWindow);

        // If still no reply → fallback
        // if (!reply || typeof reply !== "string" || !reply.trim()) {
        //   reply = "Something felt a little unclear on my side, but I’m still with you. Could you say that again in your own words?";
        // }

    reply = reply.trim();

    const wordCount = reply.split(/\s+/).length;

    let extraDelay = 0;
    if (wordCount <= 12) {
      extraDelay = 300;
    } else if (wordCount <= 35) {
      extraDelay = 800;
    } else {
      extraDelay = 1400;
    }

    const currentSessionId = AppState.activeSessionId;

    setTimeout(async () => {
      if (currentSessionId !== AppState.activeSessionId) return;

      hideTypingIndicator();
      hideSlowResponseNotice();
      isSendingMessage = false;
      input.disabled=false;

      formatAndRenderAssistantMessage(reply);

      storeConversationMemory("assistant", reply);
      saveAppState();
      renderSessionList();

      await saveToLongTermMemory(userEntry);
    }, extraDelay);

  } catch (error) {
    hideTypingIndicator();
    hideSlowResponseNotice();
    isSendingMessage = false;
    input.disabled=false;
    console.error("handleSend error:", error);
    renderMessage("assistant", "I’m having a little trouble responding right now. If this is the first message, the server may just be waking up — please try again in a few seconds.");
  }
}, 300);
}

function initTextareaAutoResize() {
  const input = document.getElementById("chat-input");
  if (!input) return;

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
    toggleSendBtn(input.value.trim().length > 0);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}

function toggleSendBtn(enabled) {
  const btn = document.getElementById("send-btn");
  if (btn) btn.classList.toggle("active", enabled);
}

function restoreSelectedMoodPill() {
  if (!AppState.currentMood) return;

  const selectedPill = document.querySelector(
    `.mood-pill[data-mood-id="${AppState.currentMood}"]`
  );

  if (selectedPill) {
    selectedPill.classList.add("selected");
  }
}

function initMoodSelector() {
  if (moodSelectorInitialized) return;
  moodSelectorInitialized = true;

  const container = document.getElementById("mood-selector");
  if (!container) return;

  AppConfig.moods.forEach((mood) => {
    const pill = document.createElement("button");
    pill.className = "mood-pill";
    pill.dataset.moodId = mood.id;
    pill.innerHTML = `<span class="mood-emoji">${mood.emoji}</span><span>${mood.label}</span>`;
    pill.style.setProperty("--mood-color", mood.color);

    pill.addEventListener("click", () => {
      if (AppState.isTyping || isSendingMessage) return;
      container.querySelectorAll(".mood-pill").forEach((p) => p.classList.remove("selected"));
      pill.classList.add("selected");

      AppState.currentMood = mood.id;

      // 👉 store mood in active session
      const activeSession = AppState.sessions.find(
        (session) => session.id === AppState.activeSessionId
      );

      if (activeSession) {
        activeSession.currentMood = mood.id;
      }

      storeMoodEntry(mood.id);
      updateContext({ emotion: mood.id });
      saveAppState();
      renderMoodTracker();

      const contextMsg = `I'm feeling ${mood.label.toLowerCase()} right now.`;

      const lastUserMsg = AppState.conversationHistory
        .filter((m) => m.role === "user")
        .slice(-1)[0];

      const shouldInjectMoodMessage =
        !lastUserMsg || lastUserMsg.content !== contextMsg;

      if (!shouldInjectMoodMessage) {
        isMoodResponding = false;
        return;
      }

      renderMessage("user", contextMsg);
      storeConversationMemory("user", contextMsg);
      saveAppState();
      renderSessionList();

      const hasMeaningfulContext =
        AppState.conversationHistory.filter(
          (entry) =>
            entry &&
            entry.role === "user" &&
            entry.content &&
            entry.content.trim().length > 0
        ).length > 1;

      const delay = AppConfig.typingDelay.min;
      showTypingIndicator();

      setTimeout(async () => {
        let response = "";

        try {
          if (hasMeaningfulContext) {
            const contextWindow = getRecentConversationWindow(6);
            const moodPrompt = `The user just selected the mood "${mood.label}". Respond warmly and naturally in the context of the ongoing conversation. Acknowledge the mood without sounding robotic.`;
            response = await sendMessageToAI(moodPrompt, contextWindow);
          } else {
            response = getMoodResponse(mood.id);
          }

          if (typeof response !== "string" || !response.trim()) {
            response = getMoodResponse(mood.id);
          }

          response = response.trim();

          hideTypingIndicator();
          renderMessage("assistant", response);
          storeConversationMemory("assistant", response);
          saveAppState();
          renderSessionList();
        } catch (error) {
          hideTypingIndicator();
          console.error("Mood AI response failed:", error);

          response = getMoodResponse(mood.id);
          renderMessage("assistant", response);
          storeConversationMemory("assistant", response);
          saveAppState();
          renderSessionList();
        }
      }, delay);
    });

    container.appendChild(pill);
  });

  restoreSelectedMoodPill();
}

function clearMoodSelectionUI() {
  const pills = document.querySelectorAll(".mood-pill");
  pills.forEach((pill) => pill.classList.remove("selected"));
}

function getMoodResponse(moodId) {
  const responses = {
    happy: "That’s lovely to hear. A happy moment deserves to be noticed. What’s been making today feel lighter or better for you?",
    calm: "That's wonderful to hear. A calm mind is such a gift. Is there anything you'd like to explore or share while you're in this peaceful space?",
    anxious: "I'm glad you told me. Anxiety can feel so overwhelming. You're safe here — take a breath, and let's take it one moment at a time. What's been weighing on you?",
    sad: "I'm so sorry you're feeling sad. It's okay to feel this way — sadness is a valid and important emotion. I'm here to listen whenever you're ready.",
    angry: "Anger is a powerful signal that something matters to you. You're in a safe space here. Would you like to talk about what sparked these feelings?",
    stressed: "Stress can be really exhausting, especially when it feels relentless. Let's slow down for a moment. What's been piling up for you lately?"
  };

  return responses[moodId] || "Thank you for sharing how you feel. I'm here with you.";
}

function renderSavedConversation() {
  const list = document.getElementById("message-list");
  if (!list) return;

  list.innerHTML = "";

  const history = AppState.conversationHistory || [];
  history.forEach((entry) => {
    renderMessage(
      entry.role,
      entry.content,
      entry.timestamp ? new Date(entry.timestamp) : null
    );
  });
  scrollToBottom("smooth");
}

function initResetButton() {
  const resetBtn = document.getElementById("clear-chat-btn");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {
    clearSessionMemory();
    AppState.currentMood = null;
    clearMoodSelectionUI();

    const messageList = document.getElementById("message-list");
    if (messageList) messageList.innerHTML = "";

    navigateTo("chat");
    renderSavedConversation();
    renderSessionList();

    if (!AppState.conversationHistory || AppState.conversationHistory.length === 0) {
      renderMessage("assistant", AppConfig.welcomeMessage);
      storeConversationMemory("assistant", AppConfig.welcomeMessage);
      saveAppState();
      renderSessionList();
    }
  });
}

function renderSessionList() {
  const container = document.getElementById("session-list");
  if (!container) return;

  container.innerHTML = "";

  (AppState.sessions || [])
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .filter((session) => {
      if (!session || !Array.isArray(session.messages)) return false;

      const hasUserMessage = session.messages.some(
        (msg) => msg.role === "user" && msg.content && msg.content.trim().length > 0
      );

      return hasUserMessage;
    })

    .forEach((session) => {
      const item = document.createElement("button");
      item.className = "session-item";
      item.textContent = session.title || "New Chat";
      item.title = session.title || "New Chat";

      if (session.id === AppState.activeSessionId) {
        item.classList.add("active");
      }

      item.addEventListener("click", () => {
        const messageList = document.getElementById("message-list");
        const newChatBtn = document.getElementById("new-chat-btn");
        if (newChatBtn) newChatBtn.classList.remove("active");

        if (messageList) {
          messageList.classList.add("switching");
        }

        setTimeout(() => {
          AppState.activeSessionId = session.id;
          AppState.conversationHistory = session.messages || [];

          // 👉 restore mood for this session
          AppState.currentMood = session.currentMood || null;

          clearMoodSelectionUI();
          restoreSelectedMoodPill();

          saveAppState();

          navigateTo("chat");
          renderSavedConversation();
          renderSessionList();

          if (messageList) {
            messageList.classList.remove("switching");
          }
        }, 120);
      });

      container.appendChild(item);
    });
}

function showAttachNote() {
  let note = document.getElementById("attach-note");

  if (!note) {
    note = document.createElement("div");
    note.id = "attach-note";
    note.className = "attach-note";
    note.textContent = "Attachments coming soon";
    document.body.appendChild(note);
  }

  note.classList.add("show");

  setTimeout(() => {
    note.classList.remove("show");
  }, 1800);
}

function initChat() {
  if (chatInitialized) return;
  chatInitialized = true;

  const sendBtn = document.getElementById("send-btn");
  if (sendBtn) sendBtn.addEventListener("click", handleSend);
  const attachBtn = document.getElementById("attach-btn");

  if (attachBtn) {
    attachBtn.addEventListener("click", () => {
      showAttachNote();
    });
  }

  initTextareaAutoResize();
  initMoodSelector();
  initResetButton();
  initMoodFilters();
  restoreSelectedMoodPill();

  const newChatBtn = document.getElementById("new-chat-btn");
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      startNewChatSession();

      AppState.currentMood = null;
      clearMoodSelectionUI();

      const messageList = document.getElementById("message-list");
      if (messageList) messageList.innerHTML = "";

      navigateTo("chat");

      document.querySelectorAll(".nav-item, #new-chat-btn").forEach((el) => {
        el.classList.remove("active");
      });

      newChatBtn.classList.add("active");

      renderMessage("assistant", AppConfig.getWelcomeMessage());
      storeConversationMemory("assistant", AppConfig.getWelcomeMessage());
      saveAppState();

      renderSessionList();
    });
  }

  renderSessionList();

  if (AppState.conversationHistory && AppState.conversationHistory.length > 0) {
    renderSavedConversation();
    return;
  }

  renderMessage("assistant", AppConfig.getWelcomeMessage());
  storeConversationMemory("assistant", AppConfig.getWelcomeMessage());
  saveAppState();
}

function formatMoodTimestamp(timestamp) {
  const date = new Date(timestamp);

  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const formattedTime = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  return `${formattedDate}, ${formattedTime}`;
}

function getFilteredMoods(moods, filter) {
  const now = new Date();

  return moods.filter((entry) => {
    const entryDate = new Date(entry.timestamp);

    if (filter === "all") return true;

    if (filter === "day") {
      return (
        entryDate.getDate() === now.getDate() &&
        entryDate.getMonth() === now.getMonth() &&
        entryDate.getFullYear() === now.getFullYear()
      );
    }

    if (filter === "week") {
      const diffMs = now - entryDate;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }

    if (filter === "month") {
      return (
        entryDate.getMonth() === now.getMonth() &&
        entryDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  });
}

function renderMoodTracker() {
  const summaryCard = document.getElementById("mood-summary-card");
  const historyList = document.getElementById("mood-history-list");
  const insightCard = document.getElementById("mood-insight-card");
  const filterButtons = document.querySelectorAll(".mood-filter");

  filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === AppState.moodFilter);
  });

  if (!summaryCard || !historyList || !insightCard) return;

  const moods = AppState.moodHistory || [];
  const filteredMoods = getFilteredMoods(moods, AppState.moodFilter);

  if (filteredMoods.length === 0) {
    summaryCard.innerHTML = `
      <div class="mood-summary-empty">
        <div class="mood-summary-title">No moods in this range</div>
        <div class="mood-summary-text">Try another filter or select a mood from chat to add a new entry.</div>
      </div>
    `;
    insightCard.innerHTML = "";
    historyList.innerHTML = "";
    return;
  }

  const latestMood = filteredMoods[filteredMoods.length - 1];

  const latestMoodConfig = AppConfig.moods.find(
    (mood) => mood.id === latestMood.moodId
  );

  const latestMoodColor = latestMood.color || latestMoodConfig?.color || "#e8e0f8";

  summaryCard.innerHTML = `
    <div class="mood-summary-latest" style="
      --mood-tint-1: ${latestMoodColor}66;
      --mood-tint-2: ${latestMoodColor}33;
      --mood-tint-3: ${latestMoodColor}1a;
    ">
      <div class="mood-summary-label">Latest mood</div>
      <div class="mood-summary-main">
        <span class="mood-summary-emoji">${latestMood.emoji}</span>
        <span class="mood-summary-name">${latestMood.label}</span>
      </div>
      <div class="mood-summary-time">${formatMoodTimestamp(latestMood.timestamp)}</div>
    </div>
  `;

  const counts = {};

  filteredMoods.forEach((entry) => {
    counts[entry.label] = (counts[entry.label] || 0) + 1;
  });

  let mostFrequentMood = null;
  let maxCount = 0;

  for (const mood in counts) {
    if (counts[mood] > maxCount) {
      maxCount = counts[mood];
      mostFrequentMood = mood;
    }
  }

  // insightCard.innerHTML = `
  //   <div>
  //     You’ve been feeling <strong>${mostFrequentMood}</strong> most often lately.
  //   </div>
  // `;

  let insightText = "";

  if (filteredMoods.length === 1) {
    insightText = `You’ve logged a ${mostFrequentMood} moment. It’s a good starting point to notice how you're feeling.`;
  } else if (maxCount === filteredMoods.length) {
    insightText = `Every recent entry points to <strong>${mostFrequentMood}</strong>. That consistency might be worth paying attention to.`;
  } else {
    insightText = `<strong>${mostFrequentMood}</strong> has been showing up more often than other moods lately.`;
  }

  // ─── Pattern insight ───
  let patternText = "";

  if (filteredMoods.length >= 4) {
    const mid = Math.floor(filteredMoods.length / 2);

    const firstHalf = filteredMoods.slice(0, mid);
    const secondHalf = filteredMoods.slice(mid);

    const countMood = (arr) => {
      const counts = {};
      arr.forEach((e) => {
        counts[e.label] = (counts[e.label] || 0) + 1;
      });

      let top = null;
      let max = 0;
      for (const m in counts) {
        if (counts[m] > max) {
          max = counts[m];
          top = m;
        }
      }
      return top;
    };

    const firstTop = countMood(firstHalf);
    const secondTop = countMood(secondHalf);

    if (firstTop && secondTop && firstTop !== secondTop) {
      patternText = `There seems to be a gentle shift from <strong>${firstTop}</strong> toward <strong>${secondTop}</strong> in your recent moods.`;
    } else if (firstTop === secondTop) {
      patternText = `Your mood has been fairly consistent around <strong>${secondTop}</strong>.`;
    }
  }

  insightCard.innerHTML = `
    <div>${insightText}</div>
    ${patternText ? `<div style="margin-top:6px; color: var(--text-secondary);">${patternText}</div>` : ""}
  `;

  const latestFirst = [...filteredMoods].reverse();
  const visibleMoods = AppState.moodHistoryExpanded?latestFirst:latestFirst.slice(0, 8);

  historyList.innerHTML =
  visibleMoods.map((entry) => `
    <div class="mood-history-item glass-card">
      <div class="mood-history-left">
        <div class="mood-history-emoji">${entry.emoji}</div>
        <div>
          <div class="mood-history-label">${entry.label}</div>
          <div class="mood-history-time">${formatMoodTimestamp(entry.timestamp)}</div>
        </div>
      </div>
      ${entry.note ? `<div class="mood-history-note">${entry.note}</div>` : ""}
    </div>
  `).join("") +
  (
    latestFirst.length > 8
      ? `<button id="mood-history-toggle" class="mood-history-toggle">
          ${AppState.moodHistoryExpanded ? "Show less" : "Show more"}
        </button>`
      : ""
  );

  const toggleBtn = document.getElementById("mood-history-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      AppState.moodHistoryExpanded = !AppState.moodHistoryExpanded;
      saveAppState();
      renderMoodTracker();
    });
  }
}

function initMoodFilters() {
  const filterButtons = document.querySelectorAll(".mood-filter");
  if (!filterButtons.length) return;

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedFilter = button.dataset.filter;
      if (!selectedFilter) return;

      AppState.moodFilter = selectedFilter;
      AppState.moodHistoryExpanded = false;
      saveAppState();

      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      renderMoodTracker();
    });
  });
}
