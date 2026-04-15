import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { getTestResult, type TestResultRow } from '../lib/supabase';
// unit_title은 levelGroup("1-2" 등)을 저장한 필드

interface Props {
  reportId: string;
}

export default function SharedReport({ reportId }: Props) {
  const [result, setResult] = useState<TestResultRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWrongList, setShowWrongList] = useState(true);
  const [showCorrectList, setShowCorrectList] = useState(false);

  useEffect(() => {
    getTestResult(reportId).then(data => {
      setResult(data);
      setLoading(false);
    });
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p className="text-sm">성적표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-center px-8">
          <AlertCircle size={40} className="text-red-400" />
          <p className="font-bold text-slate-600">링크를 찾을 수 없습니다</p>
          <p className="text-sm">만료되었거나 잘못된 링크입니다.</p>
        </div>
      </div>
    );
  }

  const correct = result.correct_answers ?? [];
  const wrong = result.incorrect_answers ?? [];
  const total = result.total_questions;
  const score = result.score;
  const createdAt = result.created_at
    ? new Date(result.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 h-14 flex items-center shrink-0 sticky top-0 z-10">
        <h1 className="font-bold text-slate-800 truncate">성적표</h1>
      </header>

      <div className="p-4 flex-1 pb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">

          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div>
              <p className="text-lg font-extrabold text-indigo-600">TES VOCA</p>
              <p className="text-xs text-slate-400">종합테스트</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">TES 영어학원</p>
              <p className="text-sm text-slate-700">{result.book_title}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-800 mb-1">
            {result.user_name} 학생의 종합테스트 성적표
          </h2>
          <p className="text-sm text-slate-400 mb-4">{result.book_title} · {total}문제</p>

          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-5 mb-4 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="relative z-10">
              <p className="text-indigo-100 text-sm font-medium mb-1">종합 정답률</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold">{score}</span>
                <span className="text-2xl font-bold mb-1">%</span>
              </div>
              <p className="text-indigo-200 text-sm mt-2">
                총 {total}문제 중 {correct.length}문제 정답
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="bg-emerald-500 p-3 flex items-center gap-2 text-white">
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">단어</span>
              <span className="text-sm font-medium">{result.book_title}</span>
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
                  <div className="w-1/4 p-2.5 text-center font-bold text-emerald-600">{correct.length}</div>
                  <div className="w-1/4 p-2.5 text-center font-bold text-red-500">{wrong.length}</div>
                </div>
              </div>
            </div>
          </div>

          {wrong.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <button
                onClick={() => setShowWrongList(!showWrongList)}
                className="w-full bg-slate-50 p-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="font-bold text-slate-700 text-sm">오답 목록</span>
                  <span className="text-xs text-red-500">{wrong.length}개</span>
                </div>
                {showWrongList ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>
              {showWrongList && (
                <div className="p-4 bg-white space-y-2">
                  {wrong.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-red-50 p-3 rounded-lg">
                      <X size={14} className="text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-700 truncate">{w.word}</div>
                        <div className="text-xs text-slate-400">{w.meaning}</div>
                        <div className="text-xs text-slate-300 italic mt-0.5">{w.sentence}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs shrink-0">
                        <span className="text-red-400 line-through">{w.userAnswer}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-emerald-600 font-bold">{w.word}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {correct.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowCorrectList(!showCorrectList)}
                className="w-full bg-slate-50 p-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  <span className="font-bold text-slate-700 text-sm">정답 목록</span>
                  <span className="text-xs text-emerald-500">{correct.length}개</span>
                </div>
                {showCorrectList ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>
              {showCorrectList && (
                <div className="p-4 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {correct.map((c, i) => (
                      <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        {c.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">{createdAt}</p>
      </div>
    </div>
  );
}
