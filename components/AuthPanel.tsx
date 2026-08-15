"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticateWithPasskey } from "@/lib/passkey-client";

type AuthMode = "login" | "register";

type AuthPayload = {
  error?: string;
  message?: string;
  canPasskey?: boolean;
  canClaimPassword?: boolean;
};

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
  const [canClaimPassword, setCanClaimPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { user?: unknown } | null;
        if (!cancelled && data?.user) {
          window.location.replace("/");
          return;
        }
      } catch {
        /* stay on login */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyRecoveryFlags = useCallback((payload: AuthPayload | null) => {
    setCanPasskey(Boolean(payload?.canPasskey));
    setCanClaimPassword(Boolean(payload?.canClaimPassword));
  }, []);

  const claimLegacy = useCallback(async () => {
    const response = await fetch("/api/auth/password/claim-legacy", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
    });
    const payload = (await response.json().catch(() => null)) as AuthPayload | null;
    if (!response.ok) {
      applyRecoveryFlags(payload);
      setMessage(readErrorMessage(payload, "パスワードの設定に失敗しました"));
      return false;
    }
    window.location.assign("/");
    return true;
  }, [applyRecoveryFlags, email, password, remember]);

  const submit = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    if (mode === "register") {
      setCanPasskey(false);
      setCanClaimPassword(false);
    }
    try {
      if (mode === "login" && canClaimPassword) {
        await claimLegacy();
        return;
      }
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const payload = (await response.json().catch(() => null)) as AuthPayload | null;
      if (response.status === 409) {
        setMode("login");
        applyRecoveryFlags(payload);
        setMessage(
          payload?.message ??
            (payload?.canClaimPassword
              ? "すでに登録済みです。パスワード未設定なので、今のパスワードを設定して入れます。"
              : "すでに登録済みです。ログインしてください。"),
        );
        return;
      }
      if (!response.ok) {
        applyRecoveryFlags(payload);
        setMessage(readErrorMessage(payload, "認証に失敗しました"));
        return;
      }
      window.location.assign("/");
    } catch {
      setMessage("通信に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [applyRecoveryFlags, canClaimPassword, claimLegacy, email, mode, password, remember]);

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
      setMessage("パスキー認証に失敗しました。パスワードを設定して入ってください。");
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

  const submitLabel =
    mode === "register" ? "アカウントを作る" : canClaimPassword ? "パスワードを設定して入る" : "ログイン";

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
      <h1 className="text-lg font-semibold text-zinc-50">
        {mode === "login" ? "ログイン" : "アカウント作成"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        検索はログインなしで使えます。このサイトのお気に入り同期用です。FANZA公式の会員ログイン連携は第三者サイト向けに公開されていないため、FANZA本体の購入履歴やマイリストは取り込めません。FANZAと同じメールで作ると管理しやすいです。一度入れば、この端末では次回から自動で入ります。
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
            setCanClaimPassword(false);
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
            autoComplete={mode === "register" || canClaimPassword ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="mt-1"
          />
          <span>この端末では次回から自動で入る（約13か月）</span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </form>
      {mode === "login" && !canClaimPassword ? (
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