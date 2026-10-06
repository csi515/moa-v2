import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useNavSession } from '@/shared/navigation/navSession';
import type { NavTab } from '@/shared/navigation/navigationTypes';

/**
 * activeTab에 해당하는 워크스페이스 표준 URL 경로를 계산합니다.
 */
export function computeTargetWorkspaceUrl(activeTab: NavTab): string {
  return activeTab === 'dashboard' ? '/workspace' : `/workspace/${activeTab}`;
}

/**
 * URL 파라미터 또는 경로로부터 대상 탭을 결정합니다.
 */
export function resolveTabFromUrl(
  urlTab?: string,
  pathname?: string
): NavTab | null {
  if (urlTab) {
    return urlTab as NavTab;
  }
  if (pathname === '/' || pathname === '/workspace') {
    return 'dashboard';
  }
  return null;
}

/**
 * URL 경로(/workspace/:tab)와 인메모리 navSession(activeTab) 간의 양방향 동기화 훅.
 *
 * 1. URL ➔ activeTab:
 *    - 사용자가 URL로 직접 접속하거나 뒤로가기/앞으로가기 시 URL의 :tab을 읽어 activeTab을 갱신.
 * 2. activeTab ➔ URL:
 *    - 사용자가 셸 내부에서 탭을 클릭하여 activeTab이 변경되면 브라우저 URL을 /workspace/:tab으로 동기화.
 */
export function useWorkspaceUrlSync(): void {
  const { tab: urlTab } = useParams<{ tab?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useNavSession();

  // 1. URL ➔ activeTab 동기화
  useEffect(() => {
    const targetTab = resolveTabFromUrl(urlTab, location.pathname);
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  }, [urlTab, location.pathname, activeTab, setActiveTab]);

  // 2. activeTab ➔ URL 동기화
  useEffect(() => {
    const isWorkspaceRoute =
      location.pathname === '/' ||
      location.pathname === '/workspace' ||
      location.pathname.startsWith('/workspace/');

    if (!isWorkspaceRoute) return;

    const targetPath = computeTargetWorkspaceUrl(activeTab);
    const currentPath = location.pathname;

    // 현재 URL과 일치하지 않는 경우 navigate로 동기화 (히스토리 스택 오염 방지를 위해 replace)
    if (currentPath !== targetPath && !(currentPath === '/' && activeTab === 'dashboard')) {
      navigate(targetPath, { replace: true });
    }
  }, [activeTab, location.pathname, navigate]);
}
