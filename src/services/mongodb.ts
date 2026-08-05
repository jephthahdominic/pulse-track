import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoDB(): Promise<boolean> {
  if (isConnected) return true;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI not set — running in demo/mock mode');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,  // increased for Atlas latency
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,           // prevent idle socket kills
      heartbeatFrequencyMS: 10000,      // keep-alive ping every 10s
    });

    isConnected = true;

    // ── Reconnection recovery: flip flag back on every reconnect ─────────────
    mongoose.connection.on('connected',     () => { isConnected = true;  console.log('[MongoDB] Connected'); });
    mongoose.connection.on('reconnected',   () => { isConnected = true;  console.log('[MongoDB] Reconnected'); });
    mongoose.connection.on('disconnected',  () => { isConnected = false; console.warn('[MongoDB] Disconnected — waiting for reconnect...'); });
    mongoose.connection.on('error',         (err) => { isConnected = false; console.error('[MongoDB] Error:', err.message); });

    console.log('[MongoDB] Connected successfully');
    return true;
  } catch (err: any) {
    console.error('[MongoDB] Connection failed:', err.message);
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

