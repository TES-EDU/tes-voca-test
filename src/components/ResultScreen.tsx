import { useState, useMemo, useEffect, useRef } from 'react';
import { Share2, Copy, Check, AlertCircle, Loader2, Home, FileText, ArrowRight } from 'lucide-react';
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

  // 결과 화면 진입 시 자동 저장
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
    // 아직 자동 저장이 완료되지 않은 경우 잠시 대기
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

  return (
    <div className="min-h-screen bg-sb-bg flex flex-col">
      <header className="bg-sb-surface border-b border-sb-line h-14 px-5 flex items-center gap-2.5 shrink-0">
        <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-[11px] font-extrabold -tracking-tight">T</div>
        <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
        <div className="w-px h-3 bg-sb-line" />
        <span className="text-xs text-sb-muted font-medium">· 성적표</span>
      </header>

      <div className="p-5 flex-1 pb-8 max-w-xl w-full mx-auto">
        {/* Score card */}
        <div className="bg-sb-surface border border-sb-line rounded-2xl p-5 mb-3.5">
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

          <div className="grid grid-cols-3 gap-2">
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

        {/* Review Detail CTA */}
        <button
          onClick={onReviewDetail}
          className="w-full bg-sb-surface border border-sb-line rounded-2xl p-4 mb-3.5 flex items-center gap-3 hover:border-sb-primary-light hover:bg-sb-primary-paler transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-sb-primary-pale flex items-center justify-center shrink-0">
            <FileText size={18} className="text-sb-primary-dark" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-extrabold text-sb-ink">문제별 리뷰 보기</div>
            <div className="text-[11px] text-sb-muted">오답만 보기 · 발음 듣기 · 내 선택 vs 정답</div>
          </div>
          <ArrowRight size={18} className="text-sb-muted-soft" />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          disabled={shareState === 'saving'}
          className="w-full bg-sb-surface border-[1.5px] border-sb-primary-light text-sb-primary-dark py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 hover:bg-sb-primary-pale transition-colors mb-2 disabled:opacity-60"
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

        {/* Restart */}
        <button
          onClick={onRestart}
          className="w-full bg-sb-primary-dark text-white py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(27,122,132,0.2)]"
        >
          <Home size={18} /> 처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}
