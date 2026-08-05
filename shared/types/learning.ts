export type Subject = "literacy" | "pinyin" | "english" | "math" | "poetry";
export type RecordType = "learn" | "practice" | "test";
export type LearningStep = 1 | 2 | 3;

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

export interface LearningRecord {
  id: string;
  childId: string;
  subject: Subject;
  charId: string;
  type: RecordType;
  score?: number;
  accuracy?: number;
  duration: number;
  date: string;
}
