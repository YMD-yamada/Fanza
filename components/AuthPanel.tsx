"use client";

import { useCallback, useState } from "react";
import { authenticateWithPasskey } from "@/lib/passkey-client";

type AuthMode = "login" | "register";

function readErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as { error?: unknown; message?: unknown };
  const message = record.error ?? record.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canPasskey, setCanPasskey] = useState(false);

  const submit = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    if (mode === "register") setCanPasskey(false);
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        canPasskey?: boolean;
      } | null;
      if (response.status === 409) {
        setMode("login");
        setCanPasskey(Boolean(payload?.canPasskey));
        setMessage(
          payload?.canPasskey
            ? "すでに登録済みです。パスワード未設定なので、メールでパスワードを設定するか、パスキーが残っている端末から入ってください。"
            : "すでに登録済みです。ログインしてください。",
        );
        return;
      }
      if (!response.ok) {
        setCanPasskey(Boolean(payload?.canPasskey));
        setMessage(readErrorMessage(payload, "認証に失敗しました"));
        return;
      }
      window.location.assign("/");
    } catch {
      setMessage("通信に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [email, mode, password]);

  const passkeyLogin = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authenticateWithPasskey(email);
      if (!result.ok) {
        setCanPasskey(true);
        setMessage(result.error);
        return;
      }
      window.location.assign("/");
    } catch {
      setCanPasskey(true);
      setMessage("パスキー認証に失敗しました。メールでパスワードを設定してください。");
    } finally {
      setBusy(false);
    }
  }, [email]);

  const forgot = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) {
        setMessage(readErrorMessage(payload, "リセット用メールを送れませんでした"));
        return;
      }
      setMessage(
        payload?.message ??
          "入力されたメールアドレス宛に案内を送りました。届かない場合は迷惑メールも確認してください。",
      );
    } catch {
      setMessage("通信に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [email]);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
      <h1 className="text-lg font-semibold text-zinc-50">
        {mode === "login" ? "ログイン" : "アカウント作成"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        検索はログインなしで使えます。アカウントはお気に入りの端末間同期用です。新規はパスワードだけです。以前パスキーだけで作った口座は、メールでパスワードを足せます。
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setMessage(null);
          }}
          className={`rounded-full px-3 py-1.5 text-sm ${
            mode === "login" ? "bg-zinc-100 text-zinc-950" : "border border-zinc-700 text-zinc-300"
          }`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setMessage(null);
            setCanPasskey(false);
          }}
          className={`rounded-full px-3 py-1.5 text-sm ${
            mode === "register" ? "bg-zinc-100 text-zinc-950" : "border border-zinc-700 text-zinc-300"
          }`}
        >
          新規
        </button>
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="block text-sm text-zinc-300">
          メール
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          パスワード
          <input
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-60"
        >
          {mode === "register" ? "アカウントを作る" : "ログイン"}
        </button>
      </form>
      {mode === "login" || canPasskey ? (
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void forgot()}
          className={`mt-3 w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${
            canPasskey
              ? "bg-sky-600 font-medium text-white"
              : "text-left text-zinc-400 underline"
          }`}
        >
          {canPasskey ? "メールでパスワードを設定" : "パスワードを忘れた"}
        </button>
      ) : null}
      {canPasskey ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void passkeyLogin()}
          className="mt-2 w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 disabled:opacity-60"
        >
          別の端末のパスキーで入る
        </button>
      ) : null}
      {message ? <p className="mt-3 text-sm text-amber-200">{message}</p> : null}
    </div>
  );
}
