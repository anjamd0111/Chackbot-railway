// ============================================
//   Voice Command: !voice [text]
// ============================================

const { generateVoiceNote, cleanupFile } = require("../lib/tts");
const fs = require("fs-extra");

async function voiceCommand(sock, msg, text) {
  if (!text) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ টেক্সট দাও!\n\nExample: `!voice আমি ভালো আছি`" },
      { quoted: msg }
    );
  }

  await sock.sendMessage(
    msg.key.remoteJid,
    { text: "🎙️ Voice note তৈরি হচ্ছে..." },
    { quoted: msg }
  );

  let voiceData = null;

  try {
    voiceData = await generateVoiceNote(text);
    const audioBuffer = await fs.readFile(voiceData.path);

    await sock.sendMessage(msg.key.remoteJid, {
      audio: audioBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,  // sends as voice note
    });
  } catch (err) {
    console.error("[Voice Command Error]", err.message);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: `❌ Voice note তৈরি করতে সমস্যা হয়েছে!\n\n${err.message}` },
      { quoted: msg }
    );
  } finally {
    if (voiceData) await cleanupFile(voiceData.cleanup);
  }
}

module.exports = voiceCommand;
