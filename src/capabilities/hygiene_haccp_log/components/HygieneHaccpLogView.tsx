import React, { useEffect, useState } from 'react';
import { useOpsTable } from '@/hooks/useOpsTable';
import {
  TemperatureRecord,
  HealthCertificateRecord,
  HygieneCheckItem,
  evaluateTemperatureStatus,
  calculateDailyHygieneAudit,
  calculateHealthCertStatus,
} from '../domain/hygieneHaccpLogEngine';

const INITIAL_TEMP_RECORDS: TemperatureRecord[] = [
  {
    recordId: 'rec-1',
    unitId: 'unit-1',
    unitName: '주방 메인 4도어 냉장고',
    unitType: 'refrigerator',
    targetMinTemp: 0,
    targetMaxTemp: 5,
    recordedTemp: 3.2,
    timeSlot: 'morning',
    isAlert: false,
    recordedAt: '09:10',
    recordedBy: '김조리 실장',
  },
  {
    recordId: 'rec-2',
    unitId: 'unit-2',
    unitName: '육류 보관 냉동고',
    unitType: 'freezer',
    targetMinTemp: -25,
    targetMaxTemp: -18,
    recordedTemp: -19.4,
    timeSlot: 'morning',
    isAlert: false,
    recordedAt: '09:12',
    recordedBy: '김조리 실장',
  },
  {
    recordId: 'rec-3',
    unitId: 'unit-3',
    unitName: '음료 쇼케이스 냉장고',
    unitType: 'refrigerator',
    targetMinTemp: 0,
    targetMaxTemp: 5,
    recordedTemp: 6.8, // 경고
    timeSlot: 'morning',
    isAlert: true,
    alertReason: '적정 상한 온도(5℃) 초과 (실측: 6.8℃)',
    recordedAt: '09:15',
    recordedBy: '박서빙',
  },
];

const INITIAL_CHECKLIST: HygieneCheckItem[] = [
  { id: 'c-1', category: 'sanitation', task: '용도별 칼·도마(육류/어류/채소) 구분 사용 및 자외선 소독', isChecked: true, inspectorName: '김조리' },
  { id: 'c-2', category: 'storage', task: '식자재 소분 용기 유통기한 라벨 부착 및 선입선출 점검', isChecked: true, inspectorName: '김조리' },
  { id: 'c-3', category: 'personal', task: '조리 종사자 위생모, 마스크, 위생복 착용 및 손 소독', isChecked: true, inspectorName: '김조리' },
  { id: 'c-4', category: 'waste', task: '음식물 쓰레기통 뚜껑 밀폐 및 잔반 퇴식구 소독 완료', isChecked: false },
  { id: 'c-5', category: 'sanitation', task: '주방 후드 및 바닥 배수구 유지방 세척', isChecked: false },
];

const INITIAL_HEALTH_CERTS: HealthCertificateRecord[] = [
  {
    certId: 'cert-1',
    staffId: 's-1',
    staffName: '김조리',
    role: '조리 실장',
    examDate: '2025-04-10',
    expiryDate: '2026-04-10',
    dDay: 26,
    status: 'valid',
  },
  {
    certId: 'cert-2',
    staffId: 's-2',
    staffName: '이지은',
    role: '주방 보조 (파트타임)',
    examDate: '2025-03-22',
    expiryDate: '2026-03-22',
    dDay: 7, // D-7 경고
    status: 'warning',
  },
  {
    certId: 'cert-3',
    staffId: 's-3',
    staffName: '최홀서빙',
    role: '홀 캡틴',
    examDate: '2025-02-28',
    expiryDate: '2026-02-28',
    dDay: -15, // 만료!
    status: 'expired',
  },
];

export const HygieneHaccpLogView: React.FC = () => {
  const { rows, create } = useOpsTable<{
    id: string;
    checkpoint: string;
    value: string;
    passed: boolean;
    note?: string | null;
    measured_at: string;
    department_id?: string | null;
  }>('hygiene_haccp_log');
  const [tempRecords, setTempRecords] = useState<TemperatureRecord[]>([]);
  const [checklist, setChecklist] = useState<HygieneCheckItem[]>(INITIAL_CHECKLIST);
  const [healthCerts, setHealthCerts] = useState<HealthCertificateRecord[]>(INITIAL_HEALTH_CERTS);

  useEffect(() => {
    setTempRecords(
      rows.map((row) => ({
        recordId: row.id,
        unitId: row.id,
        unitName: row.checkpoint,
        unitType: 'refrigerator' as const,
        targetMinTemp: 0,
        targetMaxTemp: 5,
        recordedTemp: Number(row.value) || 0,
        timeSlot: 'afternoon' as const,
        isAlert: !row.passed,
        alertReason: row.note || undefined,
        recordedAt: new Date(row.measured_at).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        recordedBy: '현장 담당',
      })),
    );
  }, [rows]);
  const [activeTab, setActiveTab] = useState<'temp' | 'checklist' | 'certs'>('temp');

  // 신규 온도 입력용 상태
  const [selectedUnitType, setSelectedUnitType] = useState<'refrigerator' | 'freezer'>('refrigerator');
  const [unitNameInput, setUnitNameInput] = useState('채소 보관 냉장고');
  const [inputTemp, setInputTemp] = useState<number>(3.5);

  const handleAddTemperature = () => {
    const evalRes = evaluateTemperatureStatus(selectedUnitType, inputTemp);
    const newRecord: TemperatureRecord = {
      recordId: `t-${Date.now()}`,
      unitId: `unit-${Date.now()}`,
      unitName: unitNameInput,
      unitType: selectedUnitType,
      targetMinTemp: selectedUnitType === 'refrigerator' ? 0 : -25,
      targetMaxTemp: selectedUnitType === 'refrigerator' ? 5 : -18,
      recordedTemp: inputTemp,
      timeSlot: 'afternoon',
      isAlert: evalRes.isAlert,
      alertReason: evalRes.alertReason,
      recordedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      recordedBy: '주방 당직자',
    };

    void create({
      checkpoint: newRecord.unitName,
      value: String(newRecord.recordedTemp),
      passed: !newRecord.isAlert,
      note: newRecord.alertReason ?? null,
      measured_at: new Date().toISOString(),
      department_id: null,
    }).then(() => {
      setTempRecords([newRecord, ...tempRecords]);
    });
  };

  const handleToggleCheck = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, isChecked: !item.isChecked, inspectorName: !item.isChecked ? '현재 점검자' : undefined }
          : item
      )
    );
  };

  const handleRenewCert = (certId: string) => {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);

    const expiryStr = nextYear.toISOString().split('T')[0];
    const statusRes = calculateHealthCertStatus(expiryStr);

    setHealthCerts(prev =>
      prev.map(c =>
        c.certId === certId
          ? {
              ...c,
              examDate: today.toISOString().split('T')[0],
              expiryDate: expiryStr,
              dDay: statusRes.dDay,
              status: statusRes.status,
            }
          : c
      )
    );
  };

  const auditSummary = calculateDailyHygieneAudit('2026-03-15', tempRecords, checklist, healthCerts);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            🧼 주방 위생 HACCP 점검 & 보건증 만료 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            식품위생법 표준 냉장·냉동고 실시간 온도 일지, 식약처 일일 위생 체크리스트 및 직원 보건증 D-Day를 통합 관제합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('temp')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'temp'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            냉장·냉동 온도 일지 ({tempRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'checklist'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            일일 위생 체크표 ({auditSummary.checklistCompletionRate}%)
          </button>
          <button
            onClick={() => setActiveTab('certs')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors min-h-[44px] cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'certs'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            직원 보건증 만료 ({auditSummary.expiringHealthCertCount})
            {auditSummary.expiringHealthCertCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold tabular-nums">
                {auditSummary.expiringHealthCertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 종합 현황 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">식약처 점검 적합성</div>
          <div className={`text-2xl font-bold mt-1.5 ${auditSummary.isInspectionReady ? 'text-emerald-600' : 'text-red-600'}`}>
            {auditSummary.isInspectionReady ? '✅ 합격 (Ready)' : '⚠️ 보완 필요'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {auditSummary.isInspectionReady ? '구청 위생점검 대응 완료' : '이상 온도 또는 미완료 항목 존재'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">냉장·냉동 이상 온도</div>
          <div className={`text-2xl font-bold mt-1.5 tabular-nums font-mono ${auditSummary.temperatureAlerts > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {auditSummary.temperatureAlerts} 건
          </div>
          <div className="text-xs text-slate-400 mt-1">냉장 0~5℃ / 냉동 -18℃ 이하</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">일일 위생 체크 진행률</div>
          <div className="text-2xl font-bold text-blue-600 mt-1.5 tabular-nums font-mono">
            {auditSummary.checklistCompletionRate}%
          </div>
          <div className="text-xs text-slate-400 mt-1 tabular-nums font-mono">
            {auditSummary.completedCheckItems} / {auditSummary.totalCheckItems} 항목 완료
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">보건증 만료 임박/경과</div>
          <div className={`text-2xl font-bold mt-1.5 tabular-nums font-mono ${auditSummary.expiringHealthCertCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {auditSummary.expiringHealthCertCount} 명
          </div>
          <div className="text-xs text-slate-400 mt-1">D-14일 전 사전 경고 표시</div>
        </div>
      </div>

      {activeTab === 'temp' ? (
        <div className="space-y-4">
          {/* 주방 태블릿 원터치 온도 입력 바 */}
          <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl shadow-2xs space-y-3">
            <h4 className="text-sm font-bold text-blue-900">
              📟 주방 태블릿 간편 실측 온도 등록
            </h4>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <select
                value={selectedUnitType}
                onChange={e => setSelectedUnitType(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="refrigerator">냉장고 (기준 0~5℃)</option>
                <option value="freezer">냉동고 (기준 -18℃ 이하)</option>
              </select>
              <input
                type="text"
                value={unitNameInput}
                onChange={e => setUnitNameInput(e.target.value)}
                placeholder="기기명 (예: 메인 냉장고)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-700">실측:</span>
                <input
                  type="number"
                  step={0.1}
                  value={inputTemp}
                  onChange={e => setInputTemp(Number(e.target.value))}
                  className="w-20 px-2 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-mono tabular-nums text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-700">℃</span>
              </div>
              <button
                onClick={handleAddTemperature}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm min-h-[44px] transition-colors cursor-pointer shadow-2xs shrink-0"
              >
                + 즉시 기록
              </button>
            </div>
          </div>

          {/* 온도 기록 목록 */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">측정 시간</th>
                    <th className="px-3.5 py-3">보관 기기명</th>
                    <th className="px-3.5 py-3">구분</th>
                    <th className="px-3.5 py-3">기준 온도</th>
                    <th className="px-3.5 py-3">실측 온도</th>
                    <th className="px-3.5 py-3">판정 결과</th>
                    <th className="px-3.5 py-3">기록자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tempRecords.map(rec => (
                    <tr key={rec.recordId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3.5 py-3.5 text-slate-500 tabular-nums font-mono">
                        {rec.recordedAt} ({rec.timeSlot === 'morning' ? '오전' : '오후'})
                      </td>
                      <td className="px-3.5 py-3.5 font-semibold text-slate-900">{rec.unitName}</td>
                      <td className="px-3.5 py-3.5 text-slate-600">
                        {rec.unitType === 'refrigerator' ? '냉장' : '냉동'}
                      </td>
                      <td className="px-3.5 py-3.5 text-slate-500 tabular-nums font-mono">
                        {rec.unitType === 'refrigerator' ? '0℃ ~ 5℃' : '-18℃ 이하'}
                      </td>
                      <td className={`px-3.5 py-3.5 font-bold tabular-nums font-mono ${rec.isAlert ? 'text-red-600' : 'text-slate-900'}`}>
                        {rec.recordedTemp} ℃
                      </td>
                      <td className="px-3.5 py-3.5">
                        {rec.isAlert ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            ⚠️ {rec.alertReason}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            정상 (적합)
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 text-slate-500">{rec.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'checklist' ? (
        /* 일일 위생 체크리스트 */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              📋 식약처 기준 일일 위생 점검표
            </h3>
            <span className="text-xs sm:text-sm text-slate-500">
              당일 점검 완료율: <strong className="text-blue-600 tabular-nums font-mono">{auditSummary.checklistCompletionRate}%</strong>
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {checklist.map(item => (
              <div
                key={item.id}
                onClick={() => handleToggleCheck(item.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  item.isChecked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={() => {}} // 부모 div 클릭으로 토글
                    className="w-4 h-4 rounded-sm text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className={`text-xs sm:text-sm font-medium ${item.isChecked ? 'text-emerald-950 font-semibold' : 'text-slate-700'}`}>
                    {item.task}
                  </span>
                </div>
                <div>
                  {item.isChecked ? (
                    <span className="text-xs text-emerald-700 font-semibold">
                      ✓ 점검 완료 ({item.inspectorName || '점검자'})
                    </span>
                  ) : (
                    <span className="text-xs text-red-500 font-semibold">
                      미점검
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 직원 보건증 만료 관리 탭 */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            🪪 조리·서빙 종사자 법정 보건증(건강진단결과서) 유효 현황
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">직원명</th>
                  <th className="px-3.5 py-3">직무/역할</th>
                  <th className="px-3.5 py-3">최근 검진일</th>
                  <th className="px-3.5 py-3">만료 예정일</th>
                  <th className="px-3.5 py-3">잔여 일수 (D-Day)</th>
                  <th className="px-3.5 py-3">상태</th>
                  <th className="px-3.5 py-3">갱신 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {healthCerts.map(cert => (
                  <tr key={cert.certId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3.5 py-3.5 font-semibold text-slate-900">{cert.staffName}</td>
                    <td className="px-3.5 py-3.5 text-slate-600">{cert.role}</td>
                    <td className="px-3.5 py-3.5 text-slate-500 tabular-nums font-mono">{cert.examDate}</td>
                    <td className="px-3.5 py-3.5 text-slate-500 tabular-nums font-mono">{cert.expiryDate}</td>
                    <td className="px-3.5 py-3.5 font-bold tabular-nums font-mono">
                      {cert.dDay < 0 ? (
                        <span className="text-red-600">만료 {Math.abs(cert.dDay)}일 경과</span>
                      ) : (
                        <span className={cert.dDay <= 14 ? 'text-amber-600' : 'text-emerald-600'}>
                          D-{cert.dDay}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        cert.status === 'valid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : cert.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cert.status === 'valid' ? '유효' : cert.status === 'warning' ? '만료 임박 (14일 이내)' : '만료 (과태료 대상)'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <button
                        onClick={() => handleRenewCert(cert.certId)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold min-h-[36px] transition-colors cursor-pointer shadow-2xs"
                      >
                        검진 갱신(1년 연장)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
