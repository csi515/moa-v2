import React, { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuth } from '@/core/auth/AuthProvider';
import type { SandboxRole, SandboxRoleOption, SandboxIndustryOption } from './types';

export const SANDBOX_ROLES: SandboxRoleOption[] = [
  { role: 'owner', label: '원장/사업주', badgeColor: 'bg-slate-100 text-purple-800 border-slate-200' },
  { role: 'admin', label: '운영관리자', badgeColor: 'bg-slate-100 text-indigo-800 border-slate-200' },
  { role: 'staff', label: '강사/직원', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { role: 'customer', label: '고객/수강생', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { role: 'parent', label: '학부모 포털', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
];

export const SANDBOX_INDUSTRIES: SandboxIndustryOption[] = [
  { code: 'piano', name: '피아노 음악학원', customerTerm: '원생' },
  { code: 'bath', name: '반려동물 목욕·미용', customerTerm: '반려동물' },
  { code: 'pilates', name: '필라테스 스튜디오', customerTerm: '회원' },
  { code: 'retail', name: '소매/POS 유통', customerTerm: '고객' },
  { code: 'academy', name: '보습/입시학원', customerTerm: '수강생' },
];

/**
 * Moa-v2 Visual DevTools Sandbox 바 (<DevToolsSandboxBar />)
 *
 * 개발 환경(import.meta.env.DEV)에서만 활성화되는 플로팅 샌드박스 툴바:
 * 1. 5대 역할(Role) 원클릭 즉시 스위칭 및 권한 테스트
 * 2. 70개 업종(Industry) 원클릭 스위칭 및 맞춤 용어 실시간 검증
 * 3. 오프라인(Offline) 모의 및 네트워크 지연(Throttling) 테스트
 * 4. 단축키: Ctrl + Shift + D 로 토글
 */
export function DevToolsSandboxBar() {
  // 프로덕션 빌드 시 번들 크기 0, 런타임 제로 가드레일
  if (!import.meta.env.DEV) {
    return null;
  }

  const {
    currentOrganization,
    enterParentPortal,
    exitParentPortal,
    enterCustomerPortal,
    exitCustomerPortal,
  } = useOrganization();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<SandboxRole>(() => {
    return (sessionStorage.getItem('moa_sandbox_role') as SandboxRole) || 'owner';
  });
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isThrottled, setIsThrottled] = useState<boolean>(false);

  // 단축키 (Ctrl + Shift + D) 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 역할 스위칭 핸들러
  const handleRoleChange = useCallback(
    (role: SandboxRole) => {
      setActiveRole(role);
      sessionStorage.setItem('moa_sandbox_role', role);

      if (role === 'parent') {
        enterParentPortal();
      } else if (role === 'customer') {
        enterCustomerPortal();
      } else {
        exitParentPortal();
        exitCustomerPortal();
      }

      // 개발 모드 역할 변경 알림 커스텀 이벤트
      window.dispatchEvent(new CustomEvent('moa:sandbox-role-change', { detail: { role } }));
    },
    [enterParentPortal, exitParentPortal, enterCustomerPortal, exitCustomerPortal]
  );

  // 업종 스위칭 핸들러
  const handleIndustryChange = useCallback(
    (industryCode: string) => {
      if (!currentOrganization) return;
      sessionStorage.setItem('moa_sandbox_industry', industryCode);
      window.dispatchEvent(
        new CustomEvent('moa:sandbox-industry-change', { detail: { industry: industryCode } })
      );
    },
    [currentOrganization]
  );

  // 오프라인 모의 토글
  const handleToggleOffline = useCallback(() => {
    setIsOffline((prev) => {
      const next = !prev;
      if (next) {
        window.dispatchEvent(new Event('offline'));
      } else {
        window.dispatchEvent(new Event('online'));
      }
      return next;
    });
  }, []);

  // 네트워크 지연 모의 토글
  const handleToggleThrottle = useCallback(() => {
    setIsThrottled((prev) => {
      const next = !prev;
      sessionStorage.setItem('moa_sandbox_throttle', next ? 'true' : 'false');
      return next;
    });
  }, []);

  const currentRoleObj = SANDBOX_ROLES.find((r) => r.role === activeRole) || SANDBOX_ROLES[0];
  const currentIndustryObj =
    SANDBOX_INDUSTRIES.find((i) => i.code === (currentOrganization?.industry_type || 'piano')) ||
    SANDBOX_INDUSTRIES[0];

  return (
    <aside
      aria-label="Moa DevTools Sandbox"
      className="fixed bottom-4 right-4 z-[9999] select-none font-sans text-xs"
    >
      {/* 1. 미니멀 플로팅 트리거 배지 */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 text-white px-3 py-2 rounded-full shadow-lg border border-slate-700/60 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95"
          title="Moa DevTools Sandbox 열기 (Ctrl+Shift+D)"
        >
          <span className="text-sm">🛠️</span>
          <span className="font-semibold tracking-wide">DevTools</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentRoleObj.badgeColor}`}>
            {currentRoleObj.role.toUpperCase()}
          </span>
          {isOffline && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="오프라인 모의 중" />
          )}
        </button>
      )}

      {/* 2. 펼쳐진 DevTools 대시보드 패널 */}
      {isOpen && (
        <div className="w-[340px] bg-slate-900/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* 헤더 */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-base">🛠️</span>
              <span className="font-bold text-slate-100 text-sm">Visual DevTools Sandbox</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="닫기 (Ctrl+Shift+D)"
            >
              ✕
            </button>
          </div>

          {/* 역할 스위처 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span>역할(Role) 즉시 시뮬레이션</span>
              <span className="text-[10px] text-slate-500">RLS/화면 즉시 반영</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SANDBOX_ROLES.map((r) => {
                const isSelected = activeRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleRoleChange(r.role)}
                    className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white font-bold ring-2 ring-indigo-400/50 shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 업종 스위처 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span>업종(Industry) 퀵 전환</span>
              <span className="text-[10px] text-emerald-400 font-medium">
                고객용어: '{currentIndustryObj.customerTerm}'
              </span>
            </div>
            <select
              value={currentIndustryObj.code}
              onChange={(e) => handleIndustryChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
            >
              {SANDBOX_INDUSTRIES.map((ind) => (
                <option key={ind.code} value={ind.code}>
                  {ind.name} ({ind.code})
                </option>
              ))}
            </select>
          </div>

          {/* 네트워크 모의 & 지연 제어 */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800">
            <div className="text-slate-400 font-medium pb-0.5">네트워크 및 안정성 모의</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleToggleOffline}
                className={`py-1.5 px-2 rounded-lg font-medium border transition-colors flex items-center justify-center space-x-1.5 ${
                  isOffline
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>{isOffline ? '📡 오프라인 ON' : '📶 온라인 정상'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleThrottle}
                className={`py-1.5 px-2 rounded-lg font-medium border transition-colors flex items-center justify-center space-x-1.5 ${
                  isThrottled
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>{isThrottled ? '🐢 1.5s 지연 ON' : '⚡ 지연 없음'}</span>
              </button>
            </div>
          </div>

          {/* 하단 단축키 및 상태 정보 */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <span>단축키: Ctrl + Shift + D</span>
            <span>
              {user ? user.email || '인증됨' : '비로그인'} |{' '}
              {currentOrganization?.name || '테넌트 없음'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
