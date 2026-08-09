const File = require('../models/File');

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} | User: ${socket.user?.email}`);

    // User joins their personal room (already done in socketAuth)
    socket.emit('connected', { message: 'Connected to Air Drive', userId: socket.user?._id });

    // Upload progress updates
    socket.on('upload:progress', (data) => {
      socket.to(`user:${socket.user._id}`).emit('upload:progress', data);
    });

    // File operation broadcasts
    socket.on('file:uploaded', (data) => {
      socket.to(`user:${socket.user._id}`).emit('file:updated', data);
    });

    socket.on('file:deleted', (data) => {
      socket.to(`user:${socket.user._id}`).emit('file:deleted', data);
    });

    // Real-time collaboration events
    socket.on('file:viewing', (data) => {
      if (!data?.fileId || !socket.rooms.has(`file:${data.fileId}`)) return;
      socket.to(`file:${data.fileId}`).emit('user:viewing', {
        userId: socket.user._id,
        userName: socket.user.name,
        fileId: data.fileId,
      });
    });

    socket.on('join:file', async (fileId, acknowledge) => {
      try {
        const allowed = await File.exists({ _id: fileId, userId: socket.user._id, trashed: false });
        if (!allowed) {
          acknowledge?.({ ok: false, error: 'File not found' });
          return;
        }
        await socket.join(`file:${fileId}`);
        acknowledge?.({ ok: true });
      } catch (_) {
        acknowledge?.({ ok: false, error: 'Unable to join file' });
      }
    });

    socket.on('leave:file', (fileId) => {
      socket.leave(`file:${fileId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { setupSocketHandlers };
