import React, { createContext, useContext, useState, useCallback } from "react";

export interface TabItem {
  id: string;       // route path e.g. "/activity"
  titleKey: string;  // i18n key
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsContextValue {
  tabs: TabItem[];
  activeTabId: string | null;
  openTab: (tab: TabItem) => boolean; // returns false if limit reached and tab doesn't exist
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  MAX_TABS: number;
}

const MAX_TABS = 5;

const TabsContext = createContext<TabsContextValue | null>(null);

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((tab: TabItem): boolean => {
    // Check if already exists
    const exists = tabs.find((t) => t.id === tab.id);
    if (exists) {
      setActiveTabId(tab.id);
      return true;
    }
    // Check limit
    if (tabs.length >= MAX_TABS) {
      return false;
    }
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    return true;
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      setActiveTabId((current) => {
        if (current !== id) return current;
        if (next.length === 0) return null;
        const newIdx = Math.min(idx, next.length - 1);
        return next[newIdx].id;
      });
      return next;
    });
  }, []);

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  return (
    <TabsContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab, MAX_TABS }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used within TabsProvider");
  return ctx;
}
