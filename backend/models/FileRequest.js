const mongoose = require('mongoose');

const fileRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  allowedTypes: [{ type: String }],
  maxFiles: { type: Number, default: 10 },
  maxSizeMB: { type: Number, default: 100 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  uploads: [{
    name: String,
    size: Number,
    mimeType: String,
    googleFileId: String,
    uploadedAt: { type: Date, default: Date.now },
    uploaderEmail: String,
  }],
  accessCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

fileRequestSchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

module.exports = mongoose.model('FileRequest', fileRequestSchema);
