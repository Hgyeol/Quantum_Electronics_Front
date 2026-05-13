"use client";

import { useState, type FormEvent } from "react";
import type { OutlookQueryInput } from "@/lib/api";

interface Props {
  onSubmit: (input: OutlookQueryInput) => void;
  loading: boolean;
}

export default function OutlookForm({ onSubmit, loading }: Props) {
  const [code, setCode] = useState("005930");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    onSubmit({ code: trimmed });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-surface-card-dark border border-hairline-on-dark p-6 flex flex-col md:flex-row md:items-end gap-4"
    >
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
    </form>
  );
}
