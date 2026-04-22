import { useState, useCallback, useEffect } from 'react';
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

  const total = questions.length;
  const q = questions[current];
  const answered = answers.filter((a) => a !== null).length;
  const progress = ((current + 1) / total) * 100;

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < total) setCurrent(idx);
  }, [total]);

  const selectAnswer = useCallback((optionIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optionIdx;
      return next;
    });
    if (current < total - 1) {
      setTimeout(() => setCurrent((c) => Math.min(c + 1, total - 1)), 300);
    }
  }, [current, total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        selectAnswer(parseInt(e.key) - 1);
      } else if (e.key === 'ArrowLeft') {
        goTo(current - 1);
      } else if (e.key === 'ArrowRight') {
        goTo(current + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, selectAnswer, goTo]);

  const selectedAnswer = answers[current];
  const isLastQuestion = current === total - 1;

  const kbdCls = "inline-block px-1.5 py-px mx-0.5 border border-sb-line rounded text-[10px] font-mono text-sb-ink-mid bg-sb-surface font-bold";

  return (
    <div className="min-h-screen bg-sb-bg flex flex-col">
      {/* Top crumbs */}
      <div className="h-11 px-8 border-b border-sb-line bg-sb-surface flex items-center justify-between text-[11px] font-bold tracking-wide shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark text-white text-[10px] font-extrabold flex items-center justify-center">T</div>
          <span className="text-sb-ink -tracking-tight">TES VOCA</span>
          <span className="text-sb-muted-soft">·</span>
          <span className="px-2 py-0.5 bg-sb-primary-pale text-sb-primary-dark rounded-full text-[10px] tracking-wider">
            LV {levelGroup.replace('-', '·')}
          </span>
          <span className="text-sb-muted font-medium tracking-normal">{studentName}</span>
        </div>
        <div className="text-sb-muted font-medium tracking-wide">
          <span className={kbdCls}>1</span>–<span className={kbdCls}>4</span> 선택
          <span className="mx-1.5 text-sb-line">|</span>
          <span className={kbdCls}>←</span> <span className={kbdCls}>→</span> 이동
        </div>
      </div>

      {/* Progress */}
      <div className="px-8 py-[10px] bg-sb-surface border-b border-sb-line">
        <div className="flex justify-between items-center text-[11px] text-sb-muted tabular-nums mb-1.5">
          <span>
            문제 <b className="text-sb-ink font-extrabold">{String(current + 1).padStart(2, '0')}</b>
            <span className="opacity-55"> / {String(total).padStart(2, '0')}</span>
            <span className="mx-2.5 text-sb-line">|</span>
            응답 <b className="text-sb-primary-dark font-extrabold">{answered}</b>
            <span className="opacity-55">/{total}</span>
          </span>
          <span className="font-bold text-sb-primary-dark">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-sb-line-soft rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sb-primary to-sb-primary-dark rounded-full transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Body: main + INDEX sidebar */}
      <div className="flex-1 grid grid-cols-[1fr_240px] min-h-0">
        {/* Main */}
        <div className="px-11 pt-9 pb-7 border-r border-sb-line flex flex-col overflow-auto">
          <div className="flex items-baseline gap-3.5 mb-1.5">
            <div className="text-[64px] font-extrabold text-sb-primary-dark -tracking-[0.05em] leading-none tabular-nums">
              Q{String(current + 1).padStart(2, '0')}
            </div>
            <div className="text-[13px] text-sb-muted font-semibold">/ {total}문제</div>
          </div>
          <div className="text-xl font-bold text-sb-ink -tracking-tight mb-6">
            빈칸에 알맞은 단어를 고르세요.
          </div>

          {/* Sentence card */}
          <div className="bg-sb-surface border border-sb-line rounded-2xl p-[26px_28px] mb-5 shadow-[0_1px_4px_rgba(27,122,132,0.06)]">
            <div className="text-2xl font-medium leading-[1.5] text-sb-ink -tracking-[0.015em] mb-2.5">
              {q.sentence.split('--------').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="inline-block min-w-[90px] h-6 border-b-[2.5px] border-sb-primary-dark mx-1.5 align-middle" />
                  )}
                </span>
              ))}
            </div>
            <div className="text-[13px] text-sb-muted leading-relaxed">{q.translation}</div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2.5">
            {q.options.map((opt, idx) => {
              const on = selectedAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  className={`min-h-[64px] pr-5 pl-4 rounded-xl text-left flex items-center gap-3.5 transition-all duration-150 text-base font-semibold ${
                    on
                      ? 'bg-sb-primary-dark border-[1.5px] border-sb-primary-dark text-white shadow-[0_4px_14px_rgba(27,122,132,0.22)]'
                      : 'bg-sb-surface border-[1.5px] border-sb-line text-sb-ink shadow-[0_1px_2px_rgba(27,122,132,0.04)] hover:border-sb-primary-light'
                  }`}
                >
                  <span
                    className={`w-[26px] h-[26px] rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums ${
                      on ? 'bg-white/20 text-white' : 'bg-sb-primary-pale text-sb-primary-dark'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="-tracking-[0.005em]">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Bottom nav */}
          <div className="flex justify-between items-center mt-7 pt-4 border-t border-sb-line-soft">
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="px-[18px] py-2.5 bg-sb-surface border-[1.5px] border-sb-line text-sb-ink-mid rounded-lg text-[13px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← 이전
            </button>
            <div className="text-[11px] text-sb-muted tracking-wide">
              선택하면 다음 문제로 이동합니다.
            </div>
            {isLastQuestion ? (
              <button
                onClick={() => onFinish(answers)}
                className="px-[22px] py-2.5 bg-sb-primary-dark text-white rounded-lg text-[13px] font-extrabold -tracking-[0.005em] shadow-[0_4px_12px_rgba(27,122,132,0.22)]"
              >
                제출하기 ✓
              </button>
            ) : (
              <button
                onClick={() => goTo(current + 1)}
                className="px-[22px] py-2.5 bg-sb-primary-dark text-white rounded-lg text-[13px] font-extrabold -tracking-[0.005em] shadow-[0_4px_12px_rgba(27,122,132,0.22)]"
              >
                다음 →
              </button>
            )}
          </div>
        </div>

        {/* INDEX sidebar */}
        <div className="p-[32px_22px] bg-sb-surface overflow-auto">
          <div className="text-[10px] text-sb-primary-dark tracking-[0.22em] font-extrabold mb-1">
            INDEX
          </div>
          <div className="text-[11px] text-sb-muted mb-4">{total}문제 · 번호 클릭 이동</div>

          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: total }).map((_, i) => {
              const isDone = answers[i] !== null;
              const isCur = i === current;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-8 rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                    isCur
                      ? 'bg-sb-primary-dark text-white ring-2 ring-sb-primary-light'
                      : isDone
                      ? 'bg-sb-primary-pale text-sb-primary-dark'
                      : 'bg-sb-surface-alt text-sb-muted-soft'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-sb-line-soft text-[11px] text-sb-muted leading-relaxed">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded bg-sb-primary-pale border border-sb-primary-light" />
              응답 완료
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-sb-surface-alt border border-sb-line" />
              미응답
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
