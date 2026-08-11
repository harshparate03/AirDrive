const { createClient } = require('@supabase/supabase-js');
const { Readable } = require('stream');

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET'];

const assertConfigured = () => {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Supabase Storage is not configured: missing ${missing.join(', ')}`);
};

let client;
const getClient = () => {
  assertConfigured();
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
};

const bucket = () => getClient().storage.from(process.env.SUPABASE_STORAGE_BUCKET);
const throwIfError = error => {
  if (error) throw new Error(`Supabase Storage error: ${error.message}`);
};

const uploadBuffer = async ({ key, buffer, mimeType }) => {
  const { error } = await bucket().upload(key, buffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  });
  throwIfError(error);
  return { key };
};

const getBuffer = async key => {
  const { data, error } = await bucket().download(key);
  throwIfError(error);
  return Buffer.from(await data.arrayBuffer());
};

const getStream = async key => Readable.from(await getBuffer(key));

const deleteObject = async key => {
  const { error } = await bucket().remove([key]);
  throwIfError(error);
};

const deleteObjects = async keys => {
  const uniqueKeys = [...new Set((keys || []).filter(Boolean))];
  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const { error } = await bucket().remove(uniqueKeys.slice(index, index + 100));
    throwIfError(error);
  }
};

const deleteFileObjects = async file => {
  const keys = [...new Set([file.r2Key, ...(file.versions || []).map(version => version.r2Key)].filter(Boolean))];
  await deleteObjects(keys);
};

const copyObject = async (sourceKey, destinationKey) => {
  const { error } = await bucket().copy(sourceKey, destinationKey);
  throwIfError(error);
  return { key: destinationKey };
};

const exists = async key => {
  const slash = key.lastIndexOf('/');
  const folder = slash >= 0 ? key.slice(0, slash) : '';
  const name = slash >= 0 ? key.slice(slash + 1) : key;
  const { data, error } = await bucket().list(folder, { search: name, limit: 100 });
  throwIfError(error);
  return data.some(item => item.name === name);
};

module.exports = { assertConfigured, uploadBuffer, getStream, getBuffer, deleteObject, deleteObjects, deleteFileObjects, copyObject, exists };
