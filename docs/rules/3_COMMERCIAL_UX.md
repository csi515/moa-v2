# 3. Moa-v2 상용 프로덕션 UX 및 품질 규칙 (Commercial UX Rules)

> **문서 버전:** 2.0.0  
> **상위 헌법:** [AGENTS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/AGENTS.md)  
> **상세 가이드:** [docs/MOA_COMMERCIAL_QUALITY_GUIDELINES.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_COMMERCIAL_QUALITY_GUIDELINES.md)

---

## 1. UI 4대 필수 상태 보장 규칙 (The 4-State UI Contract)

모든 뷰(목록, 상세, 대시보드 위젯, 모달)는 아래 4대 상태를 완전하게 구현해야 한다:

1. **Loading State**: 레이아웃 흔들림(CLS)을 방지하는 **Skeleton UI** 또는 명확한 인디케이터 제공 (`return null` 등 빈 화면 금지).
2. **Empty State**: 단순 무미건조한 텍스트("내역 없음") 표시 금지. 신규 사용자가 즉시 행동을 취할 수 있는 **Actionable CTA**(예: "첫 회원 등록하기", "시간표 생성하기")와 가이드 안내 필수 제공.
3. **Error State**: 사용자 친화적 메시지와 함께 앱 크래시 없이 복구 가능한 **[다시 시도(Retry)]** 액션 제공.
4. **Data State**: 대량 데이터 정렬, 검색 하이라이트 및 페이징/가상화 지원.

---

## 2. 상용 신뢰성 및 가짜 기능 침묵 방지 (Honest UX & Trust Invariants)

1. **프로덕션 데모 우회(Silent Mock Bypass) 영구 금지**:
   - `NODE_ENV === 'production'` 환경에서 실제 백엔드 연동 없이 로컬 스토리지에만 저장하고 '완료'로 속이는 우회 코드를 일절 허용하지 않는다.
2. **외부 연동 정직성 명시**:
   - 카카오 알림톡/SMS, PG 결제, 국세청 현금영수증 등 실제 외부 API가 연결되지 않은 기능은 UI에 **「로컬 기록 전용」** 또는 **「외부 발송 준비 중」** 배지를 명시한다.
3. **정직한 완료 피드백 문구**:
   - 알림톡/문자 미연동 시 "전송 완료"가 아니라 "내부 기록이 저장되었습니다 (외부 문자 미발송)"로 정직하게 안내한다.

---

## 3. 작업 안전성 및 이중 실행 방지 (Action Safety & Idempotency)

1. **이중 제출 락 (Double-Submit Lock)**:
   - 모든 CUD(생성/수정/삭제), 결제 승인, 출결 체크 버튼은 **클릭 즉시 `disabled` 처리 및 로딩 스피너**를 띄워 중복 요청을 원천 차단한다.
2. **파괴적 작업 이중 확인 (Destructive Confirmation)**:
   - 데이터 삭제, 퇴원 처리, 환불/취소, 권한 회수 등 되돌릴 수 없는 작업은 브라우저 기본 `alert/confirm` 대신 공통 **[`ConfirmDialog`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/ConfirmDialog.tsx)** 컴포넌트를 사용한다.
3. **멱등성(Idempotency) 보장**:
   - 네트워크 재전송 시 중복 결제, 중복 출결, 중복 차감이 발생하지 않도록 멱등 키 또는 원자적 RPC 트랜잭션을 적용한다.

---

## 4. 모바일 네이티브 인체공학 (Mobile-First Ergonomics)

1. **최소 터치 타깃 44×44px**:
   - 모바일/태블릿 화면의 모든 조작 버튼/아이콘은 최소 44×44px의 터치 영역을 확보한다 (Apple HIG / WCAG 2.2 준수).
2. **Safe Area Inset 반영**:
   - iOS 노치, Dynamic Island, 하단 홈 바 영역 침범을 방지하기 위해 상하단 패딩(`pb-safe`, `pt-safe`, `env(safe-area-inset-*)`)을 필수로 적용한다.
3. **가상 키보드 가림 방지 (Keyboard Avoidance)**:
   - 모바일 폼 작성 시 가상 키보드가 입력 필드나 확인 버튼을 가리지 않도록 스크롤 및 뷰포트 마진을 확보한다.
4. **하드웨어 뒤로가기(Back Button) 우선순위**:
   - 모바일 뒤로가기 제스처/버튼 터치 시 앱이 꺼지지 않고 최상위 모달/드로어 닫힘 $\rightarrow$ 이전 화면 이동 순으로 처리한다.

---

## 5. 회복 탄력적 에러 핸들링 및 가시성 (Resilient Observability)

1. **기술 용어 숨김 및 한국어 번역 필수**:
   - Supabase RLS 오류(`42501`, `row-level security`), DB 제약조건명, 영문 시스템 에러를 사용자에게 그대로 노출하지 않고 반드시 **[`userFacingErrorMessage`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/errors/userFacingError.ts)**를 거쳐 친절한 한국어 해결 가이드로 변환한다.
2. **위젯 단위 에러 격리 (Fault Isolation)**:
   - 대시보드나 복합 페이지의 특정 위젯에 에러가 발생해도 전체 화면이 흰 화면으로 죽지 않도록 **[`PluginErrorBoundary`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/PluginErrorBoundary.tsx)**로 위젯을 격리한다.
3. **배포 후 청크 오류 자동 복구**:
   - 새 버전 배포 직후 캐시 불일치(`Failed to fetch dynamically imported module`) 감지 시 안전하게 1회 자동 재로딩(`vitePreloadErrorRecovery`)하여 세션을 복원한다.

---

## 6. 대규모 데이터 성능 및 개인정보 보호 (Performance & Compliance)

1. **대량 목록 가상화(Virtualization)**:
   - 원생 목록, 출결 로그 등 100건 이상 데이터 목록은 `@tanstack/react-virtual` 가상 스크롤 또는 서버 페이징을 적용한다.
2. **개인식별정보(PII) 마스킹**:
   - 전체 목록 화면에서 전화번호(`010-****-1234`) 등 민감 개인정보는 기본 마스킹 처리하고 권한이 있는 경우에만 상세 보기로 노출한다.
3. **클라이언트 미디어 리사이징**:
   - 사진, 서명, 영수증 파일 업로드 시 모바일 원본을 그대로 올리지 않고 클라이언트 단에서 사전 압축 및 리사이징(최대 1~2MB 이내) 후 전송한다.

---

## 7. 다역할(Multi-Role) 권한 및 테넌트 전환 보안 (Identity & Role Switching)

1. **활성 멤버십 권한 검증 (Active Role Guard)**:
   - 사용자가 여러 사업장에서 다른 역할(예: A학원 원장, B학원 학부모)을 가질 수 있으므로, 단순 `user.role` 체크를 금지하고 반드시 현재 활성 테넌트의 권한(`canAccess` / `RoleGate`)을 기반으로 UI와 기능을 제어한다.
2. **테넌트 전환 시 캐시 원자적 Flush**:
   - 상단 사업장 선택기에서 다른 사업장으로 스위칭할 때, 이전 사업장의 TanStack Query 캐시와 내부 상태 메모리를 즉각 초기화하여 타 사업장의 원생/매출 데이터 잔류를 원천 차단한다.

---

## 8. 오프라인 우선 큐 및 현장 네트워크 복원력 (Offline-First Resilience)

1. **현장 필수 기능의 오프라인 큐화**:
   - 로비 키오스크 출결 체크, 셔틀버스 승하차 확인 등 순간적인 통신 두절이 잦은 현장 기능은 [`attendanceOfflineQueue`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/attendance/offline/attendanceOfflineQueue.test.ts) 패턴을 적용한다.
2. **로컬 선저장 및 백그라운드 자동 동기화**:
   - 네트워크 단절 시에도 조작을 실패시키지 않고 로컬에 타임스탬프와 함께 선저장한 뒤, 네트워크 재연결 시 백그라운드에서 순차 전송(Auto-sync)하고 동기화 완료 토스트를 제공한다.

---

## 9. 마찰 없는 사용성 보장 규칙 (Frictionless UX Invariants)

실제 사용자가 매일 운영하며 겪는 조작 피로도와 마찰(Friction)을 원천 차단하기 위해 아래 5대 규칙을 의무 적용한다.

1. **미저장 변경사항 보호 (Unsaved Changes Guard)**:
   - 입력 필드에 작성된 내용이 있는 모달/드로어는 바깥 배경(Backdrop) 터치 시 즉시 닫히지 않고, 실수로 인한 데이터 유실을 방지하는 확인 모달("작성 중인 내용이 있습니다. 닫으시겠습니까?")을 띄워야 한다.
2. **필터/검색 변경 시 1페이지 자동 리셋 (Page Reset on Filter)**:
   - 검색어 입력, 날짜 변경, 상태 필터 클릭 등 조회 조건이 바뀔 때는 반드시 현재 페이지를 1페이지로 자동 초기화(`page = 1`)하여, 이전 높은 페이지 번호로 인해 "데이터 없음"이 노출되는 결함을 방지한다. 실시간 검색창은 300ms 디바운스(Debounce)를 의무화한다.
3. **모바일 인체공학적 입력 제어 (Mobile Input Ergonomics)**:
   - 금액, 수량, 전화번호, 인증번호 입력 필드는 모바일 가상 키보드가 숫자 패드로 즉각 반응하도록 `inputMode="numeric"` 또는 `inputMode="tel"`을 지정한다.
   - iOS Safari에서 인풋 터치 시 화면이 자동 확대(Zoom-in)되는 왜곡을 방지하기 위해 모바일 폼 인풋 글자 크기는 최소 16px(`text-base`) 이상을 유지한다.
4. **방금 조작한 데이터 즉시 식별 (Locate Just-Modified Data)**:
   - 신규 생성 데이터는 목록 최상단에 우선 배치하고, 수정 완료된 행(Row)은 약 2초간 부드러운 하이라이트 배경색(`bg-indigo-50/70 transition-colors duration-1000`)을 부여하여 작업 위치를 시각적으로 즉각 인지시킨다.
5. **화면 스크롤 락 위생 (Scroll Lock Hygiene)**:
   - 모달이나 사이드 드로어 오픈 시 바디 스크롤을 막는 컴포넌트는 컴포넌트 닫힘 및 언마운트 시(`useEffect` cleanup) 반드시 `document.body` 스크롤을 원상 복구(`overflow: auto`)하여 화면이 먹통이 되는 결함을 차단한다.

---

## 10. 표준 데이터 뷰 자동 바인딩 규격 (The Auto-Wired DataView Contract)

목록(List) 화면 개발 시 날것의 `<table>` 태그나 분절된 UI를 수동 조립하는 것을 금지하며, 공통 컨테이너인 [`StandardListView`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/ui/StandardListView.tsx)를 통해 아래 6대 기본 운영 기능을 **선언적(Auto-wired)**으로 세팅한다:

1. **스마트 자동 페이지네이션 (Smart Pagination)**:
   - 15/30/50개 보기 조절, 페이지 이동, 총 건수 카운트를 기본 제공하며, 데이터가 15건 미만일 때는 페이지네이션 바를 알아서 숨긴다(Smart Auto-Hide).
2. **디바운스 실시간 검색 및 1페이지 리셋 (Auto-Debounced Search)**:
   - `searchable` 설정 시 300ms 디바운스 검색창과 'X' 원클릭 지우기 버튼이 자동 배치되며, 검색 시 현재 페이지가 자동으로 1페이지로 리셋된다.
3. **4-State 자동 폴백 (Auto 4-State Rendering)**:
   - `isLoading` 시 스켈레톤, 데이터 0건 시 Actionable CTA를 가진 `EmptyStateHero`, 에러 발생 시 `userFacingErrorMessage` 기반의 재시도 UI를 자동 렌더링한다.
4. **반응형 모바일 카드 뷰 자동 지원 (Responsive Desktop Table & Mobile Card)**:
   - 데스크톱에서는 반응형 테이블, 모바일에서는 터치 친화적 카드 레이아웃으로 자동 전환된다.
5. **원클릭 데이터 내보내기 (Auto Data Export)**:
   - `exportable` 설정 시 상단 [CSV/엑셀 다운로드] 버튼이 자동 배치되어 현재 필터링된 데이터셋을 안전하게 다운로드한다.
6. **컬럼 정렬 인터랙션 (Auto Sorting Header)**:
   - 정렬 가능한 컬럼은 헤더 클릭 시 오름차순/내림차순 토글과 활성 화살표가 자동 표기된다.

---

## 11. 대량 작업(Bulk Operations) 안전성 및 리포트 규격 (Bulk Action Safety Contract)

다수의 대상을 한 번에 처리하는 일괄 작업 시 조작 실수와 침묵의 실패를 방지한다.

1. **영향도 사전 명시 (Impact Scope Confirmation)**:
   - 5건 이상 일괄 처리(일괄 출결, 일괄 청구, 일괄 삭제) 시 [`BulkActionToolbar`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/ui/BulkActionToolbar.tsx) 및 `ConfirmDialog`에 작업 대상 건수("총 38명에게 청구서가 발행됩니다")를 명확히 고지한다.
2. **부분 성공/실패 투명 리포트 (Transparent Execution Report)**:
   - 다건 비동기 작업 후 단순 완료 토스트 대신 **"총 38건 중 36건 성공, 2건 실패 [실패 명단 보기]"** 형태의 결과를 명확히 제공하여, 운영자가 실패 대상을 즉각 인지하고 재처리할 수 있도록 지원한다.

---

## 12. 폼 유효성 검사 및 첫 에러 필드 자동 포커스 규격 (Form Validation & Focus Contract)

긴 입력 폼 작성 시 저장 버튼 클릭 후 화면이 멈춰있는 오해를 방지한다.

1. **첫 번째 오류 필드로 자동 이동 (Scroll-to-first-error)**:
   - 폼 검증(Validation) 실패 시 즉시 가장 첫 번째 오류 입력 필드로 부드럽게 화면을 자동 스크롤(`scrollIntoView({ behavior: 'smooth', block: 'center' })`)하고 해당 인풋에 포커스를 자동 지정한다.
2. **필수 입력 항목 시각적 명시**:
   - 모든 필수 입력 필드는 레이블 옆에 붉은색 별표(`<span className="text-rose-500">*</span>`)를 의무적으로 표시한다.

---

## 13. 일관성 보장을 위한 표준 구현 레시피 (Canonical Code Recipes)

Moa-v2의 전 화면에서 일관된 UX와 안정성을 담보하기 위해 아래 5대 표준 패턴을 의무 적용한다.

### 1) 에러 피드백 표준: `showToast.error(err, fallback)`
원시 `err.message`를 사용자에게 직접 보여주지 않고, 자동으로 한국어 친절 가이드로 정제하는 `showToast.error`를 사용한다.

```tsx
// ❌ 금지: 영문 DB 에러, RLS 42501 등이 그대로 팝업됨
catch (err: any) {
  showToast(err.message, 'error');
}

// ⭕ 표준: userFacingErrorMessage 자동 적용
catch (err) {
  showToast.error(err, '저장 처리에 실패했습니다.');
}
```

### 2) 금액/수치 렌더링 표준: `<Money />` 컴포넌트
금액 표기는 화면마다 서식이 달라지지 않도록 [`Money`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/ui/Money.tsx) 컴포넌트로 통일하며, 고정폭 숫자(`tabular-nums font-mono`)를 자동 보장한다.

```tsx
// ❌ 지양: 화면마다 ₩ / 원 표기 및 폰트 폭 불일치
<span>₩{val.toLocaleString()}</span>

// ⭕ 표준: 고정폭 + 시맨틱 서식 보장
import { Money } from '@/shared/components/ui';

<Money amount={invoice.totalAmount} format="won" /> // '150,000원'
<Money amount={balance} format="krw" showPositiveSign /> // '+₩50,000'
```

### 3) 모달/드로어 키보드 조작 표준: `useEscapeKey(onClose)`
수동 `addEventListener('keydown')` 작성을 금지하고 선언적 훅 [`useEscapeKey`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/hooks/useMoaHotkeys.ts)로 일원화한다.

```tsx
// ❌ 금지: 수동 이벤트 리스너 (누수 및 모바일 편차)
useEffect(() => {
  const handler = (e) => { if (e.key === 'Escape') onClose(); };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);

// ⭕ 표준: 선언적 단일화
import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

useEscapeKey(onClose, isOpen);
```

### 4) CUD 이중 제출 락 표준: `disabled={isSubmitting}`
데이터를 변경(생성/수정/삭제/결제)하는 모든 버튼은 로딩 중 클릭 즉시 비활성화하고 스피너를 표시한다.

```tsx
// ⭕ 표준: 이중 제출 방지 락
<Button
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="min-h-[44px]"
>
  {isSubmitting ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
      저장 중...
    </>
  ) : (
    '등록 완료'
  )}
</Button>
```





