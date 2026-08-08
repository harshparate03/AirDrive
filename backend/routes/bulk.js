const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const File = require('../models/File');
const { decrypt } = require('../utils/encryption');
const driveService = require('../services/googleDrive');
const archiver = require('archiver');

const getTokens = (user) => ({
  accessToken: decrypt(user.googleAccessToken),
  refreshToken: decrypt(user.googleRefreshToken),
});

// POST /api/bulk/download-zip
router.post('/download-zip', authenticate, async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!fileIds?.length) return res.status(400).json({ error: 'fileIds required' });
    if (fileIds.length > 50) return res.status(400).json({ error: 'Max 50 files per ZIP' });

    const files = await File.find({ _id: { $in: fileIds }, userId: req.user._id, trashed: false });
    if (!files.length) return res.status(404).json({ error: 'No files found' });

    const { accessToken, refreshToken } = getTokens(req.user);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="airdrive-${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    for (const file of files) {
      try {
        const stream = await driveService.getFileStream(accessToken, refreshToken, file.googleFileId);
        archive.append(stream, { name: file.name });
      } catch (err) {
        console.warn(`Skipping ${file.name}:`, err.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('ZIP error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create ZIP', details: error.message });
    }
  }
});

// POST /api/bulk/delete
router.post('/delete', authenticate, async (req, res) => {
  try {
    const { fileIds, permanent = false } = req.body;
    if (!fileIds?.length) return res.status(400).json({ error: 'fileIds required' });

    const files = await File.find({ _id: { $in: fileIds }, userId: req.user._id });
    if (!files.length) return res.status(404).json({ error: 'No files found' });

    if (permanent === true) {
      const { accessToken, refreshToken } = getTokens(req.user);
      for (const file of files) {
        try { await driveService.deleteFile(accessToken, refreshToken, file.googleFileId); } catch (_) {}
      }
      await File.deleteMany({ _id: { $in: fileIds }, userId: req.user._id });
    } else {
      await File.updateMany(
        { _id: { $in: fileIds }, userId: req.user._id },
        { trashed: true, trashedAt: new Date() }
      );
    }

    res.json({ message: `${files.length} file(s) ${permanent ? 'permanently deleted' : 'moved to trash'}` });
  } catch (error) {
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// POST /api/bulk/move
router.post('/move', authenticate, async (req, res) => {
  try {
    const { fileIds, folderId } = req.body;
    if (!fileIds?.length) return res.status(400).json({ error: 'fileIds required' });

    await File.updateMany(
      { _id: { $in: fileIds }, userId: req.user._id },
      { folderId: folderId || null }
    );

    res.json({ message: `${fileIds.length} file(s) moved` });
  } catch (error) {
    res.status(500).json({ error: 'Bulk move failed' });
  }
});

// POST /api/bulk/star
router.post('/star', authenticate, async (req, res) => {
  try {
    const { fileIds, starred = true } = req.body;
    if (!fileIds?.length) return res.status(400).json({ error: 'fileIds required' });

    await File.updateMany(
      { _id: { $in: fileIds }, userId: req.user._id },
      { starred }
    );

    res.json({ message: `${fileIds.length} file(s) ${starred ? 'starred' : 'unstarred'}` });
  } catch (error) {
    res.status(500).json({ error: 'Bulk star failed' });
  }
});

module.exports = router;
