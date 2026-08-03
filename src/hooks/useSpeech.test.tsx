/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeech } from "./useSpeech";

// --- mock window.speechSynthesis ---
class MockUtterance {
  text: string;
  lang = "";
  voice: unknown = null;
  rate = 1;
  pitch = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

const zhVoice = { lang: "zh-CN", default: true };
const enVoice = { lang: "en-US", default: false };

beforeEach(() => {
  vi.resetAllMocks();
  mockGetVoices.mockReturnValue([zhVoice, enVoice]);
  mockSpeak.mockImplementation((u: MockUtterance) => {
    u.onstart?.();
  });

  // @ts-expect-error partial mock
  window.speechSynthesis = {
    speak: mockSpeak,
    cancel: mockCancel,
    getVoices: mockGetVoices,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  };
  // @ts-expect-error partial mock
  globalThis.SpeechSynthesisUtterance = MockUtterance;
});

afterEach(() => {
  // window.speechSynthesis stays defined; beforeEach reassigns fresh mocks,
  // and setup.ts cleanup() runs React unmount (which calls removeEventListener)
  // after this hook.
});

function setup() {
  const { result } = renderHook(() => useSpeech());
  return result;
}

function getSpokenText(): string {
  const u = mockSpeak.mock.calls[0][0] as MockUtterance;
  return u.text;
}

describe("useSpeech — English fallback", () => {
  it("speaks the original text when an English voice exists", () => {
    const result = setup();
    act(() => {
      result.current.speak("apple", "en-US", "爱普");
    });
    // en-US voice available → original text used
    expect(getSpokenText()).toBe("apple");
  });

  it("speaks the Chinese fallback when no English voice exists", () => {
    mockGetVoices.mockReturnValue([zhVoice]); // only Chinese voice
    const result = setup();
    act(() => {
      result.current.speak("apple", "en-US", "爱普");
    });
    // No en voice → fallback Chinese transliteration
    expect(getSpokenText()).toBe("爱普");
  });

  it("speaks original text when no English voice and no fallback given", () => {
    mockGetVoices.mockReturnValue([zhVoice]); // only Chinese voice
    const result = setup();
    act(() => {
      result.current.speak("apple", "en-US");
    });
    expect(getSpokenText()).toBe("apple");
  });
});
