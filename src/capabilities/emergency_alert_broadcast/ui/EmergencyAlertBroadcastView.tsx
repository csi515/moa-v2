import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  calculateAcknowledgmentStats,
  renderEmergencyAlertSvg,
  formatEmergencyBroadcastText,
  type EmergencyBroadcastItem,
  type EmergencyBroadcastReceiptItem,
  type EmergencyType,
  type EmergencySeverity,
} from '../domain/emergencyAlertEngine';

export const EmergencyAlertBroadcastView: React.FC = () => {
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 긴급 공지 발령 폼
  const [title, setTitle] = useState('');
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('weather');
  const [severity, setSeverity] = useState<EmergencySeverity>('critical');
  const [closureReason, setClosureReason] = useState('');
  const [makeupPolicy, setMakeupPolicy] = useState('해당 결강은 다음 주 동일 요일에 100% 보강 수업으로 대체됩니다.');

  // 1. 공지 목록
  const { query: broadcastQuery } = useList<EmergencyBroadcastItem>({
    resource: 'emergency_broadcasts',
    pagination: { pageSize: 20 },
  });

  // 2. 수신 영수증 목록
  const { query: receiptQuery } = useList<EmergencyBroadcastReceiptItem>({
    resource: 'emergency_broadcast_receipts',
    pagination: { pageSize: 100 },
  });

  const { mutate: createBroadcast } = useCreate<EmergencyBroadcastItem>();
  const { mutate: updateReceipt } = useUpdate<EmergencyBroadcastReceiptItem>();

  const broadcasts = (broadcastQuery?.data?.data as EmergencyBroadcastItem[]) || [];
  const receipts = (receiptQuery?.data?.data as EmergencyBroadcastReceiptItem[]) || [];

  const activeBroadcastId = selectedBroadcastId || (broadcasts.length > 0 ? broadcasts[0].id : null);
  const activeBroadcast = broadcasts.find((b) => b.id === activeBroadcastId);
  const currentReceipts = activeBroadcastId ? receipts.filter((r) => r.broadcastId === activeBroadcastId) : [];

  const stats = calculateAcknowledgmentStats(currentReceipts);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !closureReason.trim()) return;

    setIsSubmitting(true);
    createBroadcast(
      {
        resource: 'emergency_broadcasts',
        values: {
          title,
          emergency_type: emergencyType,
          severity,
          effective_start: new Date().toISOString(),
          closure_reason: closureReason,
          makeup_policy_notice: makeupPolicy,
          target_audience: 'all',
          is_active: true,
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowCreateModal(false);
          setTitle('');
          setClosureReason('');
          broadcastQuery?.refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleManualAcknowledge = (receiptId: string) => {
    updateReceipt(
      {
        resource: 'emergency_broadcast_receipts',
        id: receiptId,
        values: {
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          receiptQuery?.refetch();
        },
      }
    );
  };

  const handleCopyNotice = (broadcast: EmergencyBroadcastItem) => {
    const text = formatEmergencyBroadcastText(broadcast, '우리 학원/매장');
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>📢 긴급 휴원·재난 공지 & 모바일 수신확인 대장</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            폭설·태풍 등 비상 시 긴급 휴원을 발령하고, 학부모의 모바일 확인(Acknowledge) 응답을 실시간으로 추적합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeBroadcast && (
            <button
              onClick={() => handleCopyNotice(activeBroadcast)}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? '공지문 복사 완료!' : '📢 단톡방 긴급 공지문 복사'}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🚨 새 긴급 공지 발령
          </button>
        </div>
      </div>

      {/* 수신 통계 현황 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>학부모 수신 확인율</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: stats.ackRatePct < 50 ? '#dc2626' : '#16a34a' }}>
            {stats.ackRatePct}%
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>확인 {stats.acknowledgedCount}명 / 전체 {stats.total}명</div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>미확인 학부모 (긴급 연락 필요)</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: stats.pendingCount > 0 ? '#dc2626' : '#0f172a' }}>
            {stats.pendingCount}명
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>혼자 등원하지 않도록 개별 유선 통화 권장</div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>현재 활성 공지</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0284c7' }}>
            {activeBroadcast ? activeBroadcast.severity.toUpperCase() : '없음'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{activeBroadcast?.title || '발령된 비상 공지 없음'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeBroadcast ? '1fr 400px' : '1fr', gap: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* 공지 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '8px 16px', gap: '8px', overflowX: 'auto' }}>
            {broadcasts.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBroadcastId(b.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeBroadcastId === b.id ? '#dc2626' : 'transparent',
                  color: activeBroadcastId === b.id ? '#fff' : '#64748b',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {b.title}
              </button>
            ))}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>학부모/수신자</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>연락처</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>확인 상태</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>확인 일시</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {currentReceipts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    등록된 수신자 명부가 없습니다. 공지 링크를 단톡방에 공유하세요.
                  </td>
                </tr>
              ) : (
                currentReceipts.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold' }}>
                      {rec.recipientName} ({rec.recipientRole})
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                      {rec.recipientPhone || '연락처 미등록'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {rec.isAcknowledged ? (
                        <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 'bold' }}>
                          ✓ 확인 완료
                        </span>
                      ) : (
                        <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 'bold' }}>
                          ⚠️ 미확인 (확인 요망)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                      {rec.acknowledgedAt ? rec.acknowledgedAt.slice(0, 16).replace('T', ' ') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {!rec.isAcknowledged && (
                        <button
                          onClick={() => handleManualAcknowledge(rec.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          유선 확인 완료 처리
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {activeBroadcast && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>공식 비상 공고문</h2>

            <div
              style={{ width: '100%', marginBottom: '16px' }}
              dangerouslySetInnerHTML={{ __html: renderEmergencyAlertSvg(activeBroadcast) }}
            />

            <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              <p><strong>휴원 사유:</strong> {activeBroadcast.closureReason}</p>
              {activeBroadcast.makeupPolicyNotice && (
                <p><strong>보강 안내:</strong> {activeBroadcast.makeupPolicyNotice}</p>
              )}
            </div>

            <button
              onClick={() => handleCopyNotice(activeBroadcast)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? '공지문 복사 완료!' : '📢 긴급 안내문 복사하여 전송'}
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '480px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>🚨 긴급 휴원·재난 공지 발령</h2>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>공지 제목 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 폭설 경보 발령에 따른 전 수업 긴급 휴원 안내"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>유형</label>
                  <select
                    value={emergencyType}
                    onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="weather">기상 악화 (폭설/태풍/한파)</option>
                    <option value="facility_failure">시설 장애 (단수/정전/누수)</option>
                    <option value="epidemic">감염병·방역</option>
                    <option value="safety_alert">안전 경보</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>긴급도</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as EmergencySeverity)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="critical">🚨 비상 (Critical)</option>
                    <option value="warning">⚠️ 경고 (Warning)</option>
                    <option value="advisory">📢 일반 안내 (Advisory)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>휴원/조치 사유 *</label>
                <textarea
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="기상청 대설 경보 발령 및 빙판길 원생 낙상/차량 안전사고 예방"
                  rows={2}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>보강/수업 안내 규정</label>
                <textarea
                  value={makeupPolicy}
                  onChange={(e) => setMakeupPolicy(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '발령 중...' : '긴급 공지 발령'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
