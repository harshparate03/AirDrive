const CryptoJS = require('crypto-js');

const KEY = process.env.ENCRYPTION_KEY || 'default_key_change_in_production!!';

const encrypt = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, KEY).toString();
};

const decrypt = (cipherText) => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

module.exports = { encrypt, decrypt, hashPassword };
