const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Comment = require('../models/Comment');
const File = require('../models/File');
const { createNotification, getClientInfo } = require('../utils/activityLogger');

// GET /api/comments/:fileId
router.get('/:fileId', authenticate, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const comments = await Comment.find({ fileId: req.params.fileId, parentId: null })
      .populate('userId', 'name photo email')
      .sort({ createdAt: 1 })
      .lean();

    // Attach replies
    const replies = await Comment.find({ fileId: req.params.fileId, parentId: { $ne: null } })
      .populate('userId', 'name photo email')
      .sort({ createdAt: 1 })
      .lean();

    const withReplies = comments.map(c => ({
      ...c,
      replies: replies.filter(r => r.parentId?.toString() === c._id.toString()),
    }));

    res.json({ comments: withReplies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/comments/:fileId
router.post('/:fileId', authenticate, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

    const file = await File.findOne({ _id: req.params.fileId, userId: req.user._id, trashed: false });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const comment = await Comment.create({
      fileId: req.params.fileId,
      userId: req.user._id,
      text: text.trim(),
      parentId: parentId || null,
    });

    await comment.populate('userId', 'name photo email');

    // Notify file owner if different user
    if (file.userId.toString() !== req.user._id.toString()) {
      const io = req.app.get('io');
      await createNotification(io, file.userId, {
        type: 'comment',
        title: 'New Comment',
        message: `${req.user.name} commented on "${file.name}"`,
        data: { fileId: file._id, commentId: comment._id },
        icon: 'chat',
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// PATCH /api/comments/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const { text, resolved } = req.body;
    if (text !== undefined) { comment.text = text.trim(); comment.editedAt = new Date(); }
    if (resolved !== undefined) comment.resolved = resolved;
    await comment.save();
    await comment.populate('userId', 'name photo email');

    res.json({ comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    // Delete replies too
    await Comment.deleteMany({ parentId: comment._id });
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
