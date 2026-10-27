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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: '#111827' }}>
            🧼 주방 위생 HACCP 점검 & 보건증 만료 관리
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            식품위생법 표준 냉장·냉동고 실시간 온도 일지, 식약처 일일 위생 체크리스트 및 직원 보건증 D-Day를 통합 관제합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('temp')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'temp' ? '#0284c7' : '#ffffff',
              color: activeTab === 'temp' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            냉장·냉동 온도 일지 ({tempRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'checklist' ? '#0284c7' : '#ffffff',
              color: activeTab === 'checklist' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            일일 위생 체크표 ({auditSummary.checklistCompletionRate}%)
          </button>
          <button
            onClick={() => setActiveTab('certs')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'certs' ? '#0284c7' : '#ffffff',
              color: activeTab === 'certs' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            직원 보건증 만료 ({auditSummary.expiringHealthCertCount})
            {auditSummary.expiringHealthCertCount > 0 && (
              <span style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px' }}>
                {auditSummary.expiringHealthCertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 종합 현황 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>식약처 점검 적합성</div>
          <div style={{
            fontSize: '22px',
            fontWeight: 700,
            color: auditSummary.isInspectionReady ? '#10b981' : '#ef4444',
          }}>
            {auditSummary.isInspectionReady ? '✅ 합격 (Ready)' : '⚠️ 보완 필요'}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {auditSummary.isInspectionReady ? '구청 위생점검 대응 완료' : '이상 온도 또는 미완료 항목 존재'}
          </div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>냉장·냉동 이상 온도</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: auditSummary.temperatureAlerts > 0 ? '#ef4444' : '#10b981' }}>
            {auditSummary.temperatureAlerts} 건
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>냉장 0~5℃ / 냉동 -18℃ 이하</div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>일일 위생 체크 진행률</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284c7' }}>
            {auditSummary.checklistCompletionRate}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {auditSummary.completedCheckItems} / {auditSummary.totalCheckItems} 항목 완료
          </div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>보건증 만료 임박/경과</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: auditSummary.expiringHealthCertCount > 0 ? '#ef4444' : '#10b981' }}>
            {auditSummary.expiringHealthCertCount} 명
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>D-14일 전 사전 경고 표시</div>
        </div>
      </div>

      {activeTab === 'temp' ? (
        <div>
          {/* 주방 태블릿 원터치 온도 입력 바 */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0369a1' }}>
              📟 주방 태블릿 간편 실측 온도 등록
            </h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={selectedUnitType}
                onChange={e => setSelectedUnitType(e.target.value as any)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '14px' }}
              >
                <option value="refrigerator">냉장고 (기준 0~5℃)</option>
                <option value="freezer">냉동고 (기준 -18℃ 이하)</option>
              </select>
              <input
                type="text"
                value={unitNameInput}
                onChange={e => setUnitNameInput(e.target.value)}
                placeholder="기기명 (예: 메인 냉장고)"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '14px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>실측:</span>
                <input
                  type="number"
                  step={0.1}
                  value={inputTemp}
                  onChange={e => setInputTemp(Number(e.target.value))}
                  style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '14px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>℃</span>
              </div>
              <button
                onClick={handleAddTemperature}
                style={{
                  padding: '8px 18px',
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                + 즉시 기록
              </button>
            </div>
          </div>

          {/* 온도 기록 목록 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>측정 시간</th>
                <th style={{ padding: '10px' }}>보관 기기명</th>
                <th style={{ padding: '10px' }}>구분</th>
                <th style={{ padding: '10px' }}>기준 온도</th>
                <th style={{ padding: '10px' }}>실측 온도</th>
                <th style={{ padding: '10px' }}>판정 결과</th>
                <th style={{ padding: '10px' }}>기록자</th>
              </tr>
            </thead>
            <tbody>
              {tempRecords.map(rec => (
                <tr key={rec.recordId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>{rec.recordedAt} ({rec.timeSlot === 'morning' ? '오전' : '오후'})</td>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#111827' }}>{rec.unitName}</td>
                  <td style={{ padding: '12px 10px', color: '#4b5563' }}>
                    {rec.unitType === 'refrigerator' ? '냉장' : '냉동'}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>
                    {rec.unitType === 'refrigerator' ? '0℃ ~ 5℃' : '-18℃ 이하'}
                  </td>
                  <td style={{ padding: '12px 10px', fontWeight: 700, color: rec.isAlert ? '#ef4444' : '#111827' }}>
                    {rec.recordedTemp} ℃
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {rec.isAlert ? (
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
                        ⚠️ {rec.alertReason}
                      </span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
                        정상 (적합)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>{rec.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'checklist' ? (
        /* 일일 위생 체크리스트 */
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
              📋 식약처 기준 일일 위생 점검표
            </h3>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              당일 점검 완료율: <strong>{auditSummary.checklistCompletionRate}%</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checklist.map(item => (
              <div
                key={item.id}
                onClick={() => handleToggleCheck(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  borderRadius: '6px',
                  border: item.isChecked ? '1px solid #86efac' : '1px solid #e5e7eb',
                  background: item.isChecked ? '#f0fdf4' : '#f9fafb',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={() => {}} // 부모 div 클릭으로 토글
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: item.isChecked ? '#166534' : '#374151',
                    textDecoration: item.isChecked ? 'none' : 'none',
                  }}>
                    {item.task}
                  </span>
                </div>
                <div>
                  {item.isChecked ? (
                    <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                      ✓ 점검 완료 ({item.inspectorName || '점검자'})
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
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
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
            🪪 조리·서빙 종사자 법정 보건증(건강진단결과서) 유효 현황
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>직원명</th>
                <th style={{ padding: '10px' }}>직무/역할</th>
                <th style={{ padding: '10px' }}>최근 검진일</th>
                <th style={{ padding: '10px' }}>만료 예정일</th>
                <th style={{ padding: '10px' }}>잔여 일수 (D-Day)</th>
                <th style={{ padding: '10px' }}>상태</th>
                <th style={{ padding: '10px' }}>갱신 관리</th>
              </tr>
            </thead>
            <tbody>
              {healthCerts.map(cert => (
                <tr key={cert.certId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#111827' }}>{cert.staffName}</td>
                  <td style={{ padding: '12px 10px', color: '#4b5563' }}>{cert.role}</td>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>{cert.examDate}</td>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>{cert.expiryDate}</td>
                  <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                    {cert.dDay < 0 ? (
                      <span style={{ color: '#dc2626' }}>만료 {Math.abs(cert.dDay)}일 경과</span>
                    ) : (
                      <span style={{ color: cert.dDay <= 14 ? '#d97706' : '#15803d' }}>
                        D-{cert.dDay}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background:
                        cert.status === 'valid'
                          ? '#dcfce7'
                          : cert.status === 'warning'
                          ? '#fef3c7'
                          : '#fee2e2',
                      color:
                        cert.status === 'valid'
                          ? '#166534'
                          : cert.status === 'warning'
                          ? '#92400e'
                          : '#991b1b',
                    }}>
                      {cert.status === 'valid' ? '유효' : cert.status === 'warning' ? '만료 임박 (14일 이내)' : '만료 (과태료 대상)'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <button
                      onClick={() => handleRenewCert(cert.certId)}
                      style={{
                        padding: '4px 10px',
                        background: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      검진 갱신(1년 연장)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
