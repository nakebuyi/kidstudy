"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { LearningStep } from "@/types";

interface LearningContextType {
  charId: string | null;
  currentStep: LearningStep;
  step1Complete: boolean;
  step2Complete: boolean;
  step3Correct: boolean | null;
  startLearning: (charId: string) => void;
  completeStep: (step: LearningStep) => void;
  setQuizResult: (correct: boolean) => void;
  reset: () => void;
}

const LearningContext = createContext<LearningContextType>({
  charId: null,
  currentStep: 1,
  step1Complete: false,
  step2Complete: false,
  step3Correct: null,
  startLearning: () => {},
  completeStep: () => {},
  setQuizResult: () => {},
  reset: () => {},
});

export function LearningProvider({ children }: { children: ReactNode }) {
  const [charId, setCharId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<LearningStep>(1);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [step3Correct, setStep3Correct] = useState<boolean | null>(null);

  const startLearning = (id: string) => {
    setCharId(id);
    setCurrentStep(1);
    setStep1Complete(false);
    setStep2Complete(false);
    setStep3Correct(null);
  };

  const completeStep = (step: LearningStep) => {
    if (step === 1) setStep1Complete(true);
    if (step === 2) setStep2Complete(true);
    if (step < 3) setCurrentStep((step + 1) as LearningStep);
  };

  const setQuizResult = (correct: boolean) => {
    setStep3Correct(correct);
  };

  const reset = () => {
    setCharId(null);
    setCurrentStep(1);
    setStep1Complete(false);
    setStep2Complete(false);
    setStep3Correct(null);
  };

  return (
    <LearningContext.Provider
      value={{ charId, currentStep, step1Complete, step2Complete, step3Correct, startLearning, completeStep, setQuizResult, reset }}
    >
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  return useContext(LearningContext);
}