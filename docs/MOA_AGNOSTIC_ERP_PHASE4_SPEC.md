# Phase 4 구현 스펙 — RBAC → RLS 단일화

> **상태:** 앱/마이그레이션 구현 · **원격 DB 적용 완료** (2026-11-28 승인) · 클로즈아웃 배선 포함  
> **상위 로드맵:** [MOA_AGNOSTIC_ERP_ROADMAP.md](./MOA_AGNOSTIC_ERP_ROADMAP.md)

마이그레이션: `supabase/migrations/20261128220000_phase4_rbac_permission_unification.sql`

---

## 산출물

| 영역 | 내용 |
| :--- | :--- |
| `core.permission_key_aliases` | 레거시 JSONB/colon 키 → canonical (`billing_invoices`→`finance.read` 등) |
| `resolve_canonical_permission` / `member_has_permission` | 매트릭스 + grants 통합 판정 |
| `has_permission` | 별칭 해석 + `settings.rbac.scope_fail_closed` 옵트인 fail-closed |
| 파일럿 RLS | `payments` / `sales` / `products`(쓰기) RESTRICTIVE |
| `sensitive_field_policies` + `get_customer_masked` | PII/금액 필드 ACL 최소 |
| TS | `permissionAliases`, `fieldAclService`, `authorizationGrantService`, registry 확장 |
| UI | `AuthorizationGrantsCard` (직급 설정 페이지) |

---

## 권한 키 별칭 (요약)

| legacy | canonical |
| :--- | :--- |
| `billing_invoices` / `billing:invoices:read` | `finance.read` |
| `statistics` | `reports.read` |
| `members_manage` / `members:manage` | `staff.manage` |
| `resources_manage` / `resources:manage` | `rooms.manage` |
| `inventory.manage` | `inventory.write` |

신규 catalog: `inventory.read`, `inventory.write`, `org.manage`

---

## 병렬 스택 폐기 일정

| 스택 | 현재 | 폐기 목표 | 비고 |
| :--- | :--- | :--- | :--- |
| `staffGrants` | 레거시 네비 탭 호환 | **2026-Q3** | `@deprecated`; 신규 권한은 grants/catalog |
| `feature_permissions` (멤버 JSON) | 잔존 읽기 | **2026-Q3** | organization_roles.permissions로 이전 |
| 중복 `tenant_roles` 개념 | organization_roles가 SSOT | 문서상 폐기 | 신규 테이블 금지 |
| ROLE_PERMISSION_KEYS underscore | 매트릭스 UI 유지 | 별칭으로 canonical 수렴 | UI 키는 점진 교체 |

원격 DB에 Phase 4 마이그레이션 적용 전에는 RLS 파일럿·마스킹 RPC가 동작하지 않는다.

---

## 검증

```bash
npx tsx src/core/authorization/permissionAliases.test.ts
npx tsx src/core/authorization/fieldAclService.test.ts
npx tsx src/core/authorization/authorizationCapability.test.ts
npx tsx src/providers/accessControlProvider.test.ts
npx tsc --noEmit
```
