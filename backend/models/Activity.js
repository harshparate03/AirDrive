const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'upload', 'download', 'delete', 'restore', 'share', 'view',
      'rename', 'move', 'copy', 'star', 'unstar', 'trash', 'login',
      'logout', 'create_folder', 'delete_folder', 'ai_tag', 'ai_rename',
      'ai_chat', 'ai_summary', 'ai_search', 'ai_folder_suggestion', 'duplicate_scan',
      'ocr', 'comment', 'permission_change', 'version_upload', 'version_restore',
    ],
    required: true,
  },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  details: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
  device: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, action: 1 });
activitySchema.index({ fileId: 1 });

module.exports = mongoose.model('Activity', activitySchema);
