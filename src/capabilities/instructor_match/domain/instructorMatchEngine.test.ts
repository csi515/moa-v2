import assert from 'node:assert/strict';
import {
  detectScheduleConflict,
  aggregateMonthlyInstructorSessions,
  validateInstructorProfile,
  generatePrintableLeafletData,
  type LessonSession,
} from './instructorMatchEngine';

function run() {
  const existing: LessonSession[] = [
    {
      id: 'sess-1',
      instructorId: 'inst-1',
      customerId: 'cust-1',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:00:00Z',
      status: 'COMPLETED',
      durationMinutes: 60,
    },
    {
      id: 'sess-2',
      instructorId: 'inst-1',
      customerId: 'cust-2',
      startAt: '2026-06-01T14:00:00Z',
      endAt: '2026-06-01T15:00:00Z',
      status: 'SCHEDULED',
      durationMinutes: 60,
    },
    {
      id: 'sess-3',
      instructorId: 'inst-2', // 다른 강사
      customerId: 'cust-3',
      startAt: '2026-06-01T10:30:00Z',
      endAt: '2026-06-01T11:30:00Z',
      status: 'SCHEDULED',
      durationMinutes: 60,
    },
  ];

  // 1. 시간 겹침 충돌 감지 (동일 강사 inst-1, 10:30 ~ 11:30 -> sess-1과 겹침)
  const conflict = detectScheduleConflict(existing, {
    instructorId: 'inst-1',
    startAt: '2026-06-01T10:30:00Z',
    endAt: '2026-06-01T11:30:00Z',
  });
  assert.equal(conflict.hasConflict, true);
  assert.deepEqual(conflict.conflictingSessionIds, ['sess-1']);

  // 2. 다른 강사와의 동시간대 세션 -> 충돌 없음
  const diffInst = detectScheduleConflict(existing, {
    instructorId: 'inst-3',
    startAt: '2026-06-01T10:00:00Z',
    endAt: '2026-06-01T11:00:00Z',
  });
  assert.equal(diffInst.hasConflict, false);

  // 3. 앞뒤로 맞닿은 연속 시간 (11:00 ~ 12:00) -> 충돌 없음
  const adjacent = detectScheduleConflict(existing, {
    instructorId: 'inst-1',
    startAt: '2026-06-01T11:00:00Z',
    endAt: '2026-06-01T12:00:00Z',
  });
  assert.equal(adjacent.hasConflict, false);

  // 4. 월간 실적 집계
  const stats = aggregateMonthlyInstructorSessions(existing, 'inst-1', '2026-06');
  assert.equal(stats.instructorId, 'inst-1');
  assert.equal(stats.totalCompleted, 1);
  assert.equal(stats.totalScheduled, 1);
  assert.equal(stats.totalCancelled, 0);
  assert.equal(stats.totalMinutesCompleted, 60);
  assert.equal(stats.uniqueCustomersCount, 1);

  // 5. [문화센터] 강사 프로필 유효성 검사
  const invalidProfile = validateInstructorProfile({
    staffName: '',
    headlineTitle: '',
    introduction: '짧음',
    specialties: [],
  });
  assert.equal(invalidProfile.isValid, false);
  assert.equal(invalidProfile.errors.length, 4);

  const sampleProfile = {
    staffId: 'inst-1',
    staffName: '이지은 파티시에',
    headlineTitle: '프랑스 정통 홈베이킹 마스터 12주',
    academicBackground: '프랑스 르꼬르동블루 제과 디플로마',
    careerHistory: ['전) 호텔신라 베이커리', '현) 아뜰리에 브레드 대표'],
    certifications: ['제과기능장', '바리스타 1급'],
    awards: ['2023 제과 페스티벌 금상'],
    introduction: '초보자도 집에서 쉽게 오븐으로 프로 수준의 바게트와 크루아상을 구울 수 있도록 원리와 테크닉을 꼼꼼히 전수합니다.',
    profileImageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c',
    specialties: ['홈베이킹', '천연발효종', '디저트'],
    majorCourses: [
      {
        courseName: '홈베이킹 제과제빵 초급반',
        targetAudience: '성인 입문/취미',
        scheduleSummary: '매주 화/목 10:00~11:30',
        curriculumHighlights: ['1주: 오븐 기초 & 식빵', '2주: 크루아상'],
      },
    ],
  };

  const validResult = validateInstructorProfile(sampleProfile);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.errors.length, 0);

  // 6. [문화센터] A4 인쇄용 포스터 데이터 정형화
  const leaflet = generatePrintableLeafletData(sampleProfile, {
    centerName: '광화문 문화센터',
    phone: '02-777-8888',
    location: '지하 1층 301호 조리실습실',
  });

  assert.equal(leaflet.header.instructorName, '이지은 파티시에');
  assert.equal(leaflet.header.headlineTitle, '프랑스 정통 홈베이킹 마스터 12주');
  assert.equal(leaflet.credentials.certifications.length, 2);
  assert.equal(leaflet.courses.length, 1);
  assert.equal(leaflet.footer.centerName, '광화문 문화센터');
  assert.ok(leaflet.footer.qrPayload.includes('inst-1'));

  console.log('instructorMatchEngine.test.ts: ok');
}

run();
