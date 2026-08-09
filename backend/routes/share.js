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
const localService = require('../services/localStorage');
const { ensureFileText } = require('../services/textExtraction');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { getPublicClientUrl } = require('../utils/publicClientUrl');
const { sendTransactionalEmail } = require('../utils/sendEmail');

// Helper to get a user's Google tokens
const getTokens = (user) => ({
  accessToken: decrypt(user?.googleAccessToken || ''),
  refreshToken: decrypt(user?.googleRefreshToken || ''),
});

// POST /api/share - Create share link
router.post('/', authenticate, async (req, res) => {
  try {
    const { fileId, folderId, permission = 'viewer', password, expiresAt, downloadDisabled = false, allowedEmails = [] } = req.body;

    if ((!fileId && !folderId) || (fileId && folderId)) {
      return res.status(400).json({ error: 'Provide exactly one fileId or folderId' });
    }
    if (permission !== 'viewer') {
      return res.status(400).json({ error: 'Only viewer links are currently supported' });
    }
    let expiryDate = null;
    if (expiresAt) {
      expiryDate = new Date(expiresAt);
      if (Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'Expiry must be a valid future date and time' });
      }
    }

    const ownedItem = fileId
      ? await File.findOne({ _id: fileId, userId: req.user._id, trashed: false }).select('_id')
      : await Folder.findOne({ _id: folderId, userId: req.user._id, trashed: false }).select('_id');
    if (!ownedItem) return res.status(404).json({ error: 'File or folder not found' });

    const token = uuidv4().replace(/-/g, '');
    const shareUrl = `${getPublicClientUrl(req)}/share/${token}`;

    const qrCode = await QRCode.toDataURL(shareUrl);

    const shareLink = await SharedLink.create({
      fileId: fileId || null,
      folderId: folderId || null,
      userId: req.user._id,
      token,
      permission,
      password: password ? hashPassword(password) : null,
      expiresAt: expiryDate,
      downloadDisabled,
      allowedEmails: Array.isArray(allowedEmails)
        ? [...new Set(allowedEmails.map(email => String(email).trim().toLowerCase()).filter(Boolean))]
        : [],
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
      const email = req.user?.email?.toLowerCase();
      if (!email || !shareLink.allowedEmails.map(item => item.toLowerCase()).includes(email)) {
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
      const file = await File.findOne({ _id: shareLink.fileId, userId: shareLink.userId, trashed: false }).lean();
      content = file ? { type: 'file', file } : null;
    } else if (shareLink.folderId) {
      const folder = await Folder.findOne({ _id: shareLink.folderId, userId: shareLink.userId, trashed: false }).lean();
      const [files, folders] = await Promise.all([
        File.find({ folderId: shareLink.folderId, userId: shareLink.userId, trashed: false }).lean(),
        Folder.find({ parentFolder: shareLink.folderId, userId: shareLink.userId, trashed: false }).lean(),
      ]);
      content = folder ? { type: 'folder', folder, files, folders } : null;
    }
    if (!content) return res.status(404).json({ error: 'Shared item no longer exists' });

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
const resolveShare = async (token, password, user) => {
  const shareLink = await SharedLink.findOne({ token, isActive: true });
  if (!shareLink) return { error: { status: 404, message: 'Share link not found or expired' } };
  if (shareLink.isExpired()) return { error: { status: 410, message: 'Share link has expired' } };
  if (shareLink.password && shareLink.password !== hashPassword(password || '')) {
    return { error: { status: 401, message: 'Incorrect password' } };
  }
  if (shareLink.allowedEmails.length > 0) {
    const email = user?.email?.toLowerCase();
    if (!email || !shareLink.allowedEmails.map(item => item.toLowerCase()).includes(email)) {
      return { error: { status: 403, message: 'Access restricted to specific users' } };
    }
  }
  return { shareLink };
};

// GET /api/share/:token/preview-info - Extracted content for shared documents
router.get('/:token/preview-info', optionalAuth, async (req, res) => {
  try {
    const { shareLink, error } = await resolveShare(req.params.token, req.query.password, req.user);
    if (error) return res.status(error.status).json({ error: error.message });
    if (!shareLink.fileId) return res.status(400).json({ error: 'Preview only available for files' });

    const [file, owner] = await Promise.all([
      File.findOne({ _id: shareLink.fileId, userId: shareLink.userId, trashed: false }),
      User.findById(shareLink.userId),
    ]);
    if (!file || !owner) return res.status(404).json({ error: 'File not found' });

    const available = file.storageType === 'google'
      ? Boolean(file.googleFileId)
      : localService.fileExists(file.localPath);
    if (!available) return res.status(410).json({ error: 'File content is no longer available', code: 'FILE_CONTENT_MISSING' });

    const extension = (file.extension || '').toLowerCase();
    const extractable = (file.mimeType || '').startsWith('text/') || file.mimeType === 'application/pdf' ||
      ['.txt', '.md', '.csv', '.json', '.xml', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.zip'].includes(extension);
    const text = extractable ? await ensureFileText(file, owner).catch(() => '') : '';

    res.json({ preview: { text: text.slice(0, 50000), available: true, extractable } });
  } catch (error) {
    console.error('Shared preview info error:', error);
    res.status(500).json({ error: 'Failed to prepare shared file preview' });
  }
});

// GET /api/share/:token/preview - Inline preview of a shared file
router.get('/:token/preview', optionalAuth, async (req, res) => {
  try {
    const { password } = req.query;
    const { shareLink, error } = await resolveShare(req.params.token, password, req.user);
    if (error) return res.status(error.status).json({ error: error.message });
    if (!shareLink.fileId) return res.status(400).json({ error: 'Preview only available for files' });

    const file = await File.findOne({ _id: shareLink.fileId, userId: shareLink.userId, trashed: false });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.storageType !== 'google' && !localService.fileExists(file.localPath)) {
      return res.status(410).json({ error: 'File content is no longer available', code: 'FILE_CONTENT_MISSING' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (file.storageType === 'google' && file.googleFileId) {
      const { accessToken, refreshToken } = getTokens(await User.findById(shareLink.userId));
      const stream = await driveService.getFileStream(accessToken, refreshToken, file.googleFileId);
      stream.pipe(res);
    } else {
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
    const { shareLink, error } = await resolveShare(req.params.token, password, req.user);
    if (error) return res.status(error.status).json({ error: error.message });
    if (shareLink.downloadDisabled) return res.status(403).json({ error: 'Download is disabled for this share link' });
    if (!shareLink.fileId) return res.status(400).json({ error: 'Download only available for files' });

    const file = await File.findOne({ _id: shareLink.fileId, userId: shareLink.userId, trashed: false });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.storageType !== 'google' && !localService.fileExists(file.localPath)) {
      return res.status(410).json({ error: 'File content is no longer available', code: 'FILE_CONTENT_MISSING' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

    if (file.storageType === 'google' && file.googleFileId) {
      const { accessToken, refreshToken } = getTokens(await User.findById(shareLink.userId));
      const stream = await driveService.getFileStream(accessToken, refreshToken, file.googleFileId);
      stream.pipe(res);
    } else {
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
    const { email, shareLinkId } = req.body;
    if (!email || !shareLinkId) return res.status(400).json({ error: 'Email and shareLinkId are required' });
    const shareLink = await SharedLink.findOne({ _id: shareLinkId, userId: req.user._id, isActive: true })
      .populate('fileId', 'name')
      .populate('folderId', 'name');
    if (!shareLink) return res.status(404).json({ error: 'Share link not found' });
    const shareUrl = `${getPublicClientUrl(req)}/share/${shareLink.token}`;
    const fileName = shareLink.fileId?.name || shareLink.folderId?.name || 'Shared item';
    const permission = shareLink.permission;
    const safeName = String(fileName).replace(/[<>&"']/g, '');
    await sendTransactionalEmail({
      to: email,
      subject: `${req.user.name} shared "${safeName}" with you`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Air Drive</h2>
          <p><strong>${req.user.name}</strong> (${req.user.email}) has shared a file with you.</p>
          <p><strong>Item:</strong> ${safeName}</p>
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
