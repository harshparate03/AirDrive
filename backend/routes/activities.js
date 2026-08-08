const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Activity = require('../models/Activity');

// GET /api/activities
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, fileId, from, to } = req.query;
    const query = { userId: req.user._id };

    if (action) query.action = action;
    if (fileId) query.fileId = fileId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('fileId', 'name mimeType category')
        .populate('folderId', 'name')
        .lean(),
      Activity.countDocuments(query),
    ]);

    // Activity heatmap - last 365 days
    // Exclude delete/trash/logout actions so historical graphs reflect real activity,
    // not data the user has deleted or moved to trash.
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const excludedActions = ['delete', 'trash', 'delete_folder', 'logout'];
    const heatmap = await Activity.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: yearAgo },
          action: { $nin: excludedActions },
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ activities, total, page: parseInt(page), heatmap });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

module.exports = router;
