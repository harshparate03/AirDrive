# AirDrive Feature Development Plan

## 1. Performance & Loading ✅
- [x] Create `frontend/src/components/ui/PageLoader.jsx` (global route/redirect progress bar)
- [x] Integrate into `App.jsx` (rendered at root, listens to router location)
- [x] Fix `useUpload.js` per-file progress (unique id per file, sequential upload, correct % per queue item)
- [x] `UploadPanel.jsx` shows per-item progress bar + status

## 2. File Sharing & Access Control ✅
- [x] Update `SharedLink` model (accessedBy, lastAccessedAt, lastAccessBy)
- [x] Update `share.js` (record access w/ recipient info, notify owner, preview + download endpoints, getTokens helper)
- [x] Update `SharedPage.jsx` access viewed/not-viewed indicators
- [x] Update `SharedFilePage.jsx` inline preview (image/video/audio/PDF) + proxy download via `/share/:token/preview` & `/share/:token/download`
- [x] Add `sharePreviewUrl` / `shareDownload` helpers in `api.js`

## 3. Authentication & Rate Limiting ✅
- [x] Update `User` model (loginAttempts, lockUntil)
- [x] Update `auth.js` login (lockout tracking, attempts-remaining, friendly messages, admin notify on login/signup)
- [x] Update `server.js` (authLimiter with skipSuccessfulRequests + friendly rate-limit message)
- [x] `LoginPage.jsx` friendly lockout/attempts banner (amber styling w/ clock icon)

## 4. UI Customization ✅
- [x] Create `ViewModeToggle.jsx` (reusable grid/list toggle, persists via uiSlice/localStorage)
- [x] Add grid/list toggle to all pages: Dashboard, MyDrive, Recent, Starred, Shared, Search, Trash, Folder, Admin
- [x] Persist view preference to localStorage (`viewMode` key via uiSlice)

## 5. AI Features ✅
- [x] Harden `ai.js` tags parsing (handles plain arrays + JSON objects, normalize/dedupe/cap)
- [x] Guard `file.aiTags` against undefined in `/rename` route
- [x] Add `POST /api/ai/rename/apply` (sanitize name, preserves extension, logs ai_rename activity)
- [x] Add "Apply" AI rename action in `ContextMenu.jsx`

## 6. Trash & Deletion ✅
- [x] Add individual permanent-delete in trash (`FileGrid.jsx` + `FileList.jsx` showRestore prop + `TrashPage.jsx`)
- [x] Fix activity graph to exclude deleted data (`activities.js` heatmap excludes delete/trash/delete_folder/logout)

## 7. User Notifications ✅
- [x] Extend `Notification` model type enum (access, share_request, ai, etc.)
- [x] Add share-access notifications (owner notified when shared item is accessed in `share.js`)

## 8. Admin Panel ✅
- [x] Add `POST /api/admin/login` (separate admin auth endpoint)
- [x] Admin notifications feed (`GET /admin/notifications` — new logins, signups, activity)
- [x] User-specific activity logs (`GET /admin/users/:id/activity`)
- [x] AdminPage notifications tab + per-user activity selector + ViewModeToggle import

## Verification
- [x] Backend `node --check` ALL_SYNTAX_OK (share, ai, auth, admin, activities, server, models)
- [x] Frontend `npx vite build` SUCCEEDED

## Deployment
- [x] Verify vercel.json / render.yaml
- [ ] Prepare deployment instructions (Vercel frontend + Render backend)
