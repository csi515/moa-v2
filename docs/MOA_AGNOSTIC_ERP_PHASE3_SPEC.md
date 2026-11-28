# Phase 3 구현 스펙 — 정책 엔진 (할당·과금·상태)

> **상태:** 앱/마이그레이션 구현 · **원격 DB 적용 완료** (2026-11-28 승인)  
> **상위 로드맵:** [MOA_AGNOSTIC_ERP_ROADMAP.md](./MOA_AGNOSTIC_ERP_ROADMAP.md)

마이그레이션: `supabase/migrations/20261128210000_phase3_allocation_tax_lifecycle_policies.sql`

---

## 3a 할당·재고·예약

| 산출물 | 내용 |
| :--- | :--- |
| `core.allocation_policies` | overbook / negative_stock / waitlist / safety alert |
| `resolve_allocation_policy` / `upsert_allocation_policy` | RPC |
| `book_schedule_slot` | overbook_mode + CAPACITY_EXCEEDED_WAITLIST |
| `apply_stock_movement` | negative_stock_mode (forbid/warn/allow), nonneg CHECK 제거 |
| 설정 UI | `PolicySettingsCard` |
| setupSchema 연결 | allowWaitlist → allow_waitlist, enableSafetyStockAlert → enable_safety_stock_alert |

**결정:** `booking_seat_locks`는 휴면 유지. 정원 직렬화는 `book_schedule_slot` FOR UPDATE가 SSOT. `hold_ttl_seconds`는 컬럼만 확보(소프트 홀드 후속).

---

## 3b 세금·절사

| 산출물 | 내용 |
| :--- | :--- |
| `core.tax_policies` / `rounding_policies` | 테넌트 정책 |
| `applyTaxToAmount` / `applyRounding` | 순수 함수 |
| POS | 세액·내세/외세 표시 (`SalePosView`) |

`pricing_plans` / `refund_penalty_schedules` 전체 모델은 후속(스텁 테이블 없이 금액 반영 게이트만 충족).

---

## 3c 예약 라이프사이클

| 산출물 | 내용 |
| :--- | :--- |
| `lifecycle_definitions` / `transitions` / `side_effects` | booking 도메인 |
| `seed_booking_lifecycle` | requested/confirmed/cancelled + notify 토글 |
| `bookingLifecycleService` | reservationMachine과 동형, side effect 설정 |

출결 도메인은 예약 게이트 이후.

---

## 검증

```bash
npx tsx src/core/policies/allocationPolicyService.test.ts
npx tsc --noEmit
```
