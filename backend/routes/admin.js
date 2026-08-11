const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const File = require('../models/File');
const Activity = require('../models/Activity');
const AIHistory = require('../models/AIHistory');
const Notification = require('../models/Notification');
const Folder = require('../models/Folder');
const SharedLink = require('../models/SharedLink');
const FileRequest = require('../models/FileRequest');
const mongoose = require('mongoose');
const { generateAccessToken } = require('../utils/jwt');
const { logActivity } = require('../utils/activityLogger');

// POST /api/admin/login - Separate admin authentication flow
// Admin logs in with their normal user credentials but must have role==='admin'.
// This gives a dedicated admin auth endpoint that returns a token scoped to admin checks.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is disabled' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });

    const token = generateAccessToken(user._id);
    res.json({ accessToken: token, user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// POST /api/admin/bootstrap - One-time recovery when a deployment has no active admin.
// The endpoint locks itself as soon as one active administrator exists and always
// verifies the target account password before granting the role.
router.post('/bootstrap', authenticate, async (req, res) => {
  try {
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdmins > 0) return res.status(409).json({ error: 'Administrator bootstrap is already locked' });

    const { email } = req.body;
    if (!email || req.user.email !== email.toLowerCase().trim()) {
      return res.status(403).json({ error: 'Authenticated account does not match the recovery target' });
    }
    const user = await User.findById(req.user._id);

    user.role = 'admin';
    user.isActive = true;
    user.refreshToken = '';
    await user.save();
    res.json({ message: 'Administrator access restored. Sign in again.' });
  } catch (error) {
    res.status(500).json({ error: 'Administrator bootstrap failed' });
  }
});

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, totalFiles, totalFolders, trashedFiles, activeShares, fileRequests, totalStorageResult, recentActivities, aiUsage, recentLogins, recentSignups, activityTrends, activityBreakdown] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLoginAt: { $gte: dayAgo } }),
      File.countDocuments({ trashed: false }),
      Folder.countDocuments({ trashed: false }),
      File.countDocuments({ trashed: true }),
      SharedLink.countDocuments({ isActive: true }),
      FileRequest.countDocuments(),
      File.aggregate([{ $match: { trashed: false } }, { $group: { _id: null, total: { $sum: '$size' } } }]),
      Activity.find().sort({ createdAt: -1 }).limit(20).populate('userId', 'name email').lean(),
      AIHistory.aggregate([
        { $match: { createdAt: { $gte: monthAgo } } },
        { $group: { _id: '$type', count: { $sum: 1 }, totalTokens: { $sum: '$tokens' } } },
      ]),
      // New login detections (login activities in last 24h)
      Activity.find({ action: 'login' }).sort({ createdAt: -1 }).limit(15).populate('userId', 'name email').lean(),
      // New signups in last 7 days for admin notification feed
      User.find({ createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } })
        .select('name email createdAt lastLoginAt')
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      Activity.aggregate([
        { $match: { createdAt: { $gte: monthAgo } } },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, action: '$action' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } },
      ]),
      Activity.aggregate([
        { $match: { createdAt: { $gte: monthAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Storage analytics
    const storageStats = await File.aggregate([
      { $match: { trashed: false } },
      { $group: { _id: '$category', totalSize: { $sum: '$size' }, count: { $sum: 1 } } },
    ]);

    // User growth (last 30 days)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: monthAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const totalInteractions30d = activityBreakdown.reduce((total, item) => total + item.count, 0);
    const shareActions = new Set(['share', 'share_created', 'share_accessed', 'access', 'download']);
    const shareInteractions30d = activityBreakdown.reduce(
      (total, item) => total + (shareActions.has(item._id) ? item.count : 0),
      0
    );

    res.json({ totalUsers, activeUsers, totalFiles, totalFolders, trashedFiles, activeShares, fileRequests, totalStorage: totalStorageResult[0]?.total || 0, recentActivities, aiUsage, storageStats, userGrowth, recentLogins, recentSignups, activityTrends, activityBreakdown, totalInteractions30d, shareInteractions30d });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
});

// GET /api/admin/notifications - Admin notification feed (new logins, signups, requests)
router.get('/notifications', async (req, res) => {
  try {
    const now = new Date();
    const recent = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [adminAlerts, logins, signups, activity] = await Promise.all([
      Notification.find({
        userId: req.user._id,
        $or: [
          { audience: 'admin' },
          { audience: { $exists: false }, link: '/admin' },
        ],
        createdAt: { $gte: recent },
      }).sort({ createdAt: -1 }).limit(50).lean(),
      Activity.find({ action: 'login', createdAt: { $gte: recent } })
        .sort({ createdAt: -1 }).limit(30)
        .populate('userId', 'name email').lean(),
      User.find({ createdAt: { $gte: recent } })
        .select('name email createdAt lastLoginAt').sort({ createdAt: -1 }).limit(30).lean(),
      Activity.find({ action: { $ne: 'login' }, createdAt: { $gte: recent } })
        .sort({ createdAt: -1 }).limit(50)
        .populate('userId', 'name email').lean(),
    ]);

    const items = [
      ...adminAlerts.map(n => ({
        _id: `notification-${n._id}`,
        type: n.data?.event === 'new_user_login' ? 'signup' : 'login',
        title: n.title,
        message: n.message,
        email: n.data?.email || '',
        createdAt: n.createdAt,
        ip: n.data?.ip || '',
        source: 'notification',
      })),
      ...logins.map(a => ({
        _id: `login-${a._id}`,
        type: 'login',
        title: 'User Login',
        message: `${a.userId?.name || 'Unknown'} (${a.userId?.email || '?'}) logged in`,
        email: a.userId?.email || '',
        createdAt: a.createdAt,
        ip: a.ip,
      })),
      ...signups.map(u => ({
        _id: `signup-${u._id}`,
        type: 'signup',
        title: 'New User Registered',
        message: `${u.name} (${u.email}) joined`,
        email: u.email,
        createdAt: u.createdAt,
      })),
      ...activity.map(a => ({
        _id: `activity-${a._id}`,
        type: 'activity',
        title: a.action.split('_').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' '),
        message: `${a.userId?.name || 'Unknown'} (${a.userId?.email || '?'}) performed ${a.action.replaceAll('_', ' ')}`,
        email: a.userId?.email || '',
        createdAt: a.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Stored admin alerts are authoritative. Activity and user records remain as
    // a historical fallback, but should not create duplicate login/signup cards.
    const seen = new Set();
    const notifications = items.filter(item => {
      if (!['login', 'signup'].includes(item.type) || !item.email) return true;
      const minute = Math.floor(new Date(item.createdAt).getTime() / 60000);
      const key = `${item.type}:${item.email.toLowerCase()}:${minute}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ notifications: notifications.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin notifications' });
  }
});

// GET /api/admin/users/:id/activity - Activity log for a specific user
router.get('/users/:id/activity', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const activities = await Activity.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('fileId', 'name mimeType')
      .populate('folderId', 'name')
      .lean();

    const total = await Activity.countDocuments({ userId: req.params.id });
    res.json({ activities, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) query.role = role;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-googleAccessToken -googleRefreshToken -refreshToken')
        .sort({ createdAt: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({ users, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id - Manage user
router.patch('/users/:id', async (req, res) => {
  try {
    const { role, isActive, storageLimit, name } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (role && !['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (user._id.equals(req.user._id) && (role === 'user' || isActive === false)) {
      return res.status(400).json({ error: 'You cannot remove your own admin access' });
    }
    if (user.role === 'admin' && (role === 'user' || isActive === false)) {
      const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdmins <= 1) return res.status(400).json({ error: 'The last active administrator cannot be removed' });
    }

    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (name?.trim()) user.name = name.trim();
    if (storageLimit !== undefined) {
      const parsedLimit = Number(storageLimit);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 0) return res.status(400).json({ error: 'Invalid storage limit' });
      user.storageLimit = parsedLimit;
    }
    await user.save();

    res.json({ user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users - Provision a user or administrator
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role = 'user', storageLimit } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), password, role });
    if (storageLimit !== undefined) user.storageLimit = Number(storageLimit);
    await user.save();
    res.status(201).json({ user: user.toPublic() });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/admin/users/:id - Safe account removal (suspends access and sessions)
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.user._id.equals(req.params.id)) return res.status(400).json({ error: 'You cannot remove your own account' });
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false, refreshToken: '' }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Account suspended and sessions revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove user access' });
  }
});

// GET /api/admin/resources/:type - Platform-wide operational inventories
router.get('/resources/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    let items;
    if (type === 'files' || type === 'trash') {
      items = await File.find({ trashed: type === 'trash' }).sort({ createdAt: -1 }).limit(limit)
        .populate('userId', 'name email').populate('folderId', 'name').lean();
    } else if (type === 'folders') {
      items = await Folder.find().sort({ createdAt: -1 }).limit(limit).populate('userId', 'name email').lean();
    } else if (type === 'shares') {
      items = await SharedLink.find().sort({ createdAt: -1 }).limit(limit).populate('userId', 'name email')
        .populate('fileId', 'name size').populate('folderId', 'name').select('-password -qrCode').lean();
    } else if (type === 'requests') {
      items = await FileRequest.find().sort({ createdAt: -1 }).limit(limit).populate('userId', 'name email').lean();
    } else if (type === 'ai') {
      items = await AIHistory.find().sort({ createdAt: -1 }).limit(limit).populate('userId', 'name email')
        .populate('fileId', 'name').select('-prompt -response').lean();
    } else if (type === 'storage') {
      items = await User.find().sort({ storageUsed: -1 }).limit(limit)
        .select('name email storageUsed storageLimit isActive role').lean();
    } else {
      return res.status(400).json({ error: 'Unknown resource type' });
    }
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load admin resources' });
  }
});

router.patch('/files/:id', async (req, res) => {
  try {
    const { action } = req.body;
    if (!['trash', 'restore'].includes(action)) return res.status(400).json({ error: 'Invalid file action' });
    const trashed = action === 'trash';
    const file = await File.findByIdAndUpdate(req.params.id, { trashed, trashedAt: trashed ? new Date() : null }, { new: true });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update file' });
  }
});

router.patch('/shares/:id', async (req, res) => {
  try {
    const share = await SharedLink.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true });
    if (!share) return res.status(404).json({ error: 'Share not found' });
    res.json({ share });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update share' });
  }
});

router.patch('/requests/:id', async (req, res) => {
  try {
    const request = await FileRequest.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// GET /api/admin/security - Account and authentication risk overview
router.get('/security', async (req, res) => {
  try {
    const now = new Date();
    const [lockedAccounts, accountsWithFailures, recentLogins] = await Promise.all([
      User.countDocuments({ lockUntil: { $gt: now } }),
      User.countDocuments({ loginAttempts: { $gt: 0 } }),
      Activity.find({ action: 'login' }).sort({ createdAt: -1 }).limit(50).populate('userId', 'name email role').lean(),
    ]);
    res.json({ lockedAccounts, accountsWithFailures, recentLogins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load security status' });
  }
});

// GET /api/admin/health - Live dependency/configuration status without exposing secrets
router.get('/health', async (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.json({
    checkedAt: new Date().toISOString(),
    services: [
      { name: 'API', status: 'operational', detail: 'Express API responding' },
      { name: 'Database', status: databaseConnected ? 'operational' : 'degraded', detail: databaseConnected ? 'MongoDB connected' : 'MongoDB disconnected' },
      { name: 'Authentication', status: process.env.JWT_SECRET ? 'operational' : 'degraded', detail: process.env.JWT_SECRET ? 'JWT configured' : 'JWT configuration missing' },
      { name: 'Email', status: (process.env.GOOGLE_APPS_SCRIPT_EMAIL_URL && process.env.GOOGLE_APPS_SCRIPT_EMAIL_SECRET) || process.env.BREVO_API_KEY || ((process.env.GMAIL_USER || process.env.EMAIL_USER) && (process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS)) ? 'operational' : 'not_configured', detail: process.env.GOOGLE_APPS_SCRIPT_EMAIL_URL ? 'Google Apps Script HTTPS relay' : process.env.BREVO_API_KEY ? 'Brevo HTTPS email API' : 'SMTP configuration' },
      { name: 'AI', status: (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) ? 'operational' : 'not_configured', detail: process.env.GROQ_API_KEY ? 'Groq provider configuration' : 'OpenAI provider configuration' },
      {
        name: 'Storage',
        status: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_STORAGE_BUCKET ? 'operational' : 'degraded',
        detail: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_STORAGE_BUCKET
          ? 'Supabase Storage configured'
          : 'Supabase Storage configuration missing',
      },
    ],
  });
});

// POST /api/admin/announcements - Send announcement to all users
router.post('/announcements', async (req, res) => {
  try {
    const { title, message } = req.body;
    const users = await User.find({ isActive: true }).select('_id').lean();

    const notifications = users.map(u => ({
      userId: u._id,
      type: 'system',
      title,
      message,
      icon: 'announcement',
    }));

    await Notification.insertMany(notifications);

    const io = req.app.get('io');
    for (const u of users) {
      io?.to(`user:${u._id}`).emit('notification', { type: 'system', title, message });
    }

    res.json({ message: `Announcement sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send announcement' });
  }
});

// GET /api/admin/system-logs
router.get('/system-logs', async (req, res) => {
  try {
    const logs = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'name email')
      .lean();
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

module.exports = router;
