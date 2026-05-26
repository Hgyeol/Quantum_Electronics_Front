"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "qe_watchlist_codes";

function readCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCodes(codes: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export function useWatchlist() {
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    setCodes(readCodes());
  }, []);

  const add = useCallback((code: string) => {
    setCodes((prev) => {
      if (prev.includes(code)) return prev;
      const next = [...prev, code];
      writeCodes(next);
      return next;
    });
  }, []);

  const remove = useCallback((code: string) => {
    setCodes((prev) => {
      const next = prev.filter((c) => c !== code);
      writeCodes(next);
      return next;
    });
  }, []);

  const toggle = useCallback((code: string) => {
    setCodes((prev) => {
      const next = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code];
      writeCodes(next);
      return next;
    });
  }, []);

  const has = useCallback(
    (code: string) => codes.includes(code),
    [codes]
  );

  return { codes, add, remove, toggle, has };
}
