import { auth } from "@/lib/auth";
import { decideRoute } from "@/lib/middleware-logic";
import { NextResponse } from "next/server";

export default auth((req) => {
  const decision = decideRoute({
    path: req.nextUrl.pathname,
    isLoggedIn: !!req.auth,
    role: (req.auth as any)?.role as "parent" | "child" | undefined,
  });

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};