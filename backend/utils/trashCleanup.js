const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');
const { decrypt } = require('./encryption');
const driveService = require('../services/googleDrive');
const localService = require('../services/localStorage');

const cleanupExpiredTrash = async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const files = await File.find({ trashed: true, trashedAt: { $lte: cutoff } });
  for (const file of files) {
    try {
      if (file.storageType === 'google' && file.googleFileId) {
        const user = await User.findById(file.userId);
        if (user?.googleAccessToken) {
          await driveService.deleteFile(decrypt(user.googleAccessToken), decrypt(user.googleRefreshToken), file.googleFileId);
        }
      } else if (file.localPath) {
        await localService.deleteFile(file.localPath);
      }
      await User.findByIdAndUpdate(file.userId, { $inc: { storageUsed: -(file.size || 0) } });
      await file.deleteOne();
    } catch (error) {
      console.error(`Trash cleanup failed for file ${file._id}:`, error.message);
    }
  }
  await Folder.deleteMany({ trashed: true, trashedAt: { $lte: cutoff } });
};

module.exports = { cleanupExpiredTrash };
