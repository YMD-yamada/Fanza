"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";

import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { notifyAuthChanged } from "@/lib/useStorage";

type Mode = "login" | "register";

const PASSWORD_MIN = 8;
const ACCOUNT_SYNC_ENABLED = isAccountSyncEnabled();

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function AccountPanel() {
  if (!ACCOUNT_SYNC_ENABLED) {
    return (
      <section className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
        <h2 className="text-sm font-semibold text-white">アカウント同期</h2>
        <p className="text-xs text-neutral-400">
          現在の公開設定では、軽量運用のため端末内保存のみ有効です。
        </p>
      </section>
    );
  }

  return <AccountPanelEnabled />;
}

function AccountPanelEnabled() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supportsPasskey, setSupportsPasskey] = useState(false);

  useEffect(() => {
    setSupportsPasskey(browserSupportsWebAuthn());
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { user?: SessionUser | null };
        if (!mounted) return;
        setSession(data.user ?? null);
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

  const submitPassword = async (event: FormEvent) => {
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
        setMessage(data.message ?? (mode === "register" ? "登録に失敗しました。" : "ログインに失敗しました。"));
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

  const registerWithPasskey = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("メールアドレスを入力してください。");
      return;
    }
    if (!supportsPasskey) {
      setMessage("このブラウザはパスキーに対応していません。パスワードで登録してください。");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const optionsRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const optionsData = (await optionsRes.json()) as {
        options?: PublicKeyCredentialCreationOptionsJSON;
        message?: string;
      };
      if (!optionsRes.ok || !optionsData.options) {
        setMessage(optionsData.message ?? "パスキー登録の準備に失敗しました。");
        return;
      }

      let attestation: RegistrationResponseJSON;
      try {
        attestation = await startRegistration({ optionsJSON: optionsData.options });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "";
        setMessage(
          detail
            ? `パスキーの作成に失敗しました（${detail}）。パスワードでも登録できます。`
            : "パスキーの作成がキャンセルされたか失敗しました。パスワードでも登録できます。",
        );
        return;
      }

      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, response: attestation }),
      });
      const verifyData = (await verifyRes.json()) as {
        user?: SessionUser;
        message?: string;
      };
      if (!verifyRes.ok || !verifyData.user) {
        setMessage(
          `${verifyData.message ?? "パスキー登録に失敗しました。"} パスワードでも登録できます。`,
        );
        return;
      }

      setSession(verifyData.user);
      notifyAuthChanged();
      setMessage("パスキーでアカウントを作成しました。");
    } catch {
      setMessage("通信エラーが発生しました。パスワードでも登録できます。");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPasskey = async (discoverable = false) => {
    const trimmedEmail = email.trim();
    if (!discoverable && !trimmedEmail) {
      setMessage("メールアドレスを入力するか、「保存済みパスキーで続行」を使ってください。");
      return;
    }
    if (!supportsPasskey) {
      setMessage("このブラウザはパスキーに対応していません。パスワードでログインしてください。");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const optionsRes = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discoverable ? {} : { email: trimmedEmail }),
      });
      const optionsData = (await optionsRes.json()) as {
        options?: PublicKeyCredentialRequestOptionsJSON;
        mode?: "email" | "discoverable";
        message?: string;
      };
      if (!optionsRes.ok || !optionsData.options) {
        setMessage(optionsData.message ?? "パスキー認証の準備に失敗しました。");
        return;
      }

      let assertion: AuthenticationResponseJSON;
      try {
        assertion = await startAuthentication({ optionsJSON: optionsData.options });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "";
        setMessage(
          detail
            ? `パスキー認証に失敗しました（${detail}）。パスワードでもログインできます。`
            : "パスキー認証がキャンセルされたか失敗しました。パスワードでもログインできます。",
        );
        return;
      }

      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: discoverable ? undefined : trimmedEmail,
          response: assertion,
          mode: optionsData.mode ?? (discoverable ? "discoverable" : "email"),
          challenge: optionsData.options.challenge,
        }),
      });
      const verifyData = (await verifyRes.json()) as {
        user?: SessionUser;
        message?: string;
      };
      if (!verifyRes.ok || !verifyData.user) {
        setMessage(
          `${verifyData.message ?? "パスキーログインに失敗しました。"} パスワードでもログインできます。`,
        );
        return;
      }

      setSession(verifyData.user);
      notifyAuthChanged();
      setMessage("パスキーでログインしました。");
    } catch {
      setMessage("通信エラーが発生しました。パスワードでもログインできます。");
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
      <section className="space-y-2 rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-3 sm:p-4">
        <p className="text-xs text-emerald-300">ログイン中（お気に入り同期ON）</p>
        <p className="break-all text-sm font-medium text-white">{session.email}</p>
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
    <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        未ログインでも利用できます。ログインすると作品・人・項目のお気に入りが別ブラウザでも共有されます。パスワードまたはパスキーで認証できます。
      </p>

      <form onSubmit={submitPassword} className="space-y-2">
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
          className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "register" ? "パスワードでアカウント作成" : "パスワードでログイン"}
        </button>
      </form>

      {supportsPasskey && (
        <div className="space-y-2 border-t border-neutral-800 pt-3">
          <p className="text-[11px] text-neutral-500">またはパスキー（生体認証 / PIN）</p>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void (mode === "register" ? registerWithPasskey() : loginWithPasskey(false))}
            className="w-full rounded-md border border-neutral-600 px-3 py-2 text-xs font-medium text-neutral-200 transition-colors hover:border-sky-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "register" ? "パスキーでアカウント作成" : "パスキーでログイン"}
          </button>
          {mode === "login" && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void loginWithPasskey(true)}
              className="w-full rounded-md border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              保存済みパスキーで続行
            </button>
          )}
        </div>
      )}

      {message && <p className="text-xs text-neutral-300">{message}</p>}
    </section>
  );
}
