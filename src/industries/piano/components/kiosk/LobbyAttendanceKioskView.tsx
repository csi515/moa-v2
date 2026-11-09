import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Delete,
  CheckCircle2,
  Lock,
  X,
  Volume2,
  Sparkles,
  Music,
} from 'lucide-react';
import {
  processKioskCheckin,
  verifyMasterExitPin,
  type KioskAttendanceResult,
  type KioskStudentMatch,
} from './kioskPinEngine';

interface LobbyAttendanceKioskViewProps {
  onExitKiosk: () => void;
  students?: KioskStudentMatch[];
  academyName?: string;
}

export const LobbyAttendanceKioskView: React.FC<LobbyAttendanceKioskViewProps> = ({
  onExitKiosk,
  students = [],
  academyName = '모아 음악학원',
}) => {
  const [pin, setPin] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [result, setResult] = useState<KioskAttendanceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 관리자 탈출 모달 상태
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);

  // 실시간 시계 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 번호 패드 입력
  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        setErrorMessage(null);

        // 4자리 완성 시 자동 출석 확인
        if (nextPin.length === 4) {
          const res = processKioskCheckin(nextPin, students);
          if (res.success) {
            setResult(res);
            setPin('');
            // 3.5초 후 결과 창 자동 해제
            setTimeout(() => {
              setResult(null);
            }, 3500);
          } else {
            setErrorMessage(res.message);
            setTimeout(() => {
              setPin('');
              setErrorMessage(null);
            }, 1500);
          }
        }
      }
    },
    [pin, students]
  );

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setErrorMessage(null);
  }, []);

  // 관리자 탈출 검증
  const handleVerifyExit = () => {
    if (verifyMasterExitPin(adminPin)) {
      onExitKiosk();
    } else {
      setAdminPinError(true);
      setAdminPin('');
    }
  };

  const formattedDate = currentTime.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const formattedTime = currentTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-12 select-none overflow-hidden font-sans">
      {/* 상단 바: 학원 이름, 실시간 날짜/시계, 관리자 탈출 버튼 */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {academyName}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-300 font-medium">
              원생 로비 출결 키오스크
            </p>
          </div>
        </div>

        {/* 실시간 시계 */}
        <div className="text-right flex items-center gap-4">
          <div className="hidden sm:block">
            <p className="text-xs text-slate-400 font-medium">{formattedDate}</p>
            <p className="text-2xl font-black text-indigo-400 tracking-wider">
              {formattedTime}
            </p>
          </div>

          {/* 관리자 모드 종료 버튼 (우측 상단 자물쇠) */}
          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="키오스크 관리자 탈출"
            aria-label="관리자 모드 종료"
          >
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 중앙 메인: 4자리 입력 인디케이터 + 3x4 키패드 */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
            출석 번호를 입력해주세요
          </h2>
          <p className="text-slate-400 text-sm">
            등록된 전화번호 뒷 4자리 또는 고유 PIN 번호
          </p>
        </div>

        {/* 4자리 원형 인디케이터 */}
        <div className="flex items-center gap-4 mb-8">
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black transition-all duration-150 border-2 ${
                  hasDigit
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-105'
                    : 'bg-slate-900 border-slate-800 text-slate-600'
                }`}
              >
                {hasDigit ? pin[idx] : '•'}
              </div>
            );
          })}
        </div>

        {/* 오류 안내 메시지 */}
        {errorMessage && (
          <div className="mb-4 text-rose-400 font-bold text-sm bg-rose-950/60 border border-rose-800/80 px-4 py-2 rounded-xl animate-shake">
            {errorMessage}
          </div>
        )}

        {/* 3x4 숫자 키패드 */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-16 sm:h-20 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-indigo-600/80 hover:border-indigo-500 text-2xl sm:text-3xl font-bold text-white transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 sm:h-20 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-base font-bold text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 sm:h-20 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-indigo-600/80 hover:border-indigo-500 text-2xl sm:text-3xl font-bold text-white transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-16 sm:h-20 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            aria-label="한 글자 지우기"
          >
            <Delete className="w-7 h-7" />
          </button>
        </div>
      </main>

      {/* 하단 푸터 */}
      <footer className="text-center text-xs text-slate-600 border-t border-slate-900 pt-4">
        © MOA Academy Kiosk Engine • 터치 스크린 전용 가속 모드
      </footer>

      {/* 출석 성공 환영 팝업 모달 */}
      {result && result.success && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-indigo-500/50 rounded-3xl p-8 sm:p-12 max-w-md w-full text-center shadow-2xl shadow-indigo-500/30">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              등원 확인 완료
            </div>

            <h3 className="text-3xl sm:text-4xl font-black text-white mb-2">
              {result.studentName} 원생
            </h3>
            <p className="text-lg text-emerald-300 font-semibold mb-6">
              오늘도 즐겁고 힘차게 연습해봐요! 🎵
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300">
              <div className="flex justify-between py-1">
                <span className="text-slate-400">등원 시각:</span>
                <span className="font-bold text-white">{result.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-800/80 mt-1">
                <span className="text-slate-400">보호자 알림톡:</span>
                <span className="text-emerald-400 font-semibold">자동 전송됨</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-6">
              잠시 후 키오스크 화면이 자동으로 준비 상태로 돌아갑니다.
            </p>
          </div>
        </div>
      )}

      {/* 관리자 탈출 확인 모달 */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Lock className="w-5 h-5 text-indigo-400" />
                관리자 키오스크 탈출
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false);
                  setAdminPin('');
                  setAdminPinError(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              키오스크를 종료하고 원장/강사 관리자 화면으로 돌아가려면 관리자 마스터 PIN(기본 9999)을 입력하세요.
            </p>

            <input
              type="password"
              maxLength={4}
              value={adminPin}
              onChange={(e) => {
                setAdminPin(e.target.value);
                setAdminPinError(false);
              }}
              placeholder="마스터 PIN 4자리"
              className="w-full text-center text-2xl tracking-widest bg-slate-950 border border-slate-800 rounded-xl py-3 text-white focus:outline-none focus:border-indigo-500 mb-2 font-mono"
              autoFocus
            />

            {adminPinError && (
              <p className="text-xs text-rose-400 font-semibold mb-4 text-center">
                마스터 PIN이 일치하지 않습니다.
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false);
                  setAdminPin('');
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleVerifyExit}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors"
              >
                종료 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
