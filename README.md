# Water Quality Monitor API

Secure RESTful API for IoT Water Quality Monitoring System with FreeRTOS, ESP32, JWT authentication, and AES-GCM encryption.

## Architecture

```
┌─────────────┐     WiFi HTTP POST      ┌─────────────┐
│   Gateway   │ ───────────────────────> │     API     │
│   (ESP32)   │  (Encrypted JSON + Key)  │  (Node.js)  │
└─────────────┘                          └──────┬──────┘
                                                │
                                         ┌──────┴──────┐
                                         │             │
                                    ┌────▼───┐    ┌───▼────┐
                                    │ MongoDB │    │  MQTT  │
                                    │Database │    │Broker  │
                                    └─────────┘    └───┬────┘
                                                       │
                                              ┌────────┴─────────┐
                                              │                  │
                                         ┌────▼────┐      ┌─────▼─────┐
                                         │Web App  │      │Mobile App │
                                         │(React)  │      │  (React   │
                                         │         │      │   Native) │
                                         └─────────┘      └───────────┘
```

## Features

### Security
✅ JWT-based authentication for users  
✅ API key authentication for Gateway  
✅ AES-128-GCM encryption matching Gateway/IoT Node  
✅ Rate limiting to prevent abuse  
✅ Helmet.js security headers  
✅ CORS configuration  

### Real-time Data
✅ HTTP POST endpoint for Gateway data submission  
✅ MQTT broadcasting for real-time updates  
✅ WebSocket support (optional)  

### Data Management
✅ MongoDB storage with indexes  
✅ Pagination and filtering  
✅ Statistics and aggregations  
✅ Event tracking (shake, battery, alerts)  

### API Endpoints
✅ Authentication (register, login, refresh)  
✅ Sensor data CRUD operations  
✅ Real-time latest readings  
✅ Historical data with filters  
✅ Statistics and analytics  

## Installation

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- MQTT Broker (optional, for real-time broadcasting)

### Setup

1. **Clone and navigate**
   ```bash
   cd API
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build TypeScript**
   ```bash
   npm run build
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for all available options. **Critical variables:**

```env
# Security (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key
GATEWAY_API_KEY=your-gateway-secret-key
ENCRYPTION_KEY=1f3831dd81f09f0902d4694ada13fd06  # Match Gateway config.h

# Database
MONGODB_URI=mongodb://localhost:27017/water-quality-monitor

# MQTT (optional, for real-time)
MQTT_BROKER_URL=mqtt://broker.hivemq.com
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "user" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### Sensor Data

#### Submit Data from Gateway
```http
POST /api/sensor-data
X-Gateway-Key: your-gateway-secret-key
Content-Type: application/json

{
  "seq": 42,
  "b": 85,
  "v": 3.9,
  "m": 150,
  "p": 6.82,
  "ps": 8,
  "t": 280,
  "ts": 7,
  "u": 2.1,
  "us": 6,
  "tw": 22.5,
  "tm": 45.2,
  "te": 38.1,
  "e": "None",
  "rssi": -45,
  "snr": 11.2
}
```

#### Get Sensor Data (Authenticated)
```http
GET /api/sensor-data?page=1&limit=20&startDate=2026-01-01
Authorization: Bearer <accessToken>
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `deviceId`: Filter by device
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date
- `eventType`: Filter by event (ALARM_SHAKE, None, etc.)

#### Get Latest Reading
```http
GET /api/sensor-data/latest
Authorization: Bearer <accessToken>
```

#### Get Statistics
```http
GET /api/sensor-data/stats?hours=24
Authorization: Bearer <accessToken>
```

### Health Check
```http
GET /health
```

## Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   npm run build
   vercel --prod
   ```

4. **Set environment variables**
   ```bash
   vercel env add JWT_SECRET
   vercel env add GATEWAY_API_KEY
   vercel env add MONGODB_URI
   vercel env add ENCRYPTION_KEY
   ```

### Environment Variables on Vercel

Go to your Vercel project → Settings → Environment Variables and add:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GATEWAY_API_KEY`
- `MONGODB_URI` (use MongoDB Atlas)
- `ENCRYPTION_KEY`
- `MQTT_BROKER_URL` (optional)

## Gateway Integration

Update Gateway code to send data via WiFi:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiUrl = "https://your-api.vercel.app/api/sensor-data";
const char* apiKey = "your-gateway-secret-key";

void sendToAPI(JsonDocument& doc) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Gateway-Key", apiKey);
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpCode = http.POST(jsonString);
    
    if (httpCode == 201) {
      Serial.println("[API] Data sent successfully");
    } else {
      Serial.printf("[API] Error: %d\n", httpCode);
    }
    
    http.end();
  }
}
```

## MQTT Real-time Updates

Subscribe to live data:

```javascript
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
  client.subscribe('water-quality/live-data');
});

client.on('message', (topic, message) => {
  const data = JSON.parse(message.toString());
  console.log('New sensor data:', data);
});
```

## Security Best Practices

1. **Never commit `.env` file**
2. **Use strong JWT secrets** (32+ random characters)
3. **Use unique Gateway API key**
4. **Enable HTTPS** in production
5. **Use MongoDB Atlas** with IP whitelist
6. **Rotate secrets** regularly
7. **Enable rate limiting** (configured by default)

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### MongoDB Connection Issues
- Check `MONGODB_URI` format
- For Atlas: whitelist IP address (0.0.0.0/0 for all IPs)
- Verify network connectivity

### MQTT Not Working
- MQTT is optional for real-time broadcasting
- API works without MQTT connection
- Check broker URL and credentials

### Gateway Cannot Connect
- Verify `GATEWAY_API_KEY` matches on both sides
- Check API URL is accessible from Gateway network
- Enable CORS for Gateway IP if needed

## License

MIT

## Support

For issues and questions, check the main project README.
