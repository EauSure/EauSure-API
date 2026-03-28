import mongoose, { Document, Schema } from 'mongoose';

export interface ISensorData extends Document {
  deviceId: string;
  sequence: number;
  timestamp: Date;
  receivedAt: Date;
  
  // Battery data
  battery: {
    percentage: number;
    voltage: number;
    current: number;
  };
  
  // Water quality sensors
  ph: {
    value: number;
    score: number;
  };
  
  tds: {
    value: number;
    score: number;
  };
  
  turbidity: {
    voltage: number;
    score: number;
  };
  
  // Temperature sensors
  temperature: {
    water: number;
    mpu: number;
    esp32: number;
  };
  
  // Events
  event: {
    type: string;
    accelG?: number;
    dynAccelG?: number;
  };
  
  // LoRa signal quality
  signal: {
    rssi: number;
    snr: number;
  };
  
  // Raw JSON payload (for debugging)
  rawPayload?: any;
}

const SensorDataSchema = new Schema<ISensorData>({
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  sequence: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  battery: {
    percentage: { type: Number, min: 0, max: 100 },
    voltage: { type: Number, min: 0 },
    current: { type: Number },
  },
  ph: {
    value: { type: Number, min: 0, max: 14 },
    score: { type: Number, min: 0, max: 10 },
  },
  tds: {
    value: { type: Number, min: 0 },
    score: { type: Number, min: 0, max: 10 },
  },
  turbidity: {
    voltage: { type: Number, min: 0 },
    score: { type: Number, min: 0, max: 10 },
  },
  temperature: {
    water: Number,
    mpu: Number,
    esp32: Number,
  },
  event: {
    type: { type: String, default: 'None' },
    accelG: Number,
    dynAccelG: Number,
  },
  signal: {
    rssi: Number,
    snr: Number,
  },
  rawPayload: Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Compound index for efficient queries
SensorDataSchema.index({ deviceId: 1, timestamp: -1 });
SensorDataSchema.index({ 'event.type': 1, timestamp: -1 });

export default mongoose.model<ISensorData>('SensorData', SensorDataSchema);
