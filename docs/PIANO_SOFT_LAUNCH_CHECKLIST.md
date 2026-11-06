# 피아노 학원 Soft launch Go / No-go 체크리스트

초대제 파일럿 전에 아래를 모두 확인한다. Open public은 Soft launch 1~2주 모니터링 후.

## Trust (가짜 기능 차단)

- [ ] 기본 피아노 프리셋에 `retention_marketing` / `vehicle_shuttle` / `membership_referral_tree` 미포함
- [ ] 리텐션 화면 진입 시 「미리보기 · 실제 외부 발송 없음」 배지, 발송 CTA는 준비 중 안내
- [ ] 현금영수증 UI가 「학원에 요청 / 현장 발행 기록」이며 국세청 자동 발행처럼 보이지 않음
- [ ] 온보딩 퀘스트·도움말이 앱 푸시/인앱만 안내 (카카오·SMS 미약속)

## Ops proof

- [ ] 스테이징 실계정: 학생 등록 → 시간표 배치 → 출결 → 수납 1건 수동 완료
- [ ] `npx playwright test tests/e2e/piano-wave1-ops-smoke.spec.ts` green
- [ ] PROD에서 `DEMO_PASSES` / textbook `local_demo` silent 성공 없음

## Roles & empty

- [ ] 직원 초대 시 직급(tenant_roles) 선택 UI 노출, 초대 토큰에 `role_id` 포함
- [ ] 시간표·출결 empty에 「학생 등록 / 시간표 이동」 CTA
- [ ] 진도 화면에 「기기 로컬 베타」 배지

## Legal / support

- [ ] `/pricing` 공개, 약관 제9조가 요금제 페이지를 가리킴
- [ ] `VITE_SUPPORT_EMAIL` 실운영 주소로 설정 (기본 `support@moa.app` 금지)
- [ ] `/support`에서 요금제 링크 확인

## Go 기준

- Soft launch 학원에서 가짜 알림톡/가짜 현금영수증 티켓 0건
- 신규 원장 90분 내 학생·시간표·출결·수납 1사이클 완료(중앙값)
- 기본 메뉴에 셔틀/리텐션/추천 미노출
