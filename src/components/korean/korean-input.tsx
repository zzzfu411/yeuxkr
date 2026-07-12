"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Keyboard } from "lucide-react";
import { HangulKeyboard } from "@/components/korean/hangul-keyboard";
import { backspaceJamo, composeJamoInput, QWERTY_TO_JAMO } from "@/lib/korean/jamo";
import { cn } from "@/lib/utils";

function subscribeCoarsePointer(onChange: () => void) {
  const media = window.matchMedia("(pointer: coarse)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useCoarsePointer() {
  return useSyncExternalStore(
    subscribeCoarsePointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
}

export function KoreanInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  ariaLabel = "输入韩文答案",
  className
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const coarsePointer = useCoarsePointer();
  const [keyboardOverride, setKeyboardOverride] = useState<boolean | null>(null);
  const [physicalMode, setPhysicalMode] = useState(false);
  const keyboardOpen = keyboardOverride ?? coarsePointer;

  const focusInput = () => inputRef.current?.focus();

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (!physicalMode || disabled) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      onChange(backspaceJamo(value));
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      onChange(value + " ");
      return;
    }
    const jamo = QWERTY_TO_JAMO[event.key];
    if (jamo) {
      event.preventDefault();
      onChange(composeJamoInput(value, jamo));
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          className="focus-ring hangul-display min-h-12 min-w-0 flex-1 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3 text-lg"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang="ko"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={cn(
            "focus-ring inline-flex min-h-12 items-center gap-2 rounded-[8px] border px-3 text-sm font-extrabold transition",
            keyboardOpen
              ? "border-[rgba(23,63,115,0.4)] bg-[rgba(23,63,115,0.1)] text-[var(--ocean)]"
              : "border-[var(--line)] bg-[rgba(255,250,240,0.72)] text-[var(--muted)]"
          )}
          aria-pressed={keyboardOpen}
          onClick={() => setKeyboardOverride(!keyboardOpen)}
        >
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          韩文键盘
        </button>
      </div>
      {keyboardOpen && !disabled ? (
        <>
          <HangulKeyboard
            onJamo={(jamo) => {
              onChange(composeJamoInput(value, jamo));
              focusInput();
            }}
            onBackspace={() => {
              onChange(backspaceJamo(value));
              focusInput();
            }}
            onSpace={() => {
              onChange(value + " ");
              focusInput();
            }}
            onSubmit={onSubmit}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[var(--muted)]">
            <input
              type="checkbox"
              checked={physicalMode}
              onChange={(event) => setPhysicalMode(event.target.checked)}
            />
            物理键盘练习模式（按两文式布局把字母键映射为韩文字母；已装韩语输入法的可以关闭直接输入）
          </label>
        </>
      ) : null}
    </div>
  );
}
