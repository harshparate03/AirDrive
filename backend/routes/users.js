const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { decrypt } = require('../utils/encryption');
const driveService = require('../services/googleDrive');
const storageService = require('../services/supabaseStorage');
const { getStorageLimit } = require('../services/storageQuota');

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-googleAccessToken -googleRefreshToken -refreshToken');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const storageInfo = { usage: user.storageUsed || 0, limit: Math.min(user.storageLimit || getStorageLimit(), getStorageLimit()), source: 'supabase' };

    res.json({ user, storageInfo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/users/profile - Update profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { name, photo, preferences } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (photo) user.photo = photo;
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
      if (preferences.notifications) {
        user.preferences.notifications = { ...user.preferences.notifications, ...preferences.notifications };
      }
    }

    await user.save();
    res.json({ user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/activities - User activity log
router.get('/activities', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 30, action } = req.query;
    const query = { userId: req.user._id };
    if (action) query.action = action;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('fileId', 'name mimeType')
        .populate('folderId', 'name')
        .lean(),
      Activity.countDocuments(query),
    ]);

    res.json({ activities, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/users/stats - User statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const File = require('../models/File');
    const Folder = require('../models/Folder');

    const [fileCount, folderCount, starredCount, activities] = await Promise.all([
      File.countDocuments({ userId: req.user._id, trashed: false }),
      Folder.countDocuments({ userId: req.user._id, trashed: false }),
      File.countDocuments({ userId: req.user._id, starred: true }),
      Activity.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    // Upload activity for last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUploads = await Activity.countDocuments({
      userId: req.user._id,
      action: 'upload',
      createdAt: { $gte: weekAgo },
    });

    res.json({ fileCount, folderCount, starredCount, recentUploads, recentActivity: activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// DELETE /api/users/account - Delete account
router.delete('/account', authenticate, async (req, res) => {
  try {
    const File = require('../models/File');
    const Folder = require('../models/Folder');
    const FileRequest = require('../models/FileRequest');

    const [files, fileRequests, account] = await Promise.all([
      File.find({ userId: req.user._id }),
      FileRequest.find({ userId: req.user._id }).select('uploads.r2Key').lean(),
      User.findById(req.user._id),
    ]);
    const accessToken = account?.googleAccessToken ? decrypt(account.googleAccessToken) : '';
    const refreshToken = account?.googleRefreshToken ? decrypt(account.googleRefreshToken) : '';
    for (const file of files) {
      if (file.storageType === 'supabase' && file.r2Key) {
        await storageService.deleteFileObjects(file);
      } else if (file.storageType === 'google' && file.googleFileId && accessToken) {
        await driveService.deleteFile(accessToken, refreshToken, file.googleFileId);
      } else if (file.localPath) {
        await require('../services/localStorage').deleteFile(file.localPath);
      }
    }
    const requestObjectKeys = fileRequests.flatMap(request => (request.uploads || []).map(upload => upload.r2Key)).filter(Boolean);
    await storageService.deleteObjects(requestObjectKeys);

    const fileIds = files.map(file => file._id);
    const folders = await Folder.find({ userId: req.user._id });
    for (const folder of folders.reverse()) {
      if (folder.googleFolderId && accessToken) await driveService.deleteFile(accessToken, refreshToken, folder.googleFolderId).catch(() => {});
    }

    // Cascade delete all application data
    await Promise.all([
      File.deleteMany({ userId: req.user._id }),
      Folder.deleteMany({ userId: req.user._id }),
      Activity.deleteMany({ userId: req.user._id }),
      require('../models/Notification').deleteMany({ userId: req.user._id }),
      require('../models/SharedLink').deleteMany({ userId: req.user._id }),
      FileRequest.deleteMany({ userId: req.user._id }),
      require('../models/AIHistory').deleteMany({ userId: req.user._id }),
      require('../models/Comment').deleteMany({ $or: [{ userId: req.user._id }, { fileId: { $in: fileIds } }] }),
      User.findByIdAndDelete(req.user._id),
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
