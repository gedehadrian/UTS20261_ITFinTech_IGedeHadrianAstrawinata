import type { Category } from "@/lib/categories";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  artist: string;
  medium: string;
  size: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

/** A cart line, kept in localStorage. Prices here are for display only; the server re-prices every checkout. */
export interface CartItem {
  slug: string;
  name: string;
  artist: string;
  image: string;
  price: number;
  stock: number;
  quantity: number;
}
