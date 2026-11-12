"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SW_URL = "/sale-sw.js";
const SW_SCOPE = "/sale";
const META_CACHE = "sale-meta";
const LAST_PUSH_KEY = "/sale/__last-push";
const WAIT_MS = 25_000;

type Env = "loading" | "ios-other-browser" | "ios-needs-install" | "unsupported" | "ready";
type Perm = "default" | "granted" | "denied";
type TestState = "idle" | "sending" | "waiting" | "received" | "timeout" | "error";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isIosOtherBrowser(): boolean {
  // iPhone の Chrome / LINE / Instagram などのアプリ内ブラウザ
  return isIos() && /CriOS|FxiOS|EdgiOS|Line\/|Instagram|FBAN|FBAV|Twitter/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

async function readLastPush(): Promise<string | null> {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match(LAST_PUSH_KEY);
    if (!res) return null;
    const data = (await res.json()) as { at?: string };
    return data.at ?? null;
  } catch {
    return null;
  }
}

function Step({ n, done, active, title, children }: { n: number; done: boolean; active: boolean; title: string; children?: React.ReactNode }) {
  return (
    <li className={`flex gap-3 rounded-xl p-3 ${active ? "bg-neutral-800/80" : ""}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          done ? "bg-emerald-500 text-neutral-950" : active ? "bg-amber-500 text-neutral-950" : "bg-neutral-700 text-neutral-400"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${done ? "text-emerald-400" : active ? "text-neutral-100" : "text-neutral-500"}`}>{title}</p>
        {active && children ? <div className="mt-2 text-sm leading-relaxed text-neutral-300">{children}</div> : null}
      </div>
    </li>
  );
}

export function SaleNotifyPanel() {
  const [env, setEnv] = useState<Env>("loading");
  const [perm, setPerm] = useState<Perm>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastPush, setLastPush] = useState<string | null>(null);
  const [test, setTest] = useState<TestState>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markReceived = useCallback((at: string) => {
    setLastPush(at);
    setTest((t) => (t === "waiting" || t === "sending" || t === "timeout" ? "received" : t));
    if (waitTimer.current) clearTimeout(waitTimer.current);
  }, []);

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; at?: string } | null;
      if (data?.type === "sale-push-received" && data.at) markReceived(data.at);
    };
    (async () => {
      if (isIosOtherBrowser()) {
        setEnv("ios-other-browser");
        return;
      }
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        setEnv(isIos() && !isStandalone() ? "ios-needs-install" : "unsupported");
        return;
      }
      if (isIos() && !isStandalone()) {
        setEnv("ios-needs-install");
        return;
      }
      navigator.serviceWorker.addEventListener("message", onMessage);
      try {
        const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
        const sub = await reg.pushManager.getSubscription();
        const last = await readLastPush();
        if (cancelled) return;
        setPerm(Notification.permission as Perm);
        setSubscribed(Boolean(sub) && Notification.permission === "granted");
        setLastPush(last);
        setEnv("ready");
      } catch {
        if (!cancelled) {
          setEnv("ready");
          setError("通知の準備に失敗しました。ページを開き直してください。");
        }
      }
    })();
    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [markReceived]);

  const startWaiting = () => {
    setTest("waiting");
    if (waitTimer.current) clearTimeout(waitTimer.current);
    waitTimer.current = setTimeout(async () => {
      // 画面が裏にあった間に届いていないか、保存された記録も見る
      const last = await readLastPush();
      if (last && Date.now() - new Date(last).getTime() < WAIT_MS + 5000) markReceived(last);
      else setTest((t) => (t === "waiting" ? "timeout" : t));
    }, WAIT_MS);
  };

  const subscribe = async (): Promise<PushSubscription> => {
    const keyRes = await fetch("/api/sale/subscribe", { cache: "no-store" });
    const { publicKey } = (await keyRes.json()) as { publicKey?: string };
    if (!keyRes.ok || !publicKey) throw new Error("no-key");
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    await navigator.serviceWorker.ready;
    return (
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }))
    );
  };

  const turnOn = async () => {
    setBusy(true);
    setError("");
    try {
      const permission = (await Notification.requestPermission()) as Perm;
      setPerm(permission);
      if (permission !== "granted") return;
      const sub = await subscribe();
      setTest("sending");
      const res = await fetch("/api/sale/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSubscribed(true);
      startWaiting();
    } catch {
      setTest("idle");
      setError("うまくいきませんでした。電波のよい所で、もう一度押してください。");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError("");
    setTest("sending");
    try {
      let sub = await (await navigator.serviceWorker.getRegistration(SW_SCOPE))?.pushManager.getSubscription();
      if (!sub) sub = await subscribe();
      let res = await fetch("/api/sale/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (res.status === 410) {
        // 端末側の登録が切れていたので作り直してもう一度
        await sub.unsubscribe();
        sub = await subscribe();
        res = await fetch("/api/sale/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      }
      if (res.status === 429) {
        setTest("idle");
        setError("続けて押されたので少し待ってください（1分ほど）。");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setSubscribed(true);
      startWaiting();
    } catch {
      setTest("error");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
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
      setSubscribed(false);
      setTest("idle");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/sale`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const verified = Boolean(lastPush) || test === "received";
  const installDone = !isIos() || isStandalone();
  const ios = env !== "loading" && isIos();

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-200">通知の設定</h2>
        {env === "ready" && subscribed && verified ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">通知は届きます</span>
        ) : null}
      </div>

      {env === "loading" && <p className="mt-2 text-sm text-neutral-400">確認中…</p>}

      {env === "ios-other-browser" && (
        <div className="mt-3 text-sm leading-relaxed text-neutral-300">
          <p>iPhone で通知を受け取るには、<b>Safari</b> で開く必要があります。</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-400">
            <li>下のボタンでこのページのアドレスをコピー</li>
            <li>Safari を開き、上のアドレス欄に貼り付けて開く</li>
          </ol>
          <button
            type="button"
            onClick={copyLink}
            className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-3 text-base font-bold text-neutral-950"
          >
            {copied ? "コピーしました" : "アドレスをコピー"}
          </button>
        </div>
      )}

      {env === "unsupported" && (
        <p className="mt-2 text-sm text-neutral-400">このブラウザは通知に対応していません。iPhone は Safari、Android は Chrome で開いてください。</p>
      )}

      {(env === "ios-needs-install" || env === "ready") && (
        <ol className="mt-3 flex flex-col gap-1">
          {ios ? (
            <Step n={1} done={installDone} active={!installDone} title="ホーム画面に追加する">
              <p>iPhone は、ホーム画面のアイコンから開いたときだけ通知を受け取れます。</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-400">
                <li>
                  画面下の <b className="text-neutral-200">共有ボタン</b>
                  <ShareIcon />
                  を押す
                </li>
                <li>
                  少し下へずらして <b className="text-neutral-200">「ホーム画面に追加」</b> を押す
                </li>
                <li>
                  <b className="text-neutral-200">「ウェブアプリとして開く」</b> がオン（緑）なのを確かめて、右上の{" "}
                  <b className="text-neutral-200">「追加」</b> を押す
                </li>
                <li>
                  ホーム画面の <b className="text-neutral-200">「10円ベル」</b> を開くと、続きの手順が出ます
                </li>
              </ol>
              <p className="mt-2 text-xs text-neutral-500">
                追加できたら、このページは閉じて大丈夫です。アイコンから開いてもこの手順が出るときは、アイコンを削除して「ウェブアプリとして開く」をオンにして追加し直してください。
              </p>
            </Step>
          ) : installEvent ? (
            <Step n={1} done={false} active title="ホーム画面に追加する（おすすめ）">
              <p>アイコンから すぐ開けるようになります。</p>
              <button
                type="button"
                onClick={async () => {
                  await installEvent.prompt();
                  setInstallEvent(null);
                }}
                className="mt-2 rounded-lg border border-neutral-600 px-3 py-2 text-sm text-neutral-100"
              >
                ホーム画面に追加
              </button>
            </Step>
          ) : null}

          <Step
            n={ios || installEvent ? 2 : 1}
            done={env === "ready" && subscribed && perm === "granted"}
            active={env === "ready" && installDone && !(subscribed && perm === "granted")}
            title="通知をオンにする"
          >
            {perm === "denied" ? (
              <div>
                <p>通知が「許可しない」になっています。次の手順で許可してください。</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-400">
                  {ios ? (
                    <>
                      <li>iPhone の「設定」→「通知」を開く</li>
                      <li>一覧の「10円ベル」を押し、「通知を許可」をオンにする</li>
                    </>
                  ) : (
                    <>
                      <li>アドレス欄の左のマークを押す</li>
                      <li>「権限」→「通知」を「許可」にする</li>
                    </>
                  )}
                  <li>このページを開き直す</li>
                </ol>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={turnOn}
                  disabled={busy}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3 text-base font-bold text-neutral-950 disabled:opacity-60"
                >
                  {busy ? "設定中…" : "通知をオンにする"}
                </button>
                <p className="mt-2 text-xs text-neutral-500">確認が出たら「許可」を押してください。登録やメールアドレスは不要です。</p>
              </>
            )}
          </Step>

          <Step
            n={ios || installEvent ? 3 : 2}
            done={env === "ready" && subscribed && verified}
            active={env === "ready" && subscribed && !verified}
            title="テスト通知が届くか確かめる"
          >
            <TestStatus test={test} ios={ios} />
            {test !== "waiting" && test !== "sending" ? (
              <button
                type="button"
                onClick={sendTest}
                disabled={busy}
                className="mt-2 w-full rounded-xl bg-amber-500 px-4 py-3 text-base font-bold text-neutral-950 disabled:opacity-60"
              >
                テスト通知を送る
              </button>
            ) : null}
          </Step>
        </ol>
      )}

      {env === "ready" && subscribed && verified && (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <p className="font-semibold">準備完了です。10円の作品が出たら、この端末に通知が届きます。</p>
          {lastPush ? <p className="mt-1 text-xs text-emerald-400/80">最後に届いた通知: {formatTime(lastPush)}</p> : null}
          <div className="mt-2 flex items-center gap-4 text-xs">
            <button type="button" onClick={sendTest} disabled={busy || test === "waiting"} className="text-neutral-300 underline">
              {test === "waiting" ? "テスト通知を待っています…" : "もう一度テストする"}
            </button>
            <button type="button" onClick={turnOff} disabled={busy} className="text-neutral-500 underline">
              通知をオフにする
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {env !== "loading" ? <Diag env={env} perm={perm} subscribed={subscribed} lastPush={lastPush} /> : null}
    </section>
  );
}

function TestStatus({ test, ios }: { test: TestState; ios: boolean }) {
  if (test === "sending" || test === "waiting") {
    return <p className="text-amber-300">テスト通知を送りました。数秒で届きます…</p>;
  }
  if (test === "received") return <p className="text-emerald-400">✓ テスト通知が届きました。</p>;
  if (test === "timeout" || test === "error") {
    return (
      <div>
        <p className="text-rose-300">{test === "error" ? "送れませんでした。" : "まだ届いていないようです。"}次を確かめてください。</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-400">
          {ios ? (
            <>
              <li>「設定」→「通知」→「10円ベル」で「通知を許可」がオンか</li>
              <li>集中モード（おやすみモードなど）がオフか</li>
            </>
          ) : (
            <>
              <li>端末の「設定」→「通知」で Chrome の通知がオンか</li>
              <li>マナーモードやおやすみ時間になっていないか</li>
            </>
          )}
          <li>直したら、もう一度「テスト通知を送る」を押す</li>
        </ul>
      </div>
    );
  }
  return <p>ボタンを押すと、この端末にテスト通知を1通送ります。届けば設定は完了です。</p>;
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mx-1 inline h-4 w-4 align-[-2px] text-sky-400" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11v9h12v-9" strokeLinejoin="round" />
    </svg>
  );
}

function Diag({ env, perm, subscribed, lastPush }: { env: Env; perm: Perm; subscribed: boolean; lastPush: string | null }) {
  // 困ったときにスクリーンショットで状態が分かるよう、小さく出しておく
  const items = [
    isIos() ? "iPhone" : "その他",
    isStandalone() ? "アプリで表示" : "ブラウザで表示",
    `許可:${perm === "granted" ? "済" : perm === "denied" ? "拒否" : "未"}`,
    `登録:${subscribed ? "済" : "未"}`,
    `受信:${lastPush ? "あり" : "なし"}`,
    env,
  ];
  return <p className="mt-3 text-[10px] text-neutral-600">状態: {items.join(" / ")}</p>;
}
