import type { Request, Response } from "express";
import type { HashFile, QaEvent } from "wasp/server/api";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5001";
const BASE = BASE_URL.replace(/\/+$/, "");
const HASH_ENDPOINT = `${BASE}/hash`;
const QA_ENDPOINT = `${BASE}/qa`;

/** req.body varsa onu, yoksa stream'den JSON oku */
async function getJsonPayload(req: Request): Promise<unknown> {
  const b = (req as any).body;
  if (b && (typeof b !== "object" || Object.keys(b).length > 0)) return b;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export const hashFile: HashFile = async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(HASH_ENDPOINT, {
      method: "POST",
      headers: {
        // upstream kendi boundary'sini Stream üzerinden alır; gelen header'ı forward edelim
        "content-type": (req.headers["content-type"] as string) ?? "application/octet-stream",
      },
      // Express Request stream'ini olduğu gibi forward
      body: req as any,
      // @ts-expect-error Node fetch duplex flag (Node 18+/20)
      duplex: "half",
    });

    upstream.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(upstream.status);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("hash upstream error:", err);
    res.status(502).json({ error: "Hash servisine ulaşılamadı." });
  }
};

export const qaEvent: QaEvent = async (req: Request, res: Response) => {
  try {
    const payload = await getJsonPayload(req);

    const upstream = await fetch(QA_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type":
          (req.headers["content-type"] as string) ?? "application/json",
      },
      body: JSON.stringify(payload)
    });

    upstream.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(upstream.status);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("qa upstream error:", err);
    res.status(502).json({ error: "QA servisine ulaşılamadı." });
  }
};
