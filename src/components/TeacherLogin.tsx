import { useState } from 'react';

const TEACHER_PASSWORD = 'tes1234';

interface Props {
  onLogin: () => void;
}

export default function TeacherLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === TEACHER_PASSWORD) {
      sessionStorage.setItem('teacher_auth', 'true');
      onLogin();
    } else {
      setError(true);
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">선생님 페이지</h1>
          <p className="text-sm text-slate-400 mt-1">TES VOCA 성적 관리</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${shake ? 'animate-shake' : ''}`}
          style={shake ? { animation: 'shake 0.4s ease' } : {}}
        >
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            placeholder="비밀번호를 입력하세요"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border-2 text-lg transition-colors outline-none mb-4 ${
              error
                ? 'border-red-300 bg-red-50 focus:border-red-400'
                : 'border-slate-200 focus:border-indigo-400'
            }`}
          />
          {error && (
            <p className="text-sm text-red-500 mb-4 -mt-2">비밀번호가 틀렸습니다.</p>
          )}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-colors"
          >
            로그인
          </button>
        </form>

        <a href={import.meta.env.BASE_URL} className="block text-center text-xs text-slate-300 hover:text-slate-400 mt-6 transition-colors">
          학생 페이지로 돌아가기
        </a>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
