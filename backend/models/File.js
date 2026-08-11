const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  googleFileId: { type: String, default: '' },
  r2Key: { type: String, default: '' },
  localPath: { type: String, default: '' },
  versionNumber: { type: Number, required: true },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String, default: '' },
});

const fileSchema = new mongoose.Schema({
  googleFileId: { type: String, default: '' },
  r2Key: { type: String, default: '' },
  storageType: { type: String, enum: ['supabase', 'r2', 'google', 'local'], default: 'supabase' },
  localPath: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, default: 'application/octet-stream' },
  extension: { type: String, default: '' },
  size: { type: Number, default: 0 },
  thumbnail: { type: String, default: '' },
  webViewLink: { type: String, default: '' },
  webContentLink: { type: String, default: '' },
  starred: { type: Boolean, default: false },
  trashed: { type: Boolean, default: false },
  trashedAt: { type: Date, default: null },
  pinned: { type: Boolean, default: false },
  color: { type: String, default: '' },
  aiTags: [{ type: String }],
  aiRenamedFrom: { type: String, default: '' },
  ocrText: { type: String, default: '' },
  textExtractionStatus: { type: String, enum: ['pending', 'complete', 'unsupported', 'failed'], default: 'pending' },
  description: { type: String, default: '' },
  labels: [{ type: String }],
  versions: [versionSchema],
  currentVersion: { type: Number, default: 1 },
  sharedWith: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    permission: { type: String, enum: ['viewer', 'commenter', 'editor', 'owner'], default: 'viewer' },
    sharedAt: { type: Date, default: Date.now },
  }],
  isPublic: { type: Boolean, default: false },
  downloadCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  lastViewedAt: { type: Date, default: null },
  category: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'spreadsheet', 'presentation', 'pdf', 'archive', 'code', 'other'],
    default: 'other',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

fileSchema.index({ userId: 1, trashed: 1 });
fileSchema.index({ userId: 1, starred: 1 });
fileSchema.index({ userId: 1, folderId: 1 });
fileSchema.index({ name: 'text', ocrText: 'text', aiTags: 'text' });
fileSchema.index({ userId: 1, createdAt: -1 });

fileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Auto-set category from mimeType
fileSchema.pre('save', function (next) {
  const mime = this.mimeType || '';
  if (mime.startsWith('image/')) this.category = 'image';
  else if (mime.startsWith('video/')) this.category = 'video';
  else if (mime.startsWith('audio/')) this.category = 'audio';
  else if (mime === 'application/pdf') this.category = 'pdf';
  else if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) this.category = 'spreadsheet';
  else if (mime.includes('presentation') || mime.includes('powerpoint')) this.category = 'presentation';
  else if (mime.includes('document') || mime.includes('word') || mime.includes('text/')) this.category = 'document';
  else if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('compressed')) this.category = 'archive';
  next();
});

module.exports = mongoose.model('File', fileSchema);
