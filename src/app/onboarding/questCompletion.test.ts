import assert from 'node:assert/strict';
import { detectCompletedQuestIds, mergeQuestCompletion } from './questCompletion';
import type { QuestItem } from './questEngine';

const pianoQuests: QuestItem[] = [
  {
    id: 'register_first_student',
    stepNumber: 1,
    title: '첫 원생',
    description: '',
    targetTab: 'students',
    icon: 'user',
    actionText: 'go',
  },
  {
    id: 'create_regular_class',
    stepNumber: 2,
    title: '시간표',
    description: '',
    targetTab: 'timetable',
    icon: 'calendar',
    actionText: 'go',
  },
  {
    id: 'check_first_attendance',
    stepNumber: 3,
    title: '출결',
    description: '',
    targetTab: 'attendance',
    icon: 'clock',
    actionText: 'go',
  },
  {
    id: 'issue_first_invoice',
    stepNumber: 4,
    title: '수납',
    description: '',
    targetTab: 'tuition',
    icon: 'ticket',
    actionText: 'go',
  },
];

function run() {
  const empty = detectCompletedQuestIds(pianoQuests, {
    students: [],
    classes: [],
    attendance: [],
    invoices: [],
    sessionPasses: [],
    bookings: [],
  });
  assert.deepEqual(empty, []);

  const withStudent = detectCompletedQuestIds(pianoQuests, {
    students: [{ id: '1' }],
    classes: [],
    attendance: [],
    invoices: [],
    sessionPasses: [],
    bookings: [],
  });
  assert.deepEqual(withStudent, ['register_first_student']);

  const full = detectCompletedQuestIds(pianoQuests, {
    students: [{ id: '1' }],
    classes: [{ id: 'c1' }],
    attendance: [{ id: 'a1' }],
    invoices: [{ id: 'i1' }],
    sessionPasses: [],
    bookings: [],
  });
  assert.deepEqual(full, [
    'register_first_student',
    'create_regular_class',
    'check_first_attendance',
    'issue_first_invoice',
  ]);

  assert.deepEqual(mergeQuestCompletion(['a'], ['a', 'b']), ['a', 'b']);
  console.log('questCompletion.test.ts: ok');
}

run();
