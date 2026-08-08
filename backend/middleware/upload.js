const multer = require('multer');

// Use memory storage - files go straight to Google Drive
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow all file types
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
    files: 20, // max 20 files at once
  },
});

module.exports = upload;
