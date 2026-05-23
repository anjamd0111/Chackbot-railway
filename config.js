// ============================================
//   WhatsApp AI Bot - Configuration File
//   Railway Deploy: env variables ব্যবহার করো
// ============================================

module.exports = {
  // ── Owner Settings ──────────────────────────
  OWNER_NUMBER: process.env.OWNER_NUMBER || "8801XXXXXXXXX",
  OWNER_NAME: process.env.OWNER_NAME || "Boss",

  // ── Bot Identity ────────────────────────────
  BOT_NAME: process.env.BOT_NAME || "𝗔𝗜 𝗕𝗼𝘁",
  BOT_VERSION: "1.0.0",
  PREFIX: process.env.PREFIX || "!",

  // ── AI API Settings ─────────────────────────
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || "",

  // "openai" | "gemini" | "mistral" | "free"
  AI_PROVIDER: process.env.AI_PROVIDER || "gemini",

  // ── TTS Settings ────────────────────────────
  TTS_LANGUAGE: process.env.TTS_LANGUAGE || "bn",
  TTS_SLOW: false,

  // ── Music Settings ──────────────────────────
  YOUTUBE_RESULTS_LIMIT: 5,
  AUDIO_QUALITY: "highestaudio",
  MAX_SONG_DURATION: 600,

  // ── Session ─────────────────────────────────
  SESSION_DIR: "./session",
  TEMP_DIR: "./temp",

  // ── Features Toggle ─────────────────────────
  AUTO_VOICE_REPLY: process.env.AUTO_VOICE_REPLY !== "false",
  AUTO_TYPING: true,
  AUTO_READ: true,
  GROUP_REPLY: process.env.GROUP_REPLY !== "false",
  PRIVATE_REPLY: true,

  // ── Anti-Crash ──────────────────────────────
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT: 10,

  // ── System Prompt for AI ────────────────────
  AI_SYSTEM_PROMPT: process.env.AI_SYSTEM_PROMPT ||
    `তুমি একটি বাংলা WhatsApp AI Bot। নাম: AI Bot।
তুমি বাংলায় কথা বলো। ছোট, মজাদার এবং সহায়ক উত্তর দাও।
তুমি একজন বন্ধুর মতো কথা বলো। Emoji ব্যবহার করো।`,
};
