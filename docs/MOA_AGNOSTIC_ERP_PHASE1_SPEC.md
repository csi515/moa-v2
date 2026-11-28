# Phase 1 구현 스펙 — `core.field_definitions`

> **상태:** 앱/마이그레이션 구현 · **원격 DB 적용 완료** (2026-11-28 승인)  
> **상위 로드맵:** [MOA_AGNOSTIC_ERP_ROADMAP.md](./MOA_AGNOSTIC_ERP_ROADMAP.md)  
> **헌법:** [rules/7_AGNOSTIC_CONFIGURATION.md](./rules/7_AGNOSTIC_CONFIGURATION.md)

마이그레이션 파일: `supabase/migrations/20261128200000_field_definitions_and_product_metadata.sql`  
원격/스테이징 적용 전에 승인을 받는다.

---

## 1. 마이그레이션 (초안 파일명)

권장: `supabase/migrations/YYYYMMDDHHMMSS_field_definitions_and_product_metadata.sql`

### 1.1 `core.field_definitions`

```sql
CREATE TABLE core.field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  data_type text NOT NULL
    CHECK (data_type IN ('text','number','select','boolean','date','textarea','json')),
  required boolean NOT NULL DEFAULT false,
  placeholder text,
  description text,
  options jsonb,
  default_value jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_definitions_entity_type_chk
    CHECK (entity_type IN (
      'customer','student','product','resource',
      'task','consultation','policy','checklist','generic'
    ))
);

CREATE UNIQUE INDEX field_definitions_org_entity_key_alive_uidx
  ON core.field_definitions (organization_id, entity_type, key)
  WHERE deleted_at IS NULL;

ALTER TABLE core.field_definitions ENABLE ROW LEVEL SECURITY;

-- SELECT: org member
-- CUD: is_org_admin OR has_permission(..., 'fields:manage') — 기존 헬퍼에 맞춤
```

### 1.2 제품 메타·분류 계층

```sql
ALTER TABLE core.products
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE core.product_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid
    REFERENCES core.product_categories(id) ON DELETE SET NULL;
```

### 1.3 시드 RPC (선택)

`seed_field_definitions_from_preset(p_org_id, p_industry text)`  
→ 클라이언트/서버가 `INDUSTRY_CUSTOM_FIELDS` 맵과 동등한 템플릿을 INSERT (idempotent upsert by key).

---

## 2. TypeScript / 서비스

| 파일 | 작업 |
| :--- | :--- |
| `src/lib/supabase/database.types.ts` | 마이그레이션 후 타입 재생성 |
| `src/core/fields/fieldDefinitionService.ts` | **신규** list/create/update/softDelete (Supabase client, `parseSupabaseError`) |
| `src/core/fields/dynamicFieldEngine.ts` | DB 정의 로드 어댑터; 레지스트리는 폴백 |
| `src/core/customer/customFields.ts` | `INDUSTRY_CUSTOM_FIELDS`를 seed template export로 유지; 런타임 조회는 service |
| `src/capabilities/roster/config/rosterSchemaConfig.ts` | org 필드 정의 병합 |
| 온보딩 | QuickSetup / `create_organization_with_preset` 성공 후 seed 호출 |

테스트: `npx tsx src/core/fields/fieldDefinitionService.test.ts` (순수 매핑·시드 idempotent).

---

## 3. UI

| 화면 | 내용 |
| :--- | :--- |
| 설정 > 커스텀 필드 | entity 탭, 필드 CRUD, 44px 터치, 공통 `Modal`/`Button` |
| Student/Customer 폼 | `listFieldDefinitions` 기반 동적 입력 (기존 custom field 렌더러 재사용) |
| ProductCategoryManageModal | `parent_id` 선택(1단 부모만 1차; 무한 트리는 Phase 1.1+) |

UI 텍스트: 상수/copy 모듈, 하드코딩 남발 금지.

---

## 4. 구현 순서 (승인 후)

1. 마이그레이션 PR + 로컬/스테이징 적용  
2. `fieldDefinitionService` + 단위 테스트  
3. `customFields` / `rosterSchemaConfig` 연동  
4. 설정 UI  
5. 온보딩 시드  
6. products.metadata · category parent  
7. piano/pilates 회귀 체크리스트 + `npm run check:all`

---

## 5. 수락 기준 (DoD)

- [ ] org A에만 필드 추가 시 org B에 보이지 않음 (RLS) — 원격 마이그레이션 적용 후 검증  
- [x] 설정 UI로 추가한 select 필드가 명부 생성 모달에 나타나고 `metadata.custom_fields`에 저장 (코드 경로: Settings → FieldDefinitions → StudentFormModal resolve)  
- [x] 코드에서 `INDUSTRY_CUSTOM_FIELDS`를 수정하지 않고도 동일 효과 (DB SSOT + 시드 템플릿 폴백)  
- [x] soft delete 후 폼에서 사라지고 unique 재사용 가능 (서비스·RPC)  
- [ ] `check:all` 통과 — 단위 테스트·`tsc` 통과, 전체 게이트는 PR 전 실행  


---

## 6. 롤백

- 마이그레이션 down: `field_definitions` drop, products.metadata / parent_id drop (데이터 백업 후)  
- 앱: feature flag `fieldDefinitionsDb=false` 시 레거시 `INDUSTRY_CUSTOM_FIELDS` 폴백 (선택)
