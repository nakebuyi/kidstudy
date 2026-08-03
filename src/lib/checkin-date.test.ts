import { describe, it, expect, vi, afterEach } from "vitest";
import { getChinaDateStr } from "./checkin-date";

describe("getChinaDateStr", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same date as UTC during most of the day (Beijing 12:00)", () => {
    // Beijing 2026-08-03 12:00 = UTC 2026-08-03 04:00
    const d = new Date("2026-08-03T04:00:00.000Z");
    expect(getChinaDateStr(d)).toBe("2026-08-03");
  });

  it("returns the NEXT Beijing day during Beijing early morning", () => {
    // Beijing 2026-08-03 00:30 = UTC 2026-08-02 16:30
    const d = new Date("2026-08-02T16:30:00.000Z");
    expect(getChinaDateStr(d)).toBe("2026-08-03");
  });

  it("returns the SAME Beijing day during Beijing late night", () => {
    // Beijing 2026-08-03 23:30 = UTC 2026-08-03 15:30
    const d = new Date("2026-08-03T15:30:00.000Z");
    expect(getChinaDateStr(d)).toBe("2026-08-03");
  });

  it("defaults to the current time (uses Beijing date)", () => {
    vi.useFakeTimers();
    // Beijing 2026-08-03 00:30 = UTC 2026-08-02 16:30
    vi.setSystemTime(new Date("2026-08-02T16:30:00.000Z"));
    expect(getChinaDateStr()).toBe("2026-08-03");
  });
});
