const test = require('node:test');
const assert = require('node:assert/strict');
const { applyProfileUpdate } = require('../utils/profileUpdate');

const makeUser = (overrides = {}) => ({
  name: 'Jane Doe',
  photo: 'data:image/png;base64,abc',
  preferences: { theme: 'dark', language: 'en' },
  markModified() {},
  ...overrides,
});

test('applyProfileUpdate clears photo when removePhoto is true', () => {
  const user = makeUser();
  const changed = applyProfileUpdate(user, { removePhoto: true });
  assert.equal(changed, true);
  assert.equal(user.photo, '');
});

test('applyProfileUpdate clears photo when photo is an empty string', () => {
  const user = makeUser();
  const changed = applyProfileUpdate(user, { photo: '' });
  assert.equal(changed, true);
  assert.equal(user.photo, '');
});

test('applyProfileUpdate sets a new photo value', () => {
  const user = makeUser({ photo: '' });
  const nextPhoto = 'data:image/jpeg;base64,xyz';
  const changed = applyProfileUpdate(user, { photo: nextPhoto });
  assert.equal(changed, true);
  assert.equal(user.photo, nextPhoto);
});

test('applyProfileUpdate updates name and preferences', () => {
  const user = makeUser();
  let modified = false;
  user.markModified = () => { modified = true; };
  const changed = applyProfileUpdate(user, {
    name: 'Jane Smith',
    preferences: { language: 'hi' },
  });
  assert.equal(changed, true);
  assert.equal(user.name, 'Jane Smith');
  assert.equal(user.preferences.language, 'hi');
  assert.equal(user.preferences.theme, 'dark');
  assert.equal(modified, true);
});
