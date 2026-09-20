import mongoose from 'mongoose';
import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { checkAiHealth } from '../services/ai.service.js';
import { getSocketHealth, emitSystemHealth } from '../utils/socket.js';
import { getSchedulerHealth } from '../services/scheduler.service.js';

let lastReportedStatus = null;

export const getHealth = async (_req, res) => {
  const dbConnected = isDatabaseConnected();
  const uptimeSeconds = Math.floor(process.uptime());
  const aiHealth = await checkAiHealth();

  let status = 'healthy';
  if (!dbConnected) {
    status = 'unhealthy';
  } else if (!aiHealth.isHealthy) {
    status = 'degraded';
  }

  return res.status(dbConnected ? 200 : 503).json({
    status,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    // Backward compatibility fields for existing consumers and tests
    success: true,
    message: 'PS-9 Backend is operational',
    database: dbConnected ? 'connected' : 'disconnected',
    aiService: {
      status: aiHealth.isHealthy ? 'connected' : 'unavailable',
      capabilities: aiHealth.capabilities || [],
      error: aiHealth.error || null,
    },
    environment: env.NODE_ENV,
  });
};

export const getDetailedHealth = async (_req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();

  // 1. Database Connectivity & Ping Latency
  let dbStatus = 'unavailable';
  let dbLatencyMs = null;
  const dbStart = Date.now();
  try {
    if (isDatabaseConnected() && mongoose.connection.readyState === 1) {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = dbLatencyMs > 2000 ? 'degraded' : 'healthy';
    }
  } catch (_err) {
    dbStatus = 'unavailable';
  }

  // 2. AI Service Health with Latency
  const aiStart = Date.now();
  const aiHealth = await checkAiHealth();
  const aiLatencyMs = Date.now() - aiStart;
  let aiStatus = 'unavailable';
  if (aiHealth.isHealthy) {
    aiStatus = aiLatencyMs > 5000 ? 'degraded' : 'healthy';
  } else if (aiHealth.error && !aiHealth.error.includes('unavailable')) {
    aiStatus = 'degraded';
  }

  // 3. Socket.IO Health
  const socketHealth = getSocketHealth();

  // 4. Background Scheduler Health
  const schedulerHealth = getSchedulerHealth();

  // Overall status derivation
  let overallStatus = 'healthy';
  if (dbStatus === 'unavailable') {
    overallStatus = 'unhealthy';
  } else if (aiStatus !== 'healthy' || schedulerHealth.status === 'degraded' || dbStatus === 'degraded') {
    overallStatus = 'degraded';
  }

  const detailedData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    services: {
      api: {
        status: 'healthy',
        version: '1.0.0',
        uptimeSeconds,
        memory: {
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      ai: {
        status: aiStatus,
        latencyMs: aiLatencyMs,
        capabilities: aiHealth.capabilities || [],
        embeddingModelLoaded: aiHealth.embeddingModelLoaded ?? null,
        duplicateModelLoaded: aiHealth.duplicateModelLoaded ?? null,
        error: aiHealth.error || null,
      },
      socket: {
        status: socketHealth.status,
        connectedClients: socketHealth.connectedClients,
      },
      scheduler: {
        status: schedulerHealth.status,
        running: schedulerHealth.running,
        intervalMs: schedulerHealth.intervalMs,
        lastRunAt: schedulerHealth.lastRunAt,
        lastSuccessAt: schedulerHealth.lastSuccessAt,
        lastFailureAt: schedulerHealth.lastFailureAt,
        runCount: schedulerHealth.runCount,
      },
    },
  };

  // Broadcast state change if overall status transitioned
  if (lastReportedStatus !== overallStatus) {
    lastReportedStatus = overallStatus;
    emitSystemHealth({
      status: overallStatus,
      timestamp: detailedData.timestamp,
      services: {
        api: detailedData.services.api.status,
        database: detailedData.services.database.status,
        ai: detailedData.services.ai.status,
        socket: detailedData.services.socket.status,
        scheduler: detailedData.services.scheduler.status,
      },
    });
  }

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  return res.status(httpStatus).json(detailedData);
};

export const getSystemStatus = async (_req, res) => {
  const dbConnected = isDatabaseConnected();
  const memoryUsage = process.memoryUsage();
  const aiHealth = await checkAiHealth();

  return res.status(200).json({
    success: true,
    message: 'PS-9 System status report',
    data: {
      api: {
        status: 'ONLINE',
        version: '1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        environment: env.NODE_ENV,
      },
      database: {
        status: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
        driver: 'Mongoose 8.x',
      },
      aiService: {
        status: aiHealth.isHealthy ? 'CONNECTED' : 'UNAVAILABLE',
        capabilities: aiHealth.capabilities || [],
        embeddingModel: aiHealth.embeddingModelLoaded ?? null,
        duplicateModel: aiHealth.duplicateModelLoaded ?? null,
        url: env.AI_SERVICE_URL || 'http://localhost:8000',
        error: aiHealth.error || null,
      },
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    },
  });
};

