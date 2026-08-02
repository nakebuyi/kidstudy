import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/register"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const role = (req.auth as any)?.role as "parent" | "child" | undefined;

  if (!isLoggedIn && !publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && publicRoutes.includes(path)) {
    if (role === "parent") {
      return NextResponse.redirect(new URL("/parent", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isLoggedIn && role === "child") {
    // Child cannot access parent routes
    if (path.startsWith("/parent")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (isLoggedIn && role === "parent") {
    // Parent home is /parent, not /dashboard
    if (path === "/dashboard" || path.startsWith("/dashboard/") || path.startsWith("/games/")) {
      return NextResponse.redirect(new URL("/parent", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};