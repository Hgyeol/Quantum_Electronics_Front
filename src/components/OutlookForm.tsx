"use client";

import { useState, type FormEvent } from "react";
import type { OutlookQueryInput } from "@/lib/api";

interface Props {
  onSubmit: (input: OutlookQueryInput) => void;
  loading: boolean;
}

export default function OutlookForm({ onSubmit, loading }: Props) {
  const [code, setCode] = useState("005930");
  const [avgPrice, setAvgPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [heldSince, setHeldSince] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;
    onSubmit({
      code: code.trim(),
      avg_price: avgPrice ? Number(avgPrice) : undefined,
      quantity: quantity ? Number(quantity) : undefined,
      held_since: heldSince || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-surface-card-dark border border-hairline-on-dark p-6 grid gap-4 md:grid-cols-4"
    >
      <div className="md:col-span-1">
        <label className="text-xs font-medium uppercase tracking-wide text-muted block mb-1">
          종목코드
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="005930"
          className="w-full bg-canvas-dark border border-hairline-on-dark rounded-md px-3 h-10 text-on-dark font-mono tabular focus:outline-none focus:ring-2 focus:ring-info"
          required
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted block mb-1">
          평균 단가 (선택)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={avgPrice}
          onChange={(e) => setAvgPrice(e.target.value)}
          placeholder="0"
          className="w-full bg-canvas-dark border border-hairline-on-dark rounded-md px-3 h-10 text-on-dark font-mono tabular focus:outline-none focus:ring-2 focus:ring-info"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted block mb-1">
          수량 (선택)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          className="w-full bg-canvas-dark border border-hairline-on-dark rounded-md px-3 h-10 text-on-dark font-mono tabular focus:outline-none focus:ring-2 focus:ring-info"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted block mb-1">
          보유 시작 (선택)
        </label>
        <input
          type="date"
          value={heldSince}
          onChange={(e) => setHeldSince(e.target.value)}
          className="w-full bg-canvas-dark border border-hairline-on-dark rounded-md px-3 h-10 text-on-dark font-mono tabular focus:outline-none focus:ring-2 focus:ring-info"
        />
      </div>

      <div className="md:col-span-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary-active text-on-primary font-semibold h-10 px-6 rounded-md disabled:bg-primary-disabled disabled:text-muted-strong disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "분석 중..." : "전망 조회"}
        </button>
      </div>
    </form>
  );
}
