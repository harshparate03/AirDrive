const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOrigin, isAllowedFrontendOrigin } = require('../utils/publicClientUrl');

test('normalizes a frontend URL to its origin', () => {
  assert.equal(normalizeOrigin('https://air-drive-snowy.vercel.app/share/token'), 'https://air-drive-snowy.vercel.app');
});

test('accepts Vercel frontend origins and rejects unrelated hosts', () => {
  assert.equal(isAllowedFrontendOrigin('https://air-drive-snowy.vercel.app'), true);
  assert.equal(isAllowedFrontendOrigin('https://example.com'), false);
});
