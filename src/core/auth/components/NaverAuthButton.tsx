import { Loader2 } from 'lucide-react';

/** 네이버 원형 OAuth 버튼 (공식 에셋 없음 → 인라인 N 마크) */
export function NaverAuthButton({
  mode,
  loading,
  onClick,
}: {
  mode: 'login' | 'signup';
  loading?: boolean;
  onClick: () => void;
}) {
  const ariaLabel = mode === 'signup' ? '네이버로 가입' : '네이버로 로그인';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center w-12 h-12 min-w-[44px] min-h-[44px] rounded-full bg-[#03C75A] text-white shadow-sm transition-all hover:bg-[#02b350] hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03C75A] focus-visible:ring-offset-2 disabled:opacity-60 disabled:hover:scale-100"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        ) : (
          <span className="text-[1.125rem] font-black leading-none tracking-tight" aria-hidden>
            N
          </span>
        )}
      </button>
      <span className="text-xs font-semibold text-slate-600" aria-hidden>
        네이버
      </span>
    </div>
  );
}
