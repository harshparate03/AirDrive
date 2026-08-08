# Air Drive — Complete Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | bundled with Node |
| MongoDB Atlas account | free | https://cloud.mongodb.com |
| Google Cloud account | free | https://console.cloud.google.com |
| OpenAI API key | paid | https://platform.openai.com |

---

## Step 1 — Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → "Air Drive"
3. **Enable APIs:**
   - Google Drive API
   - Google People API  
4. **Create OAuth 2.0 credentials:**
   - Go to APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
5. Copy the **Client ID** and **Client Secret**

---

## Step 2 — MongoDB Atlas Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user (save the password)
3. Allow network access from anywhere (0.0.0.0/0) for dev
4. Get the connection string: Connect → Drivers → Node.js
5. Replace `<password>` with your database user password

---

## Step 3 — Configure Backend

```bash
cd backend
copy .env.example .env   # Windows
# or: cp .env.example .env  # Mac/Linux
```

Edit `backend\.env` and fill in:
- `MONGODB_URI` — your Atlas connection string
- `JWT_SECRET` — any random 32+ char string
- `JWT_REFRESH_SECRET` — another random 32+ char string
- `GOOGLE_CLIENT_ID` — from Step 1
- `GOOGLE_CLIENT_SECRET` — from Step 1
- `OPENAI_API_KEY` — from platform.openai.com
- `ENCRYPTION_KEY` — exactly 32 characters

---

## Step 4 — Configure Frontend

```bash
cd frontend
copy .env.example .env   # Windows
```

Edit `frontend\.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

---

## Step 5 — Start Development

### Option A — PowerShell script (Windows)
```powershell
.\start-dev.ps1
```

### Option B — Manual (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App starts at http://localhost:5173
```

---

## Step 6 — First Login

1. Open http://localhost:5173
2. Click **Continue with Google**
3. Sign in with your Google account
4. Grant Drive access when prompted
5. You'll be redirected to the dashboard

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy the dist/ folder to Vercel
# Or connect your GitHub repo at vercel.com
```

Set environment variables in Vercel dashboard:
- `VITE_API_URL` → your Render backend URL + `/api`
- `VITE_SOCKET_URL` → your Render backend URL
- `VITE_GOOGLE_CLIENT_ID` → your Google client ID

### Backend → Render

1. Push to GitHub
2. Create new Web Service at [render.com](https://render.com)
3. Connect your repo, set root directory to `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add all environment variables from `backend/.env`
7. Update `CLIENT_URL` to your Vercel frontend URL

### After Deployment

Update Google OAuth credentials:
- Add your Vercel URL to **Authorized JavaScript origins**
- Add `https://your-backend.onrender.com/auth/google/callback` to **Authorized redirect URIs**

---

## OpenRouter (Free AI Alternative)

If you don't have an OpenAI key, use [OpenRouter](https://openrouter.ai) for free models:

```env
OPENAI_API_KEY=sk-or-v1-your-openrouter-key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
```

Free models available: `google/gemma-3-27b-it:free`, `mistralai/mistral-7b-instruct:free`

---

## Project Structure

```
AirDrive/
├── backend/                  Express.js API
│   ├── models/               Mongoose schemas (7 models)
│   ├── routes/               REST API (9 route files)
│   ├── services/googleDrive.js  Google Drive API wrapper
│   ├── middleware/           Auth, upload, socketAuth
│   ├── socket/handlers.js    Socket.io real-time events
│   ├── utils/                JWT, encryption, activity logger
│   └── server.js             Entry point
│
├── frontend/                 React + Vite app
│   └── src/
│       ├── pages/            14 pages
│       ├── components/       40+ components
│       │   ├── charts/       4 chart components
│       │   ├── files/        6 file components
│       │   ├── layout/       4 layout components
│       │   ├── modals/       8 modal components
│       │   ├── notifications/ 2 notification components
│       │   ├── shared/       Shared file components
│       │   ├── ui/           5 UI primitives
│       │   └── upload/       3 upload components
│       ├── hooks/            3 custom hooks
│       ├── services/         API client + Socket.io
│       ├── store/            Redux Toolkit (5 slices)
│       └── utils/            File utilities
│
├── start-dev.ps1             Windows dev launcher
├── README.md                 Overview
└── SETUP.md                  This file
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus search |
| `U` | Upload files |
| `N` | New folder |
| `D` | Toggle dark mode |
| `?` | Show all shortcuts |
| `G` then `H` | Go to Home |
| `G` then `D` | Go to My Drive |
| `G` then `S` | Go to Starred |
| `G` then `T` | Go to Trash |
| `G` then `A` | Go to AI Assistant |
| `Esc` | Close modal |
