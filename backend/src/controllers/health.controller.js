import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';

export const getHealth = (_req, res) => {
  const dbConnected = isDatabaseConnected();
  const uptime = process.uptime();

  return res.status(dbConnected ? 200 : 503).json({
    success: true,
    message: 'PS-9 Backend is operational',
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: `${Math.floor(uptime)}s`,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
};

export const getSystemStatus = (_req, res) => {
  const dbConnected = isDatabaseConnected();
  const memoryUsage = process.memoryUsage();

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
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    },
  });
};
