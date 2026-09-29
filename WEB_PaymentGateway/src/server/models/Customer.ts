import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A shopper, identified by email (guest checkout: no password). Updated with the latest details on every order. */
const CustomerSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    area: { type: String, default: "" },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    lastOrderAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type CustomerRecord = InferSchemaType<typeof CustomerSchema>;

export const CustomerModel: Model<CustomerRecord> =
  (models.Customer as Model<CustomerRecord> | undefined) ?? model<CustomerRecord>("Customer", CustomerSchema);
