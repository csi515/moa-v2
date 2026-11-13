# 4. Moa-v2 디자인 및 인터랙션 모션 규칙 (Design & Motion Rules)

> **문서 버전:** 2.0.0  
> **상위 헌법:** [AGENTS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/AGENTS.md)  
> **상세 가이드:** [docs/MOA_COMMERCIAL_QUALITY_GUIDELINES.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_COMMERCIAL_QUALITY_GUIDELINES.md)

---

## 1. 4단계 모션 위계 준수 (The 4-Tier Motion Contract)

Moa-v2의 인터랙션 모션은 사용자에게 즉각적 반응을 제공하되 업무 피로도를 최소화하도록 4단계 위계를 엄격히 준수한다.

```
Tier 1: 마이크로 피드백 (0~100ms)    → 버튼 탭, 토글 (active:scale-[0.98])
Tier 2: 공간/레이아웃 전환 (150~250ms) → 모달/드로어/바텀시트 물리 전환
Tier 3: 주의 및 에러 피드백 (200~300ms) → 폼 셰이크(animate-shake), 펄스 포커스
Tier 4: 성취/마일스톤 축하 (400~1000ms) → canvas-confetti, 완성 팝핑 (절제 적용)
```

1. **Tier 1 (0~100ms, 유틸리티 마이크로 피드백)**:
   - 버튼 터치(`active:scale-[0.98]`), 토글 스위치, 탭 전환 등 일상 조작은 딜레이 없이 즉각 반응하며 불필요한 이동 애니메이션을 금지한다.
2. **Tier 2 (150~250ms, 공간/레이아웃 전환)**:
   - 모달 팝업(`scale 0.95 -> 1` + fade, 200ms), 모바일 바텀시트/사이드 드로어(방향 슬라이드, 200ms)는 물리적 방향성을 일관되게 유지한다.
3. **Tier 3 (200~300ms, 주의/경고 피드백)**:
   - 필수 입력값 누락 시 수평 셰이크(`animate-shake`, 좌우 4px 2~3회) 및 포커스 링 깜빡임으로 시선을 정확히 유도한다.
4. **Tier 4 (400~1000ms, 마일스톤 성취/축하)**:
   - 온보딩 완료, 신규 등록, 완강, 수강권 결제 등 핵심 비즈니스 마일스톤에만 `canvas-confetti`와 축하 배지를 절제하여 적용한다 (일상 출결 체크 시 남발 금지).

---

## 2. 디자인 시스템 토큰 및 가독성 규칙

1. **고정폭 숫자(Tabular Figures) 적용**:
   - 금액, 원생 수, 잔여 횟수 등 변동 숫자는 레이아웃 덜컹거림(Jitter)을 방지하기 위해 `tabular-nums` 또는 `font-mono`를 필수로 적용한다.
2. **시맨틱 컬러 체계 준수**:
   - 임의의 HEX 코드 사용을 지양하고 기능적 시맨틱 토큰을 일관되게 사용한다:
     - `Primary`: Indigo / Slate (주요 조작)
     - `Success`: Emerald / Green (승인, 수납, 출석)
     - `Warning`: Amber / Orange (만료 임박, 미납)
     - `Danger`: Rose / Red (삭제, 퇴원, 에러)
     - `Neutral`: Slate (본문 및 기본 레이아웃)
3. **모션 접근성 (Reduced Motion)**:
   - OS 모션 줄이기(`prefers-reduced-motion`) 환경에서는 스케일/슬라이드 모션을 단순 페이드(`opacity`)로 완화한다.
