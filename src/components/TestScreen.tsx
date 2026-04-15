import { useState, useCallback } from 'react';
import type { Question } from '../lib/testGenerator';

interface Props {
  questions: Question[];
  studentName: string;
  levelGroup: '1-2' | '3-4' | '5-6';
  onFinish: (answers: (number | null)[]) => void;
}

export default function TestScreen({ questions, studentName, levelGroup, onFinish }: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [animating, setAnimating] = useState(false);

  const total = questions.length;
  const q = questions[current];
  const answered = answers.filter((a) => a !== null).length;
  const progress = ((current + 1) / total) * 100;

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < total) setCurrent(idx);
  }, [total]);

  const selectAnswer = (optionIdx: number) => {
    if (animating) return;
    const newAnswers = [...answers];
    newAnswers[current] = optionIdx;
    setAnswers(newAnswers);

    if (current < total - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((c) => c + 1);
        setAnimating(false);
      }, 300);
    }
  };

  const isLastQuestion = current === total - 1;
  const selectedAnswer = answers[current];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm px-6 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-600">
              TES VOCA LV {levelGroup}
            </span>
            <span className="text-sm text-slate-500">
              <span className="font-bold text-slate-700">{current + 1}</span> / {total}
              <span className="ml-3 text-emerald-600 font-medium">✓ {answered}</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Question Number */}
          <div className="text-sm font-semibold text-indigo-500 mb-3">Q{current + 1}</div>

          {/* Sentence */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-6 mb-8">
            <p className="text-xl font-medium text-slate-800 leading-relaxed mb-2">
              {q.sentence}
            </p>
            <p className="text-base text-slate-500">{q.translation}</p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {q.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === q.answerIndex;

              let btnClass =
                'w-full min-h-[64px] px-4 py-4 rounded-2xl border-2 text-left font-semibold text-base transition-all duration-200 active:scale-[0.97] ';

              if (isSelected && animating) {
                // Show feedback during animation
                btnClass += isCorrect
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'bg-red-50 border-red-400 text-red-700';
              } else if (isSelected) {
                btnClass += 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm';
              } else {
                btnClass += 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer';
              }

              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  className={btnClass}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← 이전
            </button>

            <span className="text-xs text-slate-400">※ 제한시간 없음</span>

            {isLastQuestion ? (
              <button
                onClick={() => onFinish(answers)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-md"
              >
                제출하기 ✓
              </button>
            ) : (
              <button
                onClick={() => goTo(current + 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:border-slate-300 hover:bg-slate-100 transition-all"
              >
                다음 →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Student name bottom */}
      <div className="text-center pb-4 text-xs text-slate-400">{studentName}</div>
    </div>
  );
}
