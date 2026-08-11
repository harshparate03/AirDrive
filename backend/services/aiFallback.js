const path = require('path');

const PLACEHOLDER_KEYS = new Set(['', 'sk-your-openai-api-key', 'your-openai-api-key', 'gsk_your-groq-api-key', 'your-groq-api-key']);
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'file', 'document', 'copy', 'final']);

const isAIConfigured = () => {
  const key = getAIKey();
  return Boolean(key) && !PLACEHOLDER_KEYS.has(key.toLowerCase());
};

const getAIProvider = () => {
  if ((process.env.GROQ_API_KEY || '').trim()) return 'groq';
  if ((process.env.OPENAI_API_KEY || '').trim()) return 'openai';
  return 'local';
};

const getAIKey = () => (getAIProvider() === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY || '').trim();
const getAIBaseURL = () => getAIProvider() === 'groq'
  ? 'https://api.groq.com/openai/v1'
  : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const getAIModel = () => getAIProvider() === 'groq'
  ? process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
  : process.env.OPENAI_MODEL || 'gpt-4o-mini';

const cleanWords = value => String(value || '').toLowerCase()
  .replace(/\.[a-z0-9]{1,8}$/i, '')
  .split(/[^a-z0-9]+/)
  .filter(word => word.length > 2 && !STOP_WORDS.has(word));

const generateLocalTags = file => [...new Set([
  file.category,
  ...cleanWords(file.name),
  ...cleanWords((file.ocrText || '').slice(0, 500)),
  file.mimeType?.split('/')[0],
].filter(Boolean))].slice(0, 10);

const summarizeLocally = (content, type = 'summary') => {
  const normalized = String(content || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No readable text was found in this file.';
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const selected = sentences.map(sentence => sentence.trim()).filter(Boolean).slice(0, type === 'notes' ? 10 : 6);
  if (type === 'important') return selected.map(sentence => `• ${sentence}`).join('\n');
  if (type === 'notes') return selected.map((sentence, index) => `${index + 1}. ${sentence}`).join('\n');
  if (type === 'explain') return `In simple terms:\n\n${selected.join(' ')}`;
  return selected.join(' ');
};

const suggestLocalName = file => {
  const extension = path.extname(file.name || '');
  const words = generateLocalTags(file).filter(tag => tag !== file.category).slice(0, 4);
  const base = words.length ? words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-') : `Organized-${file.category || 'File'}`;
  return `${base}${extension}`;
};

const suggestFoldersLocally = files => {
  const labels = {
    image: 'Images', video: 'Videos', audio: 'Audio', pdf: 'PDF Documents',
    document: 'Documents', spreadsheet: 'Spreadsheets', presentation: 'Presentations',
    archive: 'Archives', code: 'Code', other: 'Other Files',
  };
  const groups = new Map();
  for (const file of files) {
    const category = file.category || 'other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(file.name);
  }
  return [...groups.entries()].map(([category, names]) => ({
    folder: labels[category] || 'Other Files',
    files: names,
    reason: `Groups ${names.length} ${category} file${names.length === 1 ? '' : 's'} together.`,
  }));
};

const answerLocally = ({ message, file, content }) => {
  if (!file) return 'AI provider is not configured yet. Add a valid OPENAI_API_KEY in Render to enable general AI chat. File search, duplicates, local tags, summaries, rename suggestions, and folder suggestions remain available.';
  const summary = summarizeLocally(content || `${file.name} (${file.mimeType})`, 'summary');
  return `Limited local analysis for ${file.name}:\n\n${summary}\n\nConfigure OPENAI_API_KEY to ask detailed questions such as: “${message}”.`;
};

module.exports = {
  isAIConfigured,
  getAIProvider,
  getAIKey,
  getAIBaseURL,
  getAIModel,
  generateLocalTags,
  summarizeLocally,
  suggestLocalName,
  suggestFoldersLocally,
  answerLocally,
};
