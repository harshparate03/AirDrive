const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/** Generate a 6-digit OTP, returns { otp (plain), otpHash, expires } */
const generateOTP = async () => {
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { otp, otpHash, expires };
};

/** Verify a plain OTP against its stored hash */
const verifyOTP = async (plain, hash) => {
  if (!plain || !hash) return false;
  return bcrypt.compare(String(plain), hash);
};

/** Generate a secure random token (for email verification links) */
const generateToken = () => crypto.randomBytes(32).toString('hex');

module.exports = { generateOTP, verifyOTP, generateToken };
