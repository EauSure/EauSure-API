import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import SensorData from '../models/SensorData';
import { authenticate } from '../middleware/auth';
import { authenticateGateway } from '../middleware/auth';
import mqttService from '../services/mqttService';
import config from '../config';

const router = express.Router();

/**
 * POST /api/sensor-data
 * Receive sensor data from Gateway (authenticated with API key)
 */
router.post(
  '/',
  authenticateGateway,
  [
    body('seq').isInt(),
    body('deviceId').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const payload = req.body;

      // Parse sensor data from Gateway JSON format
      const sensorData = new SensorData({
        deviceId: payload.deviceId || config.encryption.deviceId,
        sequence: payload.seq,
        timestamp: new Date(),
        receivedAt: new Date(),
        battery: {
          percentage: payload.b || 0,
          voltage: payload.v || 0,
          current: payload.m || 0,
        },
        ph: {
          value: payload.p || 7.0,
          score: payload.ps || 10,
        },
        tds: {
          value: payload.t || 0,
          score: payload.ts || 10,
        },
        turbidity: {
          voltage: payload.u || 0,
          score: payload.us || 10,
        },
        temperature: {
          water: payload.tw || 0,
          mpu: payload.tm || 0,
          esp32: payload.te || 0,
        },
        event: {
          type: payload.e || 'None',
          accelG: payload.ag,
          dynAccelG: payload.dg,
        },
        signal: {
          rssi: payload.rssi || 0,
          snr: payload.snr || 0,
        },
        rawPayload: payload,
      });

      // Save to database
      await sensorData.save();

      console.log(`[API] Sensor data saved - seq: ${sensorData.sequence}, event: ${sensorData.event.type}`);

      // Broadcast to MQTT for real-time updates
      await mqttService.publishSensorData({
        deviceId: sensorData.deviceId,
        sequence: sensorData.sequence,
        timestamp: sensorData.timestamp,
        battery: sensorData.battery,
        ph: sensorData.ph,
        tds: sensorData.tds,
        turbidity: sensorData.turbidity,
        temperature: sensorData.temperature,
        event: sensorData.event,
        signal: sensorData.signal,
      });

      res.status(201).json({
        success: true,
        message: 'Sensor data received',
        data: {
          id: sensorData._id,
          sequence: sensorData.sequence,
        },
      });
    } catch (error: any) {
      console.error('[API] Error saving sensor data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save sensor data',
      });
    }
  }
);

/**
 * GET /api/sensor-data
 * Get sensor data with pagination and filtering (JWT authenticated)
 */
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('deviceId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('eventType').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};

      if (req.query.deviceId) {
        query.deviceId = req.query.deviceId;
      }

      if (req.query.startDate || req.query.endDate) {
        query.timestamp = {};
        if (req.query.startDate) {
          query.timestamp.$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          query.timestamp.$lte = new Date(req.query.endDate as string);
        }
      }

      if (req.query.eventType) {
        query['event.type'] = req.query.eventType;
      }

      // Execute query
      const [data, total] = await Promise.all([
        SensorData.find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(skip)
          .select('-rawPayload -__v'),
        SensorData.countDocuments(query),
      ]);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('[API] Error fetching sensor data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sensor data',
      });
    }
  }
);

/**
 * GET /api/sensor-data/latest
 * Get latest sensor reading (JWT authenticated)
 */
router.get(
  '/latest',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deviceId = req.query.deviceId as string;

      const query: any = {};
      if (deviceId) {
        query.deviceId = deviceId;
      }

      const latest = await SensorData.findOne(query)
        .sort({ timestamp: -1 })
        .select('-rawPayload -__v');

      if (!latest) {
        res.status(404).json({
          success: false,
          message: 'No data found',
        });
        return;
      }

      res.json({
        success: true,
        data: latest,
      });
    } catch (error: any) {
      console.error('[API] Error fetching latest data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch latest data',
      });
    }
  }
);

/**
 * GET /api/sensor-data/stats
 * Get statistics (JWT authenticated)
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deviceId = req.query.deviceId as string;
      const hours = parseInt(req.query.hours as string) || 24;

      const query: any = {
        timestamp: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
      };

      if (deviceId) {
        query.deviceId = deviceId;
      }

      const stats = await SensorData.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            avgPH: { $avg: '$ph.value' },
            avgTDS: { $avg: '$tds.value' },
            avgTemp: { $avg: '$temperature.water' },
            avgBattery: { $avg: '$battery.percentage' },
            minPH: { $min: '$ph.value' },
            maxPH: { $max: '$ph.value' },
            minTDS: { $min: '$tds.value' },
            maxTDS: { $max: '$tds.value' },
            count: { $sum: 1 },
          },
        },
      ]);

      const events = await SensorData.aggregate([
        { $match: { ...query, 'event.type': { $ne: 'None' } } },
        { $group: { _id: '$event.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      res.json({
        success: true,
        data: {
          statistics: stats[0] || {},
          events,
          period: `Last ${hours} hours`,
        },
      });
    } catch (error: any) {
      console.error('[API] Error fetching stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
      });
    }
  }
);

export default router;
