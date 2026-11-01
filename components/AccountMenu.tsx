"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { addPasskeyToAccount } from "@/lib/passkey-client";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { notifyAuthChanged, useAuthState } from "@/lib/useStorage";

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
  const [hasPassword, setHasPassword] = useState(Boolean(user.hasPassword));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasPassword(Boolean(user.hasPassword));
  }, [user.hasPassword]);

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

  const addPasskey = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await addPasskeyToAccount();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setHasPassword(false);
      setMessage("パスキーを追加しました。この端末でもボタン1つで入れます。");
      notifyAuthChanged();
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
          <p className="text-xs leading-5 text-neutral-400">
            お気に入りはログイン中に端末間で同期されます。ログインはパスキー（顔・指紋・画面ロック）だけです。
          </p>
          {hasPassword ? (
            <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] leading-5 text-amber-200">
              まだパスキーがありません。下のボタンで作ると、古いパスワードは削除されます。
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void addPasskey()}
            className="mt-3 w-full rounded-md bg-sky-600 px-2.5 py-2 text-xs font-medium text-white disabled:opacity-60"
          >
            {hasPassword ? "パスキーを作る" : "この端末にパスキーを追加"}
          </button>
          <p className="mt-1 text-[10px] leading-4 text-neutral-500">
            別のスマホやPCでも入りたいときは、その端末でログインしてからここで追加します。
          </p>
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
