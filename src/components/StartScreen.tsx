import { useState, useEffect, useCallback } from 'react';
import { supabase, lookupCode, findStudent, createStudentProfile, addStudentToClass, type CodeLookupResult, type StudentRow } from '../lib/supabase';

interface Props {
  onStart: (name: string, levelGroup: '1-2' | '3-4' | '5-6', studentId?: string, academyId?: string) => void;
}

const LEVELS = [
  { id: '1-2' as const, title: 'LV 1–2', desc: '기초 단어 종합', count: 60 },
  { id: '3-4' as const, title: 'LV 3–4', desc: '중급 단어 종합', count: 60 },
  { id: '5-6' as const, title: 'LV 5–6', desc: '고급 단어 종합', count: 60 },
];

function RecentScoresStrip({ name }: { name: string }) {
  const [rows, setRows] = useState<{ date: string; score: number }[]>([]);
  useEffect(() => {
    if (!name.trim()) { setRows([]); return; }
    supabase.from('test_results')
      .select('created_at, score')
      .eq('user_name', name.trim())
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setRows((data ?? []).map((r: { created_at: string; score: number }) => ({
          date: new Date(r.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
          score: r.score,
        })));
      });
  }, [name]);
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[10px] text-sb-primary-dark font-extrabold tracking-[0.22em]">MY RECENT</div>
      <div className="flex gap-2">
        {rows.map((r, i) => (
          <div key={i} className="px-3.5 py-2.5 bg-white border border-sb-line rounded-[10px]">
            <div className="text-xs text-sb-muted tabular-nums">{r.date}</div>
            <div className="text-lg font-extrabold text-sb-ink tabular-nums">
              {r.score}<span className="text-[11px] text-sb-muted font-semibold">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LevelCard({ lv, on, onClick }: { lv: typeof LEVELS[number]; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border-[1.5px] transition-all duration-150 text-left
        p-3 md:p-[18px_16px]
        flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-3 md:gap-0
        ${on ? 'bg-sb-primary-pale border-sb-primary' : 'bg-sb-surface border-sb-line hover:border-sb-primary-light'}`}
    >
      {/* 제목 + 설명 */}
      <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-0 flex-1 min-w-0">
        <div className={`text-base md:text-[22px] font-extrabold -tracking-tight whitespace-nowrap ${on ? 'text-sb-primary-dark' : 'text-sb-ink'}`}>
          {lv.title}
        </div>
        <div className="text-xs text-sb-muted md:mt-0.5">{lv.desc}</div>
      </div>
      {/* 문제 수 */}
      <div className={`text-xs md:text-[10px] font-semibold md:font-bold md:tracking-[0.14em] md:mt-3.5 whitespace-nowrap shrink-0 ${on ? 'text-sb-primary-dark' : 'text-sb-muted'}`}>
        <span className="md:hidden">60문제</span>
        <span className="hidden md:inline">{lv.count} QUESTIONS</span>
      </div>
      {on && (
        <div className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[11px] font-extrabold flex items-center justify-center md:flex hidden">
          ✓
        </div>
      )}
    </button>
  );
}

// ── Duplicate Name Modal ──
function DuplicateModal({
  student,
  onConfirm,
  onNewProfile,
}: {
  student: StudentRow;
  onConfirm: () => void;
  onNewProfile: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <div className="text-5xl mb-3">👋</div>
        <h3 className="text-xl font-bold text-sb-ink mb-1">{student.name}님,</h3>
        <p className="text-sm text-sb-muted mb-1">{student.grade || '학년 미설정'}</p>
        <p className="text-sb-ink mb-6">이 프로필로 시험을 시작할까요?</p>

        <button
          onClick={onConfirm}
          className="w-full py-3.5 mb-3 bg-gradient-to-r from-sb-primary to-sb-primary-dark text-white font-bold rounded-xl shadow-md cursor-pointer"
        >
          네, 시작하기
        </button>
        <button
          onClick={onNewProfile}
          className="w-full py-3.5 bg-sb-surface-alt text-sb-muted font-medium rounded-xl cursor-pointer"
        >
          아니요, 동명이인입니다 (새 프로필)
        </button>
      </div>
    </div>
  );
}

export default function StartScreen({ onStart }: Props) {
  const [name, setName] = useState('');
  const [testCode, setTestCode] = useState('');
  const [selected, setSelected] = useState<'1-2' | '3-4' | '5-6'>('3-4');

  // Code lookup state
  const [codeLookup, setCodeLookup] = useState<CodeLookupResult | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState(false);

  // Student profile state
  const [submitting, setSubmitting] = useState(false);
  const [duplicateStudent, setDuplicateStudent] = useState<StudentRow | null>(null);

  // Remember last used code
  useEffect(() => {
    const lastCode = localStorage.getItem('lastTestCode');
    if (lastCode) {
      setTestCode(lastCode);
    }
  }, []);

  // Lookup code when input changes (debounced)
  const doLookup = useCallback(async (code: string) => {
    if (code.trim().length < 3) {
      setCodeLookup(null);
      setCodeError(false);
      return;
    }
    setCodeChecking(true);
    const result = await lookupCode(code);
    setCodeLookup(result);
    setCodeError(!result && code.trim().length >= 6);
    setCodeChecking(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doLookup(testCode), 400);
    return () => clearTimeout(timer);
  }, [testCode, doLookup]);

  const codeValid = !!codeLookup;
  const canStart = !!name.trim() && codeValid && !submitting;

  // Code status message
  const codeStatusText = () => {
    if (codeChecking) return '확인 중...';
    if (codeLookup?.type === 'class') {
      return `✅ ${codeLookup.academy.name} · ${codeLookup.classData?.name}`;
    }
    if (codeLookup?.type === 'academy') {
      return `✅ ${codeLookup.academy.name}`;
    }
    if (codeError) return '유효하지 않은 코드입니다.';
    return '선생님께 받은 코드를 입력해 주세요.';
  };

  const codeStatusColor = () => {
    if (codeLookup) return 'text-sb-correct-dark';
    if (codeError) return 'text-sb-orange';
    return 'text-sb-muted';
  };

  const handleStart = async () => {
    if (!canStart || !codeLookup) return;

    setSubmitting(true);
    const academyId = codeLookup.academy.id;

    try {
      // Find existing student in this academy
      const existing = await findStudent(name.trim(), academyId);

      if (existing) {
        // Show duplicate confirmation modal
        setDuplicateStudent(existing);
        setSubmitting(false);
        return;
      }

      // No existing student — create new profile
      await startWithNewProfile(academyId);
    } catch {
      setSubmitting(false);
    }
  };

  const handleConfirmExisting = async () => {
    if (!duplicateStudent || !codeLookup) return;
    setSubmitting(true);
    setDuplicateStudent(null);

    const academyId = codeLookup.academy.id;
    const studentId = duplicateStudent.id;

    // If entered via class code, add to class
    if (codeLookup.type === 'class' && codeLookup.classData) {
      await addStudentToClass(codeLookup.classData.id, studentId);
    }

    localStorage.setItem('lastTestCode', testCode.trim().toUpperCase());
    setSubmitting(false);
    onStart(name.trim(), selected, studentId, academyId);
  };

  const startWithNewProfile = async (academyId: string) => {
    setSubmitting(true);
    setDuplicateStudent(null);

    const student = await createStudentProfile(name.trim(), academyId);
    if (!student) {
      setSubmitting(false);
      return;
    }

    // If entered via class code, add to class
    if (codeLookup?.type === 'class' && codeLookup.classData) {
      await addStudentToClass(codeLookup.classData.id, student.id);
    }

    localStorage.setItem('lastTestCode', testCode.trim().toUpperCase());
    setSubmitting(false);
    onStart(name.trim(), selected, student.id, academyId);
  };

  // ── Code input border style ──
  const codeBorderClass = codeLookup
    ? 'border-[1.5px] border-sb-primary shadow-[0_0_0_4px_#E8F9FA]'
    : codeError
    ? 'border-[1.5px] border-sb-orange shadow-[0_0_0_4px_#FFF3E0]'
    : 'border-[1.5px] border-sb-line';

  return (
    <div className="bg-sb-bg">
      {/* ── Duplicate Name Modal ── */}
      {duplicateStudent && codeLookup && (
        <DuplicateModal
          student={duplicateStudent}
          onConfirm={handleConfirmExisting}
          onNewProfile={() => startWithNewProfile(codeLookup.academy.id)}
        />
      )}

      {/* ── Mobile / Tablet ── */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <header className="bg-sb-surface border-b border-sb-line h-14 px-7 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-xs font-extrabold -tracking-tight">T</div>
            <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
            <div className="w-px h-3 bg-sb-line" />
            <span className="text-xs text-sb-muted font-medium">· 종합테스트</span>
          </div>
          <a href={`${import.meta.env.BASE_URL}?admin=true`} className="text-xs text-sb-muted hover:text-sb-primary-dark whitespace-nowrap">
            <span className="md:hidden">선생님 →</span>
            <span className="hidden md:inline">선생님 페이지 →</span>
          </a>
        </header>

        <div className="flex-1 px-6 md:px-14 pt-8 md:pt-12 pb-7 flex flex-col max-w-xl w-full mx-auto">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-sb-primary-pale text-sb-primary-dark rounded-full text-[11px] font-bold tracking-[0.18em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-sb-primary" />
            VOCABULARY ASSESSMENT
          </div>
          <h1 className="text-[28px] md:text-4xl font-extrabold text-sb-primary-dark -tracking-tight leading-[1.2] mb-3 [word-break:keep-all]">
            종합테스트를<br className="md:hidden" /> 시작합니다.
          </h1>
          <p className="text-sm text-sb-ink-mid leading-relaxed mb-10">
            <span className="md:hidden">이름과 레벨을 확인한 뒤 시작 버튼을 눌러 주세요. 제한시간은 없습니다.</span>
            <span className="hidden md:inline">응시자 이름과 레벨을 확인한 뒤 [시작하기]를 눌러 주세요.<br />제한시간은 없으며, 중간 저장되지 않습니다.</span>
          </p>

          {/* Step 1: Name */}
          <div className="mb-7">
            <label className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2 tracking-wide">
              <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">1</span>
              학생 이름 <span className="text-sb-orange">*</span>
            </label>
            <div className={`bg-sb-surface rounded-xl transition-all duration-150 ${name ? 'border-[1.5px] border-sb-primary shadow-[0_0_0_4px_#E8F9FA]' : 'border-[1.5px] border-sb-line'}`}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김민준"
                className="w-full text-lg font-semibold text-sb-ink border-none px-[18px] py-4 bg-transparent outline-none rounded-xl"
              />
            </div>
            <p className="text-[11px] text-sb-muted mt-1.5">학생증 또는 출석부의 이름 그대로 입력해 주세요.</p>
          </div>

          {/* Step 2: Code */}
          <div className="mb-7">
            <label className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2 tracking-wide">
              <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">2</span>
              응시 코드 <span className="text-sb-orange">*</span>
            </label>
            <div className={`bg-sb-surface rounded-xl transition-all duration-150 ${codeBorderClass}`}>
              <input
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="응시 코드를 입력하세요"
                className="w-full text-lg font-semibold text-sb-ink border-none px-[18px] py-4 bg-transparent outline-none rounded-xl uppercase tracking-widest"
              />
            </div>
            <p className={`text-[11px] mt-1.5 ${codeStatusColor()}`}>{codeStatusText()}</p>
          </div>

          {/* Step 3: Level */}
          <div className="mb-9">
            <div className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2.5 tracking-wide">
              <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">3</span>
              레벨 선택
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {LEVELS.map(lv => (
                <LevelCard key={lv.id} lv={lv} on={selected === lv.id} onClick={() => setSelected(lv.id)} />
              ))}
            </div>
          </div>

          <div className="flex-1" />

          <button
            disabled={!canStart}
            onClick={handleStart}
            className={`w-full h-[60px] rounded-2xl text-[15px] font-extrabold -tracking-tight transition-all duration-150 ${
              canStart ? 'bg-sb-primary-dark text-white shadow-[0_8px_24px_rgba(27,122,132,0.2)] hover:bg-sb-ink cursor-pointer' : 'bg-sb-surface-alt text-sb-muted cursor-not-allowed'
            }`}
          >
            {submitting ? '준비 중...' : '시작하기 →'}
          </button>
          <p className="text-[11px] text-sb-muted text-center mt-3">시작 후에는 페이지를 새로 고치지 마세요.</p>
        </div>
      </div>

      {/* ── Desktop: Hero Split 60/40 ── */}
      <div className="hidden lg:grid lg:grid-cols-[1.2fr_1fr] min-h-screen">
        {/* LEFT — Hero */}
        <div className="relative overflow-hidden border-r border-sb-line px-16 py-14 flex flex-col justify-between
                        bg-gradient-to-br from-sb-primary-pale to-sb-primary-paler">
          <div className="absolute -right-32 -top-20 w-[360px] h-[360px] rounded-full bg-[#A8E6E8]/35 blur-[2px]" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-sb-primary-dark rounded-full
                            text-[11px] font-extrabold tracking-[0.18em] border border-sb-primary-light mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-sb-primary" />
              VOCABULARY ASSESSMENT
            </div>
            <h1 className="text-[56px] font-extrabold tracking-tight leading-[1.1] text-sb-primary-dark mb-5">
              종합테스트를<br />시작합니다.
            </h1>
            <p className="text-base text-sb-ink-mid leading-[1.65] max-w-[420px]">
              응시자 이름과 레벨을 확인한 뒤<br />
              [시작하기]를 눌러 주세요. 제한시간은 없습니다.
            </p>
          </div>

          <RecentScoresStrip name={name} />
        </div>

        {/* RIGHT — Form */}
        <div className="px-16 py-14 flex flex-col">
          <div className="flex items-center justify-between mb-7">
            <div className="text-xs font-extrabold tracking-[0.22em] text-sb-primary-dark">
              START · 응시 정보 입력
            </div>
            <a href={`${import.meta.env.BASE_URL}?admin=true`} className="text-xs text-sb-muted hover:text-sb-primary-dark">
              선생님 페이지 →
            </a>
          </div>

          {/* Step 1: Name */}
          <div className="mb-7">
            <label className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2 tracking-wide">
              <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">1</span>
              학생 이름 <span className="text-sb-orange">*</span>
            </label>
            <div className={`bg-sb-surface rounded-xl transition-all duration-150 ${name ? 'border-[1.5px] border-sb-primary shadow-[0_0_0_4px_#E8F9FA]' : 'border-[1.5px] border-sb-line'}`}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김민준"
                className="w-full text-lg font-semibold text-sb-ink border-none px-[18px] py-4 bg-transparent outline-none rounded-xl"
              />
            </div>
            <p className="text-[11px] text-sb-muted mt-1.5">학생증 또는 출석부의 이름 그대로 입력해 주세요.</p>
          </div>

          {/* Step 2: Code */}
          <div className="mb-7">
            <label className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2 tracking-wide">
              <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">2</span>
              응시 코드 <span className="text-sb-orange">*</span>
            </label>
            <div className={`bg-sb-surface rounded-xl transition-all duration-150 ${codeBorderClass}`}>
              <input
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="응시 코드를 입력하세요"
                className="w-full text-lg font-semibold text-sb-ink border-none px-[18px] py-4 bg-transparent outline-none rounded-xl uppercase tracking-widest"
              />
            </div>
            <p className={`text-[11px] mt-1.5 ${codeStatusColor()}`}>{codeStatusText()}</p>
          </div>

          {/* Step 3: Level */}
          <div className="mb-9">
            <div className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2.5 tracking-wide">
              <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">3</span>
              레벨 선택
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {LEVELS.map(lv => (
                <LevelCard key={lv.id} lv={lv} on={selected === lv.id} onClick={() => setSelected(lv.id)} />
              ))}
            </div>
          </div>

          <div className="flex-1" />

          <button
            disabled={!canStart}
            onClick={handleStart}
            className={`w-full h-[60px] rounded-[14px] text-base font-extrabold transition-all duration-150 ${
              canStart
                ? 'bg-sb-primary-dark text-white shadow-[0_8px_24px_rgba(27,122,132,0.22)] hover:bg-sb-ink cursor-pointer'
                : 'bg-sb-surface-alt text-sb-muted cursor-not-allowed'
            }`}
          >
            {submitting ? '준비 중...' : '시작하기 →'}
          </button>
          <p className="text-[11px] text-sb-muted text-center mt-3">시작 후에는 페이지를 새로 고치지 마세요.</p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
