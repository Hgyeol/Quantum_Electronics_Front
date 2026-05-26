"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchMyWatchlist, saveMyWatchlist } from "@/lib/api";

export function useWatchlist() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchMyWatchlist()
      .then(setCodes)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback((next: string[]) => {
    saveMyWatchlist(next).catch(() => {});
  }, []);

  const add = useCallback((code: string) => {
    setCodes((prev) => {
      if (prev.includes(code)) return prev;
      const next = [...prev, code];
      save(next);
      return next;
    });
  }, [save]);

  const remove = useCallback((code: string) => {
    setCodes((prev) => {
      const next = prev.filter((c) => c !== code);
      save(next);
      return next;
    });
  }, [save]);

  const toggle = useCallback((code: string) => {
    setCodes((prev) => {
      const next = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code];
      save(next);
      return next;
    });
  }, [save]);

  const has = useCallback(
    (code: string) => codes.includes(code),
    [codes]
  );

  return { codes, add, remove, toggle, has, loaded };
}
