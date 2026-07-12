"use client";

export type StorageHealthStatus = "secure" | "warning" | "critical" | "unsupported" | "error";

export interface LearningStorageHealth {
  supported: boolean;
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
  usageRatio: number | null;
  status: StorageHealthStatus;
  label: string;
  detail: string;
}

export async function checkLearningStorageHealth(): Promise<LearningStorageHealth> {
  const storage = getStorageManager();
  if (!storage) return unsupportedHealth();

  try {
    const [estimate, persisted] = await Promise.all([
      typeof storage.estimate === "function" ? storage.estimate() : Promise.resolve<StorageEstimate>({}),
      typeof storage.persisted === "function" ? storage.persisted() : Promise.resolve<boolean | null>(null)
    ]);
    return describeStorageHealth({
      supported: true,
      persisted,
      usage: normalizeStorageNumber(estimate.usage),
      quota: normalizeStorageNumber(estimate.quota)
    });
  } catch {
    return {
      ...unsupportedHealth(),
      supported: true,
      status: "error",
      label: "未读取",
      detail: "浏览器没有返回本地存储状态。请先导出备份，再继续长期学习。"
    };
  }
}

export async function requestLearningStoragePersistence(): Promise<LearningStorageHealth> {
  const storage = getStorageManager();
  if (!storage) return unsupportedHealth();

  try {
    if (typeof storage.persist === "function") {
      await storage.persist();
    }
  } catch {
    return {
      ...unsupportedHealth(),
      supported: true,
      status: "error",
      label: "未授权",
      detail: "浏览器拒绝开启持久化存储。请导出备份，并检查浏览器站点权限。"
    };
  }
  return checkLearningStorageHealth();
}

export function describeStorageHealth(input: {
  supported: boolean;
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
}): LearningStorageHealth {
  if (!input.supported) return unsupportedHealth();

  const usageRatio = input.usage !== null && input.quota && input.quota > 0
    ? Math.min(1, input.usage / input.quota)
    : null;
  if (usageRatio !== null && usageRatio >= 0.92) {
    return {
      ...input,
      usageRatio,
      status: "critical",
      label: "空间紧",
      detail: `本地存储已使用 ${formatStoragePercent(usageRatio)}。请立即导出备份，并清理浏览器空间。`
    };
  }
  if (input.persisted === false) {
    return {
      ...input,
      usageRatio,
      status: "warning",
      label: "需备份",
      detail: "浏览器尚未承诺保留 Kirina 的长期学习数据。请点击“存储”尝试开启持久化，并定期导出备份。"
    };
  }
  if (usageRatio !== null && usageRatio >= 0.75) {
    return {
      ...input,
      usageRatio,
      status: "warning",
      label: "快满",
      detail: `本地存储已使用 ${formatStoragePercent(usageRatio)}。继续大量写作前建议先导出备份。`
    };
  }
  if (input.persisted === true) {
    return {
      ...input,
      usageRatio,
      status: "secure",
      label: "已持久",
      detail: usageRatio === null
        ? "浏览器已允许持久化保存学习数据。"
        : `浏览器已允许持久化保存学习数据，当前使用 ${formatStoragePercent(usageRatio)}。`
    };
  }
  return {
    ...input,
    usageRatio,
    status: "secure",
    label: "可用",
    detail: usageRatio === null
      ? "本地存储可用，但浏览器没有提供容量估算。请定期导出备份。"
      : `本地存储可用，当前使用 ${formatStoragePercent(usageRatio)}。请定期导出备份。`
  };
}

function getStorageManager(): StorageManager | null {
  if (typeof navigator === "undefined") return null;
  return "storage" in navigator && navigator.storage ? navigator.storage : null;
}

function normalizeStorageNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function formatStoragePercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function unsupportedHealth(): LearningStorageHealth {
  return {
    supported: false,
    persisted: null,
    usage: null,
    quota: null,
    usageRatio: null,
    status: "unsupported",
    label: "不支持",
    detail: "当前浏览器不支持 StorageManager 状态检测。学习数据仍会写入本机，请定期导出备份。"
  };
}
