"use client";

import { useState } from "react";
import { Button } from "./button";

export function useLibraryPage<T>(items: T[], filterKey: string, pageSize: number) {
  const [selection, setSelection] = useState({ filterKey, page: 0 });
  // Remember every filter change so returning to an earlier filter cannot revive its old page.
  if (selection.filterKey !== filterKey) setSelection({ filterKey, page: 0 });
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = selection.filterKey === filterKey ? Math.min(selection.page, pages - 1) : 0;
  return {
    page, pages, pageSize, total: items.length,
    items: items.slice(page * pageSize, (page + 1) * pageSize),
    setPage: (next: number) => setSelection({ filterKey, page: Math.max(0, Math.min(next, pages - 1)) })
  };
}

export function LibraryPagination({ page, pages, total, pageSize, onPage, label, resultsId }: {
  page: number; pages: number; total: number; pageSize: number;
  onPage: (page: number) => void; label: string; resultsId: string;
}) {
  if (!total) return null;
  const go = (next: number) => {
    onPage(next);
    window.requestAnimationFrame(() => {
      const results = document.getElementById(resultsId);
      results?.scrollIntoView({ block: "start", behavior: "auto" });
      results?.focus({ preventScroll: true });
    });
  };
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] py-3">
    <p className="text-sm text-[var(--muted)]" role="status">第 {page + 1} / {pages} 页 · 显示 {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)}，共 {total} 项</p>
    <div className="flex gap-2">
      <Button type="button" variant="secondary" size="sm" disabled={page === 0} onClick={() => go(page - 1)}>上一页</Button>
      <Button type="button" variant="secondary" size="sm" disabled={page + 1 === pages} onClick={() => go(page + 1)}>下一页</Button>
    </div>
  </nav>;
}
