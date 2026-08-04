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
  account?: { id: string; username: string; nickname: string } | null;
}

interface ChildContextType {
  child: Child | null;
  children: Child[];
  setCurrentChild: (childId: string) => void;
  refreshChild: () => Promise<void>;
  refreshChildren: () => Promise<void>;
  removeChild: (childId: string) => Promise<void>;
}

const ChildContext = createContext<ChildContextType>({
  child: null,
  children: [],
  setCurrentChild: () => {},
  refreshChild: async () => {},
  refreshChildren: async () => {},
  removeChild: async () => {},
});

export function ChildProvider({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();
  const [child, setChild] = useState<Child | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  const role = (session as any)?.role as string | undefined;
  const currentChildId = (session as any)?.currentChildId;

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
    const role = (session as any)?.role;
    if (role !== "parent") return;  // child accounts cannot switch
    await update({ currentChildId: childId });
    await fetchChild(childId);
  }, [update, fetchChild, session]);

  const removeChild = useCallback(async (childId: string) => {
    const res = await fetch(`/api/children/${childId}`, { method: "DELETE" });
    if (!res.ok) return;

    // 乐观更新：从本地列表中移除
    setChildrenList(prev => prev.filter(c => c.id !== childId));

    // 若删除的是当前选中的孩子，需要切换
    const currentChildId = (session as any)?.currentChildId;
    if (currentChildId === childId) {
      const updated = await fetchChildren();
      if (updated.length > 0) {
        await setCurrentChild(updated[0].id);
      } else {
        setChild(null);
      }
    }
  }, [fetchChildren, setCurrentChild, session]);

  useEffect(() => {
    if (role === "parent") {
      fetchChildren();
    } else if (role === "child" && currentChildId) {
      fetchChild(currentChildId);
    }
  }, [fetchChildren, fetchChild, session, role, currentChildId]);

  useEffect(() => {
    const currentChildId = (session as any)?.currentChildId;
    if (currentChildId) {
      fetchChild(currentChildId);
    }
  }, [session, fetchChild]);

  return (
    <ChildContext.Provider
      value={{ child, children: childrenList, setCurrentChild, refreshChild, refreshChildren, removeChild }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  return useContext(ChildContext);
}