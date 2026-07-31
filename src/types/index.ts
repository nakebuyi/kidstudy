// 学习科目
export type Subject = "literacy" | "pinyin" | "english" | "math" | "poetry";

// 识字内容
export interface LiteracyContent {
  id: string;
  char: string;
  pinyin: string;
  radical: string;
  strokes: number;
  words: string[];
  sentences: string[];
  emoji: string;
  level: 1 | 2 | 3;
  order: number;
}

// 宠物状态
export interface PetState {
  type: "cat" | "dog" | "rabbit";
  name: string;
  level: number;
  mood: "happy" | "normal" | "sad";
}

// 学习记录类型
export type RecordType = "learn" | "practice" | "test";

// 打卡状态
export type CheckInStatus = "not_started" | "in_progress" | "completed" | "claimed";

// 学习步骤
export type LearningStep = 1 | 2 | 3;

// NextAuth session 扩展
export interface ExtendedSession {
  user: {
    id: string;
    username: string;
  };
  currentChildId?: string;
}