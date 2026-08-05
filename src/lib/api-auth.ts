import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

export async function getUserFromRequest(
  req: NextRequest
): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  return verifyToken(token);
}
