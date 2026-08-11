const File = require('../models/File');
const FileRequest = require('../models/FileRequest');

const DEFAULT_STORAGE_LIMIT_BYTES = 900000000;

const getStorageLimit = () => {
  const configured = Number(process.env.SUPABASE_STORAGE_LIMIT_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_STORAGE_LIMIT_BYTES;
};

const getStoredFileSize = file => {
  if (file?.versions?.length) {
    return file.versions.reduce((sum, version) => sum + (Number(version.size) || 0), 0);
  }
  return Number(file?.size) || 0;
};

const getGlobalStorageUsed = async () => {
  const [files, requests] = await Promise.all([
    File.find({ storageType: 'supabase' }).select('size versions.size').lean(),
    FileRequest.find({ 'uploads.r2Key': { $exists: true } }).select('uploads.size uploads.r2Key').lean(),
  ]);

  const fileBytes = files.reduce((sum, file) => sum + getStoredFileSize(file), 0);
  const requestBytes = requests.reduce((sum, request) => sum + (request.uploads || [])
    .filter(upload => upload.r2Key)
    .reduce((uploadSum, upload) => uploadSum + (Number(upload.size) || 0), 0), 0);

  return fileBytes + requestBytes;
};

const checkStorageCapacity = async (user, incomingBytes) => {
  const incoming = Number(incomingBytes) || 0;
  if ((Number(user?.storageUsed) || 0) + incoming > (Number(user?.storageLimit) || 0)) {
    return { ok: false, error: 'Storage limit exceeded' };
  }

  const globalUsed = await getGlobalStorageUsed();
  if (globalUsed + incoming > getStorageLimit()) {
    return { ok: false, error: 'AirDrive cloud storage capacity exceeded' };
  }

  return { ok: true, globalUsed };
};

module.exports = {
  DEFAULT_STORAGE_LIMIT_BYTES,
  getStorageLimit,
  getStoredFileSize,
  getGlobalStorageUsed,
  checkStorageCapacity,
};
