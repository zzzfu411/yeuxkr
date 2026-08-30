"use client";

import { useEffect, useRef, useState } from "react";
import { MonitorDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const LEGACY_OFFLINE_CACHE_PREFIX = "kirina-korean-next-";
const LEGACY_OFFLINE_RELOAD_KEY = "kirina.legacy-offline-reload.v1";

type InstallStatus = "unavailable" | "available" | "prompting" | "accepted" | "installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };
type ServiceWorkerContainerLike = Pick<ServiceWorkerContainer, "controller" | "getRegistrations">;
type CacheStorageLike = Pick<CacheStorage, "keys" | "delete">;

export function isStandaloneMode(browserWindow?: Window, browserNavigator?: Navigator) {
  const currentWindow = browserWindow ?? (typeof window === "undefined" ? undefined : window);
  const currentNavigator = (browserNavigator ?? (typeof navigator === "undefined" ? undefined : navigator)) as
    | NavigatorWithStandalone
    | undefined;

  return Boolean(currentNavigator?.standalone || currentWindow?.matchMedia?.("(display-mode: standalone)").matches);
}

export function isIosSafari(browserNavigator?: Navigator) {
  const currentNavigator = browserNavigator ?? (typeof navigator === "undefined" ? undefined : navigator);
  if (!currentNavigator) return false;

  const userAgent = currentNavigator.userAgent ?? "";
  const isIosDevice = /iPad|iPhone|iPod/i.test(userAgent)
    || (currentNavigator.platform === "MacIntel" && currentNavigator.maxTouchPoints > 1);
  const isWebKit = /WebKit/i.test(userAgent);
  return isIosDevice && isWebKit;
}

export async function removeLegacyOfflineData(
  serviceWorkers?: ServiceWorkerContainerLike | null,
  cacheStorage?: CacheStorageLike | null
) {
  let registrationsRemoved = 0;
  let cachesRemoved = 0;

  try {
    const registrations = await serviceWorkers?.getRegistrations() ?? [];
    const legacyRegistrations = registrations.filter(isLegacyOfflineRegistration);
    const results = await Promise.all(legacyRegistrations.map((registration) => registration.unregister()));
    registrationsRemoved = results.filter(Boolean).length;
  } catch {
    // Cleanup must never interrupt the learning interface.
  }

  try {
    const cacheNames = await cacheStorage?.keys() ?? [];
    const legacyCacheNames = cacheNames.filter((name) => name.startsWith(LEGACY_OFFLINE_CACHE_PREFIX));
    const results = await Promise.all(legacyCacheNames.map((name) => cacheStorage?.delete(name)));
    cachesRemoved = results.filter(Boolean).length;
  } catch {
    // Browser storage may be restricted; a later visit can retry cleanup.
  }

  return { registrationsRemoved, cachesRemoved };
}

export function PwaRegister() {
  const [installStatus, setInstallStatus] = useState<InstallStatus>("unavailable");
  const [showIosGuide, setShowIosGuide] = useState(false);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const installedRef = useRef(false);

  useEffect(() => {
    const serviceWorkers = "serviceWorker" in navigator ? navigator.serviceWorker : null;
    const cacheStorage = "caches" in window ? window.caches : null;
    const cleanup = () => void removeLegacyOfflineData(serviceWorkers, cacheStorage).then(() => {
      const controlledByLegacyWorker = isLegacyOfflineWorker(serviceWorkers?.controller ?? null);
      if (!controlledByLegacyWorker) {
        try {
          window.sessionStorage.removeItem(LEGACY_OFFLINE_RELOAD_KEY);
        } catch {
          // Storage access is optional for cleanup.
        }
        return;
      }

      try {
        if (window.sessionStorage.getItem(LEGACY_OFFLINE_RELOAD_KEY)) return;
        window.sessionStorage.setItem(LEGACY_OFFLINE_RELOAD_KEY, "1");
      } catch {
        // A reload is still preferable when session storage is unavailable.
      }
      window.location.reload();
    });
    const handleVisibility = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") cleanup();
    };
    cleanup();
    window.addEventListener("focus", cleanup);
    window.addEventListener("pageshow", cleanup);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", cleanup);
      window.removeEventListener("pageshow", cleanup);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");

    const markInstalledIfStandalone = () => {
      if (!isStandaloneMode(window, navigator)) return;
      installedRef.current = true;
      installPromptRef.current = null;
      setInstallStatus("installed");
      setShowIosGuide(false);
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (installedRef.current || isStandaloneMode(window, navigator)) return;
      installPromptRef.current = event as BeforeInstallPromptEvent;
      setInstallStatus("available");
      setShowIosGuide(false);
    };

    const handleAppInstalled = () => {
      installedRef.current = true;
      installPromptRef.current = null;
      setInstallStatus("installed");
      setShowIosGuide(false);
    };

    markInstalledIfStandalone();
    if (!installedRef.current) setShowIosGuide(isIosSafari(navigator));
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayModeQuery.addEventListener("change", markInstalledIfStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayModeQuery.removeEventListener("change", markInstalledIfStandalone);
    };
  }, []);

  const promptInstall = async () => {
    const installPrompt = installPromptRef.current;
    if (!installPrompt || installStatus !== "available") return;

    installPromptRef.current = null;
    setInstallStatus("prompting");
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (installedRef.current) return;
      if (installPromptRef.current) {
        setInstallStatus("available");
        return;
      }
      setInstallStatus(choice.outcome === "accepted" ? "accepted" : "unavailable");
      if (choice.outcome === "dismissed") setShowIosGuide(isIosSafari(navigator));
    } catch {
      if (installedRef.current) return;
      setInstallStatus(installPromptRef.current ? "available" : "unavailable");
      setShowIosGuide(!installPromptRef.current && isIosSafari(navigator));
    }
  };

  if (installStatus === "available") {
    return (
      <div
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 flex items-center justify-between gap-3 rounded-none border-[3px] border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold leading-5 text-[var(--ink)] shadow-brutal-sm md:bottom-3 md:left-auto md:max-w-80 lg:bottom-3"
        role="status"
        aria-live="polite"
      >
        <span>可添加桌面入口；课程内容仍需联网加载。</span>
        <Button type="button" size="sm" onClick={promptInstall} className="shrink-0">
          <MonitorDown className="h-4 w-4" aria-hidden="true" />
          添加到桌面
        </Button>
      </div>
    );
  }

  if (!showIosGuide || installStatus === "installed") return null;

  return (
    <div
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-none border-[3px] border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold leading-5 text-[var(--ink)] shadow-brutal-sm md:bottom-3 md:left-auto md:max-w-80 lg:bottom-3"
      role="status"
      aria-live="polite"
    >
      在浏览器中轻点“分享” → “添加到主屏幕”；课程内容仍需联网加载。
    </div>
  );
}

function isLegacyOfflineWorker(worker: ServiceWorker | null) {
  if (!worker?.scriptURL) return false;
  try {
    return new URL(worker.scriptURL).pathname === "/sw.js";
  } catch {
    return false;
  }
}

function isLegacyOfflineRegistration(registration: ServiceWorkerRegistration) {
  try {
    if (new URL(registration.scope).pathname !== "/") return false;
  } catch {
    return false;
  }
  return [registration.active, registration.installing, registration.waiting]
    .some((worker) => isLegacyOfflineWorker(worker));
}
