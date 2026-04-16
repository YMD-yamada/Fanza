"use client";

import { FormEvent, useEffect, useState } from "react";

import { notifyAuthChanged } from "@/lib/useStorage";

type Mode = "login" | "register";

const PASSWORD_MIN = 8;

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function AccountPanel() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { user?: SessionUser | null };
        if (!mounted) return;
        const nextSession = data.user ?? null;
        setSession(nextSession);
      } catch {
        if (!mounted) return;
        setSession(null);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("メールアドレスを入力してください。");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setMessage(`パスワードは${PASSWORD_MIN}文字以上で入力してください。`);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = (await response.json()) as { user?: SessionUser; message?: string };
      if (!response.ok || !data.user) {
        setMessage(data.message ?? "ログインに失敗しました。");
        return;
      }
      setSession(data.user);
      notifyAuthChanged();
      setPassword("");
      setMessage(mode === "register" ? "アカウントを作成してログインしました。" : "ログインしました。");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setMessage(data.message ?? "ログアウトに失敗しました。");
        return;
      }
      setSession(null);
      notifyAuthChanged();
      setPassword("");
      setMessage("ログアウトしました。");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  if (session) {
    return (
      <section className="space-y-2 rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-4">
        <p className="text-xs text-emerald-300">ログイン中（同期ON）</p>
        <p className="text-sm font-medium text-white">{session.email}</p>
        <button
          type="button"
          onClick={logout}
          disabled={isLoading}
          className="rounded-md border border-emerald-600/60 px-3 py-1.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-800/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ログアウト
        </button>
        {message && <p className="text-xs text-emerald-200">{message}</p>}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">アカウント（任意）</h2>
        <div className="flex gap-1 rounded-md bg-neutral-800 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded px-2 py-1 ${mode === "login" ? "bg-neutral-700 text-white" : "text-neutral-400"}`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded px-2 py-1 ${mode === "register" ? "bg-neutral-700 text-white" : "text-neutral-400"}`}
          >
            新規作成
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        未ログインでも利用できます。ログインするとお気に入りが端末間で同期されます。
      </p>

      <form onSubmit={submit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="メールアドレス"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={`パスワード（${PASSWORD_MIN}文字以上）`}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "register" ? "アカウント作成してログイン" : "ログイン"}
        </button>
      </form>

      {message && <p className="text-xs text-neutral-300">{message}</p>}
    </section>
  );
}

