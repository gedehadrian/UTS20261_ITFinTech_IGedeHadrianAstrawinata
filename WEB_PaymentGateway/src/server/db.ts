import mongoose from "mongoose";

// Reuse one connection across hot reloads (dev) and warm serverless invocations (Vercel).
const cache = globalThis as unknown as { mongooseConnection?: Promise<typeof mongoose> };

export class DatabaseConfigError extends Error {}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new DatabaseConfigError("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }

  cache.mongooseConnection ??= mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || "web_payment_gateway",
    bufferCommands: false,
    serverSelectionTimeoutMS: 8000,
  });

  try {
    return await cache.mongooseConnection;
  } catch (err) {
    cache.mongooseConnection = undefined;
    throw err;
  }
}
