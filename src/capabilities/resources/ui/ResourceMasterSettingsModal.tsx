import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

import React, { useEffect,  useState } from 'react';
import {
  X,
  Building2,
  Car,
  DoorOpen,
  HeartPulse,
  Tv,
  Layers,
  ShieldCheck,
  UserCheck,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type {
  ResourceCategory,
  ApproverType,
  UniversalResourceMetadata,
  UpsertBookableResourceInput,
} from '../types';
import { upsertBookableResource } from '../resourceService';

interface StaffOption {
  id: string;
  name: string;
  role?: string;
}

interface ResourceMasterSettingsModalProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  staffList?: StaffOption[];
  initialData?: {
    id?: string;
    name: string;
    kind?: string;
    capacity?: number;
    openTime?: string;
    closeTime?: string;
    memo?: string;
    metadata?: UniversalResourceMetadata;
  };
}

const CATEGORY_OPTIONS: Array<{
  id: ResourceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultKind: string;
}> = [
  { id: 'meeting_room', label: '회의실·공간', icon: DoorOpen, defaultKind: 'room' },
  { id: 'vehicle', label: '업무용 차량', icon: Car, defaultKind: 'equipment' },
  { id: 'health_room', label: '보건실·상담실', icon: HeartPulse, defaultKind: 'room' },
  { id: 'display', label: '전광판·디스플레이', icon: Tv, defaultKind: 'facility' },
  { id: 'other', label: '기타 공용자원', icon: Layers, defaultKind: 'facility' },
];

const ROLE_OPTIONS = [
  { id: 'owner', label: '원장 / 대표이사 (최고책임자)' },
  { id: 'admin', label: '총무 / 총괄관리자 (Admin)' },
  { id: 'manager', label: '부서장 / 팀장 (Manager)' },
  { id: 'staff', label: '일반 담당자 (Staff)' },
];

export const ResourceMasterSettingsModal: React.FC<ResourceMasterSettingsModalProps> = ({
  organizationId,
  isOpen,
  onClose,
  onSaved,
  staffList = [],
  initialData,
}) => {
  const [category, setCategory] = useState<ResourceCategory>(
    initialData?.metadata?.category || 'meeting_room'
  );
  const [name, setName] = useState<string>(initialData?.name || '');
  const [capacity, setCapacity] = useState<number>(initialData?.capacity || 4);
  const [openTime, setOpenTime] = useState<string>(initialData?.openTime || '09:00');
  const [closeTime, setCloseTime] = useState<string>(initialData?.closeTime || '18:00');
  const [memo, setMemo] = useState<string>(initialData?.memo || '');

  // 승인 거버넌스 상태
  const [requireApproval, setRequireApproval] = useState<boolean>(
    initialData?.metadata?.require_approval ?? false
  );
  const [approverType, setApproverType] = useState<ApproverType>(
    initialData?.metadata?.approver_type || 'staff'
  );
  const [approverId, setApproverId] = useState<string>(
    initialData?.metadata?.approver_id || ''
  );
  const [approverName, setApproverName] = useState<string>(
    initialData?.metadata?.approver_name || ''
  );

  // 카테고리별 동적 메타데이터
  const [plateNumber, setPlateNumber] = useState<string>(
    initialData?.metadata?.plate_number || ''
  );
  const [vehicleModel, setVehicleModel] = useState<string>(
    initialData?.metadata?.vehicle_model || ''
  );
  const [fuelType, setFuelType] = useState<string>(
    initialData?.metadata?.fuel_type || '가솔린'
  );
  const [parkingLocation, setParkingLocation] = useState<string>(
    initialData?.metadata?.parking_location || ''
  );
  const [fuelCardNumber, setFuelCardNumber] = useState<string>(
    initialData?.metadata?.fuel_card_number || ''
  );
  const [initialOdometerKm, setInitialOdometerKm] = useState<number>(
    initialData?.metadata?.initial_odometer_km || 0
  );

  const [hasProjector, setHasProjector] = useState<boolean>(
    initialData?.metadata?.has_projector ?? true
  );
  const [hasVideoConference, setHasVideoConference] = useState<boolean>(
    initialData?.metadata?.has_video_conference ?? true
  );
  const [serialNumber, setSerialNumber] = useState<string>(
    initialData?.metadata?.serial_number || ''
  );
  const [assetTag, setAssetTag] = useState<string>(
    initialData?.metadata?.asset_tag || ''
  );
  const [hasPowerAdapter, setHasPowerAdapter] = useState<boolean>(
    initialData?.metadata?.accessories_checklist?.power_adapter ?? true
  );
  const [hasRemoteController, setHasRemoteController] = useState<boolean>(
    initialData?.metadata?.accessories_checklist?.remote_controller ?? true
  );
  const [hasHdmiCable, setHasHdmiCable] = useState<boolean>(
    initialData?.metadata?.accessories_checklist?.hdmi_cable ?? true
  );

  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(
    initialData?.metadata?.slot_duration_minutes || 30
  );
  const [isPrivateConsultation, setIsPrivateConsultation] = useState<boolean>(
    initialData?.metadata?.is_private_consultation ?? true
  );

  const [screenResolution, setScreenResolution] = useState<string>(
    initialData?.metadata?.screen_resolution || '4K UHD'
  );
  const [displayLocation, setDisplayLocation] = useState<string>(
    initialData?.metadata?.display_location || ''
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('자원 명칭을 입력해주세요.');
      return;
    }

    // 핵심 유효성 가드: 승인 필요 자원인 경우 반드시 승인권자를 지정해야 함
    if (requireApproval && !approverId.trim()) {
      setErrorMessage(
        '승인이 필요한 자원은 반드시 승인권자(특정 담당자 또는 직급)를 지정해야 합니다.'
      );
      return;
    }

    const currentCatObj = CATEGORY_OPTIONS.find((c) => c.id === category);
    const kind = currentCatObj?.defaultKind || 'facility';

    let resolvedApproverName = approverName;
    if (requireApproval) {
      if (approverType === 'staff') {
        const found = staffList.find((s) => s.id === approverId);
        resolvedApproverName = found ? found.name : approverId;
      } else {
        const found = ROLE_OPTIONS.find((r) => r.id === approverId);
        resolvedApproverName = found ? found.label : approverId;
      }
    }

    const metadataPayload: UniversalResourceMetadata = {
      category,
      require_approval: requireApproval,
      approver_type: requireApproval ? approverType : undefined,
      approver_id: requireApproval ? approverId : undefined,
      approver_name: requireApproval ? resolvedApproverName : undefined,

      ...(category === 'vehicle' && {
        plate_number: plateNumber.trim(),
        vehicle_model: vehicleModel.trim(),
        fuel_type: fuelType,
        parking_location: parkingLocation.trim(),
        fuel_card_number: fuelCardNumber.trim(),
        initial_odometer_km: Number(initialOdometerKm) || 0,
      }),
      ...(category === 'meeting_room' && {
        has_projector: hasProjector,
        has_video_conference: hasVideoConference,
        max_occupancy: capacity,
        serial_number: serialNumber.trim(),
        asset_tag: assetTag.trim(),
        accessories_checklist: {
          power_adapter: hasPowerAdapter,
          remote_controller: hasRemoteController,
          hdmi_cable: hasHdmiCable,
        },
      }),
      ...(category === 'health_room' && {
        slot_duration_minutes: slotDurationMinutes,
        is_private_consultation: isPrivateConsultation,
      }),
      ...(category === 'display' && {
        screen_resolution: screenResolution.trim(),
        display_location: displayLocation.trim(),
      }),
    };

    const input: UpsertBookableResourceInput = {
      id: initialData?.id,
      organizationId,
      kind,
      name: name.trim(),
      capacity: Number(capacity) || 1,
      openTime,
      closeTime,
      memo: memo.trim() || undefined,
      metadata: metadataPayload,
    };

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await upsertBookableResource(input);
      onSaved();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '자원 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEscapeKey(onClose);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialData?.id ? '자원 정보 및 승인권자 수정' : '새 공유 자원 등록'}
              </h3>
              <p className="text-xs text-slate-500">
                차량, 회의실, 보건실 등 사내 공용 자원의 규격과 승인 권한을 지정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="닫기"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 (스크롤) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. 자원 카테고리 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              자원 카테고리
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-2xs ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-[11px] leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 기본 정보 (명칭, 수용인원, 운영시간) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                자원 명칭 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  category === 'vehicle'
                    ? '예: 업무용 1호차 (카니발)'
                    : category === 'meeting_room'
                    ? '예: 본관 3층 대회의실'
                    : '예: 중앙 건강상담실'
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                최대 정원 / 수용 인원
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value) || 1)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                운영 가능 시간 (시작 ~ 종료)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-400 text-xs">~</span>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 3. 승인 거버넌스 설정 (핵심 요구사항) */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">예약 승인권자 거버넌스</h4>
                  <p className="text-[11px] text-slate-500">
                    신청 시 즉시 확정할지, 지정 관리자의 승인을 거칠지 결정합니다.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-700">
                  {requireApproval ? '승인 필요 (On)' : '즉시 확정 (Off)'}
                </span>
              </label>
            </div>

            {/* 승인 필요 On 선택 시 필수 노출되는 승인권자 지정 카드 */}
            {requireApproval && (
              <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    승인권자 필수 지정 <span className="text-rose-500">*</span>
                  </span>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="approverType"
                        checked={approverType === 'staff'}
                        onChange={() => {
                          setApproverType('staff');
                          setApproverId('');
                        }}
                        className="text-indigo-600"
                      />
                      특정 담당자 지정
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="approverType"
                        checked={approverType === 'role'}
                        onChange={() => {
                          setApproverType('role');
                          setApproverId('');
                        }}
                        className="text-indigo-600"
                      />
                      직급/역할 지정
                    </label>
                  </div>
                </div>

                {approverType === 'staff' ? (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      승인 권한을 가질 사내 직원을 선택하세요
                    </label>
                    <select
                      value={approverId}
                      onChange={(e) => setApproverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      required={requireApproval}
                    >
                      <option value="">-- 승인 담당 직원 선택 --</option>
                      {staffList.length > 0 ? (
                        staffList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} {st.role ? `(${st.role})` : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="staff_fleet_mgr">홍길동 배차/시설과장</option>
                          <option value="staff_nurse">김간호 수간호사</option>
                          <option value="staff_general_affairs">이총무 팀장</option>
                        </>
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      승인 권한을 행사할 직급/역할을 선택하세요
                    </label>
                    <select
                      value={approverId}
                      onChange={(e) => setApproverId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      required={requireApproval}
                    >
                      <option value="">-- 직급/역할 선택 --</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. 카테고리별 동적 메타데이터 필드 */}
          {category === 'vehicle' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-indigo-600" />
                차량 상세 제원
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">차량 번호</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="예: 12가 3456"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">차종 / 모델</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="예: 카니발 9인승"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">유종</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="가솔린">가솔린</option>
                    <option value="디젤">디젤</option>
                    <option value="하이브리드">하이브리드</option>
                    <option value="전기">전기 (EV)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">주차 위치</label>
                  <input
                    type="text"
                    value={parkingLocation}
                    onChange={(e) => setParkingLocation(e.target.value)}
                    placeholder="예: 지하 2층 B-04"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">전용 주유카드 번호</label>
                  <input
                    type="text"
                    value={fuelCardNumber}
                    onChange={(e) => setFuelCardNumber(e.target.value)}
                    placeholder="예: 9410-****-****-1234"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">현재 주행거리 (km)</label>
                  <input
                    type="number"
                    value={initialOdometerKm}
                    onChange={(e) => setInitialOdometerKm(Number(e.target.value) || 0)}
                    placeholder="예: 42500"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'meeting_room' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-indigo-600" />
                회의실 및 IT 장비 설비
              </h4>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">시리얼 번호 (S/N)</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="예: SN-2026-IT-9821"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">고유 자산 번호 (Asset Tag)</label>
                  <input
                    type="text"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    placeholder="예: AST-MOA-0042"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 pt-1 border-t border-slate-200/60">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasProjector}
                    onChange={(e) => setHasProjector(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  빔프로젝터 / 대형 스크린
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVideoConference}
                    onChange={(e) => setHasVideoConference(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  화상회의 카메라·마이크
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPowerAdapter}
                    onChange={(e) => setHasPowerAdapter(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  전원 어댑터 구비
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRemoteController}
                    onChange={(e) => setHasRemoteController(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  리모컨 구비
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHdmiCable}
                    onChange={(e) => setHasHdmiCable(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  HDMI 케이블 구비
                </label>
              </div>
            </div>
          )}

          {category === 'health_room' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-indigo-600" />
                보건실 상담 정책
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">기본 상담 슬롯 시간</label>
                  <select
                    value={slotDurationMinutes}
                    onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value={20}>20분 단위</option>
                    <option value={30}>30분 단위 (기본)</option>
                    <option value={60}>60분 단위</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivateConsultation}
                      onChange={(e) => setIsPrivateConsultation(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    비공개 비밀보장 상담
                  </label>
                </div>
              </div>
            </div>
          )}

          {category === 'display' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-indigo-600" />
                디스플레이 전광판 스펙
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">해상도 / 규격</label>
                  <input
                    type="text"
                    value={screenResolution}
                    onChange={(e) => setScreenResolution(e.target.value)}
                    placeholder="예: 4K UHD (3840x2160)"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">설치 위치</label>
                  <input
                    type="text"
                    value={displayLocation}
                    onChange={(e) => setDisplayLocation(e.target.value)}
                    placeholder="예: 1층 로비 정문 전광판"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. 비고 / 안내사항 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              이용 안내 및 특이사항 (선택)
            </label>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 이용 후 정리정돈 필수, 야간 운행 시 사전 결재 필요"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 하단 액션 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm flex items-center gap-1.5"
            >
              {isSubmitting ? '저장 중...' : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  자원 및 승인권자 설정 저장
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceMasterSettingsModal;
