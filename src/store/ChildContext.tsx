"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

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
  const { user, token, setCurrentChildId } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  const role = user?.role;
  const currentChildId = user?.currentChildId;

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchChildren = useCallback(async () => {
    const res = await fetch("/api/children", { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setChildrenList(data);
      return data;
    }
    return [];
  }, [token]);

  const fetchChild = useCallback(async (childId: string) => {
    const res = await fetch(`/api/children?id=${childId}`, { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setChild(data);
    }
  }, [token]);

  const refreshChild = useCallback(async () => {
    if (currentChildId) await fetchChild(currentChildId);
  }, [currentChildId, fetchChild]);

  const refreshChildren = useCallback(async () => {
    await fetchChildren();
  }, [fetchChildren]);

  const setCurrentChild = useCallback(async (childId: string) => {
    if (role !== "PARENT") return;
    setCurrentChildId(childId);
    await fetchChild(childId);
  }, [role, setCurrentChildId, fetchChild]);

  const removeChild = useCallback(async (childId: string) => {
    const res = await fetch(`/api/children/${childId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (!res.ok) {
      let errorMsg = "删除失败";
      try {
        const data = await res.json();
        if (data?.error) errorMsg = data.error;
      } catch { /* */ }
      throw new Error(errorMsg);
    }

    setChildrenList(prev => prev.filter(c => c.id !== childId));

    if (currentChildId === childId) {
      const updated = await fetchChildren();
      if (updated.length > 0) {
        await setCurrentChild(updated[0].id);
      } else {
        setChild(null);
        setCurrentChildId(null);
      }
    }
  }, [fetchChildren, setCurrentChild, setCurrentChildId, currentChildId, token]);

  useEffect(() => {
    if (role === "PARENT") {
      fetchChildren();
    } else if (role === "CHILD" && currentChildId) {
      fetchChild(currentChildId);
    }
  }, [fetchChildren, fetchChild, role, currentChildId]);

  useEffect(() => {
    if (currentChildId) {
      fetchChild(currentChildId);
    }
  }, [currentChildId, fetchChild]);

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
