"use client";

import { SessionProvider } from "next-auth/react";
import { ChildProvider } from "./ChildContext";
import { LearningProvider } from "./LearningContext";
import { ReactNode } from "react";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ChildProvider>
        <LearningProvider>
          {children}
        </LearningProvider>
      </ChildProvider>
    </SessionProvider>
  );
}