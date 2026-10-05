/**
 * Workspace URL tab synchronization hook.
 *
 * 브라우저 URL 경로(/workspace/:tab 또는 ?tab=...)와 인메모리 네비게이션 세션(activeTab) 간의
 * 양방향 동기화를 제공하여 새로고침 시 상태 유지 및 브라우저 뒤로가기/앞으로가기 지원을 위한 토대를 마련합니다.
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { NavTab } from './navigationTypes';
import { useNavSession } from './navSession';

export interface UseUrlTabSyncOptions {
  /** URL 갱신 시 push 대신 replace를 사용할지 여부 (기본값: false) */
  replace?: boolean;
  /** 동기화 활성화 여부 (기본값: true) */
  enabled?: boolean;
}

export function useUrlTabSync(options: UseUrlTabSyncOptions = {}) {
  const { replace = false, enabled = true } = options;
  const { activeTab, setActiveTab } = useNavSession();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const isUpdatingRef = useRef(false);

  // 1. URL 변경 시 -> activeTab 동기화
  useEffect(() => {
    if (!enabled) return;

    // URL path param (/workspace/:tab) 또는 query param (?tab=...) 확인
    const urlTab = params.tab || new URLSearchParams(location.search).get('tab');
    if (urlTab && urlTab !== activeTab) {
      isUpdatingRef.current = true;
      setActiveTab(urlTab as NavTab);
      // 플래그 리셋은 마이크로태스크 또는 다음 틱
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [location.pathname, location.search, params.tab, enabled, activeTab, setActiveTab]);

  // 2. activeTab 변경 시 -> URL 반영 (/workspace/:tab 경로일 때)
  useEffect(() => {
    if (!enabled || isUpdatingRef.current) return;

    if (location.pathname.startsWith('/workspace')) {
      const targetPath = `/workspace/${activeTab}`;
      if (location.pathname !== targetPath) {
        navigate(targetPath, { replace });
      }
    }
  }, [activeTab, enabled, location.pathname, navigate, replace]);
}
