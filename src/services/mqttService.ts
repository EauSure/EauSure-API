import mqtt from 'mqtt';
import config from '../config';

class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize MQTT client and connect to broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: mqtt.IClientOptions = {
        clientId: config.mqtt.clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
      };

      if (config.mqtt.username) {
        options.username = config.mqtt.username;
        options.password = config.mqtt.password;
      }

      this.client = mqtt.connect(config.mqtt.brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log(`[MQTT] Connected to broker: ${config.mqtt.brokerUrl}`);
        console.log(`[MQTT] Publishing to topic: ${config.mqtt.publishTopic}`);
        resolve();
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] Connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
      });

      this.client.on('offline', () => {
        console.log('[MQTT] Client offline');
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('[MQTT] Connection closed');
        this.isConnected = false;
      });
    });
  }

  /**
   * Publish sensor data to MQTT topic for real-time updates
   */
  async publishSensorData(data: any): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] Client not connected, skipping publish');
      return false;
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify(data);
      
      this.client!.publish(
        config.mqtt.publishTopic,
        payload,
        { qos: config.mqtt.qos, retain: false },
        (error) => {
          if (error) {
            console.error('[MQTT] Publish error:', error);
            resolve(false);
          } else {
            console.log(`[MQTT] Published data (seq: ${data.sequence || 'N/A'})`);
            resolve(true);
          }
        }
      );
    });
  }

  /**
   * Publish custom event
   */
  async publishEvent(topic: string, data: any): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] Client not connected, skipping publish');
      return false;
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify(data);
      
      this.client!.publish(
        topic,
        payload,
        { qos: config.mqtt.qos, retain: false },
        (error) => {
          if (error) {
            console.error('[MQTT] Publish error:', error);
            resolve(false);
          } else {
            console.log(`[MQTT] Published to ${topic}`);
            resolve(true);
          }
        }
      );
    });
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          console.log('[MQTT] Disconnected');
          this.isConnected = false;
          resolve();
        });
      });
    }
  }
}

export default new MQTTService();
