import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { notifications as seedNotifications } from "../data/mockData";

const LS_KEY = "firulais-notifications-extra-read-ids";

function loadExtraReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

type SeedItem = (typeof seedNotifications)[number];

export type InboxNotification = SeedItem & { effectiveRead: boolean };

interface NotificationsContextType {
  items: InboxNotification[];
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [extraReadIds, setExtraReadIds] = useState<Set<string>>(loadExtraReadIds);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify([...extraReadIds]));
  }, [extraReadIds]);

  const items = useMemo<InboxNotification[]>(() => {
    return seedNotifications.map((n) => ({
      ...n,
      effectiveRead: n.read || extraReadIds.has(n.id),
    }));
  }, [extraReadIds]);

  const unreadCount = useMemo(() => items.filter((i) => !i.effectiveRead).length, [items]);

  const markAllRead = useCallback(() => {
    setExtraReadIds((prev) => {
      const next = new Set(prev);
      for (const n of seedNotifications) {
        const alreadyRead = n.read || next.has(n.id);
        if (!alreadyRead) next.add(n.id);
      }
      return next;
    });
  }, []);

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications debe usarse dentro de NotificationsProvider");
  return ctx;
}
