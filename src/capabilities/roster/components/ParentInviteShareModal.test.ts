import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildParentInviteShareMessage,
  buildBulkInviteCopyText,
  type GeneratedInviteItem,
} from './ParentInviteShareModal';

describe('ParentInviteShareModal (5번: 보호자 앱 초대장 생성 및 카카오톡/문자 공유)', () => {
  it('buildParentInviteShareMessage는 사업장명, 고객명, 보호자 호칭 및 초대 링크를 올바르게 포함한다', () => {
    const message = buildParentInviteShareMessage({
      organizationName: '모아 스튜디오',
      studentName: '김도윤',
      guardianName: '김철수',
      inviteUrl: 'https://moa.app/?link=test_token_123',
      expiresDays: 7,
    });

    assert.ok(message.includes('[모아 스튜디오]'));
    assert.ok(message.includes('김철수 학부모님'));
    assert.ok(message.includes('모아 보호자 앱'));
    assert.ok(message.includes('https://moa.app/?link=test_token_123'));
    assert.ok(message.includes('7일 이내'));
  });

  it('보호자명이 없을 경우 "[학생명] 학생 학부모님"으로 자동 보정한다', () => {
    const message = buildParentInviteShareMessage({
      organizationName: '',
      studentName: '이지우',
      inviteUrl: 'https://moa.app/?link=test_token_456',
    });

    assert.ok(message.includes('[사업장]'));
    assert.ok(message.includes('이지우 학생 학부모님'));
    assert.ok(message.includes('https://moa.app/?link=test_token_456'));
  });

  it('buildBulkInviteCopyText는 대량 문자 발송용 탭 구분 텍스트를 올바르게 포맷팅한다', () => {
    const dummyItems: GeneratedInviteItem[] = [
      {
        student: { id: 's1', name: '김도윤', phone: '010-1111-2222' } as unknown as IndustryType,
        guardianName: '김철수',
        guardianPhone: '010-9999-8888',
        token: 'token1',
        inviteUrl: 'https://moa.app/?link=token1',
        shareMessage: 'msg1',
      },
      {
        student: { id: 's2', name: '박서아', phone: '010-3333-4444' } as unknown as IndustryType,
        guardianName: '박영희',
        guardianPhone: '010-7777-6666',
        token: 'token2',
        inviteUrl: 'https://moa.app/?link=token2',
        shareMessage: 'msg2',
      },
    ];

    const copyText = buildBulkInviteCopyText(dummyItems);
    assert.ok(copyText.startsWith('성명\t보호자연락처\t초대링크'));
    assert.ok(copyText.includes('김도윤\t010-9999-8888\thttps://moa.app/?link=token1'));
    assert.ok(copyText.includes('박서아\t010-7777-6666\thttps://moa.app/?link=token2'));
  });
});
