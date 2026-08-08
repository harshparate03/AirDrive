const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

const logActivity = async (data) => {
  try {
    await Activity.create(data);
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

const createNotification = async (io, userId, notification) => {
  try {
    const notif = await Notification.create({ userId, ...notification });
    if (io) {
      io.to(`user:${userId}`).emit('notification', notif);
    }
    return notif;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

const getClientInfo = (req) => ({
  ip: req.ip || req.connection?.remoteAddress || '',
  device: req.headers['user-agent']?.substring(0, 200) || '',
  userAgent: req.headers['user-agent'] || '',
});

module.exports = { logActivity, createNotification, getClientInfo };
