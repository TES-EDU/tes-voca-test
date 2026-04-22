import { useEffect, useState, useCallback } from 'react';
import { Copy, Check, Loader2, RefreshCw, LogOut, ChevronRight } from 'lucide-react';
import { getAllTestResults, type TestResultRow } from '../lib/supabase';
import { scoreColor, groupAccent } from '../lib/sunbeam';
import TeacherLogin from './TeacherLogin';

interface Props {
  onStudentClick: (studentName: string) => void;
}

const FILTER_LABELS: Record<string, string> = {
  all: '전체',
  '1-2': 'LV 1-2',
  '3-4': 'LV 3-4',
  '5-6': 'LV 5-6',
};

export default function AdminPage({ onStudentClick }: Props) {
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

  const handleCopy = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
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
    <div className="min-h-screen bg-sb-bg">
      {/* Header */}
      <header className="bg-sb-surface border-b border-sb-line px-5 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-[11px] font-extrabold -tracking-tight">T</div>
          <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
          <div className="w-px h-3 bg-sb-line" />
          <span className="text-xs text-sb-muted font-medium">· 성적 관리</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm text-sb-muted hover:text-sb-primary-dark transition-colors"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-sb-muted hover:text-sb-wrong-dark transition-colors"
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
                  ? 'bg-sb-primary-dark text-white'
                  : 'bg-sb-surface text-sb-muted border border-sb-line hover:border-sb-primary-light'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
          <span className="ml-auto text-sm text-sb-muted self-center">
            총 {filtered.length}건
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20 text-sb-muted-soft">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-sb-muted-soft text-sm">
            결과가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const accent = groupAccent((r.unit_title ?? '1-2') as '1-2' | '3-4' | '5-6');
              const date = r.created_at
                ? new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-';
              const isCopied = copiedId === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => onStudentClick(r.user_name)}
                  className="w-full bg-sb-surface rounded-xl border border-sb-line px-4 py-3 flex items-center gap-3 shadow-sm hover:border-sb-primary-light hover:bg-sb-primary-paler transition-all cursor-pointer"
                >
                  <div className={`text-2xl font-extrabold w-14 text-right shrink-0 -tracking-tight tabular-nums ${scoreColor(r.score)}`}>
                    {r.score}
                    <span className="text-xs font-bold">%</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sb-ink truncate">{r.user_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${accent.chip}`}>
                        LV {r.unit_title}
                      </span>
                    </div>
                    <div className="text-xs text-sb-muted">
                      {r.correct_answers?.length ?? 0}/{r.total_questions}문제 정답 · {date}
                    </div>
                  </div>

                  <button
                    onClick={(e) => r.id && handleCopy(e, r.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 transition-all ${
                      isCopied
                        ? 'bg-sb-correct-pale text-sb-correct-dark'
                        : 'bg-sb-primary-pale text-sb-primary-dark hover:bg-sb-primary-light'
                    }`}
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isCopied ? '복사됨' : '링크 복사'}
                  </button>

                  <ChevronRight size={16} className="text-sb-muted-softer shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
