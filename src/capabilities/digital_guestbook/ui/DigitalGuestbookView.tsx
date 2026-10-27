import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  formatPhoneNumber,
  validateGuestbookConsent,
  renderGuestbookCardSvg,
  formatGuestbookWelcomeText,
  type DigitalGuestbookEntryItem,
  type VisitPurpose,
  type GuestbookStatus,
} from '../domain/digitalGuestbookEngine';

export const DigitalGuestbookView: React.FC = () => {
  const [selectedEntry, setSelectedEntry] = useState<DigitalGuestbookEntryItem | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 내방객 등록 폼
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [visitPurpose, setVisitPurpose] = useState<VisitPurpose>('consultation');
  const [interestedProgram, setInterestedProgram] = useState('');
  const [referralSource, setReferralSource] = useState('지인 소개');
  const [privacyAgreed, setPrivacyAgreed] = useState(true);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [notes, setNotes] = useState('');

  // 1. 방명록 내방객 목록 조회
  const { query } = useList<DigitalGuestbookEntryItem>({
    resource: 'digital_guestbook_entries',
    pagination: { pageSize: 50 },
  });

  const { mutate: createEntry } = useCreate<DigitalGuestbookEntryItem>();
  const { mutate: updateEntry } = useUpdate<DigitalGuestbookEntryItem>();

  const entries = (query?.data?.data as DigitalGuestbookEntryItem[]) || [];

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const consentCheck = validateGuestbookConsent(privacyAgreed);
    if (!consentCheck.valid) {
      alert(consentCheck.message);
      return;
    }
    if (!visitorName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    createEntry(
      {
        resource: 'digital_guestbook_entries',
        values: {
          visitor_name: visitorName,
          phone: formatPhoneNumber(phone),
          visit_purpose: visitPurpose,
          interested_program: interestedProgram,
          referral_source: referralSource,
          privacy_agreed: privacyAgreed,
          marketing_agreed: marketingAgreed,
          notes,
          status: 'checked_in',
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowCheckInModal(false);
          setVisitorName('');
          setPhone('');
          setInterestedProgram('');
          setNotes('');
          query?.refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleStatusChange = (entryId: string, nextStatus: GuestbookStatus) => {
    updateEntry(
      {
        resource: 'digital_guestbook_entries',
        id: entryId,
        values: {
          status: nextStatus,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          query?.refetch();
          if (selectedEntry && selectedEntry.id === entryId) {
            setSelectedEntry({ ...selectedEntry, status: nextStatus });
          }
        },
      }
    );
  };

  const handleCopyWelcome = (entry: DigitalGuestbookEntryItem) => {
    const text = formatGuestbookWelcomeText(entry, '우리 학원/매장');
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>📋 현장 내방객 전자 방명록 & 마케팅 동의기</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            워크인 상담 고객 및 설명회 내방객의 전자 서명과 마케팅 수신동의를 안전하게 보관하고 환영 안내를 지원합니다.
          </p>
        </div>
        <button
          onClick={() => setShowCheckInModal(true)}
          style={{
            backgroundColor: '#0f172a',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          + 태블릿 방명록 작성 (내방객 접수)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedEntry ? '1fr 380px' : '1fr', gap: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>내방객 성함</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>연락처</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>방문 목적</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>관심 프로그램</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>마케팅 동의</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>상태</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    등록된 내방객 방명록이 없습니다.
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedEntry(item)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedEntry?.id === item.id ? '#f8fafc' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 'bold' }}>
                      {item.visitorName}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                      {item.phone}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      {item.visitPurpose}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0284c7', fontWeight: 600 }}>
                      {item.interestedProgram || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                      {item.marketingAgreed ? (
                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>동의함</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>미동의</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: item.status === 'converted' ? '#166534' : '#0f172a',
                          background: item.status === 'converted' ? '#dcfce7' : '#f1f5f9',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyWelcome(item);
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '6px',
                        }}
                      >
                        {copySuccess ? '복사됨!' : '환영 문자 복사'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedEntry && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>내방객 접수증 카드</h2>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{ width: '100%', marginBottom: '16px' }}
              dangerouslySetInnerHTML={{ __html: renderGuestbookCardSvg(selectedEntry) }}
            />

            <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              <p><strong>유입 경로:</strong> {selectedEntry.referralSource || '미선택'}</p>
              {selectedEntry.notes && <p><strong>메모/특이사항:</strong> {selectedEntry.notes}</p>}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>상담 상태 변경</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleStatusChange(selectedEntry.id, 'consulting')}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                >
                  상담 진행
                </button>
                <button
                  onClick={() => handleStatusChange(selectedEntry.id, 'converted')}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '6px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  수강/등록 전환
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCheckInModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '460px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📋 현장 내방객 전자 방명록 작성</h2>
            <form onSubmit={handleCheckInSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>성함 *</label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="예: 강태양"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>연락처 *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>방문 목적</label>
                  <select
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value as VisitPurpose)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="consultation">상담 예약 내방</option>
                    <option value="walk_in">현장 즉석 방문(Walk-in)</option>
                    <option value="open_house">입학 설명회/오픈하우스</option>
                    <option value="trial_inquiry">체험 수업 문의</option>
                    <option value="event_guest">행사/연주회 관람</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>유입 경로</label>
                  <select
                    value={referralSource}
                    onChange={(e) => setReferralSource(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="지인 소개">지인/친구 소개</option>
                    <option value="인스타그램">인스타그램/SNS</option>
                    <option value="네이버 지도">네이버 플레이스/지도</option>
                    <option value="전단지">전단지/현수막</option>
                    <option value="직접 방문">인근 거주 직접 방문</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>관심 프로그램 / 수업</label>
                <input
                  type="text"
                  value={interestedProgram}
                  onChange={(e) => setInterestedProgram(e.target.value)}
                  placeholder="예: 초등 피아노 정규반, 주말 보컬 레슨"
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <input
                    type="checkbox"
                    id="privacyAgree"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  />
                  <label htmlFor="privacyAgree" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    [필수] 상담을 위한 개인정보 수집 및 이용 동의
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="marketingAgree"
                    checked={marketingAgreed}
                    onChange={(e) => setMarketingAgreed(e.target.checked)}
                  />
                  <label htmlFor="marketingAgree" style={{ fontSize: '12px', color: '#475569' }}>
                    [선택] 이벤트 혜택 및 수강 할인 프로모션 수신 동의
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '접수 중...' : '방명록 접수 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
