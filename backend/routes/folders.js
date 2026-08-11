const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Folder = require('../models/Folder');
const File = require('../models/File');
const { logActivity, getClientInfo } = require('../utils/activityLogger');
const { decrypt } = require('../utils/encryption');
const driveService = require('../services/googleDrive');
const storageService = require('../services/supabaseStorage');

const getTokens = (user) => ({
  accessToken: decrypt(user.googleAccessToken),
  refreshToken: decrypt(user.googleRefreshToken),
});

// GET /api/folders - List folders
router.get('/', authenticate, async (req, res) => {
  try {
    const { parentFolder, starred, trashed } = req.query;
    const query = { userId: req.user._id };

    if (parentFolder !== undefined) query.parentFolder = parentFolder || null;
    if (starred === 'true') query.starred = true;
    if (trashed === 'true') query.trashed = true;
    else if (!trashed) query.trashed = false;

    const folders = await Folder.find(query).sort({ name: 1 }).lean();
    res.json({ folders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /api/folders - Create folder
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, parentFolder, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name required' });

    // Build path
    let pathArr = [];
    let parent = null;
    if (parentFolder) {
      parent = await Folder.findOne({ _id: parentFolder, userId: req.user._id, trashed: false });
      if (!parent) return res.status(404).json({ error: 'Parent folder not found' });
      pathArr = [...(parent.path || []), parent._id];
    }

    const folder = await Folder.create({
      userId: req.user._id,
      name: name.trim(),
      parentFolder: parentFolder || null,
      color: color || '#6366f1',
      icon: icon || 'folder',
      path: pathArr,
    });

    await logActivity({ userId: req.user._id, action: 'create_folder', folderId: folder._id, details: `Created folder: ${name}`, ...getClientInfo(req) });
    res.status(201).json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PATCH /api/folders/:id - Update folder
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, color, icon, pinned, starred, description } = req.body;
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    if (name !== undefined) folder.name = name;
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;
    if (pinned !== undefined) folder.pinned = pinned;
    if (starred !== undefined) folder.starred = starred;
    if (description !== undefined) folder.description = description;

    await folder.save();
    await logActivity({ userId: req.user._id, action: 'rename', folderId: folder._id, ...getClientInfo(req) });
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE /api/folders/:id - Delete folder
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { permanent = false } = req.query;
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const folderIds = [folder._id];
    for (let index = 0; index < folderIds.length; index += 1) {
      const children = await Folder.find({ parentFolder: folderIds[index], userId: req.user._id }).select('_id').lean();
      folderIds.push(...children.map(child => child._id));
    }

    if (permanent === 'true') {
      const files = await File.find({ folderId: { $in: folderIds }, userId: req.user._id });
      const { accessToken, refreshToken } = getTokens(req.user);
      for (const file of files) {
        if (file.storageType === 'supabase' && file.r2Key) {
          await storageService.deleteFileObjects(file);
        } else if (file.storageType === 'google' && file.googleFileId) {
          await driveService.deleteFile(accessToken, refreshToken, file.googleFileId);
        } else if (file.localPath) {
          await require('../services/localStorage').deleteFile(file.localPath);
        }
      }
      const removedSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
      await File.deleteMany({ _id: { $in: files.map(file => file._id) } });
      await Folder.deleteMany({ _id: { $in: folderIds }, userId: req.user._id });
      if (removedSize) await require('../models/User').findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -removedSize } });
    } else {
      const trashedAt = new Date();
      await Promise.all([
        Folder.updateMany({ _id: { $in: folderIds }, userId: req.user._id }, { trashed: true, trashedAt }),
        File.updateMany({ folderId: { $in: folderIds }, userId: req.user._id }, { trashed: true, trashedAt }),
      ]);
    }

    await logActivity({ userId: req.user._id, action: 'delete_folder', folderId: folder._id, details: `Deleted folder: ${folder.name}`, ...getClientInfo(req) });
    res.json({ message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// POST /api/folders/:id/restore - Restore a folder tree and its files
router.post('/:id/restore', authenticate, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id, trashed: true });
    if (!folder) return res.status(404).json({ error: 'Folder not found in trash' });
    const folderIds = [folder._id];
    for (let index = 0; index < folderIds.length; index += 1) {
      const children = await Folder.find({ parentFolder: folderIds[index], userId: req.user._id }).select('_id').lean();
      folderIds.push(...children.map(child => child._id));
    }
    await Promise.all([
      Folder.updateMany({ _id: { $in: folderIds }, userId: req.user._id }, { trashed: false, trashedAt: null }),
      File.updateMany({ folderId: { $in: folderIds }, userId: req.user._id }, { trashed: false, trashedAt: null }),
    ]);
    res.json({ message: 'Folder restored' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore folder' });
  }
});

// GET /api/folders/:id/contents - Get folder contents
router.get('/:id/contents', authenticate, async (req, res) => {
  try {
    const [folders, files] = await Promise.all([
      Folder.find({ parentFolder: req.params.id, userId: req.user._id, trashed: false }).lean(),
      File.find({ folderId: req.params.id, userId: req.user._id, trashed: false }).lean(),
    ]);
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id, trashed: false }).populate('path').lean();
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json({ folder, folders, files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folder contents' });
  }
});

module.exports = router;
