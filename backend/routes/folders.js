const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Folder = require('../models/Folder');
const File = require('../models/File');
const { logActivity, getClientInfo } = require('../utils/activityLogger');
const { decrypt } = require('../utils/encryption');
const driveService = require('../services/googleDrive');

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
    if (parentFolder) {
      const parent = await Folder.findById(parentFolder);
      if (parent) pathArr = [...(parent.path || []), parent._id];
    }

    const folder = await Folder.create({
      userId: req.user._id,
      name,
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

    if (permanent === 'true') {
      // Recursively delete all children
      const deleteRecursive = async (folderId) => {
        const subFolders = await Folder.find({ parentFolder: folderId, userId: req.user._id });
        for (const sub of subFolders) await deleteRecursive(sub._id);
        await File.deleteMany({ folderId, userId: req.user._id });
        await Folder.deleteOne({ _id: folderId });
      };
      await deleteRecursive(folder._id);
    } else {
      folder.trashed = true;
      folder.trashedAt = new Date();
      await folder.save();
    }

    await logActivity({ userId: req.user._id, action: 'delete_folder', folderId: folder._id, details: `Deleted folder: ${folder.name}`, ...getClientInfo(req) });
    res.json({ message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// GET /api/folders/:id/contents - Get folder contents
router.get('/:id/contents', authenticate, async (req, res) => {
  try {
    const [folders, files] = await Promise.all([
      Folder.find({ parentFolder: req.params.id, userId: req.user._id, trashed: false }).lean(),
      File.find({ folderId: req.params.id, userId: req.user._id, trashed: false }).lean(),
    ]);
    const folder = await Folder.findById(req.params.id).populate('path').lean();
    res.json({ folder, folders, files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folder contents' });
  }
});

module.exports = router;
