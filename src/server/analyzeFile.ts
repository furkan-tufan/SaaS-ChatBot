// src/server/analyzeFile.ts
import type { AnalyzeFile } from "wasp/server/api";
import type { Request, Response } from "express";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5001";
const ANALYZE_ENDPOINT = `${BASE_URL.replace(/\/+$/, "")}/analyze`;

/** Prod için sade proxy: isteği Flask /analyze endpoint’ine iletir ve cevabı aynen döner. */
export const analyzeFile: AnalyzeFile = async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(ANALYZE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type":
          (req.headers["content-type"] as string) ?? "application/octet-stream",
      },
      body: req as any,
      // @ts-expect-error Node 18+/20 fetch duplex flag
      duplex: "half",
    });

    upstream.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(upstream.status);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("analyze upstream error:", err);
    res.status(502).json({ error: "Analyze servisine ulaşılamadı." });
  }
};
