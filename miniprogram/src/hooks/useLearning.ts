import { useState, useCallback, useEffect } from "react";
import { api } from "../services/api";
import { getLearningContent } from "../utils/cache";
import { saveCheckinLocally } from "../utils/checkin-queue";

export type LearnState = "loading" | "learn" | "quiz" | "complete" | "error";

export interface ContentItem {
  id: string;
  [key: string]: any;
}

export interface TodayTask {
  id: string;
  subject: string;
  taskType: string;
  completed: boolean;
  pointsEarned: number;
}

export interface LearningState {
  state: LearnState;
  items: ContentItem[];
  currentIndex: number;
  currentItem: ContentItem | null;
  progress: { done: number; total: number };
  todayTask: TodayTask | null;
  loadContent: () => Promise<void>;
  goToQuiz: () => void;
  submitAnswer: (correct: boolean) => Promise<void>;
  retry: () => void;
}

/**
 * useLearning powers the 5-subject learning flow:
 *   loading -> learn -> quiz -> (submitAnswer) -> learn | complete
 *
 * - Loads today's check-in task to know if the subject is already completed.
 * - Loads learning content via the cache-first strategy (utils/cache.ts).
 * - Saves a learning record per answered item.
 * - On finishing the last item, completes the check-in task; falls back to the
 *   offline check-in queue when the network is unavailable.
 */
export function useLearning(subject: string, childId: string): LearningState {
  const [state, setState] = useState<LearnState>("loading");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [todayTask, setTodayTask] = useState<TodayTask | null>(null);

  const loadContent = useCallback(async () => {
    setState("loading");
    try {
      // Fetch today's check-in task to know if already completed
      const checkin = await api.getCheckinToday(childId);
      const task = (checkin?.tasks ?? []).find(
        (t) => t.subject === subject,
      ) as TodayTask | undefined;
      setTodayTask(task ?? null);

      // Fetch learning content via cache-first strategy
      const data = await getLearningContent<{ items: ContentItem[] }>(
        subject,
        1,
      );
      const contentItems = data?.items ?? [];
      if (contentItems.length === 0) {
        setState("complete");
        return;
      }
      setItems(contentItems);
      setCurrentIndex(0);
      setState("learn");
    } catch {
      setState("error");
    }
  }, [subject, childId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const currentItem = items[currentIndex] ?? null;

  const progress = {
    done: currentIndex,
    total: items.length,
  };

  const goToQuiz = useCallback(() => {
    setState("quiz");
  }, []);

  const submitAnswer = useCallback(
    async (correct: boolean) => {
      const item = items[currentIndex];
      if (!item) return;

      // Save learning record (non-blocking on failure)
      try {
        await api.saveLearningRecord({
          childId,
          subject,
          charId: item.id,
          correct,
        });
      } catch {
        // Continue even if record save fails
      }

      const next = currentIndex + 1;
      if (next >= items.length) {
        // All done - complete check-in task
        if (todayTask && !todayTask.completed) {
          try {
            await api.completeCheckinTask(childId, todayTask.id);
            setTodayTask((t) => (t ? { ...t, completed: true } : t));
          } catch {
            // Offline: queue for later sync
            saveCheckinLocally(todayTask.id, childId);
          }
        }
        setState("complete");
      } else {
        setCurrentIndex(next);
        setState("learn");
      }
    },
    [currentIndex, items, childId, subject, todayTask],
  );

  const retry = useCallback(() => {
    loadContent();
  }, [loadContent]);

  return {
    state,
    items,
    currentIndex,
    currentItem,
    progress,
    todayTask,
    loadContent,
    goToQuiz,
    submitAnswer,
    retry,
  };
}
