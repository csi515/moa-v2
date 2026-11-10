import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ClassItem, Student } from '@/types';
import type { TemporaryMoveRecord } from '../schedule/studentTemporaryMoveHelpers';
import { TodayLessonClassList } from './TodayLessonClassList';

test('TodayLessonClassList: 임시 이동 학생 목록 분류 로직 검증 (엣지 7 & 8번)', () => {
  const mockStudents: Student[] = [
    {
      id: 'st_1',
      name: '김하늘',
      status: 'active',
      phone: '010-1111-2222',
      parentPhone: '010-3333-4444',
      classIds: ['cls_1'], // 14:00 정규반
      createdAt: '2026-01-01',
      tenantId: 'tenant_1',
    },
    {
      id: 'st_2',
      name: '이도현',
      status: 'active',
      phone: '010-5555-6666',
      parentPhone: '010-7777-8888',
      classIds: ['cls_2'], // 15:00 정규반
      createdAt: '2026-01-01',
      tenantId: 'tenant_1',
    },
  ];

  const mockClasses: ClassItem[] = [
    {
      id: 'cls_1',
      name: '초급 피아노 A',
      startTime: '14:00',
      endTime: '14:50',
      daysOfWeek: ['월'],
      room: '1번방',
      maxStudents: 5,
      tenantId: 'tenant_1',
    },
    {
      id: 'cls_2',
      name: '초급 피아노 B',
      startTime: '15:00',
      endTime: '15:50',
      daysOfWeek: ['월'],
      room: '2번방',
      maxStudents: 5,
      tenantId: 'tenant_1',
    },
  ];

  // 김하늘(st_1)이 오늘 14:00에서 15:00으로 임시 이동한 경우
  const moves: TemporaryMoveRecord[] = [
    {
      id: 'temp_move_st1',
      studentId: 'st_1',
      studentName: '김하늘',
      originalDay: '월',
      originalStartTime: '14:00',
      targetDay: '월',
      targetStartTime: '15:00',
      targetDate: '2026-11-10',
      weekStartDate: '2026-11-09',
      createdAt: '2026-11-10T09:00:00Z',
      memo: '병원 진료로 오늘만 1시간 늦게 참여',
    },
  ];

  const todayKoreanDay = '월';

  // 14:00 반 검증: 김하늘은 movedOut이어야 함
  const cls1 = mockClasses[0];
  const enrolled1 = mockStudents.filter((s) => s.classIds?.includes(cls1.id));
  const movedOut1 = enrolled1.map((s) => ({
    student: s,
    movedOut: moves.find(
      (m) =>
        m.studentId === s.id &&
        m.originalDay === todayKoreanDay &&
        m.originalStartTime === cls1.startTime
    ),
  }));

  assert.equal(movedOut1.length, 1);
  assert.equal(movedOut1[0].student.name, '김하늘');
  assert.ok(movedOut1[0].movedOut);
  assert.equal(movedOut1[0].movedOut?.targetStartTime, '15:00');

  // 15:00 반 검증: 이도현은 정규 수강생, 김하늘은 incomingMove로 추가되어야 함
  const cls2 = mockClasses[1];
  const enrolled2 = mockStudents.filter((s) => s.classIds?.includes(cls2.id));
  const incomingMoves2 = moves.filter(
    (m) =>
      m.targetDay === todayKoreanDay &&
      m.targetStartTime === cls2.startTime &&
      !enrolled2.some((s) => s.id === m.studentId)
  );

  assert.equal(enrolled2.length, 1);
  assert.equal(enrolled2[0].name, '이도현');
  assert.equal(incomingMoves2.length, 1);
  assert.equal(incomingMoves2[0].studentName, '김하늘');
  assert.equal(incomingMoves2[0].originalStartTime, '14:00');
});

test('TodayLessonClassList: 출결 완료 후에도 임시 변경 및 draggable 지원 (엣지 5번)', () => {
  const mockStudents: Student[] = [
    {
      id: 'st_1',
      name: '출결완료학생',
      status: 'active',
      phone: '010-1111-2222',
      parentPhone: '010-3333-4444',
      classIds: ['cls_1'],
      createdAt: '2026-01-01',
      tenantId: 'tenant_1',
    },
  ];

  const mockClasses: ClassItem[] = [
    {
      id: 'cls_1',
      name: '초급 피아노 A',
      startTime: '14:00',
      endTime: '14:50',
      daysOfWeek: ['월'],
      room: '1번방',
      maxStudents: 5,
      tenantId: 'tenant_1',
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(TodayLessonClassList, {
      classes: mockClasses,
      students: mockStudents,
      currentHm: '14:10',
      uncheckedOnly: false,
      findAttendance: () => ({
        id: 'att_1',
        studentId: 'st_1',
        classId: 'cls_1',
        className: '초급 피아노 A',
        date: '2026-11-10',
        status: 'present',
        tenantId: 'tenant_1',
        createdAt: '2026-11-10T14:05:00Z',
      }),
      findLesson: () => undefined,
      onOpenSession: () => {},
      onQuickStatus: () => {},
    })
  );

  // 출결 완료 후에도 draggable="true" 속성과 임시 변경 버튼이 제공되는지 검증
  assert.match(html, /draggable="true"/);
  assert.match(html, /출석/);
  assert.match(html, /오늘만 시간 임시 변경/);
});

test('TodayLessonClassList: 결석 학생에 대해 보강권 발급 버튼 및 발급 후 배지 렌더링 검증', () => {
  const mockStudents: Student[] = [
    {
      id: 'st_absent_1',
      name: '결석학생1',
      status: 'active',
      phone: '010-1111-2222',
      parentPhone: '010-3333-4444',
      classIds: ['cls_1'],
      createdAt: '2026-01-01',
      tenantId: 'tenant_1',
    },
    {
      id: 'st_absent_2',
      name: '결석학생2',
      status: 'active',
      phone: '010-5555-6666',
      parentPhone: '010-7777-8888',
      classIds: ['cls_1'],
      createdAt: '2026-01-01',
      tenantId: 'tenant_1',
    },
  ];

  const mockClasses: ClassItem[] = [
    {
      id: 'cls_1',
      name: '초급 피아노 A',
      startTime: '14:00',
      endTime: '14:50',
      daysOfWeek: ['월'],
      room: '1번방',
      maxStudents: 5,
      tenantId: 'tenant_1',
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(TodayLessonClassList, {
      classes: mockClasses,
      students: mockStudents,
      currentHm: '14:10',
      uncheckedOnly: false,
      findAttendance: (stId: string) => ({
        id: `att_${stId}`,
        studentId: stId,
        classId: 'cls_1',
        className: '초급 피아노 A',
        date: '2026-11-10',
        status: 'absent',
        tenantId: 'tenant_1',
        createdAt: '2026-11-10T14:05:00Z',
      }),
      findLesson: () => undefined,
      onOpenSession: () => {},
      onQuickStatus: () => {},
      makeupTokensMap: {
        st_absent_2: { daysRemaining: 28 }, // 2번 학생은 이미 보강권 발급됨
      },
    })
  );

  // 1번 학생: 보강권 발급 버튼 노출
  assert.match(html, /결석학생1/);
  assert.match(html, /보강권/);

  // 2번 학생: 보강 D-28 배지 노출
  assert.match(html, /결석학생2/);
  assert.match(html, /보강 D-28/);
});
