// ============================================
//   TTS - Text to Voice Note Converter
// ============================================

const gtts = require("gtts");
const path = require("path");
const fs = require("fs-extra");
const { exec } = require("child_process");
const config = require("../config");

// ── Ensure temp dir exists ───────────────────
fs.ensureDirSync(config.TEMP_DIR);

// ── Remove emoji and special chars for TTS ──
function cleanTextForTTS(text) {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[*_~`#]/g, "")
    .trim();
}

// ── Convert text to MP3 using gTTS ──────────
function textToMp3(text, filePath) {
  return new Promise((resolve, reject) => {
    const cleaned = cleanTextForTTS(text);
    if (!cleaned) return reject(new Error("Empty text after cleaning"));

    const tts = new gtts(cleaned, config.TTS_LANGUAGE, config.TTS_SLOW);
    tts.save(filePath, (err) => {
      if (err) reject(err);
      else resolve(filePath);
    });
  });
}

// ── Convert MP3 to OGG Opus (WhatsApp voice note format) ──
function mp3ToOgg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 64k -vbr on -compression_level 10 "${outputPath}" 2>/dev/null`;
    exec(cmd, (err) => {
      if (err) reject(new Error("ffmpeg conversion failed: " + err.message));
      else resolve(outputPath);
    });
  });
}

// ── Check if ffmpeg is available ────────────
function checkFfmpeg() {
  return new Promise((resolve) => {
    exec("ffmpeg -version", (err) => resolve(!err));
  });
}

// ── Main TTS function ────────────────────────
async function generateVoiceNote(text) {
  const id = Date.now();
  const mp3Path = path.join(config.TEMP_DIR, `tts_${id}.mp3`);
  const oggPath = path.join(config.TEMP_DIR, `tts_${id}.ogg`);

  try {
    // Step 1: Text → MP3
    await textToMp3(text, mp3Path);

    // Step 2: MP3 → OGG (if ffmpeg available)
    const hasFfmpeg = await checkFfmpeg();
    if (hasFfmpeg) {
      await mp3ToOgg(mp3Path, oggPath);
      await fs.remove(mp3Path);  // cleanup mp3
      return { path: oggPath, format: "ogg", cleanup: oggPath };
    } else {
      // Send MP3 directly if no ffmpeg (still works as audio)
      console.warn("[TTS] ffmpeg not found, sending MP3 instead of OGG");
      return { path: mp3Path, format: "mp3", cleanup: mp3Path };
    }
  } catch (err) {
    // Cleanup on error
    await fs.remove(mp3Path).catch(() => {});
    await fs.remove(oggPath).catch(() => {});
    throw err;
  }
}

// ── Cleanup temp file after sending ─────────
async function cleanupFile(filePath) {
  try {
    await fs.remove(filePath);
  } catch (_) {}
}

module.exports = { generateVoiceNote, cleanupFile };
