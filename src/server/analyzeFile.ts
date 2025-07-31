import type { AnalyzeFile } from "wasp/server/api";
import { Request, Response } from "express";

// Wasp, burada 3. argüman olarak bir context objesi (user, entities vb.) geçiriyor
export const analyzeFile: AnalyzeFile = (
  req: Request,
  res: Response,
  context
) => {
  res.status(200).json({ summary: "Bu bir test özetidir." });
};
