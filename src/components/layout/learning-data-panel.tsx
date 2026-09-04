"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Database, Download, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLearningBackup, MAX_LEARNING_BACKUP_BYTES, parseLearningBackupText, resetLearningData, restoreLearningBackup } from "@/lib/learning/backup";
import { requestLearningStoragePersistence, type LearningStorageHealth } from "@/lib/learning/storage-health";

type PanelStatus = "idle" | "exported" | "imported" | "reset" | "invalid" | "error";
type StorageStatus = "idle" | "checking";
const reloadStatusKey = "kirina.learning-data.reload-status";

const statusLabels: Record<Exclude<PanelStatus, "idle">, string> = {
  exported: "已导出",
  imported: "已导入",
  reset: "已重置",
  invalid: "文件无效",
  error: "未保存"
};

export function LearningDataPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("idle");
  const [storageHealth, setStorageHealth] = useState<LearningStorageHealth | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const reloadStatus = window.sessionStorage.getItem(reloadStatusKey);
        window.sessionStorage.removeItem(reloadStatusKey);
        if (reloadStatus === "imported" || reloadStatus === "reset") setStatus(reloadStatus);
      } catch {
        // Storage can be blocked in private or embedded contexts; the panel still remains usable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const reloadAfterDataChange = (nextStatus: "imported" | "reset") => {
    try {
      window.sessionStorage.setItem(reloadStatusKey, nextStatus);
    } catch {
      // The data mutation already succeeded, so a blocked status channel must not prevent refresh.
    }
    window.location.reload();
  };

  const exportData = () => {
    let url = "";
    try {
      const backup = createLearningBackup();
      if (!backup) throw new Error("Learning storage is not readable");
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kirina-korean-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
      link.click();
      setStatus("exported");
    } catch {
      setStatus("error");
    } finally {
      if (url) URL.revokeObjectURL(url);
      setConfirmReset(false);
    }
  };

  const importData = async (file: File | undefined) => {
    setConfirmReset(false);
    if (!file) return;
    if (file.size > MAX_LEARNING_BACKUP_BYTES) {
      setStatus("invalid");
      return;
    }
    const backup = parseLearningBackupText(await file.text().catch(() => ""));
    if (!backup) {
      setStatus("invalid");
      return;
    }
    if (await restoreLearningBackup(backup)) reloadAfterDataChange("imported");
    else setStatus("error");
  };

  const resetData = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setStatus("idle");
      return;
    }
    if (await resetLearningData()) reloadAfterDataChange("reset");
    else setStatus("error");
    setConfirmReset(false);
  };

  const protectStorage = async () => {
    setConfirmReset(false);
    setStorageStatus("checking");
    setStorageHealth(await requestLearningStoragePersistence());
    setStorageStatus("idle");
  };

  return (
    <div className="order-2 col-span-1 flex min-w-0 items-center justify-end lg:order-3" aria-label="本地学习数据">
      <input
        ref={inputRef}
        hidden
        tabIndex={-1}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void importData(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <details
        className="group relative"
        onToggle={(event) => {
          if (!(event.currentTarget as HTMLDetailsElement).open) setConfirmReset(false);
        }}
      >
        <summary className="focus-ring inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_58%,transparent)] px-3 text-sm font-normal text-[var(--ink-soft)] shadow-paper-sm transition hover:border-[var(--line-strong)] hover:bg-[var(--wash-2)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
          <Database className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">学习数据</span>
          {status !== "idle" ? <span className={`hidden font-script text-xs font-normal sm:inline ${panelStatusTextClassName(status)}`}>{statusLabels[status]}</span> : null}
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.7rem)] z-50 grid max-h-[calc(100dvh-8rem)] w-[min(20rem,calc(100vw-1.5rem))] gap-3 overflow-y-auto overscroll-contain rounded-[var(--radius)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_94%,transparent)] p-4 shadow-editorial backdrop-blur-md">
          <span className="pointer-events-none absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 -rotate-2 border-x border-dashed border-[var(--tape-edge)] bg-[var(--tape)] opacity-70" aria-hidden="true" />
          <div>
            <p className="eyebrow">Local Data</p>
            <strong className="mt-1 block font-brush text-xl font-normal">备份与存储</strong>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" size="sm" title="导出本地学习数据" onClick={exportData}>
              <Download className="h-4 w-4" />
              导出
            </Button>
            <Button type="button" variant="secondary" size="sm" title="导入本地学习数据" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              导入
            </Button>
            <Button type="button" variant={confirmReset ? "danger" : "ghost"} size="sm" title="重置本地学习数据" onClick={() => void resetData()}>
              <RotateCcw className="h-4 w-4" />
              {confirmReset ? "确认重置" : "重置"}
            </Button>
            <Button type="button" variant="ghost" size="sm" title={storageHealth?.detail ?? "检查并请求持久化本地学习数据"} onClick={() => void protectStorage()}>
              <ShieldCheck className="h-4 w-4" />
              保护存储
            </Button>
          </div>
          <p className="text-xs font-normal leading-5 text-[var(--muted)]">备份包含课程、复习和文字作品，最大 4 MB。麦克风录音不会导出，换设备后需要重新录制。</p>
          {confirmReset ? <p className="border-l-2 border-[var(--seal)] pl-2 text-xs font-normal leading-5 text-[var(--cinnabar)]">再次点击会清空本机课程、复习卡、输出档案和录音。</p> : null}
          <div className="flex min-h-6 flex-wrap gap-2" aria-live="polite">
            {status !== "idle" ? (
              <span className={`rounded-[var(--radius)] border px-2 py-1 font-script text-xs font-normal ${panelStatusClassName(status)}`} role="status">
                {statusLabels[status]}
              </span>
            ) : null}
            {storageStatus === "checking" || storageHealth ? (
              <span
                className={`rounded-[var(--radius)] border px-2 py-1 font-script text-xs font-normal ${storageHealthClassName(storageHealth)}`}
                role="status"
                title={storageHealth?.detail ?? "正在检查本地存储状态"}
              >
                {storageStatus === "checking" ? "检查中" : storageHealth?.label}
              </span>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
}

function panelStatusTextClassName(status: Exclude<PanelStatus, "idle">) {
  if (status === "invalid" || status === "error") return "text-[var(--cinnabar)]";
  return "text-[var(--celadon-text)]";
}

function panelStatusClassName(status: Exclude<PanelStatus, "idle">) {
  if (status === "invalid" || status === "error") {
    return "border-[color-mix(in_srgb,var(--seal)_56%,var(--line))] bg-[var(--seal-soft)] text-[var(--cinnabar)]";
  }
  return "border-[color-mix(in_srgb,var(--green)_42%,var(--line))] bg-[var(--green-soft)] text-[var(--celadon-text)]";
}

function storageHealthClassName(health: LearningStorageHealth | null) {
  if (!health) return "border-[var(--line)] bg-[var(--wash-1)] text-[var(--muted)]";
  if (health.status === "secure") return "border-[var(--green)] bg-[var(--green-soft)] text-[var(--celadon-text)]";
  if (health.status === "critical" || health.status === "error") return "border-[var(--seal)] bg-[var(--seal-soft)] text-[var(--cinnabar)]";
  return "border-[rgba(197,148,77,0.42)] bg-[rgba(197,148,77,0.12)] text-[var(--brass-text)]";
}
