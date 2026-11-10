import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildParentInviteShareMessage,
  buildBulkInviteCopyText,
  ParentInviteShareModal,
  type GeneratedInviteItem,
} from './ParentInviteShareModal';

describe('ParentInviteShareModal (5번: 학부모 앱 초대장 생성 및 카카오톡/문자 공유)', () => {
  it('buildParentInviteShareMessage는 학원명, 학생명, 보호자 호칭 및 초대 링크를 올바르게 포함한다', () => {
    const message = buildParentInviteShareMessage({
      organizationName: '모아음악학원',
      studentName: '김도윤',
      guardianName: '김철수',
      inviteUrl: 'https://moa.app/?link=test_token_123',
      expiresDays: 7,
    });

    assert.ok(message.includes('[모아음악학원]'));
    assert.ok(message.includes('김철수 학부모님'));
    assert.ok(message.includes('모아 학부모 앱'));
    assert.ok(message.includes('https://moa.app/?link=test_token_123'));
    assert.ok(message.includes('7일 이내'));
  });

  it('보호자명이 없을 경우 "[학생명] 학생 학부모님"으로 자동 보정한다', () => {
    const message = buildParentInviteShareMessage({
      organizationName: '',
      studentName: '이지우',
      inviteUrl: 'https://moa.app/?link=test_token_456',
    });

    assert.ok(message.includes('[학원]'));
    assert.ok(message.includes('이지우 학생 학부모님'));
    assert.ok(message.includes('https://moa.app/?link=test_token_456'));
  });

  it('buildBulkInviteCopyText는 대량 문자 발송용 탭 구분 텍스트를 올바르게 포맷팅한다', () => {
    const dummyItems: GeneratedInviteItem[] = [
      {
        student: { id: 's1', name: '김도윤', phone: '010-1111-2222' },
        guardianName: '김철수',
        guardianPhone: '010-9999-8888',
        token: 'token1',
        inviteUrl: 'https://moa.app/?link=token1',
        shareMessage: 'msg1',
      },
      {
        student: { id: 's2', name: '박서아', phone: '010-3333-4444' },
        guardianName: '',
        guardianPhone: '',
        token: 'token2',
        inviteUrl: 'https://moa.app/?link=token2',
        shareMessage: 'msg2',
      },
    ];

    const bulkText = buildBulkInviteCopyText(dummyItems);
    assert.ok(bulkText.startsWith('원생명\t보호자연락처\t초대링크'));
    assert.ok(bulkText.includes('김도윤\t010-9999-8888\thttps://moa.app/?link=token1'));
    // 보호자 번호 없으면 원생 번호로 폴백
    assert.ok(bulkText.includes('박서아\t010-3333-4444\thttps://moa.app/?link=token2'));
  });

  it('ParentInviteShareModal 컴포넌트가 함수 컴포넌트로 정상 export 된다', () => {
    assert.equal(typeof ParentInviteShareModal, 'function');
  });
});
