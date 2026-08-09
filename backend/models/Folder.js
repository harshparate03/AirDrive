const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  googleFolderId: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  icon: { type: String, default: 'folder' },
  pinned: { type: Boolean, default: false },
  starred: { type: Boolean, default: false },
  trashed: { type: Boolean, default: false },
  trashedAt: { type: Date, default: null },
  description: { type: String, default: '' },
  sharedWith: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    permission: { type: String, enum: ['viewer', 'commenter', 'editor', 'owner'], default: 'viewer' },
    sharedAt: { type: Date, default: Date.now },
  }],
  isPublic: { type: Boolean, default: false },
  path: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }], // breadcrumb path
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

folderSchema.index({ userId: 1, parentFolder: 1 });
folderSchema.index({ userId: 1, trashed: 1 });
folderSchema.index({ name: 'text' });

folderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Folder', folderSchema);
