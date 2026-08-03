/// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LearningProvider, useLearning } from "./LearningContext";

describe("LearningContext", () => {
  const wrapper = LearningProvider;

  it("initial state", () => {
    const { result } = renderHook(() => useLearning(), { wrapper });
    expect(result.current.charId).toBeNull();
    expect(result.current.currentStep).toBe(1);
    expect(result.current.step1Complete).toBe(false);
    expect(result.current.step2Complete).toBe(false);
    expect(result.current.step3Correct).toBeNull();
  });

  it("completeStep(1) sets step1Complete and advances to step 2", () => {
    const { result } = renderHook(() => useLearning(), { wrapper });
    act(() => result.current.completeStep(1));
    expect(result.current.step1Complete).toBe(true);
    expect(result.current.currentStep).toBe(2);
  });

  it("completeStep(2) sets step2Complete and advances to step 3", () => {
    const { result } = renderHook(() => useLearning(), { wrapper });
    act(() => result.current.completeStep(2));
    expect(result.current.step2Complete).toBe(true);
    expect(result.current.currentStep).toBe(3);
  });

  it("completeStep(3) does not advance beyond step 3", () => {
    const { result } = renderHook(() => useLearning(), { wrapper });
    act(() => result.current.completeStep(1));
    act(() => result.current.completeStep(2));
    act(() => result.current.completeStep(3));
    expect(result.current.currentStep).toBe(3);
  });

  it("setQuizResult sets step3Correct", () => {
    const { result } = renderHook(() => useLearning(), { wrapper });
    act(() => result.current.setQuizResult(true));
    expect(result.current.step3Correct).toBe(true);
    act(() => result.current.setQuizResult(false));
    expect(result.current.step3Correct).toBe(false);
  });

  it("startLearning resets and sets charId", () => {
    const { result } = renderHook(() => useLearning(), { wrapper });
    act(() => result.current.completeStep(1));
    act(() => result.current.completeStep(2));
    act(() => result.current.setQuizResult(true));
    act(() => result.current.startLearning("l1"));
    expect(result.current.charId).toBe("l1");
    expect(result.current.currentStep).toBe(1);
    expect(result.current.step1Complete).toBe(false);
    expect(result.current.step2Complete).toBe(false);
    expect(result.current.step3Correct).toBeNull();
  });

  it("reset restores initial state", () => {
    const { result } = renderHook(() => useLearning(), { wrapper });
    act(() => result.current.startLearning("l1"));
    act(() => result.current.completeStep(1));
    act(() => result.current.reset());
    expect(result.current.charId).toBeNull();
    expect(result.current.currentStep).toBe(1);
    expect(result.current.step1Complete).toBe(false);
    expect(result.current.step2Complete).toBe(false);
    expect(result.current.step3Correct).toBeNull();
  });
});