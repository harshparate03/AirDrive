const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const { decrypt } = require('../utils/encryption');
const driveService = require('./googleDrive');
const localService = require('./localStorage');

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 50000;

const getBuffer = async (file, user) => {
  if (file.storageType === 'google' && file.googleFileId) {
    return driveService.downloadFile(decrypt(user.googleAccessToken), decrypt(user.googleRefreshToken), file.googleFileId);
  }
  return localService.readFile(file.localPath);
};

const extractText = async (file, user) => {
  if (file.size > MAX_SOURCE_BYTES) throw new Error('File is too large for text extraction');
  const mime = file.mimeType || '';
  const extension = (file.extension || '').toLowerCase();
  const buffer = await getBuffer(file, user);
  let text = '';

  if (mime.startsWith('text/') || ['.txt', '.md', '.csv', '.json', '.xml', '.js', '.ts', '.jsx', '.tsx', '.css', '.html'].includes(extension)) {
    text = buffer.toString('utf8');
  } else if (mime === 'application/pdf' || extension === '.pdf') {
    text = (await pdfParse(buffer)).text || '';
  } else if (mime.includes('wordprocessingml') || extension === '.docx') {
    text = (await mammoth.extractRawText({ buffer })).value || '';
  } else if (mime.startsWith('image/')) {
    if (file.size > 10 * 1024 * 1024) throw new Error('Image is too large for OCR');
    text = (await Tesseract.recognize(buffer, 'eng')).data.text || '';
  } else {
    return { text: '', supported: false };
  }

  return { text: text.replace(/\0/g, '').trim().slice(0, MAX_TEXT_LENGTH), supported: true };
};

const ensureFileText = async (file, user) => {
  if (file.ocrText || file.textExtractionStatus === 'complete' || file.textExtractionStatus === 'unsupported') return file.ocrText || '';
  try {
    const result = await extractText(file, user);
    file.ocrText = result.text;
    file.textExtractionStatus = result.supported ? 'complete' : 'unsupported';
    await file.save();
    return result.text;
  } catch (error) {
    file.textExtractionStatus = 'failed';
    await file.save();
    throw error;
  }
};

module.exports = { extractText, ensureFileText };
