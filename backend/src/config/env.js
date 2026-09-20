import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'ps9_emergency_jwt_secret_2026',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_TIMEOUT: parseInt(process.env.AI_TIMEOUT || '8000', 10),
  AI_RETRY_COUNT: parseInt(process.env.AI_RETRY_COUNT || '2', 10),
  HUMAN_REVIEW_THRESHOLD: parseFloat(process.env.HUMAN_REVIEW_THRESHOLD || '0.70'),
  DUPLICATE_SIMILARITY_THRESHOLD: parseFloat(process.env.DUPLICATE_SIMILARITY_THRESHOLD || '0.75'),
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
  MISTRAL_MODEL: process.env.MISTRAL_MODEL || 'ministral-8b-latest',
  MISTRAL_FALLBACK_MODEL: process.env.MISTRAL_FALLBACK_MODEL || 'ministral-3b-latest',
};

if (!env.MONGODB_URI) {
  console.warn('[Warning] MONGODB_URI or MONGO_URI is not set in .env');
}
