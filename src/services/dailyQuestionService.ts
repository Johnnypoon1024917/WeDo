import deepQuestions from '../assets/deep_questions.json';

export interface Prompt {
  id: number;
  category: string;
  prompt: string;
}

const questions: Prompt[] = deepQuestions as Prompt[];

/**
 * Deterministically select a daily question based on the given date (UTC).
 * Cycles through all prompts before repeating.
 *
 * Algorithm: index = daysSinceEpoch % totalQuestions
 */
export function getDailyQuestion(date: Date): Prompt {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysSinceEpoch = Math.floor(date.getTime() / MS_PER_DAY);
  const index = daysSinceEpoch % questions.length;
  return questions[index];
}
