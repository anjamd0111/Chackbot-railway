// ============================================================
//   WhatsApp AI Voice Reply + Music Bot
//   Built with Baileys | Node.js | Railway Deploy Ready
// ============================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs-extra");
const path = require("path");
const NodeCache = require("node-cache");
const http = require("http");

const config = require("./config");
const { getAIReply } = require("./lib/ai");
const { generateVoiceNote, cleanupFile } = require("./lib/tts");
const { isOwner, getSender, isGroup, getMessageText, parseCommand, sleep } = require("./lib/utils");

const menuCommand = require("./commands/menu");
const { playCommand, searchCommand } = require("./commands/music");
const voiceCommand = require("./commands/voice");
const stickerCommand = require("./commands/sticker");
const { ownerCommand, pingCommand, infoCommand, clearCommand, restartCommand } = require("./commands/owner");

fs.ensureDirSync(config.SESSION_DIR);
fs.ensureDirSync(config.TEMP_DIR);

const msgRetryCounterCache = new NodeCache();
const store = makeInMemoryStore({ logger: pino({ level: "silent" }) });

let reconnectCount = 0;
let currentQR = null;
let botStatus = "starting";
let botNumber = null;
let botName = null;

// ════════════════════════════════════════════
//   WEB SERVER (Pairing Website)
// ════════════════════════════════════════════
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.url === "/api/status") {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({
      status: botStatus,
      qr: currentQR,
      botNumber,
      botName,
      botVersion: config.BOT_VERSION,
      aiProvider: config.AI_PROVIDER,
      prefix: config.PREFIX,
      features: {
        autoVoice: config.AUTO_VOICE_REPLY,
        groupReply: config.GROUP_REPLY,
        privateReply: config.PRIVATE_REPLY,
      }
    }));
    return;
  }

  if (req.url === "/health") {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, uptime: Math.floor(process.uptime()) }));
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.writeHead(200);
  res.end(getPairingHTML());
});

server.listen(PORT, () => {
  console.log(`🌐 Pairing website: http://localhost:${PORT}`);
});

// ════════════════════════════════════════════
//   CONNECT FUNCTION
// ════════════════════════════════════════════
async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n🤖 ${config.BOT_NAME} v${config.BOT_VERSION} শুরু হচ্ছে...`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }
      return { conversation: "retry" };
    },
  });

  store?.bind(sock.ev);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      botStatus = "qr";
      console.log(`\n📱 QR ready! Open: http://localhost:${PORT}`);
    }

    if (connection === "close") {
      currentQR = null;
      botStatus = "disconnected";
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect && reconnectCount < config.MAX_RECONNECT) {
        reconnectCount++;
        console.log(`🔄 Reconnecting... (${reconnectCount}/${config.MAX_RECONNECT})`);
        setTimeout(connectBot, config.RECONNECT_DELAY);
      } else if (!shouldReconnect) {
        console.log("🚪 Logged out!");
        fs.removeSync(config.SESSION_DIR);
        botStatus = "logged_out";
      } else {
        console.log("❌ Max reconnect reached.");
        process.exit(1);
      }
    }

    if (connection === "open") {
      currentQR = null;
      botStatus = "connected";
      reconnectCount = 0;
      const user = sock.user;
      botNumber = user?.id;
      botName = user?.name;
      console.log(`\n✅ Connected! Number: ${user?.id} | Name: ${user?.name}`);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try { await handleMessage(sock, msg); }
      catch (err) { console.error("[Handler Error]", err.message); }
    }
  });

  return sock;
}

async function handleMessage(sock, msg) {
  if (msg.key.remoteJid === "status@broadcast") return;
  if (msg.key.fromMe) return;
  if (!msg.message) return;

  const text = getMessageText(msg);
  if (!text) return;

  const sender = getSender(msg);
  const chatJid = msg.key.remoteJid;
  const inGroup = isGroup(msg);

  if (inGroup && !config.GROUP_REPLY) return;
  if (!inGroup && !config.PRIVATE_REPLY) return;

  if (config.AUTO_READ) await sock.readMessages([msg.key]);

  const parsed = parseCommand(text);

  if (parsed) {
    const { cmd, query } = parsed;
    if (config.AUTO_TYPING) { await sock.sendPresenceUpdate("composing", chatJid); await sleep(800); }

    switch (cmd) {
      case "menu": case "help": case "start": await menuCommand(sock, msg, sender); break;
      case "play": case "song": await playCommand(sock, msg, query); break;
      case "search": await searchCommand(sock, msg, query); break;
      case "voice": case "tts": await voiceCommand(sock, msg, query); break;
      case "ai": case "chat": case "ask": await handleAIReply(sock, msg, sender, chatJid, query || text); break;
      case "sticker": case "s": await stickerCommand(sock, msg); break;
      case "owner": await ownerCommand(sock, msg); break;
      case "ping": await pingCommand(sock, msg); break;
      case "info": case "botinfo": await infoCommand(sock, msg); break;
      case "clear": case "reset": await clearCommand(sock, msg, sender); break;
      case "restart": await restartCommand(sock, msg, sender); break;
      default:
        await sock.sendMessage(chatJid, { text: `❓ Unknown: \`${config.PREFIX}${cmd}\`\nSee: \`${config.PREFIX}menu\`` }, { quoted: msg });
    }

    await sock.sendPresenceUpdate("paused", chatJid);
    return;
  }

  const shouldAutoReply = !inGroup || text.includes(sock.user?.id?.split(":")[0]);
  if (shouldAutoReply && text.length > 1) await handleAIReply(sock, msg, sender, chatJid, text);
}

async function handleAIReply(sock, msg, sender, chatJid, userText) {
  if (config.AUTO_TYPING) await sock.sendPresenceUpdate("composing", chatJid);

  try {
    const aiReply = await getAIReply(sender, userText);
    await sock.sendMessage(chatJid, { text: aiReply }, { quoted: msg });

    if (config.AUTO_VOICE_REPLY && aiReply.length > 5) {
      await sock.sendPresenceUpdate("recording", chatJid);
      let voiceData = null;
      try {
        voiceData = await generateVoiceNote(aiReply);
        const audioBuffer = fs.readFileSync(voiceData.path);
        await sock.sendMessage(chatJid, { audio: audioBuffer, mimetype: "audio/ogg; codecs=opus", ptt: true });
      } catch (e) { console.warn("[Voice Error]", e.message); }
      finally { if (voiceData) await cleanupFile(voiceData.cleanup); }
    }
  } catch (err) {
    console.error("[AI Error]", err.message);
    await sock.sendMessage(chatJid, { text: "😔 দুঃখিত, এখন উত্তর দিতে পারছি না!" }, { quoted: msg });
  } finally {
    await sock.sendPresenceUpdate("paused", chatJid);
  }
}

// ════════════════════════════════════════════
//   PAIRING WEBSITE HTML
// ════════════════════════════════════════════
function getPairingHTML() {
  const BOT = config.BOT_NAME;
  const VER = config.BOT_VERSION;
  const PRE = config.PREFIX;
  const AIP = config.AI_PROVIDER.toUpperCase();
  const AV  = config.AUTO_VOICE_REPLY;
  const GR  = config.GROUP_REPLY;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BOT} — Pairing</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
:root{--bg:#060d1a;--sf:#0d1525;--sf2:#131f32;--bd:#1a2a3e;--ac:#00e5ff;--ac2:#8b5cf6;--gr:#10b981;--rd:#f43f5e;--yl:#fbbf24;--tx:#cdd6f4;--mt:#4a5568}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);font-family:'Sora',sans-serif;color:var(--tx);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 70% 50% at 15% 0%,rgba(0,229,255,.07) 0%,transparent 55%),radial-gradient(ellipse 60% 45% at 85% 100%,rgba(139,92,246,.09) 0%,transparent 55%);pointer-events:none;z-index:0}
.grid{position:fixed;inset:0;background-image:linear-gradient(rgba(0,229,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.025) 1px,transparent 1px);background-size:44px 44px;pointer-events:none;z-index:0}
.wrap{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding:0 20px}

nav{padding:18px 0;border-bottom:1px solid var(--bd);position:relative;z-index:10}
.nav-in{display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:11px}
.logo-ic{width:36px;height:36px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 0 20px rgba(0,229,255,.25)}
.logo-tx{font-size:17px;font-weight:700;background:linear-gradient(135deg,var(--ac),#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.badge{font-family:'JetBrains Mono',monospace;font-size:11px;padding:4px 10px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);border-radius:20px;color:var(--gr);display:flex;align-items:center;gap:6px}
.dot{width:7px;height:7px;background:var(--gr);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}

.hero{text-align:center;padding:60px 0 44px}
.tag{display:inline-flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ac);background:rgba(0,229,255,.07);border:1px solid rgba(0,229,255,.18);padding:5px 13px;border-radius:20px;margin-bottom:22px;letter-spacing:.5px}
h1{font-size:clamp(32px,5.5vw,54px);font-weight:800;line-height:1.1;margin-bottom:16px;letter-spacing:-1.5px}
.grad{background:linear-gradient(135deg,var(--ac) 0%,#a78bfa 50%,var(--ac) 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shim 3s linear infinite}
@keyframes shim{to{background-position:200% center}}
.sub{font-size:16px;color:var(--mt);max-width:500px;margin:0 auto 36px;line-height:1.75;font-weight:300}

.chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.chip{display:flex;align-items:center;gap:10px;padding:13px 15px;background:var(--sf);border:1px solid var(--bd);border-radius:14px;font-size:13px;transition:all .25s;cursor:default}
.chip:hover{border-color:rgba(0,229,255,.2);background:var(--sf2);transform:translateY(-2px)}
.chip-ico{font-size:19px}
.chip-lbl{color:var(--mt);font-size:11px}
.chip-nm{font-weight:600;font-size:13px}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
@media(max-width:720px){.grid2{grid-template-columns:1fr}}

.card{background:var(--sf);border:1px solid var(--bd);border-radius:18px;padding:24px;position:relative;overflow:hidden;transition:border-color .3s,transform .2s}
.card:hover{border-color:rgba(0,229,255,.15);transform:translateY(-2px)}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,229,255,.25),transparent)}
.ctitle{font-size:12px;font-weight:600;color:var(--mt);text-transform:uppercase;letter-spacing:1px;margin-bottom:18px;display:flex;align-items:center;gap:7px}

.qr-card{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px}
.qr-wrap{position:relative;display:flex;align-items:center;justify-content:center}
#qrc{background:#fff;padding:12px;border-radius:14px;display:none;box-shadow:0 0 40px rgba(0,229,255,.2)}
.corners{position:absolute;inset:-7px;pointer-events:none}
.corners::before,.corners::after{content:'';position:absolute;width:18px;height:18px;border-color:var(--ac);border-style:solid;border-width:0}
.corners::before{top:0;left:0;border-top-width:2px;border-left-width:2px;border-radius:4px 0 0 0}
.corners::after{bottom:0;right:0;border-bottom-width:2px;border-right-width:2px;border-radius:0 0 4px 0}
.qr-ph{width:210px;height:210px;border-radius:14px;background:var(--sf2);border:2px dashed var(--bd);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.qr-ph .ico{font-size:44px;opacity:.35}
.qr-ph .lbl{font-size:12px;color:var(--mt);font-family:'JetBrains Mono',monospace}
.spin{width:26px;height:26px;border:2px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.qr-lbl{margin-top:16px;font-size:12px;color:var(--mt);text-align:center;font-family:'JetBrains Mono',monospace;line-height:1.65}
.hint{margin-top:12px;font-size:11px;color:var(--mt);font-family:'JetBrains Mono',monospace;opacity:.6}

.sbar{display:flex;align-items:center;gap:9px;padding:12px 14px;background:var(--sf2);border:1px solid var(--bd);border-radius:11px;margin-bottom:14px;font-family:'JetBrains Mono',monospace;font-size:12px;transition:all .3s}
.sdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.sdot.starting{background:var(--yl);animation:pulse 1.5s infinite}
.sdot.qr{background:var(--ac);animation:pulse 1.5s infinite}
.sdot.connected{background:var(--gr)}
.sdot.disconnected{background:var(--rd)}
.row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--bd);font-size:12px}
.row:last-child{border-bottom:none}
.rl{color:var(--mt)}
.rv{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;background:var(--sf2);padding:3px 7px;border-radius:5px}
.rv.g{color:var(--gr);background:rgba(16,185,129,.1)}
.rv.b{color:var(--ac);background:rgba(0,229,255,.1)}
.rv.p{color:#a78bfa;background:rgba(167,139,250,.1)}

.full{grid-column:1/-1}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.step{display:flex;gap:12px;align-items:flex-start;padding:14px;background:var(--sf2);border-radius:12px;border:1px solid var(--bd);transition:border-color .25s}
.step:hover{border-color:rgba(0,229,255,.18)}
.snum{width:26px;height:26px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;color:#fff;font-family:'JetBrains Mono',monospace}
.stx{font-size:12px;color:var(--tx);line-height:1.65}
.stx strong{color:var(--ac);font-weight:600}

.conn-big{display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:210px;text-align:center}
.conn-ic{font-size:52px;animation:bou 1s ease-in-out}
@keyframes bou{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
.conn-t{font-size:20px;font-weight:700;color:var(--gr)}
.conn-s{font-size:13px;color:var(--mt);font-family:'JetBrains Mono',monospace}

footer{text-align:center;padding:26px 0 36px;color:var(--mt);font-size:12px;border-top:1px solid var(--bd);margin-top:36px}
footer a{color:var(--ac);text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:11px}
</style>
</head>
<body>
<div class="grid"></div>
<nav><div class="wrap"><div class="nav-in">
  <div class="logo"><div class="logo-ic">🤖</div><div class="logo-tx">${BOT}</div></div>
  <div class="badge"><div class="dot"></div>v${VER} Railway</div>
</div></div></nav>

<div class="wrap">
<div class="hero">
  <div class="tag">⚡ WhatsApp AI Bot — Live Pairing</div>
  <h1><span class="grad">Scan & Connect</span><br>Bot চালু করো এখনই</h1>
  <p class="sub">নিচের QR code WhatsApp দিয়ে স্ক্যান করো। কয়েক সেকেন্ডেই Bot সক্রিয় হয়ে যাবে।</p>
</div>

<div class="chips">
  <div class="chip"><span class="chip-ico">🧠</span><div><div class="chip-nm">AI Chat</div><div class="chip-lbl">Multi-provider</div></div></div>
  <div class="chip"><span class="chip-ico">🎵</span><div><div class="chip-nm">Music</div><div class="chip-lbl">YouTube Download</div></div></div>
  <div class="chip"><span class="chip-ico">🎙️</span><div><div class="chip-nm">Voice Reply</div><div class="chip-lbl">Auto TTS (বাংলা)</div></div></div>
  <div class="chip"><span class="chip-ico">🎭</span><div><div class="chip-nm">Sticker</div><div class="chip-lbl">Image → Sticker</div></div></div>
  <div class="chip"><span class="chip-ico">⚡</span><div><div class="chip-nm">Auto-Reply</div><div class="chip-lbl">Smart Context AI</div></div></div>
</div>

<div class="grid2">
  <!-- QR -->
  <div class="card qr-card">
    <div class="ctitle">📱 QR SCAN PANEL</div>
    <div id="ld" style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div class="qr-ph"><div class="ico">📡</div><div class="spin"></div><div class="lbl">QR লোড হচ্ছে...</div></div>
      <div class="hint">auto-refreshing every 4s</div>
    </div>
    <div id="qrr" style="display:none;flex-direction:column;align-items:center;gap:14px">
      <div class="qr-wrap"><div id="qrc"></div><div class="corners"></div></div>
      <div class="qr-lbl">WhatsApp → ⋮ → Linked Devices → Link a Device<br><span style="color:var(--ac);font-weight:600">👆 এই QR স্ক্যান করো</span></div>
      <div class="hint">QR 60s এ expire হয় — auto-refresh চলছে</div>
    </div>
    <div class="conn-big" id="cb">
      <div class="conn-ic">✅</div>
      <div class="conn-t">সংযুক্ত হয়েছে!</div>
      <div class="conn-s" id="cn">Bot active</div>
    </div>
  </div>

  <!-- Status -->
  <div class="card">
    <div class="ctitle">📊 BOT STATUS</div>
    <div class="sbar" id="sb"><div class="sdot starting" id="sd"></div><span id="st">Starting...</span></div>
    <div class="row"><span class="rl">Bot Name</span><span class="rv b">${BOT}</span></div>
    <div class="row"><span class="rl">Version</span><span class="rv">v${VER}</span></div>
    <div class="row"><span class="rl">AI Provider</span><span class="rv p">${AIP}</span></div>
    <div class="row"><span class="rl">Command Prefix</span><span class="rv b">${PRE}</span></div>
    <div class="row"><span class="rl">Auto Voice Reply</span><span class="rv ${AV ? 'g' : ''}">${AV ? '✓ ON' : '✗ OFF'}</span></div>
    <div class="row"><span class="rl">Group Reply</span><span class="rv ${GR ? 'g' : ''}">${GR ? '✓ ON' : '✗ OFF'}</span></div>
    <div class="row"><span class="rl">Connected Number</span><span class="rv" id="bn">—</span></div>
    <div class="row"><span class="rl">Uptime</span><span class="rv" id="up">0s</span></div>
  </div>

  <!-- Steps -->
  <div class="card full">
    <div class="ctitle">🚀 PAIRING STEPS</div>
    <div class="steps">
      <div class="step"><div class="snum">01</div><div class="stx">WhatsApp খোলো। ডান কোণে <strong>⋮</strong> তিন ডট চাপো।</div></div>
      <div class="step"><div class="snum">02</div><div class="stx"><strong>Linked Devices</strong> এ যাও, তারপর <strong>Link a Device</strong> চাপো।</div></div>
      <div class="step"><div class="snum">03</div><div class="stx">ক্যামেরা দিয়ে উপরের <strong>QR code</strong> স্ক্যান করো।</div></div>
      <div class="step"><div class="snum">04</div><div class="stx">কয়েক সেকেন্ড অপেক্ষা করো — <strong>✅ Connected</strong> দেখাবে!</div></div>
    </div>
  </div>
</div>

<footer>
  <p>Built with ❤️ using <a href="#">@whiskeysockets/baileys</a> · Deployed on <a href="#">Railway</a> · ${BOT} v${VER}</p>
</footer>
</div>

<script>
let lastQR=null,qrObj=null,start=Date.now();

function setStatus(s,num){
  const dot=document.getElementById('sd'),txt=document.getElementById('st'),bn=document.getElementById('bn');
  dot.className='sdot '+s;
  const m={starting:'⏳ শুরু হচ্ছে...',qr:'📱 QR স্ক্যানের অপেক্ষায়',connected:'✅ সংযুক্ত ও সক্রিয়',disconnected:'❌ সংযোগ বিচ্ছিন্ন',logged_out:'🚪 Logged Out'};
  txt.textContent=m[s]||s;
  if(num){const n='+'+num.split(':')[0].split('@')[0];bn.textContent=n;bn.className='rv g';}
  document.getElementById('up').textContent=Math.floor((Date.now()-start)/1000)+'s';
}

async function poll(){
  try{
    const r=await fetch('/api/status');
    const d=await r.json();
    setStatus(d.status,d.botNumber);
    if(d.status==='connected'){
      document.getElementById('ld').style.display='none';
      document.getElementById('qrr').style.display='none';
      const cb=document.getElementById('cb');
      cb.style.display='flex';
      if(d.botNumber){document.getElementById('cn').textContent='+'+d.botNumber.split(':')[0].split('@')[0]+' চালু আছে 🎉';}
      lastQR=null;return;
    }
    if(d.qr&&d.qr!==lastQR){
      lastQR=d.qr;
      document.getElementById('ld').style.display='none';
      document.getElementById('cb').style.display='none';
      const qrr=document.getElementById('qrr');
      qrr.style.display='flex';
      const c=document.getElementById('qrc');
      c.innerHTML='';c.style.display='block';
      if(qrObj){qrObj.clear();qrObj.makeCode(d.qr);}
      else{qrObj=new QRCode(c,{text:d.qr,width:196,height:196,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});}
    }else if(!d.qr&&d.status!=='connected'){
      document.getElementById('ld').style.display='flex';
      document.getElementById('qrr').style.display='none';
      document.getElementById('cb').style.display='none';
    }
  }catch(e){setStatus('disconnected');}
}

poll();setInterval(poll,4000);
setInterval(()=>{document.getElementById('up').textContent=Math.floor((Date.now()-start)/1000)+'s';},1000);
</script>
</body>
</html>`;
}

// ════════════════════════════════════════════
//   ANTI-CRASH
// ════════════════════════════════════════════
process.on("uncaughtException",(err)=>{console.error("[Crash]",err.message);});
process.on("unhandledRejection",(r)=>{console.error("[Reject]",r?.message||r);});
process.on("SIGTERM",()=>{server.close();process.exit(0);});

console.log("════════════════════════════════════════");
console.log("   🤖 WhatsApp AI Bot Starting...   ");
console.log("════════════════════════════════════════");

connectBot().catch((err)=>{console.error("[Fatal]",err.message);process.exit(1);});
