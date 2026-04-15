import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Check, AlertCircle, Share2, Copy, Loader2 } from 'lucide-react';
import type { Question } from '../lib/testGenerator';
import { saveTestResult } from '../lib/supabase';

interface Props {
  questions: Question[];
  answers: (number | null)[];
  studentName: string;
  levelGroup: '1-2' | '3-4' | '5-6';
  onRestart: () => void;
}

export default function ResultScreen({ questions, answers, studentName, levelGroup, onRestart }: Props) {
  const [showWrongList, setShowWrongList] = useState(true);
  const [showCorrectList, setShowCorrectList] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'saving' | 'copied' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const total = questions.length;
  const bookTitle = `TES VOCA LV ${levelGroup}`;

  const { correctResults, wrongResults, score } = useMemo(() => {
    const correct: { word: string; meaning: string }[] = [];
    const wrong: {
      word: string;
      meaning: string;
      userAnswer: string;
      sentence: string;
    }[] = [];

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

  const handleShare = async () => {
    if (shareState === 'saving') return;

    // 이미 저장된 URL이 있으면 바로 복사
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2000);
      return;
    }

    setShareState('saving');

    const id = await saveTestResult({
      user_name: studentName,
      book_title: `TES VOCA LV ${levelGroup}`,
      unit_title: levelGroup,
      total_questions: total,
      score,
      time_taken: 0,
      correct_answers: correctResults,
      incorrect_answers: wrongResults.map(w => ({
        word: w.word,
        meaning: w.meaning,
        userAnswer: w.userAnswer,
        correctAnswer: w.word,
        sentence: w.sentence,
      })),
    });

    if (!id) {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 2000);
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}?report=${id}`;
    setShareUrl(url);
    await navigator.clipboard.writeText(url);
    setShareState('copied');
    setTimeout(() => setShareState('idle'), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 h-14 flex items-center gap-4 shrink-0 sticky top-0 z-10">
        <h1 className="font-bold text-slate-800 truncate">성적표</h1>
      </header>

      <div className="p-4 flex-1 pb-8">
        {/* Report Card Container */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">

          {/* Header with Logo area */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div>
              <p className="text-lg font-extrabold text-indigo-600">TES VOCA</p>
              <p className="text-xs text-slate-400">종합테스트</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">TES 영어학원</p>
              <p className="text-sm text-slate-700">{bookTitle}</p>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            {studentName} 학생의 종합테스트 성적표
          </h2>
          <p className="text-sm text-slate-400 mb-4">{bookTitle} · 120문제</p>

          {/* Score Display */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-5 mb-4 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="relative z-10">
              <p className="text-indigo-100 text-sm font-medium mb-1">종합 정답률</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold">{score}</span>
                <span className="text-2xl font-bold mb-1">%</span>
              </div>
              <p className="text-indigo-200 text-sm mt-2">
                총 {total}문제 중 {correctResults.length}문제 정답
              </p>
            </div>
          </div>

          {/* Stats Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="bg-emerald-500 p-3 flex items-center gap-2 text-white">
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">단어</span>
              <span className="text-sm font-medium">{bookTitle}</span>
            </div>

            <div className="p-4 bg-white">
              <div className="rounded-lg border border-slate-100 overflow-hidden text-sm">
                <div className="flex bg-slate-50 border-b border-slate-100">
                  <div className="w-1/4 p-2.5 text-slate-500 font-bold text-center">구분</div>
                  <div className="w-1/4 p-2.5 text-slate-500 font-medium text-center">문제</div>
                  <div className="w-1/4 p-2.5 text-slate-500 font-medium text-center">정답</div>
                  <div className="w-1/4 p-2.5 text-slate-500 font-medium text-center">오답</div>
                </div>
                <div className="flex bg-indigo-50">
                  <div className="w-1/4 p-2.5 text-indigo-700 font-bold text-center">합계</div>
                  <div className="w-1/4 p-2.5 text-center font-bold text-indigo-600">{total}</div>
                  <div className="w-1/4 p-2.5 text-center font-bold text-emerald-600">{correctResults.length}</div>
                  <div className="w-1/4 p-2.5 text-center font-bold text-red-500">{wrongResults.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Wrong Answers List - Collapsible */}
          {wrongResults.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <button
                onClick={() => setShowWrongList(!showWrongList)}
                className="w-full bg-slate-50 p-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="font-bold text-slate-700 text-sm">오답 목록</span>
                  <span className="text-xs text-red-500">{wrongResults.length}개</span>
                </div>
                {showWrongList
                  ? <ChevronUp size={18} className="text-slate-400" />
                  : <ChevronDown size={18} className="text-slate-400" />
                }
              </button>

              {showWrongList && (
                <div className="p-4 bg-white space-y-2">
                  {wrongResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm bg-red-50 p-3 rounded-lg">
                      <X size={14} className="text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-700 truncate">{result.word}</div>
                        <div className="text-xs text-slate-400">{result.meaning}</div>
                        <div className="text-xs text-slate-300 italic mt-0.5">{result.sentence}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs shrink-0">
                        <span className="text-red-400 line-through">{result.userAnswer}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-emerald-600 font-bold">{result.word}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Correct Answers - Collapsible */}
          {correctResults.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowCorrectList(!showCorrectList)}
                className="w-full bg-slate-50 p-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  <span className="font-bold text-slate-700 text-sm">정답 목록</span>
                  <span className="text-xs text-emerald-500">{correctResults.length}개</span>
                </div>
                {showCorrectList
                  ? <ChevronUp size={18} className="text-slate-400" />
                  : <ChevronDown size={18} className="text-slate-400" />
                }
              </button>

              {showCorrectList && (
                <div className="p-4 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {correctResults.map((result, index) => (
                      <span key={index} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        {result.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          disabled={shareState === 'saving'}
          className="w-full bg-white border-2 border-indigo-200 hover:border-indigo-400 text-indigo-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mb-3 disabled:opacity-60"
        >
          {shareState === 'saving' && <Loader2 size={18} className="animate-spin" />}
          {shareState === 'copied' && <Check size={18} />}
          {shareState === 'error' && <AlertCircle size={18} className="text-red-500" />}
          {(shareState === 'idle' || shareState === 'saving') && shareState !== 'saving' && <Share2 size={18} />}
          {shareState === 'saving' && '저장 중...'}
          {shareState === 'copied' && '링크 복사됨!'}
          {shareState === 'error' && '저장 실패. 다시 시도해주세요'}
          {shareState === 'idle' && (shareUrl ? '링크 다시 복사' : '성적표 공유하기')}
        </button>

        {shareUrl && (
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-3 mb-3 text-xs text-slate-500 break-all">
            <Copy size={14} className="shrink-0 text-slate-400" />
            <span className="flex-1">{shareUrl}</span>
          </div>
        )}

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
        >
          처음으로 돌아가기
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
