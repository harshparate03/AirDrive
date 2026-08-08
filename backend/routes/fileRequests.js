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
      .populate('userId', 'name photo')
      .lean();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.isExpired?.()) return res.status(410).json({ error: 'Request expired' });

    res.json({ request });
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

    // Get owner's tokens
    const User = require('../models/User');
    const owner = await User.findById(request.userId);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    const accessToken = decrypt(owner.googleAccessToken);
    const refreshToken = decrypt(owner.googleRefreshToken);

    const uploaded = [];
    for (const file of req.files) {
      // Check size
      if (file.size > request.maxSizeMB * 1024 * 1024) {
        return res.status(400).json({ error: `File ${file.originalname} exceeds ${request.maxSizeMB}MB limit` });
      }

      const driveFile = await driveService.uploadFile(accessToken, refreshToken, {
        name: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
      });

      const uploadRecord = {
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        googleFileId: driveFile.id,
        uploaderEmail: req.body.email || 'anonymous',
      };
      request.uploads.push(uploadRecord);
      uploaded.push(uploadRecord);
    }

    request.accessCount += 1;
    await request.save();

    // Notify owner
    const io = global.io;
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: request.userId,
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
