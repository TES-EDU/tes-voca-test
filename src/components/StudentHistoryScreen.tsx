import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, User, Share2, Check, Trash2, TrendingUp, TrendingDown, AlertCircle, FileText, Clock, ChevronRight } from 'lucide-react';
import { getStudentResults, deleteStudentResults, type TestResultRow } from '../lib/supabase';
import { scoreColor, groupAccent, formatDuration } from '../lib/sunbeam';

interface Props {
  studentName: string;
  onBack: () => void;
  onReportClick: (reportId: string) => void;
}

type TrendPoint = { score: number; date: string; level: string };

function TrendChart({ data, width = 680, height = 160 }: { data: TrendPoint[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const pad = { t: 14, r: 14, b: 22, l: 32 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const xs = data.map((_, i) => pad.l + (i / Math.max(data.length - 1, 1)) * w);
  const ys = data.map(d => pad.t + (1 - d.score / 100) * h);
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L${xs[xs.length - 1].toFixed(1)},${pad.t + h} L${xs[0].toFixed(1)},${pad.t + h} Z`;
  const labelEvery = width < 480 ? Math.ceil(data.length / 3) : 1;
  return (
    <svg width={width} height={height} className="block w-full">
      <defs>
        <linearGradient id="sbTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#77CDD0" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#77CDD0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(v => {
        const y = pad.t + (1 - v / 100) * h;
        return (
          <g key={v}>
            <line x1={pad.l} x2={pad.l + w} y1={y} y2={y} stroke="#EEF1F2" strokeDasharray="3 3" />
            <text x={pad.l - 8} y={y + 3} fontSize="10" fill="#A8B3B6" textAnchor="end">{v}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#sbTrendFill)" />
      <path d={path} fill="none" stroke="#1B7A84" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r="4.5" fill="white" stroke={groupAccent(d.level as '1-2' | '3-4' | '5-6').dot} strokeWidth="2.5" />
      ))}
      {data.map((d, i) => {
        if (i % labelEvery !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={xs[i]} y={height - 4} fontSize="10" fill="#6B7A7E" textAnchor="middle" fontWeight="600">
            {new Date(d.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
          </text>
        );
      })}
    </svg>
  );
}

function ResponsiveTrendChart({ data }: { data: TrendPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(688);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full">
      <TrendChart data={data} width={w} height={w < 480 ? 130 : 180} />
    </div>
  );
}

function LevelBars({ rows }: { rows: TestResultRow[] }) {
  const byLevel = useMemo(() => {
    const map: Record<string, { total: number; sum: number }> = {};
    rows.forEach(r => {
      const k = r.unit_title ?? '?';
      const e = map[k] ?? { total: 0, sum: 0 };
      e.total += 1;
      e.sum += r.score;
      map[k] = e;
    });
    return (['1-2', '3-4', '5-6'] as const)
      .filter(k => map[k])
      .map(k => ({ level: k, avg: Math.round(map[k].sum / map[k].total), count: map[k].total }));
  }, [rows]);

  if (!byLevel.length) return null;
  return (
    <div className="space-y-3">
      {byLevel.map(({ level, avg, count }) => (
        <div key={level} className="flex items-center gap-3">
          <div className="w-14 text-xs font-bold text-sb-muted text-right shrink-0">LV {level}</div>
          <div className="flex-1 h-2 bg-sb-line-soft rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sb-primary to-sb-primary-dark rounded-full"
              style={{ width: `${avg}%` }}
            />
          </div>
          <div className={`text-sm font-extrabold tabular-nums w-12 text-right ${scoreColor(avg)}`}>{avg}%</div>
          <div className="text-xs text-sb-muted w-8 text-right tabular-nums">{count}회</div>
        </div>
      ))}
    </div>
  );
}

export default function StudentHistoryScreen({ studentName, onBack, onReportClick }: Props) {
  const [rows, setRows] = useState<TestResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`"${studentName}" 학생의 모든 데이터를 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    const ok = await deleteStudentResults(studentName);
    setDeleting(false);
    if (ok) onBack();
  }, [studentName, onBack]);

  const handleShareLatest = useCallback(async () => {
    const latest = rows[0];
    if (!latest?.id) return;
    const url = `${window.location.origin}${window.location.pathname}?report=${latest.id}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }, [rows]);

  const load = async () => {
    setLoading(true);
    setRows(await getStudentResults(studentName));
    setLoading(false);
  };
  useEffect(() => { load(); }, [studentName]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const scores = rows.map(r => r.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = Math.max(...scores);
    const delta = rows.length >= 2 ? rows[0].score - rows[1].score : null;
    return { total: rows.length, avg, best, delta };
  }, [rows]);

  const frequentWrong = useMemo(() => {
    const map = new Map<string, { word: string; meaning: string; wrongCount: number; totalSeen: number }>();
    rows.forEach(r => {
      (r.incorrect_answers ?? []).forEach(w => {
        const k = w.word;
        const e = map.get(k) ?? { word: w.word, meaning: w.meaning, wrongCount: 0, totalSeen: 0 };
        e.wrongCount += 1; e.totalSeen += 1;
        map.set(k, e);
      });
      (r.correct_answers ?? []).forEach(c => {
        const k = c.word;
        const e = map.get(k);
        if (e) { e.totalSeen += 1; map.set(k, e); }
      });
    });
    return [...map.values()].sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5);
  }, [rows]);

  const trendData: TrendPoint[] = [...rows].reverse().map(r => ({
    score: r.score,
    date: r.created_at ?? new Date().toISOString(),
    level: r.unit_title,
  }));

  const StudentCard = () => (
    <div className="bg-sb-surface border border-sb-line rounded-2xl p-5">
      <div className="flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center shadow-[0_6px_16px_#E8F9FA]">
          <User size={26} color="white" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[22px] font-extrabold text-sb-ink -tracking-[0.02em]">{studentName}</div>
          <div className="text-[13px] text-sb-muted mt-0.5">TES VOCA 응시자</div>
        </div>
        <button
          onClick={handleShareLatest}
          disabled={!rows[0]?.id}
          className={`p-[11px] border-[1.5px] rounded-xl transition-colors ${
            shareCopied
              ? 'bg-sb-correct-pale border-sb-correct text-sb-correct-dark'
              : 'bg-sb-surface border-sb-line text-sb-muted hover:border-sb-primary-light hover:text-sb-primary-dark disabled:opacity-40'
          }`}
        >
          {shareCopied ? <Check size={18} /> : <Share2 size={18} />}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting || !rows.length}
          className="p-[11px] bg-sb-surface border-[1.5px] border-sb-line text-sb-muted hover:border-sb-wrong hover:text-sb-wrong-dark rounded-xl transition-colors disabled:opacity-40"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );

  const KPIRow = () => (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      <div className="bg-sb-surface border border-sb-line rounded-2xl p-4">
        <div className="text-[11px] text-sb-muted mb-0.5 font-semibold">평균 점수</div>
        <div className="text-[22px] font-extrabold text-sb-primary-dark -tracking-[0.02em] tabular-nums">
          {stats?.avg ?? 0}<span className="text-[11px] font-bold text-sb-muted ml-0.5">%</span>
        </div>
      </div>
      <div className="bg-sb-surface border border-sb-line rounded-2xl p-4">
        <div className="text-[11px] text-sb-muted mb-0.5 font-semibold">최고 점수</div>
        <div className="text-[22px] font-extrabold text-sb-correct -tracking-[0.02em] tabular-nums">
          {stats?.best ?? 0}<span className="text-[11px] font-bold text-sb-muted ml-0.5">%</span>
        </div>
      </div>
      <div className="bg-sb-surface border border-sb-line rounded-2xl p-4">
        <div className="text-[11px] text-sb-muted mb-0.5 font-semibold">응시 횟수</div>
        <div className="text-[22px] font-extrabold text-sb-ink -tracking-[0.02em] tabular-nums">
          {stats?.total ?? 0}<span className="text-[11px] font-bold text-sb-muted ml-0.5">회</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sb-bg flex flex-col">
      <header className="bg-sb-surface border-b border-sb-line h-14 px-5 flex items-center gap-2.5 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-sb-muted rounded-lg hover:bg-sb-surface-alt">
          <ArrowLeft size={20} />
        </button>
        <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-[11px] font-extrabold -tracking-tight">T</div>
        <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
        <div className="w-px h-3 bg-sb-line" />
        <span className="text-xs text-sb-muted font-medium">· 학생 이력</span>
        <button onClick={load} className="ml-auto flex items-center gap-1.5 text-xs text-sb-muted hover:text-sb-primary-dark px-2 py-1.5 rounded-md">
          <RefreshCw size={14} /> 새로고침
        </button>
      </header>

      {/* ── Mobile / Tablet ── */}
      <div className="lg:hidden flex-1 overflow-y-auto p-5">
        <div className="space-y-3.5">
          <StudentCard />

          {stats && (
            <div className="bg-sb-surface border border-sb-line rounded-2xl px-5 py-4 grid grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] text-sb-muted mb-0.5 font-semibold">응시 횟수</div>
                <div className="text-[22px] font-extrabold text-sb-ink -tracking-[0.02em] tabular-nums">{stats.total}<span className="text-[11px] font-bold text-sb-muted ml-0.5">회</span></div>
              </div>
              <div>
                <div className="text-[11px] text-sb-muted mb-0.5 font-semibold">평균 점수</div>
                <div className="text-[22px] font-extrabold text-sb-primary-dark -tracking-[0.02em] tabular-nums">{stats.avg}<span className="text-[11px] font-bold text-sb-muted ml-0.5">%</span></div>
              </div>
              <div>
                <div className="text-[11px] text-sb-muted mb-0.5 font-semibold">최고 점수</div>
                <div className="text-[22px] font-extrabold text-sb-correct -tracking-[0.02em] tabular-nums">{stats.best}<span className="text-[11px] font-bold text-sb-muted ml-0.5">%</span></div>
              </div>
            </div>
          )}

          {trendData.length >= 2 && (
            <div className="bg-sb-surface border border-sb-line rounded-2xl p-[18px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-extrabold text-sb-ink">점수 추이</div>
                  <div className="text-[11px] text-sb-muted mt-px">최근 {rows.length}회</div>
                </div>
                {stats?.delta !== null && stats?.delta !== undefined && (
                  <div className={`flex items-center gap-1 text-[13px] font-extrabold tabular-nums ${stats.delta >= 0 ? 'text-sb-correct' : 'text-sb-wrong'}`}>
                    {stats.delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stats.delta >= 0 ? '+' : ''}{stats.delta}%p
                  </div>
                )}
              </div>
              <div className="-mx-1.5"><TrendChart data={trendData} /></div>
            </div>
          )}

          {frequentWrong.length > 0 && (
            <div className="bg-sb-surface border border-sb-line rounded-2xl p-[18px]">
              <div className="flex items-center gap-1.5 mb-3">
                <AlertCircle size={15} className="text-sb-orange-dark" />
                <div className="text-sm font-extrabold text-sb-ink">자주 틀리는 단어</div>
                <span className="text-[11px] text-sb-muted ml-auto">Top {frequentWrong.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {frequentWrong.map((w, i) => {
                  const rate = Math.round((w.wrongCount / Math.max(w.totalSeen, 1)) * 100);
                  return (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-sb-bg rounded-xl">
                      <div className="w-[22px] h-[22px] rounded-md bg-sb-orange-pale text-sb-orange-dark text-[11px] font-extrabold flex items-center justify-center tabular-nums">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-sb-ink">{w.word}</div>
                        <div className="text-[11px] text-sb-muted">{w.meaning}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-extrabold text-sb-orange-dark tabular-nums">{rate}%</div>
                        <div className="text-[10px] text-sb-muted tabular-nums">{w.wrongCount}/{w.totalSeen}회</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-sb-surface border border-sb-line rounded-2xl overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-sb-line-soft flex items-center gap-1.5">
              <FileText size={15} className="text-sb-ink-mid" />
              <div className="text-sm font-extrabold text-sb-ink">응시 기록</div>
              <span className="text-[11px] text-sb-muted ml-auto">{rows.length}건</span>
            </div>
            {loading ? (
              <div className="py-10 text-center text-sb-muted-soft text-sm">불러오는 중...</div>
            ) : !rows.length ? (
              <div className="py-10 text-center text-sb-muted-soft text-sm">응시 기록이 없습니다.</div>
            ) : rows.map((h, i) => {
              const c = groupAccent(h.unit_title as '1-2' | '3-4' | '5-6');
              const created = h.created_at ? new Date(h.created_at) : null;
              return (
                <button
                  key={h.id}
                  onClick={() => h.id && onReportClick(h.id)}
                  className={`w-full flex items-center gap-3 px-[18px] py-3 text-left ${i < rows.length - 1 ? 'border-b border-sb-line-soft' : ''}`}
                >
                  <div className={`text-[22px] font-extrabold w-[54px] text-right -tracking-[0.02em] tabular-nums shrink-0 ${scoreColor(h.score)}`}>
                    {h.score}<span className="text-[11px]">%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide ${c.chip}`}>LV {h.unit_title}</span>
                      <span className="text-xs font-bold text-sb-ink tabular-nums">{created?.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                    </div>
                    <div className="text-[11px] text-sb-muted flex items-center gap-2">
                      <span className="tabular-nums">{h.correct_answers?.length ?? 0}/{h.total_questions}</span>
                      <span className="inline-flex items-center gap-0.5"><Clock size={10} /> {formatDuration(h.time_taken ?? 0)}</span>
                      <span className="tabular-nums">{created?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-sb-muted-softer" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Desktop 12-col grid ── */}
      <div className="hidden lg:block flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-10 py-8">
          {/* Student header */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center">
                <User size={26} color="white" strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-sb-ink tracking-tight">{studentName}</h1>
                <div className="text-sm text-sb-muted mt-0.5">
                  {rows[0] ? `최근 응시 ${new Date(rows[0].created_at ?? '').toLocaleDateString('ko-KR')}` : 'TES VOCA 응시자'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats?.delta !== null && stats?.delta !== undefined && (
                <div className={`flex items-center gap-1 text-[13px] font-extrabold tabular-nums px-3 py-1.5 rounded-lg ${stats.delta >= 0 ? 'text-sb-correct bg-sb-correct-pale' : 'text-sb-wrong bg-sb-wrong-pale'}`}>
                  {stats.delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {stats.delta >= 0 ? '+' : ''}{stats.delta}%p
                </div>
              )}
              <button onClick={handleShareLatest} disabled={!rows[0]?.id}
                className={`p-[11px] border-[1.5px] rounded-xl transition-colors ${shareCopied ? 'bg-sb-correct-pale border-sb-correct text-sb-correct-dark' : 'bg-sb-surface border-sb-line text-sb-muted hover:border-sb-primary-light disabled:opacity-40'}`}>
                {shareCopied ? <Check size={18} /> : <Share2 size={18} />}
              </button>
              <button onClick={handleDelete} disabled={deleting || !rows.length}
                className="p-[11px] bg-sb-surface border-[1.5px] border-sb-line text-sb-muted hover:border-sb-wrong hover:text-sb-wrong-dark rounded-xl transition-colors disabled:opacity-40">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* KPI 3-tile */}
          <div className="mb-6"><KPIRow /></div>

          {/* 12-col grid */}
          <div className="space-y-0 grid grid-cols-12 gap-6">
            {/* Trend chart — 8 cols */}
            <section className="col-span-8 rounded-2xl bg-sb-surface border border-sb-line p-5 lg:p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark">SCORE TREND</div>
                <div className="text-xs text-sb-muted">최근 {trendData.length}회</div>
              </div>
              {trendData.length >= 2
                ? <ResponsiveTrendChart data={trendData} />
                : <div className="text-center text-sb-muted-soft py-12 text-sm">응시 기록이 2건 이상 필요합니다.</div>
              }
            </section>

            {/* Frequent wrong — 4 cols */}
            <section className="col-span-4 rounded-2xl bg-sb-surface border border-sb-line p-5 lg:p-6">
              <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-4">자주 틀리는 단어</div>
              {frequentWrong.length > 0 ? (
                <div className="space-y-2">
                  {frequentWrong.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sb-wrong-pale/40">
                      <div className="w-1 h-7 rounded-full bg-sb-wrong shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sb-ink truncate">{w.word}</div>
                        <div className="text-xs text-sb-muted truncate">{w.meaning}</div>
                      </div>
                      <div className="text-sm font-extrabold text-sb-wrong-dark tabular-nums">{w.wrongCount}회</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sb-muted-soft py-10 text-sm">데이터 없음</div>
              )}
            </section>

            {/* History list — 7 cols */}
            <section className="col-span-7 rounded-2xl bg-sb-surface border border-sb-line p-5 lg:p-6">
              <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-4">응시 기록</div>
              {loading ? (
                <div className="py-10 text-center text-sb-muted-soft text-sm">불러오는 중...</div>
              ) : !rows.length ? (
                <div className="py-10 text-center text-sb-muted-soft text-sm">응시 기록이 없습니다.</div>
              ) : (
                <div className="divide-y divide-sb-line-soft">
                  {rows.map(r => {
                    const created = r.created_at ? new Date(r.created_at) : null;
                    const c = groupAccent(r.unit_title as '1-2' | '3-4' | '5-6');
                    return (
                      <button
                        key={r.id}
                        onClick={() => r.id && onReportClick(r.id)}
                        className="w-full flex items-center gap-3 py-3 hover:bg-sb-surface-alt/30 -mx-2 px-2 rounded-lg text-left"
                      >
                        <div className={`text-[22px] font-extrabold w-[54px] text-right tabular-nums shrink-0 ${scoreColor(r.score)}`}>
                          {r.score}<span className="text-[11px]">%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${c.chip}`}>LV {r.unit_title}</span>
                            <span className="font-bold text-sb-ink text-sm">{r.correct_answers?.length ?? 0}/{r.total_questions}</span>
                          </div>
                          <div className="text-xs text-sb-muted tabular-nums">{created?.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })} {created?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <ChevronRight size={16} className="text-sb-muted-soft" />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Level bars — 5 cols */}
            <section className="col-span-5 rounded-2xl bg-sb-surface border border-sb-line p-5 lg:p-6">
              <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark mb-4">레벨별 평균 점수</div>
              <LevelBars rows={rows} />
              {!rows.length && <div className="text-center text-sb-muted-soft py-10 text-sm">데이터 없음</div>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
