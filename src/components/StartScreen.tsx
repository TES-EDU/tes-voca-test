import { useState } from 'react';

interface Props {
  onStart: (name: string, levelGroup: '1-2' | '3-4' | '5-6') => void;
}

const TESTS = [
  {
    id: '1-2' as const,
    emoji: '📘',
    title: 'LV 1-2 테스트',
    desc: '기초 단어 종합',
    color: 'from-blue-500 to-indigo-600',
    border: 'border-blue-200 hover:border-blue-400',
    bg: 'hover:bg-blue-50',
  },
  {
    id: '3-4' as const,
    emoji: '📗',
    title: 'LV 3-4 테스트',
    desc: '중급 단어 종합',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200 hover:border-emerald-400',
    bg: 'hover:bg-emerald-50',
  },
  {
    id: '5-6' as const,
    emoji: '📕',
    title: 'LV 5-6 테스트',
    desc: '고급 단어 종합',
    color: 'from-red-500 to-rose-600',
    border: 'border-red-200 hover:border-red-400',
    bg: 'hover:bg-red-50',
  },
];

export default function StartScreen({ onStart }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 mb-4 shadow-lg">
          <span className="text-4xl">📚</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">TES VOCA</h1>
        <p className="text-xl text-slate-500 mt-1 font-medium">종합테스트</p>
      </div>

      {/* Name Input */}
      <div className="w-full max-w-md mb-8">
        <label className="block text-sm font-semibold text-slate-600 mb-2">
          학생 이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none transition-colors bg-white shadow-sm"
        />
      </div>

      {/* Test Cards */}
      <div className="w-full max-w-md space-y-4">
        {TESTS.map((test) => (
          <button
            key={test.id}
            onClick={() => name.trim() && onStart(name.trim(), test.id)}
            disabled={!name.trim()}
            className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl border-2 bg-white shadow-sm transition-all duration-200
              ${name.trim() ? `${test.border} ${test.bg} cursor-pointer active:scale-[0.98]` : 'border-slate-100 opacity-50 cursor-not-allowed'}
            `}
          >
            <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${test.color} flex items-center justify-center shadow-md`}>
              <span className="text-2xl">{test.emoji}</span>
            </div>
            <div className="text-left flex-1">
              <div className="text-lg font-bold text-slate-800">{test.title}</div>
              <div className="text-sm text-slate-500">{test.desc}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-slate-700">120</div>
              <div className="text-xs text-slate-400">문제</div>
            </div>
          </button>
        ))}
      </div>

      {!name.trim() && (
        <p className="mt-6 text-sm text-slate-400">이름을 입력하면 테스트를 시작할 수 있어요.</p>
      )}

      <a
        href={`${import.meta.env.BASE_URL}?admin=true`}
        className="mt-10 text-xs text-slate-300 hover:text-slate-400 transition-colors"
      >
        선생님 페이지
      </a>
    </div>
  );
}
