const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  audience: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true,
  },
  type: {
    type: String,
    enum: ['upload', 'share', 'access', 'share_request', 'storage_warning', 'login', 'comment', 'permission', 'system', 'ai'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  icon: { type: String, default: 'bell' },
  link: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, audience: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
