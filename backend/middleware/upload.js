const multer = require('multer');

// Use memory storage before sending files to private Supabase Storage.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow all file types
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 50) * 1024 * 1024,
    files: 20, // max 20 files at once
  },
});

module.exports = upload;
