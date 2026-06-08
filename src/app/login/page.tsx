"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { checkAuth, login } from "@/lib/api";

const AUTH_RETRY_COUNT = 6;
const AUTH_RETRY_DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function waitForSession() {
    for (let attempt = 0; attempt < AUTH_RETRY_COUNT; attempt += 1) {
      if (await checkAuth()) return true;
      await sleep(AUTH_RETRY_DELAY_MS);
    }
    return false;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      const authenticated = await waitForSession();
      if (!authenticated) {
        throw new Error("로그인 세션 확인에 실패했습니다");
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-dark px-5">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <span className="text-primary font-bold text-2xl tracking-tight">Quantum</span>
          <p className="text-muted text-sm mt-1">관리자 로그인</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-card-dark rounded-2xl shadow-card p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest" htmlFor="username">
              사용자명
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="w-full h-10 px-3 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full h-10 px-3 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-trading-down border-l-2 border-trading-down pl-3 py-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-primary hover:bg-primary-active disabled:opacity-60 text-on-primary text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                로그인 중
              </>
            ) : (
              "로그인"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
