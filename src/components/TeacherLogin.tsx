import { useState } from 'react';
import { teacherLoginWithGoogle } from '../lib/supabase';

interface Props {
  onLogin: () => void;
  denied?: boolean;
}

export default function TeacherLogin({ onLogin: _onLogin, denied: deniedProp }: Props) {
  const [loading, setLoading] = useState(false);
  const denied = deniedProp ?? false;

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await teacherLoginWithGoogle();
    if (error) {
      console.error('Google login error:', error);
      setLoading(false);
    }
    // Redirect happens automatically — onLogin is called from AdminPage after session check
  };

  return (
    <div className="min-h-screen bg-sb-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sb-primary to-sb-primary-dark mb-4 shadow-lg">
            <span className="text-3xl">👨‍🏫</span>
          </div>
          <h1 className="text-2xl font-extrabold text-sb-ink">선생님 페이지</h1>
          <p className="text-sm text-sb-muted mt-1">TES VOCA 성적 관리</p>
        </div>

        {/* Login Card */}
        <div className="bg-sb-surface rounded-2xl shadow-sm border border-sb-line p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sb-primary-pale text-sb-primary-dark rounded-full text-[11px] font-bold tracking-[0.14em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-sb-primary" />
            관리자 전용
          </div>

          {denied && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              접근 권한이 없습니다. 테스영어학원 원장님께 문의해 주세요.
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border-2 border-sb-line rounded-xl
                       text-base font-semibold text-sb-ink hover:border-sb-primary hover:shadow-md
                       transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {loading ? '로그인 중...' : 'Google로 로그인'}
          </button>

          <div className="mt-4 p-3 bg-sb-surface-alt rounded-xl text-xs text-sb-muted text-center">
            🔒 Google 인증으로 안전하게 로그인됩니다
          </div>
        </div>

        <a
          href={import.meta.env.BASE_URL}
          className="block text-center text-xs text-sb-muted hover:text-sb-primary-dark mt-6 transition-colors"
        >
          학생 페이지로 돌아가기
        </a>
      </div>
    </div>
  );
}
