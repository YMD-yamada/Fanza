"use client";

import { useEffect, useState } from "react";

const SW_URL = "/sale-sw.js";
const SW_SCOPE = "/sale";

type Status = "loading" | "unsupported" | "needs-install" | "off" | "on" | "denied" | "working" | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function SaleNotifyPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        if (!cancelled) setStatus(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") setStatus("denied");
        else setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const turnOn = async () => {
    setStatus("working");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const keyRes = await fetch("/api/sale/subscribe", { cache: "no-store" });
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!keyRes.ok || !publicKey) throw new Error("no-key");
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const res = await fetch("/api/sale/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("on");
      setMessage("オンにしました。確認の通知が1通届きます。");
    } catch {
      setStatus("error");
      setMessage("うまくいきませんでした。時間をおいてもう一度お試しください。");
    }
  };

  const turnOff = async () => {
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/sale/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
      setMessage("通知をオフにしました。");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-sm font-semibold text-neutral-200">通知</h2>

      {status === "loading" && <p className="mt-2 text-sm text-neutral-400">確認中…</p>}

      {status === "needs-install" && (
        <div className="mt-2 text-sm leading-relaxed text-neutral-300">
          <p>iPhone では、ホーム画面に追加すると通知を受け取れます。</p>
          <ol className="mt-2 list-decimal pl-5 text-neutral-400">
            <li>下の「共有」ボタン（□に↑）を押す</li>
            <li>「ホーム画面に追加」を押す</li>
            <li>ホーム画面の「10円ベル」から開き、ここで「通知をオンにする」を押す</li>
          </ol>
        </div>
      )}

      {status === "unsupported" && (
        <p className="mt-2 text-sm text-neutral-400">このブラウザは通知に対応していません。Chrome か Safari（ホーム画面に追加）でお試しください。</p>
      )}

      {status === "denied" && (
        <p className="mt-2 text-sm text-neutral-400">通知が「許可しない」になっています。端末の設定で、このサイト（または10円ベル）の通知を許可してください。</p>
      )}

      {(status === "off" || status === "error" || status === "working") && (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={turnOn}
            disabled={status === "working"}
            className="rounded-xl bg-amber-500 px-4 py-3 text-base font-bold text-neutral-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {status === "working" ? "設定中…" : "通知をオンにする"}
          </button>
          <p className="text-xs text-neutral-500">登録・メールアドレスは不要です。通知には作品名を出しません。</p>
        </div>
      )}

      {status === "on" && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-emerald-400">通知はオンです。10円の作品が見つかったらお知らせします。</p>
          <button type="button" onClick={turnOff} className="shrink-0 text-xs text-neutral-500 underline">
            オフにする
          </button>
        </div>
      )}

      {message && <p className="mt-2 text-xs text-neutral-400">{message}</p>}
    </section>
  );
}
