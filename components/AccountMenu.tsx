"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { notifyAuthChanged, useAuthState } from "@/lib/useStorage";

const PASSWORD_MIN = 8;
const ACCOUNT_SYNC_ENABLED = isAccountSyncEnabled();
const SAME_ORIGIN: RequestInit = { credentials: "same-origin" };

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  hasPassword?: boolean;
  hasPasskey?: boolean;
};

export function AccountMenu() {
  if (!ACCOUNT_SYNC_ENABLED) return null;
  return <AccountMenuEnabled />;
}

function AccountMenuEnabled() {
  const { status, user } = useAuthState();

  if (status === "loading") {
    return <span className="text-[11px] text-neutral-500 sm:text-xs">…</span>;
  }

  if (status !== "authenticated" || !user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] text-neutral-200 transition-colors hover:border-sky-500/50 hover:text-white sm:text-xs"
      >
        ログイン
      </Link>
    );
  }

  return <LoggedInMenu user={user} />;
}

function LoggedInMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(Boolean(user.hasPassword));
  const [hasPasskey, setHasPasskey] = useState(Boolean(user.hasPasskey));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasPassword(Boolean(user.hasPassword));
    setHasPasskey(Boolean(user.hasPasskey));
  }, [user.hasPassword, user.hasPasskey]);

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

  const logout = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await fetch("/api/auth/logout", { method: "POST", ...SAME_ORIGIN });
      notifyAuthChanged();
      setOpen(false);
    } catch {
      setMessage("ログアウトに失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < PASSWORD_MIN) {
      setMessage(`パスワードは${PASSWORD_MIN}文字以上で入力してください。`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password/set", {
        method: "POST",
        ...SAME_ORIGIN,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: newPassword,
          ...(hasPassword ? { currentPassword } : {}),
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? data?.message ?? "パスワード設定に失敗しました。");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setHasPassword(true);
      setMessage(data?.message ?? "パスワードを設定しました。");
    } catch {
      setMessage("通信に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const removePasskeys = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmPassword) {
      setMessage("本人確認のため、現在のパスワードを入力してください。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/passkey/remove", {
        method: "POST",
        ...SAME_ORIGIN,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmPassword }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        hasPasskey?: boolean;
      } | null;
      if (!response.ok) {
        setMessage(data?.error ?? data?.message ?? "パスキーの削除に失敗しました。");
        return;
      }
      setConfirmPassword("");
      setHasPasskey(false);
      setMessage(data?.message ?? "パスキーを削除しました。");
    } catch {
      setMessage("通信に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="max-w-[10rem] truncate rounded-full border border-neutral-700 px-3 py-1 text-[11px] text-neutral-200 transition-colors hover:border-sky-500/50 hover:text-white sm:max-w-xs sm:text-xs"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.email}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-neutral-800 bg-neutral-950 p-3 shadow-xl"
        >
          <p className="text-xs text-neutral-400">お気に入りはログイン中に端末間同期されます。</p>
          <form className="mt-3 space-y-2" onSubmit={(event) => void changePassword(event)}>
            {hasPassword ? (
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="現在のパスワード"
                autoComplete="current-password"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-100"
              />
            ) : (
              <p className="text-[11px] text-amber-200">パスワード未設定です。追加しておくとパスキーなしでも入れます。</p>
            )}
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={hasPassword ? "新しいパスワード" : "パスワードを設定（8文字以上）"}
              autoComplete="new-password"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-100"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {hasPassword ? "パスワードを変更" : "パスワードを設定"}
            </button>
          </form>
          {hasPassword && hasPasskey ? (
            <form className="mt-3 space-y-2 border-t border-neutral-800 pt-3" onSubmit={(event) => void removePasskeys(event)}>
              <p className="text-[11px] text-neutral-500">以前のパスキーが残っています。不要なら削除できます。</p>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="確認用パスワード"
                autoComplete="current-password"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-100"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-200 disabled:opacity-60"
              >
                パスキーを削除
              </button>
            </form>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void logout()}
            className="mt-3 w-full rounded-md border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900 disabled:opacity-60"
          >
            ログアウト
          </button>
          {message ? <p className="mt-2 text-[11px] text-amber-200">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
