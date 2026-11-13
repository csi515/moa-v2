# Moa-v2 AI 개발 지침 (Antigravity Development Constitution)

이 파일은 Antigravity 에이전트와 개발자가 Moa-v2 프로젝트에서 작업할 때 항상 준수해야 하는 최상위 헌법(Constitution)입니다.
상세한 구현 규칙과 기술 표준은 `docs/rules/`의 분야별 전문 규칙서를 참조합니다.

---

## 1. Moa-v2 3대 아키텍처 불변 원칙: Core – Capability – Preset

Moa-v2의 최종 아키텍처는 다음 3개 계층으로 단일화된다. **중간 "Domain Capability" 계층은 영구히 생성하지 않는다.**

```
1. Core        (인증, 테넌트 격리, 공통 권한 기반, 공통 설정, 확장 인터페이스)
      ↓
2. Capability  (독립 업무 영역, 업종 중립적 재사용 도메인 로직)
      ↓
3. Preset      (Capability + 설정 조합, 업종별 사업장 관리 프로그램 구성)
```

1. **Core 무지의 원칙**: Core는 개별 업종이나 특정 Capability의 구체적인 업무 의미를 몰라야 한다.
2. **Capability 단일화 및 업종 중립성**: 여러 업종에서 같은 본질의 업무는 단 하나의 Capability를 재사용하며, 업종 분기(`if (industry === 'piano')`)를 누적하지 않는다.
3. **Preset 선언적 위임**: Preset 자체에 중복 비즈니스 로직을 구현하지 않고, 결합된 Capability 도메인에 위임한다.

---

## 2. 안전 및 개발 절대 수칙

1. **문서 우선**: 규칙 개정 단계에서는 문서만 수정하며, 애플리케이션 코드/DB/API/UI를 임의로 변경하지 않는다.
2. **정상 동작 보존**: 기존에 정상 동작하는 코드(레거시 업종 모듈 등)를 함부로 삭제하거나 재작성하지 않는다.
3. **DB 안전**: 승인 없는 DB 마이그레이션을 금지하며, 데이터 무결성은 Supabase RLS와 원자적 RPC로 담보한다.
4. **원스톱 무회귀 검증**: 배포 전 반드시 `npm run check:all`을 통해 아키텍처, 타입, 비즈니스 불변성 테스트를 통과해야 한다.
5. **UI 일관성 및 공통 프리미티브 의무화**: 화면마다 임의의 인라인 팝업(`fixed inset-0` 등)이나 상태 뱃지를 새로 작성하는 것을 금지하며, 반드시 `@/shared/components/ui/`의 공통 컴포넌트(`Modal`, `AttendanceBadge`, `Button` 등)를 상속한다. 위반 시 `node scripts/check-ui-consistency.mjs`에 의해 CI가 차단된다.

---

## 3. 새로운 Capability 생성 승인 규칙 (6단계 필수 검증)

새로운 Capability를 만들기 전에 에이전트와 개발자는 반드시 다음 6단계를 검토하고 증명해야 한다.

1. **기존 Capability로 해결 가능한가?**
2. **기존 데이터 모델과 설정으로 표현 가능한가?**
3. **옵션이나 업무 규칙으로 해결 가능한가?**
4. **기존 Capability를 조합하면 해결 가능한가?**
5. **기존 기능을 확장하면 해결 가능한가?**
6. **그래도 해결할 수 없다면 독립된 데이터와 업무 흐름이 실제로 존재하는가?**

- 기존 기능을 확장하는 것보다 새 Capability를 만드는 것이 **명확하게 유리한 경우에만** 추가한다.
- 단순한 필드, 버튼, 검색, 알림, 바코드, 통계 같은 요소를 그 자체로 독립 Capability로 만들지 않는다.

---

## 4. 분야별 전문 규칙 가이드 색인 (Specialized Rulebooks)

작업 성격에 따라 `docs/rules/`의 전용 규칙서를 반드시 숙지하고 준수한다:

| 분야 | 전용 규칙서 | 핵심 관할 영역 |
| :--- | :--- | :--- |
| **1. 아키텍처 & 경계** | [`docs/rules/1_ARCHITECTURE_BOUNDARIES.md`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/1_ARCHITECTURE_BOUNDARIES.md) | 3계층 경계, 61개 원자적 번들, 포털 격리, Shim 동결, SSOT, 공통 자산 재사용, 용어 다형성 |
| **2. 데이터 & 보안** | [`docs/rules/2_DATA_AND_SECURITY.md`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/2_DATA_AND_SECURITY.md) | Supabase RLS, 원자적 RPC, Refine 데이터 페칭, 캐시 동기화, 타임존 결정론, 비즈니스 불변성, 기능 플래그 |
| **3. 상용 UX & 신뢰성** | [`docs/rules/3_COMMERCIAL_UX.md`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/3_COMMERCIAL_UX.md) | 4-State UI, 정직한 UX, 이중 제출 락, 모바일 44px, 다역할 세션 격리, 오프라인 큐, 미저장 폼, 대량작업 리포트 |
| **4. 디자인 & 모션** | [`docs/rules/4_DESIGN_AND_MOTION.md`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/4_DESIGN_AND_MOTION.md) | 4-Tier 모션 위계, 고정폭 숫자(`tabular-nums`), 시맨틱 컬러 토큰 |
| **5. 외부 연동 어댑터** | [`docs/rules/5_EXTERNAL_INTEGRATION.md`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/5_EXTERNAL_INTEGRATION.md) | 포트-어댑터 패턴, PG사/알림톡 SDK 도메인 직접 import 금지 |
| **6. 프리셋 라이프사이클** | [`docs/rules/6_PRESET_LIFECYCLE.md`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/6_PRESET_LIFECYCLE.md) | 비파괴 프리셋 전환, 온보딩 멱등성, 스위치보드 데이터 보존 |

---

## 5. 검증 규칙 (유연한 개발 및 최종 배포 전 검증)

- **일상 개발 시 유연성**: 일반적인 UI 수정이나 기능 개선 작업 시에는 매번 전체 검증(`npm run check:all`)을 돌릴 필요 없이, 작업 내용에 맞춰 필요한 검사(예: `npm run lint` 또는 해당 단위 테스트)만 가볍게 확인하며 개발 속도를 우선한다.
- **최종 배포 전 일괄 검증**: 대규모 리팩토링이나 최종 릴리스/PR 전 단계에서 단일 원스톱 통합 명령(`npm run check:all`)을 실행하여 최종 회귀 여부를 점검한다.
