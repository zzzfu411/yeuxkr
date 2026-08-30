"use client";

import { useSyncExternalStore } from "react";

const THEME_EVENT = "yeuxkr-theme";
const THEME_KEY = "yeuxkr.theme";

const THEMES = [
  { id: "yuan", label: "原纸", swatch: "#d8d3cc" },
  { id: "yue", label: "月白", swatch: "#d3d6da" },
  { id: "qing", label: "淡青", swatch: "#cdd6cf" },
  { id: "ye", label: "夜墨", swatch: "#2a2733" },
] as const;

type Theme = (typeof THEMES)[number]["id"];

function isTheme(value: string | null): value is Theme {
  return THEMES.some((theme) => theme.id === value);
}

function normalizeTheme(value: string | null): Theme {
  if (isTheme(value)) return value;

  // Honor the previous two-theme values during the visual-system migration.
  return value === "dark" ? "ye" : "yuan";
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;

    document.documentElement.setAttribute(
      "data-theme",
      normalizeTheme(event.newValue),
    );
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
}

function currentTheme(): Theme {
  return normalizeTheme(document.documentElement.getAttribute("data-theme"));
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode can block storage; the in-document theme still applies.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle() {
  const activeTheme = useSyncExternalStore(
    subscribe,
    currentTheme,
    () => "yuan" as Theme,
  );

  return (
    <div className="theme-toggle" role="group" aria-label="纸张主题">
      {THEMES.map((theme) => {
        const active = activeTheme === theme.id;

        return (
          <button
            key={theme.id}
            type="button"
            className={`theme-toggle__option${active ? " is-active" : ""}`}
            data-theme-option={theme.id}
            title={theme.label}
            aria-label={theme.label}
            aria-pressed={active}
            onClick={() => applyTheme(theme.id)}
          >
            <span
              className="theme-toggle__swatch"
              style={{ backgroundColor: theme.swatch }}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
