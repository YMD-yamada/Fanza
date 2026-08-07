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
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { notifyAuthChanged } from "@/lib/useStorage";

type Mode = "login" | "register" | "forgot";
type AuthMethods = {
  exists: boolean;
  hasPassword: boolean;
  hasPasskey: boolean;
};

const PASSWORD_MIN = 8;
const ACCOUNT_SYNC_ENABLED = isAccountSyncEnabled();

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function AccountMenu() {
  if (!ACCOUNT_SYNC_ENABLED) return null;
  return <AccountMenuEnabled />;
}

function AccountMenuEnabled() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [methods, setMethods] = useState<AuthMethods | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const refreshMethods = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed.includes("@")) {
      setMethods(null);
      return;
    }
    try {
      const response = await fetch(`/api/auth/methods?email=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setMethods(null);
        return;
      }
      setMethods((await response.json()) as AuthMethods);
    } catch {
      setMethods(null);
    }
  };

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
      const data = (await response.json()) as {
        user?: SessionUser;
        message?: string;
        exists?: boolean;
        hasPassword?: boolean;
        hasPasskey?: boolean;
      };

      if (response.status === 409 && data.exists) {
        setMode("login");
        setMethods({
          exists: true,
          hasPassword: Boolean(data.hasPassword),
          hasPasskey: Boolean(data.hasPasskey),
        });
        setMessage(data.message ?? "既に登録済みです。ログインしてください。");
        return;
      }

      if (!response.ok || !data.user) {
        if (typeof data.hasPasskey === "boolean") {
          setMethods({
            exists: Boolean(data.exists ?? true),
            hasPassword: Boolean(data.hasPassword),
            hasPasskey: Boolean(data.hasPasskey),
          });
        }
        setMessage(data.message ?? "認証に失敗しました。");
        return;
      }

      setSession(data.user);
      notifyAuthChanged();
      setPassword("");
      setMessage(mode === "register" ? "アカウントを作成しました。" : "ログインしました。");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPasskey = async (discoverable = false) => {
    const trimmedEmail = email.trim();
    if (!discoverable && !trimmedEmail) {
      setMessage("メールアドレスを入力してください。");
      return;
    }
    if (!supportsPasskey) {
      setMessage("このブラウザはパスキー非対応です。");
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
      } catch {
        setMessage("パスキー認証がキャンセルされたか失敗しました。");
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
      const verifyData = (await verifyRes.json()) as { user?: SessionUser; message?: string };
      if (!verifyRes.ok || !verifyData.user) {
        setMessage(verifyData.message ?? "パスキーログインに失敗しました。");
        return;
      }

      setSession(verifyData.user);
      notifyAuthChanged();
      setMessage("パスキーでログインしました。必要なら下でパスワードも設定できます。");
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
      setMessage("このブラウザはパスキー非対応です。パスワードで登録してください。");
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
        exists?: boolean;
        hasPassword?: boolean;
        hasPasskey?: boolean;
      };
      if (!optionsRes.ok || !optionsData.options) {
        if (optionsRes.status === 409) {
          setMode("login");
          setMethods({
            exists: true,
            hasPassword: Boolean(optionsData.hasPassword),
            hasPasskey: Boolean(optionsData.hasPasskey),
          });
        }
        setMessage(optionsData.message ?? "パスキー登録の準備に失敗しました。");
        return;
      }

      let attestation: RegistrationResponseJSON;
      try {
        attestation = await startRegistration({ optionsJSON: optionsData.options });
      } catch {
        setMessage("パスキー作成がキャンセルされたか失敗しました。パスワードでも登録できます。");
        return;
      }

      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, response: attestation }),
      });
      const verifyData = (await verifyRes.json()) as { user?: SessionUser; message?: string };
      if (!verifyRes.ok || !verifyData.user) {
        setMessage(verifyData.message ?? "パスキー登録に失敗しました。");
        return;
      }

      setSession(verifyData.user);
      notifyAuthChanged();
      setMessage("パスキーでアカウントを作成しました。下でパスワードも設定しておくと別端末でも安心です。");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("メールアドレスを入力してください。");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = (await response.json()) as {
        message?: string;
        hasPasskey?: boolean;
        hasPassword?: boolean;
        resetUrl?: string;
      };
      if (typeof data.hasPasskey === "boolean") {
        setMethods((prev) => ({
          exists: prev?.exists ?? true,
          hasPassword: data.hasPassword ?? prev?.hasPassword ?? true,
          hasPasskey: data.hasPasskey ?? false,
        }));
      }
      setMessage(
        data.resetUrl
          ? `${data.message ?? "再設定リンクを発行しました。"}\n${data.resetUrl}`
          : (data.message ?? "受け付けました。"),
      );
      if (data.hasPasskey) setMode("login");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const setPasswordWhileLoggedIn = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < PASSWORD_MIN) {
      setMessage(`パスワードは${PASSWORD_MIN}文字以上で入力してください。`);
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "パスワード設定に失敗しました。");
        return;
      }
      setNewPassword("");
      setMessage(data.message ?? "パスワードを設定しました。");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const addPasskeyWhileLoggedIn = async () => {
    if (!supportsPasskey) {
      setMessage("このブラウザはパスキー非対応です。");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const optionsRes = await fetch("/api/auth/passkey/add/options", { method: "POST" });
      const optionsData = (await optionsRes.json()) as {
        options?: PublicKeyCredentialCreationOptionsJSON;
        message?: string;
      };
      if (!optionsRes.ok || !optionsData.options) {
        setMessage(optionsData.message ?? "パスキー追加の準備に失敗しました。");
        return;
      }
      let attestation: RegistrationResponseJSON;
      try {
        attestation = await startRegistration({ optionsJSON: optionsData.options });
      } catch {
        setMessage("パスキー追加がキャンセルされたか失敗しました。");
        return;
      }
      const verifyRes = await fetch("/api/auth/passkey/add/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attestation }),
      });
      const verifyData = (await verifyRes.json()) as { message?: string };
      if (!verifyRes.ok) {
        setMessage(verifyData.message ?? "パスキー追加に失敗しました。");
        return;
      }
      setMessage(verifyData.message ?? "パスキーを追加しました。");
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
      setNewPassword("");
      setMessage("ログアウトしました。");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const showPasskeyLogin =
    supportsPasskey && (mode === "login" || mode === "forgot") && (methods?.hasPasskey || !methods);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
          session
            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
            : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:text-white"
        }`}
        title={session ? `アカウント: ${session.email}` : "アカウント（任意）"}
        aria-label={session ? "アカウントメニュー" : "ログインメニュー"}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.25c-3.6 0-6.75 1.8-6.75 4.125V20h13.5v-1.625C18.75 16.05 15.6 14.25 12 14.25Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-neutral-700 bg-neutral-950 p-3 shadow-xl shadow-black/40">
          {session ? (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-emerald-300">ログイン中 · お気に入り同期ON</p>
                <p className="mt-1 break-all text-sm font-medium text-white">{session.email}</p>
              </div>
              <form onSubmit={setPasswordWhileLoggedIn} className="space-y-2">
                <p className="text-[11px] text-neutral-500">パスワードを設定／更新</p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={`新パスワード（${PASSWORD_MIN}文字以上）`}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  パスワードを保存
                </button>
              </form>
              {supportsPasskey && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void addPasskeyWhileLoggedIn()}
                  className="w-full rounded-md border border-neutral-600 px-3 py-2 text-xs text-neutral-200 hover:border-sky-500/50 disabled:opacity-50"
                >
                  この端末にパスキーを追加
                </button>
              )}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void logout()}
                className="w-full rounded-md border border-neutral-700 px-3 py-2 text-xs text-neutral-400 hover:text-white disabled:opacity-50"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1 rounded-md bg-neutral-900 p-1 text-xs">
                {(["login", "register", "forgot"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setMessage(null);
                    }}
                    className={`flex-1 rounded px-2 py-1 ${
                      mode === value ? "bg-neutral-700 text-white" : "text-neutral-400"
                    }`}
                  >
                    {value === "login" ? "ログイン" : value === "register" ? "新規" : "再設定"}
                  </button>
                ))}
              </div>

              <p className="text-[11px] leading-relaxed text-neutral-500">
                未ログインでも検索できます。同期したいときだけアカウントを使います。
              </p>

              {mode === "forgot" ? (
                <form onSubmit={submitForgot} className="space-y-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      void refreshMethods(event.target.value);
                    }}
                    placeholder="メールアドレス"
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                    autoComplete="email"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    再設定手順を送る
                  </button>
                  {methods?.hasPasskey && (
                    <button
                      type="button"
                      disabled={isLoading || !supportsPasskey}
                      onClick={() => void loginWithPasskey(false)}
                      className="w-full rounded-md border border-neutral-600 px-3 py-2 text-xs text-neutral-200 hover:border-sky-500/50 disabled:opacity-50"
                    >
                      パスキーで本人確認してログイン
                    </button>
                  )}
                </form>
              ) : (
                <form onSubmit={submitPassword} className="space-y-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      void refreshMethods(event.target.value);
                    }}
                    onBlur={() => void refreshMethods(email)}
                    placeholder="メールアドレス"
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={`パスワード（${PASSWORD_MIN}文字以上）`}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                  />
                  {methods?.exists && (
                    <p className="text-[11px] text-amber-200/90">
                      登録済み —
                      {methods.hasPassword ? " パスワード可" : " パスワード未設定"}
                      {methods.hasPasskey ? " / パスキー可" : " / パスキーなし"}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {mode === "register" ? "パスワードで作成" : "パスワードでログイン"}
                  </button>
                </form>
              )}

              {mode !== "forgot" && supportsPasskey && (
                <div className="space-y-2 border-t border-neutral-800 pt-2">
                  {mode === "register" ? (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void registerWithPasskey()}
                      className="w-full rounded-md border border-neutral-600 px-3 py-2 text-xs text-neutral-200 hover:border-sky-500/50 disabled:opacity-50"
                    >
                      パスキーで作成
                    </button>
                  ) : (
                    <>
                      {showPasskeyLogin && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void loginWithPasskey(false)}
                          className="w-full rounded-md border border-neutral-600 px-3 py-2 text-xs text-neutral-200 hover:border-sky-500/50 disabled:opacity-50"
                        >
                          パスキーでログイン
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void loginWithPasskey(true)}
                        className="w-full rounded-md border border-neutral-700 px-3 py-2 text-xs text-neutral-400 hover:text-white disabled:opacity-50"
                      >
                        保存済みパスキーで続行
                      </button>
                    </>
                  )}
                </div>
              )}

              {mode === "login" && (
                <button
                  type="button"
                  className="text-[11px] text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
                  onClick={() => {
                    setMode("forgot");
                    setMessage(null);
                  }}
                >
                  パスワードを忘れた
                </button>
              )}
            </div>
          )}

          {message && <p className="mt-3 text-[11px] leading-relaxed text-neutral-300">{message}</p>}

          <p className="mt-3 text-[10px] text-neutral-600">
            <Link href="/legal/privacy" className="hover:text-neutral-400" onClick={() => setOpen(false)}>
              プライバシー
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
