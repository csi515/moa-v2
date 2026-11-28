# 7. Moa-v2 범용 설정·규칙 엔진 헌법 (Agnostic Configuration Rules)

> **문서 버전:** 1.0.0  
> **상위 헌법:** [AGENTS.md](../AGENTS.md)  
> **로드맵:** [docs/MOA_AGNOSTIC_ERP_ROADMAP.md](../MOA_AGNOSTIC_ERP_ROADMAP.md)  
> **관련:** [1_ARCHITECTURE_BOUNDARIES](./1_ARCHITECTURE_BOUNDARIES.md), [2_DATA_AND_SECURITY](./2_DATA_AND_SECURITY.md), [6_PRESET_LIFECYCLE](./6_PRESET_LIFECYCLE.md)

---

## 1. 목표 상태 (Definition of Done for Agnosticism)

기존 Capability 조합만으로 충분한 신규 업종은 **DB/원격 프리셋 + 온보딩 + 테넌트 설정만**으로 가동한다.  
새 Capability 또는 물리 스키마가 필요할 때만 코드·마이그레이션을 허용한다.

---

## 2. 불변 규칙 (Hard Gates)

1. **업종 if-branch 신규 금지**  
   - Capability·Core에 `if (industry === '…')` 를 추가하지 않는다.  
   - 분기 필요 시 [`presetBusinessRules`](../../src/app/presets/presetBusinessRules.ts), plugin flags, `field_definitions`, 정책 테이블로 표현한다.

2. **테넌트 필드·정책 SSOT = DB 설정**  
   - 화면 라벨·필수 여부·데이터 타입·할당/과금/상태 정책의 런타임 SSOT는 org 스코프 DB(또는 org `settings` JSON의 버전드 정책 키)이다.  
   - 코드 상수(`INDUSTRY_CUSTOM_FIELDS` 등)는 **시드/폴백 전용**이며, 테넌트 편집 결과를 덮어쓰지 않는다.

3. **setupSchema 실연결 의무**  
   - Capability `setupSchema`에 선언한 토글·수치·정책은 반드시 런타임(RPC·서비스·UI)에 연결한다.  
   - “선언만 하고 미사용” 상태를 신규로 만들지 않는다. 기존 미연결 키는 로드맵 Phase 3에서 해소하거나 스키마에서 제거한다.

4. **문서 우선·마이그레이션 승인**  
   - 규칙 개정은 문서 먼저.  
   - `core.field_definitions` 등 스키마 변경은 승인 후 `supabase/migrations/`에 추가한다.

5. **비파괴**  
   - 프리셋·Capability 비활성화는 [6_PRESET_LIFECYCLE](./6_PRESET_LIFECYCLE.md)에 따라 데이터 삭제 금지.

---

## 3. 단계별 소유권

| Phase | 주제 | 완료 게이트 |
| :--- | :--- | :--- |
| 0 | 본 헌법 + 로드맵 색인 | AGENTS.md 색인, 본 문서 존재 |
| 1 | `field_definitions` | 설정만으로 커스텀 필드 CRUD → 명부 폼 반영 |
| 2 | 프리셋·온보딩 데이터화 | 기존 Capability만 쓰는 수직은 프리셋 행으로 온보딩 |
| 3 | 할당·과금·상태 정책 | 테넌트 정책 스위치가 RPC/UI에 반영 |
| 4 | RBAC→RLS | `has_permission` 수렴 + 필드 ACL 최소치 |

상세 스키마·파일 경로는 [MOA_AGNOSTIC_ERP_ROADMAP.md](../MOA_AGNOSTIC_ERP_ROADMAP.md)를 따른다.

---

## 4. 금지 예시 / 허용 예시

```text
❌ capabilities/booking/... if (industry === 'pilates') notify = true
⭕ bookingIndustryAdapter / preset businessRules / org allocation_policies

❌ 테넌트 UI 없이 INDUSTRY_CUSTOM_FIELDS에만 필드 추가
⭕ field_definitions INSERT + 시드 템플릿에서 복사

❌ setupSchema.allowWaitlist 선언만 하고 book_schedule_slot 미참조
⭕ 동일 키를 RPC/클라이언트 가드에서 읽음
```
