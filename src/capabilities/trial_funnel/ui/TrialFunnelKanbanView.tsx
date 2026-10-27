import React, { useState } from 'react';
import { useList, useUpdate, useCreate } from '@refinedev/core';
import {
  calculateFunnelMetrics,
  groupLeadsByStatus,
  buildConsultationFromLead,
  buildCustomerFromLead,
  type TrialLead,
  type TrialLeadStatus,
} from '../domain/trialFunnelEngine';

const STATUS_COLUMNS: Array<{ key: TrialLeadStatus; label: string; color: string }> = [
  { key: 'new_inquiry', label: '신규 문의', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'consult_scheduled', label: '상담/체험 예약', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'trial_attended', label: '체험 완료', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'converted', label: '정규 등록 완료', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'dropped', label: '등록 포기/보류', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const TrialFunnelKanbanView: React.FC = () => {
  const { query } = useList<TrialLead>({
    resource: 'trial_leads',
    pagination: { pageSize: 100 },
  });
  const data = query?.data;
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: updateLead } = useUpdate();
  const { mutate: createLead } = useCreate();
  const { mutate: createConsultation } = useCreate();
  const { mutate: createCustomer } = useCreate();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSource, setNewSource] = useState<'instagram' | 'naver' | 'referral' | 'walk_in' | 'other'>('instagram');
  const [newTargetProgram, setNewTargetProgram] = useState('');

  const leads = data?.data ?? [];
  const metrics = calculateFunnelMetrics(leads);
  const grouped = groupLeadsByStatus(leads);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newPhone) return;

    createLead(
      {
        resource: 'trial_leads',
        values: {
          customer_name: newCustomerName,
          phone: newPhone,
          source: newSource,
          target_program: newTargetProgram || '일반 레슨',
          status: 'new_inquiry',
        },
      },
      {
        onSuccess: () => {
          setIsNewModalOpen(false);
          setNewCustomerName('');
          setNewPhone('');
          setNewTargetProgram('');
          refetch();
        },
      }
    );
  };

  const handleStatusChange = (leadId: string, nextStatus: TrialLeadStatus) => {
    let dropReason: string | undefined;
    let convertedPassId: string | undefined;
    const targetLead = leads.find((l) => l.id === leadId);

    if (nextStatus === 'dropped') {
      const reason = window.prompt('등록 포기(보류) 사유를 입력해주세요 (예: 시간표 불일치, 거리 문제 등)');
      if (!reason) return;
      dropReason = reason;
    } else if (nextStatus === 'consult_scheduled' && targetLead) {
      // 1. 상담 CRM (consultations) 레코드 자동 연계 기안
      createConsultation({
        resource: 'consultations',
        values: buildConsultationFromLead(targetLead),
      });
    } else if (nextStatus === 'converted' && targetLead) {
      convertedPassId = `pass-${Date.now().toString(36)}`;
      // 2. 정규 고객 대장 (customers) 자동 등록 연계
      createCustomer({
        resource: 'customers',
        values: buildCustomerFromLead(targetLead),
      });
    }

    updateLead(
      {
        resource: 'trial_leads',
        id: leadId,
        values: {
          status: nextStatus,
          drop_reason: dropReason,
          converted_pass_id: convertedPassId,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">리드 파이프라인 정보를 불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 상단 헤더 & 전환율 요약 카드 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">우리 매장 체험 및 상담 파이프라인</h1>
          <p className="text-sm text-slate-500 mt-1">
            신규 문의 유입부터 1회 무료 체험 및 정규 수강권 등록까지 고객 전환 여정을 한눈에 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition"
        >
          + 신규 상담 리드 등록
        </button>
      </div>

      {/* 핵심 지표 4대 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">총 누적 리드</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalLeads}건</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-purple-600">체험 참석 완료</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{metrics.trialAttended}명</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-green-600">정규 회원 전환</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{metrics.converted}명</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600">체험 ➔ 전환율</div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{metrics.trialToConvertRate}%</div>
        </div>
      </div>

      {/* 5단계 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((col) => {
          const items = grouped[col.key] || [];
          return (
            <div key={col.key} className="bg-slate-50 rounded-xl p-3 border border-slate-200 min-w-[220px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs font-medium text-slate-500">{items.length}</span>
              </div>

              <div className="space-y-2.5">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">등록된 고객 없음</div>
                ) : (
                  items.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:shadow-md transition text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-center font-bold text-slate-900">
                        <span>{lead.customer_name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-normal">{lead.source}</span>
                      </div>
                      <div className="text-slate-600">{lead.phone}</div>
                      {lead.target_program && (
                        <div className="text-[11px] text-indigo-600 font-medium">{lead.target_program}</div>
                      )}
                      {lead.drop_reason && (
                        <div className="text-[11px] text-rose-500 font-medium">사유: {lead.drop_reason}</div>
                      )}

                      {/* 단계 이동 드롭다운 및 CRM 연계 바로가기 */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            createConsultation({
                              resource: 'consultations',
                              values: buildConsultationFromLead(lead),
                            });
                            alert(`[${lead.customer_name}] 고객의 상담 일지가 CRM에 자동 등록되었습니다.`);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                          title="상담 CRM에 즉시 연계 기록"
                        >
                          💬 CRM연계
                        </button>
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as TrialLeadStatus)}
                          className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="new_inquiry">단계: 신규 문의</option>
                          <option value="consult_scheduled">단계: 상담/체험 예약</option>
                          <option value="trial_attended">단계: 체험 완료</option>
                          <option value="converted">단계: 정규 전환</option>
                          <option value="dropped">단계: 등록 포기</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 신규 리드 모달 */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">신규 체험·상담 고객 등록</h3>
            <form onSubmit={handleCreateLead} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">고객명</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="예: 김민지"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">연락처</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">유입 경로</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="instagram">인스타그램 / SNS</option>
                  <option value="naver">네이버 플레이스 / 검색</option>
                  <option value="referral">지인 / 친구 추천</option>
                  <option value="walk_in">방문 / 현장 문의</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">희망 과목 / 프로그램</label>
                <input
                  type="text"
                  value={newTargetProgram}
                  onChange={(e) => setNewTargetProgram(e.target.value)}
                  placeholder="예: 초급 피아노 바이엘"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
