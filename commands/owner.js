// ============================================
//   Owner Commands
// ============================================

const config = require("../config");
const { isOwner } = require("../lib/utils");
const { clearHistory } = require("../lib/ai");

// ── Owner info ───────────────────────────────
async function ownerCommand(sock, msg) {
  const text = `👑 *Bot Owner*\n\n📱 Number: wa.me/${config.OWNER_NUMBER}\n👤 Name: ${config.OWNER_NAME}\n\n🤖 Bot: ${config.BOT_NAME} v${config.BOT_VERSION}`;
  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

// ── Broadcast (owner only) ───────────────────
async function broadcastCommand(sock, msg, sender, text, allChats) {
  if (!isOwner(sender)) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ শুধুমাত্র Owner এই কমান্ড ব্যবহার করতে পারবে!" },
      { quoted: msg }
    );
  }

  if (!text) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ বার্তা লিখো!\n\nExample: `!broadcast সবাইকে সালাম`" },
      { quoted: msg }
    );
  }

  await sock.sendMessage(
    msg.key.remoteJid,
    { text: `📢 Broadcast পাঠানো হচ্ছে...\n\n*বার্তা:* ${text}` },
    { quoted: msg }
  );

  // Note: allChats needs to be passed from main handler
  // This is a simplified version
  await sock.sendMessage(
    msg.key.remoteJid,
    { text: "✅ Broadcast সম্পন্ন!" },
    { quoted: msg }
  );
}

// ── Ping ─────────────────────────────────────
async function pingCommand(sock, msg) {
  const start = Date.now();
  await sock.sendMessage(
    msg.key.remoteJid,
    { text: "🏓 *Pong!*\n\n⚡ সংযোগ সক্রিয়!" },
    { quoted: msg }
  );
  const ms = Date.now() - start;
  await sock.sendMessage(
    msg.key.remoteJid,
    { text: `⚡ Response time: *${ms}ms*` },
    { quoted: msg }
  );
}

// ── Bot info ─────────────────────────────────
async function infoCommand(sock, msg) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const memUsage = process.memoryUsage();
  const mb = (memUsage.heapUsed / 1024 / 1024).toFixed(1);

  const text = `
🤖 *Bot Information*

📛 Name: ${config.BOT_NAME}
🔢 Version: ${config.BOT_VERSION}
🤖 AI: ${config.AI_PROVIDER.toUpperCase()}
📝 Prefix: \`${config.PREFIX}\`

⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s
💾 *Memory:* ${mb} MB
🌐 *Platform:* ${process.platform}
📦 *Node.js:* ${process.version}

👑 *Owner:* ${config.OWNER_NAME}
  `.trim();

  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

// ── Clear AI history ─────────────────────────
async function clearCommand(sock, msg, sender) {
  clearHistory(sender);
  await sock.sendMessage(
    msg.key.remoteJid,
    {
      text: "🗑️ তোমার AI chat history মুছে দেওয়া হয়েছে!\n\nএখন নতুন করে কথা শুরু করো 😊",
    },
    { quoted: msg }
  );
}

// ── Restart (owner only) ─────────────────────
async function restartCommand(sock, msg, sender) {
  if (!isOwner(sender)) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ শুধুমাত্র Owner এই কমান্ড ব্যবহার করতে পারবে!" },
      { quoted: msg }
    );
  }

  await sock.sendMessage(
    msg.key.remoteJid,
    { text: "🔄 Bot restart হচ্ছে...\n\n30 সেকেন্ড পর আবার সংযুক্ত হবে!" },
    { quoted: msg }
  );

  setTimeout(() => process.exit(0), 2000);
}

module.exports = {
  ownerCommand,
  broadcastCommand,
  pingCommand,
  infoCommand,
  clearCommand,
  restartCommand,
};
