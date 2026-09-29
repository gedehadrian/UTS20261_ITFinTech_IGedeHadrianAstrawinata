// Links orders placed before customer tracking existed to a customer record (one per email).
// Safe to run more than once. Usage: npm run backfill-customers   (reads MONGODB_URI from .env.local)
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "web_payment_gateway" });
const checkouts = mongoose.connection.collection("checkouts");
const customers = mongoose.connection.collection("customers");

// Orders that have shipping details but no customer yet, oldest first.
const orphans = await checkouts
  .find({ customer: null, "shipping.email": { $type: "string" } })
  .sort({ createdAt: 1 })
  .toArray();

let created = 0;
let linked = 0;
for (const order of orphans) {
  const s = order.shipping;
  const email = s.email.trim().toLowerCase();
  const orderedAt = order.createdAt ?? new Date();
  const existing = await customers.findOne({ email });

  let customerId = existing?._id;
  if (!existing) {
    const now = new Date();
    const res = await customers.insertOne({
      email,
      fullName: s.fullName,
      phone: s.phone,
      address: s.address,
      area: s.area ?? "",
      city: s.city,
      postalCode: s.postalCode,
      lastOrderAt: orderedAt,
      createdAt: orderedAt,
      updatedAt: now,
      __v: 0,
    });
    customerId = res.insertedId;
    created++;
  } else if (!existing.lastOrderAt || existing.lastOrderAt < orderedAt) {
    // Only let this order refresh the customer if it is newer than what the record already holds.
    await customers.updateOne(
      { _id: existing._id },
      {
        $set: {
          fullName: s.fullName,
          phone: s.phone,
          address: s.address,
          area: s.area ?? "",
          city: s.city,
          postalCode: s.postalCode,
          lastOrderAt: orderedAt,
          updatedAt: new Date(),
        },
      },
    );
  }

  await checkouts.updateOne({ _id: order._id }, { $set: { customer: customerId } });
  linked++;
}

console.log(`Backfill done: ${linked} order(s) linked, ${created} new customer(s).`);
await mongoose.disconnect();
