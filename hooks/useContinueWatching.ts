"use client";

import { useEffect, useState } from "react";
import { fetchContinueWatchingItems, type ContinueWatchingItem } from "@/lib/continueWatching";
import { useAuth } from "@/hooks/useAuth";

export function useContinueWatching() {
  const auth = useAuth();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);

  useEffect(() => {
    if (!auth.ready || !auth.user) {
      setItems([]);
      return;
    }

    let mounted = true;
    void fetchContinueWatchingItems().then((nextItems) => {
      if (mounted) setItems(nextItems);
    });

    const syncItems = (event: Event) => {
      const customEvent = event as CustomEvent<ContinueWatchingItem[]>;
      if (Array.isArray(customEvent.detail)) {
        setItems(customEvent.detail);
        return;
      }
      void fetchContinueWatchingItems().then((nextItems) => {
        if (mounted) setItems(nextItems);
      });
    };

    window.addEventListener("continue-watching-updated", syncItems);
    return () => {
      mounted = false;
      window.removeEventListener("continue-watching-updated", syncItems);
    };
  }, [auth.ready, auth.user?.userId]);

  return items;
}
