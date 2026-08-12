import { learningRows } from './kana';

export interface Session {
  queue: string[];
  questionIndex: number;
  mistakes: number;
  collectedThisRound: string[];
}

export const QUESTIONS_PER_ROUND = 5;

export interface StageCourse {
  id: 'garden' | 'forest' | 'hill';
  name: string;
  emoji: string;
  rows: readonly (readonly string[])[];
}

// 3つのおうちは、出題する文字そのものを分ける。
// そのため別のおうちを選んでも、同じ「正解の文字」の問題にはならない。
export const stageCourses: readonly StageCourse[] = [
  { id: 'garden', name: 'はじめての にわ', emoji: '🏠', rows: learningRows.slice(0, 3) },
  { id: 'forest', name: 'どうぶつの もり', emoji: '🏡', rows: learningRows.slice(3, 6) },
  { id: 'hill', name: 'ほしぞらの おか', emoji: '🏰', rows: learningRows.slice(6) }
];

export function courseForStage(id: string): StageCourse {
  return stageCourses.find((course) => course.id === id) ?? stageCourses[0];
}

export function courseKana(course: StageCourse) { return course.rows.flat(); }

export function newSession(completed: readonly string[], course: StageCourse = stageCourses[0]): Session {
  const nextRow = course.rows.find((row) => row.some((kana) => !completed.includes(kana)));
  // 全ステージをクリアした後も、このおうち専用の文字だけを復習する。
  const queue = [...(nextRow ?? courseKana(course).slice(0, QUESTIONS_PER_ROUND))];
  return { queue, questionIndex: 0, mistakes: 0, collectedThisRound: [] };
}

export function currentKana(session: Session) { return session.queue[session.questionIndex]; }
export function isComplete(session: Session) { return session.questionIndex >= session.queue.length; }
