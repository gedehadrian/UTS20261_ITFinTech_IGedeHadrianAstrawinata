import { setServers } from "node:dns";
import mongoose from "mongoose";

// mongodb+srv:// needs a DNS SRV lookup. Node asks only the first DNS server Windows lists, and some
// networks' resolvers (hotspots, campus Wi-Fi) refuse SRV queries. Retry once through public DNS.
const FALLBACK_DNS = ["8.8.8.8", "1.1.1.1"];

function isSrvLookupFailure(err) {
  return err?.syscall === "querySrv" || /querySrv/.test(String(err?.message));
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }
  const options = { dbName: process.env.MONGODB_DB || "web_payment_gateway", serverSelectionTimeoutMS: 10_000 };
  try {
    await mongoose.connect(uri, options);
  } catch (err) {
    if (!isSrvLookupFailure(err)) throw err;
    console.warn(`DNS SRV lookup failed (${err.code}); retrying with public DNS ${FALLBACK_DNS.join(", ")}…`);
    setServers(FALLBACK_DNS);
    await mongoose.connect(uri, options);
  }
  return mongoose.connection;
}
