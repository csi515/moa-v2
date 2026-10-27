import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  assembleCareReportMessage,
  renderCareReportSvgCard,
  formatMealLabel,
  formatPottyLabel,
  type DailyCareLog,
  type MealStatus,
  type PottyStatus,
} from '../domain/dailyCareReportEngine';

export const DailyCareReportView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'create'>('logs');
  const [subjectName, setSubjectName] = useState('');
  const [mealStatus, setMealStatus] = useState<MealStatus>('all');
  const [pottyStatus, setPottyStatus] = useState<PottyStatus>('normal');
  const [napMinutes, setNapMinutes] = useState(60);
  const [medicationGiven, setMedicationGiven] = useState(false);
  const [conditionRating, setConditionRating] = useState(5);
  const [summaryComment, setSummaryComment] = useState('');
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<DailyCareLog | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // 1. 일일 알림장 목록 조회 (Refine v5)
  const { query } = useList<DailyCareLog>({
    resource: 'daily_care_logs',
    pagination: { pageSize: 50 },
  });
  const logs = query?.data?.data ?? [];
  const isLoading = query?.isLoading;

  // 2. 알림장 등록 뮤테이션
  const { mutate: createLog } = useCreate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    const todayStr = new Date().toISOString().slice(0, 10);

    setIsCreating(true);
    createLog(
      {
        resource: 'daily_care_logs',
        values: {
          subject_id: '00000000-0000-0000-0000-000000000001',
          subject_name: subjectName,
          subject_type: 'student',
          log_date: todayStr,
          meal_status: mealStatus,
          potty_status: pottyStatus,
          nap_minutes: napMinutes,
          medication_given: medicationGiven,
          condition_rating: conditionRating,
          summary_comment: summaryComment,
          dispatch_status: 'draft',
        },
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          setSubjectName('');
          setSummaryComment('');
          setActiveTab('logs');
        },
        onError: () => {
          setIsCreating(false);
        },
      }
    );
  };

  const handleCopyMessage = (logItem: DailyCareLog) => {
    const text = assembleCareReportMessage(logItem);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotice(`[${logItem.subjectName}] 보호자 알림장 문안이 복사되었습니다.`);
      setTimeout(() => setCopiedNotice(null), 3000);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          돌봄/활동 일일 알림장 & 타임라인 피드
        </h1>
        <p style={{ color: '#4B5563', fontSize: '14px', marginTop: '6px' }}>
          식사·배변·투약·수면 안심 케어 기록 및 비용 0원 W3C SVG 모바일 알림장 발행기
        </p>
      </header>

      {copiedNotice && (
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
          ✓ {copiedNotice}
        </div>
      )}

      {/* SVG 미리보기 모달 / 패널 */}
      {selectedPreviewLog && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1E3A8A' }}>
              🖼️ [{selectedPreviewLog.subjectName}] 모바일 0원 SVG 알림장 카드
            </h3>
            <button
              type="button"
              onClick={() => setSelectedPreviewLog(null)}
              style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          <div
            style={{ maxWidth: '480px', margin: '0 auto' }}
            dangerouslySetInnerHTML={{ __html: renderCareReportSvgCard(selectedPreviewLog) }}
          />
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'logs' ? 600 : 400,
            borderBottom: activeTab === 'logs' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'logs' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          오늘의 알림장 ({logs.length})
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
          + 새 알림장 작성
        </button>
      </div>

      {activeTab === 'logs' ? (
        <div>
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>알림장 목록 로딩 중...</div>
          ) : logs.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                color: '#6B7280',
              }}
            >
              오늘 작성된 알림장이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {logs.map((item) => (
                <div
                  key={item.id}
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
                      {item.subjectName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{item.logDate}</span>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>{formatMealLabel(item.mealStatus)}</div>
                    <div>{formatPottyLabel(item.pottyStatus)}</div>
                    <div style={{ color: '#4B5563' }}>💤 수면/휴식: {item.napMinutes}분</div>
                    <div style={{ color: item.medicationGiven ? '#D97706' : '#6B7280', fontWeight: 500 }}>
                      💊 투약: {item.medicationGiven ? '완료' : '해당 없음'}
                    </div>
                  </div>

                  {item.summaryComment && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '8px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#374151',
                      }}
                    >
                      {item.summaryComment}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(item)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        backgroundColor: '#F3F4F6',
                        color: '#1F2937',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      📋 알림장 복사
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewLog(item)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      🖼️ SVG 보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleCreateLog}
          style={{
            maxWidth: '560px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
            돌봄 알림장 작성
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              대상 이름 (원생 / 반려견)
            </label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="예: 초코, 이도윤"
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
                식사 상태
              </label>
              <select
                value={mealStatus}
                onChange={(e) => setMealStatus(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              >
                <option value="all">🥣 완식 (아주 잘 먹음)</option>
                <option value="half">🥣 절반 먹음</option>
                <option value="little">🥣 조금 먹음</option>
                <option value="none">⚠️ 식사 거부</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                배변 상태
              </label>
              <select
                value={pottyStatus}
                onChange={(e) => setPottyStatus(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              >
                <option value="normal">✨ 정상 배변</option>
                <option value="soft">💧 묽은 변/설사 주의</option>
                <option value="constipation">🧱 변비</option>
                <option value="none">⏳ 배변 없음</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                수면/낮잠 시간 (분)
              </label>
              <input
                type="number"
                value={napMinutes}
                onChange={(e) => setNapMinutes(Number(e.target.value))}
                min={0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={medicationGiven}
                  onChange={(e) => setMedicationGiven(e.target.checked)}
                />
                💊 요청 약 복용/투약 완료
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              선생님 한줄 코멘트
            </label>
            <textarea
              value={summaryComment}
              onChange={(e) => setSummaryComment(e.target.value)}
              placeholder="예: 오늘 하루도 친구들과 마당에서 신나게 뛰어놀고 밥도 깨끗이 비웠습니다!"
              rows={3}
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
            {isCreating ? '저장 중...' : '알림장 저장 및 발행'}
          </button>
        </form>
      )}
    </div>
  );
};
