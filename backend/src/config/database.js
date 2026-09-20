import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  if (!env.MONGODB_URI) {
    console.warn('[Database] MONGODB_URI is not set. Database operations will operate in disconnected/fallback state.');
    return null;
  }
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error.message);
    console.warn('[Database] Continuing server boot without active MongoDB connection.');
    return null;
  }
};

mongoose.connection.on('connected', () => {
  console.log('[Database] Mongoose connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose disconnected');
});

export const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};
