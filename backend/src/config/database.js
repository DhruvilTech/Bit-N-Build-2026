import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
    });

    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error.message);
    throw error;
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
