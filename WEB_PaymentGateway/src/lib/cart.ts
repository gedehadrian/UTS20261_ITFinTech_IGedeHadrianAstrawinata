import { useSyncExternalStore } from "react";
import type { CartItem, Product } from "@/lib/types";

const STORAGE_KEY = "goresan:cart";
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isCartItem(value: unknown): value is CartItem {
  const v = value as CartItem;
  return !!v && typeof v.slug === "string" && typeof v.price === "number" && Number.isInteger(v.quantity) && v.quantity > 0;
}

function readStorage(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit(next: CartItem[]) {
  items = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode): the cart still works for this tab
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    items = readStorage();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (!loaded) {
    items = readStorage();
    loaded = true;
  }
  return items;
}

const getServerSnapshot = () => EMPTY;
const noopSubscribe = () => () => {};

function clampQuantity(quantity: number, stock: number) {
  return Math.max(0, Math.min(Math.floor(quantity), stock));
}

export const cartActions = {
  add(product: Product) {
    const current = getSnapshot();
    const existing = current.find((i) => i.slug === product.slug);
    if (existing) {
      cartActions.setQuantity(product.slug, existing.quantity + 1);
      return;
    }
    if (product.stock < 1) return;
    emit([
      ...current,
      {
        slug: product.slug,
        name: product.name,
        artist: product.artist,
        image: product.image,
        price: product.price,
        stock: product.stock,
        quantity: 1,
      },
    ]);
  },
  setQuantity(slug: string, quantity: number) {
    const current = getSnapshot();
    const next = current
      .map((i) => (i.slug === slug ? { ...i, quantity: clampQuantity(quantity, i.stock) } : i))
      .filter((i) => i.quantity > 0);
    emit(next);
  },
  remove(slug: string) {
    emit(getSnapshot().filter((i) => i.slug !== slug));
  },
  clear() {
    emit(EMPTY);
  },
};

export function useCart() {
  const cartItems = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // false during SSR and the hydration pass, true afterwards: lets pages avoid flashing an "empty cart" state
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const count = cartItems.reduce((n, i) => n + i.quantity, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const quantityOf = (slug: string) => cartItems.find((i) => i.slug === slug)?.quantity ?? 0;

  return { items: cartItems, hydrated, count, subtotal, quantityOf, ...cartActions };
}
