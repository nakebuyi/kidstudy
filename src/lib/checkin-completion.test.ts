import { describe, it, expect } from "vitest";
import { isLastLearningItem } from "./checkin-completion";

describe("isLastLearningItem", () => {
  it("returns false when completing the first of 20 items", () => {
    expect(isLastLearningItem(0, 20)).toBe(false);
  });

  it("returns false for any non-final item", () => {
    expect(isLastLearningItem(1, 20)).toBe(false);
    expect(isLastLearningItem(18, 20)).toBe(false);
  });

  it("returns true only for the final item", () => {
    expect(isLastLearningItem(19, 20)).toBe(true);
  });

  it("returns true when there is a single item", () => {
    expect(isLastLearningItem(0, 1)).toBe(true);
  });

  it("returns false when there is no content", () => {
    expect(isLastLearningItem(0, 0)).toBe(false);
  });
});
