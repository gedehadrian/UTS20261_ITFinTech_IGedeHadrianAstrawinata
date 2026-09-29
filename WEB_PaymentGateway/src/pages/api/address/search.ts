import type { NextApiRequest, NextApiResponse } from "next";
import type { AreaSuggestion } from "@/lib/types";
import { allowMethods } from "@/server/errors";

// Indonesian postal-code directory (kelurahan / kecamatan / kota / provinsi), no API key needed.
const KODEPOS_API = "https://kodepos.vercel.app/search/";
const MAX_RESULTS = 8;

interface KodeposEntry {
  code: number;
  village: string;
  district: string;
  regency: string;
  province: string;
}

function cleanRegency(name: string) {
  // "Administrasi Jakarta Selatan" is how DKI's cities are registered; shoppers just write "Jakarta Selatan".
  return name.replace(/^Administrasi\s+/i, "").trim();
}

// GET /api/address/search?q=senayan  ->  { results: AreaSuggestion[] }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;

  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
  if (q.length < 3) {
    res.status(200).json({ results: [] });
    return;
  }

  try {
    const upstream = await fetch(`${KODEPOS_API}?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(6_000) });
    if (!upstream.ok) throw new Error(`kodepos responded ${upstream.status}`);
    const body = (await upstream.json()) as { data?: KodeposEntry[] };

    const results: AreaSuggestion[] = (body.data ?? []).slice(0, MAX_RESULTS).map((entry) => {
      const city = cleanRegency(entry.regency);
      return {
        village: entry.village,
        district: entry.district,
        city,
        province: entry.province,
        postalCode: String(entry.code).padStart(5, "0"),
        area: `Kel. ${entry.village}, Kec. ${entry.district}, ${entry.province}`,
      };
    });

    // Postal data barely changes: let Vercel's CDN answer repeat searches.
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ results });
  } catch (err) {
    console.warn("[address search] upstream failed", err);
    // The form still works without suggestions; tell the UI so it can say so.
    res.status(502).json({ results: [], error: "Address suggestions are unavailable right now. Please fill in the fields manually." });
  }
}
