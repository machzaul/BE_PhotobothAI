# BE_PhotobothAI

Backend API and CMS dashboard for Google Gemini AI Photobooth.

## Features
- **Express Backend API**: Exposes endpoints to process stickers (images) and videos (Omni) from input camera captures.
- **SQLite Database Integration**: Keeps secure records of admin configs, prompt templates, and visitor creations log history.
- **Admin CMS Panel Dashboard**: Single-page workspace to edit prompt templates, configuration keys, toggle mock mode, and review guest creations history log with direct media downloads.
- **Security**: Custom client authentication `X-API-Key` headers on all guest generation routes, and encrypted password logins.

## VPS Deployment Guide

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your VPS.

### 2. Installation
Clone or copy this folder to your VPS directory, then install the dependencies:
```bash
npm install
```

### 3. Running with PM2
Install PM2 globally to run the Node server persistently in the background:
```bash
sudo npm install -p pm2 -g
pm2 start server.js --name "photobooth-backend"
pm2 save
pm2 startup
```

### 4. Admin Access
Once running, the admin control center CMS panel is served statically at:
```text
http://<your-vps-ip>:5000
```
- **Default password**: `admin123` (Change this password immediately on the Settings tab upon first login!)

## Frontend Integration
When calling these endpoints from your frontend (Vercel):
1. Point requests to `http://<your-vps-ip>:5000/api/generate-sticker` and `http://<your-vps-ip>:5000/api/generate-video`.
2. Include the header `'x-api-key': 'YOUR-CLIENT-SECRET-KEY'` (configured in the settings panel) in all fetch requests.
