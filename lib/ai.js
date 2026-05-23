// ============================================
//   AI Chat Handler - Multi Provider Support
// ============================================

const axios = require("axios");
const config = require("../config");

// ── Simple in-memory conversation history ───
const chatHistory = new Map();

// ── Clear old history to save RAM ───────────
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of chatHistory.entries()) {
    if (now - val.lastUsed > 30 * 60 * 1000) {  // 30 min
      chatHistory.delete(key);
    }
  }
}, 10 * 60 * 1000);

// ── Get or init conversation ─────────────────
function getHistory(userId) {
  if (!chatHistory.has(userId)) {
    chatHistory.set(userId, {
      messages: [],
      lastUsed: Date.now(),
    });
  }
  const h = chatHistory.get(userId);
  h.lastUsed = Date.now();
  return h;
}

// ── Trim history to last 10 messages ────────
function trimHistory(messages, max = 10) {
  if (messages.length > max) return messages.slice(-max);
  return messages;
}

// ════════════════════════════════════════════
//   GEMINI AI (Google - Free tier available)
//   Get key: https://aistudio.google.com
// ════════════════════════════════════════════
async function askGemini(userId, userMessage) {
  const h = getHistory(userId);
  h.messages.push({ role: "user", parts: [{ text: userMessage }] });
  h.messages = trimHistory(h.messages);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;

  const body = {
    systemInstruction: {
      parts: [{ text: config.AI_SYSTEM_PROMPT }],
    },
    contents: h.messages,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 500,
    },
  };

  const res = await axios.post(url, body, { timeout: 15000 });
  const reply = res.data.candidates[0].content.parts[0].text.trim();

  h.messages.push({ role: "model", parts: [{ text: reply }] });
  return reply;
}

// ════════════════════════════════════════════
//   OPENAI (ChatGPT)
//   Get key: https://platform.openai.com
// ════════════════════════════════════════════
async function askOpenAI(userId, userMessage) {
  const h = getHistory(userId);
  h.messages.push({ role: "user", content: userMessage });
  h.messages = trimHistory(h.messages);

  const msgs = [
    { role: "system", content: config.AI_SYSTEM_PROMPT },
    ...h.messages,
  ];

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: msgs,
      max_tokens: 500,
      temperature: 0.9,
    },
    {
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  const reply = res.data.choices[0].message.content.trim();
  h.messages.push({ role: "assistant", content: reply });
  return reply;
}

// ════════════════════════════════════════════
//   MISTRAL AI (Free tier available)
//   Get key: https://console.mistral.ai
// ════════════════════════════════════════════
async function askMistral(userId, userMessage) {
  const h = getHistory(userId);
  h.messages.push({ role: "user", content: userMessage });
  h.messages = trimHistory(h.messages);

  const msgs = [
    { role: "system", content: config.AI_SYSTEM_PROMPT },
    ...h.messages,
  ];

  const res = await axios.post(
    "https://api.mistral.ai/v1/chat/completions",
    {
      model: "mistral-small-latest",
      messages: msgs,
      max_tokens: 500,
      temperature: 0.9,
    },
    {
      headers: {
        Authorization: `Bearer ${config.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  const reply = res.data.choices[0].message.content.trim();
  h.messages.push({ role: "assistant", content: reply });
  return reply;
}

// ════════════════════════════════════════════
//   FREE AI (No API key needed - backup)
//   Uses free public endpoints
// ════════════════════════════════════════════
async function askFreeAI(userId, userMessage) {
  try {
    // Pollinations AI - completely free
    const prompt = encodeURIComponent(
      `${config.AI_SYSTEM_PROMPT}\n\nUser: ${userMessage}\n\nAssistant:`
    );
    const res = await axios.get(
      `https://text.pollinations.ai/${prompt}`,
      { timeout: 20000, responseType: "text" }
    );
    return res.data.trim();
  } catch {
    return "দুঃখিত, এখন AI সার্ভার ব্যস্ত আছে। একটু পরে চেষ্টা করো! 😅";
  }
}

// ════════════════════════════════════════════
//   MAIN AI FUNCTION - auto selects provider
// ════════════════════════════════════════════
async function getAIReply(userId, userMessage) {
  try {
    switch (config.AI_PROVIDER) {
      case "openai":
        return await askOpenAI(userId, userMessage);
      case "gemini":
        return await askGemini(userId, userMessage);
      case "mistral":
        return await askMistral(userId, userMessage);
      case "free":
      default:
        return await askFreeAI(userId, userMessage);
    }
  } catch (err) {
    console.error("[AI Error]", err.message);
    // Fallback to free if primary fails
    if (config.AI_PROVIDER !== "free") {
      console.log("[AI] Falling back to free AI...");
      return await askFreeAI(userId, userMessage);
    }
    return "দুঃখিত, এখন কথা বলতে পারছি না। একটু পরে চেষ্টা করো! 🙏";
  }
}

// ── Clear a user's chat history ─────────────
function clearHistory(userId) {
  chatHistory.delete(userId);
}

module.exports = { getAIReply, clearHistory };
