import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Plus,
  Trash2,
  Calendar,
  Users,
  Baby,
  Sparkles,
  Coins,
  UserCheck,
  Clock,
  Share2,
  CheckCircle2,
  Gift,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import type {
  CommissionSettlementStatus,
  EventBringingItems,
  FirstBirthdayEventPlan,
  FirstBirthdayProgramStep,
  VenueRulesDefinition,
} from '@/types/firstBirthdayPlanning';
import {
  calculateEventDDay,
  calculateEstimatedSettlementDate,
  calculateSetupAndTeardownTimes,
  createDefaultVenueRules,
  generateBriefingToken,
} from '@/shared/services/firstBirthdayPlanningService';

interface FirstBirthdayEventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: FirstBirthdayEventPlan;
  venueRules?: VenueRulesDefinition;
  onSave?: (updatedEvent: FirstBirthdayEventPlan) => void;
  readOnly?: boolean;
}

export const FirstBirthdayEventDetailModal: React.FC<FirstBirthdayEventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  venueRules = createDefaultVenueRules(),
  onSave,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'timeline' | 'styling' | 'rules' | 'planner'
  >('overview');

  const defaultSetupTimes = calculateSetupAndTeardownTimes(
    event.eventStartTime || '11:30',
    event.eventEndTime || '14:00'
  );

  const [formState, setFormState] = useState<FirstBirthdayEventPlan>({
    ...event,
    eventStartTime: event.eventStartTime || '11:30',
    eventEndTime: event.eventEndTime || '14:00',
    setupStartTime: event.setupStartTime || defaultSetupTimes.setupStartTime,
    teardownEndTime: event.teardownEndTime || defaultSetupTimes.teardownEndTime,
    commissionAmount: event.commissionAmount ?? 150000,
    commissionBonusAmount: event.commissionBonusAmount ?? 0,
    settlementStatus: event.settlementStatus || 'PENDING_EVENT',
    shareToken: event.shareToken || generateBriefingToken(event.id),
    bringingItems: event.bringingItems || {
      riceCakesFruits: true,
      customCake: true,
      returnGifts: true,
      alcoholWine: false,
      customFlowerBalloons: false,
    },
    venueRulesAgreed: event.venueRulesAgreed ?? true,
  });

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyBriefingLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const url = `https://moa.app/b/${formState.shareToken}`;
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleProgramStepChange = (
    index: number,
    field: keyof FirstBirthdayProgramStep,
    value: string | number
  ) => {
    if (readOnly) return;
    const updated = [...formState.programSteps];
    updated[index] = { ...updated[index], [field]: value };
    setFormState({ ...formState, programSteps: updated });
  };

  const handleAddProgramStep = () => {
    if (readOnly) return;
    const nextOrder = formState.programSteps.length + 1;
    const newStep: FirstBirthdayProgramStep = {
      stepOrder: nextOrder,
      time: '13:00',
      title: '추가 식순',
      description: '',
    };
    setFormState({
      ...formState,
      programSteps: [...formState.programSteps, newStep],
    });
  };

  const handleRemoveProgramStep = (index: number) => {
    if (readOnly) return;
    const updated = formState.programSteps
      .filter((_, i) => i !== index)
      .map((step, idx) => ({ ...step, stepOrder: idx + 1 }));
    setFormState({ ...formState, programSteps: updated });
  };

  const handleBringingItemToggle = (key: keyof EventBringingItems) => {
    if (readOnly) return;
    const current = formState.bringingItems || {
      riceCakesFruits: false,
      customCake: false,
      returnGifts: false,
      alcoholWine: false,
      customFlowerBalloons: false,
    };
    setFormState({
      ...formState,
      bringingItems: {
        ...current,
        [key]: !current[key],
      },
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formState);
    }
    onClose();
  };

  const totalCommission =
    (formState.commissionAmount || 0) + (formState.commissionBonusAmount || 0);

  const dday = calculateEventDDay(formState.eventDate);
  const estimatedPayDate = calculateEstimatedSettlementDate(formState.eventDate);

  const getSettlementBadge = (status: CommissionSettlementStatus = 'PENDING_EVENT') => {
    switch (status) {
      case 'PENDING_EVENT':
        return (
          <span className="bg-amber-100 text-amber-900 font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            확정 예정 수수료 ₩{totalCommission.toLocaleString()} ({dday.label})
          </span>
        );
      case 'READY_TO_SETTLE':
        return <Badge variant="brand">정산 승인 대기 ({estimatedPayDate} 입금)</Badge>;
      case 'SETTLED':
        return <Badge variant="success">정산 지급 완료</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${formState.babyName} 첫돌 잔치 상세 계획서`}
      maxWidth="2xl"
      description={`행사 일자: ${formState.eventDate} | ${formState.timeSlot} | ${formState.roomName}`}
      footer={
        <div className="flex justify-between items-center w-full">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyBriefingLink}
            className="flex items-center gap-1 text-xs"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 브리핑 링크 복사 완료!
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-800" /> 카카오톡 브리핑 링크 복사
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
            {!readOnly && onSave && (
              <Button variant="primary" onClick={handleSave}>
                저장하기
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 상단: 담당 플래너 및 [확정 예정 수수료 ₩150,000 (D-45)] 뱃지 시각화 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-800" />
            <span className="font-semibold text-slate-800">
              담당 플래너:{' '}
              {formState.plannerName
                ? `${formState.plannerName} (${formState.plannerId || '미등록'})`
                : '미지정'}
            </span>
            {formState.plannerAgency && (
              <span className="text-slate-500">[{formState.plannerAgency}]</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getSettlementBadge(formState.settlementStatus)}
          </div>
        </div>

        {/* 네비게이션 탭 (5종) */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-slate-900 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            기본정보 & 세팅버퍼
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`pb-2 px-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'timeline'
                ? 'border-slate-900 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            식순 타임라인 ({formState.programSteps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('styling')}
            className={`pb-2 px-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'styling'
                ? 'border-slate-900 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            돌상 & 옵션
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2 px-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'rules'
                ? 'border-slate-900 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            반입 & 시설규정
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`pb-2 px-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'planner'
                ? 'border-slate-900 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            플래너 귀속 & 수수료
          </button>
        </div>

        {/* 탭 1: 기본 정보 및 세팅/철수 버퍼 분리 관리 */}
        {activeTab === 'overview' && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 flex items-center gap-1.5 mb-1 font-medium">
                  <Baby className="w-4 h-4 text-amber-500" /> 주인공 아기
                </span>
                <p className="font-semibold text-slate-800 text-base">{formState.babyName}</p>
                <p className="text-xs text-slate-500">생년월일: {formState.babyBirthDate}</p>
              </div>
              <div>
                <span className="text-slate-500 flex items-center gap-1.5 mb-1 font-medium">
                  <Calendar className="w-4 h-4 text-slate-700" /> 행사 일자 및 장소
                </span>
                <p className="font-semibold text-slate-800">{formState.eventDate}</p>
                <p className="text-xs text-slate-600">{formState.roomName}</p>
              </div>
            </div>

            {/* 1. 세팅 및 철수 버퍼 분리 관리 섹션 */}
            <div className="border border-slate-200 bg-slate-50/40 rounded-xl p-3.5 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-800" /> 세팅 및 철수 버퍼 시간 분리 관리
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-medium block">
                    하객 본 행사 시간 (시작 ~ 종료)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={formState.eventStartTime || '11:30'}
                      onChange={(e) =>
                        setFormState({ ...formState, eventStartTime: e.target.value })
                      }
                      className="w-20 font-bold border rounded p-1 text-center font-mono"
                    />
                    <span>~</span>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={formState.eventEndTime || '14:00'}
                      onChange={(e) =>
                        setFormState({ ...formState, eventEndTime: e.target.value })
                      }
                      className="w-20 font-bold border rounded p-1 text-center font-mono"
                    />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-700 font-semibold block flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-slate-700" /> 세팅 입실 & 철수 완료 버퍼
                  </span>
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">세팅 입실:</span>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={formState.setupStartTime || '10:30'}
                        onChange={(e) =>
                          setFormState({ ...formState, setupStartTime: e.target.value })
                        }
                        className="w-20 font-bold border rounded p-1 text-center font-mono text-slate-900"
                      />
                    </div>
                    <span>~</span>
                    <div>
                      <span className="text-[10px] text-slate-400 block">철수 퇴실:</span>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={formState.teardownEndTime || '14:30'}
                        onChange={(e) =>
                          setFormState({ ...formState, teardownEndTime: e.target.value })
                        }
                        className="w-20 font-bold border rounded p-1 text-center font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3.5 space-y-3">
              <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-800" /> 초청 인원 및 유아 좌석 관리
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border rounded p-2.5">
                  <span className="text-xs text-slate-500 block">최소 보증 인원</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      disabled={readOnly}
                      value={formState.guaranteedGuests}
                      onChange={(e) =>
                        setFormState({ ...formState, guaranteedGuests: Number(e.target.value) })
                      }
                      className="w-16 font-bold text-slate-800 border rounded px-1.5 py-0.5 text-center disabled:bg-slate-50"
                    />
                    <span className="text-sm font-medium text-slate-600">명</span>
                  </div>
                </div>
                <div className="bg-white border rounded p-2.5">
                  <span className="text-xs text-slate-500 block">예상 참석 인원</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      disabled={readOnly}
                      value={formState.expectedGuests}
                      onChange={(e) =>
                        setFormState({ ...formState, expectedGuests: Number(e.target.value) })
                      }
                      className="w-16 font-bold text-slate-800 border rounded px-1.5 py-0.5 text-center disabled:bg-slate-50"
                    />
                    <span className="text-sm font-medium text-slate-600">명</span>
                  </div>
                </div>
                <div className="bg-white border rounded p-2.5">
                  <span className="text-xs text-slate-500 block">유아의자(하이체어)</span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      disabled={readOnly}
                      value={formState.highChairCount}
                      onChange={(e) =>
                        setFormState({ ...formState, highChairCount: Number(e.target.value) })
                      }
                      className="w-16 font-bold text-slate-800 border rounded px-1.5 py-0.5 text-center disabled:bg-slate-50"
                    />
                    <span className="text-sm font-medium text-slate-600">개</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 식순 진행 시나리오 */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                행사 당일 순차적으로 진행될 타임라인과 주요 액션을 기록합니다.
              </p>
              {!readOnly && (
                <Button size="sm" variant="outline" onClick={handleAddProgramStep}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> 식순 추가
                </Button>
              )}
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {formState.programSteps.map((step, idx) => (
                <div
                  key={step.stepOrder || idx}
                  className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs shrink-0 mt-1">
                    {step.stepOrder}
                  </div>
                  <div className="w-20 shrink-0">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={step.time}
                      onChange={(e) => handleProgramStepChange(idx, 'time', e.target.value)}
                      placeholder="11:30"
                      className="w-full text-xs font-mono font-medium border rounded px-1.5 py-1 text-center disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={step.title}
                      onChange={(e) => handleProgramStepChange(idx, 'title', e.target.value)}
                      placeholder="식순 제목"
                      className="w-full text-xs font-semibold border rounded px-2 py-1 disabled:bg-slate-100"
                    />
                    <input
                      type="text"
                      disabled={readOnly}
                      value={step.description || ''}
                      onChange={(e) =>
                        handleProgramStepChange(idx, 'description', e.target.value)
                      }
                      placeholder="세부 진행 내용 / MC 멘트 포인트"
                      className="w-full text-xs text-slate-600 border rounded px-2 py-1 disabled:bg-slate-100"
                    />
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProgramStep(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                      aria-label="식순 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 탭 3: 돌상 및 연계옵션 */}
        {activeTab === 'styling' && (
          <div className="space-y-4 text-sm">
            <div className="border border-slate-200 rounded-lg p-3 space-y-3">
              <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> 돌상 스타일링 및 돌잡이
              </h4>
              <div className="space-y-2">
                <label className="block text-xs text-slate-600">돌상 컨셉 테마</label>
                <div className="flex gap-2">
                  {(['TRADITIONAL', 'MODERN_FLOWER', 'SIMPLE_ELEGANT'] as const).map((t) => (
                    <Badge
                      key={t}
                      variant={formState.stylingOptions.theme === t ? 'brand' : 'neutral'}
                      className="cursor-pointer"
                      onClick={() =>
                        !readOnly &&
                        setFormState({
                          ...formState,
                          stylingOptions: { ...formState.stylingOptions, theme: t },
                        })
                      }
                    >
                      {t === 'TRADITIONAL'
                        ? '전통 돌상'
                        : t === 'MODERN_FLOWER'
                        ? '모던 플라워'
                        : '심플 엘레강스'}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">돌잡이 세팅 물품</label>
                <div className="flex flex-wrap gap-1.5">
                  {formState.stylingOptions.doljabiItems.map((item, i) => (
                    <span
                      key={i}
                      className="bg-amber-50 text-amber-800 text-xs px-2 py-0.5 rounded border border-amber-200 font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">백드롭 현수막 문구</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={formState.stylingOptions.backdropText}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      stylingOptions: { ...formState.stylingOptions, backdropText: e.target.value },
                    })
                  }
                  className="w-full text-xs border rounded px-2.5 py-1.5 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-slate-800 text-xs">외부 제휴 서비스 연계</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.externalServices.mcIncluded}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        externalServices: {
                          ...formState.externalServices,
                          mcIncluded: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>전문 돌잡이 사회자(MC)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.externalServices.snapPhotographer}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        externalServices: {
                          ...formState.externalServices,
                          snapPhotographer: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>스냅 사진 촬영 작가</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.externalServices.hanbokDressRental}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        externalServices: {
                          ...formState.externalServices,
                          hanbokDressRental: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>아기 의상(한복/드레스) 대여</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.externalServices.favorGiftTable}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        externalServices: {
                          ...formState.externalServices,
                          favorGiftTable: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>답례품 테이블 세팅 지원</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 탭 4: 반입 물품 체크리스트 & 파티룸 이용 규정 (신규 요구사항 완벽 반영) */}
        {activeTab === 'rules' && (
          <div className="space-y-4 text-sm">
            {/* 외부 반입 예정 물품 체크리스트 */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-rose-500" /> 외부 반입 예정 물품 체크리스트
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.bringingItems?.riceCakesFruits ?? true}
                    onChange={() => handleBringingItemToggle('riceCakesFruits')}
                  />
                  <span>수제 떡 / 생과일 (무료)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.bringingItems?.customCake ?? true}
                    onChange={() => handleBringingItemToggle('customCake')}
                  />
                  <span>생화 / 수제 케이크 (냉장 보관)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.bringingItems?.returnGifts ?? true}
                    onChange={() => handleBringingItemToggle('returnGifts')}
                  />
                  <span>하객 답례품 (입구 전시)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.bringingItems?.alcoholWine ?? false}
                    onChange={() => handleBringingItemToggle('alcoholWine')}
                  />
                  <span>외부 주류 / 와인 (코키지 적용)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70 col-span-2">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.bringingItems?.customFlowerBalloons ?? false}
                    onChange={() => handleBringingItemToggle('customFlowerBalloons')}
                  />
                  <span>커스텀 헬륨 풍선 / 대형 플라워 오브제</span>
                </label>
              </div>
            </div>

            {/* 파티룸 필수 이용 규정 안내 */}
            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3.5 space-y-2.5 text-xs text-amber-950">
              <h4 className="font-bold flex items-center gap-1.5 text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> 파티룸 현장 이용 및 시설 보호 필수 규정
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] text-amber-900">
                <li>
                  <strong>벽면 부착 규정:</strong> {venueRules.wallDecorPolicy}
                </li>
                <li>
                  <strong>화기 안전 규정:</strong> {venueRules.firePolicy}
                </li>
                <li>
                  <strong>음식 반입 규정:</strong> {venueRules.outsideFoodPolicy}
                </li>
                {venueRules.corkagePolicy && (
                  <li>
                    <strong>주류 및 코키지:</strong> {venueRules.corkagePolicy}
                  </li>
                )}
              </ul>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                <label className="flex items-center gap-2 font-bold cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={formState.venueRulesAgreed ?? true}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        venueRulesAgreed: e.target.checked,
                        venueRulesAgreedAt: e.target.checked ? new Date().toISOString() : undefined,
                      })
                    }
                  />
                  <span>위 파티룸 필수 이용 규정을 확인하였으며, 플래너/혼주 안내에 동의합니다.</span>
                </label>
                <Badge variant={formState.venueRulesAgreed ? 'success' : 'warning'}>
                  {formState.venueRulesAgreed ? '규정 동의 완료' : '동의 필요'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* 탭 5: 담당 플래너 & 수수료 귀속 */}
        {activeTab === 'planner' && (
          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Coins className="w-4 h-4 text-slate-800" /> 플래너 배정 및 성사 수수료 귀속 관리
              </div>
              <p>
                「D-Day 행사 완료 후 익월 정산」 원칙에 따라 고객 잔금 완납 시 지정일에 자동 정산됩니다.
              </p>
            </div>

            {/* 플래너 기본 정보 */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-3">
              <h4 className="font-semibold text-slate-800 text-xs">담당 플래너 정보</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">플래너 ID (고유코드)</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formState.plannerId || ''}
                    onChange={(e) => setFormState({ ...formState, plannerId: e.target.value })}
                    placeholder="예: pl_042"
                    className="w-full text-xs font-mono font-bold border rounded px-2.5 py-1.5 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">플래너 이름</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formState.plannerName || ''}
                    onChange={(e) => setFormState({ ...formState, plannerName: e.target.value })}
                    placeholder="예: 박지민"
                    className="w-full text-xs font-medium border rounded px-2.5 py-1.5 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">소속 에이전시</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formState.plannerAgency || ''}
                    onChange={(e) => setFormState({ ...formState, plannerAgency: e.target.value })}
                    placeholder="예: 해피웨딩 / 프리랜서"
                    className="w-full text-xs border rounded px-2.5 py-1.5 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* 귀속 수수료 및 정산 상태 */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-3">
              <h4 className="font-semibold text-slate-800 text-xs">수수료 금액 및 정산 상태</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">기본 수수료 (원)</label>
                  <input
                    type="number"
                    disabled={readOnly}
                    value={formState.commissionAmount || 0}
                    onChange={(e) =>
                      setFormState({ ...formState, commissionAmount: Number(e.target.value) })
                    }
                    className="w-full text-xs font-bold border rounded px-2.5 py-1.5 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">비선호 타임 보너스 (원)</label>
                  <input
                    type="number"
                    disabled={readOnly}
                    value={formState.commissionBonusAmount || 0}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        commissionBonusAmount: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs font-bold border rounded px-2.5 py-1.5 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">정산 처리 상태</label>
                  <select
                    disabled={readOnly}
                    value={formState.settlementStatus || 'PENDING_EVENT'}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        settlementStatus: e.target.value as CommissionSettlementStatus,
                      })
                    }
                    className="w-full text-xs font-semibold border rounded px-2 py-1.5 bg-white text-slate-800"
                  >
                    <option value="PENDING_EVENT">행사 진행 대기 (D-Day 전)</option>
                    <option value="READY_TO_SETTLE">정산 승인 대기</option>
                    <option value="SETTLED">수수료 지급 완료</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 플래너 메모 */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">플래너 협업 전달사항</label>
              <textarea
                disabled={readOnly}
                rows={3}
                value={formState.plannerNotes || ''}
                onChange={(e) => setFormState({ ...formState, plannerNotes: e.target.value })}
                placeholder="혼주 전달 특이사항 또는 행사 준비 유의사항을 입력하세요."
                className="w-full text-xs border rounded p-2.5 disabled:bg-slate-50"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
