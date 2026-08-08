# Air Drive — AI Powered Cloud Storage

A full-stack cloud storage platform using **Google Drive API** for file storage, **OpenAI** for AI features, and a modern glassmorphic UI.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google Cloud project with Drive API + OAuth 2.0 enabled
- OpenAI API key (or OpenRouter)

### Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev         # http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env
# Set VITE_GOOGLE_CLIENT_ID
npm install
npm run dev         # http://localhost:5173
```

## Environment Variables

### Backend `.env`
| Key | Description |
|-----|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Min 32 chars secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI |
| `OPENAI_API_KEY` | OpenAI or OpenRouter API key |
| `ENCRYPTION_KEY` | 32-char AES key for token encryption |

### Frontend `.env`
| Key | Description |
|-----|-------------|
| `VITE_API_URL` | Backend API URL (default: `/api`) |
| `VITE_SOCKET_URL` | Socket.io server URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for GSI |

## Google Cloud Setup

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Drive API** and **Google+ API**
3. Create **OAuth 2.0 credentials** (Web application)
4. Add authorized origins: `http://localhost:5173`
5. Add authorized redirect URIs: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Secret to `.env`

## Features

- **Google Drive API** — All files stored in user's Google Drive
- **Google OAuth 2.0** — Sign in with Google
- **AI Chat** — Chat with PDF/documents (OpenAI)
- **AI Tags** — Auto-generate tags for files
- **AI Rename** — Suggest meaningful filenames
- **AI Smart Search** — Natural language search
- **OCR** — Extract text from images/PDFs
- **Duplicate Detection** — Find similar files
- **Folder Suggestions** — AI recommends organization
- **Share Links** — Password-protected, expiry, QR codes
- **Real-time Notifications** — Socket.io
- **Dark/Light Mode** — Glassmorphic UI
- **Admin Panel** — User management, analytics

## Architecture

```
Air Drive
├── backend/           Express.js + MongoDB Atlas
│   ├── models/        Mongoose schemas
│   ├── routes/        REST API endpoints
│   ├── services/      Google Drive service
│   ├── middleware/    Auth, upload
│   ├── socket/        Socket.io handlers
│   └── utils/         JWT, encryption, logging
└── frontend/          React + Vite + Tailwind
    ├── src/pages/     Route pages
    ├── src/components/ UI components
    ├── src/store/     Redux Toolkit slices
    └── src/services/  Axios API client
```

## Deployment

- **Frontend** → Vercel (`npm run build`)
- **Backend** → Render (set env vars in dashboard)
- **Database** → MongoDB Atlas (already cloud)

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, Redux Toolkit, React Query, Framer Motion, Chart.js, Socket.io-client

**Backend:** Node.js, Express, MongoDB/Mongoose, Socket.io, Google APIs, OpenAI, JWT, Multer
