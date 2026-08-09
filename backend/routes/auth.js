const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { logActivity, createNotification, getClientInfo } = require('../utils/activityLogger');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateOTP, verifyOTP, generateToken } = require('../utils/otp');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordChangedEmail } = require('../utils/sendEmail');

// Helper to issue tokens and set session
const issueTokens = async (user, clientInfo, isNewUser, io) => {
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = encrypt(refreshToken);
  user.lastLoginAt = new Date();
  user.lastLoginIp = clientInfo.ip;
  user.lastLoginDevice = clientInfo.device;
  await user.save();

  const accessTokenJWT = generateAccessToken(user._id);

  // Log login activity
  await logActivity({
    userId: user._id,
    action: 'login',
    details: `Login from ${clientInfo.device.substring(0, 100)}`,
    ...clientInfo,
  });

  // Security notification for new login
  if (!isNewUser) {
    await createNotification(io, user._id, {
      type: 'login',
      title: 'New Login Detected',
      message: `New login from ${clientInfo.ip}`,
      data: clientInfo,
      icon: 'shield',
    });
  }

  // Notify all admins of a new login/signup for the admin notification feed
  try {
    const adminIds = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    for (const admin of adminIds) {
      await createNotification(io, admin._id, {
        audience: 'admin',
        type: 'system',
        title: isNewUser ? 'New User Registered & Logged In' : 'User Login Detected',
        message: `${user.name} (${user.email}) ${isNewUser ? 'created an account and logged in' : 'logged in'} from ${clientInfo.ip}`,
        data: {
          event: isNewUser ? 'new_user_login' : 'user_login',
          userId: user._id,
          email: user.email,
          name: user.name,
          ...clientInfo,
        },
        icon: isNewUser ? 'user-add' : 'login',
        link: '/admin',
      });
    }
  } catch (err) {
    console.error('Admin notify error:', err.message);
  }

  return { accessToken: accessTokenJWT, refreshToken };
};

// POST /api/auth/register - Create a new account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = new User({ name, email: email.toLowerCase(), password });
    await user.save();

    // Send welcome email in the background. Signup should not fail if SMTP is unavailable.
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Welcome email send failed:', err.message);
    });

    const clientInfo = getClientInfo(req);
    const io = req.app.get('io');
    const tokens = await issueTokens(user, clientInfo, true, io);

    res.status(201).json({ ...tokens, user: user.toPublic() });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - Sign in with email & password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // --- Account lockout check (rate limiting user-friendly) ---
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCK_MS = 15 * 60 * 1000; // 15 minutes

    if (user.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil - new Date()) / 60000);
      return res.status(429).json({
        error: `Too many failed login attempts. Please try again in ${mins} minute${mins > 1 ? 's' : ''}.`,
        locked: true,
        retryAfterMin: mins,
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.loginAttempts = 0;
        await user.save();
        return res.status(429).json({
          error: `Too many failed login attempts. Your account is locked for 15 minutes. Please try again later or reset your password.`,
          locked: true,
          retryAfterMin: 15,
        });
      }
      const remaining = MAX_FAILED_ATTEMPTS - user.loginAttempts;
      await user.save();
      return res.status(401).json({
        error: `Invalid email or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before your account is temporarily locked.`,
        attemptsLeft: remaining,
      });
    }

    // Successful login - reset attempts
    user.loginAttempts = 0;
    user.lockUntil = null;

    const clientInfo = getClientInfo(req);
    const io = req.app.get('io');
    const tokens = await issueTokens(user, clientInfo, false, io);

    res.json({ ...tokens, user: user.toPublic() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/forgot-password - Request password reset OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetOTP +passwordResetOTPExpires');
    // Always respond generically to avoid email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists for this email, a password reset OTP will be sent.' });
    }

    const { otp, otpHash, expires } = await generateOTP();
    user.passwordResetOTP = otpHash;
    user.passwordResetOTPExpires = expires;
    user.passwordResetAttempts = 0;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    await user.save();

    try {
      await sendOTPEmail(user.email, user.name, otp);
    } catch (err) {
      console.error('OTP email send failed:', err.message, err.status || '');
      const detail = err.message?.startsWith('Brevo email rejected:') ? err.message : null;
      return res.status(500).json({
        error: 'Failed to send OTP email. Please try again.',
        ...(detail && { detail }),
      });
    }

    res.json({ message: 'Password reset OTP sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send password reset OTP' });
  }
});

// POST /api/auth/verify-otp - Verify reset OTP, return a reset token
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetOTP +passwordResetOTPExpires +passwordResetAttempts');
    if (!user) return res.status(400).json({ error: 'Invalid OTP' });

    // Check expiry
    if (!user.passwordResetOTPExpires || user.passwordResetOTPExpires < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Attempt limiting
    if (user.passwordResetAttempts >= 5) {
      return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    const valid = await verifyOTP(otp, user.passwordResetOTP);
    if (!valid) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Issue a one-time password reset token
    const resetToken = generateToken();
    user.passwordResetOTP = null;
    user.passwordResetOTPExpires = null;
    user.passwordResetAttempts = 0;
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    res.json({ resetToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/reset-password - Set new password using reset token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: resetTokenHash,
      passwordResetTokenExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetTokenExpires');
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    user.passwordResetOTP = null;
    user.passwordResetOTPExpires = null;
    user.refreshToken = ''; // invalidate existing sessions
    await user.save();

    try {
      await sendPasswordChangedEmail(user.email, user.name);
    } catch (_) {}

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/auth/change-password - Change password while logged in
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.refreshToken = ''; // invalidate other sessions
    await user.save();

    await logActivity({
      userId: user._id,
      action: 'password_change',
      ...getClientInfo(req),
    });

    try {
      await sendPasswordChangedEmail(user.email, user.name);
    } catch (_) {}

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user) return res.status(401).json({ error: 'User not found' });

    const storedRefresh = decrypt(user.refreshToken);
    if (storedRefresh !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = encrypt(newRefreshToken);
    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    req.user.refreshToken = '';
    await req.user.save();

    await logActivity({
      userId: req.user._id,
      action: 'logout',
      ...getClientInfo(req),
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-googleAccessToken -googleRefreshToken -refreshToken');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
