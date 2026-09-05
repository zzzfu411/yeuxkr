"use client";

import { useSyncExternalStore } from "react";

const THEME_EVENT = "yeuxkr-theme";
const THEME_KEY = "yeuxkr.theme";

const THEMES = [
  { id: "yuan", label: "春日", ko: "봄", swatch: "#f4f6f5" },
  { id: "yue", label: "雨季", ko: "여름", swatch: "#dfecea" },
  { id: "qing", label: "晚秋", ko: "가을", swatch: "#e8e1da" },
  { id: "ye", label: "蓝夜", ko: "겨울", swatch: "#172238" },
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

  const active = THEMES.find((theme) => theme.id === activeTheme) ?? THEMES[0];

  return (
    <details className="season-switcher" onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.currentTarget.removeAttribute("open");
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary className="season-trigger focus-ring" aria-label={`季节主题：${active.label}`}>
        <span className="theme-toggle__swatch" style={{ backgroundColor: active.swatch }} aria-hidden="true" />
        <span>{active.label}</span>
      </summary>
      <span className="theme-toggle">
        {THEMES.map((theme) => {
          const selected = activeTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              className={`theme-toggle__option${selected ? " is-active" : ""}`}
              data-theme-option={theme.id}
              title={`${theme.ko} · ${theme.label}`}
              aria-label={`${theme.ko} · ${theme.label}`}
              aria-pressed={selected}
              onClick={(event) => {
                applyTheme(theme.id);
                const menu = event.currentTarget.closest("details");
                menu?.removeAttribute("open");
                menu?.querySelector("summary")?.focus();
              }}
            >
              <span
                className="theme-toggle__swatch"
                style={{ backgroundColor: theme.swatch }}
                aria-hidden="true"
              />
              <span>{theme.label}</span>
            </button>
          );
        })}
      </span>
    </details>
  );
}
