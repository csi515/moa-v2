-- Schedule / Reservation / Session / Attendance 책임 경계.
-- 스키마 추가·삭제 없음. 기존 테이블 COMMENT만 정리한다.
--
-- Schedule            = core.schedules (슬롯). bookable 점유는 reservations.status
-- Reservation/Booking = core.reservations (슬롯 신청) 또는 customer 배정 schedules 행
-- Session             = core.customer_sessions (방문 사실)
-- Attendance          = core.attendance_sessions.check_in_at (PIN 체크인)
-- 수업 출석           = piano.attendance (Core 원장 아님)

COMMENT ON TABLE core.schedules IS
  'Schedule: 예약 가능한 시간 또는 운영 슬롯. '
  'is_bookable=true 이면 슬롯이고, 고객 예약 행위는 core.reservations 가 담당한다. '
  'customer_id 가 있는 비공개 일정(필라테스/피부 Booking)은 같은 행이 예약 행위이기도 하다. '
  '출석/방문 사실/체크인 상태를 저장하지 않는다.';

COMMENT ON COLUMN core.schedules.status IS
  '슬롯 또는 배정 일정의 수명주기. bookable 슬롯 점유는 reservations.status 로 계산한다. '
  '출석(present)이나 세션(active)과 동기화하지 않는다.';

COMMENT ON COLUMN core.schedules.is_bookable IS
  'true=고객이 신청할 수 있는 슬롯. false=운영 일정 또는 고객 배정 Booking 행.';

COMMENT ON TABLE core.reservations IS
  'Reservation/Booking: 고객이 bookable Schedule 에 신청한 예약 행위. '
  'schedules.status 를 갱신하지 않는다. 방문 사실(Session)이나 출석을 만들지 않는다.';

COMMENT ON COLUMN core.reservations.status IS
  'requested/confirmed/cancelled. 슬롯 점유의 source of truth. schedules.status 와 미러하지 않는다.';

COMMENT ON TABLE core.attendance_sessions IS
  'Attendance: PIN 등 체크인 상태. check_in_at 이 출석 여부다. '
  'Session(방문 세션)이나 Booking 원장이 아니다. 수업 출석은 piano.attendance 가 담당한다.';

COMMENT ON COLUMN core.attendance_sessions.check_in_at IS
  '체크인 시각. 값이 있으면 당일 출석(입실). 별도 status enum 을 두지 않는다.';

COMMENT ON TABLE core.customer_sessions IS
  'Session: 실제 이용 또는 방문 사실. 예약/출석 상태를 복사하지 않고 결제·이용권을 차감하지 않는다. '
  'reservation_id 는 room_reservations 참조이며 core.reservations 가 아니다.';
