// ============================================
//   Sticker Command: !sticker (reply to image)
// ============================================

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const config = require("../config");

async function stickerCommand(sock, msg) {
  // Check if replying to an image
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imageMsg = quoted?.imageMessage || msg.message?.imageMessage;

  if (!imageMsg) {
    return sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ একটি ছবিতে reply করে `!sticker` লিখো!\n\nঅথবা ছবির সাথে caption এ `!sticker` লিখো।",
      },
      { quoted: msg }
    );
  }

  await sock.sendMessage(
    msg.key.remoteJid,
    { text: "🎨 Sticker তৈরি হচ্ছে..." },
    { quoted: msg }
  );

  try {
    // Download the image
    const stream = await sock.downloadContentFromMessage(imageMsg, "image");
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const imageBuffer = Buffer.concat(chunks);
    const id = Date.now();
    const inputPath = path.join(config.TEMP_DIR, `sticker_in_${id}.jpg`);
    const outputPath = path.join(config.TEMP_DIR, `sticker_out_${id}.webp`);

    await fs.writeFile(inputPath, imageBuffer);

    // Convert to WebP using ffmpeg
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" "${outputPath}" 2>/dev/null`;
      exec(cmd, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const stickerBuffer = await fs.readFile(outputPath);

    await sock.sendMessage(msg.key.remoteJid, {
      sticker: stickerBuffer,
    });

    // Cleanup
    await fs.remove(inputPath);
    await fs.remove(outputPath);
  } catch (err) {
    console.error("[Sticker Error]", err.message);
    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: `❌ Sticker তৈরি করতে সমস্যা হয়েছে!\n\nffmpeg ইনস্টল আছে কি? Error: ${err.message.slice(0, 100)}`,
      },
      { quoted: msg }
    );
  }
}

module.exports = stickerCommand;
