// Things this browser remembers for the shopper: the orders it placed and the last shipping details.
// Nothing here is shared with other devices; the server still checks email + order code for tracking.
import { useSyncExternalStore } from "react";
import { EMPTY_SHIPPING, type ShippingDetails } from "@/lib/validation";

const ORDERS_KEY = "goresan:orders";
const SHIPPING_KEY = "goresan:shipping";
const MAX_ORDERS = 20;

export interface DeviceOrder {
  id: string;
  code: string;
  createdAt: string;
}

const EMPTY: DeviceOrder[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedOrders: DeviceOrder[] = EMPTY;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode): nothing is remembered, everything else still works
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === ORDERS_KEY || e.key === SHIPPING_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function isDeviceOrder(value: unknown): value is DeviceOrder {
  const v = value as DeviceOrder;
  return !!v && typeof v.id === "string" && typeof v.code === "string" && typeof v.createdAt === "string";
}

function getOrdersSnapshot(): DeviceOrder[] {
  const raw = read(ORDERS_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = JSON.parse(raw ?? "[]");
      cachedOrders = Array.isArray(parsed) ? parsed.filter(isDeviceOrder) : EMPTY;
    } catch {
      cachedOrders = EMPTY;
    }
  }
  return cachedOrders;
}

export function rememberOrder(order: DeviceOrder) {
  const current = getOrdersSnapshot();
  if (current.some((o) => o.id === order.id)) return;
  write(ORDERS_KEY, JSON.stringify([order, ...current].slice(0, MAX_ORDERS)));
}

export function useDeviceOrders() {
  const orders = useSyncExternalStore(subscribe, getOrdersSnapshot, () => EMPTY);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return { orders, hydrated };
}

export function saveShipping(details: ShippingDetails) {
  write(SHIPPING_KEY, JSON.stringify(details));
}

export function loadSavedShipping(): ShippingDetails | null {
  try {
    const parsed = JSON.parse(read(SHIPPING_KEY) ?? "null") as Partial<ShippingDetails> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const details = { ...EMPTY_SHIPPING };
    for (const key of Object.keys(EMPTY_SHIPPING) as (keyof ShippingDetails)[]) {
      if (typeof parsed[key] === "string") details[key] = parsed[key];
    }
    return details;
  } catch {
    return null;
  }
}

export function useHasSavedShipping(): boolean {
  return useSyncExternalStore(subscribe, () => read(SHIPPING_KEY) !== null, () => false);
}
