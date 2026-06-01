"use client";

import { useEffect, useState } from "react";

export default function CenturyToggle() {
  const [isOld, setIsOld] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("century");
    const old = stored === "old";
    setIsOld(old);
    document.documentElement.classList.toggle("century-old", old);
  }, []);

  function toggle() {
    const next = !isOld;
    setIsOld(next);
    document.documentElement.classList.toggle("century-old", next);
    localStorage.setItem("century", next ? "old" : "new");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isOld ? "일반 모드로 전환" : "큰 글씨 모드로 전환 (50대 친화)"}
      className="fixed bottom-20 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer select-none"
      style={{
        background: isOld ? "var(--color-surface-elevated-dark)" : "var(--color-surface-card-dark)",
        border: "1px solid var(--c-border-md)",
        boxShadow: "0 4px 16px var(--c-shadow)",
        fontSize: "11px",
        fontWeight: 700,
        color: "var(--color-ink)",
        letterSpacing: "0.04em",
        lineHeight: 1,
        fontFamily: "var(--font-display)",
      }}
    >
      {isOld ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, lineHeight: 1.2 }}>
          <span style={{ fontSize: 14 }}>🖥</span>
          <span style={{ fontSize: 8, letterSpacing: 0 }}>일반</span>
        </span>
      ) : (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, lineHeight: 1.2 }}>
          <span style={{ fontSize: 14 }}>🔎</span>
          <span style={{ fontSize: 8, letterSpacing: 0 }}>큰글씨</span>
        </span>
      )}
    </button>
  );
}
