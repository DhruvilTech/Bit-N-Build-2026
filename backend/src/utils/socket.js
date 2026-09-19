import { Server as SocketIOServer } from 'socket.io';

let ioInstance = null;

/**
 * Initialize Socket.IO with the HTTP server instance
 */
export const initSocketServer = (httpServer, clientOrigin = '*') => {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected (${socket.id}): ${reason}`);
    });
  });

  console.log('[Socket.IO] Real-time engine initialized.');
  return ioInstance;
};

/**
 * Retrieve the active Socket.IO server instance
 */
export const getSocketServer = () => {
  return ioInstance;
};

/**
 * Broadcast when a new incident is created
 */
export const emitIncidentNew = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:new', incident);
  }
};

/**
 * Broadcast when an existing incident is updated
 */
export const emitIncidentUpdated = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:updated', incident);
  }
};

/**
 * Broadcast when an incident's operational status changes
 */
export const emitIncidentStatusChanged = (incident) => {
  if (ioInstance) {
    ioInstance.emit('incident:statusChanged', incident);
  }
};
