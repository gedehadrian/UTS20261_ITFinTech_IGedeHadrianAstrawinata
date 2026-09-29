import { setServers } from "node:dns";
import mongoose from "mongoose";

// Reuse one connection across hot reloads (dev) and warm serverless invocations (Vercel).
const cache = globalThis as unknown as { mongooseConnection?: Promise<typeof mongoose> };

// mongodb+srv:// needs a DNS SRV lookup. Node asks only the first DNS server the OS lists, and some
// networks' resolvers (hotspots, campus Wi-Fi) refuse SRV queries, so retry once through public DNS.
const FALLBACK_DNS = ["8.8.8.8", "1.1.1.1"];

export class DatabaseConfigError extends Error {}

function isSrvLookupFailure(err: unknown) {
  const e = err as { syscall?: string; message?: string } | null;
  return e?.syscall === "querySrv" || /querySrv/.test(String(e?.message));
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new DatabaseConfigError("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }

  const options = {
    dbName: process.env.MONGODB_DB || "web_payment_gateway",
    bufferCommands: false,
    serverSelectionTimeoutMS: 8000,
  };

  cache.mongooseConnection ??= mongoose.connect(uri, options).catch((err: unknown) => {
    if (!isSrvLookupFailure(err)) throw err;
    console.warn("[db] DNS SRV lookup failed; retrying with public DNS", FALLBACK_DNS.join(", "));
    setServers(FALLBACK_DNS);
    return mongoose.connect(uri, options);
  });

  try {
    return await cache.mongooseConnection;
  } catch (err) {
    cache.mongooseConnection = undefined;
    throw err;
  }
}
