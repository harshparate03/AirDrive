const mongoose = require('mongoose');

const sharedLinkSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  permission: { type: String, enum: ['viewer', 'commenter', 'editor'], default: 'viewer' },
  password: { type: String, default: null }, // hashed
  expiresAt: { type: Date, default: null },
  downloadDisabled: { type: Boolean, default: false },
  accessCount: { type: Number, default: 0 },
  allowedEmails: [{ type: String }],
  isActive: { type: Boolean, default: true },
  qrCode: { type: String, default: '' },
  lastAccessedAt: { type: Date, default: null },
  lastAccessBy: { type: String, default: '' },
  accessedBy: [{
    email: { type: String, default: '' },
    ip: { type: String, default: '' },
    device: { type: String, default: '' },
    accessedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

sharedLinkSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Check if link is expired
sharedLinkSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('SharedLink', sharedLinkSchema);
