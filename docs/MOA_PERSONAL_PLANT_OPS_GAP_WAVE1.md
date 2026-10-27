# personal_plant_ops Gap Wave 1

## 셔틀

- Cap: `shuttle_dispatch` (학원형 `vehicle_shuttle` 미포함)
- 런처: `/workspace/shuttle/my`
- 총무 역할: `shuttle:manage`

## R&D 포털 게이트

- 권한 키: `rnd_portal:access`
- owner/admin 또는 해당 키 보유자만 `/rnd` 진입·런처 타일 표시
- 일반 직원의 `research_project:view`는 유지하되 포털 진입과 분리
- 연구·MBO 담당 프리셋 역할에 `rnd_portal:access` 부여

## 제외

- `office_supply_request` Phase 2
