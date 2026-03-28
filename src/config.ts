import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  env: string;
  port: number;
  apiBaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  mongodb: {
    uri: string;
  };
  mqtt: {
    brokerUrl: string;
    port: number;
    username?: string;
    password?: string;
    clientId: string;
    publishTopic: string;
    qos: 0 | 1 | 2;
  };
  gateway: {
    apiKey: string;
  };
  encryption: {
    deviceId: string;
    key: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origins: string[];
  };
  log: {
    level: string;
  };
  admin: {
    email: string;
    password: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/water-quality-monitor',
  },

  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com',
    port: parseInt(process.env.MQTT_PORT || '1883', 10),
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: process.env.MQTT_CLIENT_ID || 'water-quality-api',
    publishTopic: process.env.MQTT_PUBLISH_TOPIC || 'water-quality/live-data',
    qos: (parseInt(process.env.MQTT_QOS || '1', 10) as 0 | 1 | 2),
  },

  gateway: {
    apiKey: process.env.GATEWAY_API_KEY || 'dev-gateway-key-change-in-production',
  },

  encryption: {
    deviceId: process.env.DEVICE_ID || '0x7CB597E9',
    key: process.env.ENCRYPTION_KEY || '1f3831dd81f09f0902d4694ada13fd06',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@waterquality.local',
    password: process.env.ADMIN_PASSWORD || 'change-this-password',
  },
};

// Validation for production
if (config.env === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
    'GATEWAY_API_KEY',
    'ENCRYPTION_KEY',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  if (config.jwt.secret === 'dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production!');
  }

  if (config.gateway.apiKey === 'dev-gateway-key-change-in-production') {
    throw new Error('GATEWAY_API_KEY must be changed in production!');
  }
}

export default config;
