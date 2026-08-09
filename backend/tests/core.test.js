const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeRelativeDirectory } = require('../utils/uploadPaths');
const { encrypt, decrypt, hashPassword } = require('../utils/encryption');
const SharedLink = require('../models/SharedLink');

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
