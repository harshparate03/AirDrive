# Air Drive Production Deployment

## Current Status

| Layer | Host | URL | Status |
|-------|------|-----|--------|
| Backend API | Render | `https://airdrive-backend-6k4c.onrender.com` | Live |
| Frontend app | Vercel | `https://air-drive-snowy.vercel.app` | Not live: returns 404 |
| Database | MongoDB Atlas | configured through Render env vars | Connected by backend |

Backend health check:

```bash
curl https://airdrive-backend-6k4c.onrender.com/health
```

Expected response:

```json
{"status":"OK","message":"Air Drive API is running"}
```

## Local Verification

Run these before deploying:

```bash
cd frontend
npm run lint
npm run build

cd ../backend
npm test
```

Current checks pass locally.

## Frontend Deployment

The frontend is build-ready, but the configured Vercel URL currently returns `404`.

Use the existing Vercel project settings:

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

Required Vercel environment variables:

```text
VITE_API_URL=https://airdrive-backend-6k4c.onrender.com/api
VITE_SOCKET_URL=https://airdrive-backend-6k4c.onrender.com
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

Deploy command:

```bash
vercel deploy --prod --yes
```

If the CLI returns `fetch failed`, retry from a normal terminal or deploy from the Vercel dashboard. In this workspace the Vercel CLI has a valid token, but the deployment request failed while talking to the Vercel API.

## Backend Deployment

Render service:

```text
https://airdrive-backend-6k4c.onrender.com
```

Render settings:

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `node server.js` |
| Health path | `/health` |

Required Render environment variables:

```text
NODE_ENV=production
PORT=10000
MONGODB_URI=<mongodb-atlas-uri>
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_REDIRECT_URI=https://airdrive-backend-6k4c.onrender.com/auth/google/callback
OPENAI_API_KEY=<optional-openai-key>
OPENAI_BASE_URL=https://api.openai.com/v1
ENCRYPTION_KEY=<32-character-key>
ADMIN_EMAIL=<admin-email>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<email-user>
CLIENT_URL=https://air-drive-snowy.vercel.app
```

## Google OAuth

In Google Cloud Console, update the OAuth client:

```text
Authorized JavaScript origin:
https://air-drive-snowy.vercel.app

Authorized redirect URI:
https://airdrive-backend-6k4c.onrender.com/auth/google/callback
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Frontend URL returns 404 | Redeploy the Vercel project and confirm the production domain is assigned |
| Login shows network error | Confirm `VITE_API_URL` points to `https://airdrive-backend-6k4c.onrender.com/api` |
| Socket does not connect | Confirm `VITE_SOCKET_URL` points to `https://airdrive-backend-6k4c.onrender.com` |
| Share links point to wrong frontend | Update Render `CLIENT_URL` to the live Vercel URL |
| Backend health check is slow | Wait for Render cold start, then retry `/health` |
