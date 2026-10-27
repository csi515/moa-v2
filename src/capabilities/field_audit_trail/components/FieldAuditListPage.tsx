import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type AuditTrailLog,
  filterLogsByEntity,
  filterLogsByOperator,
} from '../domain/fieldAuditEngine';

export const FieldAuditListPage: React.FC = () => {
  const { query } = useList<AuditTrailLog>({
    resource: 'audit_trails',
  });
  const items = (query?.data?.data as AuditTrailLog[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createLog } = useCreate();

  const [entityName, setEntityName] = useState('passes');
  const [recordId, setRecordId] = useState('pass_202610');
  const [fieldName, setFieldName] = useState('price');
  const [oldValue, setOldValue] = useState('1000000');
  const [newValue, setNewValue] = useState('800000');
  const [operatorName, setOperatorName] = useState('김실장');
  const [changeReason, setChangeReason] = useState('원장 특별 승인 할인');

  const [searchEntity, setSearchEntity] = useState('');
  const [searchOperator, setSearchOperator] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim() || !changeReason.trim()) {
      showToast('변경 필드명과 사유를 입력해주세요.', 'error');
      return;
    }

    createLog(
      {
        resource: 'audit_trails',
        values: {
          entityName,
          recordId,
          fieldName,
          oldValue,
          newValue,
          operatorUserId: `user_${Date.now()}`,
          operatorName,
          changeReason,
          changedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast('데이터 변경 감사 로그가 기록되었습니다.', 'success');
          refetch();
        },
      }
    );
  };

  let filtered = filterLogsByEntity(items, searchEntity);
  filtered = filterLogsByOperator(filtered, searchOperator);

  return (
    <div style={{ padding: 24 }}>
      <h2>필드 단위 데이터 변경 감사 추적 대장</h2>
      <p style={{ color: '#666' }}>
        수강료, 단가, 고객 연락처, 재고 수량 등의 필드값 변경 이력을 변경 전/후 값 및 담당자 사유와 함께 불변 기록합니다.
      </p>

      {/* 필터 바 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 2 }}>대상 엔티티 필터</label>
          <input
            type="text"
            value={searchEntity}
            onChange={(e) => setSearchEntity(e.target.value)}
            placeholder="예: passes, inventory"
            style={{ padding: 6, fontSize: 13 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 2 }}>변경 담당자 필터</label>
          <input
            type="text"
            value={searchOperator}
            onChange={(e) => setSearchOperator(e.target.value)}
            placeholder="예: 김실장"
            style={{ padding: 6, fontSize: 13 }}
          />
        </div>
      </div>

      <form
        onSubmit={handleRegister}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          padding: 16,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>엔티티 / 모듈</label>
          <input
            type="text"
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            placeholder="예: passes, inventory"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>레코드 ID</label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>수정 필드명</label>
          <input
            type="text"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="예: price, discount"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>변경 전 값 (Old)</label>
          <input
            type="text"
            value={oldValue}
            onChange={(e) => setOldValue(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>변경 후 값 (New)</label>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>수정 담당자</label>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>변경 필수 사유 (Reason)</label>
          <input
            type="text"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="예: 원장 구두 지시 할인, 파손으로 인한 폐기 수량 차감"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            감사 로그 등록
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>수정 일시</th>
              <th style={{ padding: 8 }}>대상 엔티티 (ID)</th>
              <th style={{ padding: 8 }}>필드명</th>
              <th style={{ padding: 8 }}>변경 전 (Old) ➔ 변경 후 (New)</th>
              <th style={{ padding: 8 }}>담당자</th>
              <th style={{ padding: 8 }}>변경 사유</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, fontSize: 12, color: '#666' }}>
                  {new Date(log.changedAt).toLocaleString()}
                </td>
                <td style={{ padding: 8 }}>
                  <span style={{ fontWeight: 'bold' }}>{log.entityName}</span>{' '}
                  <span style={{ fontSize: 11, color: '#666' }}>({log.recordId})</span>
                </td>
                <td style={{ padding: 8, fontFamily: 'monospace', color: '#4f46e5' }}>{log.fieldName}</td>
                <td style={{ padding: 8 }}>
                  <span style={{ textDecoration: 'line-through', color: '#991b1b', marginRight: 6 }}>
                    {log.oldValue}
                  </span>
                  ➔ <span style={{ fontWeight: 'bold', color: '#065f46', marginLeft: 6 }}>{log.newValue}</span>
                </td>
                <td style={{ padding: 8 }}>{log.operatorName}</td>
                <td style={{ padding: 8, fontSize: 13 }}>{log.changeReason}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  기록된 감사 추적 로그가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
