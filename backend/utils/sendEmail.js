const nodemailer = require('nodemailer');
const axios = require('axios');

const getEmailConfig = () => ({
  user: process.env.GMAIL_USER || process.env.EMAIL_USER || '',
  pass: (process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
  fromName: process.env.GMAIL_FROM_NAME || 'AirDrive',
});

const getBrevoConfig = () => ({
  apiKey: process.env.BREVO_API_KEY || '',
  fromEmail: process.env.BREVO_FROM_EMAIL || process.env.GMAIL_USER || process.env.EMAIL_USER || '',
  fromName: process.env.BREVO_FROM_NAME || process.env.GMAIL_FROM_NAME || 'AirDrive',
});

const getAppsScriptConfig = () => ({
  url: process.env.GOOGLE_APPS_SCRIPT_EMAIL_URL || '',
  secret: process.env.GOOGLE_APPS_SCRIPT_EMAIL_SECRET || '',
  fromName: process.env.GOOGLE_APPS_SCRIPT_FROM_NAME || process.env.GMAIL_FROM_NAME || 'AirDrive',
});

const createTransporter = () => {
  const { user, pass } = getEmailConfig();
  if (!user || !pass) {
    throw new Error('Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

const sendTransactionalEmail = async ({ to, subject, html }) => {
  const appsScript = getAppsScriptConfig();
  if (appsScript.url && appsScript.secret) {
    try {
      const response = await axios.post(appsScript.url, {
        secret: appsScript.secret,
        fromName: appsScript.fromName,
        to,
        subject,
        html,
      }, { timeout: 20000 });
      if (!response.data?.ok) throw new Error(response.data?.error || 'Google Apps Script rejected the email');
    } catch (error) {
      const providerMessage = error.response?.data?.error || error.message;
      const safeError = new Error(`Google Apps Script email rejected: ${providerMessage}`);
      safeError.status = error.response?.status;
      throw safeError;
    }
    return;
  }

  const brevo = getBrevoConfig();
  if (brevo.apiKey) {
    if (!brevo.fromEmail) throw new Error('Brevo sender is not configured. Set BREVO_FROM_EMAIL.');
    try {
      await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { name: brevo.fromName, email: brevo.fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }, {
        headers: {
          accept: 'application/json',
          'api-key': brevo.apiKey,
          'content-type': 'application/json',
        },
        timeout: 15000,
      });
    } catch (error) {
      const providerMessage = error.response?.data?.message || error.response?.data?.code || error.message;
      const safeError = new Error(`Brevo email rejected: ${providerMessage}`);
      safeError.status = error.response?.status;
      throw safeError;
    }
    return;
  }

  const transporter = createTransporter();
  const { user, fromName } = getEmailConfig();
  await transporter.sendMail({ from: `"${fromName}" <${user}>`, to, subject, html });
};

const sendOTPEmail = async (to, name, otp) => {
  await sendTransactionalEmail({
    to,
    subject: `${otp} - Your AirDrive password reset code`,
    html: `
      <div style="margin:0;padding:32px 16px;background:#0b1023;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#fff;">
        <div style="max-width:520px;margin:0 auto;overflow:hidden;border:1px solid rgba(255,255,255,.18);border-radius:28px;background:linear-gradient(145deg,#202953,#111832);box-shadow:0 28px 70px rgba(0,0,0,.35);">
          <div style="padding:38px 38px 22px;text-align:center;background:radial-gradient(circle at 15% 0%,rgba(99,102,241,.55),transparent 42%),radial-gradient(circle at 90% 10%,rgba(6,182,212,.28),transparent 38%);">
            <div style="display:inline-block;padding:13px 17px;border:1px solid rgba(255,255,255,.28);border-radius:17px;background:rgba(255,255,255,.12);font-size:25px;font-weight:900;">AD</div>
            <p style="margin:16px 0 7px;color:#c7d2fe;font-size:11px;font-weight:800;letter-spacing:.18em;">SECURE ACCOUNT RECOVERY</p>
            <h1 style="margin:0;font-size:27px;letter-spacing:-.03em;">Verify your identity</h1>
            <p style="margin:11px auto 0;max-width:360px;color:#b9c3dd;font-size:14px;line-height:1.6;">Hi <strong style="color:#fff;">${name}</strong>, use this one-time code to reset your AirDrive password.</p>
          </div>
          <div style="padding:18px 38px 34px;text-align:center;">
            <div style="margin:5px 0 22px;padding:22px 12px;border:1px solid rgba(199,198,255,.42);border-radius:18px;background:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);">
              <span style="font-family:'Courier New',monospace;font-size:38px;font-weight:900;letter-spacing:10px;color:#c7d2fe;">${otp}</span>
            </div>
            <div style="padding:14px;border-radius:14px;background:rgba(99,102,241,.12);color:#cbd5e1;font-size:13px;line-height:1.6;">
              This code expires in <strong style="color:#fff;">10 minutes</strong> and can be used once.<br>If you did not request this reset, safely ignore this email.
            </div>
          </div>
          <div style="padding:17px 30px;border-top:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.12);text-align:center;color:#77839e;font-size:11px;">&copy; ${new Date().getFullYear()} AirDrive &middot; AI-powered cloud storage</div>
        </div>
      </div>`,
  });
};

const sendWelcomeEmail = async (to, name) => {
  await sendTransactionalEmail({
    to,
    subject: `Welcome to AirDrive, ${name}!`,
    html: `<div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Welcome to AirDrive!</h1></div><div style="padding:36px 40px;"><p style="color:#475569;font-size:15px;line-height:1.7;">Hi <strong>${name}</strong>,<br><br>Your account is ready. Upload files, organize folders, share securely, and use AI features.</p><a href="${process.env.CLIENT_URL}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Open AirDrive</a></div></div>`,
  });
};

const sendPasswordChangedEmail = async (to, name) => {
  await sendTransactionalEmail({
    to,
    subject: 'Your AirDrive password was changed',
    html: `<div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:40px;background:#fff;border-radius:16px;"><h2 style="color:#0f172a;">Password changed</h2><p style="color:#475569;">Hi <strong>${name}</strong>, your AirDrive password was successfully changed.</p><p style="color:#475569;">If you did not make this change, contact support immediately.</p></div>`,
  });
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendTransactionalEmail,
  getEmailConfig,
  getBrevoConfig,
  getAppsScriptConfig,
  createTransporter,
};
