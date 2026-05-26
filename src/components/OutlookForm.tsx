"use client";

import { useState, type FormEvent } from "react";
import type { OutlookQueryInput } from "@/lib/api";

interface Props {
  onSubmit: (input: OutlookQueryInput) => void;
  loading: boolean;
}

const QUICK_PICKS = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "373220", name: "LG에너지솔루션" },
  { code: "207940", name: "삼성바이오" },
  { code: "035420", name: "NAVER" },
  { code: "035720", name: "카카오" },
];

export default function OutlookForm({ onSubmit, loading }: Props) {
  const [code, setCode] = useState("005930");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    onSubmit({ code: trimmed });
  }

  function pick(picked: string) {
    setCode(picked);
    onSubmit({ code: picked });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 입력 행 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="종목코드 또는 종목명 (예: 005930, 삼성전자)"
          className="flex-1 bg-surface-card-dark border border-hairline-on-dark rounded-lg px-4 h-11 text-on-dark font-mono tabular placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary-active text-on-primary font-semibold h-11 px-6 rounded-lg disabled:bg-primary-disabled disabled:text-muted-strong disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
        >
          {loading ? "분석 중…" : "전망 조회"}
        </button>
      </div>

      {/* 빠른 조회 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted">빠른 조회</span>
        <div className="w-px h-3 bg-hairline-on-dark" />
        {QUICK_PICKS.map((p) => (
          <button
            key={p.code}
            type="button"
            disabled={loading}
            onClick={() => pick(p.code)}
            className="text-[13px] text-muted-strong hover:text-on-dark disabled:opacity-40 transition-colors cursor-pointer"
          >
            {p.name}
            <span className="font-mono text-[11px] text-muted ml-1">{p.code}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
