require('dotenv').config();
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Store connected users: socketId -> { userId, userName }
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // User joins with their info
    socket.on('user-connect', ({ userId, userName }) => {
      connectedUsers.set(socket.id, { userId, userName });
      io.emit('user-status', { userId, status: 'online' });
    });

    // Join a channel room
    socket.on('join-channel', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    // Leave a channel room
    socket.on('leave-channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    // Join a DM room
    socket.on('join-dm', (dmChannelId) => {
      socket.join(`dm:${dmChannelId}`);
    });

    // New message in channel
    socket.on('send-message', (message) => {
      if (message.channelId) {
        socket.to(`channel:${message.channelId}`).emit('new-message', message);
      } else if (message.dmChannelId) {
        socket.to(`dm:${message.dmChannelId}`).emit('new-message', message);
      }
    });

    // Edit message
    socket.on('edit-message', (message) => {
      if (message.channelId) {
        socket.to(`channel:${message.channelId}`).emit('message-updated', message);
      } else if (message.dmChannelId) {
        socket.to(`dm:${message.dmChannelId}`).emit('message-updated', message);
      }
    });

    // Delete message
    socket.on('delete-message', ({ messageId, channelId, dmChannelId }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('message-deleted', { messageId, channelId });
      } else if (dmChannelId) {
        socket.to(`dm:${dmChannelId}`).emit('message-deleted', { messageId, dmChannelId });
      }
    });

    // Reactions
    socket.on('add-reaction', ({ messageId, reaction, channelId, dmChannelId }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('reaction-updated', { messageId, reaction, channelId });
      } else if (dmChannelId) {
        socket.to(`dm:${dmChannelId}`).emit('reaction-updated', { messageId, reaction, dmChannelId });
      }
    });

    // Thread reply
    socket.on('new-thread-reply', ({ parentId, reply, channelId, dmChannelId }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('thread-reply', { parentId, reply, channelId });
      } else if (dmChannelId) {
        socket.to(`dm:${dmChannelId}`).emit('thread-reply', { parentId, reply, dmChannelId });
      }
    });

    // Typing indicators
    socket.on('typing-start', ({ channelId, dmChannelId, userName }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('user-typing', { userName, channelId });
      } else if (dmChannelId) {
        socket.to(`dm:${dmChannelId}`).emit('user-typing', { userName, dmChannelId });
      }
    });

    socket.on('typing-stop', ({ channelId, dmChannelId, userName }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('user-stop-typing', { userName, channelId });
      } else if (dmChannelId) {
        socket.to(`dm:${dmChannelId}`).emit('user-stop-typing', { userName, dmChannelId });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        io.emit('user-status', { userId: user.userId, status: 'offline' });
        connectedUsers.delete(socket.id);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
