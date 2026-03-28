import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config';
import { connectDatabase } from './services/database';
import mqttService from './services/mqttService';

// Import routes
import authRoutes from './routes/auth';
import sensorDataRoutes from './routes/sensorData';

const app: Application = express();

// =====================================================
// Middleware
// =====================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// =====================================================
// Routes
// =====================================================

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    mqtt: mqttService.isClientConnected(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sensor-data', sensorDataRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Error]', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(config.env === 'development' && { stack: err.stack }),
  });
});

// =====================================================
// Startup
// =====================================================

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to MQTT broker (for broadcasting)
    try {
      await mqttService.connect();
    } catch (error) {
      console.warn('[MQTT] Failed to connect, continuing without MQTT broadcasting');
    }

    // Start Express server
    app.listen(config.port, () => {
      console.log('\n==============================================');
      console.log(`🚀 Water Quality Monitor API`);
      console.log(`==============================================`);
      console.log(`Environment: ${config.env}`);
      console.log(`Server: ${config.apiBaseUrl}`);
      console.log(`Port: ${config.port}`);
      console.log(`MongoDB: ${config.mongodb.uri.includes('@') ? 'Connected (Atlas)' : 'Connected (Local)'}`);
      console.log(`MQTT: ${mqttService.isClientConnected() ? 'Connected' : 'Disabled'}`);
      console.log(`==============================================\n`);
    });
  } catch (error) {
    console.error('[Startup] Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('[Unhandled Rejection]', reason);
  process.exit(1);
});

// Start server
startServer();

export default app;
