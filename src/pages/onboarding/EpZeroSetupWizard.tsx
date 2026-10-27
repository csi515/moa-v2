import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Car,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useUpdate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { seedEpOrganizationRoles } from '@/core/organizations/services/epRoleSeed';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { showToast } from '@/shared/feedback/uiFeedback';

interface ParsedDepartment {
  id: string;
  name: string;
  parentPath?: string;
}

interface ParsedRole {
  name: string;
  rankOrder: number;
}

interface QuickVehicle {
  plateNumber: string;
  modelName: string;
  odometerKm: number;
}

interface QuickRoom {
  name: string;
  capacity: number;
}

const DEFAULT_DEPT_TEXT = `제조본부 > 생산1팀 > 조립파트
제조본부 > 생산1팀 > 검사파트
제조본부 > 품질보증팀
기술연구소 > 배터리개발팀
경영지원본부 > 인사총무팀`;

const DEFAULT_ROLE_TEXT = `대표이사
본부장
그룹장
팀장
수석연구원
선임연구원
사원`;

export const EpZeroSetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { mutate: updateOrgMutation } = useUpdate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: 회사/사업장 정보
  const [companyName, setCompanyName] = useState(currentOrganization?.name || '에이펙스 스마트 플랜트');
  const [businessNumber, setBusinessNumber] = useState('120-88-12345');
  const [plantLocation, setPlantLocation] = useState('경기도 화성시 동탄산단 1로 45');
  const [managerName, setManagerName] = useState('김공장장');

  // Step 2: 엑셀 텍스트 일괄 파서 (부서 / 직급)
  const [deptRawText, setDeptRawText] = useState(DEFAULT_DEPT_TEXT);
  const [roleRawText, setRoleRawText] = useState(DEFAULT_ROLE_TEXT);

  // Step 3: 공용 차량 및 회의실
  const [vehicles, setVehicles] = useState<QuickVehicle[]>([
    { plateNumber: '12가 3456', modelName: '카니발 9인승 (업무 1호)', odometerKm: 42150 },
    { plateNumber: '34나 7890', modelName: '아이오닉5 (업무 2호)', odometerKm: 18300 },
  ]);
  const [rooms, setRooms] = useState<QuickRoom[]>([
    { name: '대회의실 (비전룸)', capacity: 20 },
    { name: '1층 스마트 미팅룸', capacity: 8 },
    { name: '신소재 분석실', capacity: 4 },
  ]);

  // 임시 입력용
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newKm, setNewKm] = useState(10000);

  const [newRoomName, setNewRoomName] = useState('');
  const [newCapacity, setNewCapacity] = useState(6);

  // 부서 파싱
  const parsedDepartments = useMemo<ParsedDepartment[]>(() => {
    const lines = deptRawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const result: ParsedDepartment[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('>').map((p) => p.trim()).filter(Boolean);
      for (let j = 0; j < parts.length; j++) {
        const fullPath = parts.slice(0, j + 1).join(' > ');
        if (!seen.has(fullPath)) {
          seen.add(fullPath);
          result.push({
            id: `dept-${result.length + 1}`,
            name: parts[j],
            parentPath: j > 0 ? parts.slice(0, j).join(' > ') : undefined,
          });
        }
      }
    }
    return result;
  }, [deptRawText]);

  // 직급 파싱 (위에서부터 100단위 부여)
  const parsedRoles = useMemo<ParsedRole[]>(() => {
    const lines = roleRawText.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((name, idx) => ({
      name,
      rankOrder: (idx + 1) * 100,
    }));
  }, [roleRawText]);

  const handleAddVehicle = () => {
    if (!newPlate.trim()) return;
    setVehicles((prev) => [
      ...prev,
      { plateNumber: newPlate.trim(), modelName: newModel.trim() || '업무용 승용차', odometerKm: newKm },
    ]);
    setNewPlate('');
    setNewModel('');
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) return;
    setRooms((prev) => [
      ...prev,
      { name: newRoomName.trim(), capacity: newCapacity },
    ]);
    setNewRoomName('');
  };

  const handleFinishWizard = async () => {
    if (!currentOrganization?.id) {
      showToast('조직 정보가 없습니다. 다시 로그인해 주세요.', 'error');
      return;
    }

    updateOrgMutation({
      resource: 'organizations',
      id: currentOrganization.id,
      values: {
        name: companyName,
        settings: {
          ...(currentOrganization.settings as Record<string, unknown>),
          business_number: businessNumber,
          plant_location: plantLocation,
          manager_name: managerName,
          zero_setup_completed: true,
          setup_vehicles: vehicles,
          setup_rooms: rooms,
          setup_departments: parsedDepartments,
          setup_roles: parsedRoles,
        },
      },
    });

    try {
      const preset = getIndustryPreset(
        currentOrganization.industry_type ?? 'general_enterprise'
      );
      const result = await seedEpOrganizationRoles({
        organizationId: currentOrganization.id,
        wizardRoles: parsedRoles,
        presetRoles: (preset?.roles ?? []).map((r) => ({
          name: r.name,
          rank_order: r.rank_order,
          permissions: r.permissions ?? [],
        })),
      });
      if (result.seeded > 0) {
        showToast(`직급 ${result.seeded}개가 조직 권한에 등록되었습니다.`, 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '직급 시드 실패';
      showToast(`조직 설정은 저장됐지만 직급 시드에 실패했습니다: ${msg}`, 'error');
    }

    showToast('초기 세팅이 완료되었습니다. 사내 포털로 이동합니다.', 'success');
    navigate('/workspace/intranet');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 상단 프로그레스 헤더 */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span>10분 즉시 가동 Zero-Setup 마법사</span>
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-900">
          스마트 플랜트 사내 포털 초기 구성
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          회사 정보와 조직도, 공용 자원을 단 몇 분 만에 등록하고 현장에 즉시 배포하세요.
        </p>

        {/* 스텝 표시기 */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {[
            { num: 1, label: '사업장 정보' },
            { num: 2, label: '조직도·직급 일괄 파싱' },
            { num: 3, label: '차량·회의실 등록' },
            { num: 4, label: '세팅 완료' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === s.num
                    ? 'bg-indigo-600 text-white shadow-md'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-xs font-semibold ${step === s.num ? 'text-indigo-600' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {s.num < 4 && <span className="text-slate-300 mx-1">―</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 스텝 내용 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-indigo-600 font-bold border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5" />
              <h2 className="text-lg text-slate-900">Step 1. 사업장 기본 정보</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">회사명 / 사업장명 *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 font-semibold"
                  placeholder="예: (주)에이펙스 배터리 화성 기가팩토리"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">사업자 등록번호</label>
                <input
                  type="text"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900"
                  placeholder="000-00-00000"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">공장장 / 사업장 대표자명</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900"
                  placeholder="대표자 성명"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">사업장 소재지 (주소)</label>
                <input
                  type="text"
                  value={plantLocation}
                  onChange={(e) => setPlantLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900"
                  placeholder="공장 또는 사옥 도로명 주소"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
              >
                <span>다음: 조직도 일괄 파싱</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-indigo-600 font-bold border-b border-slate-100 pb-3">
              <Users className="w-5 h-5" />
              <h2 className="text-lg text-slate-900">Step 2. 조직도 및 직급 체계 엑셀 일괄 파싱</h2>
            </div>
            <p className="text-xs text-slate-500">
              사내 엑셀에서 부서 계층(예: 본부 &gt; 팀 &gt; 파트)과 직급 목록을 복사하여 아래 입력란에 그대로 붙여넣으세요.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* 부서 입력 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>부서 계층 구조 (1줄당 1개 경로)</span>
                  <span className="text-indigo-600 text-[11px] font-semibold">{parsedDepartments.length}개 부서 감지</span>
                </div>
                <textarea
                  rows={8}
                  value={deptRawText}
                  onChange={(e) => setDeptRawText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 font-mono"
                  placeholder="예: 제조본부 > 생산팀 > 1파트"
                />
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 max-h-36 overflow-y-auto space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">파싱된 부서 트리 미리보기:</span>
                  {parsedDepartments.map((d) => (
                    <div key={d.id} className="text-[11px] text-slate-700 flex items-center gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{d.parentPath ? `${d.parentPath} > ` : ''}</span>
                      <span className="font-bold text-slate-900">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 직급 입력 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>직급 체계 (상위자 순서대로 1줄당 1개)</span>
                  <span className="text-indigo-600 text-[11px] font-semibold">{parsedRoles.length}단계 위계 감지</span>
                </div>
                <textarea
                  rows={8}
                  value={roleRawText}
                  onChange={(e) => setRoleRawText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 font-mono"
                  placeholder="대표이사&#10;본부장&#10;팀장&#10;사원"
                />
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 max-h-36 overflow-y-auto space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">위계 순서 (Rank Order):</span>
                  {parsedRoles.map((r, i) => (
                    <div key={r.name} className="text-[11px] flex justify-between items-center text-slate-700">
                      <span className="font-semibold">{i + 1}. {r.name}</span>
                      <span className="text-indigo-600 font-mono font-bold text-[10px]">#{r.rankOrder}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
              >
                <span>다음: 공용 자원 등록</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-indigo-600 font-bold border-b border-slate-100 pb-3">
              <Car className="w-5 h-5" />
              <h2 className="text-lg text-slate-900">Step 3. 공용 차량 및 회의실 등록</h2>
            </div>
            <p className="text-xs text-slate-500">
              현장에서 예약 및 운행일지에 즉시 연동될 법인 차량과 회의실을 등록합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* 차량 목록 */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800">법인 업무용 차량 ({vehicles.length})</h3>
                <div className="space-y-2">
                  {vehicles.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <p className="font-bold text-slate-900">{v.plateNumber}</p>
                        <p className="text-[11px] text-slate-500">{v.modelName} · 시작 {v.odometerKm.toLocaleString()}km</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVehicles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-150 space-y-2">
                  <span className="font-bold text-indigo-900 block text-[11px]">+ 빠른 차량 추가</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="차량번호 (예: 56가 1234)"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="차종 (예: 스타리아)"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVehicle}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
                  >
                    차량 추가
                  </button>
                </div>
              </div>

              {/* 회의실 목록 */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800">회의실 및 실험실 ({rooms.length})</h3>
                <div className="space-y-2">
                  {rooms.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <p className="font-bold text-slate-900">{r.name}</p>
                        <p className="text-[11px] text-slate-500">최대 수용: {r.capacity}인</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRooms((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-150 space-y-2">
                  <span className="font-bold text-indigo-900 block text-[11px]">+ 빠른 회의실 추가</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="회의실명"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="수용인원"
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRoom}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
                  >
                    회의실 추가
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
              >
                <span>최종 검토 및 완료</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">모든 준비가 완료되었습니다!</h2>
              <p className="mt-1 text-sm text-slate-500">
                입력하신 사업장 프로필과 부서, 직급, 공용 자원이 즉시 활성화됩니다.
              </p>
            </div>

            <div className="mx-auto max-w-md rounded-2xl bg-slate-50 p-4 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">회사/사업장명:</span>
                <span className="font-bold text-slate-900">{companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">생성 부서:</span>
                <span className="font-bold text-indigo-700">{parsedDepartments.length}개 부서</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">설정 직급:</span>
                <span className="font-bold text-indigo-700">{parsedRoles.length}개 직급</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">등록 법인차량:</span>
                <span className="font-bold text-slate-900">{vehicles.length}대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">등록 회의실:</span>
                <span className="font-bold text-slate-900">{rooms.length}실</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinishWizard}
                className="w-full max-w-md rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition active:scale-95"
              >
                사내 포털 바로 시작하기 (Launch)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
