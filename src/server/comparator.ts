// src/server/comparator.ts
import type { Request, Response } from "express";
import type { Compare, CompareLLM, CompareLLMDiff } from "wasp/server/api";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5001";
const BASE = BASE_URL.replace(/\/+$/, "");
const COMPARE_ENDPOINT = `${BASE}/compare`;
const COMPARE_LLM_ENDPOINT = `${BASE}/compare_llm`;
const COMPARE_LLM_DIFF_ENDPOINT = `${BASE}/compare_llm_diff`;

/** compare: gelen FormData stream’ini upstream’e aynen iletir (sade proxy) */
export const compare: Compare = async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(COMPARE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": (req.headers["content-type"] as string) ?? "application/octet-stream",
      },
      body: req as any,
      // @ts-expect-error Node fetch duplex flag (Node 18+/20)
      duplex: "half",
    });

    upstream.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(upstream.status);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("compare upstream error:", err);
    res.status(502).json({ error: "Compare servisine ulaşılamadı." });
  }
};

/** compare_llm: gelen FormData stream’ini upstream’e aynen iletir (sade proxy) */
export const compareLLM: CompareLLM = async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(COMPARE_LLM_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": (req.headers["content-type"] as string) ?? "application/octet-stream",
      },
      body: req as any,
      // @ts-expect-error Node fetch duplex flag (Node 18+/20)
      duplex: "half",
    });

    upstream.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(upstream.status);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("compare_llm upstream error:", err);
    res.status(502).json({ error: "LLM compare servisine ulaşılamadı." });
  }
};

/** compare_llm_diff: gelen FormData stream’ini upstream’e aynen iletir (sade proxy) */
export const compareLLMDiff: CompareLLMDiff = async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(COMPARE_LLM_DIFF_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": (req.headers["content-type"] as string) ?? "application/octet-stream",
      },
      body: req as any,
      // @ts-expect-error Node fetch duplex flag (Node 18+/20)
      duplex: "half",
    });

    upstream.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(upstream.status);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("compare_llm_diff upstream error:", err);
    res.status(502).json({ error: "LLM diff servisine ulaşılamadı." });
  }
};
