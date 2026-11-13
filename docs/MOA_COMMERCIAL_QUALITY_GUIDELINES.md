# Moa-v2 상용 앱 프로덕션 품질 및 UX 가이드라인 (Commercial Quality Guidelines)

> **문서 버전:** 1.0.0  
> **기준 일자:** 2026-11-12  
> **관련 문서:** [AGENTS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/AGENTS.md), [docs/MOA_ARCHITECTURE_BOUNDARIES.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_ARCHITECTURE_BOUNDARIES.md)  
> **적용 범위:** 전 화면(Pages), 모달(Modals), 공통 컴포넌트(Components), Capability UI

---

## 1. 개요

Moa-v2는 실제 학원, 교습소, 체육시설, 엔터프라이즈 사업장에서 수많은 원장, 강사, 직원, 학부모, 회원이 매일 사용하는 B2B SaaS 및 PWA/모바일 애플리케이션입니다.

아키텍처 경계(Core–Capability–Preset)가 시스템의 뼈대를 견고히 한다면, **프로덕션 품질 가이드라인은 사용자가 체감하는 제품의 완성도, 신뢰도, 인터랙션 품질**을 결정합니다. 모든 컴포넌트와 화면 개발 시 본 지침을 필수로 준수해야 합니다.

---

## 2. UI 4대 필수 상태 구현 패턴 (The 4-State UI Contract)

모든 목록, 상세 조회, 대시보드 위젯 컴포넌트는 다음 4가지 상태를 명시적으로 분기해야 합니다.

```tsx
// 표준 4-State 컴포넌트 패턴 예시
export const MemberListSection: React.FC = () => {
  const { data, isLoading, isError, refetch } = useList({ resource: "members" });

  // 1. Loading State: 레이아웃 시프트(CLS) 없는 Skeleton UI
  if (isLoading) {
    return <MemberListSkeleton count={5} />;
  }

  // 2. Error State: 친절한 에러 문구와 재시도 액션
  if (isError) {
    return (
      <div className="p-8 text-center rounded-xl bg-red-50/50 border border-red-200">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-800">
          회원 목록을 불러오지 못했습니다.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 3. Empty State: 행동을 유도하는 Actionable CTA (단순 "내역 없음" 금지)
  if (!data?.data || data.data.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900">등록된 회원이 없습니다</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          첫 회원을 등록하고 출결 및 수강권 관리를 시작해보세요.
        </p>
        <button
          onClick={() => navigate("/members/new")}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm"
        >
          신규 회원 등록하기
        </button>
      </div>
    );
  }

  // 4. Data State: 실제 데이터 렌더링
  return <MemberListTable members={data.data} />;
};
```

---

## 3. 상용 신뢰성 및 가짜 기능 침묵 방지 (Honest UX & Trust Invariants)

소상공인과 엔터프라이즈 고객은 소프트웨어의 안내 문구를 법적/영업적 사실로 신뢰합니다. 기능의 미연동 상태를 속이거나 침묵하지 않습니다.

1. **프로덕션 데모 우회(Silent Mock) 차단**:
   - `NODE_ENV === 'production'`에서 실제 백엔드 연동 없이 로컬 스토리지에만 저장하고 '완료'로 처리하는 데모 모드 우회를 영구 차단합니다.
2. **미연동 기능 배지 명시**:
   - 알림톡/문자 발송, PG 결제, 국세청 현금영수증 등 외부 연동 기능이 준비 중인 경우 반드시 뱃지를 표기합니다:
     ```tsx
     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
       로컬 기록 전용 · 외부 문자 미발송
     </span>
     ```
3. **정직한 완료 피드백 문구**:
   - 외부 문자가 나가지 않는 로컬 기록 기능의 경우:  
     `"알림톡이 전송되었습니다"` (X) $\rightarrow$ `"출결 기록이 저장되었습니다 (외부 문자 미발송)"` (O)

---

## 4. 작업 안전성 및 이중 실행 방지 (Action Safety & Idempotency)

1. **이중 제출 락 (Double-Submit Lock)**:
   - 모든 폼 제출, 결제 승인, 출결 체크, 수강권 차감 버튼은 클릭 즉시 `disabled` 처리되어야 합니다:
     ```tsx
     <button
       type="submit"
       disabled={isSubmitting}
       className="relative flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
     >
       {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
       {isSubmitting ? "처리 중..." : "결제 승인"}
     </button>
     ```
2. **파괴적 작업 이중 확인**:
   - 브라우저 기본 `window.confirm`은 모바일 웹뷰에서 차단되거나 UX가 조악하므로 일절 사용하지 않습니다.
   - 프로젝트 공통 [`ConfirmDialog`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/ConfirmDialog.tsx)를 사용하여 삭제/취소 사유를 확인합니다.
3. **멱등성 보장**:
   - 중요한 거래(수납, 포인트, 출결)는 UUID 기반 `idempotency_key`를 헤더 또는 RPC 인자로 전달하여 중복 실행을 방지합니다.

---

## 5. 모바일 네이티브 인체공학 (Mobile-First Ergonomics)

1. **터치 타깃 크기 44×44px 준수**:
   - 모바일/태블릿 화면의 모든 조작부(아이콘 버튼, 탭, 체크박스 등)는 시각적 크기와 관계없이 터치 가능 영역이 최소 44×44px 이상이어야 합니다.
   - 예: `<button className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">`
2. **Safe Area Inset 적용**:
   - 최상위 레이아웃 및 고정 하단 바(Bottom Bar, Floating FAB)는 노치와 홈 인디케이터 영역을 보호합니다:
     ```css
     padding-bottom: max(1rem, env(safe-area-inset-bottom));
     padding-top: max(1rem, env(safe-area-inset-top));
     ```
3. **가상 키보드 가림 방지 (Keyboard Avoidance)**:
   - 폼 입력 시 모바일 키보드 활성화 상태에서 활성 필드가 화면 중앙으로 자동 스크롤되도록 `scrollIntoView({ behavior: 'smooth', block: 'center' })`를 지원합니다.
4. **하드웨어 뒤로가기(Back Button) 지원**:
   - Capacitor 안드로이드 및 제스처 뒤로가기 시 모달/드로어가 열려 있다면 앱이 닫히지 않고 모달이 먼저 닫히도록 바인딩합니다.

---

## 6. 회복 탄력적 에러 핸들링 및 가시성 (Resilient Observability)

1. **기술 용어 숨김 및 번역**:
   - PostgreSQL 제약조건 에러, Supabase RLS 오류(42501), 네트워크 timeout이 사용자에게 날것(Raw Text)으로 보이지 않도록 [`userFacingErrorMessage`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/errors/userFacingError.ts)를 항상 경유합니다:
     ```tsx
     import { userFacingErrorMessage } from "@/shared/errors/userFacingError";

     onError: (err) => {
       showToast({
         type: "error",
         message: userFacingErrorMessage(err),
       });
     }
     ```
2. **독립 위젯 에러 격리 (Fault Isolation)**:
   - 복합 대시보드 화면에서는 개별 카드나 통계 컴포넌트를 [`PluginErrorBoundary`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/PluginErrorBoundary.tsx)로 감싸 특정 위젯의 오류가 전체 화면을 망가뜨리지 않도록 보호합니다.

---

## 7. 대규모 데이터 성능 및 개인정보 보호 (Performance & PII Compliance)

1. **가상화 리스트 (Virtualization)**:
   - 100건 이상의 목록(원생 목록, 출결 로그 등)은 DOM 노드 과부하를 막기 위해 `@tanstack/react-virtual`을 적용하거나 서버 사이드 페이지네이션을 사용합니다.
2. **개인식별정보(PII) 마스킹**:
   - 전체 목록에서는 휴대폰 번호(`010-****-1234`), 생년월일 등 민감 정보를 마스킹하여 화면 캡처나 주변 시선에 의한 유출을 방지합니다.
3. **클라이언트 미디어 리사이징**:
   - 사진 및 영수증 업로드 시 클라이언트 단 리사이징(최대 너비 1200px, JPEG 압축)을 거쳐 1MB 미만으로 전송함으로써 업로드 지연과 스토리지 비용을 절감합니다.

---

## 8. 인터랙션 모션 위계 및 디자인 토큰 가이드 (Motion & Design Tokens)

### 8.1 4단계 모션 위계 (The 4-Tier Motion Hierarchy)

```
Tier 1: 마이크로 피드백 (0~100ms)    → 버튼 탭, 토글 (active:scale-[0.98])
Tier 2: 공간/레이아웃 전환 (150~250ms) → 모달/드로어/바텀시트 물리 전환
Tier 3: 주의 및 에러 피드백 (200~300ms) → 폼 셰이크(animate-shake), 펄스 포커스
Tier 4: 성취/마일스톤 축하 (400~1000ms) → canvas-confetti, 완성 팝핑 (절제 적용)
```

#### Tier 1: 초고속 유틸리티 마이크로 피드백 (0~100ms)
- 일상 조작(출결, 체크박스, 버튼)은 지연 없이 즉각 반응해야 합니다:
```tsx
<button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium transition-all duration-100 ease-out active:scale-[0.98] hover:bg-indigo-700">
  확인
</button>
```

#### Tier 2: 공간 레이아웃 전환 (150~250ms)
- 모달 및 바텀시트는 열리고 닫히는 물리적 방향성을 명확히 유지합니다:
```tsx
// 데스크톱 모달: 중앙 스케일 + 페이드 (200ms)
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
  className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full"
>
  {/* 모달 본문 */}
</motion.div>
```

#### Tier 3: 주의 집중 및 폼 오류 피드백 (200~300ms)
- 필수값 누락이나 검증 실패 시 시선을 정확히 유도합니다:
```tsx
// 입력 에러 시 셰이크 및 포커스 링
<input
  className={`w-full px-3 py-2 border rounded-xl transition-all duration-200 ${
    isError ? "border-rose-500 ring-2 ring-rose-200 animate-shake" : "border-slate-200"
  }`}
/>
```

#### Tier 4: 마일스톤 성취 축하 (400~1000ms)
- 온보딩 셋업 완료, 학생 첫 등록 완료, 수강 완강 등 핵심 비즈니스 성취에만 절제하여 사용합니다:
```tsx
import confetti from "canvas-confetti";

export function fireMilestoneCelebration() {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#4f46e5', '#10b981', '#f59e0b'],
  });
}
```

---

### 8.2 디자인 시스템 토큰 및 가독성 규칙

1. **고정폭 숫자 (Tabular Figures)**:
   - 금액, 출결 카운트, 잔여 세션 등 실시간 갱신되는 숫자는 숫자가 바뀔 때 열(Column) 너비가 흔들리지 않도록 `tabular-nums` 클래스를 필수로 지정합니다:
     ```tsx
     <span className="font-semibold text-slate-900 tabular-nums">
       {amount.toLocaleString()}원
     </span>
     ```

2. **시맨틱 컬러 체계**:
   - `Primary`: Indigo (`bg-indigo-600`, `text-indigo-600`) - 주요 액션
   - `Success`: Emerald/Green (`text-emerald-700`, `bg-emerald-50`) - 승인, 수납 완료, 출석
   - `Warning`: Amber (`text-amber-800`, `bg-amber-50`) - 만료 임박, 미납, 확인 필요
   - `Danger`: Rose/Red (`text-rose-700`, `bg-rose-50`) - 삭제, 퇴원, RLS 오류
   - `Neutral`: Slate (`text-slate-900`, `text-slate-500`) - 일반 본문 및 메타데이터

3. **모션 접근성 (Reduced Motion)**:
   - 사용자가 OS 설정에서 "동작 줄이기"를 선택한 경우 애니메이션을 페이드로 자동 전환합니다:
     ```css
     @media (prefers-reduced-motion: reduce) {
       *, ::before, ::after {
         animation-duration: 0.01ms !important;
         animation-iteration-count: 1 !important;
         transition-duration: 0.01ms !important;
       }
     }
     ```

