const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');

// Personal notifications only. Legacy records did not have an audience, so keep
// them unless they are identifiable as the old admin-only platform alerts.
const personalNotificationQuery = (userId) => ({
  userId,
  $or: [
    { audience: 'user' },
    { audience: { $exists: false }, link: { $ne: '/admin' } },
  ],
});

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const query = personalNotificationQuery(req.user._id);
    if (unread === 'true') query.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments({ ...personalNotificationQuery(req.user._id), read: false }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, ...personalNotificationQuery(req.user._id) },
      { read: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { ...personalNotificationQuery(req.user._id), read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      ...personalNotificationQuery(req.user._id),
    });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
