"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { notifyAuthChanged } from "@/lib/useStorage";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    token ? null : "再設定リンクが無効です。アカウントメニューからやり直してください。",
  );
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setMessage("パスワードは8文字以上で入力してください。");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { message?: string; ok?: boolean };
      if (!response.ok) {
        setMessage(data.message ?? "再設定に失敗しました。");
        return;
      }
      notifyAuthChanged();
      setMessage(data.message ?? "パスワードを再設定しました。");
      router.push("/");
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h1 className="text-lg font-semibold">パスワード再設定</h1>
      <p className="text-sm text-neutral-400">新しいパスワードを入力してください。</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="新しいパスワード（8文字以上）"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          autoComplete="new-password"
          disabled={!token || isLoading}
        />
        <button
          type="submit"
          disabled={!token || isLoading}
          className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          再設定してログイン
        </button>
      </form>
      {message && <p className="text-xs text-neutral-300">{message}</p>}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">読み込み中…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
