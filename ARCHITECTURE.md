# Water Quality Monitor API - Complete Architecture

## 🎯 Overview

Secure Node.js/TypeScript API for IoT Water Quality Monitoring System with real-time data broadcasting, JWT authentication, and AES-GCM encryption support.

## 📁 Project Structure

```
API/
├── src/
│   ├── config.ts                    # Environment configuration
│   ├── index.ts                     # Main Express app
│   │
│   ├── models/                      # MongoDB schemas
│   │   ├── User.ts                  # User model with bcrypt
│   │   └── SensorData.ts            # Sensor data model
│   │
│   ├── middleware/                  # Express middleware
│   │   └── auth.ts                  # JWT & Gateway auth
│   │
│   ├── routes/                      # API endpoints
│   │   ├── auth.ts                  # Authentication routes
│   │   └── sensorData.ts            # Sensor data CRUD
│   │
│   ├── services/                    # Business logic
│   │   ├── database.ts              # MongoDB connection
│   │   └── mqttService.ts           # MQTT broadcasting
│   │
│   └── utils/                       # Utilities
│       └── encryption.ts            # AES-GCM crypto functions
│
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore (includes .env!)
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vercel.json                      # Vercel deployment config
├── README.md                        # Full documentation
├── TESTING.md                       # API testing guide
└── ARCHITECTURE.md                  # This file
```

## 🔐 Security Architecture

### 1. **Gateway Authentication**
- API Key validation (`X-Gateway-Key` header)
- Separate from user JWT authentication
- Used for POST `/api/sensor-data` endpoint

### 2. **User Authentication**
- JWT access tokens (7 days default)
- JWT refresh tokens (30 days default)
- Bcrypt password hashing (10 salt rounds)
- Role-based access control (admin/user)

### 3. **Encryption**
- AES-128-GCM utilities matching ESP32 implementation
- Nonce (12 bytes) + Ciphertext + Auth Tag (16 bytes)
- Key management via environment variables
- Hash utilities (SHA-256)

### 4. **Additional Security**
- Helmet.js security headers
- CORS configuration
- Rate limiting (100 req/15min default)
- Input validation (express-validator)
- MongoDB injection protection

## 🌐 Data Flow

### Incoming Data (Gateway → API)
```
┌─────────────┐
│   Gateway   │
│   (ESP32)   │
└──────┬──────┘
       │ WiFi HTTP POST
       │ X-Gateway-Key: secret
       │ Content-Type: application/json
       ▼
┌─────────────────────────────────────┐
│  POST /api/sensor-data              │
│  ✓ Validate API key                 │
│  ✓ Parse JSON payload               │
│  ✓ Save to MongoDB                  │
│  ✓ Broadcast via MQTT (real-time)  │
└──────┬──────────────────────────────┘
       │
       ├────────────┐
       │            │
       ▼            ▼
  ┌─────────┐  ┌──────────┐
  │ MongoDB │  │   MQTT   │
  │Database │  │ Broker   │
  └─────────┘  └─────┬────┘
                     │
              ┌──────┴───────┐
              │              │
         ┌────▼────┐    ┌────▼────┐
         │Web App  │    │Mobile   │
         │(React)  │    │App      │
         └─────────┘    └─────────┘
```

### Outgoing Data (API → Clients)
```
┌──────────┐
│  Client  │
│(Web/App) │
└─────┬────┘
      │ GET /api/sensor-data
      │ Authorization: Bearer <JWT>
      ▼
┌────────────────────────┐
│ JWT Validation         │
│ ✓ Token signature      │
│ ✓ Token expiry         │
│ ✓ User active status   │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Query MongoDB          │
│ ✓ Apply filters        │
│ ✓ Pagination           │
│ ✓ Sorting              │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Return JSON Response   │
└────────────────────────┘
```

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (bcrypt hashed),
  name: String,
  role: String (enum: ['admin', 'user']),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### SensorData Collection
```javascript
{
  _id: ObjectId,
  deviceId: String (indexed),
  sequence: Number,
  timestamp: Date (indexed),
  receivedAt: Date (indexed),
  battery: {
    percentage: Number (0-100),
    voltage: Number,
    current: Number
  },
  ph: {
    value: Number (0-14),
    score: Number (0-10)
  },
  tds: {
    value: Number,
    score: Number (0-10)
  },
  turbidity: {
    voltage: Number,
    score: Number (0-10)
  },
  temperature: {
    water: Number,
    mpu: Number,
    esp32: Number
  },
  event: {
    type: String,
    accelG: Number,
    dynAccelG: Number
  },
  signal: {
    rssi: Number,
    snr: Number
  },
  rawPayload: Mixed,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ deviceId: 1, timestamp: -1 }
{ 'event.type': 1, timestamp: -1 }
```

## 🚀 API Endpoints

### Public Endpoints
- `GET /health` - Health check

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

### Sensor Data Endpoints (JWT Required)
- `GET /api/sensor-data` - List sensor data (paginated, filtered)
- `GET /api/sensor-data/latest` - Get latest reading
- `GET /api/sensor-data/stats` - Get statistics

### Gateway Endpoint (API Key Required)
- `POST /api/sensor-data` - Submit sensor data

## 🔄 Real-time Broadcasting

### MQTT Topics
- **Publish**: `water-quality/live-data`
  - Sensor data broadcasts
  - JSON format matching REST API
  - QoS 1 (at least once delivery)

### Message Format
```json
{
  "deviceId": "0x7CB597E9",
  "sequence": 42,
  "timestamp": "2026-03-28T00:00:00.000Z",
  "battery": { "percentage": 85, "voltage": 3.9, "current": 150 },
  "ph": { "value": 6.82, "score": 8 },
  "tds": { "value": 280, "score": 7 },
  "turbidity": { "voltage": 2.1, "score": 6 },
  "temperature": { "water": 22.5, "mpu": 45.2, "esp32": 38.1 },
  "event": { "type": "None" },
  "signal": { "rssi": -45, "snr": 11.2 }
}
```

## 🚢 Deployment

### Vercel (Recommended)
1. Automatic builds from Git
2. Environment variables via dashboard
3. HTTPS included
4. Global CDN
5. Zero config needed

### Environment Variables Checklist
✅ `JWT_SECRET`  
✅ `JWT_REFRESH_SECRET`  
✅ `GATEWAY_API_KEY`  
✅ `MONGODB_URI` (MongoDB Atlas)  
✅ `ENCRYPTION_KEY`  
⚠️ `MQTT_BROKER_URL` (optional)  

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm start
```

## 📈 Performance Considerations

### Database Indexes
- `deviceId + timestamp` (compound)
- `event.type + timestamp` (compound)
- `email` (unique)
- `timestamp` (descending)

### Rate Limiting
- 100 requests per 15 minutes per IP
- Applied to all `/api/*` routes
- Configurable via environment

### Compression
- Gzip compression enabled
- Reduces bandwidth by ~70%

### Pagination
- Default: 20 items per page
- Max: 100 items per page
- Prevents memory exhaustion

## 🔧 Development Workflow

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Run development server (hot reload)
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## 🧪 Testing

See `TESTING.md` for detailed test scenarios.

Quick test:
```bash
curl http://localhost:3000/health
```

Expected:
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2026-03-28T00:00:00.000Z",
  "mqtt": true
}
```

## 📦 Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+
- **Framework**: Express.js 4.18+
- **Database**: MongoDB 8.0+
- **Authentication**: JWT (jsonwebtoken)
- **Encryption**: Node.js crypto (built-in)
- **Real-time**: MQTT.js 5.3+
- **Validation**: express-validator 7.0+
- **Security**: Helmet.js 7.1+
- **Deployment**: Vercel

## 🎛️ Configuration Matrix

| Feature | Development | Production |
|---------|-------------|------------|
| Port | 3000 | Dynamic (Vercel) |
| MongoDB | Local | Atlas |
| MQTT | Optional | Optional |
| Logging | Verbose (morgan dev) | Standard (morgan combined) |
| CORS | localhost:* | Specific origins |
| Rate Limit | Disabled | 100/15min |
| Compression | Enabled | Enabled |

## 🔍 Monitoring & Logging

### Available Logs
- MongoDB connection status
- MQTT connection status
- HTTP requests (morgan)
- Authentication attempts
- Gateway data submissions
- Error stack traces (dev only)

### Health Check Response
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2026-03-28T00:00:00.000Z",
  "mqtt": true
}
```

## 🤝 Integration with Gateway

Update Gateway to send via WiFi:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* apiUrl = "https://your-api.vercel.app/api/sensor-data";
const char* apiKey = "your-gateway-secret-key";

void sendDataToAPI(JsonDocument& doc) {
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Gateway-Key", apiKey);
  
  String json;
  serializeJson(doc, json);
  
  int code = http.POST(json);
  Serial.printf("[API] Response: %d\n", code);
  
  http.end();
}
```

---

**Status**: ✅ Complete and Production-Ready  
**Last Updated**: 2026-03-28  
**Version**: 1.0.0
