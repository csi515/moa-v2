import { Loader2 } from 'lucide-react';

/** 카카오 공식 노란색 버튼 */
export function KakaoAuthButton({
  mode,
  loading,
  onClick,
}: {
  mode: 'login' | 'signup';
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full min-h-[48px] py-3 rounded-xl bg-[#FEE500] hover:bg-[#F5DC00] disabled:opacity-60 text-[#191919] font-bold text-sm flex items-center justify-center gap-2.5 transition-colors shadow-xs"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <KakaoSpeechIcon className="w-5 h-5" />
      )}
      {mode === 'signup' ? '카카오로 시작하기' : '카카오로 로그인'}
    </button>
  );
}

function KakaoSpeechIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.9 5.33 4.74 6.72-.15.55-.96 3.48-.99 3.72 0 0-.02.17.09.24.11.07.24.02.24.02.32-.04 3.68-2.41 4.26-2.82.54.08 1.1.12 1.66.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
    </svg>
  );
}
