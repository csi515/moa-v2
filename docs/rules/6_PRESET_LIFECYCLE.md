# 6. Moa-v2 프리셋 라이프사이클 및 온보딩 규칙 (Preset Lifecycle Rules)

> **문서 버전:** 1.0.0  
> **상위 헌법:** [AGENTS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/AGENTS.md)  
> **관련 문서:** [docs/rules/1_ARCHITECTURE_BOUNDARIES.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/1_ARCHITECTURE_BOUNDARIES.md)

---

## 1. 비파괴 프리셋 변경 원칙 (Non-Destructive Invariant)

Moa-v2는 44개 업종 프리셋 간의 전환과 개별 Capability의 동적 활성화/비활성화(스위치보드)를 지원합니다.

1. **데이터 보존 절대 의무화**:
   - 프리셋을 변경하거나(예: 피아노 학원 $\rightarrow$ 종합 실용음악 학원), 스위치보드에서 특정 Capability(예: `locker`, `vehicle_shuttle`)를 끄더라도 **기존 데이터베이스 레코드를 삭제(DELETE/TRUNCATE)하는 것을 엄격히 금지**한다.
2. **우아한 UI 숨김 (Graceful UI Hide)**:
   - 비활성화된 Capability는 네비게이션 메뉴, 라우트, 대시보드 위젯에서만 안전하게 노출이 차단된다.
3. **완전한 즉시 복원성 (Instant Restoration)**:
   - 비활성화했던 기능을 나중에 다시 켜면, 과거에 입력해 두었던 데이터(예: 사물함 배정 내역, 셔틀버스 노선 등)가 데이터 유실 없이 즉시 이전 상태 그대로 복원되어야 한다.

---

## 2. 온보딩 마법사 멱등성 (Onboarding Idempotency)

1. **온보딩 재실행 안전성**:
   - 사용자가 초기 설정 마법사(QuickSetup, EpZeroWizard)를 완료한 후 다시 진입하거나, 네트워크 지연으로 완료 버튼을 중복 클릭하더라도 동일한 사업장 리소스가 중복 생성되지 않아야 한다.
2. **설정 덮어쓰기 가드**:
   - 이미 설정된 기존 운영 데이터(시간표 템플릿, 결제 카테고리 등)가 온보딩 재진입에 의해 기본값으로 초기화(Reset)되지 않도록 `upsert` 및 기존 상태 보호 가드를 적용한다.
