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

export interface RequestSession {
  user: { id: string };
  role: string;
  currentChildId: string | null;
}

/**
 * Build a session-like object from the middleware-injected request headers
 * (`x-user-id`, `x-user-role`). Returns `null` when no user is present.
 *
 * The middleware verifies the JWT bearer token and injects these headers for
 * every protected `/api/*` request; this helper reads them and normalizes the
 * role to lowercase so existing session-based code (`getAuthorizedChild`,
 * route role checks) keeps working unchanged.
 *
 * For CHILD users the JWT `userId` is the child's own id, so `currentChildId`
 * is set to `userId` to preserve the child-authorization contract.
 */
export function sessionFromRequest(req: Request): RequestSession | null {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;
  const role = (req.headers.get("x-user-role") ?? "").toLowerCase();
  return {
    user: { id: userId },
    role,
    currentChildId: role === "child" ? userId : null,
  };
}
