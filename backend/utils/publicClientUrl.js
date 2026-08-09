const normalizeOrigin = (value) => {
  try {
    const url = new URL(String(value || ''));
    return `${url.protocol}//${url.host}`;
  } catch (_) {
    return '';
  }
};

const isAllowedFrontendOrigin = (origin) => {
  if (!origin) return false;
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  const configured = [process.env.CLIENT_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
    .map(normalizeOrigin).filter(Boolean);
  return configured.includes(origin);
};

const getPublicClientUrl = (req) => {
  const requestOrigin = normalizeOrigin(req.get('origin'));
  if (isAllowedFrontendOrigin(requestOrigin)) return requestOrigin;
  return normalizeOrigin(process.env.PUBLIC_CLIENT_URL || process.env.CLIENT_URL) || 'http://localhost:5173';
};

module.exports = { getPublicClientUrl, normalizeOrigin, isAllowedFrontendOrigin };
