const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { extractZipDocument } = require('../services/textExtraction');

test('extracts visible slide content from PPTX archives', async () => {
  const zip = new JSZip();
  zip.file('ppt/slides/slide1.xml', '<p:sld><a:p><a:r><a:t>Quarterly results</a:t></a:r></a:p></p:sld>');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const text = await extractZipDocument(buffer, '.pptx');
  assert.match(text, /Slide 1/);
  assert.match(text, /Quarterly results/);
});

test('lists contained files from ZIP archives', async () => {
  const zip = new JSZip();
  zip.file('reports/summary.txt', 'content');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  assert.equal(await extractZipDocument(buffer, '.zip'), 'reports/summary.txt');
});
