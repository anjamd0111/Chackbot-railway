# ЁЯдЦ WhatsApp AI Bot тАФ Railway Deploy Guide

## тЬЕ ржПржХ ржиржЬрж░рзЗ

ржПржЗ Bot ржЯрж┐ Railway рждрзЗ deploy ржХрж░рж▓рзЗ:
- Automatically ржПржХржЯрж╛ **Pairing Website** ржЪрж╛рж▓рзБ рж╣ржмрзЗ
- QR code ржжрж┐ржпрж╝рзЗ WhatsApp рж╕ржВржпрзБржХрзНржд ржХрж░рждрзЗ ржкрж╛рж░ржмрзЗ
- Bot 24/7 active ржерж╛ржХржмрзЗ

---

## ЁЯЪА Railway Deploy Steps

### Step 1 тАФ GitHub ржП Upload ржХрж░рзЛ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-ai-bot.git
git push -u origin main
```

### Step 2 тАФ Railway рждрзЗ Deploy

1. **[railway.app](https://railway.app)** ржП ржпрж╛ржУ
2. **New Project** тЖТ **Deploy from GitHub repo** ржЪрж╛ржкрзЛ
3. рждрзЛржорж╛рж░ repository select ржХрж░рзЛ
4. Railway automatically **Dockerfile** detect ржХрж░ржмрзЗ

### Step 3 тАФ Environment Variables рж╕рзЗржЯ ржХрж░рзЛ

Railway Dashboard тЖТ рждрзЛржорж╛рж░ service тЖТ **Variables** tab ржП ржпрж╛ржУ:

| Variable | Value | Required |
|----------|-------|----------|
| `OWNER_NUMBER` | `8801XXXXXXXXX` | тЬЕ |
| `OWNER_NAME` | рждрзЛржорж╛рж░ ржирж╛ржо | тЬЕ |
| `AI_PROVIDER` | `gemini` ржмрж╛ `openai` ржмрж╛ `mistral` | тЬЕ |
| `GEMINI_API_KEY` | `AIzaSy...` | Gemini рж╣рж▓рзЗ |
| `OPENAI_API_KEY` | `sk-...` | OpenAI рж╣рж▓рзЗ |
| `MISTRAL_API_KEY` | `...` | Mistral рж╣рж▓рзЗ |
| `BOT_NAME` | `ЁЭЧФЁЭЧЬ ЁЭЧХЁЭЧ╝ЁЭШБ` | Optional |
| `PREFIX` | `!` | Optional |

> тЪая╕П **config.js ржП API key рж░рж╛ржЦржмрзЗ ржирж╛!** Railway Variables ржмрзНржпржмрж╣рж╛рж░ ржХрж░рзЛред

### Step 4 тАФ config.js ржЖржкржбрзЗржЯ ржХрж░рзЛ (Optional)

`config.js` ржП environment variables ржкржбрж╝рж╛рж░ ржЬржирзНржп:

```js
OWNER_NUMBER: process.env.OWNER_NUMBER || "8801XXXXXXXXX",
GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
```

### Step 5 тАФ Pairing ржХрж░рзЛ

1. Railway deploy рж╣рж▓рзЗ **domain** ржкрж╛ржмрзЗ (ржпрзЗржоржи: `https://your-app.railway.app`)
2. рж╕рзЗржЗ URL ржП ржпрж╛ржУ тАФ **Pairing Website** ржжрзЗржЦрж╛ржмрзЗ
3. QR code рж╕рзНржХрзНржпрж╛ржи ржХрж░рзЛ WhatsApp ржжрж┐ржпрж╝рзЗ
4. Bot connected рж╣ржмрзЗ!

---

## ЁЯУБ Project Structure

```
whatsapp-ai-bot/
тФЬтФАтФА index.js          тЖР Main bot + Web server
тФЬтФАтФА config.js         тЖР Configuration
тФЬтФАтФА Dockerfile        тЖР Railway Docker config
тФЬтФАтФА railway.toml      тЖР Railway settings
тФЬтФАтФА package.json
тФЬтФАтФА lib/
тФВ   тФЬтФАтФА ai.js         тЖР AI providers (Gemini/OpenAI/Mistral)
тФВ   тФЬтФАтФА tts.js        тЖР Text-to-Speech (ржЧTTS)
тФВ   тФФтФАтФА utils.js      тЖР Helper functions
тФФтФАтФА commands/
    тФЬтФАтФА menu.js
    тФЬтФАтФА music.js
    тФЬтФАтФА voice.js
    тФЬтФАтФА sticker.js
    тФФтФАтФА owner.js
```

---

## ЁЯОп Bot Commands

| Command | Description |
|---------|-------------|
| `!menu` | рж╕ржм ржХржорж╛ржирзНржб ржжрзЗржЦрзЛ |
| `!play [ржЧрж╛ржи]` | YouTube ржерзЗржХрзЗ ржЧрж╛ржи ржмрж╛ржЬрж╛ржУ |
| `!ai [ржкрзНрж░рж╢рзНржи]` | AI ржХрзЗ ржкрзНрж░рж╢рзНржи ржХрж░рзЛ |
| `!voice [text]` | Voice note ржкрж╛ржарж╛ржУ |
| `!sticker` | Image reply тЖТ Sticker |
| `!ping` | Bot status check |
| `!info` | Bot info |
| `!clear` | Chat history ржорзБржЫрзЛ |

---

## ЁЯФС Free API Keys ржкрж╛ржУржпрж╝рж╛рж░ ржЙржкрж╛ржпрж╝

| Provider | Link | Tier |
|----------|------|------|
| Gemini | [aistudio.google.com](https://aistudio.google.com) | Free |
| Mistral | [console.mistral.ai](https://console.mistral.ai) | Free |
| OpenAI | [platform.openai.com](https://platform.openai.com) | Paid |

---

## тЪЩя╕П Session Persistence (Important!)

Railway ржП deploy ржХрж░рж▓рзЗ **session** рж╣рж╛рж░рж┐ржпрж╝рзЗ ржпрзЗрждрзЗ ржкрж╛рж░рзЗ redeploy ржПред
Fix ржХрж░рждрзЗ Railway Volume add ржХрж░рзЛ:

1. Railway тЖТ рждрзЛржорж╛рж░ service тЖТ **Volumes**
2. Mount path: `/app/session`
3. ржПржЦржи session рж╕рзЗржн ржерж╛ржХржмрзЗ!

---

## тЭУ рж╕ржорж╕рзНржпрж╛ рж╣рж▓рзЗ

- **QR ржжрзЗржЦрж╛ржЪрзНржЫрзЗ ржирж╛** тЖТ ржХржпрж╝рзЗржХ ржорж┐ржирж┐ржЯ ржЕржкрзЗржХрзНрж╖рж╛ ржХрж░рзЛ, logs ржжрзЗржЦрзЛ
- **Bot reply ржжрж┐ржЪрзНржЫрзЗ ржирж╛** тЖТ API key ржЪрзЗржХ ржХрж░рзЛ Variables ржП
- **Voice note ржХрж╛ржЬ ржХрж░ржЫрзЗ ржирж╛** тЖТ Dockerfile ржП `ffmpeg` ржЖржЫрзЗ, рж╕ржм ржарж┐ржХ ржЖржЫрзЗ

---

*Built with тЭдя╕П using @whiskeysockets/baileys + Railway*
