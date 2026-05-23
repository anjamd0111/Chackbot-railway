// ============================================
//   Utility Functions
// ============================================

const config = require("../config");

// ── Check if sender is owner ─────────────────
function isOwner(jid) {
  const number = jid.replace(/[^0-9]/g, "").replace("@s.whatsapp.net", "");
  return number === config.OWNER_NUMBER.replace(/[^0-9]/g, "");
}

// ── Get sender JID ───────────────────────────
function getSender(msg) {
  return msg.key.fromMe
    ? msg.key.remoteJid
    : msg.key.participant || msg.key.remoteJid;
}

// ── Get chat JID ─────────────────────────────
function getChatJid(msg) {
  return msg.key.remoteJid;
}

// ── Check if group message ───────────────────
function isGroup(msg) {
  return msg.key.remoteJid.endsWith("@g.us");
}

// ── Extract message text ─────────────────────
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  );
}

// ── Parse prefix command ─────────────────────
function parseCommand(text) {
  const prefix = config.PREFIX;
  if (!text.startsWith(prefix)) return null;

  const withoutPrefix = text.slice(prefix.length).trim();
  const parts = withoutPrefix.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const query = args.join(" ");

  return { cmd, args, query, prefix };
}

// ── Format number nicely ─────────────────────
function formatNumber(num) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

// ── Delay helper ─────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Get current time string ──────────────────
function getTimeString() {
  return new Date().toLocaleString("bn-BD", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

module.exports = {
  isOwner,
  getSender,
  getChatJid,
  isGroup,
  getMessageText,
  parseCommand,
  formatNumber,
  sleep,
  getTimeString,
};
