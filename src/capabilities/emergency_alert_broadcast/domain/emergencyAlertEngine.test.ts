import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAcknowledgmentStats,
  filterPendingRecipients,
  getSeverityStyle,
  renderEmergencyAlertSvg,
  formatEmergencyBroadcastText,
  type EmergencyBroadcastItem,
  type EmergencyBroadcastReceiptItem,
} from './emergencyAlertEngine';

describe('emergency_alert_broadcast - domain engine', () => {
  it('수신 확인율 통계를 정확히 계산한다', () => {
    const receipts: EmergencyBroadcastReceiptItem[] = [
      {
        id: 'rec-1',
        organizationId: 'org-1',
        broadcastId: 'bc-1',
        recipientName: '김민준 학부모',
        recipientRole: 'guardian',
        isAcknowledged: true,
        acknowledgedAt: '2026-10-17T08:30:00Z',
        createdAt: '2026-10-17T08:00:00Z',
      },
      {
        id: 'rec-2',
        organizationId: 'org-1',
        broadcastId: 'bc-1',
        recipientName: '이서연 학부모',
        recipientRole: 'guardian',
        isAcknowledged: false,
        createdAt: '2026-10-17T08:00:00Z',
      },
      {
        id: 'rec-3',
        organizationId: 'org-1',
        broadcastId: 'bc-1',
        recipientName: '박도윤 학부모',
        recipientRole: 'guardian',
        isAcknowledged: true,
        acknowledgedAt: '2026-10-17T08:45:00Z',
        createdAt: '2026-10-17T08:00:00Z',
      },
      {
        id: 'rec-4',
        organizationId: 'org-1',
        broadcastId: 'bc-1',
        recipientName: '최예은 학부모',
        recipientRole: 'guardian',
        isAcknowledged: false,
        createdAt: '2026-10-17T08:00:00Z',
      },
    ];

    const stats = calculateAcknowledgmentStats(receipts);
    assert.equal(stats.total, 4);
    assert.equal(stats.acknowledgedCount, 2);
    assert.equal(stats.pendingCount, 2);
    assert.equal(stats.ackRatePct, 50);

    const pending = filterPendingRecipients(receipts);
    assert.equal(pending.length, 2);
    assert.equal(pending[0].recipientName, '이서연 학부모');

    // 수신자 0명일 때 빈 통계 안전 반환 (0으로 나누기 방어)
    const emptyStats = calculateAcknowledgmentStats([]);
    assert.equal(emptyStats.total, 0);
    assert.equal(emptyStats.ackRatePct, 0);
  });

  it('긴급도에 따른 스타일이 올바르게 반환된다', () => {
    const crit = getSeverityStyle('critical');
    assert.equal(crit.headerBg, '#dc2626');
    assert.ok(crit.label.includes('비상'));

    const warn = getSeverityStyle('warning');
    assert.equal(warn.headerBg, '#ea580c');
  });

  it('W3C SVG 공고문 카드 및 단톡방 텍스트 서식이 정상 생성된다', () => {
    const broadcast: EmergencyBroadcastItem = {
      id: 'bc-1',
      organizationId: 'org-1',
      title: '대설주의보 발령에 따른 전 수업 긴급 휴원 안내',
      emergencyType: 'weather',
      severity: 'critical',
      effectiveStart: '2026-10-17T13:00:00Z',
      effectiveEnd: '2026-10-17T21:00:00Z',
      closureReason: '기상청 폭설 경보 및 인근 결빙 안전사고 예방',
      makeupPolicyNotice: '오늘 휴강된 수업은 전원 다음 주 토요일 보강 처리됩니다.',
      targetAudience: 'all',
      isActive: true,
      createdAt: '2026-10-17T11:00:00Z',
      updatedAt: '2026-10-17T11:00:00Z',
    };

    const svg = renderEmergencyAlertSvg(broadcast);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('대설주의보'));
    assert.ok(svg.includes('CRITICAL'));

    const text = formatEmergencyBroadcastText(broadcast, '모아 예체능 학원');
    assert.ok(text.includes('모아 예체능 학원'));
    assert.ok(text.includes('대설주의보'));
    assert.ok(text.includes('https://moa.app/alert/bc-1'));
    assert.ok(text.includes('보강 처리됩니다'));
  });
});
