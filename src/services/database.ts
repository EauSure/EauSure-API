import mongoose from 'mongoose';
import config from '../config';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('[MongoDB] Connected successfully');
    
    mongoose.connection.on('error', (error) => {
      console.error('[MongoDB] Connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[MongoDB] Disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    throw error;
  }
}
