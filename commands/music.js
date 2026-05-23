// ============================================
//   Music Commands: !play, !song, !search
// ============================================

const { downloadSong, searchYouTube } = require("../lib/music");
const { cleanupFile } = require("../lib/tts");
const { formatNumber } = require("../lib/utils");
const fs = require("fs-extra");

// ── !play or !song command ───────────────────
async function playCommand(sock, msg, query) {
  if (!query) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ গানের নাম দাও!\n\nExample: `!play Tumi Amar Mon`" },
      { quoted: msg }
    );
  }

  // Send searching message
  await sock.sendMessage(
    msg.key.remoteJid,
    { text: `🔍 *"${query}"* খুঁজছি...\n\nএকটু অপেক্ষা করো ⏳` },
    { quoted: msg }
  );

  // Download song
  const result = await downloadSong(query);

  if (result.error) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: result.error },
      { quoted: msg }
    );
  }

  try {
    // Send info message first
    const infoText = `🎵 *${result.title}*\n\n👤 Artist: ${result.author}\n⏱️ Duration: ${result.duration}\n📦 Size: ${result.size}\n\n⬇️ পাঠাচ্ছি...`;

    await sock.sendMessage(msg.key.remoteJid, { text: infoText }, { quoted: msg });

    // Read file
    const audioBuffer = await fs.readFile(result.path);

    // Send as audio (MP3)
    await sock.sendMessage(msg.key.remoteJid, {
      audio: audioBuffer,
      mimetype: "audio/mpeg",
      pttPlayback: false,           // shows as audio file, not voice note
      fileName: `${result.title}.mp3`,
    });

    console.log(`[Music] Sent: ${result.title}`);
  } catch (err) {
    console.error("[Music Send Error]", err.message);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: `❌ গান পাঠাতে সমস্যা হয়েছে!\n\nError: ${err.message}` },
      { quoted: msg }
    );
  } finally {
    await cleanupFile(result.cleanup);
  }
}

// ── !search command - show results list ──────
async function searchCommand(sock, msg, query) {
  if (!query) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ গানের নাম দাও!\n\nExample: `!search Tumi Amar Mon`" },
      { quoted: msg }
    );
  }

  await sock.sendMessage(
    msg.key.remoteJid,
    { text: `🔍 *"${query}"* এর ফলাফল খুঁজছি...` },
    { quoted: msg }
  );

  const results = await searchYouTube(query);

  if (!results || !results.length) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: `❌ *"${query}"* এর কোনো ফলাফল পাওয়া যায়নি!` },
      { quoted: msg }
    );
  }

  let text = `🎵 *"${query}"* এর ফলাফল:\n\n`;

  results.forEach((v, i) => {
    text += `*${i + 1}.* ${v.title}\n`;
    text += `   ⏱️ ${v.durationStr} | 👀 ${formatNumber(v.views)}\n`;
    text += `   👤 ${v.author}\n\n`;
  });

  text += `\n💡 ডাউনলোড করতে:\n\`!play ${results[0].title}\``;

  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

module.exports = { playCommand, searchCommand };
