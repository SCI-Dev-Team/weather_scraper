/**
 * Central configuration management
 */
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  scraper: {
    baseUrl: 'http://cambodiameteo.com/forecast',
    dataRetentionDays: 14,
    requestTimeout: 30000, // 30 seconds
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  },
};

export const validateConfig = () => {
  const errors = [];

  if (!config.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!config.supabase.serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
};
