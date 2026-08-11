const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const JSZip = require('jszip');
const { decrypt } = require('../utils/encryption');
const driveService = require('./googleDrive');
const localService = require('./localStorage');
const storageService = require('./supabaseStorage');

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 50000;
const EXTRACTABLE_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json', '.xml', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.zip']);

const decodeXml = (value = '') => value
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const xmlText = (xml = '') => decodeXml(xml
  .replace(/<w:tab\/?\s*>/g, '\t')
  .replace(/<w:br\/?\s*>|<a:br\/?\s*>|<text:line-break\/?\s*>/g, '\n')
  .replace(/<\/w:p>|<\/a:p>|<\/text:p>|<\/table:table-row>/g, '\n')
  .replace(/<\/w:tc>|<\/table:table-cell>/g, '\t')
  .replace(/<[^>]+>/g, ''))
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true });

const extractZipDocument = async (buffer, extension) => {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (name) => zip.file(name)?.async('string') || '';

  if (extension === '.docx') return xmlText(await read('word/document.xml'));
  if (extension === '.pptx') {
    const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort(naturalSort);
    const parts = await Promise.all(slides.map(async (name, index) => `Slide ${index + 1}\n${xmlText(await read(name))}`));
    return parts.join('\n\n');
  }
  if (extension === '.xlsx') {
    const sharedXml = await read('xl/sharedStrings.xml');
    const shared = [...sharedXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map(match => xmlText(match[1]));
    const sheets = Object.keys(zip.files).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort(naturalSort);
    const output = [];
    for (const [index, name] of sheets.entries()) {
      const xml = await read(name);
      const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(row => {
        return [...row[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)].map(cell => {
          const value = cell[2].match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] || xmlText(cell[2]);
          return /\bt="s"/.test(cell[1]) ? (shared[Number(value)] || '') : decodeXml(value);
        }).join('\t');
      });
      output.push(`Sheet ${index + 1}\n${rows.join('\n')}`);
    }
    return output.join('\n\n');
  }
  if (['.odt', '.ods', '.odp'].includes(extension)) return xmlText(await read('content.xml'));
  if (extension === '.zip') {
    return Object.values(zip.files).filter(entry => !entry.dir).map(entry => entry.name).sort(naturalSort).join('\n');
  }
  return '';
};

const getBuffer = async (file, user) => {
  if (file.storageType === 'supabase' && file.r2Key) return storageService.getBuffer(file.r2Key);
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
    text = (await mammoth.extractRawText({ buffer })).value || await extractZipDocument(buffer, extension);
  } else if (['.xlsx', '.pptx', '.odt', '.ods', '.odp', '.zip'].includes(extension)) {
    text = await extractZipDocument(buffer, extension);
  } else if (mime.startsWith('image/')) {
    if (file.size > 10 * 1024 * 1024) throw new Error('Image is too large for OCR');
    text = (await Tesseract.recognize(buffer, 'eng')).data.text || '';
  } else {
    return { text: '', supported: false };
  }

  return { text: text.replace(/\0/g, '').trim().slice(0, MAX_TEXT_LENGTH), supported: true };
};

const ensureFileText = async (file, user) => {
  const extension = (file.extension || '').toLowerCase();
  const nowSupported = EXTRACTABLE_EXTENSIONS.has(extension) || (file.mimeType || '').startsWith('text/') || (file.mimeType || '').startsWith('image/');
  if (file.ocrText || file.textExtractionStatus === 'complete' || (file.textExtractionStatus === 'unsupported' && !nowSupported)) return file.ocrText || '';
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

module.exports = { extractText, ensureFileText, extractZipDocument };
