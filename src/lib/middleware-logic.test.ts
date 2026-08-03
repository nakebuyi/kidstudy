import { describe, it, expect } from "vitest";
import { decideRoute, PUBLIC_ROUTES } from "./middleware-logic";

describe("PUBLIC_ROUTES", () => {
  it("contains /login and /register", () => {
    expect(PUBLIC_ROUTES).toEqual(["/login", "/register"]);
  });
});

describe("decideRoute", () => {
  describe("unauthenticated", () => {
    it("redirects / to /login", () => {
      expect(decideRoute({ path: "/", isLoggedIn: false })).toEqual({
        type: "redirect",
        to: "/login",
      });
    });

    it("redirects /dashboard to /login", () => {
      expect(decideRoute({ path: "/dashboard", isLoggedIn: false })).toEqual({
        type: "redirect",
        to: "/login",
      });
    });

    it("redirects /parent to /login", () => {
      expect(decideRoute({ path: "/parent", isLoggedIn: false })).toEqual({
        type: "redirect",
        to: "/login",
      });
    });

    it("redirects /games/pet to /login", () => {
      expect(decideRoute({ path: "/games/pet", isLoggedIn: false })).toEqual({
        type: "redirect",
        to: "/login",
      });
    });

    it("allows /login", () => {
      expect(decideRoute({ path: "/login", isLoggedIn: false })).toEqual({
        type: "next",
      });
    });

    it("allows /register", () => {
      expect(decideRoute({ path: "/register", isLoggedIn: false })).toEqual({
        type: "next",
      });
    });
  });

  describe("logged-in on public routes", () => {
    it("redirects parent on /login to /parent", () => {
      expect(
        decideRoute({ path: "/login", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "redirect", to: "/parent" });
    });

    it("redirects child on /register to /dashboard", () => {
      expect(
        decideRoute({ path: "/register", isLoggedIn: true, role: "child" })
      ).toEqual({ type: "redirect", to: "/dashboard" });
    });
  });

  describe("child restrictions", () => {
    it("redirects child on /parent to /dashboard", () => {
      expect(
        decideRoute({ path: "/parent", isLoggedIn: true, role: "child" })
      ).toEqual({ type: "redirect", to: "/dashboard" });
    });

    it("redirects child on /parent/children to /dashboard", () => {
      expect(
        decideRoute({ path: "/parent/children", isLoggedIn: true, role: "child" })
      ).toEqual({ type: "redirect", to: "/dashboard" });
    });

    it("allows child on /dashboard", () => {
      expect(
        decideRoute({ path: "/dashboard", isLoggedIn: true, role: "child" })
      ).toEqual({ type: "next" });
    });

    it("allows child on /learning/literacy", () => {
      expect(
        decideRoute({ path: "/learning/literacy", isLoggedIn: true, role: "child" })
      ).toEqual({ type: "next" });
    });
  });

  describe("parent restrictions", () => {
    it("redirects parent on /dashboard to /parent", () => {
      expect(
        decideRoute({ path: "/dashboard", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "redirect", to: "/parent" });
    });

    it("redirects parent on /dashboard/foo to /parent", () => {
      expect(
        decideRoute({ path: "/dashboard/foo", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "redirect", to: "/parent" });
    });

    it("redirects parent on /games/pet to /parent", () => {
      expect(
        decideRoute({ path: "/games/pet", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "redirect", to: "/parent" });
    });

    it("allows parent on /parent", () => {
      expect(
        decideRoute({ path: "/parent", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "next" });
    });

    it("redirects parent on /learning/literacy to /parent", () => {
      expect(
        decideRoute({ path: "/learning/literacy", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "redirect", to: "/parent" });
    });

    it("redirects parent on /learning/pinyin to /parent", () => {
      expect(
        decideRoute({ path: "/learning/pinyin", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "redirect", to: "/parent" });
    });

    it("does NOT redirect parent on /games (exact, no trailing)", () => {
      expect(
        decideRoute({ path: "/games", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "next" });
    });

    it("does NOT redirect parent on /dashboardx (not a prefix match)", () => {
      expect(
        decideRoute({ path: "/dashboardx", isLoggedIn: true, role: "parent" })
      ).toEqual({ type: "next" });
    });
  });
});