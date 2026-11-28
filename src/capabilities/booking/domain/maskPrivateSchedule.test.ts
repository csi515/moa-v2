import assert from 'node:assert/strict';
import {
  maskPrivateSchedule,
  PRIVATE_SCHEDULE_MASK_TITLE,
  resolveIsPrivate,
} from './maskPrivateSchedule.ts';

const base = {
  id: 'sch-1',
  organizationId: 'org-1',
  staffId: 'staff-a',
  customerName: '김민수',
  studentName: '김민수',
  memo: '개인 레슨 메모',
  place: '1번 연습실',
  roomName: '1번 연습실',
  startsAt: '2026-11-28T10:00:00+09:00',
  endsAt: '2026-11-28T10:30:00+09:00',
};

{
  assert.equal(resolveIsPrivate({ ...base, is_private: true }), true);
  assert.equal(resolveIsPrivate({ ...base, visibility: 'PRIVATE' }), true);
  assert.equal(resolveIsPrivate({ ...base, visibility: 'PUBLIC' }), false);
}

{
  const masked = maskPrivateSchedule(
    { ...base, is_private: true },
    { id: 'staff-b', role: 'staff', organizationId: 'org-1' }
  );
  assert.equal(masked.isMasked, true);
  assert.equal(masked.displayTitle, PRIVATE_SCHEDULE_MASK_TITLE);
  assert.equal(masked.customerName, undefined);
  assert.equal(masked.memo, undefined);
  assert.equal(masked.place, undefined);
}

{
  const own = maskPrivateSchedule(
    { ...base, is_private: true },
    { id: 'staff-a', role: 'staff', organizationId: 'org-1' }
  );
  assert.equal(own.isMasked, false);
  assert.equal(own.customerName, '김민수');
  assert.equal(own.memo, '개인 레슨 메모');
}

{
  const admin = maskPrivateSchedule(
    { ...base, is_private: true },
    { id: 'staff-x', role: 'owner', organizationId: 'org-1' }
  );
  assert.equal(admin.isMasked, false);
  assert.equal(admin.customerName, '김민수');
}

console.log('maskPrivateSchedule.test.ts: ok');
