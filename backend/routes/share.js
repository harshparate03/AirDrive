const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const SharedLink = require('../models/SharedLink');
const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');
const { logActivity, createNotification, getClientInfo } = require('../utils/activityLogger');
const { hashPassword } = require('../utils/encryption');
const { decrypt } = require('../utils/encryption');
const driveService = require('../services/googleDrive');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Helper to get a user's Google tokens
const getTokens = (user) => ({
  accessToken: decrypt(user?.googleAccessToken || ''),
  refreshToken: decrypt(user?.googleRefreshToken || ''),
});

// POST /api/share - Create share link
router.post('/', authenticate, async (req, res) => {
  try {
    const { fileId, folderId, permission = 'viewer', password, expiresAt, downloadDisabled = false, allowedEmails = [] } = req.body;

    if (!fileId && !folderId) {
      return res.status(400).json({ error: 'fileId or folderId required' });
    }

    const token = uuidv4().replace(/-/g, '');
    const shareUrl = `${process.env.CLIENT_URL}/share/${token}`;

    const qrCode = await QRCode.toDataURL(shareUrl);

    const shareLink = await SharedLink.create({
      fileId: fileId || null,
      folderId: folderId || null,
      userId: req.user._id,
      token,
      permission,
      password: password ? hashPassword(password) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      downloadDisabled,
      allowedEmails,
      qrCode,
    });

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'share',
      fileId: fileId || null,
      folderId: folderId || null,
      details: `Created share link`,
      ...getClientInfo(req),
    });

    const io = req.app.get('io');
    await createNotification(io, req.user._id, {
      type: 'share',
      title: 'Share Link Created',
      message: `Share link created with ${permission} access`,
      icon: 'share',
    });

    res.status(201).json({ shareLink, shareUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// GET /api/share/:token - Access shared content
router.get('/:token', optionalAuth, async (req, res) => {
  try {
    const { password } = req.query;
    const shareLink = await SharedLink.findOne({ token: req.params.token, isActive: true });

    if (!shareLink) return res.status(404).json({ error: 'Share link not found or expired' });
    if (shareLink.isExpired()) return res.status(410).json({ error: 'Share link has expired' });

    // Password check
    if (shareLink.password) {
      if (!password) return res.status(401).json({ error: 'Password required', passwordRequired: true });
      if (shareLink.password !== hashPassword(password)) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

// Email whitelist check
    if (shareLink.allowedEmails.length > 0) {
      if (!req.user || !shareLink.allowedEmails.includes(req.user.email)) {
        return res.status(403).json({ error: 'Access restricted to specific users' });
      }
    }

    // Record access with recipient info
    const clientInfo = getClientInfo(req);
    const accessorEmail = req.user?.email || 'anonymous';
    const wasFirstAccess = shareLink.accessCount === 0;
    shareLink.accessCount += 1;
    shareLink.lastAccessedAt = new Date();
    shareLink.lastAccessBy = accessorEmail;
    shareLink.accessedBy = shareLink.accessedBy || [];
    shareLink.accessedBy.push({
      email: accessorEmail,
      ip: clientInfo.ip,
      device: clientInfo.device.substring(0, 200),
      accessedAt: new Date(),
    });
    if (shareLink.accessedBy.length > 50) shareLink.accessedBy = shareLink.accessedBy.slice(-50);
    await shareLink.save();

    let content = null;
    if (shareLink.fileId) {
      content = await File.findById(shareLink.fileId).lean();
    } else if (shareLink.folderId) {
      const folder = await Folder.findById(shareLink.folderId).lean();
      const files = await File.find({ folderId: shareLink.folderId, trashed: false }).lean();
      content = { folder, files };
    }

    // Notify owner that the share was accessed
    try {
      const io = req.app.get('io');
      await createNotification(io, shareLink.userId, {
        type: 'access',
        title: 'Shared Item Accessed',
        message: `${accessorEmail} viewed your shared item`,
        data: { shareToken: shareLink.token, email: accessorEmail, firstAccess: wasFirstAccess },
        icon: 'eye',
      });
    } catch (_) {}

    res.json({ shareLink, content, hasBeenAccessed: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to access share link' });
  }
});

// Helper to resolve + authorize a share link
const resolveShare = async (token, password) => {
  const shareLink = await SharedLink.findOne({ token, isActive: true });
  if (!shareLink) return { error: { status: 404, message: 'Share link not found or expired' } };
  if (shareLink.isExpired()) return { error: { status: 410, message: 'Share link has expired' } };
  if (shareLink.password && shareLink.password !== hashPassword(password || '')) {
    return { error: { status: 401, message: 'Incorrect password' } };
  }
  return { shareLink };
};

// GET /api/share/:token/preview - Inline preview of a shared file
router.get('/:token/preview', optionalAuth, async (req, res) => {
  try {
    const { password } = req.query;
    const { shareLink, error } = await resolveShare(req.params.token, password);
    if (error) return res.status(error.status).json({ error: error.message });
    if (!shareLink.fileId) return res.status(400).json({ error: 'Preview only available for files' });

    const file = await File.findById(shareLink.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (file.storageType === 'google' && file.googleFileId) {
      const { accessToken, refreshToken } = getTokens(await User.findById(shareLink.userId));
      const stream = await driveService.getFileStream(accessToken, refreshToken, file.googleFileId);
      stream.pipe(res);
    } else {
      const localService = require('../services/localStorage');
      const stream = localService.createReadStream(file.localPath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to preview file' });
  }
});

// GET /api/share/:token/download - Download shared file (respects downloadDisabled)
router.get('/:token/download', optionalAuth, async (req, res) => {
  try {
    const { password } = req.query;
    const { shareLink, error } = await resolveShare(req.params.token, password);
    if (error) return res.status(error.status).json({ error: error.message });
    if (shareLink.downloadDisabled) return res.status(403).json({ error: 'Download is disabled for this share link' });
    if (!shareLink.fileId) return res.status(400).json({ error: 'Download only available for files' });

    const file = await File.findById(shareLink.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

    if (file.storageType === 'google' && file.googleFileId) {
      const { accessToken, refreshToken } = getTokens(await User.findById(shareLink.userId));
      const stream = await driveService.getFileStream(accessToken, refreshToken, file.googleFileId);
      stream.pipe(res);
    } else {
      const localService = require('../services/localStorage');
      const stream = localService.createReadStream(file.localPath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE /api/share/:id - Revoke share link
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const shareLink = await SharedLink.findOne({ _id: req.params.id, userId: req.user._id });
    if (!shareLink) return res.status(404).json({ error: 'Share link not found' });

    shareLink.isActive = false;
    await shareLink.save();

    res.json({ message: 'Share link revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

// GET /api/share - Get user's share links
router.get('/', authenticate, async (req, res) => {
  try {
    const shareLinks = await SharedLink.find({ userId: req.user._id, isActive: true })
      .populate('fileId', 'name mimeType size')
      .populate('folderId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ shareLinks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch share links' });
  }
});

// POST /api/share/email - Send share via email
router.post('/email', authenticate, async (req, res) => {
  try {
    const { email, shareUrl, fileName, permission } = req.body;
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"Air Drive" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${req.user.name} shared "${fileName}" with you`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Air Drive</h2>
          <p><strong>${req.user.name}</strong> (${req.user.email}) has shared a file with you.</p>
          <p><strong>File:</strong> ${fileName}</p>
          <p><strong>Access:</strong> ${permission}</p>
          <a href="${shareUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;">
            Open File
          </a>
        </div>
      `,
    });

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
