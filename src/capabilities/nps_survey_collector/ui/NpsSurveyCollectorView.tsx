import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  calculateNpsSummary,
  classifySentiment,
  renderNpsGaugeSvg,
  formatSurveyInvitationText,
  type SurveyCampaignItem,
  type SurveyResponseItem,
  type FollowUpActionStatus,
} from '../domain/npsSurveyEngine';

export const NpsSurveyCollectorView: React.FC = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 새 캠페인 폼
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('전체 원생/고객');
  const [description, setDescription] = useState('');

  // 캠페인 목록
  const { query: campaignQuery } = useList<SurveyCampaignItem>({
    resource: 'nps_survey_campaigns',
    pagination: { pageSize: 20 },
  });

  // 설문 응답 목록
  const { query: responseQuery } = useList<SurveyResponseItem>({
    resource: 'nps_survey_responses',
    pagination: { pageSize: 100 },
  });

  const { mutate: createCampaign } = useCreate<SurveyCampaignItem>();
  const { mutate: updateResponse } = useUpdate<SurveyResponseItem>();

  const campaigns = (campaignQuery?.data?.data as SurveyCampaignItem[]) || [];
  const allResponses = (responseQuery?.data?.data as SurveyResponseItem[]) || [];

  const activeCampaignId = selectedCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);
  const currentResponses = activeCampaignId
    ? allResponses.filter((r) => r.campaignId === activeCampaignId)
    : allResponses;

  const npsSummary = calculateNpsSummary(currentResponses);
  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    createCampaign(
      {
        resource: 'nps_survey_campaigns',
        values: {
          title,
          target_audience: targetAudience,
          description,
          status: 'active',
          started_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowCreateModal(false);
          setTitle('');
          setDescription('');
          campaignQuery?.refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleActionStatusChange = (responseId: string, nextStatus: FollowUpActionStatus) => {
    updateResponse(
      {
        resource: 'nps_survey_responses',
        id: responseId,
        values: {
          action_status: nextStatus,
        },
      },
      {
        onSuccess: () => {
          responseQuery?.refetch();
        },
      }
    );
  };

  const handleCopyLink = () => {
    if (!activeCampaign) return;
    const text = formatSurveyInvitationText(activeCampaign.title, '우리 매장', activeCampaign.id);
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>📊 모바일 만족도 & NPS 설문 분석기</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            원생 및 고객의 NPS(순추천지수)를 실시간 집계하고, 불만 고객의 이탈을 사전에 방지하는 원스톱 서베이 허브입니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeCampaign && (
            <button
              onClick={handleCopyLink}
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
              {copySuccess ? '안내문 복사 완료!' : '📢 설문 안내문 복사'}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + 새 설문 캠페인 시작
          </button>
        </div>
      </div>

      {/* 상단 NPS SVG 분석 게이지 */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{ width: '100%', maxWidth: '700px' }}
          dangerouslySetInnerHTML={{ __html: renderNpsGaugeSvg(npsSummary) }}
        />
      </div>

      {/* 캠페인 탭 및 응답 목록 */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '8px 16px', gap: '8px', overflowX: 'auto' }}>
          {campaigns.map((camp) => (
            <button
              key={camp.id}
              onClick={() => setSelectedCampaignId(camp.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: (activeCampaignId === camp.id) ? '#0284c7' : 'transparent',
                color: (activeCampaignId === camp.id) ? '#fff' : '#64748b',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {camp.title}
            </button>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>작성자</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>추천점수 (NPS)</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>감정 분류</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>세부 평점</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>의견 및 피드백</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>후속 조치</th>
            </tr>
          </thead>
          <tbody>
            {currentResponses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  수집된 설문 응답이 없습니다. 학부모/회원에게 설문 링크를 발송해 보세요.
                </td>
              </tr>
            ) : (
              currentResponses.map((res) => {
                const sentiment = classifySentiment(res.npsScore);
                return (
                  <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600 }}>{res.isAnonymous ? '익명' : res.respondentName}</div>
                      <div style={{ color: '#94a3b8', fontSize: '11px' }}>{res.createdAt?.slice(0, 10)}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '16px', fontWeight: 'bold' }}>
                      {res.npsScore} / 10점
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor:
                            sentiment === 'promoter' ? '#16a34a' : sentiment === 'passive' ? '#f59e0b' : '#dc2626',
                        }}
                      >
                        {sentiment === 'promoter' ? '추천 고객' : sentiment === 'passive' ? '중립' : '불만 고객'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
                      <div>강사: ★ {res.instructorRating || '-'}</div>
                      <div>시설: ★ {res.facilityRating || '-'}</div>
                      <div>프로그램: ★ {res.curriculumRating || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', maxWidth: '300px' }}>
                      {res.feedbackText || <span style={{ color: '#94a3b8' }}>주관식 의견 없음</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {res.actionStatus === 'resolved' ? (
                        <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>조치 완료</span>
                      ) : (
                        <button
                          onClick={() => handleActionStatusChange(res.id, 'resolved')}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          상담/조치 완료 처리
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '450px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📊 새 만족도 설문 캠페인 개설</h2>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>설문 제목 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2026 가을학기 정기 만족도 설문"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>설문 대상</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="예: 전체 회원, 1개월차 신규 원생 등"
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>설문 안내문</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="원생/학부모님께 전달할 감사 인사 및 취지"
                  rows={3}
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
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '개설 중...' : '캠페인 시작'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
