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
  AI_TIMEOUT: parseInt(process.env.AI_TIMEOUT_MS || process.env.AI_TIMEOUT || '8000', 10),
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || process.env.AI_TIMEOUT || '8000', 10),
  AI_RETRY_COUNT: parseInt(process.env.AI_MAX_RETRIES || process.env.AI_RETRY_COUNT || '2', 10),
  AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES || process.env.AI_RETRY_COUNT || '2', 10),
  AI_RETRY_DELAY_MS: parseInt(process.env.AI_RETRY_DELAY_MS || '200', 10),
  HUMAN_REVIEW_THRESHOLD: parseFloat(process.env.HUMAN_REVIEW_THRESHOLD || '0.70'),
  DUPLICATE_SIMILARITY_THRESHOLD: parseFloat(process.env.DUPLICATE_SIMILARITY_THRESHOLD || '0.75'),
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
  MISTRAL_MODEL: process.env.MISTRAL_MODEL || 'ministral-8b-latest',
  MISTRAL_FALLBACK_MODEL: process.env.MISTRAL_FALLBACK_MODEL || 'ministral-3b-latest',
  // Phase 13 Speeds (km/h)
  SPEED_AMBULANCE: parseFloat(process.env.SPEED_AMBULANCE || '45'),
  SPEED_FIRE: parseFloat(process.env.SPEED_FIRE || '40'),
  SPEED_POLICE: parseFloat(process.env.SPEED_POLICE || '50'),
  SPEED_RESCUE: parseFloat(process.env.SPEED_RESCUE || '35'),
  SPEED_HAZMAT: parseFloat(process.env.SPEED_HAZMAT || '30'),
  SPEED_GENERAL: parseFloat(process.env.SPEED_GENERAL || '40'),
  // Phase 14 SLA / Delay
  SLA_CHECK_INTERVAL_MS: parseInt(process.env.SLA_CHECK_INTERVAL_MS || '30000', 10),
  // Phase 15 Alert Escalation
  P1_ESCALATION_THRESHOLD_MINUTES: parseInt(process.env.P1_ESCALATION_THRESHOLD_MINUTES || '15', 10),
};

if (!env.MONGODB_URI) {
  console.warn('[Warning] MONGODB_URI or MONGO_URI is not set in .env');
}
