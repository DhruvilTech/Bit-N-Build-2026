import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initSocketServer } from './utils/socket.js';
import { startScheduler, stopScheduler } from './services/scheduler.service.js';

const startServer = async () => {
  try {
    // 1. Connect Database
    console.log('[Bootstrap] Initializing database connection...');
    await connectDatabase();

    // 2. Create HTTP Server & initialize Socket.IO
    const httpServer = http.createServer(app);
    initSocketServer(httpServer, env.CLIENT_URL || '*');

    // 3. Start Periodic Escalation Evaluator
    let isEvaluating = false;
    const runEscalationScheduler = async () => {
      if (isEvaluating) return;
      isEvaluating = true;
      try {
        const { default: EscalationService } = await import('./services/escalation.service.js');
        await EscalationService.evaluateAllActiveIncidents();
      } catch (e) {
        console.error('[EscalationScheduler] Check error:', e.message);
      } finally {
        isEvaluating = false;
      }
    };

    // Run first check 5s after startup, then every 60s
    setTimeout(runEscalationScheduler, 5000);
    const escalationInterval = setInterval(runEscalationScheduler, 60000);

    // 4. Start Centralized SLA / Alert Engine Scheduler
    startScheduler();

    // 4. Start Listening
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
      clearInterval(escalationInterval);
      stopScheduler();
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
