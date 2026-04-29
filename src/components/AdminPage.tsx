import { useEffect, useState, useCallback, useMemo } from 'react';
import { Copy, Check, Loader2, RefreshCw, LogOut, ChevronRight, Search } from 'lucide-react';
import { getAllTestResults, type TestResultRow } from '../lib/supabase';
import { scoreColor, groupAccent } from '../lib/sunbeam';
import TeacherLogin from './TeacherLogin';

interface Props {
  onStudentClick: (studentName: string) => void;
}

type LevelFilter = 'all' | '1-2' | '3-4' | '5-6';
type Period = 'all' | '7d' | '30d';
type ScoreBand = 'all' | 'low' | 'mid' | 'high';

const FILTER_LABELS: Record<string, string> = {
  all: '전체', '1-2': 'LV 1-2', '3-4': 'LV 3-4', '5-6': 'LV 5-6',
};

function KPI({ label, value, unit, tone }: {
  label: string; value: number | string; unit?: string; tone: 'correct' | 'wrong' | 'primary' | 'muted';
}) {
  const colorMap = { correct: 'text-sb-correct-dark', wrong: 'text-sb-wrong-dark', primary: 'text-sb-primary-dark', muted: 'text-sb-muted' };
  const bgMap = { correct: 'bg-sb-correct-pale', wrong: 'bg-sb-wrong-pale', primary: 'bg-sb-primary-pale', muted: 'bg-sb-surface-alt' };
  return (
    <div className={`${bgMap[tone]} rounded-2xl p-4`}>
      <div className={`text-2xl font-extrabold tabular-nums leading-none ${colorMap[tone]}`}>
        {value}{unit && <span className="text-sm font-semibold ml-0.5">{unit}</span>}
      </div>
      <div className="text-xs text-sb-muted mt-1.5 font-semibold">{label}</div>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <div className="text-xs text-sb-muted font-bold mb-2">{label}</div>
      <div className="flex flex-col gap-1.5">
        {options.map(o => {
          const on = value === o.v;
          return (
            <button
              key={o.v}
              onClick={() => onChange(o.v)}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                on
                  ? "bg-sb-primary-pale text-sb-primary-dark font-bold border border-sb-primary-light"
                  : "text-sb-ink-mid hover:bg-sb-surface-alt border border-transparent",
              ].join(" ")}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${on ? "bg-sb-primary-dark" : "bg-sb-muted-softer"}`} />
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterRail({ levelFilter, onLevel, period, onPeriod, scoreBand, onScoreBand }: {
  levelFilter: LevelFilter; onLevel: (v: LevelFilter) => void;
  period: Period; onPeriod: (v: Period) => void;
  scoreBand: ScoreBand; onScoreBand: (v: ScoreBand) => void;
}) {
  return (
    <div className="space-y-7">
      <div className="text-[10px] font-extrabold tracking-[0.22em] text-sb-primary-dark">FILTER</div>
      <FilterGroup
        label="레벨" value={levelFilter} onChange={v => onLevel(v as LevelFilter)}
        options={[{ v: 'all', l: '전체' }, { v: '1-2', l: 'LV 1–2' }, { v: '3-4', l: 'LV 3–4' }, { v: '5-6', l: 'LV 5–6' }]}
      />
      <FilterGroup
        label="기간" value={period} onChange={v => onPeriod(v as Period)}
        options={[{ v: 'all', l: '전체' }, { v: '7d', l: '최근 7일' }, { v: '30d', l: '최근 30일' }]}
      />
      <FilterGroup
        label="점수 구간" value={scoreBand} onChange={v => onScoreBand(v as ScoreBand)}
        options={[{ v: 'all', l: '전체' }, { v: 'low', l: '70 미만' }, { v: 'mid', l: '70–89' }, { v: 'high', l: '90+' }]}
      />
    </div>
  );
}

function fmtDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPage({ onStudentClick }: Props) {
  const [authed, setAuthed] = useState(sessionStorage.getItem('teacher_auth') === 'true');
  const [results, setResults] = useState<TestResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [scoreBand, setScoreBand] = useState<ScoreBand>('all');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setResults(await getAllTestResults());
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  const handleLogout = () => { sessionStorage.removeItem('teacher_auth'); setAuthed(false); };

  const handleCopy = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?report=${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = useMemo(() => {
    let data = levelFilter === 'all' ? results : results.filter(r => r.unit_title === levelFilter);
    if (period !== 'all') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (period === '7d' ? 7 : 30));
      data = data.filter(r => r.created_at && new Date(r.created_at) >= cutoff);
    }
    if (scoreBand !== 'all') {
      data = data.filter(r =>
        scoreBand === 'low' ? r.score < 70 :
        scoreBand === 'mid' ? r.score >= 70 && r.score < 90 :
        r.score >= 90
      );
    }
    if (query.trim()) {
      data = data.filter(r => r.user_name.includes(query.trim()));
    }
    return data;
  }, [results, levelFilter, period, scoreBand, query]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    if (!total) return { total: 0, avg: 0, max: 0, low: 0 };
    const avg = Math.round(filtered.reduce((s, r) => s + r.score, 0) / total);
    const max = Math.max(...filtered.map(r => r.score));
    const low = filtered.filter(r => r.score < 70).length;
    return { total, avg, max, low };
  }, [filtered]);

  if (!authed) return <TeacherLogin onLogin={() => setAuthed(true)} />;

  const SharedHeader = () => (
    <header className="bg-sb-surface border-b border-sb-line px-5 h-14 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2.5">
        <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-[11px] font-extrabold -tracking-tight">T</div>
        <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
        <div className="w-px h-3 bg-sb-line" />
        <span className="text-xs text-sb-muted font-medium">· 성적 관리</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-sb-muted hover:text-sb-primary-dark transition-colors">
          <RefreshCw size={14} />
          새로고침
        </button>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-sb-muted hover:text-sb-wrong-dark transition-colors">
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-sb-bg">
      <SharedHeader />

      {/* ── Mobile / Tablet ── */}
      <div className="lg:hidden p-4 max-w-2xl mx-auto">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', '1-2', '3-4', '5-6'] as const).map(f => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                levelFilter === f
                  ? 'bg-sb-primary-dark text-white'
                  : 'bg-sb-surface text-sb-muted border border-sb-line hover:border-sb-primary-light'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
          <span className="ml-auto text-sm text-sb-muted self-center">총 {filtered.length}건</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-sb-muted-soft"><Loader2 size={28} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-sb-muted-soft text-sm">결과가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const accent = groupAccent((r.unit_title ?? '1-2') as '1-2' | '3-4' | '5-6');
              const date = fmtDateTime(r.created_at ?? undefined);
              const isCopied = copiedId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => onStudentClick(r.user_name)}
                  className="w-full bg-sb-surface rounded-xl border border-sb-line px-4 py-3 flex items-center gap-3 shadow-sm hover:border-sb-primary-light hover:bg-sb-primary-paler transition-all cursor-pointer"
                >
                  <div className={`text-2xl font-extrabold w-14 text-right shrink-0 -tracking-tight tabular-nums ${scoreColor(r.score)}`}>
                    {r.score}<span className="text-xs font-bold">%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sb-ink truncate">{r.user_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${accent.chip}`}>LV {r.unit_title}</span>
                    </div>
                    <div className="text-xs text-sb-muted">{r.correct_answers?.length ?? 0}/{r.total_questions}문제 정답 · {date}</div>
                  </div>
                  <button
                    onClick={(e) => r.id && handleCopy(e, r.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 transition-all ${
                      isCopied ? 'bg-sb-correct-pale text-sb-correct-dark' : 'bg-sb-primary-pale text-sb-primary-dark hover:bg-sb-primary-light'
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

      {/* ── Desktop ── */}
      <div className="hidden lg:grid lg:grid-cols-[240px_1fr] min-h-[calc(100vh-56px)]">
        {/* Filter rail */}
        <aside className="border-r border-sb-line bg-sb-surface p-6 sticky top-14 self-start h-[calc(100vh-56px)] overflow-y-auto">
          <FilterRail
            levelFilter={levelFilter} onLevel={setLevelFilter}
            period={period} onPeriod={setPeriod}
            scoreBand={scoreBand} onScoreBand={setScoreBand}
          />
        </aside>

        {/* Main */}
        <main className="px-10 py-8 w-full">
          <header className="flex items-baseline justify-between mb-6">
            <div>
              <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-1">TEACHER · 응시 결과</div>
              <h1 className="text-3xl font-extrabold text-sb-ink tracking-tight">학생 응시 목록</h1>
            </div>
            <div className="text-sm text-sb-muted tabular-nums">총 {filtered.length}건</div>
          </header>

          {/* KPI 4-tile */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <KPI label="응시 횟수" value={kpis.total} unit="건" tone="primary" />
            <KPI label="평균 점수" value={kpis.avg} unit="%" tone="correct" />
            <KPI label="최고 점수" value={kpis.max} unit="%" tone="primary" />
            <KPI label="저득점(70 미만)" value={kpis.low} unit="건" tone="wrong" />
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sb-muted-soft" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="학생 이름 검색…"
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-sb-line bg-sb-surface
                         text-sm text-sb-ink placeholder:text-sb-muted-soft focus:border-sb-primary focus:outline-none
                         focus:shadow-[0_0_0_4px_var(--color-sb-primary-pale)]"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20 text-sb-muted-soft"><Loader2 size={28} className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-sb-muted-soft text-sm">결과가 없습니다.</div>
          ) : (
            <div className="rounded-2xl bg-sb-surface border border-sb-line overflow-hidden">
              <table className="w-full">
                <thead className="bg-sb-surface-alt border-b border-sb-line">
                  <tr className="text-left text-[11px] tracking-[0.14em] font-extrabold text-sb-muted">
                    <th className="px-4 py-3">학생</th>
                    <th className="px-4 py-3">레벨</th>
                    <th className="px-4 py-3 text-right">점수</th>
                    <th className="px-4 py-3 text-right">정답</th>
                    <th className="px-4 py-3">응시 일시</th>
                    <th className="px-4 py-3 w-[140px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const accent = groupAccent((r.unit_title ?? '1-2') as '1-2' | '3-4' | '5-6');
                    const isCopied = copiedId === r.id;
                    return (
                      <tr key={r.id} className="border-b border-sb-line-soft last:border-b-0 hover:bg-sb-surface-alt/40">
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => onStudentClick(r.user_name)}
                            className="font-bold text-sb-ink hover:text-sb-primary-dark hover:underline"
                          >
                            {r.user_name}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${accent.chip}`}>
                            LV {r.unit_title}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-lg font-extrabold tabular-nums ${scoreColor(r.score)}`}>{r.score}</span>
                          <span className="text-xs text-sb-muted ml-0.5">%</span>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-sb-ink-mid text-sm">
                          {r.correct_answers?.length ?? 0}/{r.total_questions}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-sb-muted tabular-nums">
                          {fmtDateTime(r.created_at ?? undefined)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => r.id && handleCopy(e, r.id)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                isCopied ? 'bg-sb-correct-pale text-sb-correct-dark' : 'text-sb-muted hover:bg-sb-surface-alt'
                              }`}
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              {isCopied ? '복사됨' : '링크'}
                            </button>
                            <button
                              onClick={() => onStudentClick(r.user_name)}
                              className="px-2.5 py-1.5 rounded-md text-xs font-bold text-sb-primary-dark hover:bg-sb-primary-pale"
                            >
                              이력
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
