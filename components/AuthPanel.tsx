"use client";

import { useCallback, useEffect, useState } from "react";

import { addPasskeyToAccount, authenticateWithPasskey, createAccountWithPasskey } from "@/lib/passkey-client";

type View = "main" | "create" | "legacy";

const primaryButton =
  "w-full rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-60";
const secondaryButton =
  "w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 disabled:opacity-60";
const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base text-zinc-100 outline-none focus:border-emerald-500";

function goHome() {
  window.location.assign("/");
}

export function AuthPanel() {
  const [view, setView] = useState<View>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { user?: unknown } | null;
        if (!cancelled && data?.user) window.location.replace("/");
      } catch {
        /* stay on login */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchView = useCallback((next: View) => {
    setView(next);
    setMessage(null);
  }, []);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch {
      setMessage("通信に失敗しました。電波の良いところでもう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }, []);

  const login = () =>
    run(async () => {
      const result = await authenticateWithPasskey();
      if (result.ok) goHome();
      else setMessage(result.error);
    });

  const create = () =>
    run(async () => {
      const result = await createAccountWithPasskey(email);
      if (result.ok) {
        goHome();
        return;
      }
      setMessage(result.error);
      if (result.legacyPassword) setView("legacy");
    });

  const migrate = () =>
    run(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(data?.message ?? "切り替えに失敗しました。");
        return;
      }
      setPassword("");
      const added = await addPasskeyToAccount();
      if (added.ok) {
        goHome();
        return;
      }
      setMessage(`${added.error} パスワードはまだ消えていないので、もう一度「切り替える」を押してください。`);
    });

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <h1 className="text-xl font-semibold text-zinc-50">
        {view === "create" ? "はじめての方" : view === "legacy" ? "パスキーへの切り替え" : "ログイン"}
      </h1>

      {view === "main" ? (
        <>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            パスワードは使いません。顔・指紋・画面ロックで入れるので、漏れる心配がありません。
          </p>
          <div className="mt-5 space-y-3">
            <button type="button" disabled={busy} onClick={() => void login()} className={primaryButton}>
              {busy ? "確認中…" : "パスキーでログイン"}
            </button>
            <button type="button" disabled={busy} onClick={() => switchView("create")} className={secondaryButton}>
              はじめての方（アカウントを作る）
            </button>
          </div>
          <p className="mt-5 text-xs leading-5 text-zinc-500">
            ログインは任意です。検索はログインなしで使えます。ログインするとお気に入りが端末間で同期されます（FANZA公式の会員ログインとは別です）。
          </p>
          <button
            type="button"
            onClick={() => switchView("legacy")}
            className="mt-3 text-xs text-zinc-400 underline underline-offset-2"
          >
            以前パスワードで登録した方
          </button>
        </>
      ) : null}

      {view === "create" ? (
        <form
          className="mt-3 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <p className="text-sm leading-6 text-zinc-400">
            メールアドレスを入れて「パスキーを作る」を押すと、この端末に鍵が保存されます。次からはボタン1つで入れます。メールは届きません（同期の名前として使うだけです）。
          </p>
          <label className="block text-sm text-zinc-300">
            メールアドレス
            <input
              type="email"
              inputMode="email"
              autoComplete="username webauthn"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={busy || !email.trim()} className={primaryButton}>
            {busy ? "作成中…" : "パスキーを作る"}
          </button>
          <button type="button" onClick={() => switchView("main")} className="text-sm text-zinc-400 underline">
            戻る
          </button>
        </form>
      ) : null}

      {view === "legacy" ? (
        <form
          className="mt-3 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void migrate();
          }}
        >
          <p className="text-sm leading-6 text-zinc-400">
            前のパスワードで1回だけ本人確認をして、パスキーに切り替えます。切り替えが終わると、パスワードは削除され使えなくなります。お気に入りはそのまま残ります。
          </p>
          <label className="block text-sm text-zinc-300">
            メールアドレス
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-zinc-300">
            以前のパスワード
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={busy || !email.trim() || !password} className={primaryButton}>
            {busy ? "切り替え中…" : "パスキーに切り替える"}
          </button>
          <button type="button" onClick={() => switchView("main")} className="text-sm text-zinc-400 underline">
            戻る
          </button>
        </form>
      ) : null}

      {message ? (
        <p role="status" className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-200">
          {message}
        </p>
      ) : null}
    </div>
  );
}
