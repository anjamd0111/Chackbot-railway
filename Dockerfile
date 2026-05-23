FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    chromium \
    git \
    --no-install-recommends \
    && pip3 install gTTS --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy all source files
COPY . .

# Create necessary directories
RUN mkdir -p session temp

# Expose port for pairing website
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"]
