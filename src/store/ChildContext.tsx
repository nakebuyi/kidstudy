"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface Child {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
  pet: string;
}

interface ChildContextType {
  child: Child | null;
  children: Child[];
  setCurrentChild: (childId: string) => void;
  refreshChild: () => Promise<void>;
  refreshChildren: () => Promise<void>;
}

const ChildContext = createContext<ChildContextType>({
  child: null,
  children: [],
  setCurrentChild: () => {},
  refreshChild: async () => {},
  refreshChildren: async () => {},
});

export function ChildProvider({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();
  const [child, setChild] = useState<Child | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  const fetchChildren = useCallback(async () => {
    const res = await fetch("/api/children");
    if (res.ok) {
      const data = await res.json();
      setChildrenList(data);
      return data;
    }
    return [];
  }, []);

  const fetchChild = useCallback(async (childId: string) => {
    const res = await fetch(`/api/children?id=${childId}`);
    if (res.ok) {
      const data = await res.json();
      setChild(data);
    }
  }, []);

  const refreshChild = useCallback(async () => {
    const currentChildId = (session as any)?.currentChildId;
    if (currentChildId) await fetchChild(currentChildId);
  }, [session, fetchChild]);

  const refreshChildren = useCallback(async () => {
    await fetchChildren();
  }, [fetchChildren]);

  const setCurrentChild = useCallback(async (childId: string) => {
    await update({ currentChildId: childId });
    await fetchChild(childId);
  }, [update, fetchChild]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    const currentChildId = (session as any)?.currentChildId;
    if (currentChildId) {
      fetchChild(currentChildId);
    }
  }, [session, fetchChild]);

  return (
    <ChildContext.Provider
      value={{ child, children: childrenList, setCurrentChild, refreshChild, refreshChildren }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  return useContext(ChildContext);
}