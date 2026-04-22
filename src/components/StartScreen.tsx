import { useState } from 'react';

interface Props {
  onStart: (name: string, levelGroup: '1-2' | '3-4' | '5-6') => void;
}

const LEVELS = [
  { id: '1-2' as const, title: 'LV 1–2', desc: '기초 단어 종합', count: 60 },
  { id: '3-4' as const, title: 'LV 3–4', desc: '중급 단어 종합', count: 60 },
  { id: '5-6' as const, title: 'LV 5–6', desc: '고급 단어 종합', count: 60 },
];

export default function StartScreen({ onStart }: Props) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<'1-2' | '3-4' | '5-6'>('3-4');

  const canStart = !!name.trim();

  return (
    <div className="min-h-screen bg-sb-bg flex flex-col">
      {/* Header */}
      <header className="bg-sb-surface border-b border-sb-line h-14 px-7 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sb-primary to-sb-primary-dark flex items-center justify-center text-white text-xs font-extrabold -tracking-tight">T</div>
          <span className="text-sm font-extrabold text-sb-ink -tracking-tight">TES VOCA</span>
          <div className="w-px h-3 bg-sb-line" />
          <span className="text-xs text-sb-muted font-medium">· 종합테스트</span>
        </div>
        <a
          href={`${import.meta.env.BASE_URL}?admin=true`}
          className="text-xs text-sb-muted hover:text-sb-primary-dark"
        >
          선생님 페이지 →
        </a>
      </header>

      <div className="flex-1 px-14 pt-12 pb-7 flex flex-col max-w-xl w-full mx-auto">
        <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-sb-primary-pale text-sb-primary-dark rounded-full text-[11px] font-bold tracking-[0.18em] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-sb-primary" />
          VOCABULARY ASSESSMENT
        </div>

        <h1 className="text-4xl font-extrabold text-sb-primary-dark -tracking-tight leading-tight mb-3">
          종합테스트를 시작합니다.
        </h1>
        <p className="text-sm text-sb-ink-mid leading-relaxed mb-10">
          응시자 이름과 레벨을 확인한 뒤 [시작하기]를 눌러 주세요.
          <br />
          제한시간은 없으며, 중간 저장되지 않습니다.
        </p>

        {/* Name */}
        <div className="mb-7">
          <label className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2 tracking-wide">
            <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">1</span>
            학생 이름 <span className="text-sb-orange">*</span>
          </label>
          <div
            className={`bg-sb-surface rounded-xl transition-all duration-150 ${
              name ? 'border-[1.5px] border-sb-primary shadow-[0_0_0_4px_#E8F9FA]' : 'border-[1.5px] border-sb-line'
            }`}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김민준"
              className="w-full text-lg font-semibold text-sb-ink border-none px-[18px] py-4 bg-transparent outline-none rounded-xl"
            />
          </div>
          <p className="text-[11px] text-sb-muted mt-1.5">학생증 또는 출석부의 이름 그대로 입력해 주세요.</p>
        </div>

        {/* Level */}
        <div className="mb-9">
          <div className="flex items-center gap-2 text-xs font-bold text-sb-ink mb-2.5 tracking-wide">
            <span className="w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[10px] font-extrabold flex items-center justify-center">2</span>
            레벨 선택
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {LEVELS.map((lv) => {
              const on = selected === lv.id;
              return (
                <button
                  key={lv.id}
                  onClick={() => setSelected(lv.id)}
                  className={`relative p-[18px_16px] rounded-xl border-[1.5px] transition-all duration-150 text-left ${
                    on
                      ? 'bg-sb-primary-pale border-sb-primary'
                      : 'bg-sb-surface border-sb-line hover:border-sb-primary-light'
                  }`}
                >
                  <div className={`text-[22px] font-extrabold -tracking-tight ${on ? 'text-sb-primary-dark' : 'text-sb-ink'}`}>
                    {lv.title}
                  </div>
                  <div className="text-xs text-sb-muted mt-0.5">{lv.desc}</div>
                  <div className={`mt-3.5 text-[10px] font-bold tracking-[0.14em] ${on ? 'text-sb-primary-dark' : 'text-sb-muted'}`}>
                    {lv.count} QUESTIONS
                  </div>
                  {on && (
                    <div className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-sb-primary text-white text-[11px] font-extrabold flex items-center justify-center">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1" />

        <button
          disabled={!canStart}
          onClick={() => canStart && onStart(name.trim(), selected)}
          className={`w-full h-[60px] rounded-2xl text-[15px] font-extrabold -tracking-tight transition-all duration-150 ${
            canStart
              ? 'bg-sb-primary-dark text-white shadow-[0_8px_24px_rgba(27,122,132,0.2)] hover:bg-sb-ink cursor-pointer'
              : 'bg-sb-surface-alt text-sb-muted cursor-not-allowed'
          }`}
        >
          시작하기 →
        </button>
        <p className="text-[11px] text-sb-muted text-center mt-3">
          시작 후에는 페이지를 새로 고치지 마세요.
        </p>
      </div>
    </div>
  );
}
