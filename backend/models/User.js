const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  photo: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  // Google Drive tokens (user connects Drive separately after signup)
  googleAccessToken: { type: String, default: '' },
  googleRefreshToken: { type: String, default: '' },
  googleConnected: { type: Boolean, default: false },

  // Storage tracking
  storageUsed: { type: Number, default: 0 },
  storageLimit: { type: Number, default: 15 * 1024 * 1024 * 1024 }, // 15 GB

  // Email verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String, default: null },
  emailVerifyExpires: { type: Date, default: null },

  // OTP for password reset
  passwordResetOTP: { type: String, default: null, select: false },
  passwordResetOTPExpires: { type: Date, default: null },
  passwordResetAttempts: { type: Number, default: 0 },

  // Login attempt tracking (rate limiting / lockout)
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },

  // Preferences
  preferences: {
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'system' },
    language: { type: String, default: 'en' },
    defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    notifications: {
      upload: { type: Boolean, default: true },
      share: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
    },
  },

  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: '' },
  lastLoginDevice: { type: String, default: '' },
  refreshToken: { type: String, default: '', select: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  this.updatedAt = new Date();
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe public object (no secrets)
userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleAccessToken;
  delete obj.googleRefreshToken;
  delete obj.refreshToken;
  delete obj.passwordResetOTP;
  delete obj.emailVerifyToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
