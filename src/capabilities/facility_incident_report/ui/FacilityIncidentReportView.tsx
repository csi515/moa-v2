import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  evaluateIncidentSeverity,
  renderIncidentReportSvg,
  formatIncidentNotificationText,
  type IncidentReportItem,
  type IncidentSeverity,
  type IncidentStatus,
} from '../domain/incidentReportEngine';

export const FacilityIncidentReportView: React.FC = () => {
  const [selectedIncident, setSelectedIncident] = useState<IncidentReportItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 입력 상태
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState('이용객');
  const [description, setDescription] = useState('');
  const [injuryDetails, setInjuryDetails] = useState('');
  const [emergencyAction, setEmergencyAction] = useState('');
  const [hospitalTransported, setHospitalTransported] = useState(false);
  const [severity, setSeverity] = useState<IncidentSeverity>('minor');

  const { query } = useList<IncidentReportItem>({
    resource: 'facility_incident_reports',
    pagination: { pageSize: 20 },
  });

  const { mutate: createReport } = useCreate<IncidentReportItem>();
  const { mutate: updateReport } = useUpdate<IncidentReportItem>();

  const reports = (query?.data?.data as IncidentReportItem[]) || [];

  const handleHospitalChange = (val: boolean) => {
    setHospitalTransported(val);
    const autoSeverity = evaluateIncidentSeverity({ hospitalTransported: val });
    setSeverity(autoSeverity);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !personName.trim() || !location.trim()) return;

    setIsSubmitting(true);
    createReport(
      {
        resource: 'facility_incident_reports',
        values: {
          incident_title: title,
          incident_date: new Date().toISOString(),
          incident_type: 'injury',
          severity,
          location_in_facility: location,
          involved_person_name: personName,
          involved_person_role: personRole,
          description,
          injury_details: injuryDetails,
          emergency_action_taken: emergencyAction,
          hospital_transported: hospitalTransported,
          status: 'open',
          insurance_claimed: false,
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowCreateModal(false);
          setTitle('');
          setLocation('');
          setPersonName('');
          setDescription('');
          setInjuryDetails('');
          setEmergencyAction('');
          setHospitalTransported(false);
          query?.refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleStatusChange = (reportId: string, nextStatus: IncidentStatus) => {
    updateReport(
      {
        resource: 'facility_incident_reports',
        id: reportId,
        values: {
          status: nextStatus,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          query?.refetch();
          if (selectedIncident && selectedIncident.id === reportId) {
            setSelectedIncident({ ...selectedIncident, status: nextStatus });
          }
        },
      }
    );
  };

  const handleCopyNotice = (report: IncidentReportItem) => {
    const text = formatIncidentNotificationText(report);
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>🚨 시설 안전사고 및 파손 경위 대장</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            원내 사고 발생 시 육하원칙 기록, 보호자 신속 안내 및 0원 W3C SVG 배상책임 경위서를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          + 신규 사고 경위서 작성
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedIncident ? '1fr 400px' : '1fr', gap: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>일시 / 장소</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>사고 내용</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>당사자</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>심각도</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>상태</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    등록된 사고 및 파손 경위서가 없습니다.
                  </td>
                </tr>
              ) : (
                reports.map((rep) => (
                  <tr
                    key={rep.id}
                    onClick={() => setSelectedIncident(rep)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedIncident?.id === rep.id ? '#f0fdf4' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600 }}>{rep.incidentDate?.slice(0, 10)}</div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>{rep.locationInFacility}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold' }}>
                      {rep.incidentTitle}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      {rep.involvedPersonName} ({rep.involvedPersonRole})
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
                            rep.severity === 'critical' || rep.severity === 'severe'
                              ? '#dc2626'
                              : rep.severity === 'moderate'
                              ? '#d97706'
                              : '#2563eb',
                        }}
                      >
                        {rep.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          background: rep.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                          color: rep.status === 'resolved' ? '#166534' : '#92400e',
                          fontWeight: 'bold',
                        }}
                      >
                        {rep.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyNotice(rep);
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {copySuccess ? '복사됨!' : '보호자 안내문 복사'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedIncident && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>사고 상세 및 공식 경위서</h2>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{ marginBottom: '16px' }}
              dangerouslySetInnerHTML={{ __html: renderIncidentReportSvg(selectedIncident) }}
            />

            <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              <p><strong>상세 경위:</strong> {selectedIncident.description}</p>
              {selectedIncident.injuryDetails && <p><strong>부상 부위:</strong> {selectedIncident.injuryDetails}</p>}
              {selectedIncident.emergencyActionTaken && <p><strong>응급 조치:</strong> {selectedIncident.emergencyActionTaken}</p>}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                CAPA · 후속 조치
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                사고 후 시정·예방(CAPA)은 작업 파이프라인 등록 및 전자 결재로 연계합니다.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <a
                  href="/workspace/pipelines"
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    textAlign: 'center',
                    padding: '8px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #c7d2fe',
                    background: '#eef2ff',
                    color: '#3730a3',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  작업 파이프라인에서 CAPA 등록
                </a>
                <a
                  href="/workspace/approvals"
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    textAlign: 'center',
                    padding: '8px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  전자 결재로 조치 승인
                </a>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>상태 변경</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleStatusChange(selectedIncident.id, 'investigating')}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                >
                  조사 중
                </button>
                <button
                  onClick={() => handleStatusChange(selectedIncident.id, 'insurance_processing')}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                >
                  보험 접수
                </button>
                <button
                  onClick={() => handleStatusChange(selectedIncident.id, 'resolved')}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '6px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  종결 처리
                </button>
              </div>
            </div>
          </div>
        )}
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
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>🚨 신규 안전사고 및 파손 경위 작성</h2>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>사고명 / 상황 요약 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 트램펄린 착지 중 발목 접질림"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>발생 장소 *</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 2층 키즈존 트램펄린"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>당사자 이름 *</label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="예: 김민준"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>상세 사고 경위 *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="사고 발생 경위를 육하원칙으로 간략히 기술하세요."
                  rows={3}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>현장 응급 조치 내역</label>
                <input
                  type="text"
                  value={emergencyAction}
                  onChange={(e) => setEmergencyAction(e.target.value)}
                  placeholder="예: 아이싱 및 압박 붕대 처치"
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="hospitalTransport"
                  checked={hospitalTransported}
                  onChange={(e) => handleHospitalChange(e.target.checked)}
                />
                <label htmlFor="hospitalTransport" style={{ fontSize: '13px', fontWeight: 'bold', color: '#dc2626' }}>
                  🚑 병원 후송/의료기관 동행 여부 (체크 시 Severe 자동 판정)
                </label>
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
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '저장 중...' : '경위서 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
