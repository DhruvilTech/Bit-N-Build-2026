import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initSocketServer } from './utils/socket.js';

const startServer = async () => {
  try {
    // 1. Connect Database
    console.log('[Bootstrap] Initializing database connection...');
    await connectDatabase();

    // 2. Create HTTP Server & initialize Socket.IO
    const httpServer = http.createServer(app);
    initSocketServer(httpServer, env.CLIENT_URL || '*');

    // 3. Start Listening
    const server = httpServer.listen(env.PORT, () => {
      console.log('====================================================');
      console.log(`🚀 PS-9 EMERGENCY BACKEND IS RUNNING`);
      console.log(`📡 Port: ${env.PORT}`);
      console.log(`🌐 Environment: ${env.NODE_ENV}`);
      console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
      console.log(`📊 System status: http://localhost:${env.PORT}/api/system/status`);
      console.log(`⚡ WebSocket Mesh: ws://localhost:${env.PORT}`);
      console.log('====================================================');
    });

    // Graceful Shutdown
    const handleShutdown = (signal) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);
      server.close(() => {
        console.log('[Shutdown] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('[Bootstrap] Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();
