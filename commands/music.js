// ============================================
//   Music Commands: !play, !song, !search
// ============================================

const { downloadSong, searchYouTube } = require("../lib/music");
const { cleanupFile } = require("../lib/tts");
const { formatNumber } = require("../lib/utils");
const fs = require("fs-extra");

// тФАтФА !play or !song command тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
async function playCommand(sock, msg, query) {
  if (!query) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "тЭМ ржЧрж╛ржирзЗрж░ ржирж╛ржо ржжрж╛ржУ!\n\nExample: `!play Tumi Amar Mon`" },
      { quoted: msg }
    );
  }

  // Send searching message
  await sock.sendMessage(
    msg.key.remoteJid,
    { text: `ЁЯФН *"${query}"* ржЦрзБржБржЬржЫрж┐...\n\nржПржХржЯрзБ ржЕржкрзЗржХрзНрж╖рж╛ ржХрж░рзЛ тП│` },
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
    const infoText = `ЁЯО╡ *${result.title}*\n\nЁЯСд Artist: ${result.author}\nтП▒я╕П Duration: ${result.duration}\nЁЯУж Size: ${result.size}\n\nтмЗя╕П ржкрж╛ржарж╛ржЪрзНржЫрж┐...`;

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
      { text: `тЭМ ржЧрж╛ржи ржкрж╛ржарж╛рждрзЗ рж╕ржорж╕рзНржпрж╛ рж╣ржпрж╝рзЗржЫрзЗ!\n\nError: ${err.message}` },
      { quoted: msg }
    );
  } finally {
    await cleanupFile(result.cleanup);
  }
}

// тФАтФА !search command - show results list тФАтФАтФАтФАтФАтФА
async function searchCommand(sock, msg, query) {
  if (!query) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "тЭМ ржЧрж╛ржирзЗрж░ ржирж╛ржо ржжрж╛ржУ!\n\nExample: `!search Tumi Amar Mon`" },
      { quoted: msg }
    );
  }

  await sock.sendMessage(
    msg.key.remoteJid,
    { text: `ЁЯФН *"${query}"* ржПрж░ ржлрж▓рж╛ржлрж▓ ржЦрзБржБржЬржЫрж┐...` },
    { quoted: msg }
  );

  const results = await searchYouTube(query);

  if (!results || !results.length) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: `тЭМ *"${query}"* ржПрж░ ржХрзЛржирзЛ ржлрж▓рж╛ржлрж▓ ржкрж╛ржУржпрж╝рж╛ ржпрж╛ржпрж╝ржирж┐!` },
      { quoted: msg }
    );
  }

  let text = `ЁЯО╡ *"${query}"* ржПрж░ ржлрж▓рж╛ржлрж▓:\n\n`;

  results.forEach((v, i) => {
    text += `*${i + 1}.* ${v.title}\n`;
    text += `   тП▒я╕П ${v.durationStr} | ЁЯСА ${formatNumber(v.views)}\n`;
    text += `   ЁЯСд ${v.author}\n\n`;
  });

  text += `\nЁЯТб ржбрж╛ржЙржирж▓рзЛржб ржХрж░рждрзЗ:\n\`!play ${results[0].title}\``;

  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

module.exports = { playCommand, searchCommand };
