import test from 'node:test'
import assert from 'node:assert/strict'
import { formatFileSize, getFileExtension } from '../src/utils/formatters.js'

test('formats byte sizes consistently', () => {
  assert.equal(formatFileSize(0), '0 B')
  assert.equal(formatFileSize(1024), '1 KB')
  assert.equal(formatFileSize(1572864), '1.5 MB')
})

test('normalizes file extensions', () => {
  assert.equal(getFileExtension('Report.PDF'), 'pdf')
  assert.equal(getFileExtension('archive.tar.gz'), 'gz')
})
