const sanitizeRelativeDirectory = (relativePath, maxDepth = 20) => String(relativePath || '')
  .replace(/\\/g, '/')
  .split('/')
  .filter(part => part && part !== '.' && part !== '..')
  .slice(0, -1)
  .slice(0, maxDepth)
  .map(part => part.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 120))
  .filter(Boolean);

module.exports = { sanitizeRelativeDirectory };
