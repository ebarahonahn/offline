const { Server } = require('socket.io');
const { verifyToken } = require('./jwt');
const env = require('./env');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Autenticación via JWT en handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Token requerido'));
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, rol } = socket.user;
    socket.join(`user:${userId}`);
    if (rol) socket.join(`rol:${rol}`);

    console.log(`[Socket] Usuario ${userId} conectado (${socket.id})`);

    socket.on('disconnect', () => {
      console.log(`[Socket] Usuario ${userId} desconectado`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io no inicializado');
  return io;
};

// Emitir evento a un usuario específico
const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

// Emitir evento a todos los supervisores/admins
const emitToRole = (rol, event, data) => {
  if (io) io.to(`rol:${rol}`).emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, emitToRole };
