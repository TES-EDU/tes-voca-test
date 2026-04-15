import { useEffect, useState, useCallback } from 'react';
import { Copy, Check, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { getAllTestResults, type TestResultRow } from '../lib/supabase';
import TeacherLogin from './TeacherLogin';

const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  '1-2': { label: 'LV 1-2', color: 'bg-blue-100 text-blue-700' },
  '3-4': { label: 'LV 3-4', color: 'bg-emerald-100 text-emerald-700' },
  '5-6': { label: 'LV 5-6', color: 'bg-rose-100 text-rose-700' },
};

function scoreColor(score: number) {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-indigo-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('teacher_auth') === 'true');
  const [results, setResults] = useState<TestResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | '1-2' | '3-4' | '5-6'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllTestResults();
    setResults(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  const handleLogout = () => {
    sessionStorage.removeItem('teacher_auth');
    setAuthed(false);
  };

  const handleCopy = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?report=${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!authed) {
    return <TeacherLogin onLogin={() => setAuthed(true)} />;
  }

  const filtered = filter === 'all'
    ? results
    : results.filter(r => r.unit_title === filter);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-indigo-600">TES VOCA</span>
          <span className="text-slate-400 text-sm font-medium">성적 관리</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', '1-2', '3-4', '5-6'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              {f === 'all' ? '전체' : `LV ${f}`}
            </button>
          ))}
          <span className="ml-auto text-sm text-slate-400 self-center">
            총 {filtered.length}건
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            결과가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const group = GROUP_LABELS[r.unit_title ?? ''] ?? { label: r.unit_title ?? '-', color: 'bg-slate-100 text-slate-600' };
              const date = r.created_at
                ? new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-';
              const isCopied = copiedId === r.id;

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm"
                >
                  <div className={`text-2xl font-extrabold w-14 text-right shrink-0 ${scoreColor(r.score)}`}>
                    {r.score}
                    <span className="text-xs font-bold">%</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-slate-800 truncate">{r.user_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${group.color}`}>
                        {group.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {r.correct_answers?.length ?? 0}/{r.total_questions}문제 정답 · {date}
                    </div>
                  </div>

                  <button
                    onClick={() => r.id && handleCopy(r.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 transition-all ${
                      isCopied
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isCopied ? '복사됨' : '링크 복사'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
