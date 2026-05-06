import { useEffect, useState, useCallback, useMemo } from 'react';
import { Copy, Check, Loader2, RefreshCw, LogOut, ChevronRight, Search, Users, BookOpen, AlertTriangle, ClipboardList, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { getAllTestResults, getTeacherSession, getMyAcademies, setCurrentAcademy, getCurrentAcademyId, teacherLogout, supabase, getStudents, getClasses, createClass, updateClassStudents, deleteClass, type TestResultRow, type AcademyRow, type StudentRow, type ClassRow } from '../lib/supabase';
import { scoreColor, groupAccent } from '../lib/sunbeam';
import TeacherLogin from './TeacherLogin';

interface Props { onStudentClick: (studentName: string) => void; }

type Tab = 'students' | 'classes' | 'history';
type LevelFilter = 'all' | '1-2' | '3-4' | '5-6';

const FILTER_LABELS: Record<string, string> = { all: '전체', '1-2': 'LV 1-2', '3-4': 'LV 3-4', '5-6': 'LV 5-6' };

function fmtDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Dashboard Tile ──
function DashTile({ icon, label, desc, count, color, onClick }: {
  icon: React.ReactNode; label: string; desc: string; count?: number; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`${color} rounded-2xl p-5 text-left transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">{icon}</div>
        {count !== undefined && <span className="text-2xl font-extrabold tabular-nums">{count}</span>}
      </div>
      <div className="text-sm font-bold">{label}</div>
      <div className="text-xs opacity-70 mt-0.5">{desc}</div>
    </button>
  );
}

export default function AdminPage({ onStudentClick }: Props) {
  const [authed, setAuthed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [results, setResults] = useState<TestResultRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('students');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileStudentFilter, setMobileStudentFilter] = useState<'all' | 'tested' | 'untested' | 'attention'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [academy, setAcademy] = useState<AcademyRow | null>(null);

  // Class management
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      setAuthChecking(true);
      const { session } = await getTeacherSession();
      if (session?.user) {
        const academies = await getMyAcademies();
        if (academies.length > 0) {
          const ac = academies[0];
          setAcademy(ac);
          setCurrentAcademy(ac);
          setAuthed(true);
          setDenied(false);
        } else { setDenied(true); setAuthed(false); }
      }
      setAuthChecking(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) checkAuth();
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const aid = getCurrentAcademyId();
    const [r, s, c] = await Promise.all([getAllTestResults(aid), getStudents(aid), getClasses(aid)]);
    setResults(r); setStudents(s); setClasses(c);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) loadAll(); }, [authed, loadAll]);

  const handleLogout = async () => { await teacherLogout(); setAuthed(false); setAcademy(null); };

  const handleCopy = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?report=${id}`);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered results
  const filtered = useMemo(() => {
    let data = levelFilter === 'all' ? results : results.filter(r => r.unit_title === levelFilter);
    if (query.trim()) data = data.filter(r => r.user_name.includes(query.trim()));
    return data;
  }, [results, levelFilter, query]);

  // Wrong answer analysis
  const wrongWordRanking = useMemo(() => {
    const map = new Map<string, { word: string; meaning: string; count: number }>();
    results.forEach(r => {
      (r.incorrect_answers ?? []).forEach((w: { word: string; meaning: string }) => {
        const key = w.word;
        const existing = map.get(key);
        if (existing) existing.count++;
        else map.set(key, { word: w.word, meaning: w.meaning, count: 1 });
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 15);
  }, [results]);

  // Per-student stats for mobile rich cards
  const studentStats = useMemo(() => {
    const today = new Date().toDateString();
    return students.map(s => {
      const sr = results.filter(r => r.user_name === s.name);
      const cls = classes.find(c => (c.student_ids || []).includes(s.id));
      const scores = sr.map(r => r.score);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const wCnt = sr.reduce((sum, r) => sum + (r.incorrect_answers?.length || 0), 0);
      const tQ = sr.reduce((sum, r) => sum + r.total_questions, 0);
      const wrongRate = tQ ? Math.round((wCnt / tQ) * 100) : null;
      const testedToday = sr.some(r => r.created_at && new Date(r.created_at).toDateString() === today);
      const trend = scores.length >= 2 ? scores[0] - scores[Math.min(scores.length - 1, 3)] : null;
      const needsAttention = (avg !== null && avg < 50) || (wrongRate !== null && wrongRate > 30);
      return { ...s, cls, latest: sr[0], avg, wrongRate, testedToday, trend, needsAttention, testCount: sr.length };
    });
  }, [students, results, classes]);

  const todayTestedCount = useMemo(() => studentStats.filter(s => s.testedToday).length, [studentStats]);
  const untestedCount = useMemo(() => studentStats.filter(s => !s.testedToday && s.testCount > 0).length, [studentStats]);
  const attentionCount = useMemo(() => studentStats.filter(s => s.needsAttention).length, [studentStats]);

  const mobileFilteredStudents = useMemo(() => {
    let list = studentStats;
    if (mobileStudentFilter === 'tested') list = list.filter(s => s.testedToday);
    if (mobileStudentFilter === 'untested') list = list.filter(s => !s.testedToday && s.testCount > 0);
    if (mobileStudentFilter === 'attention') list = list.filter(s => s.needsAttention);
    if (studentSearch.trim()) list = list.filter(s => s.name.includes(studentSearch.trim()));
    return list;
  }, [studentStats, mobileStudentFilter, studentSearch]);

  // Class management handlers
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    await createClass(newClassName.trim());
    setNewClassName('');
    loadAll();
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('이 반을 삭제하시겠습니까?')) return;
    await deleteClass(id);
    loadAll();
  };

  const handleToggleStudent = async (cls: ClassRow, studentId: string) => {
    const ids = cls.student_ids || [];
    const newIds = ids.includes(studentId) ? ids.filter(id => id !== studentId) : [...ids, studentId];
    await updateClassStudents(cls.id, newIds);
    loadAll();
  };

  if (authChecking) return <div className="min-h-screen bg-sb-bg flex items-center justify-center"><Loader2 size={32} className="animate-spin text-sb-primary" /></div>;
  if (!authed) return <TeacherLogin onLogin={() => {}} denied={denied} />;

  // ── Header ──
  const Header = () => (
    <header className="bg-sb-surface border-b border-sb-line px-4 md:px-5 h-14 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-[11px] font-extrabold shrink-0">T</div>
        <span className="text-sm font-extrabold text-sb-ink truncate md:hidden">{academy?.name || 'TES VOCA'}</span>
        <span className="text-sm font-extrabold text-sb-ink hidden md:inline">TES VOCA</span>
        <div className="w-px h-3 bg-sb-line hidden md:block" />
        <span className="text-xs text-sb-muted font-medium hidden md:inline">· {academy?.name || '관리'}</span>
      </div>
      <div className="flex items-center gap-1 md:gap-3 shrink-0">
        <button onClick={loadAll} className="p-2 md:p-0 flex items-center gap-1.5 text-sm text-sb-muted hover:text-sb-primary-dark transition-colors">
          <RefreshCw size={16} /><span className="hidden md:inline">새로고침</span>
        </button>
        <button onClick={handleLogout} className="p-2 md:p-0 flex items-center gap-1.5 text-sm text-sb-muted hover:text-sb-wrong-dark transition-colors">
          <LogOut size={16} /><span className="hidden md:inline">로그아웃</span>
        </button>
      </div>
    </header>
  );

  // ── Tab Bar ──
  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'students', icon: <Users size={16} />, label: '학생 관리' },
    { id: 'classes', icon: <BookOpen size={16} />, label: '반 관리' },
    { id: 'history', icon: <Search size={16} />, label: '시험 이력' },
  ];

  const TabBar = () => (
    <div className="flex border-b border-sb-line bg-sb-surface px-4 gap-1 overflow-x-auto">
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            tab === t.id ? 'border-sb-primary-dark text-sb-primary-dark' : 'border-transparent text-sb-muted hover:text-sb-ink'
          }`}>
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  );

  // ── Dashboard Tab ──
  const DashboardView = () => (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-1">DASHBOARD</div>
      <h1 className="text-2xl lg:text-3xl font-extrabold text-sb-ink mb-6">관리자 대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <DashTile icon={<Users size={20} className="text-sb-primary-dark" />}
          label="학생 관리" desc="전체 학생 보기" count={students.length}
          color="bg-sb-primary-pale text-sb-primary-dark" onClick={() => setTab('students')} />
        <DashTile icon={<BookOpen size={20} className="text-sb-correct-dark" />}
          label="반 관리" desc="반 생성 · 학생 배정" count={classes.length}
          color="bg-sb-correct-pale text-sb-correct-dark" onClick={() => setTab('classes')} />
        <DashTile icon={<AlertTriangle size={20} className="text-sb-orange-dark" />}
          label="오답 분석" desc="자주 틀린 단어 TOP" count={wrongWordRanking.length}
          color="bg-sb-orange-pale text-sb-orange-dark" onClick={() => setTab('dashboard')} />
        <DashTile icon={<ClipboardList size={20} className="text-sb-ink" />}
          label="시험 이력" desc="날짜별 결과 보기" count={results.length}
          color="bg-sb-surface-alt text-sb-ink" onClick={() => setTab('history')} />
      </div>

      {/* Wrong word ranking inline */}
      <div className="bg-sb-surface border border-sb-line rounded-2xl p-5">
        <div className="text-xs font-extrabold tracking-[0.22em] text-sb-orange-dark mb-4">오답 TOP 15</div>
        {wrongWordRanking.length === 0 ? (
          <div className="text-center text-sb-muted py-8 text-sm">데이터가 없습니다.</div>
        ) : (
          <div className="space-y-1.5">
            {wrongWordRanking.map((w, i) => (
              <div key={w.word} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sb-surface-alt">
                <span className="w-6 text-right text-xs font-bold text-sb-muted tabular-nums">{i + 1}</span>
                <div className="w-1.5 h-6 rounded-full bg-sb-orange shrink-0" style={{ opacity: 1 - i * 0.05 }} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sb-ink truncate">{w.word}</div>
                  <div className="text-xs text-sb-muted truncate">{w.meaning}</div>
                </div>
                <div className="text-sm font-extrabold text-sb-orange-dark tabular-nums">{w.count}회</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Students Tab ──
  const StudentsView = () => (
    <div className="p-4 md:p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-1">STUDENTS</div>
      <h1 className="text-2xl font-extrabold text-sb-ink mb-4 md:mb-6">학생 관리 <span className="text-sb-muted font-semibold text-lg ml-1">{students.length}명</span></h1>

      {/* ── Mobile: Rich student cards ── */}
      <div className="md:hidden">
        {/* Status summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-sb-correct-pale rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1 mb-1"><span className="w-1.5 h-1.5 rounded-full bg-sb-correct" /><span className="text-[10px] font-bold text-sb-correct-dark">오늘 응시</span></div>
            <div className="text-xl font-extrabold text-sb-correct-dark tabular-nums">{todayTestedCount}<span className="text-xs font-bold">명</span></div>
          </div>
          <div className="bg-sb-orange-pale rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1 mb-1"><span className="w-1.5 h-1.5 rounded-full bg-sb-orange" /><span className="text-[10px] font-bold text-sb-orange-dark">미응시</span></div>
            <div className="text-xl font-extrabold text-sb-orange-dark tabular-nums">{untestedCount}<span className="text-xs font-bold">명</span></div>
          </div>
          <div className="bg-sb-wrong-pale rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1 mb-1"><span className="w-1.5 h-1.5 rounded-full bg-sb-wrong" /><span className="text-[10px] font-bold text-sb-wrong-dark">관리 필요</span></div>
            <div className="text-xl font-extrabold text-sb-wrong-dark tabular-nums">{attentionCount}<span className="text-xs font-bold">명</span></div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
          {([
            { id: 'all' as const, label: '전체', count: students.length },
            { id: 'tested' as const, label: '응시', count: todayTestedCount },
            { id: 'untested' as const, label: '미응시', count: untestedCount },
            { id: 'attention' as const, label: '관리', count: attentionCount },
          ]).map(f => (
            <button key={f.id} onClick={() => setMobileStudentFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                mobileStudentFilter === f.id ? 'bg-sb-primary-dark text-white' : 'bg-sb-surface border border-sb-line text-sb-muted'
              }`}>{f.label} {f.count}</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sb-muted-soft" />
          <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
            placeholder="학생 이름 검색..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-sb-line bg-sb-surface text-sm outline-none focus:border-sb-primary" />
        </div>

        {/* Rich student cards */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-sb-muted" /></div>
        ) : mobileFilteredStudents.length === 0 ? (
          <div className="text-center py-16 text-sb-muted text-sm">{studentSearch.trim() ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}</div>
        ) : (
          <div className="space-y-3">
            {mobileFilteredStudents.map(s => (
              <div key={s.id} className="bg-sb-surface border border-sb-line rounded-2xl p-4">
                {/* Name row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-sb-primary text-white text-base font-bold flex items-center justify-center shrink-0">{s.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sb-ink">{s.name}</span>
                      {s.cls && <span className="text-[10px] px-1.5 py-0.5 bg-sb-correct-pale text-sb-correct-dark rounded font-semibold">{s.cls.name}</span>}
                    </div>
                    {s.testedToday && (
                      <div className="flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-sb-correct" /><span className="text-[11px] text-sb-correct-dark font-semibold">오늘 응시</span></div>
                    )}
                    {!s.testedToday && s.testCount === 0 && <div className="text-[11px] text-sb-muted mt-0.5">시험 기록 없음</div>}
                  </div>
                  <button onClick={() => onStudentClick(s.name)} className="p-1.5 text-sb-muted hover:text-sb-ink"><MoreHorizontal size={18} /></button>
                </div>

                {s.testCount > 0 && (
                  <>
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div><div className="text-[10px] text-sb-muted mb-0.5">최근 점수</div><div className="text-lg font-extrabold text-sb-ink tabular-nums">{s.latest?.score ?? '-'}<span className="text-[10px] font-bold text-sb-muted">점</span></div></div>
                      <div><div className="text-[10px] text-sb-muted mb-0.5">평균</div><div className="text-lg font-extrabold text-sb-ink tabular-nums">{s.avg ?? '-'}<span className="text-[10px] font-bold text-sb-muted">점</span></div></div>
                      <div><div className="text-[10px] text-sb-muted mb-0.5">오답률</div><div className="text-lg font-extrabold text-sb-ink tabular-nums">{s.wrongRate ?? '-'}<span className="text-[10px] font-bold text-sb-muted">%</span></div></div>
                    </div>
                    {/* Progress + trend */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] text-sb-muted shrink-0">최근 {Math.min(s.testCount, 4)}회</span>
                      <div className="flex-1 h-1.5 bg-sb-line rounded-full overflow-hidden"><div className="h-full bg-sb-primary-dark rounded-full" style={{ width: `${s.avg ?? 0}%` }} /></div>
                      {s.trend !== null && <span className={`text-[11px] font-bold tabular-nums shrink-0 ${s.trend >= 0 ? 'text-sb-correct' : 'text-sb-wrong'}`}>{s.trend >= 0 ? '↑' : '↓'}{Math.abs(s.trend)}점</span>}
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button onClick={() => onStudentClick(s.name)} className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg bg-sb-primary-dark text-white text-xs font-bold cursor-pointer">
                        <ChevronRight size={13} />이력 보기
                      </button>
                      <button className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg bg-sb-surface border border-sb-line text-sb-muted text-xs font-semibold">
                        <ClipboardList size={13} />시험 이력
                      </button>
                    </div>
                  </>
                )}
                {s.testCount === 0 && (
                  <button onClick={() => onStudentClick(s.name)} className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg bg-sb-surface-alt text-sb-muted text-xs font-semibold">
                    <ChevronRight size={13} />상세 보기
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tablet/Desktop: existing simple list ── */}
      <div className="hidden md:block">
        {loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-sb-muted" /></div> : students.length === 0 ? (
          <div className="text-center py-20 text-sb-muted text-sm">등록된 학생이 없습니다.<br />학생이 응시 코드로 시험을 치면 자동으로 등록됩니다.</div>
        ) : (
          <div className="grid gap-2">
            {students.map(s => {
              const studentResults = results.filter(r => r.user_name === s.name);
              const lastResult = studentResults[0];
              const cls = classes.find(c => (c.student_ids || []).includes(s.id));
              return (
                <button key={s.id} onClick={() => onStudentClick(s.name)}
                  className="w-full bg-sb-surface border border-sb-line rounded-xl px-4 py-3 flex items-center gap-3 hover:border-sb-primary-light hover:bg-sb-primary-paler transition-all text-left cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-sb-primary text-white text-sm font-bold flex items-center justify-center shrink-0">{s.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sb-ink">{s.name}</span>
                      {cls && <span className="text-[10px] px-1.5 py-0.5 bg-sb-correct-pale text-sb-correct-dark rounded font-semibold">{cls.name}</span>}
                    </div>
                    <div className="text-xs text-sb-muted">{studentResults.length > 0 ? `시험 ${studentResults.length}회 · 최근 ${lastResult?.score}%` : '시험 기록 없음'}</div>
                  </div>
                  <ChevronRight size={16} className="text-sb-muted-soft shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Classes Tab ──
  const ClassesView = () => (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-1">CLASSES</div>
      <h1 className="text-2xl font-extrabold text-sb-ink mb-6">반 관리</h1>

      {/* Create class */}
      <div className="flex gap-2 mb-6">
        <input value={newClassName} onChange={e => setNewClassName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
          placeholder="새 반 이름 (예: 하계관 중등)" className="flex-1 h-11 px-4 rounded-xl border border-sb-line bg-sb-surface text-sm outline-none focus:border-sb-primary" />
        <button onClick={handleCreateClass} disabled={!newClassName.trim()}
          className="h-11 px-5 rounded-xl bg-sb-primary-dark text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0">
          <Plus size={16} />반 만들기
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-16 text-sb-muted text-sm">아직 반이 없습니다. 위에서 반을 만들어 보세요.</div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => {
            const memberStudents = students.filter(s => (cls.student_ids || []).includes(s.id));
            const isEditing = editingClass?.id === cls.id;
            return (
              <div key={cls.id} className="bg-sb-surface border border-sb-line rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sb-correct-pale flex items-center justify-center">
                    <BookOpen size={18} className="text-sb-correct-dark" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sb-ink">{cls.name}</div>
                    <div className="text-xs text-sb-muted">{memberStudents.length}명 · 응시코드: <span className="font-mono font-bold text-sb-primary-dark">{cls.test_code || '없음'}</span></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cls.test_code && (
                      <button onClick={() => handleCopyCode(cls.test_code!)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${copiedCode === cls.test_code ? 'bg-sb-correct-pale text-sb-correct-dark' : 'bg-sb-surface-alt text-sb-muted hover:bg-sb-primary-pale hover:text-sb-primary-dark'}`}>
                        {copiedCode === cls.test_code ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 코드 복사</>}
                      </button>
                    )}
                    <button onClick={() => setEditingClass(isEditing ? null : cls)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sb-surface-alt text-sb-muted hover:bg-sb-primary-pale hover:text-sb-primary-dark">
                      {isEditing ? '닫기' : '학생 배정'}
                    </button>
                    <button onClick={() => handleDeleteClass(cls.id)}
                      className="p-1.5 rounded-lg text-sb-muted hover:bg-sb-wrong-pale hover:text-sb-wrong-dark transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Student tags */}
                {memberStudents.length > 0 && !isEditing && (
                  <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                    {memberStudents.slice(0, 8).map(s => (
                      <span key={s.id} className="px-2 py-1 bg-sb-surface-alt rounded-md text-xs font-semibold text-sb-ink">{s.name}</span>
                    ))}
                    {memberStudents.length > 8 && <span className="px-2 py-1 text-xs text-sb-muted">+{memberStudents.length - 8}명</span>}
                  </div>
                )}

                {/* Student assignment panel */}
                {isEditing && (
                  <div className="border-t border-sb-line px-5 py-4 bg-sb-surface-alt/30">
                    <div className="text-xs font-bold text-sb-muted mb-3">학생 체크로 반에 배정/해제</div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                      {students.map(s => {
                        const inClass = (cls.student_ids || []).includes(s.id);
                        return (
                          <button key={s.id} onClick={() => handleToggleStudent(cls, s.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                              inClass ? 'bg-sb-primary-pale border border-sb-primary-light font-bold text-sb-primary-dark' : 'bg-sb-surface border border-sb-line text-sb-ink hover:border-sb-primary-light'
                            }`}>
                            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] ${
                              inClass ? 'bg-sb-primary border-sb-primary text-white' : 'border-sb-line'
                            }`}>{inClass && '✓'}</span>
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── History Tab (existing results list) ──
  const HistoryView = () => (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-1">HISTORY</div>
      <h1 className="text-2xl font-extrabold text-sb-ink mb-4">시험 이력</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', '1-2', '3-4', '5-6'] as const).map(f => (
          <button key={f} onClick={() => setLevelFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              levelFilter === f ? 'bg-sb-primary-dark text-white' : 'bg-sb-surface text-sb-muted border border-sb-line'
            }`}>{FILTER_LABELS[f]}</button>
        ))}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sb-muted-soft" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="학생 이름 검색…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-sb-line bg-sb-surface text-sm outline-none focus:border-sb-primary" />
        </div>
        <span className="text-sm text-sb-muted self-center">총 {filtered.length}건</span>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-sb-muted" /></div>
      : filtered.length === 0 ? <div className="text-center py-20 text-sb-muted text-sm">결과가 없습니다.</div>
      : (
        <div className="space-y-2">
          {filtered.map(r => {
            const accent = groupAccent((r.unit_title ?? '1-2') as '1-2' | '3-4' | '5-6');
            const isCopied = copiedId === r.id;
            return (
              <div key={r.id} onClick={() => onStudentClick(r.user_name)}
                className="w-full bg-sb-surface rounded-xl border border-sb-line px-4 py-3 flex items-center gap-3 hover:border-sb-primary-light hover:bg-sb-primary-paler transition-all cursor-pointer">
                <div className={`text-2xl font-extrabold w-14 text-right shrink-0 tabular-nums ${scoreColor(r.score)}`}>
                  {r.score}<span className="text-xs font-bold">%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sb-ink truncate">{r.user_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${accent.chip}`}>LV {r.unit_title}</span>
                  </div>
                  <div className="text-xs text-sb-muted">{r.correct_answers?.length ?? 0}/{r.total_questions}문제 정답 · {fmtDateTime(r.created_at ?? undefined)}</div>
                </div>
                <button onClick={(e) => r.id && handleCopy(e, r.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 transition-all ${
                    isCopied ? 'bg-sb-correct-pale text-sb-correct-dark' : 'bg-sb-primary-pale text-sb-primary-dark hover:bg-sb-primary-light'
                  }`}>
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  {isCopied ? '복사됨' : '링크'}
                </button>
                <ChevronRight size={16} className="text-sb-muted-softer shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-sb-bg">
      <Header />
      <TabBar />
      {tab === 'students' && StudentsView()}
      {tab === 'classes' && ClassesView()}
      {tab === 'history' && HistoryView()}
    </div>
  );
}
