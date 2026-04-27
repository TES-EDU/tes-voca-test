import { useState, useMemo, useEffect, useRef } from 'react';
import { Share2, Copy, Check, AlertCircle, Loader2, Home, FileText, ArrowRight, ChevronRight } from 'lucide-react';
import type { Question } from '../lib/testGenerator';
import { saveTestResult } from '../lib/supabase';
import { scoreColor } from '../lib/sunbeam';

interface Props {
  questions: Question[];
  answers: (number | null)[];
  studentName: string;
  levelGroup: '1-2' | '3-4' | '5-6';
  onRestart: () => void;
  onReviewDetail: () => void;
}

function KPI({ label, value, unit, tone }: {
  label: string;
  value: number | string;
  unit?: string;
  tone: 'correct' | 'wrong' | 'primary' | 'muted';
}) {
  const colorMap = { correct: 'text-sb-correct-dark', wrong: 'text-sb-wrong-dark', primary: 'text-sb-primary-dark', muted: 'text-sb-muted' };
  const bgMap = { correct: 'bg-sb-correct-pale', wrong: 'bg-sb-wrong-pale', primary: 'bg-sb-primary-pale', muted: 'bg-sb-surface-alt' };
  return (
    <div className={`${bgMap[tone]} rounded-2xl p-4 text-center`}>
      <div className={`text-2xl font-extrabold tabular-nums leading-none ${colorMap[tone]}`}>
        {value}
        {unit && <span className="text-sm font-semibold ml-0.5">{unit}</span>}
      </div>
      <div className="text-xs text-sb-muted mt-1.5 font-semibold">{label}</div>
    </div>
  );
}

function WrongListSticky({ wrongs, onReviewDetail }: {
  wrongs: { word: string; meaning: string }[];
  onReviewDetail: () => void;
}) {
  return (
    <div className="lg:sticky lg:top-6 rounded-2xl bg-sb-surface border border-sb-line p-5 max-h-[calc(100vh-3rem)] overflow-y-auto">
      <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-4">
        {wrongs.length ? `오답 ${wrongs.length}개` : '오답 목록'}
      </div>
      {wrongs.length === 0 ? (
        <div className="text-center text-sb-muted py-8 text-sm">오답이 없습니다 🎉</div>
      ) : (
        <div className="space-y-2">
          {wrongs.map((e, i) => (
            <button
              key={i}
              onClick={onReviewDetail}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                         hover:bg-sb-wrong-pale border border-transparent hover:border-sb-wrong-light text-left transition-colors"
            >
              <div className="w-1 h-8 rounded-full bg-sb-wrong shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sb-ink truncate">{e.word}</div>
                <div className="text-xs text-sb-muted truncate">{e.meaning}</div>
              </div>
              <ChevronRight size={14} className="text-sb-muted-soft shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultScreen({
  questions, answers, studentName, levelGroup, onRestart, onReviewDetail,
}: Props) {
  const [shareState, setShareState] = useState<'idle' | 'saving' | 'copied' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const savedRef = useRef(false);
  const shareUrlRef = useRef<string | null>(null);

  const total = questions.length;
  const bookTitle = `TES VOCA LV ${levelGroup}`;

  const { correctResults, wrongResults, score } = useMemo(() => {
    const correct: { word: string; meaning: string }[] = [];
    const wrong: { word: string; meaning: string; userAnswer: string; sentence: string }[] = [];
    questions.forEach((q, i) => {
      const userAns = answers[i];
      if (userAns !== null && userAns === q.answerIndex) {
        correct.push({ word: q.word, meaning: q.meaning });
      } else {
        wrong.push({
          word: q.word,
          meaning: q.meaning,
          userAnswer: userAns !== null ? q.options[userAns] : '미답변',
          sentence: q.sentence,
        });
      }
    });
    return {
      correctResults: correct,
      wrongResults: wrong,
      score: Math.round((correct.length / total) * 100),
    };
  }, [questions, answers, total]);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    saveTestResult({
      user_name: studentName,
      book_title: bookTitle,
      unit_title: levelGroup,
      total_questions: total,
      score,
      time_taken: 0,
      correct_answers: correctResults,
      incorrect_answers: wrongResults.map(w => ({
        word: w.word, meaning: w.meaning, userAnswer: w.userAnswer,
        correctAnswer: w.word, sentence: w.sentence,
      })),
    }).then(id => {
      if (id) {
        const url = `${window.location.origin}${window.location.pathname}?report=${id}`;
        shareUrlRef.current = url;
        setShareUrl(url);
      }
    });
  }, []);

  const handleShare = async () => {
    if (shareState === 'saving') return;
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2000);
      return;
    }
    setShareState('saving');
    await new Promise(r => setTimeout(r, 800));
    const url = shareUrlRef.current;
    if (url) {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2000);
    } else {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 2000);
    }
  };

  const ctaButtons = (
    <>
      {/* 리뷰 버튼 */}
      <button
        onClick={onReviewDetail}
        className="w-full bg-sb-surface border border-sb-line rounded-2xl p-4 mb-3.5 flex items-center gap-3 hover:border-sb-primary-light hover:bg-sb-primary-paler transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-sb-primary-pale flex items-center justify-center shrink-0">
          <FileText size={18} className="text-sb-primary-dark" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-extrabold text-sb-ink">문제별 리뷰 보기</div>
          <div className="text-[11px] text-sb-muted">오답 · 발음 · 내 선택 vs 정답</div>
        </div>
        <ArrowRight size={18} className="text-sb-muted-soft" />
      </button>

      {/* 모바일: 공유 + 처음으로 그리드 */}
      <div className="md:hidden grid grid-cols-[1fr_1.2fr] gap-2 mb-2">
        <button
          onClick={handleShare}
          disabled={shareState === 'saving'}
          className="rounded-full bg-sb-surface border-[1.5px] border-sb-primary-light text-sb-primary-dark py-3.5 font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {shareState === 'saving' && <Loader2 size={16} className="animate-spin" />}
          {shareState === 'copied' && <Check size={16} />}
          {shareState === 'error' && <AlertCircle size={16} />}
          {shareState === 'idle' && <Share2 size={16} />}
          {shareState === 'saving' ? '저장 중' : shareState === 'copied' ? '복사됨' : shareState === 'error' ? '실패' : '공유'}
        </button>
        <button
          onClick={onRestart}
          className="rounded-full bg-sb-primary-dark text-white py-3.5 font-bold text-sm flex items-center justify-center gap-1.5 shadow-[0_6px_18px_rgba(27,122,132,0.28)]"
        >
          <Home size={16} /> 처음으로
        </button>
      </div>

      {/* 태블릿+: 기존 풀폭 버튼 */}
      <button
        onClick={handleShare}
        disabled={shareState === 'saving'}
        className="hidden md:flex w-full bg-sb-surface border-[1.5px] border-sb-primary-light text-sb-primary-dark py-4 rounded-2xl font-extrabold items-center justify-center gap-2 hover:bg-sb-primary-pale transition-colors mb-2 disabled:opacity-60"
      >
        {shareState === 'saving' && <Loader2 size={18} className="animate-spin" />}
        {shareState === 'copied' && <Check size={18} />}
        {shareState === 'error' && <AlertCircle size={18} className="text-sb-wrong" />}
        {shareState === 'idle' && <Share2 size={18} />}
        {shareState === 'saving' && '저장 중...'}
        {shareState === 'copied' && '링크 복사됨!'}
        {shareState === 'error' && '저장 실패. 다시 시도해주세요'}
        {shareState === 'idle' && (shareUrl ? '링크 다시 복사' : '성적표 공유하기')}
      </button>

      {shareUrl && (
        <div className="flex items-center gap-2 bg-sb-surface-alt rounded-xl px-4 py-3 mb-2 text-[11px] text-sb-muted break-all">
          <Copy size={14} className="shrink-0 text-sb-muted-soft" />
          <span className="flex-1">{shareUrl}</span>
        </div>
      )}

      <button
        onClick={onRestart}
        className="hidden md:flex w-full bg-sb-primary-dark text-white py-4 rounded-2xl font-extrabold items-center justify-center gap-2 shadow-[0_6px_16px_rgba(27,122,132,0.2)]"
      >
        <Home size={18} /> 처음으로 돌아가기
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-sb-bg flex flex-col">
      <header className="bg-sb-surface border-b border-sb-line h-14 px-5 flex items-center gap-2.5 shrink-0">
        <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-[11px] font-extrabold -tracking-tight">T</div>
        <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
        <div className="w-px h-3 bg-sb-line" />
        <span className="text-xs text-sb-muted font-medium">· 성적표</span>
      </header>

      <div className="flex-1 p-5 lg:px-10 lg:py-8 pb-8 max-w-xl lg:max-w-[1280px] w-full mx-auto">
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">

          {/* Main column */}
          <div>
            {/* 모바일 히어로 카드 */}
            <section className="md:hidden mb-3.5">
              <div className="rounded-3xl border border-sb-primary-light p-5 pb-4 shadow-sm bg-gradient-to-b from-sb-surface to-sb-primary-paler">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-sb-ink">{studentName} 학생</div>
                  <div className="text-[11px] text-sb-muted">{new Date().toLocaleDateString('ko-KR')}</div>
                </div>
                <div className="text-xs text-sb-muted mt-0.5">{bookTitle} · {total}문제</div>

                <div className="text-center my-5">
                  <div className={`text-[72px] font-black leading-[0.95] tracking-[-0.04em] tabular-nums ${scoreColor(score)}`}>
                    {score}<span className="text-[32px] font-extrabold ml-0.5">%</span>
                  </div>
                  <div className="text-[13px] font-bold mt-2 text-sb-ink">종합 정답률</div>
                  <div className="text-[11px] text-sb-muted mt-0.5">{total}문제 중 {correctResults.length}문제 정답</div>
                </div>

                <div className="h-1.5 rounded-full bg-sb-line overflow-hidden mb-3.5">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${score}%`, background: score >= 70 ? '#2FA07E' : '#E35D4F' }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: correctResults.length, l: '정답', cls: 'text-sb-correct-dark' },
                    { v: wrongResults.length, l: '오답', cls: 'text-sb-wrong-dark' },
                    { v: total, l: '문제', cls: 'text-sb-ink' },
                  ].map(({ v, l, cls }) => (
                    <div key={l} className="bg-sb-surface rounded-xl border border-sb-line-soft py-2.5 text-center">
                      <div className={`text-[22px] font-extrabold leading-none tracking-tight tabular-nums ${cls}`}>{v}</div>
                      <div className="text-[11px] text-sb-muted mt-1">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 태블릿+ 스코어 카드 */}
            <div className="hidden md:block bg-sb-surface border border-sb-line rounded-2xl p-5 mb-3.5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-sb-line-soft">
                <div>
                  <div className="text-[11px] text-sb-muted font-bold tracking-wider">{studentName} 학생의 성적표</div>
                  <div className="text-sm text-sb-ink font-bold mt-0.5">{bookTitle} · {total}문제</div>
                </div>
                <div className="text-[11px] text-sb-muted">{new Date().toLocaleDateString('ko-KR')}</div>
              </div>

              <div className="flex items-end gap-4 mb-4">
                <div className={`text-[72px] font-extrabold -tracking-[0.04em] leading-none tabular-nums ${scoreColor(score)}`}>
                  {score}
                  <span className="text-3xl align-top">%</span>
                </div>
                <div className="pb-2">
                  <div className="text-sm text-sb-ink font-bold">종합 정답률</div>
                  <div className="text-[11px] text-sb-muted">총 {total}문제 중 {correctResults.length}문제 정답</div>
                </div>
              </div>

              {/* Mobile/tablet 3-tile */}
              <div className="grid grid-cols-3 gap-2 lg:hidden">
                <div className="bg-sb-primary-pale rounded-xl p-3 text-center">
                  <div className="text-[10px] text-sb-primary-dark font-bold tracking-wider mb-0.5">문제</div>
                  <div className="text-xl font-extrabold text-sb-primary-dark tabular-nums">{total}</div>
                </div>
                <div className="bg-sb-correct-pale rounded-xl p-3 text-center">
                  <div className="text-[10px] text-sb-correct-dark font-bold tracking-wider mb-0.5">정답</div>
                  <div className="text-xl font-extrabold text-sb-correct-dark tabular-nums">{correctResults.length}</div>
                </div>
                <div className="bg-sb-wrong-pale rounded-xl p-3 text-center">
                  <div className="text-[10px] text-sb-wrong-dark font-bold tracking-wider mb-0.5">오답</div>
                  <div className="text-xl font-extrabold text-sb-wrong-dark tabular-nums">{wrongResults.length}</div>
                </div>
              </div>
            </div>

            {/* Desktop KPI 4-tile */}
            <div className="hidden lg:grid grid-cols-4 gap-3 mb-3.5">
              <KPI label="정답" value={correctResults.length} unit="문제" tone="correct" />
              <KPI label="오답" value={wrongResults.length} unit="문제" tone="wrong" />
              <KPI label="정답률" value={`${score}%`} tone="primary" />
              <KPI label="전체 문제" value={total} unit="문제" tone="muted" />
            </div>

            {ctaButtons}
          </div>

          {/* Right column — desktop only */}
          <aside className="hidden lg:block">
            <WrongListSticky wrongs={wrongResults} onReviewDetail={onReviewDetail} />
          </aside>
        </div>
      </div>
    </div>
  );
}
