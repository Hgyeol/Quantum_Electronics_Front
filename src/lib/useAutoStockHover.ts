"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_HOVER_INTERVAL_MS = 5_000;

export interface AutoHoverPayload {
  code: string;
  name: string;
  price: number;
  changeRate: number;
}

interface Options<T> {
  items: T[];
  getKey: (item: T) => string;
  toHoverPayload: (item: T) => AutoHoverPayload | null;
  onHover?: (stock: AutoHoverPayload) => void;
  onHoverEnd?: () => void;
  resetKey: string;
  enabled?: boolean;
}

export function useAutoStockHover<T>({
  items,
  getKey,
  toHoverPayload,
  onHover,
  onHoverEnd,
  resetKey,
  enabled = true,
}: Options<T>) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const [userLocked, setUserLocked] = useState(false);
  const hoverRef = useRef(onHover);
  const hoverEndRef = useRef(onHoverEnd);
  const getKeyRef = useRef(getKey);
  const toHoverPayloadRef = useRef(toHoverPayload);
  const lastDispatchedRef = useRef<string | null>(null);

  useEffect(() => {
    hoverRef.current = onHover;
    hoverEndRef.current = onHoverEnd;
    getKeyRef.current = getKey;
    toHoverPayloadRef.current = toHoverPayload;
  }, [onHover, onHoverEnd, getKey, toHoverPayload]);

  useEffect(() => {
    setHoveredKey(null);
    setAutoIndex(0);
    setUserLocked(false);
    lastDispatchedRef.current = null;
    hoverEndRef.current?.();
  }, [resetKey]);

  useEffect(() => {
    if (!enabled || items.length === 0) {
      setHoveredKey(null);
      lastDispatchedRef.current = null;
      hoverEndRef.current?.();
      return;
    }

    if (userLocked) {
      const lockedItem = hoveredKey
        ? items.find((item) => getKeyRef.current(item) === hoveredKey)
        : null;
      if (!lockedItem) {
        setHoveredKey(null);
        setUserLocked(false);
        lastDispatchedRef.current = null;
        return;
      }
      const payload = toHoverPayloadRef.current(lockedItem);
      if (payload) {
        const signature = `${hoveredKey}:${payload.name}:${payload.price}:${payload.changeRate}`;
        if (lastDispatchedRef.current !== signature) {
          lastDispatchedRef.current = signature;
          hoverRef.current?.(payload);
        }
      }
      return;
    }

    const item = items[Math.min(autoIndex, items.length - 1)];
    const nextKey = getKeyRef.current(item);
    const payload = toHoverPayloadRef.current(item);
    if (!payload) {
      setHoveredKey(null);
      lastDispatchedRef.current = null;
      return;
    }

    const signature = `${nextKey}:${payload.name}:${payload.price}:${payload.changeRate}`;
    if (hoveredKey !== nextKey) {
      setHoveredKey(nextKey);
    }
    if (lastDispatchedRef.current !== signature) {
      lastDispatchedRef.current = signature;
      hoverRef.current?.(payload);
    }
  }, [enabled, items, autoIndex, userLocked, hoveredKey]);

  useEffect(() => {
    if (!enabled || userLocked || items.length <= 1) return;
    const timer = setInterval(() => {
      setAutoIndex((index) => (index + 1) % items.length);
    }, AUTO_HOVER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, userLocked, items.length, resetKey]);

  function handleRowHover(item: T) {
    const key = getKeyRef.current(item);
    const payload = toHoverPayloadRef.current(item);
    if (!payload) return;
    setUserLocked(true);
    if (hoveredKey !== key) {
      setHoveredKey(key);
    }
    const signature = `${key}:${payload.name}:${payload.price}:${payload.changeRate}`;
    lastDispatchedRef.current = signature;
    hoverRef.current?.(payload);
  }

  return {
    hoveredKey,
    handleRowHover,
  };
}
