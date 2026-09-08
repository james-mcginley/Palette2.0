import { useMemo } from 'react';
import { useMyLogs, type LogRow } from './logs';

export interface LogbookSpread {
  key: string;
  label: string;
  leftItems: LogRow[];
  rightItems: LogRow[];
  folioLeft: number;
  folioRight: number;
}

/** Week-of-month, not ISO week-of-year — matches the "2026.08 — WEEK 3"
 *  anatomy in EDITORIAL_SYSTEM.md §2, which reads as a month position, not
 *  a year-wide week count nobody would recognize at a glance. */
function weekOfMonth(day: number): number {
  return Math.ceil(day / 7);
}

/**
 * "Pages are weeks, not fixed counts" — one week's logged items become one
 * two-page spread, split evenly across the pair rather than a fixed layout,
 * so a heavy week visibly fills more of the spread than a quiet one and a
 * sparse week is never padded out with blank space it doesn't need filled.
 */
export function useLogbookSpreads(): { spreads: LogbookSpread[]; isLoading: boolean; totalLogged: number } {
  const { data: logs, isLoading } = useMyLogs();

  const spreads = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const buckets = new Map<string, { year: number; month: number; week: number; items: LogRow[] }>();
    for (const log of logs) {
      const d = new Date(`${log.logged_on}T00:00:00`);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const week = weekOfMonth(d.getDate());
      const key = `${year}-${month}-${week}`;
      const bucket = buckets.get(key) ?? { year, month, week, items: [] };
      bucket.items.push(log);
      buckets.set(key, bucket);
    }

    const ordered = [...buckets.values()].sort(
      (a, b) => a.year - b.year || a.month - b.month || a.week - b.week
    );

    return ordered.map((bucket, i): LogbookSpread => {
      // Chronological within the week too, oldest to newest, left page first.
      const items = [...bucket.items].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const mid = Math.ceil(items.length / 2);
      return {
        key: `${bucket.year}-${bucket.month}-${bucket.week}`,
        label: `${bucket.year}.${String(bucket.month).padStart(2, '0')} — WEEK ${bucket.week}`,
        leftItems: items.slice(0, mid),
        rightItems: items.slice(mid),
        folioLeft: i * 2 + 1,
        folioRight: i * 2 + 2,
      };
    });
  }, [logs]);

  return { spreads, isLoading, totalLogged: logs?.length ?? 0 };
}
