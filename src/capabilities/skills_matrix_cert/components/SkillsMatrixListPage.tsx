import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { GraduationCap, Plus, Award, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import {
  checkCertificationExpiry,
  type StaffSkillsMatrixRecord,
  type StaffCertification,
  type StaffSkillItem,
} from '../domain/skillsMatrixEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const SkillsMatrixListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [certName, setCertName] = useState('생활스포츠지도사 2급');
  const [issuingBody, setIssuingBody] = useState('국민체육진흥공단');
  const [expiresAt, setExpiresAt] = useState('2027-12-31');
  const [skillName, setSkillName] = useState('체형 교정 및 재활');
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5>(3);

  const { query } = useList<StaffSkillsMatrixRecord>({
    resource: 'staff_skills_matrix',
    sorters: [{ field: 'staff_name', order: 'asc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as StaffSkillsMatrixRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) {
      showToast('직원 성명을 입력해 주세요.', 'error');
      return;
    }

    const newCert: StaffCertification = {
      id: `cert-${Date.now()}`,
      cert_name: certName.trim(),
      issuing_body: issuingBody.trim(),
      issued_at: new Date().toISOString().split('T')[0],
      expires_at: expiresAt || undefined,
      status: 'ACTIVE',
    };

    const newSkill: StaffSkillItem = {
      skill_name: skillName.trim(),
      proficiency_level: level,
    };

    createRecord(
      {
        resource: 'staff_skills_matrix',
        values: {
          staff_id: `staff-${Date.now().toString().slice(-4)}`,
          staff_name: staffName.trim(),
          certifications: [newCert],
          skills: [newSkill],
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${staffName}] 직무 자격/스킬이 등록되었습니다.`, 'success');
          setIsModalOpen(false);
          setStaffName('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '등록 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            직원 법정 자격증 갱신 및 직무 스킬 매트릭스
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            CPR/스포츠지도사 등 법정 자격증 유효기한 D-60 만료 알림과 지도 역량 레벨을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 직원 자격/스킬 등록
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-8 text-center text-slate-400">불러오는 중...</div>
        ) : records.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-slate-400">등록된 직원 자격증/스킬 데이터가 없습니다.</div>
        ) : (
          records.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-5 space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{r.staff_name}</h3>
                <span className="text-xs text-slate-400">최근 갱신: {r.updated_at.split('T')[0]}</span>
              </div>

              {/* 자격증 리스트 */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> 보유 자격증 및 갱신 현황
                </h4>
                <div className="space-y-1.5">
                  {r.certifications.map((c) => {
                    const exp = checkCertificationExpiry(c.expires_at);
                    return (
                      <div
                        key={c.id}
                        className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{c.cert_name}</p>
                          <p className="text-slate-400">{c.issuing_body}</p>
                        </div>
                        <div>
                          {exp.status === 'ACTIVE' && (
                            <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">유효</span>
                          )}
                          {exp.status === 'EXPIRING_SOON' && (
                            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-bold animate-pulse">
                              갱신 임박 (D-{exp.daysRemaining})
                            </span>
                          )}
                          {exp.status === 'EXPIRED' && (
                            <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-bold">만료됨</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 스킬 매트릭스 */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  직무 스킬 레벨 (1~5)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {r.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200 flex items-center gap-1.5"
                    >
                      {s.skill_name}
                      <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                        L{s.proficiency_level}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
              <GraduationCap className="w-5 h-5" />
              신규 직원 자격증 및 스킬 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">직원 성명 *</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="예: 강동원 강사"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">자격증명 *</label>
                  <input
                    type="text"
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    placeholder="예: CPR 응급처치 수료증"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">발급/인증 기관</label>
                  <input
                    type="text"
                    value={issuingBody}
                    onChange={(e) => setIssuingBody(e.target.value)}
                    placeholder="예: 대한적십자사"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">자격증 만료/갱신 기한일</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">직무 지도 역량</label>
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="예: 산전산후 필라테스"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">숙련 레벨</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  >
                    <option value={1}>L1 (초급)</option>
                    <option value={2}>L2 (중급)</option>
                    <option value={3}>L3 (숙련)</option>
                    <option value={4}>L4 (전문)</option>
                    <option value={5}>L5 (마스터)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
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
