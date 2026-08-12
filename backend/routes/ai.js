const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const File = require('../models/File');
const AIHistory = require('../models/AIHistory');
const { decrypt } = require('../utils/encryption');
const { logActivity: logActivityFn, createNotification: createNotificationFn, getClientInfo: getClientInfoFn } = require('../utils/activityLogger');
const driveService = require('../services/googleDrive');
const { ensureFileText } = require('../services/textExtraction');
const OpenAI = require('openai');
const {
  isAIConfigured, getAIProvider, getAIKey, getAIBaseURL, getAIModel, generateLocalTags, summarizeLocally,
  suggestLocalName, suggestFoldersLocally, answerLocally,
} = require('../services/aiFallback');

const getOpenAI = () => new OpenAI({
  apiKey: getAIKey(),
  baseURL: getAIBaseURL(),
});

const getTokens = (user) => ({
  accessToken: decrypt(user.googleAccessToken),
  refreshToken: decrypt(user.googleRefreshToken),
});

// GET /api/ai/status - Safe provider status for the UI (never exposes credentials)
router.get('/status', authenticate, (req, res) => {
  res.json({
    configured: isAIConfigured(),
    mode: isAIConfigured() ? 'provider' : 'local',
    provider: isAIConfigured() ? getAIProvider() : 'local',
    model: isAIConfigured() ? getAIModel() : 'local-fallback',
  });
});

// POST /api/ai/chat - Chat with file / general AI chat
router.post('/chat', authenticate, async (req, res) => {
  const start = Date.now();
  const { message, fileId, conversationHistory = [] } = req.body;
  let contextFile = null;
  try {
    if (!message) return res.status(400).json({ error: 'Message required' });

    let systemPrompt = 'You are Air Drive AI Assistant, a helpful assistant for managing cloud files and documents.';
    let fileContext = '';
    if (fileId) {
      const file = await File.findOne({ _id: fileId, userId: req.user._id });
      if (file) {
        contextFile = file;
        await ensureFileText(file, req.user).catch(() => '');
        fileContext = `\nFile: ${file.name}\nType: ${file.mimeType}\nSize: ${file.size} bytes`;
        if (file.ocrText) fileContext += `\nContent:\n${file.ocrText.substring(0, 8000)}`;
        systemPrompt = `You are Air Drive AI. You are analyzing a file: ${file.name}. ${fileContext}`;
      }
    }

    if (!isAIConfigured()) {
      const response = answerLocally({ message, file: contextFile, content: contextFile?.ocrText });
      await AIHistory.create({ userId: req.user._id, fileId: fileId || null, type: 'chat', prompt: message, response, model: 'local-fallback', duration: Date.now() - start });
      await logActivityFn({ userId: req.user._id, action: 'ai_chat', fileId: fileId || null, details: 'Used AI assistant local fallback', ...getClientInfoFn(req) });
      return res.json({ response, tokens: 0, mode: 'local' });
    }

    const openai = getOpenAI();

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: getAIModel(),
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    const tokens = completion.usage?.total_tokens || 0;

    await AIHistory.create({
      userId: req.user._id,
      fileId: fileId || null,
      type: 'chat',
      prompt: message,
      response,
      tokens,
      model: getAIModel(),
      duration: Date.now() - start,
    });

    await logActivityFn({ userId: req.user._id, action: 'ai_chat', fileId: fileId || null, details: 'Used AI assistant', ...getClientInfoFn(req) });

    res.json({ response, tokens });
  } catch (error) {
    console.error('AI chat error:', error);
    const quotaUnavailable = error.status === 429 || error.code === 'insufficient_quota' || /no credits|quota/i.test(error.message || '');
    if (quotaUnavailable) {
      const response = answerLocally({ message, file: contextFile, content: contextFile?.ocrText });
      await AIHistory.create({ userId: req.user._id, fileId: fileId || null, type: 'chat', prompt: message, response, model: 'local-fallback', duration: Date.now() - start });
      await logActivityFn({ userId: req.user._id, action: 'ai_chat', fileId: fileId || null, details: 'Used local fallback because provider credits were unavailable', ...getClientInfoFn(req) });
      return res.json({ response, tokens: 0, mode: 'local', providerUnavailable: true });
    }
    res.status(500).json({ error: 'AI chat failed', details: error.message });
  }
});

// POST /api/ai/summary - Summarize file
router.post('/summary', authenticate, async (req, res) => {
  const start = Date.now();
  const { fileId, type = 'summary' } = req.body;
  let content = '';
  let file = null;
  try {
    file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const extractedText = await ensureFileText(file, req.user).catch(() => '');
    content = extractedText || `File: ${file.name}\nType: ${file.mimeType}`;
    const prompts = {
      summary: `Create a clear document summary with the headings "Overview" and "Main ideas". Use short paragraphs and bullet points.\n\n${content.substring(0, 8000)}`,
      explain: `Explain this document in simple language. Use the headings "Simple explanation", "What it means", and "Example" where relevant.\n\n${content.substring(0, 8000)}`,
      important: `Extract the most important points. Start with a one-sentence takeaway, then provide a concise bullet list under "Key points".\n\n${content.substring(0, 8000)}`,
      notes: `Create structured study notes with headings, bullet points, important terms, and a short review section.\n\n${content.substring(0, 8000)}`,
    };

    if (!isAIConfigured()) {
      const response = summarizeLocally(content, type);
      await AIHistory.create({ userId: req.user._id, fileId, type: 'summary', prompt: type, response, model: 'local-fallback', duration: Date.now() - start });
      await logActivityFn({ userId: req.user._id, action: 'ai_summary', fileId, details: `Generated local ${type}`, ...getClientInfoFn(req) });
      return res.json({ response, type, tokens: 0, mode: 'local' });
    }

    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: 'You are an expert document analyst.' },
        { role: 'user', content: prompts[type] || prompts.summary },
      ],
      max_tokens: 1500,
    });

    const response = completion.choices[0].message.content;
    const tokens = completion.usage?.total_tokens || 0;

    await AIHistory.create({
      userId: req.user._id,
      fileId,
      type: 'summary',
      prompt: type,
      response,
      tokens,
      duration: Date.now() - start,
    });
    await logActivityFn({ userId: req.user._id, action: 'ai_summary', fileId, details: `Generated ${type}`, ...getClientInfoFn(req) });

    await createNotificationFn(req.app.get('io'), req.user._id, {
      type: 'ai', title: 'Document Analysis Ready', message: `${type} completed for ${file.name}`,
      data: { fileId: file._id, operation: type }, icon: 'sparkles', link: '/ai',
    });

    res.json({ response, type, tokens });
  } catch (error) {
    console.error('AI summary error:', error.message);
    const providerUnavailable = error.status === 429 || error.code === 'insufficient_quota' || /no credits|quota|rate limit/i.test(error.message || '');
    if (providerUnavailable && file) {
      const response = summarizeLocally(content || `${file.name} (${file.mimeType})`, type);
      await AIHistory.create({ userId: req.user._id, fileId, type: 'summary', prompt: type, response, model: 'local-fallback', duration: Date.now() - start });
      await logActivityFn({ userId: req.user._id, action: 'ai_summary', fileId, details: `Generated local ${type} because provider was unavailable`, ...getClientInfoFn(req) });
      return res.json({ response, type, tokens: 0, mode: 'local', providerUnavailable: true });
    }
    res.status(500).json({ error: 'AI summary failed', details: error.message });
  }
});

// POST /api/ai/tags - Generate AI tags
router.post('/tags', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const { fileId } = req.body;
    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    await ensureFileText(file, req.user).catch(() => '');
    const content = `Filename: ${file.name}\nType: ${file.mimeType}\nOCR Text: ${(file.ocrText || '').substring(0, 2000)}`;

    if (!isAIConfigured()) {
      const tags = generateLocalTags(file);
      file.aiTags = tags;
      await file.save();
      await AIHistory.create({ userId: req.user._id, fileId, type: 'tags', response: JSON.stringify(tags), model: 'local-fallback', duration: Date.now() - start });
      await logActivityFn({ userId: req.user._id, action: 'ai_tag', fileId: file._id, details: `Generated ${tags.length} local tags`, ...getClientInfoFn(req) });
      return res.json({ tags, file, mode: 'local' });
    }

    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: 'Generate 5-10 relevant tags for a file. Return only a JSON array of tag strings.' },
        { role: 'user', content },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

let tags = [];
    try {
      const raw = completion.choices[0].message.content.trim();
      // Sometimes the model returns a plain array or a JSON object with a "tags" key
      if (raw.startsWith('[')) {
        tags = JSON.parse(raw);
      } else {
        const parsed = JSON.parse(raw);
        tags = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.tags) ? parsed.tags : []);
      }
      // Normalize: keep only non-empty strings, dedupe, cap at 10
      tags = [...new Set(tags.filter(t => typeof t === 'string' && t.trim()))]
        .map(t => t.trim())
        .slice(0, 10);
    } catch {
      tags = [];
    }
    if (tags.length === 0) tags = ['document', file.category];

    file.aiTags = tags;
    await file.save();

    await AIHistory.create({
      userId: req.user._id,
      fileId,
      type: 'tags',
      response: JSON.stringify(tags),
      duration: Date.now() - start,
    });

    await logActivityFn({ userId: req.user._id, action: 'ai_tag', fileId: file._id, details: `Generated ${tags.length} AI tags`, ...getClientInfoFn(req) });
    await createNotificationFn(req.app.get('io'), req.user._id, {
      type: 'ai', title: 'AI Tags Ready', message: `${tags.length} tags generated for ${file.name}`,
      data: { fileId: file._id, tags }, icon: 'sparkles', link: '/my-drive',
    });

    res.json({ tags, file });
  } catch (error) {
    console.error('AI tagging error:', error.message);
    res.status(500).json({ error: 'AI tagging failed', details: error.message });
  }
});

// DELETE /api/ai/tags - Remove one AI tag or every AI tag from a file
router.delete('/tags', authenticate, async (req, res) => {
  try {
    const { fileId, tag } = req.body;
    if (!fileId) return res.status(400).json({ error: 'File ID required' });

    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const previousTags = Array.isArray(file.aiTags) ? file.aiTags : [];
    file.aiTags = tag
      ? previousTags.filter(existingTag => existingTag !== tag)
      : [];
    await file.save();

    await logActivityFn({
      userId: req.user._id,
      action: 'ai_tag',
      fileId: file._id,
      details: tag ? `Removed AI tag: ${tag}` : `Removed all ${previousTags.length} AI tags`,
      ...getClientInfoFn(req),
    });

    res.json({ tags: file.aiTags, file });
  } catch (error) {
    console.error('AI tag removal error:', error.message);
    res.status(500).json({ error: 'AI tag removal failed', details: error.message });
  }
});

// POST /api/ai/rename - AI suggest rename
router.post('/rename', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const { fileId } = req.body;
    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    await ensureFileText(file, req.user).catch(() => '');
    const tags = Array.isArray(file.aiTags) ? file.aiTags.join(', ') : '';
    const content = `Current name: ${file.name}\nType: ${file.mimeType}\nCategory: ${file.category || 'other'}\nTags: ${tags}\nOCR preview: ${(file.ocrText || '').substring(0, 500)}`;

    if (!isAIConfigured()) {
      const suggestedName = suggestLocalName(file);
      const reason = 'Generated locally from the filename, type, category, and extracted text.';
      await AIHistory.create({ userId: req.user._id, fileId, type: 'rename', prompt: file.name, response: suggestedName, model: 'local-fallback', duration: Date.now() - start });
      return res.json({ suggestedName, reason, originalName: file.name, mode: 'local' });
    }

    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: 'Suggest a meaningful, descriptive filename for this file. Keep the original extension. Return JSON: {"suggestedName": "...", "reason": "..."}' },
        { role: 'user', content },
      ],
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    let suggestedName = '';
    let reason = '';
    try {
      const raw = completion.choices[0].message.content.trim();
      const result = JSON.parse(raw);
      suggestedName = result.suggestedName || result.name || '';
      reason = result.reason || '';
    } catch {
      suggestedName = completion.choices[0].message.content.trim();
      reason = 'Suggested by AI';
    }

    // Ensure extension preserved
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    if (!suggestedName.toLowerCase().endsWith(ext.toLowerCase()) && ext) {
      suggestedName = suggestedName + ext;
    }

    await AIHistory.create({
      userId: req.user._id,
      fileId,
      type: 'rename',
      prompt: file.name,
      response: suggestedName,
      duration: Date.now() - start,
    });

    await createNotificationFn(req.app.get('io'), req.user._id, {
      type: 'ai', title: 'Smart Rename Ready', message: `A new filename was suggested for ${file.name}`,
      data: { fileId: file._id, suggestedName }, icon: 'sparkles', link: '/ai',
    });

    res.json({ suggestedName, reason, originalName: file.name });
  } catch (error) {
    console.error('AI rename error:', error.message);
    res.status(500).json({ error: 'AI rename failed', details: error.message });
  }
});

// POST /api/ai/rename/apply - Apply an AI-suggested rename to a file
router.post('/rename/apply', authenticate, async (req, res) => {
  try {
    const { fileId, newName } = req.body;
    if (!fileId || !newName) return res.status(400).json({ error: 'fileId and newName are required' });

    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const oldName = file.name;
    const trimmed = newName.trim();

    // Sanitize: remove illegal path characters
    const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, '_');

    if (sanitized && sanitized !== file.name) {
      if (file.storageType === 'google' && file.googleFileId) {
        const { accessToken, refreshToken } = getTokens(req.user);
        await driveService.renameFile(accessToken, refreshToken, file.googleFileId, sanitized);
      }
      // Supabase object keys are immutable and independent of display names.
      file.name = sanitized;
      file.aiRenamedFrom = oldName;
      await file.save();
    }

    await logActivityFn({
      userId: req.user._id,
      action: 'ai_rename',
      fileId: file._id,
      details: `AI renamed "${oldName}" to "${sanitized}"`,
      ...getClientInfoFn(req),
    });

    res.json({ file, oldName, newName: sanitized });
  } catch (error) {
    console.error('AI rename apply error:', error.message);
    res.status(500).json({ error: 'Failed to apply rename' });
  }
});

// POST /api/ai/folder-suggestion - Suggest folder organization
router.post('/folder-suggestion', authenticate, async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) return res.status(400).json({ error: 'Select at least one file' });
    const files = await File.find({ _id: { $in: fileIds }, userId: req.user._id }).lean();
    if (!files.length) return res.status(404).json({ error: 'No files found' });

    if (!isAIConfigured()) {
      const suggestions = suggestFoldersLocally(files);
      await AIHistory.create({ userId: req.user._id, type: 'folder_suggestion', response: JSON.stringify(suggestions), model: 'local-fallback' });
      await logActivityFn({ userId: req.user._id, action: 'ai_folder_suggestion', details: `Suggested ${suggestions.length} folders locally`, ...getClientInfoFn(req) });
      return res.json({ suggestions, mode: 'local' });
    }

    const openai = getOpenAI();
    const fileList = files.map(f => `${f.name} (${f.category})`).join('\n');

    const completion = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: 'Suggest folder organization for these files. Return JSON: {"suggestions": [{"folder": "...", "files": ["filename1", ...], "reason": "..."}]}' },
        { role: 'user', content: fileList },
      ],
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    await AIHistory.create({ userId: req.user._id, type: 'folder_suggestion', response: JSON.stringify(result.suggestions || []), model: getAIModel() });
    await logActivityFn({ userId: req.user._id, action: 'ai_folder_suggestion', details: `Suggested ${(result.suggestions || []).length} folders`, ...getClientInfoFn(req) });
    res.json(result);
  } catch (error) {
    console.error('Folder suggestion error:', error.message);
    res.status(500).json({ error: 'Folder suggestion failed', details: error.message });
  }
});

// POST /api/ai/duplicates - Find duplicate files
router.post('/duplicates', authenticate, async (req, res) => {
  try {
    const files = await File.find({ userId: req.user._id, trashed: false }).select('name size mimeType aiTags').lean();

    // Group by size first (exact duplicates)
    const sizeMap = {};
    for (const file of files) {
      const key = `${file.size}_${file.mimeType}`;
      if (!sizeMap[key]) sizeMap[key] = [];
      sizeMap[key].push(file);
    }

    const duplicates = Object.values(sizeMap).filter(group => group.length > 1);

    // Also find similar names
    const nameSimilar = [];
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const a = files[i].name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = files[j].name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (a === b && files[i]._id.toString() !== files[j]._id.toString()) {
          nameSimilar.push([files[i], files[j]]);
        }
      }
    }

    const similarNames = nameSimilar.slice(0, 20);
    await AIHistory.create({ userId: req.user._id, type: 'duplicate_detection', response: JSON.stringify({ exact: duplicates.length, similar: similarNames.length }), model: 'local-analysis' });
    await logActivityFn({ userId: req.user._id, action: 'duplicate_scan', details: `Found ${duplicates.length + similarNames.length} duplicate groups`, ...getClientInfoFn(req) });
    res.json({ exactDuplicates: duplicates, similarNames });
  } catch (error) {
    console.error('Duplicate detection error:', error.message);
    res.status(500).json({ error: 'Duplicate detection failed', details: error.message });
  }
});

// POST /api/ai/smart-search - Natural language search
router.post('/smart-search', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'Search query required' });
    if (!isAIConfigured()) {
      const terms = String(query).toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 1).slice(0, 8);
      const patterns = (terms.length ? terms : [String(query)]).map(term => String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80));
      const files = await File.find({
        userId: req.user._id,
        trashed: false,
        $or: patterns.flatMap(pattern => [
          { name: { $regex: pattern, $options: 'i' } },
          { ocrText: { $regex: pattern, $options: 'i' } },
          { aiTags: { $in: [new RegExp(pattern, 'i')] } },
        ]),
      }).limit(50).lean();
      await AIHistory.create({ userId: req.user._id, type: 'smart_search', prompt: query, response: JSON.stringify({ count: files.length }), model: 'local-fallback' });
      await logActivityFn({ userId: req.user._id, action: 'ai_search', details: `Local smart search returned ${files.length} files`, ...getClientInfoFn(req) });
      return res.json({ files, params: { searchText: query }, query, mode: 'local' });
    }
    const openai = getOpenAI();

    // Ask AI to convert natural language to search params
    const completion = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: 'Convert natural language file search to search parameters. Return JSON: {"name": "...", "category": "...", "tags": [], "dateRange": {"from": "...", "to": "..."}, "searchText": "..."}' },
        { role: 'user', content: query },
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const params = JSON.parse(completion.choices[0].message.content);

    // Build MongoDB query
    const dbQuery = { userId: req.user._id, trashed: false };
    const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 200);
    if (params.name) dbQuery.name = { $regex: escapeRegex(params.name), $options: 'i' };
    const categories = ['image', 'video', 'audio', 'document', 'spreadsheet', 'presentation', 'pdf', 'archive', 'code', 'other'];
    if (categories.includes(params.category)) dbQuery.category = params.category;
    if (params.tags?.length) dbQuery.aiTags = { $in: params.tags };
    const fromDate = params.dateRange?.from ? new Date(params.dateRange.from) : null;
    const toDate = params.dateRange?.to ? new Date(params.dateRange.to) : null;
    if (fromDate && !Number.isNaN(fromDate.getTime())) dbQuery.createdAt = { $gte: fromDate };
    if (toDate && !Number.isNaN(toDate.getTime())) {
      dbQuery.createdAt = { ...dbQuery.createdAt, $lte: toDate };
    }
    if (params.searchText) {
      dbQuery.$or = [
        { name: { $regex: escapeRegex(params.searchText), $options: 'i' } },
        { ocrText: { $regex: escapeRegex(params.searchText), $options: 'i' } },
        { aiTags: { $in: [new RegExp(escapeRegex(params.searchText), 'i')] } },
      ];
    }

    const files = await File.find(dbQuery).limit(50).lean();

    await AIHistory.create({
      userId: req.user._id,
      type: 'smart_search',
      prompt: query,
      response: JSON.stringify({ params, count: files.length }),
    });
    await logActivityFn({ userId: req.user._id, action: 'ai_search', details: `Smart search returned ${files.length} files`, ...getClientInfoFn(req) });

    res.json({ files, params, query });
  } catch (error) {
    console.error('Smart search error:', error.message);
    res.status(500).json({ error: 'Smart search failed', details: error.message });
  }
});

// POST /api/ocr - Extract text from image/PDF
router.post('/ocr', authenticate, async (req, res) => {
  try {
    const { fileId } = req.body;
    const file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    file.textExtractionStatus = 'pending';
    const text = await ensureFileText(file, req.user);

    res.json({ text, fileId, fileName: file.name });
  } catch (error) {
    res.status(500).json({ error: 'OCR failed', details: error.message });
  }
});

// GET /api/ai/history - AI usage history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { userId: req.user._id };
    if (type) query.type = type;

    const history = await AIHistory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('fileId', 'name mimeType')
      .lean();

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI history' });
  }
});

module.exports = router;
