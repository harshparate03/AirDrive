const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  type: {
    type: String,
    enum: ['chat', 'summary', 'tags', 'rename', 'ocr', 'folder_suggestion', 'duplicate_detection', 'smart_search'],
    required: true,
  },
  prompt: { type: String, default: '' },
  response: { type: String, default: '' },
  tokens: { type: Number, default: 0 },
  model: { type: String, default: 'gpt-4o-mini' },
  duration: { type: Number, default: 0 }, // ms
  createdAt: { type: Date, default: Date.now },
});

aiHistorySchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('AIHistory', aiHistorySchema);
