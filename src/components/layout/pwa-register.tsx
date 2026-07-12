"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PwaStatus = "checking" | "ready" | "unsupported" | "slow" | "error" | "updateReady" | "updating";

export function PwaRegister() {
  const [status, setStatus] = useState<PwaStatus>("checking");
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const refreshRequestedRef = useRef(false);
  const fallbackReloadTimerRef = useRef<number>(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      const timeout = window.setTimeout(() => setStatus("unsupported"), 0);
      return () => {
        window.clearTimeout(timeout);
      };
    }

    let alive = true;
    let installTimer = 0;
    let installPending = false;
    let installFailed = false;
    let updatePending = false;

    const clearInstallTimeout = () => {
      if (!installTimer) return;
      window.clearTimeout(installTimer);
      installTimer = 0;
    };

    const startInstallTimeout = () => {
      clearInstallTimeout();
      installTimer = window.setTimeout(() => {
        installTimer = 0;
        if (installPending && alive) setStatus("slow");
      }, 15000);
    };

    const finish = (next: PwaStatus) => {
      if (!alive) return;
      if (next === "ready" && (installPending || installFailed || updatePending)) return;
      clearInstallTimeout();
      setStatus(next);
    };

    const markUpdateReady = (worker: ServiceWorker) => {
      if (!alive) return;
      clearInstallTimeout();
      installPending = false;
      installFailed = false;
      updatePending = true;
      waitingWorkerRef.current = worker;
      setStatus("updateReady");
    };

    const watchInstall = (worker: ServiceWorker | null) => {
      if (!worker) return;

      if (worker.state === "installed") {
        if (navigator.serviceWorker.controller) markUpdateReady(worker);
        else finish("ready");
        return;
      }

      if (worker.state === "activated") {
        installPending = false;
        installFailed = false;
        finish("ready");
        return;
      }

      if (worker.state === "redundant") {
        installPending = false;
        installFailed = true;
        finish("error");
        return;
      }

      installPending = true;
      startInstallTimeout();
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          if (navigator.serviceWorker.controller) markUpdateReady(worker);
          else finish("ready");
          return;
        }

        if (worker.state === "activated") {
          installPending = false;
          installFailed = false;
          finish("ready");
        }

        if (worker.state === "redundant") {
          installPending = false;
          installFailed = true;
          finish("error");
        }
      });
    };

    const reloadOnControllerChange = () => {
      if (!refreshRequestedRef.current || !alive) return;
      refreshRequestedRef.current = false;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnControllerChange);
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        watchInstall(registration.waiting ?? registration.installing ?? registration.active);
        registration.addEventListener("updatefound", () => {
          watchInstall(registration.installing);
        });
        registration.update().catch(() => {});
        return navigator.serviceWorker.ready;
      })
      .then(() => {
        if (!installPending && !installFailed && !updatePending) finish("ready");
      })
      .catch(() => {
        finish("error");
      });

    return () => {
      alive = false;
      clearInstallTimeout();
      if (fallbackReloadTimerRef.current) window.clearTimeout(fallbackReloadTimerRef.current);
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    const waitingWorker = waitingWorkerRef.current;
    if (!waitingWorker) return;
    refreshRequestedRef.current = true;
    setStatus("updating");
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    if (fallbackReloadTimerRef.current) window.clearTimeout(fallbackReloadTimerRef.current);
    fallbackReloadTimerRef.current = window.setTimeout(() => {
      if (refreshRequestedRef.current) window.location.reload();
    }, 5000);
  };

  if (status !== "error" && status !== "slow" && status !== "updateReady" && status !== "updating") return null;

  const isSlow = status === "slow";
  const isUpdate = status === "updateReady" || status === "updating";

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 z-50 rounded-[8px] border bg-[rgba(255,250,240,0.94)] px-3 py-2 text-xs font-bold leading-5 shadow-paper-sm backdrop-blur md:left-auto md:max-w-80 ${
        isUpdate
          ? "border-[rgba(23,63,115,0.28)] text-[var(--ocean)]"
          : isSlow
            ? "border-[rgba(183,135,63,0.42)] text-[var(--brass)]"
            : "border-[rgba(185,78,60,0.42)] text-[var(--cinnabar)]"
      }`}
      role="alert"
      aria-live="polite"
    >
      {isUpdate ? (
        <div className="grid gap-2">
          <div>
            <p className="font-mono text-[0.66rem] font-black uppercase">Offline Pack</p>
            <p className="mt-1 text-[var(--ink)]">
              {status === "updating" ? "正在切换到新版离线包，页面会自动刷新。" : "新版离线学习包已经准备好，更新后会重新载入当前页面。"}
            </p>
          </div>
          <Button type="button" size="sm" onClick={applyUpdate} disabled={status === "updating"} className="w-fit">
            <RefreshCcw className="h-4 w-4" />
            {status === "updating" ? "更新中" : "立即更新"}
          </Button>
        </div>
      ) : isSlow ? (
        "离线缓存仍在准备中，当前页面可继续使用；准备完成后会自动收起。"
      ) : (
        "离线缓存暂未准备好，请保持联网后刷新一次。"
      )}
    </div>
  );
}
