import Taro from "@tarojs/taro";
import { api } from "../services/api";

const QUEUE_KEY = "checkin_queue";

interface QueuedCheckin {
  taskId: string;
  childId: string;
  timestamp: number;
}

/**
 * Save a checkin task locally when offline.
 * Appends to the persistent queue for later sync.
 */
export function saveCheckinLocally(taskId: string, childId: string): void {
  try {
    const raw = Taro.getStorageSync(QUEUE_KEY);
    const queue: QueuedCheckin[] = raw ? JSON.parse(raw) : [];
    queue.push({ taskId, childId, timestamp: Date.now() });
    Taro.setStorageSync(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full — silently fail (data will be lost)
    console.warn("[checkin-queue] Failed to save checkin locally");
  }
}

/**
 * Sync all pending checkins to the server.
 * Successful items are removed; failed items stay for next attempt.
 *
 * @returns The number of successfully synced items.
 */
export async function syncPendingCheckins(): Promise<number> {
  try {
    const raw = Taro.getStorageSync(QUEUE_KEY);
    if (!raw) return 0;

    const queue: QueuedCheckin[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    let synced = 0;
    const failed: QueuedCheckin[] = [];

    for (const item of queue) {
      try {
        await api.completeCheckinTask(item.childId, item.taskId);
        synced++;
      } catch {
        failed.push(item);
      }
    }

    // Keep failed items for the next sync attempt
    try {
      Taro.setStorageSync(QUEUE_KEY, JSON.stringify(failed));
    } catch {
      // Storage write failed
    }

    return synced;
  } catch {
    return 0;
  }
}

/**
 * Get the count of pending checkins in the queue.
 */
export function getPendingCheckinCount(): number {
  try {
    const raw = Taro.getStorageSync(QUEUE_KEY);
    if (!raw) return 0;
    const queue: QueuedCheckin[] = JSON.parse(raw);
    return queue.length;
  } catch {
    return 0;
  }
}

/**
 * Clear the entire checkin queue (e.g., after a full sync).
 */
export function clearCheckinQueue(): void {
  try {
    Taro.removeStorageSync(QUEUE_KEY);
  } catch {
    // Silently fail
  }
}