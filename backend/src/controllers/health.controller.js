import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { checkAiHealth } from '../services/ai.service.js';

export const getHealth = async (_req, res) => {
  const dbConnected = isDatabaseConnected();
  const uptime = process.uptime();
  const aiHealth = await checkAiHealth();

  return res.status(dbConnected ? 200 : 503).json({
    success: true,
    message: 'PS-9 Backend is operational',
    database: dbConnected ? 'connected' : 'disconnected',
    aiService: {
      status: aiHealth.isHealthy ? 'connected' : 'unavailable',
      capabilities: aiHealth.capabilities || [],
      error: aiHealth.error || null,
    },
    uptime: `${Math.floor(uptime)}s`,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
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
