"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type SyntheticEvent } from "react";
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
  const compositionRef = useRef(false);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const coarsePointer = useCoarsePointer();
  const [keyboardOverride, setKeyboardOverride] = useState<boolean | null>(null);
  const [physicalMode, setPhysicalMode] = useState(false);
  const keyboardOpen = keyboardOverride ?? coarsePointer;

  useLayoutEffect(() => {
    const input = inputRef.current;
    const pendingSelection = pendingSelectionRef.current;
    if (!input || !pendingSelection) return;

    const start = Math.min(pendingSelection.start, input.value.length);
    const end = Math.min(pendingSelection.end, input.value.length);
    input.focus({ preventScroll: true });
    input.setSelectionRange(start, end);
    selectionRef.current = { start, end };
    pendingSelectionRef.current = null;
  }, [value]);

  const rememberSelection = (event: SyntheticEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (input.selectionStart == null || input.selectionEnd == null) return;
    selectionRef.current = { start: input.selectionStart, end: input.selectionEnd };
  };

  const getSelection = () => {
    const input = inputRef.current;
    if (input && typeof document !== "undefined" && document.activeElement === input && input.selectionStart != null && input.selectionEnd != null) {
      return { start: input.selectionStart, end: input.selectionEnd };
    }
    return selectionRef.current ?? { start: value.length, end: value.length };
  };

  const commitEdit = (nextValue: string, caret: number) => {
    const nextSelection = { start: caret, end: caret };
    selectionRef.current = nextSelection;
    pendingSelectionRef.current = nextSelection;
    onChange(nextValue);

    const input = inputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      const immediateCaret = Math.min(caret, input.value.length);
      input.setSelectionRange(immediateCaret, immediateCaret);
    }
    if (nextValue === value) pendingSelectionRef.current = null;
  };

  const insertJamo = (jamo: string) => {
    const { start, end } = getSelection();
    const composedPrefix = composeJamoInput(value.slice(0, start), jamo);
    commitEdit(composedPrefix + value.slice(end), composedPrefix.length);
  };

  const insertSpace = () => {
    const { start, end } = getSelection();
    commitEdit(`${value.slice(0, start)} ${value.slice(end)}`, start + 1);
  };

  const removeBeforeSelection = () => {
    const { start, end } = getSelection();
    if (start !== end) {
      commitEdit(value.slice(0, start) + value.slice(end), start);
      return;
    }
    const nextPrefix = backspaceJamo(value.slice(0, start));
    commitEdit(nextPrefix + value.slice(end), nextPrefix.length);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const nativeEvent = event.nativeEvent;
    if (compositionRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (!physicalMode || disabled) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      removeBeforeSelection();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      insertSpace();
      return;
    }
    const jamo = QWERTY_TO_JAMO[event.key];
    if (jamo) {
      event.preventDefault();
      insertJamo(jamo);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          className="focus-ring hangul-display min-h-12 min-w-0 flex-1 rounded-[8px] border border-[var(--line-strong)] bg-[var(--surface-solid)] px-3 text-lg"
          lang="ko"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(event: FormEvent<HTMLInputElement>) => {
            rememberSelection(event);
            onChange(event.currentTarget.value);
          }}
          onBlur={rememberSelection}
          onClick={rememberSelection}
          onFocus={rememberSelection}
          onKeyUp={rememberSelection}
          onSelect={rememberSelection}
          onCompositionStart={() => {
            compositionRef.current = true;
          }}
          onCompositionEnd={(event) => {
            compositionRef.current = false;
            rememberSelection(event);
          }}
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
            onJamo={insertJamo}
            onBackspace={removeBeforeSelection}
            onSpace={insertSpace}
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
