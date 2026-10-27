import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  assembleContestCueSheet,
  renderContestSvgAward,
  type EventContest,
  type ContestEntry,
} from '../domain/eventContestEngine';

export const EventContestHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contests' | 'entries' | 'create'>('contests');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [venueName, setVenueName] = useState('본원 그랜드 아트홀');
  const [entryFee, setEntryFee] = useState(30000);
  const [cueSheetText, setCueSheetText] = useState<string | null>(null);
  const [previewAward, setPreviewAward] = useState<{ contest: EventContest; entry: ContestEntry } | null>(null);

  // 1. 행사 목록 조회 (Refine v5)
  const { query: contestQuery } = useList<EventContest>({
    resource: 'event_contests',
    pagination: { pageSize: 20 },
  });
  const contests = contestQuery?.data?.data ?? [];
  const isLoading = contestQuery?.isLoading;

  // 2. 참가자 목록 조회
  const { query: entryQuery } = useList<ContestEntry>({
    resource: 'event_contest_entries',
    pagination: { pageSize: 50 },
  });
  const entries = entryQuery?.data?.data ?? [];

  // 3. 신규 행사 등록 뮤테이션
  const { mutate: createContest } = useCreate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateContest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    createContest(
      {
        resource: 'event_contests',
        values: {
          title,
          event_category: 'concert',
          event_date: eventDate,
          venue_name: venueName,
          entry_fee: entryFee,
          registration_deadline: eventDate,
          rubric_criteria: [
            { id: 'technique', name: '기교 및 완성도', maxScore: 100 },
            { id: 'expression', name: '예술적 표현력', maxScore: 100 },
          ],
          status: 'open',
        },
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          setTitle('');
          setActiveTab('contests');
        },
        onError: () => {
          setIsCreating(false);
        },
      }
    );
  };

  const handleCopyCueSheet = (contest: EventContest) => {
    const contestEntries = entries.filter((e) => e.contestId === contest.id);
    const text = assembleContestCueSheet(contest, contestEntries);
    setCueSheetText(text);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          원내 발표회·대회 참가 접수 & 큐시트/심사대
        </h1>
        <p style={{ color: '#4B5563', fontSize: '14px', marginTop: '6px' }}>
          음악 연주회·태권도 콩쿠르·전시회 등 행사 참가자 등번호 채번, 무대 큐시트 및 0원 W3C SVG 전자 상장
        </p>
      </header>

      {/* 큐시트 복사 알림창 */}
      {cueSheetText && (
        <div
          style={{
            backgroundColor: '#1E293B',
            color: '#F8FAFC',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#38BDF8', fontWeight: 'bold' }}>✓ 무대 큐시트가 클립보드에 복사되었습니다</span>
            <button
              type="button"
              onClick={() => setCueSheetText(null)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              닫기 ✕
            </button>
          </div>
          {cueSheetText}
        </div>
      )}

      {/* SVG 상장 미리보기 모달 */}
      {previewAward && (
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#B45309' }}>
              🏆 [{previewAward.entry.participantName}] 모바일 W3C SVG 공식 상장
            </h3>
            <button
              type="button"
              onClick={() => setPreviewAward(null)}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          <div
            style={{ maxWidth: '480px', margin: '0 auto' }}
            dangerouslySetInnerHTML={{ __html: renderContestSvgAward(previewAward.contest, previewAward.entry) }}
          />
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('contests')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'contests' ? 600 : 400,
            borderBottom: activeTab === 'contests' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'contests' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          진행 행사 목록 ({contests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('entries')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'entries' ? 600 : 400,
            borderBottom: activeTab === 'entries' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'entries' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          참가자 & 큐시트 순번 ({entries.length})
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
          + 새 연주회/대회 개설
        </button>
      </div>

      {activeTab === 'contests' && (
        <div>
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>행사 목록 로딩 중...</div>
          ) : contests.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                color: '#6B7280',
              }}
            >
              예정된 발표회 또는 대회가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {contests.map((c) => (
                <div
                  key={c.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>{c.title}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#DEF7EC',
                        color: '#03543F',
                      }}
                    >
                      접수 중
                    </span>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>📅 일시: {c.eventDate}</div>
                    <div>📍 장소: {c.venueName}</div>
                    <div>💰 참가비: {Number(c.entryFee).toLocaleString()}원</div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyCueSheet(c)}
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
                      📋 무대 큐시트 조립 및 복사
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'entries' && (
        <div>
          {entries.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', color: '#6B7280' }}>
              접수된 참가자가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>등번호</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>참가자명</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>발표/연주곡</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>심사 총점</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>수상 내역</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((ent) => (
                    <tr key={ent.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1E40AF' }}>
                        No.{String(ent.entryOrder).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                        {ent.participantName}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {ent.performancePiece}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                        {ent.finalScore > 0 ? `${ent.finalScore}점` : '미심사'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: ent.awardTitle ? '#FEF3C7' : '#F3F4F6',
                            color: ent.awardTitle ? '#92400E' : '#6B7280',
                          }}
                        >
                          {ent.awardTitle || '심사 대기'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {contests.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPreviewAward({ contest: contests[0], entry: ent })}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FCD34D',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            🏆 상장 보기
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <form
          onSubmit={handleCreateContest}
          style={{
            maxWidth: '520px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
            새 발표회 / 콩쿠르 개설
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              행사명
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 모아 가을 피아노 정기 연주회"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                행사 일자
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                참가비 (원)
              </label>
              <input
                type="number"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              개최 장소
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="예: 본원 드림아트홀"
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
            {isCreating ? '개설 처리 중...' : '행사 개설 및 참가 접수 시작'}
          </button>
        </form>
      )}
    </div>
  );
};
