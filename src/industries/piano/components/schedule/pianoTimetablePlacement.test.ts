/**
 * 피아노 시간표 배치 로직 단위 테스트
 * 실행: npm run test:timetable-placement
 * mock.module 지정자는 import.meta.resolve로 절대 URL을 쓴다.
 * (Node 20은 '@/…'를 테스트 파일 기준 상대 URL로 해석해 CI에서 ERR_MODULE_NOT_FOUND가 난다)
 */
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import type { AttendanceRecord, ClassItem, Student, Teacher } from '@/types';

type Store = {
  classes: ClassItem[];
  students: Student[];
  attendance: AttendanceRecord[];
  saveAttendanceCalls: number;
};

function makeTeacher(partial?: Partial<Teacher>): Teacher {
  return {
    id: 't1',
    name: '김선생',
    phone: '01000000000',
    hireDate: '2024-01-01',
    status: 'active',
    ...partial,
  };
}

function makeStudent(partial?: Partial<Student>): Student {
  return {
    id: 's1',
    studentNumber: 'STU-1',
    name: '홍길동',
    gender: 'M',
    birthDate: '2015-01-01',
    school: '테스트초',
    grade: '초3',
    joinDate: '2024-01-01',
    status: 'active',
    teacherId: 't1',
    teacherName: '김선생',
    classIds: [],
    level: '초급',
    tuitionFee: 0,
    paymentDay: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

function makeClass(partial: Partial<ClassItem> & Pick<ClassItem, 'id' | 'daysOfWeek' | 'startTime'>): ClassItem {
  return {
    name: partial.name || `${partial.daysOfWeek[0]} ${partial.startTime}`,
    teacherId: 't1',
    teacherName: '김선생',
    endTime: '16:20',
    capacity: 4,
    room: '연습실',
    color: '#4f46e5',
    ...partial,
  };
}

function installStorageMock(store: Store) {
  let classSeq = 100;
  const StorageService = {
    getSettings: () => ({ rooms: [{ id: 'r1', name: '연습실1' }] }),
    getStudents: () => store.students.map((s) => ({ ...s, classIds: [...s.classIds] })),
    getClasses: () => store.classes.map((c) => ({ ...c, daysOfWeek: [...c.daysOfWeek] })),
    getAttendance: () => store.attendance.map((a) => ({ ...a })),
    saveAttendance: () => {
      store.saveAttendanceCalls += 1;
      throw new Error('출결 저장이 호출되면 안 됩니다');
    },
    saveClass: (cls: Omit<ClassItem, 'id'> & { id?: string }): ClassItem => {
      const id = cls.id || `cls-auto-${++classSeq}`;
      const saved: ClassItem = { ...(cls as ClassItem), id };
      const idx = store.classes.findIndex((c) => c.id === id);
      if (idx >= 0) store.classes[idx] = saved;
      else store.classes.push(saved);
      return saved;
    },
    saveStudent: (
      student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string;
        createdAt?: string;
      }
    ): Student => {
      const id = student.id || 's-new';
      const saved: Student = {
        ...makeStudent(),
        ...student,
        id,
        classIds: [...(student.classIds || [])],
        updatedAt: '2024-06-01T00:00:00.000Z',
        createdAt: student.createdAt || '2024-01-01T00:00:00.000Z',
      } as Student;
      const idx = store.students.findIndex((s) => s.id === id);
      if (idx >= 0) store.students[idx] = saved;
      else store.students.push(saved);
      return saved;
    },
  };

  mock.module(new URL('../../../../services/storage.ts', import.meta.url).href, {
    namedExports: { StorageService },
  });

  return StorageService;
}

async function run(): Promise<void> {
  const store: Store = {
    classes: [],
    students: [],
    attendance: [
      {
        id: 'att-keep',
        date: '2024-06-01',
        studentId: 's1',
        studentName: '홍길동',
        classId: 'cls-mon-1500',
        className: '월 15:00',
        status: 'present',
        createdBy: 'test',
      },
    ],
    saveAttendanceCalls: 0,
  };

  installStorageMock(store);

  const placementMod = await import('./pianoTimetablePlacement');
  const {
    assignStudentToSlot,
    moveStudentToSlot,
    ensureEditableSlotClass,
    findEditableSlotClass,
    getPlacementsForSlot,
    isEditableSlotClass,
    TIMETABLE_SLOTS,
  } = placementMod;
  // 동적 import 타입 축소 방지 — 슬롯 목록은 string[]로 취급
  const resolveTimetableSlots = placementMod.resolveTimetableSlots as (
    classes: ClassItem[]
  ) => string[];

  const teacher = makeTeacher();
  const teachers = [teacher];

  // --- 1. 기존 단일 요일/시간 반이 있으면 재사용 ---
  const existingSlot = makeClass({
    id: 'cls-mon-1500',
    daysOfWeek: ['월'],
    startTime: '15:00',
    endTime: '15:50',
    name: '월 15:00',
  });
  store.classes = [existingSlot];
  store.students = [makeStudent({ id: 's1', classIds: [] })];

  const ensured = ensureEditableSlotClass({
    classes: store.classes,
    day: '월',
    startTime: '15:00',
    teachers,
    createIfMissing: true,
  });
  assert.ok(ensured);
  assert.equal(ensured.id, 'cls-mon-1500');
  assert.equal(store.classes.length, 1, '기존 반을 재사용하므로 반이 추가되면 안 됨');

  const assignedReuse = assignStudentToSlot({
    student: store.students[0],
    day: '월',
    startTime: '15:00',
    classes: store.classes,
    teachers,
    createClassIfMissing: true,
  });
  assert.equal(assignedReuse.ok, true);
  if (assignedReuse.ok) {
    assert.equal(assignedReuse.classItem.id, 'cls-mon-1500');
    assert.equal(assignedReuse.createdClass, false);
  }

  // --- 2. 학생 배치 시 classIds가 해당 반을 포함 ---
  assert.ok(assignedReuse.ok);
  if (assignedReuse.ok) {
    assert.ok(assignedReuse.student.classIds.includes('cls-mon-1500'));
    assert.ok(store.students[0].classIds.includes('cls-mon-1500'));
  }

  // --- 6. 30분 단위 시작 시간(15:30) 정상 처리 ---
  const slot1530 = makeClass({
    id: 'cls-mon-1530',
    daysOfWeek: ['월'],
    startTime: '15:30',
    endTime: '16:20',
    name: '월 15:30',
  });
  store.classes.push(slot1530);
  assert.equal(isEditableSlotClass(slot1530, '월', '15:30'), true);
  assert.equal(findEditableSlotClass(store.classes, '월', '15:30')?.id, 'cls-mon-1530');

  const studentFor1530 = makeStudent({ id: 's2', name: '김영희', classIds: [] });
  store.students.push(studentFor1530);
  const assigned1530 = assignStudentToSlot({
    student: studentFor1530,
    day: '월',
    startTime: '15:30',
    classes: store.classes,
    teachers,
    createClassIfMissing: false,
  });
  assert.equal(assigned1530.ok, true);
  if (assigned1530.ok) {
    assert.equal(assigned1530.classItem.id, 'cls-mon-1530');
    assert.ok(assigned1530.student.classIds.includes('cls-mon-1530'));
  }
  const placements1530 = getPlacementsForSlot(store.students, store.classes, '월', '15:30');
  assert.ok(placements1530.some((p) => p.student.id === 's2' && p.classItem.id === 'cls-mon-1530'));

  // --- 3. 학생 이동 시 기존 같은 요일의 배치가 정리됨 ---
  const fromClass = makeClass({
    id: 'cls-tue-1400',
    daysOfWeek: ['화'],
    startTime: '14:00',
    endTime: '14:50',
  });
  const toClass = makeClass({
    id: 'cls-tue-1600',
    daysOfWeek: ['화'],
    startTime: '16:00',
    endTime: '16:50',
  });
  const mover = makeStudent({
    id: 's-move',
    name: '이동학생',
    classIds: [fromClass.id],
  });
  store.classes = [fromClass, toClass];
  store.students = [mover];

  const moved = moveStudentToSlot({
    student: mover,
    from: { classItem: fromClass, day: '화', startTime: '14:00' },
    toDay: '화',
    toStartTime: '16:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(moved.ok, true);
  if (moved.ok) {
    assert.equal(moved.student.classIds.includes(fromClass.id), false);
    assert.equal(moved.student.classIds.includes(toClass.id), true);
  }

  // 같은 요일 다른 단일 슬롯 이동 (assign 경로)
  const monA = makeClass({ id: 'cls-wed-1000', daysOfWeek: ['수'], startTime: '10:00', endTime: '10:50' });
  const monB = makeClass({ id: 'cls-wed-1100', daysOfWeek: ['수'], startTime: '11:00', endTime: '11:50' });
  const sameDayStudent = makeStudent({ id: 's-same-day', classIds: [monA.id] });
  store.classes = [monA, monB];
  store.students = [sameDayStudent];
  const reassigned = assignStudentToSlot({
    student: sameDayStudent,
    day: '수',
    startTime: '11:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(reassigned.ok, true);
  if (reassigned.ok) {
    assert.equal(reassigned.student.classIds.includes(monA.id), false);
    assert.equal(reassigned.student.classIds.includes(monB.id), true);
  }

  // --- 5. 여러 요일 반은 기존 소속을 함부로 삭제하지 않음 ---
  const multiDay = makeClass({
    id: 'cls-multi',
    name: '월수금 정규반',
    daysOfWeek: ['월', '수', '금'],
    startTime: '15:00',
    endTime: '15:50',
  });
  const singleMon = makeClass({
    id: 'cls-single-mon-1600',
    daysOfWeek: ['월'],
    startTime: '16:00',
    endTime: '16:50',
  });
  const singleMonTarget = makeClass({
    id: 'cls-single-mon-1700',
    daysOfWeek: ['월'],
    startTime: '17:00',
    endTime: '17:50',
  });
  const multiStudent = makeStudent({
    id: 's-multi',
    classIds: [multiDay.id, singleMon.id],
  });
  store.classes = [multiDay, singleMon, singleMonTarget];
  store.students = [multiStudent];

  const keepMulti = assignStudentToSlot({
    student: multiStudent,
    day: '월',
    startTime: '17:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(keepMulti.ok, true);
  if (keepMulti.ok) {
    assert.ok(
      keepMulti.student.classIds.includes(multiDay.id),
      '복수 요일 반 소속은 유지되어야 함'
    );
    assert.equal(keepMulti.student.classIds.includes(singleMon.id), false);
    assert.ok(keepMulti.student.classIds.includes(singleMonTarget.id));
  }

  // --- 7. 동일 학생을 같은 시간에 중복 배치할 수 없음 ---
  const dupClass = makeClass({
    id: 'cls-thu-1300',
    daysOfWeek: ['목'],
    startTime: '13:00',
    endTime: '13:50',
  });
  const dupStudent = makeStudent({ id: 's-dup', classIds: [dupClass.id] });
  store.classes = [dupClass];
  store.students = [dupStudent];
  const duplicate = assignStudentToSlot({
    student: dupStudent,
    day: '목',
    startTime: '13:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.match(duplicate.message, /이미 해당 시간대/);
  }

  // --- 4. 출결 데이터는 변경되지 않음 ---
  const attendanceBefore = JSON.stringify(store.attendance);
  store.saveAttendanceCalls = 0;
  // 배치·이동 시나리오를 한 번 더 실행해도 출결 스냅샷 유지
  const attStudent = makeStudent({ id: 's-att', classIds: [] });
  const attClass = makeClass({
    id: 'cls-fri-0900',
    daysOfWeek: ['금'],
    startTime: '09:00',
    endTime: '09:50',
  });
  store.classes = [attClass];
  store.students = [attStudent];
  const attAssign = assignStudentToSlot({
    student: attStudent,
    day: '금',
    startTime: '09:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(attAssign.ok, true);
  assert.equal(store.saveAttendanceCalls, 0);
  assert.equal(JSON.stringify(store.attendance), attendanceBefore);

  // --- 위험 케이스 1~2. 정원 4 → 5명 자동 증가 금지, 초과 배치 실패 ---
  const fullClass = makeClass({
    id: 'cls-sat-1000',
    daysOfWeek: ['토'],
    startTime: '10:00',
    endTime: '10:50',
    capacity: 4,
  });
  const seated = [1, 2, 3, 4].map((n) =>
    makeStudent({
      id: `s-full-${n}`,
      name: `만석${n}`,
      classIds: [fullClass.id],
    })
  );
  const fifth = makeStudent({ id: 's-full-5', name: '다섯째', classIds: [] });
  store.classes = [fullClass];
  store.students = [...seated, fifth];

  const overCapacity = assignStudentToSlot({
    student: fifth,
    day: '토',
    startTime: '10:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(overCapacity.ok, false, '위험2: 정원 초과 배치는 실패해야 함');
  if (!overCapacity.ok) {
    assert.match(overCapacity.message, /정원/);
    assert.match(overCapacity.message, /반 관리/);
  }
  assert.equal(
    store.classes.find((c) => c.id === 'cls-sat-1000')?.capacity,
    4,
    '위험1: 정원 4명 반이 5명으로 자동 증가하면 안 됨'
  );
  assert.notEqual(
    store.classes.find((c) => c.id === 'cls-sat-1000')?.capacity,
    5,
    '위험1: capacity가 5로 바뀌면 안 됨'
  );
  assert.equal(fifth.classIds.includes('cls-sat-1000'), false);
  assert.equal(
    store.students.find((s) => s.id === 's-full-5')?.classIds.includes('cls-sat-1000'),
    false
  );

  // ensureEditableSlotClass도 기존 반 capacity를 올리지 않음
  const ensuredNoBump = ensureEditableSlotClass({
    classes: store.classes,
    day: '토',
    startTime: '10:00',
    teachers,
    minCapacity: 10,
    createIfMissing: false,
  });
  assert.ok(ensuredNoBump);
  assert.equal(ensuredNoBump.capacity, 4);
  assert.equal(store.classes.find((c) => c.id === 'cls-sat-1000')?.capacity, 4);

  // 정원 여유 있으면 4명까지 정상 배치
  const roomy = makeClass({
    id: 'cls-sun-1100',
    daysOfWeek: ['일'],
    startTime: '11:00',
    endTime: '11:50',
    capacity: 4,
  });
  store.classes = [roomy];
  store.students = [];
  for (let n = 1; n <= 4; n++) {
    const s = makeStudent({ id: `s-roomy-${n}`, name: `여유${n}`, classIds: [] });
    store.students.push(s);
    const r = assignStudentToSlot({
      student: s,
      day: '일',
      startTime: '11:00',
      classes: store.classes,
      teachers,
    });
    assert.equal(r.ok, true, `${n}번째 학생은 정원 내 배치되어야 함`);
  }
  assert.equal(store.classes.find((c) => c.id === 'cls-sun-1100')?.capacity, 4);

  // 이동: 만석 대상 슬롯으로는 이동 불가, 원 슬롯 소속·capacity 유지
  const moveFrom = makeClass({
    id: 'cls-mon-0900-from',
    daysOfWeek: ['월'],
    startTime: '09:00',
    endTime: '09:50',
    capacity: 4,
  });
  const moveToFull = makeClass({
    id: 'cls-mon-1000-full',
    daysOfWeek: ['월'],
    startTime: '10:00',
    endTime: '10:50',
    capacity: 2,
  });
  const moverA = makeStudent({ id: 's-cap-move', name: '이동자', classIds: [moveFrom.id] });
  const toSeated = [
    makeStudent({ id: 's-cap-a', classIds: [moveToFull.id] }),
    makeStudent({ id: 's-cap-b', classIds: [moveToFull.id] }),
  ];
  store.classes = [moveFrom, moveToFull];
  store.students = [moverA, ...toSeated];
  const moveBlocked = moveStudentToSlot({
    student: moverA,
    from: { classItem: moveFrom, day: '월', startTime: '09:00' },
    toDay: '월',
    toStartTime: '10:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(moveBlocked.ok, false);
  if (!moveBlocked.ok) {
    assert.match(moveBlocked.message, /정원/);
  }
  assert.equal(
    store.students.find((s) => s.id === 's-cap-move')?.classIds.includes(moveFrom.id),
    true,
    '만석으로 이동 실패 시 원 슬롯 소속이 유지되어야 함'
  );
  assert.equal(store.classes.find((c) => c.id === moveToFull.id)?.capacity, 2);

  // 여유 있는 슬롯으로 이동은 정상
  const moveToOpen = makeClass({
    id: 'cls-mon-1100-open',
    daysOfWeek: ['월'],
    startTime: '11:00',
    endTime: '11:50',
    capacity: 4,
  });
  store.classes = [moveFrom, moveToOpen];
  store.students = [makeStudent({ id: 's-cap-move', name: '이동자', classIds: [moveFrom.id] })];
  const moveOk = moveStudentToSlot({
    student: store.students[0],
    from: { classItem: moveFrom, day: '월', startTime: '09:00' },
    toDay: '월',
    toStartTime: '11:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(moveOk.ok, true);
  if (moveOk.ok) {
    assert.equal(moveOk.student.classIds.includes(moveFrom.id), false);
    assert.equal(moveOk.student.classIds.includes(moveToOpen.id), true);
  }

  // --- 위험 케이스 3. preferredTeacherId 없음 → 첫 강사 자동 지정 금지(미배정) ---
  const teacher2 = makeTeacher({ id: 't2', name: '이선생' });
  const teachersWithTwo = [teacher, teacher2];
  store.classes = [];
  store.students = [makeStudent({ id: 's-unassigned', name: '미배정반학생', classIds: [] })];
  const createdUnassigned = assignStudentToSlot({
    student: store.students[0],
    day: '화',
    startTime: '09:00',
    classes: store.classes,
    teachers: teachersWithTwo,
    createClassIfMissing: true,
  });
  assert.equal(createdUnassigned.ok, true);
  if (createdUnassigned.ok) {
    assert.equal(createdUnassigned.createdClass, true);
    assert.equal(createdUnassigned.classItem.teacherId, '');
    assert.equal(createdUnassigned.classItem.teacherName, '미배정');
    assert.notEqual(
      createdUnassigned.classItem.teacherId,
      teachersWithTwo[0].id,
      '위험3: 첫 번째 활성 강사로 자동 지정되면 안 됨'
    );
    assert.notEqual(createdUnassigned.classItem.teacherName, teachersWithTwo[0].name);
  }

  // --- 위험 케이스 4. preferredTeacherId 있으면 해당 강사 지정 ---
  store.classes = [];
  store.students = [makeStudent({ id: 's-pref-t', name: '지정강사학생', classIds: [] })];
  const createdPreferred = assignStudentToSlot({
    student: store.students[0],
    day: '화',
    startTime: '10:00',
    classes: store.classes,
    teachers: teachersWithTwo,
    preferredTeacherId: 't2',
    createClassIfMissing: true,
  });
  assert.equal(createdPreferred.ok, true);
  if (createdPreferred.ok) {
    assert.equal(createdPreferred.classItem.teacherId, 't2', '위험4: preferred 강사 id');
    assert.equal(createdPreferred.classItem.teacherName, '이선생', '위험4: preferred 강사 이름');
  }

  // --- 위험 케이스 5. 기존 반 재사용 시 담당 강사 유지 ---
  const reuseWithTeacher = makeClass({
    id: 'cls-reuse-teacher',
    daysOfWeek: ['수'],
    startTime: '12:00',
    endTime: '12:50',
    teacherId: 't-keep',
    teacherName: '유지선생',
  });
  store.classes = [reuseWithTeacher];
  store.students = [makeStudent({ id: 's-reuse-t', classIds: [] })];
  const reused = ensureEditableSlotClass({
    classes: store.classes,
    day: '수',
    startTime: '12:00',
    teachers: teachersWithTwo,
    minCapacity: 1,
    createIfMissing: true,
  });
  assert.ok(reused);
  assert.equal(reused.id, 'cls-reuse-teacher');
  assert.equal(reused.teacherId, 't-keep', '위험5: 재사용 시 teacherId 유지');
  assert.equal(reused.teacherName, '유지선생', '위험5: 재사용 시 teacherName 유지');
  assert.equal(store.classes.length, 1);

  const assignedReuseTeacher = assignStudentToSlot({
    student: store.students[0],
    day: '수',
    startTime: '12:00',
    classes: store.classes,
    teachers: teachersWithTwo,
    createClassIfMissing: true,
  });
  assert.equal(assignedReuseTeacher.ok, true);
  if (assignedReuseTeacher.ok) {
    assert.equal(assignedReuseTeacher.classItem.teacherId, 't-keep');
    assert.equal(assignedReuseTeacher.classItem.teacherName, '유지선생');
  }
  assert.equal(store.classes.find((c) => c.id === 'cls-reuse-teacher')?.teacherId, 't-keep');
  assert.equal(store.classes.find((c) => c.id === 'cls-reuse-teacher')?.teacherName, '유지선생');

  // --- 위험 케이스 6. 새 반 자동 생성 시 강사·연습실 충돌 검사 ---
  // 강사 충돌: 기존 월 15:00(t1)과 겹치는 월 15:30 슬롯에 t1로 새 반 생성 시도
  const overlapTeacherClass = makeClass({
    id: 'cls-overlap-t',
    daysOfWeek: ['월'],
    startTime: '15:00',
    endTime: '15:50',
    teacherId: 't1',
    teacherName: '김선생',
    room: '연습실1',
  });
  store.classes = [overlapTeacherClass];
  store.students = [makeStudent({ id: 's-conflict-t', name: '충돌학생', classIds: [] })];
  const classCountBeforeTeacherConflict = store.classes.length;
  const teacherConflict = assignStudentToSlot({
    student: store.students[0],
    day: '월',
    startTime: '15:30',
    classes: store.classes,
    teachers: teachersWithTwo,
    preferredTeacherId: 't1',
    createClassIfMissing: true,
  });
  assert.equal(teacherConflict.ok, false, '강사 일정 충돌 시 배치 실패');
  if (!teacherConflict.ok) {
    assert.match(teacherConflict.message, /새 반을 만들 수 없습니다/);
    assert.match(teacherConflict.message, /강사/);
    assert.notEqual(teacherConflict.needsNewClass, true);
  }
  assert.equal(store.classes.length, classCountBeforeTeacherConflict, '충돌 시 반이 생성되면 안 됨');
  assert.equal(
    store.students.find((s) => s.id === 's-conflict-t')?.classIds.length,
    0,
    '충돌 시 학생 classIds가 바뀌면 안 됨'
  );

  // 연습실 충돌: 미배정 강사라도 기본 실(연습실1)이 겹치면 거부
  const overlapRoomClass = makeClass({
    id: 'cls-overlap-r',
    daysOfWeek: ['목'],
    startTime: '16:00',
    endTime: '16:50',
    teacherId: 't2',
    teacherName: '이선생',
    room: '연습실1',
  });
  store.classes = [overlapRoomClass];
  store.students = [makeStudent({ id: 's-conflict-r', classIds: [] })];
  const roomConflict = assignStudentToSlot({
    student: store.students[0],
    day: '목',
    startTime: '16:30',
    classes: store.classes,
    teachers: teachersWithTwo,
    createClassIfMissing: true,
  });
  assert.equal(roomConflict.ok, false, '연습실 일정 충돌 시 배치 실패');
  if (!roomConflict.ok) {
    assert.match(roomConflict.message, /연습실|새 반을 만들 수 없습니다/);
  }
  assert.equal(store.classes.length, 1);
  assert.equal(store.students.find((s) => s.id === 's-conflict-r')?.classIds.length, 0);

  // 충돌 없으면 새 반 생성·배치 정상 (다른 요일)
  store.classes = [overlapTeacherClass];
  store.students = [makeStudent({ id: 's-no-conflict', classIds: [] })];
  const noConflict = assignStudentToSlot({
    student: store.students[0],
    day: '금',
    startTime: '15:00',
    classes: store.classes,
    teachers: teachersWithTwo,
    preferredTeacherId: 't1',
    createClassIfMissing: true,
  });
  assert.equal(noConflict.ok, true);
  if (noConflict.ok) {
    assert.equal(noConflict.createdClass, true);
    assert.equal(noConflict.classItem.teacherId, 't1');
  }

  // createClassIfMissing=false면 충돌 검사 전에 needsNewClass 유지
  store.classes = [overlapTeacherClass];
  store.students = [makeStudent({ id: 's-needs-new', classIds: [] })];
  const stillNeedsNew = assignStudentToSlot({
    student: store.students[0],
    day: '월',
    startTime: '15:30',
    classes: store.classes,
    teachers: teachersWithTwo,
    preferredTeacherId: 't1',
    createClassIfMissing: false,
  });
  assert.equal(stillNeedsNew.ok, false);
  if (!stillNeedsNew.ok) {
    assert.equal(stillNeedsNew.needsNewClass, true);
  }

  // 이동: 충돌 나는 새 슬롯이면 원 슬롯 소속 유지
  const moveFromOk = makeClass({
    id: 'cls-move-from-ok',
    daysOfWeek: ['화'],
    startTime: '09:00',
    endTime: '09:50',
    teacherId: 't2',
    teacherName: '이선생',
    room: '연습실2',
  });
  store.classes = [overlapTeacherClass, moveFromOk];
  store.students = [
    makeStudent({ id: 's-move-conflict', name: '이동충돌', classIds: [moveFromOk.id] }),
  ];
  const moveConflict = moveStudentToSlot({
    student: store.students[0],
    from: { classItem: moveFromOk, day: '화', startTime: '09:00' },
    toDay: '월',
    toStartTime: '15:30',
    classes: store.classes,
    teachers: teachersWithTwo,
    preferredTeacherId: 't1',
    createClassIfMissing: true,
  });
  assert.equal(moveConflict.ok, false);
  assert.equal(
    store.students.find((s) => s.id === 's-move-conflict')?.classIds.includes(moveFromOk.id),
    true,
    '충돌로 이동 실패 시 원 슬롯 소속 유지'
  );

  // --- 슬롯 범위: 기본 09:00~20:30 + 등록된 시작시각만 확장 ---
  const baseOnly = resolveTimetableSlots([]);
  // deepEqual 전에 검사 — assert.deepEqual이 TIMETABLE_SLOTS 리터럴로 좁히면 '21:00' 비교가 TS2367
  assert.equal(baseOnly.includes('21:00'), false);
  assert.deepEqual(baseOnly, [...TIMETABLE_SLOTS]);

  const withEvening = resolveTimetableSlots([
    makeClass({ id: 'cls-2100', daysOfWeek: ['월'], startTime: '21:00', endTime: '21:50' }),
    makeClass({ id: 'cls-2130', daysOfWeek: ['화'], startTime: '21:30', endTime: '22:20' }),
  ]);
  assert.equal(withEvening.includes('20:30'), true);
  assert.equal(withEvening.includes('21:00'), true);
  assert.equal(withEvening.includes('21:30'), true);
  assert.ok(
    timeToMinutesHelper(withEvening[withEvening.length - 1]) >= timeToMinutesHelper('21:30')
  );
  // 등록되지 않은 22:00은 추가되지 않음
  assert.equal(withEvening.includes('22:00'), false);

  const withOdd = resolveTimetableSlots([
    makeClass({ id: 'cls-2115', daysOfWeek: ['수'], startTime: '21:15', endTime: '22:05' }),
  ]);
  assert.ok(
    withOdd.some((slot) => slot === '21:15'),
    '비 30분 시작시각도 행으로 유지'
  );

  const eveningStudent = makeStudent({ id: 's-eve', classIds: ['cls-2100'] });
  const eveningClass = makeClass({
    id: 'cls-2100',
    daysOfWeek: ['월'],
    startTime: '21:00',
    endTime: '21:50',
  });
  store.classes = [eveningClass];
  store.students = [eveningStudent, makeStudent({ id: 's-eve-2', classIds: [] })];
  const evePlacements = getPlacementsForSlot(store.students, store.classes, '월', '21:00');
  assert.ok(evePlacements.some((p) => p.student.id === 's-eve' && p.editable));
  const eveAssign = assignStudentToSlot({
    student: store.students.find((s) => s.id === 's-eve-2')!,
    day: '월',
    startTime: '21:00',
    classes: store.classes,
    teachers,
  });
  assert.equal(eveAssign.ok, true);
  if (eveAssign.ok) {
    assert.equal(eveAssign.classItem.id, 'cls-2100');
    assert.equal(eveAssign.createdClass, false);
  }

  console.log('pianoTimetablePlacement.test.ts: all assertions passed');
}

function timeToMinutesHelper(time: string): number {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
