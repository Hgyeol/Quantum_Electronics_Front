"use client";

import { useState, type FormEvent } from "react";
import type { OutlookQueryInput } from "@/lib/api";

interface Props {
  onSubmit: (input: OutlookQueryInput) => void;
  loading: boolean;
}

const QUICK_PICKS: { code: string; name: string }[] = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "373220", name: "LG에너지솔루션" },
  { code: "207940", name: "삼성바이오로직스" },
  { code: "035420", name: "NAVER" },
  { code: "035720", name: "카카오" },
];

export default function OutlookForm({ onSubmit, loading }: Props) {
  const [code, setCode] = useState("005930");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    onSubmit({ code: trimmed });
  }

  function pick(picked: string) {
    setCode(picked);
    onSubmit({ code: picked });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-surface-card-dark border border-hairline-on-dark p-6 space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted block mb-1">
            종목코드 또는 종목명
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="005930 또는 삼성전자"
            className="w-full bg-canvas-dark border border-hairline-on-dark rounded-md px-3 h-10 text-on-dark font-mono tabular focus:outline-none focus:ring-2 focus:ring-info"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary-active text-on-primary font-semibold h-10 px-6 rounded-md disabled:bg-primary-disabled disabled:text-muted-strong disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "분석 중..." : "전망 조회"}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
          빠른 조회
        </span>
        {QUICK_PICKS.map((p) => (
          <button
            key={p.code}
            type="button"
            disabled={loading}
            onClick={() => pick(p.code)}
            className="group flex items-baseline gap-1.5 text-sm text-muted-strong hover:text-on-dark disabled:opacity-40 transition-colors cursor-pointer"
          >
            <span>{p.name}</span>
            <span className="font-mono tabular text-[11px] text-muted group-hover:text-muted-strong">
              {p.code}
            </span>
          </button>
        ))}
      </div>
    </form>
  );
}
