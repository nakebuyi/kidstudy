"use client";

import { AuthProvider } from "./AuthContext";
import { ChildProvider } from "./ChildContext";
import { LearningProvider } from "./LearningContext";
import { ReactNode } from "react";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChildProvider>
        <LearningProvider>
          {children}
        </LearningProvider>
      </ChildProvider>
    </AuthProvider>
  );
}
