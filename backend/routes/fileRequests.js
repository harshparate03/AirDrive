const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const FileRequest = require('../models/FileRequest');
const { decrypt } = require('../utils/encryption');
const driveService = require('../services/googleDrive');
const { v4: uuidv4 } = require('uuid');

// POST /api/file-requests — create request
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, folderId, allowedTypes, maxFiles, maxSizeMB, expiresAt } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const token = uuidv4().replace(/-/g, '');
    const request = await FileRequest.create({
      userId: req.user._id,
      token,
      title,
      description: description || '',
      folderId: folderId || null,
      allowedTypes: allowedTypes || [],
      maxFiles: maxFiles || 10,
      maxSizeMB: maxSizeMB || 100,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    const url = `${process.env.CLIENT_URL}/request/${token}`;
    res.status(201).json({ request, url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create file request' });
  }
});

// GET /api/file-requests — list user's requests
router.get('/', authenticate, async (req, res) => {
  try {
    const requests = await FileRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).lean();
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/file-requests/:token — public view
router.get('/:token', optionalAuth, async (req, res) => {
  try {
    const request = await FileRequest.findOne({ token: req.params.token, isActive: true })
      .populate('userId', 'name photo');
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.isExpired()) return res.status(410).json({ error: 'Request expired' });

    res.json({ request: request.toObject() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// POST /api/file-requests/:token/upload — public upload
router.post('/:token/upload', upload.array('files', 20), async (req, res) => {
  try {
    const request = await FileRequest.findOne({ token: req.params.token, isActive: true });
    if (!request) return res.status(404).json({ error: 'Request not found or inactive' });
    if (request.isExpired()) return res.status(410).json({ error: 'Request expired' });
    if (!req.files?.length) return res.status(400).json({ error: 'No files provided' });

    // Check limits
    if (request.uploads.length + req.files.length > request.maxFiles) {
      return res.status(400).json({ error: `Max ${request.maxFiles} files allowed` });
    }

    const oversized = req.files.find(file => file.size > request.maxSizeMB * 1024 * 1024);
    if (oversized) return res.status(400).json({ error: `File ${oversized.originalname} exceeds ${request.maxSizeMB}MB limit` });
    if (request.allowedTypes.length > 0) {
      const disallowed = req.files.find(file => !request.allowedTypes.some(type =>
        file.mimetype === type || file.mimetype.startsWith(`${type.replace(/\/$/, '')}/`)
      ));
      if (disallowed) return res.status(400).json({ error: `File type ${disallowed.mimetype} is not allowed` });
    }

    // Get owner's tokens
    const User = require('../models/User');
    const owner = await User.findById(request.userId);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });
    if (!owner.googleConnected || !owner.googleAccessToken || !owner.googleRefreshToken) {
      return res.status(409).json({ error: 'The request owner must connect Google Drive before receiving files' });
    }

    const accessToken = decrypt(owner.googleAccessToken);
    const refreshToken = decrypt(owner.googleRefreshToken);

    const uploaded = [];
    try {
      const destination = request.folderId
        ? await require('../models/Folder').findOne({ _id: request.folderId, userId: owner._id, trashed: false })
        : null;
      if (request.folderId && !destination) return res.status(404).json({ error: 'Destination folder no longer exists' });

      for (const file of req.files) {
        const driveFile = await driveService.uploadFile(accessToken, refreshToken, {
          name: file.originalname,
          mimeType: file.mimetype,
          buffer: file.buffer,
          folderId: destination?.googleFolderId || null,
        });

        const uploadRecord = {
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          googleFileId: driveFile.id,
          uploaderEmail: req.body.email || 'anonymous',
        };
        uploaded.push(uploadRecord);
      }
    } catch (uploadError) {
      await Promise.allSettled(uploaded.map(item => driveService.deleteFile(accessToken, refreshToken, item.googleFileId)));
      throw uploadError;
    }

    request.uploads.push(...uploaded);

    request.accessCount += 1;
    await request.save();

    // Notify owner
    const { createNotification } = require('../utils/activityLogger');
    await createNotification(req.app.get('io'), request.userId, {
      type: 'upload',
      title: 'Files Received',
      message: `${req.files.length} file(s) uploaded to your request "${request.title}"`,
      icon: 'inbox',
    });

    res.json({ message: 'Files uploaded successfully', count: uploaded.length });
  } catch (error) {
    console.error('File request upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// DELETE /api/file-requests/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const request = await FileRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!request) return res.status(404).json({ error: 'Not found' });
    request.isActive = false;
    await request.save();
    res.json({ message: 'Request deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
