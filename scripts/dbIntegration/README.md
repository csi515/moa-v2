# DB 통합 테스트 (Commerce / Loyalty / Inventory / multi-role)

## 실행

```bash
# 자격 증명·게이트 없으면 dry-run (exit 0)
npm run test:commerce-db-it

# 실제 DB
MOA_DB_INTEGRATION=1 \
MOA_DB_IT_ALLOW_PROJECT_REFS=<your-project-ref> \
SUPABASE_SERVICE_ROLE_KEY=... \
MOA_DB_IT_OWNER_JWT=... \
npm run test:commerce-db-it
```

`project-ref`는 URL `https://<ref>.supabase.co` 의 `<ref>` 입니다.

## 안전장치

| 변수 | 역할 |
|---|---|
| `MOA_DB_INTEGRATION=1` | live 실행 옵트인 |
| `MOA_DB_IT_ALLOW_PROJECT_REFS` | 허용 project ref 콤마 목록. 미설정/불일치 시 **차단(exit 1)** |
| `SUPABASE_SERVICE_ROLE_KEY` | fixture 시드·cleanup (RPC auth에는 사용 안 함) |
| `MOA_DB_IT_OWNER_JWT` | 실제 RLS/RPC 호출용 (또는 `RLS_AUDIT_OWNER_A_JWT`) |

테스트 데이터는 `MOA_IT_` 접두사로 생성되며 `cleanup()`으로 삭제합니다.

## 관련 스크립트

- `npm run test:commerce-unit` — 기존 JS model/unit 스위트
- `npm run test:point-atomic` / `test:stock-movement-atomic` — 개별 DB opt-in 테스트
- `npm run test:textbook-sale-db-it` — 피아노 교재 판매/수납 DB 통합 (dry-run 기본)
- `npm run test:textbook-sale-legacy` — legacy localStorage merge unit
