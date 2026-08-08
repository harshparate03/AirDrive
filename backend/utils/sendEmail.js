const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

const sendOTPEmail = async (to, name, otp) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Air Drive" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} — Your Air Drive Password Reset OTP`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Air Drive</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">AI Powered Cloud Storage</p>
        </div>
        <!-- Body -->
        <div style="padding: 36px 40px; background: white;">
          <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 20px;">Password Reset OTP</h2>
          <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
            Hi <strong>${name}</strong>, use the OTP below to reset your Air Drive password.
          </p>
          <!-- OTP Box -->
          <div style="background: #f1f5f9; border: 2px dashed #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #6366f1; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">⏱️ This OTP expires in <strong>10 minutes</strong>.</p>
          <p style="color: #64748b; font-size: 13px; margin: 0;">🔒 If you didn't request this, you can safely ignore this email.</p>
        </div>
        <!-- Footer -->
        <div style="padding: 20px 40px; background: #f8fafc; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Air Drive. All rights reserved.</p>
        </div>
      </div>
    `,
  });
};

const sendWelcomeEmail = async (to, name) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Air Drive" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Welcome to Air Drive, ${name}! 🎉`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Welcome to Air Drive! 🎉</h1>
        </div>
        <div style="padding: 36px 40px; background: white;">
          <p style="color: #475569; font-size: 15px; line-height: 1.7;">
            Hi <strong>${name}</strong>,<br><br>
            Your Air Drive account is ready. You can now upload files, organize with folders, share securely, and use AI features.<br><br>
            To store files, connect your Google Drive from Settings → Connected Services.
          </p>
          <a href="${process.env.CLIENT_URL}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">
            Open Air Drive
          </a>
        </div>
      </div>
    `,
  });
};

const sendPasswordChangedEmail = async (to, name) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Air Drive" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Air Drive password was changed',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px; background: white; border-radius: 16px;">
        <h2 style="color: #0f172a;">Password Changed ✅</h2>
        <p style="color: #475569;">Hi <strong>${name}</strong>, your Air Drive password was successfully changed.</p>
        <p style="color: #475569;">If you didn't make this change, please contact support immediately.</p>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail, sendWelcomeEmail, sendPasswordChangedEmail };
