const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const File = require('../models/File');
const User = require('../models/User');
const Folder = require('../models/Folder');
const { logActivity, createNotification, getClientInfo } = require('../utils/activityLogger');
const { decrypt } = require('../utils/encryption');
const driveService = require('../services/googleDrive');
const localService = require('../services/localStorage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Helper to get user's Google tokens
const getTokens = (user) => ({
  accessToken: decrypt(user.googleAccessToken),
  refreshToken: decrypt(user.googleRefreshToken),
});

// GET /api/files - List files
router.get('/', authenticate, async (req, res) => {
  try {
    const { folderId, starred, trashed, category, search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = { userId: req.user._id };
    if (folderId !== undefined) query.folderId = folderId || null;
    if (starred === 'true') query.starred = true;
    if (category) query.category = category;

    if (trashed === 'true') {
      query.trashed = true;
    } else if (!trashed) {
      query.trashed = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { aiTags: { $in: [new RegExp(search, 'i')] } },
        { ocrText: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [files, total] = await Promise.all([
      File.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      File.countDocuments(query),
    ]);

    res.json({
      files,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// POST /api/files/upload - Upload file(s) to Google Drive (or local storage if not connected)
router.post('/upload', authenticate, upload.array('files', 20), async (req, res) => {
  try {
    const { folderId, googleDriveFolderId } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const useGoogle = !!(req.user.googleConnected && req.user.googleAccessToken && req.user.googleRefreshToken);
    const io = req.app.get('io');
    const uploadedFiles = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();

      let googleFileId = '';
      let localPath = '';
      let thumbnail = '';
      let webViewLink = '';
      let webContentLink = '';

      if (useGoogle) {
        const { accessToken, refreshToken } = getTokens(req.user);
        // Upload to Google Drive
        const driveFile = await driveService.uploadFile(accessToken, refreshToken, {
          name: file.originalname,
          mimeType: file.mimetype,
          buffer: file.buffer,
          folderId: googleDriveFolderId || null,
        });
        googleFileId = driveFile.id || '';
        thumbnail = driveFile.thumbnailLink || '';
        webViewLink = driveFile.webViewLink || '';
        webContentLink = driveFile.webContentLink || '';
      } else {
        // Fall back to local disk storage
        const saved = await localService.saveBuffer(file.buffer, file.originalname);
        localPath = saved.filePath;
      }

      // Store metadata in MongoDB
      const fileMeta = await File.create({
        googleFileId,
        storageType: useGoogle ? 'google' : 'local',
        localPath,
        userId: req.user._id,
        folderId: folderId || null,
        name: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        extension: ext,
        size: file.size,
        thumbnail,
        webViewLink,
        webContentLink,
        versions: [{
          googleFileId,
          localPath,
          versionNumber: 1,
          size: file.size,
          uploadedAt: new Date(),
          uploadedBy: req.user._id,
        }],
      });

      // Update user storage
      await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: file.size } });

      uploadedFiles.push(fileMeta);

      // Log activity
      await logActivity({
        userId: req.user._id,
        action: 'upload',
        fileId: fileMeta._id,
        details: `Uploaded ${file.originalname}`,
        metadata: { size: file.size, mimeType: file.mimetype },
        ...getClientInfo(req),
      });

      // Notify upload complete
      await createNotification(io, req.user._id, {
        type: 'upload',
        title: 'Upload Complete',
        message: `${file.originalname} uploaded successfully`,
        data: { fileId: fileMeta._id },
        icon: 'upload',
      });

      // Storage warning at 90%
      const user = await User.findById(req.user._id);
      if (user.storageUsed / user.storageLimit > 0.9) {
        await createNotification(io, req.user._id, {
          type: 'storage_warning',
          title: 'Storage Almost Full',
          message: `You've used ${Math.round((user.storageUsed / user.storageLimit) * 100)}% of your storage`,
          icon: 'database',
        });
      }
    }

    res.status(201).json({ files: uploadedFiles, count: uploadedFiles.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// GET /api/files/recent - Recent files
router.get('/recent', authenticate, async (req, res) => {
  try {
    const files = await File.find({ userId: req.user._id, trashed: false })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent files' });
  }
});

// GET /api/files/storage - Storage stats
router.get('/storage', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const byCategory = await File.aggregate([
      { $match: { userId: req.user._id, trashed: false } },
      { $group: { _id: '$category', totalSize: { $sum: '$size' }, count: { $sum: 1 } } },
    ]);

    // Prefer Google Drive quota if connected, otherwise fall back to local Mongo storage
    let storageUsed = user.storageUsed || 0;
    let storageLimit = user.storageLimit || 15 * 1024 * 1024 * 1024;
    let driveUsed = null;
    let trashUsed = null;

    if (req.user.googleConnected && req.user.googleAccessToken) {
      try {
        const { accessToken, refreshToken } = getTokens(req.user);
        const quota = await driveService.getStorageQuota(accessToken, refreshToken);
        storageUsed = parseInt(quota.usage || storageUsed);
        storageLimit = parseInt(quota.limit || storageLimit);
        driveUsed = parseInt(quota.usageInDrive || 0);
        trashUsed = parseInt(quota.usageInDriveTrash || 0);
      } catch (_) {
        // Google Drive API failed - fall back to local stats
      }
    }

    res.json({
      storageUsed,
      storageLimit,
      driveUsed,
      trashUsed,
      byCategory,
      localUsed: user.storageUsed,
      source: req.user.googleConnected ? 'google' : 'local',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch storage info' });
  }
});

// GET /api/files/:id - Get file
router.get('/:id', authenticate, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Update view count
    file.viewCount += 1;
    file.lastViewedAt = new Date();
    await file.save();

    await logActivity({ userId: req.user._id, action: 'view', fileId: file._id, ...getClientInfo(req) });
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// PATCH /api/files/:id - Update file metadata
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, color, labels, pinned } = req.body;
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (name && name !== file.name) {
      if (file.storageType === 'google' && file.googleFileId) {
        const { accessToken, refreshToken } = getTokens(req.user);
        await driveService.renameFile(accessToken, refreshToken, file.googleFileId, name);
      }
      // For local files, renaming only affects metadata (the on-disk filename is id-based)
      file.name = name;
      await logActivity({ userId: req.user._id, action: 'rename', fileId: file._id, details: `Renamed to ${name}`, ...getClientInfo(req) });
    }

    if (description !== undefined) file.description = description;
    if (color !== undefined) file.color = color;
    if (labels !== undefined) file.labels = labels;
    if (pinned !== undefined) file.pinned = pinned;

    await file.save();
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { permanent = false } = req.query;
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (permanent === 'true') {
      if (file.storageType === 'google' && file.googleFileId) {
        const { accessToken, refreshToken } = getTokens(req.user);
        await driveService.deleteFile(accessToken, refreshToken, file.googleFileId);
      } else {
        await localService.deleteFile(file.localPath);
      }
      await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -file.size } });
      await File.deleteOne({ _id: file._id });
      await logActivity({ userId: req.user._id, action: 'delete', fileId: file._id, details: `Permanently deleted ${file.name}`, ...getClientInfo(req) });
      res.json({ message: 'File permanently deleted' });
    } else {
      file.trashed = true;
      file.trashedAt = new Date();
      await file.save();
      await logActivity({ userId: req.user._id, action: 'trash', fileId: file._id, details: `Moved to trash: ${file.name}`, ...getClientInfo(req) });
      res.json({ message: 'File moved to trash', file });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// POST /api/files/move - Move file
router.post('/move', authenticate, async (req, res) => {
  try {
    const { fileId, newFolderId, oldFolderId } = req.body;
    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const newFolder = newFolderId ? await Folder.findById(newFolderId) : null;
    const oldFolder = oldFolderId ? await Folder.findById(oldFolderId) : null;

    // Only move in Google Drive for Google-stored files in a Google folder
    if (file.storageType === 'google' && file.googleFileId && newFolder?.googleFolderId) {
      const { accessToken, refreshToken } = getTokens(req.user);
      await driveService.moveFile(accessToken, refreshToken, file.googleFileId, newFolder.googleFolderId, oldFolder?.googleFolderId);
    }

    file.folderId = newFolderId || null;
    await file.save();
    await logActivity({ userId: req.user._id, action: 'move', fileId: file._id, details: `Moved to folder`, ...getClientInfo(req) });
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move file' });
  }
});

// POST /api/files/copy - Copy file
router.post('/copy', authenticate, async (req, res) => {
  try {
    const { fileId, targetFolderId } = req.body;
    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const copyName = `Copy of ${file.name}`;
    let googleFileId = '';
    let localPath = '';

    if (file.storageType === 'google' && file.googleFileId) {
      const { accessToken, refreshToken } = getTokens(req.user);
      const driveCopy = await driveService.copyFile(accessToken, refreshToken, file.googleFileId, copyName);
      googleFileId = driveCopy.id || '';
    } else {
      const copy = await localService.copyFile(file.localPath, copyName);
      localPath = copy.filePath;
    }

    const newFile = await File.create({
      ...file.toObject(),
      _id: undefined,
      googleFileId,
      storageType: file.storageType,
      localPath,
      name: copyName,
      folderId: targetFolderId || file.folderId,
      starred: false,
      pinned: false,
      versions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ file: newFile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to copy file' });
  }
});

// POST /api/files/star - Star/unstar file
router.post('/star', authenticate, async (req, res) => {
  try {
    const { fileId } = req.body;
    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    file.starred = !file.starred;
    await file.save();
    await logActivity({ userId: req.user._id, action: file.starred ? 'star' : 'unstar', fileId: file._id, ...getClientInfo(req) });
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update star' });
  }
});

// POST /api/files/trash - Trash/restore
router.post('/trash', authenticate, async (req, res) => {
  try {
    const { fileId, restore } = req.body;
    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (restore) {
      file.trashed = false;
      file.trashedAt = null;
      await logActivity({ userId: req.user._id, action: 'restore', fileId: file._id, ...getClientInfo(req) });
    } else {
      file.trashed = true;
      file.trashedAt = new Date();
      await logActivity({ userId: req.user._id, action: 'trash', fileId: file._id, ...getClientInfo(req) });
    }

    await file.save();
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trash status' });
  }
});

// POST /api/files/:id/version - Upload new version
router.post('/:id/version', authenticate, upload.single('file'), async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    let googleFileId = '';
    let localPath = '';

    if (file.storageType === 'google' && req.user.googleConnected) {
      const { accessToken, refreshToken } = getTokens(req.user);
      const driveFile = await driveService.uploadFile(accessToken, refreshToken, {
        name: file.name,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });
      googleFileId = driveFile.id || '';
    } else {
      const saved = await localService.saveBuffer(req.file.buffer, file.originalName || file.name);
      localPath = saved.filePath;
    }

    const newVersion = file.currentVersion + 1;
    file.versions.push({
      googleFileId,
      localPath,
      versionNumber: newVersion,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
      note: req.body.note || '',
    });
    file.googleFileId = googleFileId;
    file.localPath = localPath;
    file.currentVersion = newVersion;
    file.size = req.file.size;
    file.updatedAt = new Date();
    await file.save();

    await logActivity({ userId: req.user._id, action: 'version_upload', fileId: file._id, details: `Version ${newVersion}`, ...getClientInfo(req) });
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload version' });
  }
});

// POST /api/files/:id/restore-version
router.post('/:id/restore-version', authenticate, async (req, res) => {
  try {
    const { versionNumber } = req.body;
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const targetVersion = file.versions.find(v => v.versionNumber === parseInt(versionNumber));
    if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

    // Set current version to the target's googleFileId / localPath
    file.googleFileId = targetVersion.googleFileId;
    file.localPath = targetVersion.localPath;
    file.currentVersion = targetVersion.versionNumber;
    file.size = targetVersion.size;
    file.updatedAt = new Date();
    await file.save();

    await logActivity({ userId: req.user._id, action: 'version_restore', fileId: file._id, details: `Restored to version ${versionNumber}`, ...getClientInfo(req) });
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// GET /api/files/:id/download - Download file via proxy
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mimeType);

    if (file.storageType === 'google' && file.googleFileId) {
      const { accessToken, refreshToken } = getTokens(req.user);
      const stream = await driveService.getFileStream(accessToken, refreshToken, file.googleFileId);
      stream.pipe(res);
    } else {
      // Local storage
      const stream = localService.createReadStream(file.localPath);
      stream.pipe(res);
    }

    file.downloadCount += 1;
    await file.save();
    await logActivity({ userId: req.user._id, action: 'download', fileId: file._id, ...getClientInfo(req) });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
