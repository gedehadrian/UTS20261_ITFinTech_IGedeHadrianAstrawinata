// Syncs the products collection with src/data/products.json (resets prices and stock).
// Usage: npm run seed   (reads MONGODB_URI from .env.local)
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { connectMongo } from "./connect.mjs";

const products = JSON.parse(await readFile(new URL("../src/data/products.json", import.meta.url), "utf8"));

const db = await connectMongo();
const now = new Date();
const result = await db.collection("products").bulkWrite(
  products.map((p) => ({
    updateOne: {
      filter: { slug: p.slug },
      update: { $set: { ...p, isActive: true, updatedAt: now }, $setOnInsert: { createdAt: now, __v: 0 } },
      upsert: true,
    },
  })),
);
console.log(`Catalogue synced: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
await mongoose.disconnect();
