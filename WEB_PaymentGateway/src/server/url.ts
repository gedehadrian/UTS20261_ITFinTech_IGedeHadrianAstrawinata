import type { NextApiRequest } from "next";

/**
 * Public origin of the app, used for Xendit's redirect URLs.
 * APP_BASE_URL wins; otherwise it is derived from the request (works on Vercel and behind ngrok).
 */
export function publicBaseUrl(req: NextApiRequest): string {
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const proto = String(req.headers["x-forwarded-proto"] ?? "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:3000").split(",")[0].trim();
  return `${proto}://${host}`;
}
