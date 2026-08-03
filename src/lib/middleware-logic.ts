export const PUBLIC_ROUTES = ["/login", "/register"] as const;

export type MiddlewareDecision =
  | { type: "redirect"; to: string }
  | { type: "next" };

export function decideRoute(args: {
  path: string;
  isLoggedIn: boolean;
  role?: "parent" | "child";
}): MiddlewareDecision {
  const { path, isLoggedIn, role } = args;

  if (!isLoggedIn && !(PUBLIC_ROUTES as readonly string[]).includes(path)) {
    return { type: "redirect", to: "/login" };
  }

  if (isLoggedIn && (PUBLIC_ROUTES as readonly string[]).includes(path)) {
    if (role === "parent") {
      return { type: "redirect", to: "/parent" };
    }
    return { type: "redirect", to: "/dashboard" };
  }

  if (isLoggedIn && role === "child") {
    if (path.startsWith("/parent")) {
      return { type: "redirect", to: "/dashboard" };
    }
  }

  if (isLoggedIn && role === "parent") {
    if (
      path === "/dashboard" ||
      path.startsWith("/dashboard/") ||
      path.startsWith("/games/") ||
      path.startsWith("/learning/")
    ) {
      return { type: "redirect", to: "/parent" };
    }
  }

  return { type: "next" };
}