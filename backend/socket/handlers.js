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
      socket.to(`file:${data.fileId}`).emit('user:viewing', {
        userId: socket.user._id,
        userName: socket.user.name,
        fileId: data.fileId,
      });
    });

    socket.on('join:file', (fileId) => {
      socket.join(`file:${fileId}`);
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
