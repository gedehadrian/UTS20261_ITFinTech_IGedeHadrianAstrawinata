import catalog from "@/data/products.json";
import { CATEGORY_VALUES, type Category } from "@/lib/categories";
import type { Product } from "@/lib/types";
import { connectDB } from "@/server/db";
import { ProductModel, type ProductRecord } from "@/server/models/Product";

type ProductDoc = ProductRecord & { _id: { toString(): string } };

export function toProduct(doc: ProductDoc): Product {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    category: doc.category as Category,
    artist: doc.artist,
    medium: doc.medium,
    size: doc.size,
    price: doc.price,
    stock: doc.stock,
    description: doc.description ?? "",
    image: doc.image,
  };
}

/** Fills an empty products collection from src/data/products.json so a fresh database works out of the box. */
export async function ensureCatalogSeeded() {
  await connectDB();
  if ((await ProductModel.estimatedDocumentCount()) > 0) return;
  try {
    await ProductModel.insertMany(catalog, { ordered: false });
  } catch (err) {
    // Two requests can race to seed; duplicate-slug errors from the loser are harmless.
    if ((err as { code?: number }).code !== 11000) throw err;
  }
}

export async function listProducts(filter: { category?: string; q?: string } = {}): Promise<Product[]> {
  await ensureCatalogSeeded();
  const query: Record<string, unknown> = { isActive: true };
  if (filter.category && (CATEGORY_VALUES as readonly string[]).includes(filter.category)) {
    query.category = filter.category;
  }
  if (filter.q) {
    const pattern = new RegExp(filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { artist: pattern }, { medium: pattern }, { description: pattern }];
  }
  const docs = await ProductModel.find(query).sort({ _id: 1 }).lean<ProductDoc[]>();
  return docs.map(toProduct);
}
