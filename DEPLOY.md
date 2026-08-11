# Air Drive Production Deployment

## Current Status

| Layer | Host | URL | Status |
|-------|------|-----|--------|
| Backend API | Render | `https://airdrive-backend-6k4c.onrender.com` | Live |
| Frontend app | Vercel | `https://air-drive-j5p1nb45r-harsh-parate-s-projects.vercel.app` | Live after latest Vercel deployment |
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
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only-secret-key>
SUPABASE_STORAGE_BUCKET=airdrive_storage
SUPABASE_STORAGE_LIMIT_BYTES=900000000
OPENAI_API_KEY=<optional-openai-key>
OPENAI_BASE_URL=https://api.openai.com/v1
ENCRYPTION_KEY=<32-character-key>
ADMIN_EMAIL=<admin-email>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<email-user>
EMAIL_PASS=<gmail-app-password>
GMAIL_USER=<gmail-address>
GMAIL_APP_PASSWORD=<gmail-app-password-without-spaces>
GMAIL_FROM_NAME=AirDrive
BREVO_API_KEY=<brevo-api-key>
BREVO_FROM_EMAIL=<verified-brevo-sender>
BREVO_FROM_NAME=AirDrive
GOOGLE_APPS_SCRIPT_EMAIL_URL=https://script.google.com/macros/s/<deployment-id>/exec
GOOGLE_APPS_SCRIPT_EMAIL_SECRET=<long-random-secret>
GOOGLE_APPS_SCRIPT_FROM_NAME=AirDrive
CLIENT_URL=https://air-drive-snowy.vercel.app
```

### Supabase Storage

1. In the Supabase dashboard, open **Storage** and create a private `airdrive_storage` bucket.
2. Open **Project Settings → API Keys** and create a backend secret key.
3. Add the four `SUPABASE_*` variables above to the Render service.
4. Save the environment and run **Manual Deploy → Clear build cache & deploy**.

Keep the bucket private. AirDrive proxies authorized downloads and previews through the backend; no public bucket URL is required.

### Free Gmail delivery with Google Apps Script

Render Free blocks SMTP ports. To send low-volume transactional email through Gmail over HTTPS:

1. Create a project at `https://script.google.com` while signed in to the sending Gmail account.
2. Paste `google-apps-script/Code.gs` into the Apps Script editor.
3. In **Project Settings > Script properties**, add `AIRDRIVE_EMAIL_SECRET` with a long random value.
4. Choose **Deploy > New deployment > Web app**. Execute as **Me** and allow access to **Anyone**.
5. Authorize Gmail access and copy the deployed `/exec` URL.
6. Add the URL and the same secret to the Render backend using the variables above, then redeploy.

Google Apps Script is selected before Brevo and SMTP when both URL and secret are configured.

## Google OAuth

In Google Cloud Console, update the OAuth client:

```text
Authorized JavaScript origin:
https://air-drive-j5p1nb45r-harsh-parate-s-projects.vercel.app

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
