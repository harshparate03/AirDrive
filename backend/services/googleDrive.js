const { google } = require('googleapis');
const { Readable } = require('stream');

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

const getDriveClient = (accessToken, refreshToken) => {
  const auth = getOAuth2Client();
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.drive({ version: 'v3', auth });
};

// Generate Google OAuth URL
const getAuthUrl = (state = '') => {
  const auth = getOAuth2Client();
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive',
    ],
    state,
    prompt: 'consent',
  });
};

// Exchange code for tokens
const getTokensFromCode = async (code) => {
  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);
  return tokens;
};

// Get user info from Google
const getGoogleUserInfo = async (accessToken) => {
  const auth = getOAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth });
  const { data } = await oauth2.userinfo.get();
  return data;
};

// Get Drive storage quota
const getStorageQuota = async (accessToken, refreshToken) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.about.get({ fields: 'storageQuota' });
  return data.storageQuota;
};

// Upload file to Google Drive
const uploadFile = async (accessToken, refreshToken, { name, mimeType, buffer, folderId }) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const stream = Readable.from(buffer);

  const fileMetadata = {
    name,
    ...(folderId && { parents: [folderId] }),
  };

  const media = { mimeType, body: stream };

  const { data } = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,createdTime,modifiedTime',
  });

  return data;
};

// Get file metadata
const getFileMetadata = async (accessToken, refreshToken, fileId) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,createdTime,modifiedTime,parents',
  });
  return data;
};

// List files
const listFiles = async (accessToken, refreshToken, { folderId, pageToken, pageSize = 50, query = '' } = {}) => {
  const drive = getDriveClient(accessToken, refreshToken);
  let q = 'trashed=false';
  if (folderId) q += ` and '${folderId}' in parents`;
  if (query) q += ` and ${query}`;

  const { data } = await drive.files.list({
    q,
    pageSize,
    pageToken,
    fields: 'nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,createdTime,modifiedTime,parents)',
    orderBy: 'modifiedTime desc',
  });
  return data;
};

// Download file from Google Drive as buffer
const downloadFile = async (accessToken, refreshToken, fileId) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(response.data);
};

// Delete file
const deleteFile = async (accessToken, refreshToken, fileId) => {
  const drive = getDriveClient(accessToken, refreshToken);
  await drive.files.delete({ fileId });
};

// Move file (update parents)
const moveFile = async (accessToken, refreshToken, fileId, newFolderId, oldFolderId) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.update({
    fileId,
    addParents: newFolderId,
    removeParents: oldFolderId,
    fields: 'id,parents',
  });
  return data;
};

// Rename file
const renameFile = async (accessToken, refreshToken, fileId, newName) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.update({
    fileId,
    requestBody: { name: newName },
    fields: 'id,name',
  });
  return data;
};

// Create Google Drive folder
const createDriveFolder = async (accessToken, refreshToken, { name, parentFolderId }) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId && { parents: [parentFolderId] }),
    },
    fields: 'id,name,createdTime',
  });
  return data;
};

// Share file with user
const shareFileWithUser = async (accessToken, refreshToken, fileId, email, role) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const roleMap = { viewer: 'reader', commenter: 'commenter', editor: 'writer', owner: 'owner' };
  const { data } = await drive.permissions.create({
    fileId,
    requestBody: {
      type: 'user',
      role: roleMap[role] || 'reader',
      emailAddress: email,
    },
    fields: 'id,role,emailAddress',
  });
  return data;
};

// Create public share link
const createPublicLink = async (accessToken, refreshToken, fileId) => {
  const drive = getDriveClient(accessToken, refreshToken);
  await drive.permissions.create({
    fileId,
    requestBody: { type: 'anyone', role: 'reader' },
  });
  const { data } = await drive.files.get({
    fileId,
    fields: 'webViewLink,webContentLink',
  });
  return data;
};

// Copy file
const copyFile = async (accessToken, refreshToken, fileId, newName) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.copy({
    fileId,
    requestBody: { name: newName || `Copy of file` },
    fields: 'id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink',
  });
  return data;
};

// Get file as stream for proxying
const getFileStream = async (accessToken, refreshToken, fileId) => {
  const drive = getDriveClient(accessToken, refreshToken);
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return response.data;
};

module.exports = {
  getOAuth2Client,
  getDriveClient,
  getAuthUrl,
  getTokensFromCode,
  getGoogleUserInfo,
  getStorageQuota,
  uploadFile,
  getFileMetadata,
  listFiles,
  downloadFile,
  deleteFile,
  moveFile,
  renameFile,
  createDriveFolder,
  shareFileWithUser,
  createPublicLink,
  copyFile,
  getFileStream,
};
