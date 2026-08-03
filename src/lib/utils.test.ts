import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("later conflicting tailwind classes win", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, null, undefined, 0, "b")).toBe("a b");
  });

  it("handles no args", () => {
    expect(cn()).toBe("");
  });

  it("handles single class", () => {
    expect(cn("only")).toBe("only");
  });
});