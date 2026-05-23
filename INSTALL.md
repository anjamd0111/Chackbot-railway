# WhatsApp AI Bot - Termux Installation Guide

## Step 1: Termux Setup
```bash
pkg update && pkg upgrade -y
```

## Step 2: Install Required Packages
```bash
pkg install nodejs python ffmpeg git -y
```

## Step 3: Install npm globally
```bash
npm install -g npm
```

## Step 4: Clone or create project folder
```bash
mkdir whatsapp-ai-bot
cd whatsapp-ai-bot
```

## Step 5: Copy all files (index.js, config.js, package.json, commands/, lib/)

## Step 6: Install Node.js dependencies
```bash
npm install
```

## Step 7: Install gtts via pip
```bash
pip install gTTS
```

## Step 8: Edit config.js
```bash
nano config.js
# OWNER_NUMBER, AI_PROVIDER, API keys পরিবর্তন করো
```

## Step 9: Start the bot
```bash
node index.js
```

## Step 10: Scan QR Code
- Terminal এ QR code দেখাবে
- WhatsApp খোলো → Linked Devices → Link a Device
- QR scan করো

## Commands
- !menu - সব কমান্ড দেখো
- !play [song] - গান চালাও
- !voice [text] - voice note
- !ping - bot check
- !info - bot info
