import { useState, useMemo } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Check, X, Volume2 } from 'lucide-react';
import type { Question } from '../lib/testGenerator';
import { playTTS } from '../lib/sunbeam';

interface Props {
  questions: Question[];
  answers: (number | null)[];
  studentName: string;
  levelGroup: '1-2' | '3-4' | '5-6';
  onBack: () => void;
}

type FilterKind = 'wrong' | 'all' | 'correct';

export default function ResultDetailScreen({
  questions, answers, studentName, levelGroup, onBack,
}: Props) {
  const [filter, setFilter] = useState<FilterKind>('wrong');
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const entries = useMemo(() => questions.map((q, i) => {
    const userIdx = answers[i];
    const isAnswered = userIdx !== null;
    const isCorrect = isAnswered && userIdx === q.answerIndex;
    return { q, i, userIdx, isAnswered, isCorrect };
  }), [questions, answers]);

  const total = entries.length;
  const correctCount = entries.filter(e => e.isCorrect).length;
  const wrongCount = total - correctCount;
  const score = Math.round((correctCount / total) * 100);

  const filtered = entries.filter(e => {
    if (filter === 'wrong') return !e.isCorrect;
    if (filter === 'correct') return e.isCorrect;
    return true;
  });

  const tabs: { id: FilterKind; label: string; count: number; on: string }[] = [
    { id: 'wrong', label: '오답만', count: wrongCount, on: 'bg-sb-wrong-pale text-sb-wrong-dark border-[#F4C9C4]' },
    { id: 'all', label: '전체', count: total, on: 'bg-sb-primary-pale text-sb-primary-dark border-sb-primary-light' },
    { id: 'correct', label: '정답', count: correctCount, on: 'bg-sb-correct-pale text-sb-correct-dark border-[#C1E3D4]' },
  ];

  return (
    <div className="min-h-screen bg-sb-bg flex flex-col">
      <header className="bg-sb-surface border-b border-sb-line h-14 px-5 flex items-center gap-2.5 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-sb-muted rounded-lg hover:bg-sb-surface-alt">
          <ArrowLeft size={20} />
        </button>
        <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-[11px] font-extrabold -tracking-tight">T</div>
        <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
        <div className="w-px h-3 bg-sb-line" />
        <span className="text-xs text-sb-muted font-medium">· 문제별 리뷰</span>
        <div className="ml-auto text-right">
          <div className="text-lg font-extrabold text-sb-primary-dark -tracking-tight leading-none tabular-nums">
            {score}<span className="text-xs">%</span>
          </div>
          <div className="text-[10px] text-sb-muted font-semibold mt-0.5">{correctCount}/{total}</div>
        </div>
      </header>

      {/* Sub: student info + filter */}
      <div className="bg-sb-surface border-b border-sb-line px-5 pt-3.5 pb-3">
        <div className="text-[11px] font-bold text-sb-muted tracking-wider mb-1">
          {studentName} · TES VOCA LV {levelGroup} · {new Date().toLocaleDateString('ko-KR')}
        </div>
        <div className="flex gap-1.5 mt-2.5">
          {tabs.map(t => {
            const on = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-3.5 py-[7px] rounded-full text-[13px] font-bold border-[1.5px] flex items-center gap-1.5 transition-colors ${
                  on ? t.on : 'bg-sb-surface border-sb-line text-sb-muted hover:border-sb-muted-soft'
                }`}
              >
                {t.label}
                <span className="font-extrabold tabular-nums">{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.map(({ q, i, userIdx, isAnswered, isCorrect }) => {
          const isOpen = openIdx === i;
          const statusColor = isCorrect ? 'bg-sb-correct' : !isAnswered ? 'bg-sb-muted-softer' : 'bg-sb-wrong';
          const statusLabel = isCorrect ? '정답' : !isAnswered ? '미답변' : '오답';
          const statusChip = isCorrect
            ? 'bg-sb-correct-pale text-sb-correct-dark'
            : !isAnswered
            ? 'bg-sb-surface-alt text-sb-muted'
            : 'bg-sb-wrong-pale text-sb-wrong-dark';

          return (
            <div
              key={q.id}
              className={`bg-sb-surface rounded-2xl mb-2.5 overflow-hidden transition-all duration-150 ${
                isOpen
                  ? 'border border-sb-primary-light shadow-[0_0_0_3px_#F3FCFD]'
                  : 'border border-sb-line'
              }`}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className={`w-[3px] h-9 rounded-[2px] ${statusColor}`} />
                <div className="text-[11px] font-bold text-sb-muted-soft w-8 tabular-nums tracking-wide">
                  Q{String(q.id).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-sb-ink -tracking-[0.01em] truncate">{q.word}</div>
                  <div className="text-xs text-sb-muted mt-px">{q.meaning}</div>
                </div>
                <span className={`text-[11px] font-extrabold px-[9px] py-1 rounded-full tracking-wide ${statusChip}`}>
                  {statusLabel}
                </span>
                <span className="text-sb-muted-soft">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pt-3 pb-4 border-t border-sb-line-soft">
                  <div className="bg-sb-primary-paler border border-sb-primary-pale rounded-xl p-3.5 mb-3">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 m-0 text-[15px] leading-relaxed text-sb-ink font-medium">
                        {q.sentence.replace('--------', `[${q.word}]`).split(`[${q.word}]`).map((part, pi, arr) => (
                          <span key={pi}>
                            {part}
                            {pi < arr.length - 1 && (
                              <span className="font-extrabold text-sb-primary-dark border-b-2 border-sb-primary pb-px">
                                {q.word}
                              </span>
                            )}
                          </span>
                        ))}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playTTS(q.sentence.replace('--------', q.word));
                        }}
                        className="shrink-0 bg-sb-surface text-sb-primary-dark p-1.5 rounded-lg shadow-[0_0_0_1px_#A8E6E8]"
                        title="발음 듣기"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <p className="mt-2 mb-0 text-xs text-sb-ink-mid">{q.translation}</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, oi) => {
                      const isUser = oi === userIdx;
                      const isAns = oi === q.answerIndex;
                      let wrap = 'bg-sb-surface border-sb-line';
                      let num = 'bg-sb-surface-alt text-sb-muted';
                      let textColor = 'text-sb-ink';
                      let icon: React.ReactNode = null;
                      let tag: React.ReactNode = null;

                      if (isAns) {
                        wrap = 'bg-sb-correct-pale border-[#BFE3D1]';
                        num = 'bg-sb-correct text-white';
                        textColor = 'text-sb-correct-dark';
                        icon = <Check size={16} className="text-sb-correct-dark" />;
                        tag = <span className="text-[10px] font-extrabold text-sb-correct-dark bg-white px-1.5 py-0.5 rounded">정답</span>;
                      } else if (isUser) {
                        wrap = 'bg-sb-wrong-pale border-[#F1BFB9]';
                        num = 'bg-sb-wrong text-white';
                        textColor = 'text-sb-wrong-dark';
                        icon = <X size={16} className="text-sb-wrong-dark" />;
                        tag = <span className="text-[10px] font-extrabold text-sb-wrong-dark bg-white px-1.5 py-0.5 rounded">내 선택</span>;
                      }

                      return (
                        <div key={oi} className={`flex items-center gap-2.5 px-3 py-2.5 border-[1.5px] rounded-xl ${wrap}`}>
                          <span className={`w-[22px] h-[22px] rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 ${num}`}>
                            {oi + 1}
                          </span>
                          <span className={`flex-1 text-sm font-bold ${textColor}`}>{opt}</span>
                          {icon}
                          {tag}
                        </div>
                      );
                    })}
                  </div>

                  {!isAnswered && (
                    <div className="mt-2.5 text-xs text-sb-muted bg-sb-surface-alt px-3 py-2.5 rounded-xl">
                      이 문제는 답을 선택하지 않아 오답 처리됐어요.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-sb-muted-soft py-16 text-sm">해당하는 문제가 없어요.</div>
        )}
      </div>
    </div>
  );
}
