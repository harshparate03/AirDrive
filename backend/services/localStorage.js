const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Save a buffer to local disk
const saveBuffer = async (buffer, originalName) => {
  const id = uuidv4();
  const safeName = path.basename(originalName || 'file').replace(/[^\w.\- ]/g, '_');
  const filename = `${id}-${safeName}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);
  return { id, filePath, filename };
};

// Read a file from local disk
const readFile = async (filePath) => {
  return await fs.promises.readFile(filePath);
};

// Stream a file from local disk
const createReadStream = (filePath) => {
  return fs.createReadStream(filePath);
};

// Delete a file from local disk
const deleteFile = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (_) {
    // Ignore delete errors
  }
};

// Copy a file on local disk
const copyFile = async (sourcePath, originalName) => {
  const buffer = await readFile(sourcePath);
  const { id, filePath } = await saveBuffer(buffer, originalName);
  return { id, filePath };
};

// Get file size
const getSize = async (filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  } catch (_) {
    return 0;
  }
};

module.exports = {
  UPLOAD_DIR,
  saveBuffer,
  readFile,
  createReadStream,
  deleteFile,
  copyFile,
  getSize,
};

