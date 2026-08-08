# Air Drive — Production Deployment Guide

This project is ready to deploy. It uses a **3-part architecture**:

| Layer | Host | URL |
|-------|------|-----|
| Frontend (React) | **Vercel** | `https://airdrive.vercel.app` (example) |
| Backend (Express + Socket.io + uploads) | **Render** | `https://airdrive-backend.onrender.com` (example) |
| Database (MongoDB Atlas) | **Atlas (already cloud-hosted)** | your existing connection string |

All three connect to the same MongoDB Atlas database.

---

## Prerequisites

1. GitHub account (`harshparate03`) — repo `AIrDrive`
2. Vercel account
3. Render account
4. The code pushed to GitHub (see Step 0)

---

## Step 0 — Push code to GitHub

The git repo is already initialized. Run these from `d:/AirDrive`:

```bash
git add .
git commit -m "Initial production-ready Air Drive"
git branch -M main
git remote add origin https://github.com/harshparate03/AIrDrive.git
git push -u origin main
```

> You'll be prompted for your GitHub username + a personal access token (not your password).
> Create a token at: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token with `repo` scope.

---

## Step 1 — Deploy Backend to Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo: `harshparate03/AIrDrive`
3. **Root directory:** `backend`
4. **Build command:** `npm install`
5. **Start command:** `node server.js`
6. **Instance type:** Free
7. Add these **Environment Variables** (from your `backend/.env`):

```
MONGODB_URI=<your atlas uri>
JWT_SECRET=<your secret>
JWT_REFRESH_SECRET=<your secret>
ENCRYPTION_KEY=<your 32-char key>
GOOGLE_CLIENT_ID=<your google client id>
GOOGLE_CLIENT_SECRET=<your google client secret>
GOOGLE_REDIRECT_URI=https://<your-backend>.onrender.com/auth/google/callback
OPENAI_API_KEY=<optional>
CLIENT_URL=https://<your-vercel-app>.vercel.app
NODE_ENV=production
PORT=10000
```

8. Click **Create Web Service**. Wait for the deploy (1–3 min). Note the URL, e.g. `https://airdrive-backend.onrender.com`.

> **Important:** The `backend/render.yaml` is already included for reference, but clicking through the dashboard is simplest.

---

## Step 2 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import repo `harshparate03/AIrDrive`
3. **Root directory:** `frontend`
4. **Framework preset:** Vite (auto-detected)
5. **Build command:** `npm run build`
6. **Output directory:** `dist`
7. Add these **Environment Variables**:

```
VITE_API_URL=https://<your-backend>.onrender.com/api
VITE_SOCKET_URL=https://<your-backend>.onrender.com
VITE_GOOGLE_CLIENT_ID=<your google client id>
```

8. Click **Deploy**. Your app will be live, e.g. `https://airdrive.vercel.app`.

> `frontend/vercel.json` already contains the SPA rewrite + asset caching config.

---

## Step 3 — Update Google OAuth (if using Google sign-in)

In Google Cloud Console → APIs & Services → Credentials → your OAuth client:

- **Authorized JavaScript origins:** add `https://<your-vercel-app>.vercel.app`
- **Authorized redirect URIs:** add `https://<your-backend>.onrender.com/auth/google/callback`

---

## Step 4 — Verify

1. Open `https://<your-vercel-app>.vercel.app`
2. Click **Sign up** → create an account → you should reach the dashboard
3. Upload a file, share a link, test AI features
4. Check the backend health: `https://<your-backend>.onrender.com/health` → `{"status":"OK"}`

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Network error" on login/signup | `VITE_API_URL` wrong or backend not deployed / CORS. Backend already allows `CLIENT_URL`. |
| Share links 404 | `CLIENT_URL` env on backend must be the Vercel URL (share links build from it). |
| Google Drive connect fails | Authorized redirect URI must match the Render backend exactly. |
| Upload errors | Local disk uploads work on Render (free tier has ephemeral disk). Use the local fallback — no Google token needed. |
| Socket not connecting | `VITE_SOCKET_URL` must be the Render https URL. |

---

## Architecture Notes

- **Why not put the backend on Vercel?** The backend uses Socket.io (persistent webSockets) and local-disk file uploads, both of which don't work on Vercel's stateless serverless functions. Render runs a persistent Node server, which supports both.
- **MongoDB Atlas** is already cloud-hosted, so no database deployment is needed — it's just a connection string.
- **Local file storage fallback** means the app is fully functional even without Google Drive credentials connected.
