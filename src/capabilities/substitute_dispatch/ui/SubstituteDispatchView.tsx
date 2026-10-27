import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  assembleSubstituteBroadcastMessage,
  type SubstituteRequest,
} from '../domain/substituteDispatchEngine';

export const SubstituteDispatchView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'create'>('requests');
  const [requesterName, setRequesterName] = useState('');
  const [className, setClassName] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('15:50');
  const [reason, setReason] = useState<'illness' | 'family_event' | 'personal' | 'vacation'>('illness');
  const [offeredFee, setOfferedFee] = useState(35000);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  // 1. 대강 공고 목록 조회 (Refine v5)
  const { query } = useList<SubstituteRequest>({
    resource: 'substitute_requests',
    pagination: { pageSize: 50 },
  });
  const requests = query?.data?.data ?? [];
  const isLoading = query?.isLoading;

  // 2. 신규 대강 공고 등록 뮤테이션
  const { mutate: createRequest } = useCreate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim() || !className.trim()) return;

    setIsCreating(true);
    createRequest(
      {
        resource: 'substitute_requests',
        values: {
          requester_staff_id: '00000000-0000-0000-0000-000000000001',
          requester_name: requesterName,
          class_name: className,
          target_date: targetDate,
          start_time: startTime,
          end_time: endTime,
          reason,
          pay_rate_type: 'hourly',
          offered_fee: offeredFee,
          status: 'open',
        },
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          setRequesterName('');
          setClassName('');
          setActiveTab('requests');
        },
        onError: () => {
          setIsCreating(false);
        },
      }
    );
  };

  const handleCopyNotice = (req: SubstituteRequest) => {
    const text = assembleSubstituteBroadcastMessage(req);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMessage(`[${req.className}] 긴급 대강 공고문이 클립보드에 복사되었습니다.`);
      setTimeout(() => setCopiedMessage(null), 3000);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          강사 대강/대진 긴급 호출 & 승인 마켓
        </h1>
        <p style={{ color: '#4B5563', fontSize: '14px', marginTop: '6px' }}>
          결강 발생 시 긴급 대강 공고, 지원 접수, 원장 원클릭 승인 및 단톡방 서식 자동 조립
        </p>
      </header>

      {copiedMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            border: '1px solid #A7F3D0',
          }}
        >
          ✓ {copiedMessage}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'requests' ? 600 : 400,
            borderBottom: activeTab === 'requests' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'requests' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          대강 공고 목록 ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'create' ? 600 : 400,
            borderBottom: activeTab === 'create' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'create' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          + 긴급 대강 요청 등록
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div>
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>대강 목록 로딩 중...</div>
          ) : requests.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                color: '#6B7280',
              }}
            >
              현재 진행 중인 대강 공고가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
                      {req.className}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor:
                          req.status === 'open' ? '#FEF3C7' :
                          req.status === 'applied' ? '#DBEAFE' :
                          req.status === 'approved' ? '#D1FAE5' : '#F3F4F6',
                        color:
                          req.status === 'open' ? '#92400E' :
                          req.status === 'applied' ? '#1E40AF' :
                          req.status === 'approved' ? '#065F46' : '#4B5563',
                      }}
                    >
                      {req.status === 'open' ? '모집 중' :
                       req.status === 'applied' ? '지원 접수' :
                       req.status === 'approved' ? '승인 완료' : req.status}
                    </span>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>📅 일시: {req.targetDate} ({req.startTime} ~ {req.endTime})</div>
                    <div>👨‍🏫 요청: {req.requesterName} 선생님</div>
                    <div>💰 강사료: {Number(req.offeredFee).toLocaleString()}원</div>
                    {req.assignedName && (
                      <div style={{ color: '#047857', fontWeight: 600 }}>
                        ✨ 배정 강사: {req.assignedName} 선생님
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyNotice(req)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#F3F4F6',
                        color: '#1F2937',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      📢 단톡방 공지문 복사
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleCreateRequest}
          style={{
            maxWidth: '560px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
            긴급 대강 요청 등록
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              요청 강사 성함
            </label>
            <input
              type="text"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="예: 이지은"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              대상 수업/클래스명
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="예: 초등 바이엘 3반, 저녁 매트 필라테스"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                수업 일자
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                시작 시각
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="15:00"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                종료 시각
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="15:50"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                결강 사유
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              >
                <option value="illness">병가 / 건강상 이유</option>
                <option value="family_event">경조사</option>
                <option value="vacation">사전 휴가</option>
                <option value="personal">개인 사정</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                제안 대강료 (원)
              </label>
              <input
                type="number"
                value={offeredFee}
                onChange={(e) => setOfferedFee(Number(e.target.value))}
                min={0}
                step={5000}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isCreating ? '등록 처리 중...' : '대강 공고 즉시 등록'}
          </button>
        </form>
      )}
    </div>
  );
};
