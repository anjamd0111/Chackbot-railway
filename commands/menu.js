// ============================================
//   Menu Command
// ============================================

const config = require("../config");
const { getTimeString } = require("../lib/utils");

async function menuCommand(sock, msg, sender) {
  const time = getTimeString();

  const menuText = `
╔══════════════════════════╗
║   🤖 *${config.BOT_NAME}* v${config.BOT_VERSION}   ║
╚══════════════════════════╝

⏰ সময়: ${time}
🔧 Prefix: \`${config.PREFIX}\`

━━━━━━━━━━━━━━━━━━━━━━━━━━

🎵 *মিউজিক কমান্ড*
┌──────────────────────
│ ${config.PREFIX}play [গানের নাম]
│ ${config.PREFIX}song [গানের নাম]
│ ${config.PREFIX}search [গানের নাম]
└──────────────────────

🤖 *AI কমান্ড*
┌──────────────────────
│ ${config.PREFIX}ai [প্রশ্ন]
│ ${config.PREFIX}chat [বার্তা]
│ ${config.PREFIX}clear - history মুছো
│ ${config.PREFIX}voice [text] - voice note
└──────────────────────

👑 *Owner কমান্ড*
┌──────────────────────
│ ${config.PREFIX}owner
│ ${config.PREFIX}broadcast [message]
│ ${config.PREFIX}restart
│ ${config.PREFIX}setprefix [prefix]
└──────────────────────

ℹ️ *তথ্য কমান্ড*
┌──────────────────────
│ ${config.PREFIX}menu / ${config.PREFIX}help
│ ${config.PREFIX}ping
│ ${config.PREFIX}info
│ ${config.PREFIX}sticker - (reply to image)
└──────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 *Auto AI Reply চালু আছে!*
সরাসরি মেসেজ করলেই AI উত্তর দেবে 🤖
━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  await sock.sendMessage(
    msg.key.remoteJid,
    { text: menuText },
    { quoted: msg }
  );
}

module.exports = menuCommand;
