export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function groupBy<T extends object, K extends keyof T>(items: readonly T[], key: K): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const bucket = String(item[key] ?? "");
    (result[bucket] ??= []).push(item);
  }
  return result;
}

export function countBy<T extends object, K extends keyof T>(items: readonly T[], key: K): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const bucket = String(item[key] ?? "");
    result[bucket] = (result[bucket] ?? 0) + 1;
  }
  return result;
}
