# OnlyLabs Reels TrendFinder - Deployment Guide

## 🚀 Deploy Options

### Option 1: Replit (Easiest - Recommended)
1. Go to [Replit.com](https://replit.com)
2. Click "Create" → "Import from GitHub"
3. Paste this repo URL
4. Click "Import"
5. Replit will detect dependencies and ask to install → Click "Install packages" (one time only)
6. Click "Run" (fast - just starts the app!)
7. Open the app and enter your license key ✅

**On subsequent runs:** Just click "Run" - dependencies are already installed, so it starts instantly!

**Data persistence:** Your database and settings are preserved across restarts.

### Option 2: Render
1. Go to [Render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect this GitHub repo  
4. Click "Create Web Service"
5. Open the app and enter your license key ✅

### Option 3: Local (Advanced)
**Requirements:** Node.js 20+ and Yarn

```bash
yarn install && yarn start
# Open http://localhost:3001
```

## 🔑 License

Enter your license key when prompted. It validates with Keygen and stores securely.

## 💾 Database

Your data is stored in `prisma/dev.db` and persists across restarts. The database is created automatically on first run.

## ⚙️ Settings

- Default port: 3001 (set `PORT` env var to change)
- Runs in production mode automatically
