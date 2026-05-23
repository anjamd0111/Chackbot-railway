// ============================================
//   Music Downloader - YouTube Search & Download
// ============================================

const ytSearch = require("yt-search");
const ytdl = require("ytdl-core");
const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");
const { exec } = require("child_process");
const config = require("../config");

fs.ensureDirSync(config.TEMP_DIR);

// ── Format duration (seconds → mm:ss) ───────
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Format file size ─────────────────────────
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Search YouTube ───────────────────────────
async function searchYouTube(query) {
  try {
    const results = await ytSearch(query);
    const videos = results.videos
      .filter((v) => v.seconds <= config.MAX_SONG_DURATION)
      .slice(0, config.YOUTUBE_RESULTS_LIMIT);

    if (!videos.length) return null;

    return videos.map((v) => ({
      title: v.title,
      url: v.url,
      duration: v.seconds,
      durationStr: formatDuration(v.seconds),
      views: v.views,
      thumbnail: v.thumbnail,
      author: v.author?.name || "Unknown",
    }));
  } catch (err) {
    console.error("[Music Search Error]", err.message);
    return null;
  }
}

// ── Download audio via ytdl-core ─────────────
async function downloadViaYtdl(url, outputPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly",
    });

    const writeStream = fs.createWriteStream(outputPath);
    stream.pipe(writeStream);

    stream.on("error", reject);
    writeStream.on("finish", () => resolve(outputPath));
    writeStream.on("error", reject);
  });
}

// ── Convert to MP3 using ffmpeg ──────────────
async function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}" 2>/dev/null`;
    exec(cmd, (err) => {
      if (err) reject(new Error("ffmpeg error: " + err.message));
      else resolve(outputPath);
    });
  });
}

// ── Main Download Function ───────────────────
async function downloadSong(query) {
  try {
    // Search for the song
    const results = await searchYouTube(query);
    if (!results || !results.length) {
      return { error: `❌ "${query}" নামে কোনো গান পাওয়া যায়নি!` };
    }

    const video = results[0];
    console.log(`[Music] Downloading: ${video.title}`);

    const id = Date.now();
    const rawPath = path.join(config.TEMP_DIR, `music_raw_${id}.webm`);
    const mp3Path = path.join(config.TEMP_DIR, `music_${id}.mp3`);

    // Download audio
    await downloadViaYtdl(video.url, rawPath);

    // Convert to MP3
    await convertToMp3(rawPath, mp3Path);
    await fs.remove(rawPath);

    // Get file size
    const stat = await fs.stat(mp3Path);

    return {
      success: true,
      path: mp3Path,
      title: video.title,
      duration: video.durationStr,
      author: video.author,
      url: video.url,
      size: formatSize(stat.size),
      cleanup: mp3Path,
    };
  } catch (err) {
    console.error("[Music Download Error]", err.message);
    return {
      error: `❌ ডাউনলোড করতে সমস্যা হয়েছে!\n\nError: ${err.message.slice(0, 100)}`,
    };
  }
}

// ── Get song info only (no download) ────────
async function getSongInfo(query) {
  const results = await searchYouTube(query);
  if (!results) return null;
  return results[0];
}

module.exports = { downloadSong, searchYouTube, getSongInfo };
