import type { NextApiRequest, NextApiResponse } from "next";
import { DatabaseConfigError } from "@/server/db";

/** An expected failure whose message is safe to show to the shopper. */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function allowMethods(req: NextApiRequest, res: NextApiResponse, methods: string[]): boolean {
  if (methods.includes(req.method ?? "")) return true;
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ error: `Method ${req.method} not allowed` });
  return false;
}

export function sendApiError(res: NextApiResponse, err: unknown) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, ...err.details });
    return;
  }
  if (err instanceof DatabaseConfigError) {
    res.status(503).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
}
