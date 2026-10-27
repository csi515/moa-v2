import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  renderEntryPassSvgTicket,
  type EntryPassTicket,
  type TicketType,
} from '../domain/entryPassTicketEngine';

export const EntryPassTicketView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'issue'>('tickets');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [ticketType, setTicketType] = useState<TicketType>('standard');
  const [price, setPrice] = useState(15000);
  const [previewTicket, setPreviewTicket] = useState<EntryPassTicket | null>(null);

  // 1. 발권된 티켓 목록 조회 (Refine v5)
  const { query } = useList<EntryPassTicket>({
    resource: 'entry_pass_tickets',
    pagination: { pageSize: 50 },
  });
  const tickets = query?.data?.data ?? [];
  const isLoading = query?.isLoading;

  // 2. 신규 티켓 발권 뮤테이션
  const { mutate: createTicket } = useCreate();
  const [isCreating, setIsCreating] = useState(false);

  const handleIssueTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const dateFormatted = todayStr.replace(/-/g, '');
    const seq = String(tickets.length + 1).padStart(4, '0');
    const ticketNumber = `TICK-${dateFormatted}-${seq}`;

    setIsCreating(true);
    createTicket(
      {
        resource: 'entry_pass_tickets',
        values: {
          ticket_number: ticketNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          ticket_type: ticketType,
          valid_date: todayStr,
          price,
          status: 'issued',
          security_hash: `SEC-${Date.now()}`,
        },
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          setCustomerName('');
          setCustomerPhone('');
          setActiveTab('tickets');
        },
        onError: () => {
          setIsCreating(false);
        },
      }
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          모바일 일일 입장권 & 0원 W3C SVG QR 검표기
        </h1>
        <p style={{ color: '#4B5563', fontSize: '14px', marginTop: '6px' }}>
          키즈카페·공간대여·파티룸 1회성 방문객 대상 W3C SVG QR 티켓 발권 및 현장 중복 입장 방어
        </p>
      </header>

      {/* SVG 티켓 미리보기 모달 */}
      {previewTicket && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1E3A8A' }}>
              🎟️ [{previewTicket.customerName}] 모바일 W3C SVG 전자 입장권
            </h3>
            <button
              type="button"
              onClick={() => setPreviewTicket(null)}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          <div
            style={{ maxWidth: '400px', margin: '0 auto' }}
            dangerouslySetInnerHTML={{ __html: renderEntryPassSvgTicket(previewTicket) }}
          />
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'tickets' ? 600 : 400,
            borderBottom: activeTab === 'tickets' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'tickets' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          발권된 티켓 ({tickets.length})
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
          + 새 입장권 발권
        </button>
      </div>

      {activeTab === 'tickets' ? (
        <div>
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>티켓 목록 로딩 중...</div>
          ) : tickets.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                color: '#6B7280',
              }}
            >
              오늘 발권된 일일 입장권이 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>티켓 번호</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>방문 고객</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>종류</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>유효일</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>상태</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#1E40AF' }}>
                        {t.ticketNumber}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                        {t.customerName}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {t.ticketType === 'adult' ? '성인권' :
                         t.ticketType === 'child' ? '어린이권' :
                         t.ticketType === 'allday' ? '종일권' : '일반권'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>{t.validDate}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor:
                              t.status === 'issued' ? '#DEF7EC' :
                              t.status === 'checked_in' ? '#E1EFFE' :
                              t.status === 'checked_out' ? '#F3F4F6' : '#FEE2E2',
                            color:
                              t.status === 'issued' ? '#03543F' :
                              t.status === 'checked_in' ? '#1E429F' :
                              t.status === 'checked_out' ? '#4B5563' : '#991B1B',
                          }}
                        >
                          {t.status === 'issued' ? '입장 대기' :
                           t.status === 'checked_in' ? '입장 완료' :
                           t.status === 'checked_out' ? '퇴장 완료' : t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewTicket(t)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          🎟️ SVG 티켓
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleIssueTicket}
          style={{
            maxWidth: '520px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
            현장 일일 입장권 발권
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              방문 고객 성함
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="예: 강하늘"
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
              연락처 (선택)
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="예: 010-9876-5432"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                티켓 권종
              </label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              >
                <option value="standard">일반 입장권</option>
                <option value="adult">성인권</option>
                <option value="child">어린이권</option>
                <option value="allday">종일 자유이용권</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                결제 금액 (원)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                min={0}
                step={1000}
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
            {isCreating ? '발권 처리 중...' : '0원 모바일 QR 티켓 발권'}
          </button>
        </form>
      )}
    </div>
  );
};
