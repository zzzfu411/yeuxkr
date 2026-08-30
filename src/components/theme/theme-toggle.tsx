"use client";

import { useSyncExternalStore } from "react";

const THEME_EVENT = "yeuxkr-theme";
const THEME_KEY = "yeuxkr.theme";

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY || (event.newValue !== "light" && event.newValue !== "dark")) return;
    document.documentElement.setAttribute("data-theme", event.newValue);
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode can block storage; the in-document theme still applies.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light");
  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      title="切换浅色 / 黑夜"
      aria-label={dark ? "切换到浅色" : "切换到黑夜"}
      aria-pressed={dark}
      onClick={() => applyTheme(dark ? "light" : "dark")}
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
    </button>
  );
}
