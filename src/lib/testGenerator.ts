import vocaData from '../data/vocaData.json';

export interface Word {
  word: string;
  meaning: string;
  pos: string;
  sentence_en: string;
  sentence_ko: string;
  valid: boolean;
  level: number;
  unit: number;
}

export interface Question {
  id: number;
  level: number;
  unit: number;
  word: string;
  meaning: string;
  sentence: string;
  translation: string;
  options: string[];
  answerIndex: number;
}

type VocaData = Record<string, Record<string, Array<{
  word: string;
  meaning: string;
  pos: string;
  sentence_en: string;
  sentence_ko: string;
  valid: boolean;
}>>>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function blankSentence(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  return sentence.replace(regex, '--------');
}

function generateDistractors(answer: Word, pool: Word[]): string[] {
  const samePosWords = pool.filter(
    (w) => w.word !== answer.word && w.pos === answer.pos
  );

  let distractors: Word[] = [];
  if (samePosWords.length >= 3) {
    distractors = shuffle(samePosWords).slice(0, 3);
  } else {
    distractors = [...samePosWords];
    const remaining = pool.filter(
      (w) => w.word !== answer.word && !distractors.some((d) => d.word === w.word)
    );
    const needed = 3 - distractors.length;
    distractors = [...distractors, ...shuffle(remaining).slice(0, needed)];
  }

  return distractors.map((w) => w.word);
}

export function generateTest(levelGroup: '1-2' | '3-4' | '5-6'): Question[] {
  const data = vocaData as VocaData;
  const [l1, l2] = levelGroup.split('-').map(Number);

  // Collect all valid words with metadata
  const allWords: Word[] = [];
  for (const lv of [l1, l2]) {
    const levelData = data[String(lv)];
    if (!levelData) continue;
    for (const unitKey of Object.keys(levelData)) {
      const unit = Number(unitKey);
      for (const entry of levelData[unitKey]) {
        if (entry.valid) {
          allWords.push({ ...entry, level: lv, unit });
        }
      }
    }
  }

  // Per unit: pick 2 random valid words
  const selectedWords: Word[] = [];
  for (const lv of [l1, l2]) {
    const levelData = data[String(lv)];
    if (!levelData) continue;
    for (const unitKey of Object.keys(levelData)) {
      const unit = Number(unitKey);
      const validWords = levelData[unitKey]
        .filter((e) => e.valid)
        .map((e) => ({ ...e, level: lv, unit }));
      const picked = shuffle(validWords).slice(0, 2);
      selectedWords.push(...picked);
    }
  }

  // Build questions
  const questions: Question[] = selectedWords.map((word, i) => {
    const sentence = blankSentence(word.sentence_en, word.word);
    const distractors = generateDistractors(word, allWords);
    const options = shuffle([word.word, ...distractors]);
    const answerIndex = options.indexOf(word.word);

    return {
      id: i + 1,
      level: word.level,
      unit: word.unit,
      word: word.word,
      meaning: word.meaning,
      sentence,
      translation: word.sentence_ko,
      options,
      answerIndex,
    };
  });

  // Shuffle all 120
  const shuffled = shuffle(questions);
  return shuffled.map((q, i) => ({ ...q, id: i + 1 }));
}
