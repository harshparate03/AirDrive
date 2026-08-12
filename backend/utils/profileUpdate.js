/**
 * Apply profile field updates to a Mongoose user document.
 * Returns true when at least one field changed.
 */
function applyProfileUpdate(user, { name, photo, preferences, removePhoto }) {
  let changed = false;

  if (typeof name === 'string' && name.trim() && name.trim() !== user.name) {
    user.name = name.trim();
    changed = true;
  }

  const shouldClearPhoto = removePhoto === true || photo === null || photo === '';
  if (shouldClearPhoto) {
    if (user.photo !== '') {
      user.photo = '';
      changed = true;
    }
  } else if (typeof photo === 'string' && photo !== user.photo) {
    user.photo = photo;
    changed = true;
  }

  if (preferences && typeof preferences === 'object') {
    const current = user.preferences?.toObject?.() || user.preferences || {};
    user.preferences = { ...current, ...preferences };
    user.markModified('preferences');
    changed = true;
  }

  return changed;
}

module.exports = { applyProfileUpdate };
