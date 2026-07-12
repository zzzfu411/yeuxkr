"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLearningBackup, parseLearningBackupText, resetLearningData, restoreLearningBackup } from "@/lib/learning/backup";
import { requestLearningStoragePersistence, type LearningStorageHealth } from "@/lib/learning/storage-health";

type PanelStatus = "idle" | "exported" | "imported" | "reset" | "invalid" | "error";
type StorageStatus = "idle" | "checking";

const statusLabels: Record<Exclude<PanelStatus, "idle">, string> = {
  exported: "已导出",
  imported: "已导入",
  reset: "已重置",
  invalid: "文件无效",
  error: "未写入"
};

export function LearningDataPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("idle");
  const [storageHealth, setStorageHealth] = useState<LearningStorageHealth | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = () => {
    const backup = createLearningBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kirina-korean-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("exported");
    setConfirmReset(false);
  };

  const importData = async (file: File | undefined) => {
    setConfirmReset(false);
    if (!file) return;
    const backup = parseLearningBackupText(await file.text().catch(() => ""));
    if (!backup) {
      setStatus("invalid");
      return;
    }
    setStatus(restoreLearningBackup(backup) ? "imported" : "error");
  };

  const resetData = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setStatus("idle");
      return;
    }
    setStatus(resetLearningData() ? "reset" : "error");
    setConfirmReset(false);
  };

  const protectStorage = async () => {
    setConfirmReset(false);
    setStorageStatus("checking");
    setStorageHealth(await requestLearningStoragePersistence());
    setStorageStatus("idle");
  };

  return (
    <div className="nav-scroll col-span-2 flex w-full min-w-0 max-w-full items-center justify-end gap-1 overflow-x-auto lg:col-span-1 lg:w-auto lg:overflow-visible" aria-label="本地学习数据">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void importData(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button type="button" variant="ghost" size="sm" title="导出本地学习数据" onClick={exportData}>
        <Download className="h-4 w-4" />
        导出
      </Button>
      <Button type="button" variant="ghost" size="sm" title="导入本地学习数据" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        导入
      </Button>
      <Button type="button" variant={confirmReset ? "secondary" : "ghost"} size="sm" title="重置本地学习数据" onClick={resetData}>
        <RotateCcw className="h-4 w-4" />
        {confirmReset ? "确认" : "重置"}
      </Button>
      <Button type="button" variant="ghost" size="sm" title={storageHealth?.detail ?? "检查并请求持久化本地学习数据"} onClick={() => void protectStorage()}>
        <ShieldCheck className="h-4 w-4" />
        存储
      </Button>
      {status !== "idle" ? (
        <span className="max-w-16 truncate rounded-[8px] border border-[rgba(24,28,27,0.12)] bg-[rgba(255,250,240,0.58)] px-2 py-1 font-mono text-[0.68rem] font-black uppercase text-[var(--muted)]" role="status">
          {statusLabels[status]}
        </span>
      ) : null}
      {storageStatus === "checking" || storageHealth ? (
        <span
          className={`max-w-20 truncate rounded-[8px] border px-2 py-1 font-mono text-[0.68rem] font-black uppercase ${storageHealthClassName(storageHealth)}`}
          role="status"
          title={storageHealth?.detail ?? "正在检查本地存储状态"}
        >
          {storageStatus === "checking" ? "检查中" : storageHealth?.label}
        </span>
      ) : null}
    </div>
  );
}

function storageHealthClassName(health: LearningStorageHealth | null) {
  if (!health) return "border-[rgba(24,28,27,0.12)] bg-[rgba(255,250,240,0.58)] text-[var(--muted)]";
  if (health.status === "secure") return "border-[rgba(79,140,118,0.38)] bg-[rgba(79,140,118,0.1)] text-[var(--celadon)]";
  if (health.status === "critical" || health.status === "error") return "border-[rgba(185,78,60,0.42)] bg-[rgba(185,78,60,0.1)] text-[var(--cinnabar)]";
  return "border-[rgba(197,148,77,0.42)] bg-[rgba(197,148,77,0.12)] text-[var(--brass)]";
}
