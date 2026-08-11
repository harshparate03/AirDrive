const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeRelativeDirectory } = require('../utils/uploadPaths');
const { encrypt, decrypt, hashPassword } = require('../utils/encryption');
const SharedLink = require('../models/SharedLink');
const { getStoredFileSize, getStorageLimit } = require('../services/storageQuota');

test('folder upload paths preserve safe nesting and remove traversal', () => {
  assert.deepEqual(sanitizeRelativeDirectory('Project/../Reports/Q1?.pdf'), ['Project', 'Reports']);
  assert.deepEqual(sanitizeRelativeDirectory('Team\\Design\\logo.png'), ['Team', 'Design']);
});

test('encrypted tokens round-trip and password hashes are deterministic', () => {
  const value = 'refresh-token-value';
  assert.equal(decrypt(encrypt(value)), value);
  assert.equal(hashPassword('secret'), hashPassword('secret'));
  assert.notEqual(hashPassword('secret'), hashPassword('different'));
});

test('share expiry distinguishes active and expired links', () => {
  const active = new SharedLink({ userId: '507f1f77bcf86cd799439011', token: 'active', expiresAt: new Date(Date.now() + 60000) });
  const expired = new SharedLink({ userId: '507f1f77bcf86cd799439011', token: 'expired', expiresAt: new Date(Date.now() - 60000) });
  assert.equal(active.isExpired(), false);
  assert.equal(expired.isExpired(), true);
});

test('stored file size includes every retained version', () => {
  assert.equal(getStoredFileSize({ size: 100, versions: [] }), 100);
  assert.equal(getStoredFileSize({ size: 70, versions: [{ size: 100 }, { size: 70 }] }), 170);
  assert.equal(getStoredFileSize({ size: 25, versions: [{}, { size: 25 }] }), 25);
});

test('Supabase storage limit uses a safe default and valid override', () => {
  const original = process.env.SUPABASE_STORAGE_LIMIT_BYTES;
  delete process.env.SUPABASE_STORAGE_LIMIT_BYTES;
  assert.equal(getStorageLimit(), 900000000);
  process.env.SUPABASE_STORAGE_LIMIT_BYTES = '123456';
  assert.equal(getStorageLimit(), 123456);
  process.env.SUPABASE_STORAGE_LIMIT_BYTES = 'invalid';
  assert.equal(getStorageLimit(), 900000000);
  if (original === undefined) delete process.env.SUPABASE_STORAGE_LIMIT_BYTES;
  else process.env.SUPABASE_STORAGE_LIMIT_BYTES = original;
});
