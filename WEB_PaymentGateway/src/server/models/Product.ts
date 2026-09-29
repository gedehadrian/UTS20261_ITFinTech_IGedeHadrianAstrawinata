import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CATEGORY_VALUES } from "@/lib/categories";

const ProductSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: CATEGORY_VALUES, index: true },
    artist: { type: String, required: true, trim: true },
    medium: { type: String, required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, default: "" },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type ProductRecord = InferSchemaType<typeof ProductSchema>;

export const ProductModel: Model<ProductRecord> =
  (models.Product as Model<ProductRecord> | undefined) ?? model<ProductRecord>("Product", ProductSchema);
