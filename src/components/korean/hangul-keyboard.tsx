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
      className={cn("grid gap-1.5 rounded-[8px] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-2", className)}
      role="group"
      aria-label="韩文屏幕键盘"
    >
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {rowIndex === 2 ? (
            <button
              type="button"
              className={cn(
                "focus-ring hangul-key min-w-12 font-mono text-xs font-black uppercase",
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
              className="focus-ring hangul-key hangul-display flex-1 text-lg font-black sm:max-w-12"
              onClick={() => pressJamo(key)}
            >
              {shifted && key.shift ? key.shift : key.base}
            </button>
          ))}
          {rowIndex === 2 ? (
            <button
              type="button"
              className="focus-ring hangul-key min-w-12"
              aria-label="退格"
              onClick={onBackspace}
            >
              <Delete className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
      <div className="flex justify-center gap-1.5">
        <button type="button" className="focus-ring hangul-key flex-1 max-w-64 font-mono text-xs font-black" onClick={onSpace}>
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
