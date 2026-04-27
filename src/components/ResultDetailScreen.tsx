import { useState, useMemo } from 'react';
import { ArrowLeft, Check, X, Volume2, ArrowRight } from 'lucide-react';
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

interface Entry {
  q: Question;
  i: number;
  userIdx: number | null;
  isAnswered: boolean;
  isCorrect: boolean;
}

function ChoiceList({ q, userIdx }: { q: Question; userIdx: number | null }) {
  return (
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
  );
}

function SentenceCard({ q }: { q: Question }) {
  return (
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
          onClick={() => playTTS(q.sentence.replace('--------', q.word))}
          className="shrink-0 bg-sb-surface text-sb-primary-dark p-1.5 rounded-lg shadow-[0_0_0_1px_#A8E6E8]"
          title="발음 듣기"
        >
          <Volume2 size={16} />
        </button>
      </div>
      <p className="mt-2 mb-0 text-xs text-sb-ink-mid">{q.translation}</p>
    </div>
  );
}

function FilterChip({ active, tone, label, count, onClick }: {
  active: boolean;
  tone?: 'wrong' | 'correct';
  label: string;
  count: number;
  onClick: () => void;
}) {
  const activeCls = active
    ? tone === 'wrong'
      ? 'bg-sb-wrong-pale border-sb-wrong text-sb-wrong-dark'
      : tone === 'correct'
      ? 'bg-sb-correct-pale border-sb-correct text-sb-correct-dark'
      : 'bg-sb-ink border-sb-ink text-white'
    : 'bg-sb-surface border-sb-line text-sb-muted';

  const countCls = active
    ? tone === 'wrong'
      ? 'bg-sb-wrong text-white'
      : tone === 'correct'
      ? 'bg-sb-correct text-white'
      : 'bg-white/20 text-white'
    : 'bg-sb-line-soft text-sb-muted';

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${activeCls}`}
    >
      <span>{label}</span>
      <span className={`text-[11px] font-bold px-1.5 py-px rounded-full ${countCls}`}>{count}</span>
    </button>
  );
}

function DesktopDetailPanel({ entry, onNextWrong }: { entry: Entry; onNextWrong: () => void }) {
  const { q, userIdx, isCorrect, isAnswered } = entry;
  const statusColor = isCorrect ? 'bg-sb-correct' : !isAnswered ? 'bg-sb-muted-softer' : 'bg-sb-wrong';
  return (
    <div className="rounded-2xl bg-sb-surface border border-sb-line p-7 lg:p-9">
      <div className="flex items-start gap-3 mb-6">
        <div className={`w-1 h-14 rounded-[2px] ${statusColor} shrink-0 mt-1`} />
        <div className="flex-1">
          <div className="text-xs text-sb-muted font-bold tabular-nums mb-1">
            Q{String(q.id).padStart(2, '0')} · LV {q.level} · Unit {q.unit}
          </div>
          <div className="text-3xl lg:text-4xl font-extrabold text-sb-ink tracking-tight">{q.word}</div>
          <div className="text-base text-sb-muted mt-1">{q.meaning}</div>
        </div>
        <button
          onClick={() => playTTS(q.word)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sb-primary-pale text-sb-primary-dark text-xs font-bold shrink-0"
        >
          <Volume2 size={14} />
        </button>
      </div>

      <SentenceCard q={q} />
      <ChoiceList q={q} userIdx={userIdx} />

      {!isAnswered && (
        <div className="mt-3 text-xs text-sb-muted bg-sb-surface-alt px-3 py-2.5 rounded-xl">
          이 문제는 답을 선택하지 않아 오답 처리됐어요.
        </div>
      )}

      {!isCorrect && (
        <button
          onClick={onNextWrong}
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg
                     bg-sb-wrong-pale text-sb-wrong-dark border border-sb-wrong-light text-sm font-bold"
        >
          다음 오답으로 <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

export default function ResultDetailScreen({
  questions, answers, studentName, levelGroup, onBack,
}: Props) {
  const [filter, setFilter] = useState<FilterKind>('wrong');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(() => {
    const first = questions.findIndex((q, i) => {
      const u = answers[i];
      return u === null || u !== q.answerIndex;
    });
    return first >= 0 ? first : 0;
  });

  const entries: Entry[] = useMemo(() => questions.map((q, i) => {
    const userIdx = answers[i];
    const isAnswered = userIdx !== null;
    const isCorrect = isAnswered && userIdx === q.answerIndex;
    return { q, i, userIdx, isAnswered, isCorrect };
  }), [questions, answers]);

  const total = entries.length;
  const correctCount = entries.filter(e => e.isCorrect).length;
  const wrongCount = total - correctCount;
  const score = Math.round((correctCount / total) * 100);

  // Mobile/tablet filter
  const filtered = entries.filter(e => {
    if (filter === 'wrong') return !e.isCorrect;
    if (filter === 'correct') return e.isCorrect;
    return true;
  });

  // Desktop filter
  const desktopFiltered = onlyWrong ? entries.filter(e => !e.isCorrect) : entries;
  const selectedEntry = selectedIdx !== null ? entries[selectedIdx] ?? null : null;

  const goNextWrong = () => {
    const next = entries.findIndex((e, i) => i > (selectedIdx ?? -1) && !e.isCorrect);
    setSelectedIdx(next >= 0 ? next : null);
  };

  const tabs: { id: FilterKind; label: string; count: number; on: string }[] = [
    { id: 'wrong', label: '오답만', count: wrongCount, on: 'bg-sb-wrong-pale text-sb-wrong-dark border-[#F4C9C4]' },
    { id: 'all', label: '전체', count: total, on: 'bg-sb-primary-pale text-sb-primary-dark border-sb-primary-light' },
    { id: 'correct', label: '정답', count: correctCount, on: 'bg-sb-correct-pale text-sb-correct-dark border-[#C1E3D4]' },
  ];

  return (
    <div className="min-h-screen bg-sb-bg flex flex-col">

      {/* Mobile header — 2 rows */}
      <header className="md:hidden sticky top-0 z-10 bg-sb-bg border-b border-sb-line">
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
          <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sb-surface-alt text-sb-muted">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight text-sb-ink">문제별 리뷰</div>
            <div className="text-[11px] text-sb-muted mt-px">{studentName} · LV {levelGroup} · {total}문제</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold text-sb-primary-dark leading-none tabular-nums">
              {score}<span className="text-xs">%</span>
            </div>
            <div className="text-[10px] text-sb-muted mt-px tabular-nums">{correctCount}/{total}</div>
          </div>
        </div>
        <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={filter === 'wrong'} tone="wrong" label="오답" count={wrongCount} onClick={() => setFilter('wrong')} />
          <FilterChip active={filter === 'all'} label="전체" count={total} onClick={() => setFilter('all')} />
          <FilterChip active={filter === 'correct'} tone="correct" label="정답" count={correctCount} onClick={() => setFilter('correct')} />
        </div>
      </header>

      {/* Tablet+ header */}
      <header className="hidden md:flex bg-sb-surface border-b border-sb-line h-14 px-5 items-center gap-2.5 shrink-0">
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

      {/* Tablet-only sub header */}
      <div className="hidden md:block lg:hidden bg-sb-surface border-b border-sb-line px-5 pt-3.5 pb-3">
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

      {/* Mobile/tablet accordion list */}
      <div className="lg:hidden flex-1 overflow-y-auto px-5 py-4">
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
                isOpen ? 'border border-sb-primary-light shadow-[0_0_0_3px_#F3FCFD]' : 'border border-sb-line'
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
              </button>

              {isOpen && (
                <div className="px-4 pt-3 pb-4 border-t border-sb-line-soft">
                  <SentenceCard q={q} />
                  <ChoiceList q={q} userIdx={userIdx} />
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

      {/* Desktop 2-pane */}
      <div className="hidden lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:px-10 lg:py-8 flex-1 min-h-0">
        {/* Left list */}
        <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto rounded-2xl bg-sb-surface border border-sb-line p-3 self-start">
          {/* Filter toggle header */}
          <div className="flex items-center gap-2 px-2 py-2 border-b border-sb-line-soft mb-2">
            <button
              onClick={() => setOnlyWrong(v => !v)}
              className={[
                "px-2.5 py-1 rounded-md text-xs font-bold border transition-colors",
                onlyWrong
                  ? "bg-sb-wrong-pale text-sb-wrong-dark border-sb-wrong-light"
                  : "bg-sb-surface text-sb-muted border-sb-line",
              ].join(" ")}
            >
              오답만 ({wrongCount})
            </button>
            <div className="ml-auto text-[11px] text-sb-muted">{desktopFiltered.length}개 표시</div>
          </div>

          {desktopFiltered.map(entry => {
            const { q, i, isCorrect, isAnswered } = entry;
            const statusColor = isCorrect ? 'bg-sb-correct' : !isAnswered ? 'bg-sb-muted-softer' : 'bg-sb-wrong';
            const isSelected = selectedIdx === i;
            return (
              <button
                key={q.id}
                onClick={() => setSelectedIdx(i)}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  isSelected ? "bg-sb-primary-pale border border-sb-primary-light" : "hover:bg-sb-surface-alt border border-transparent",
                ].join(" ")}
              >
                <div className={`w-[3px] h-8 rounded-[2px] ${statusColor} shrink-0`} />
                <div className="text-[10px] font-bold text-sb-muted-soft w-7 tabular-nums">
                  Q{String(q.id).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isSelected ? 'text-sb-primary-dark' : 'text-sb-ink'}`}>{q.word}</div>
                  <div className="text-xs text-sb-muted truncate">{q.meaning}</div>
                </div>
              </button>
            );
          })}

          {desktopFiltered.length === 0 && (
            <div className="text-center text-sb-muted-soft py-8 text-sm">해당 항목 없음</div>
          )}
        </aside>

        {/* Right detail */}
        <section className="overflow-y-auto">
          {selectedEntry ? (
            <DesktopDetailPanel entry={selectedEntry} onNextWrong={goNextWrong} />
          ) : (
            <div className="flex items-center justify-center h-64 text-sb-muted-soft text-sm rounded-2xl bg-sb-surface border border-sb-line">
              좌측에서 문제를 선택하세요
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
