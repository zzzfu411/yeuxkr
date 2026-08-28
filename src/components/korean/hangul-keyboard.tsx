"use client";

import { useState } from "react";
import { ArrowBigUp, CornerDownLeft, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const ROWS: Array<Array<{ base: string; shift?: string }>> = [
  [
    { base: "ㅂ", shift: "ㅃ" },
    { base: "ㅈ", shift: "ㅉ" },
    { base: "ㄷ", shift: "ㄸ" },
    { base: "ㄱ", shift: "ㄲ" },
    { base: "ㅅ", shift: "ㅆ" },
    { base: "ㅛ" },
    { base: "ㅕ" },
    { base: "ㅑ" },
    { base: "ㅐ", shift: "ㅒ" },
    { base: "ㅔ", shift: "ㅖ" }
  ],
  [
    { base: "ㅁ" },
    { base: "ㄴ" },
    { base: "ㅇ" },
    { base: "ㄹ" },
    { base: "ㅎ" },
    { base: "ㅗ" },
    { base: "ㅓ" },
    { base: "ㅏ" },
    { base: "ㅣ" }
  ],
  [
    { base: "ㅋ" },
    { base: "ㅌ" },
    { base: "ㅊ" },
    { base: "ㅍ" },
    { base: "ㅠ" },
    { base: "ㅜ" },
    { base: "ㅡ" }
  ]
];

export function HangulKeyboard({
  onJamo,
  onBackspace,
  onSpace,
  onSubmit,
  className
}: {
  onJamo: (jamo: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onSubmit?: () => void;
  className?: string;
}) {
  const [shifted, setShifted] = useState(false);

  const pressJamo = (key: { base: string; shift?: string }) => {
    onJamo(shifted && key.shift ? key.shift : key.base);
    setShifted(false);
  };

  return (
    <div
      className={cn("grid min-w-0 max-w-full gap-1.5 overflow-x-auto rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-1 min-[360px]:p-2", className)}
      role="group"
      aria-label="韩文屏幕键盘"
      onMouseDown={(event) => event.preventDefault()}
    >
      {ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="mx-auto grid w-full max-w-[33rem] gap-px min-[360px]:gap-1 sm:gap-1.5"
          style={{ gridTemplateColumns: `repeat(${row.length + (rowIndex === 2 ? 2 : 0)}, minmax(24px, 1fr))` }}
        >
          {rowIndex === 2 ? (
            <button
              type="button"
              className={cn(
                "focus-ring hangul-key min-w-0 font-mono text-xs font-black uppercase",
                shifted && "border-[rgba(23,63,115,0.4)] bg-[rgba(23,63,115,0.12)] text-[var(--ocean)]"
              )}
              aria-pressed={shifted}
              aria-label="Shift：切换紧音"
              onClick={() => setShifted((current) => !current)}
            >
              <ArrowBigUp className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          {row.map((key) => (
            <button
              key={key.base}
              type="button"
              lang="ko"
              className="focus-ring hangul-key hangul-display min-w-0 text-base font-black sm:text-lg"
              onClick={() => pressJamo(key)}
            >
              {shifted && key.shift ? key.shift : key.base}
            </button>
          ))}
          {rowIndex === 2 ? (
            <button
              type="button"
              className="focus-ring hangul-key min-w-0"
              aria-label="退格"
              onClick={onBackspace}
            >
              <Delete className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
      <div className="mx-auto grid w-full max-w-[33rem] grid-cols-[minmax(24px,1fr)_auto] gap-px min-[360px]:gap-1 sm:gap-1.5">
        <button type="button" className="focus-ring hangul-key min-w-0 font-mono text-xs font-black" onClick={onSpace}>
          空格
        </button>
        {onSubmit ? (
          <button type="button" className="focus-ring hangul-key min-w-16 gap-1 font-mono text-xs font-black" aria-label="提交答案" onClick={onSubmit}>
            <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
            提交
          </button>
        ) : null}
      </div>
    </div>
  );
}
