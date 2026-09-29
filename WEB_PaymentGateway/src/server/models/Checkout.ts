import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CHECKOUT_STATUSES } from "@/lib/status";
import { PAYMENT_METHODS } from "@/lib/payment-methods";

const CheckoutItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    artist: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const ShippingSchema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
  },
  { _id: false },
);

const CheckoutSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    items: {
      type: [CheckoutItemSchema],
      required: true,
      validate: { validator: (v: unknown[]) => v.length > 0, message: "A checkout needs at least one item." },
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true },
    tax: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: CHECKOUT_STATUSES, default: "OPEN", index: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    shipping: { type: ShippingSchema, default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHODS.map((m) => m.value), default: null },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type CheckoutRecord = InferSchemaType<typeof CheckoutSchema>;

export const CheckoutModel: Model<CheckoutRecord> =
  (models.Checkout as Model<CheckoutRecord> | undefined) ?? model<CheckoutRecord>("Checkout", CheckoutSchema);
