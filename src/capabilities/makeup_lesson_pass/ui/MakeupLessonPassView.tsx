import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  evaluateTokenValidity,
  assembleMakeupConfirmationMessage,
  type MakeupToken,
  type MakeupSlot,
} from '../domain/makeupLessonEngine';

export const MakeupLessonPassView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'slots' | 'issue'>('tokens');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [originReason, setOriginReason] = useState<'absence' | 'advance_request' | 'instructor_cancel'>('absence');
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  // 1. 보강권 목록 조회 (Refine v5)
  const { query: tokenQuery } = useList<MakeupToken>({
    resource: 'makeup_tokens',
    pagination: { pageSize: 50 },
  });
  const tokens = tokenQuery?.data?.data ?? [];
  const isTokensLoading = tokenQuery?.isLoading;

  // 2. 오픈 슬롯 목록 조회
  const { query: slotQuery } = useList<MakeupSlot>({
    resource: 'makeup_slots',
    pagination: { pageSize: 20 },
  });
  const slots = slotQuery?.data?.data ?? [];

  // 3. 신규 보강권 발급 뮤테이션
  const { mutate: createToken } = useCreate();
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  const handleIssueToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentName.trim()) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const expiresAt = expiry.toISOString().slice(0, 10);

    setIsCreatingToken(true);
    createToken(
      {
        resource: 'makeup_tokens',
        values: {
          student_id: '00000000-0000-0000-0000-000000000001',
          student_name: selectedStudentName,
          origin_reason: originReason,
          origin_date: todayStr,
          expires_at: expiresAt,
          status: 'available',
        },
      },
      {
        onSuccess: () => {
          setIsCreatingToken(false);
          setSelectedStudentName('');
          setActiveTab('tokens');
        },
        onError: () => {
          setIsCreatingToken(false);
        },
      }
    );
  };

  const handleCopyNotification = (tokenItem: MakeupToken, slotItem: MakeupSlot) => {
    const msg = assembleMakeupConfirmationMessage({
      studentName: tokenItem.studentName,
      instructorName: slotItem.instructorName,
      roomName: slotItem.roomName,
      slotDate: slotItem.slotDate,
      startTime: slotItem.startTime,
      endTime: slotItem.endTime,
      originDate: tokenItem.originDate,
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      setShareSuccessMsg(`[${tokenItem.studentName}] 학생의 보강 확정 안내문이 복사되었습니다.`);
      setTimeout(() => setShareSuccessMsg(null), 3000);
    }
  };

  const currentDateStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          결석 보강 티켓 & 보강 슬롯 매칭
        </h1>
        <p style={{ color: '#4B5563', fontSize: '14px', marginTop: '6px' }}>
          결석 시 30일 유효기간 보강 티켓 자동 생성 및 강사 잔여 공석 원클릭 스왑 배정 엔진
        </p>
      </header>

      {shareSuccessMsg && (
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
          ✓ {shareSuccessMsg}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'tokens' ? 600 : 400,
            borderBottom: activeTab === 'tokens' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'tokens' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          보강권 현황 ({tokens.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('slots')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'slots' ? 600 : 400,
            borderBottom: activeTab === 'slots' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'slots' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          보강 잔여 슬롯 ({slots.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('issue')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'issue' ? 600 : 400,
            borderBottom: activeTab === 'issue' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'issue' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          + 보강권 수동 발급
        </button>
      </div>

      {/* 1. 보강권 현황 */}
      {activeTab === 'tokens' && (
        <div>
          {isTokensLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>보강권 목록 로딩 중...</div>
          ) : tokens.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                color: '#6B7280',
              }}
            >
              현재 발급된 보강권이 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>수강생</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>발생 사유</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>결석일</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>만료 예정일</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>남은 기한</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((tok) => {
                    const validity = evaluateTokenValidity(tok, currentDateStr);
                    return (
                      <tr key={tok.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                          {tok.studentName}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                          {tok.originReason === 'absence'
                            ? '결석'
                            : tok.originReason === 'advance_request'
                            ? '사전 신청'
                            : '학원 휴강'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4B5563' }}>{tok.originDate}</td>
                        <td style={{ padding: '12px 16px', color: '#4B5563' }}>{tok.expiresAt}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {validity.isExpired ? (
                            <span style={{ color: '#DC2626', fontWeight: 600 }}>만료됨</span>
                          ) : (
                            <span style={{ color: '#059669', fontWeight: 500 }}>{validity.daysRemaining}일 남음</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 500,
                              backgroundColor:
                                tok.status === 'available'
                                  ? '#DEF7EC'
                                  : tok.status === 'reserved'
                                  ? '#E1EFFE'
                                  : '#F3F4F6',
                              color:
                                tok.status === 'available'
                                  ? '#03543F'
                                  : tok.status === 'reserved'
                                  ? '#1E429F'
                                  : '#4B5563',
                            }}
                          >
                            {tok.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. 오픈 보강 슬롯 */}
      {activeTab === 'slots' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {slots.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280', gridColumn: '1 / -1' }}>
              등록된 보강 가능 슬롯이 없습니다.
            </div>
          ) : (
            slots.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>{s.roomName}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: s.status === 'open' ? '#D1FAE5' : '#FEE2E2',
                      color: s.status === 'open' ? '#065F46' : '#991B1B',
                    }}
                  >
                    {s.status === 'open' ? `잔여 ${s.capacity - s.reservedCount}석` : '마감'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#4B5563', marginTop: '8px' }}>
                  📅 {s.slotDate} ({s.startTime} ~ {s.endTime})
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                  👨‍🏫 담당: {s.instructorName} 선생님
                </div>

                {tokens.length > 0 && s.status === 'open' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyNotification(tokens[0], s)}
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
                      📋 [{tokens[0].studentName}] 알림 복사
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. 보강권 수동 발급 폼 */}
      {activeTab === 'issue' && (
        <form
          onSubmit={handleIssueToken}
          style={{
            maxWidth: '500px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
            신규 보강권 발급
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              수강생 이름
            </label>
            <input
              type="text"
              value={selectedStudentName}
              onChange={(e) => setSelectedStudentName(e.target.value)}
              placeholder="예: 홍길동"
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              발생 사유
            </label>
            <select
              value={originReason}
              onChange={(e) => setOriginReason(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
              }}
            >
              <option value="absence">일반 결석</option>
              <option value="advance_request">사전 신청(경조사/여행)</option>
              <option value="instructor_cancel">강사 휴강에 따른 보강</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isCreatingToken}
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
            {isCreatingToken ? '발급 처리 중...' : '30일 보강 티켓 즉시 발급'}
          </button>
        </form>
      )}
    </div>
  );
};
