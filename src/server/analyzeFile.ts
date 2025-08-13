import type { AnalyzeFile } from "wasp/server/api";
import type { Request, Response } from "express";

// Analyze servisinin taban adresi
const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5001";
// Çift / olmasın diye trailing slash'ı temizleyip /analyze ekliyoruz
const ANALYZE_ENDPOINT = `${BASE_URL.replace(/\/+$/, "")}/analyze`;

export const analyzeFile: AnalyzeFile = async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(ANALYZE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": (req.headers["content-type"] as string) ?? "application/octet-stream",
      },
      body: req as any,
      // Node 18+/20 için stream forward
      // @ts-expect-error node fetch duplex flag
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
