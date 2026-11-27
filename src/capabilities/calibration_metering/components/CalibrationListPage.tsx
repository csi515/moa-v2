import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Gauge, Plus, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';
import {
  evaluateDeviceCalibration,
  validateDeviceInput,
  type CalibrationDeviceRecord,
} from '../domain/calibrationEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StandardDataTable, type StandardColumn } from '@/shared/components/ui/StandardDataTable';
import { Modal } from '@/shared/components/ui/Modal';

export const CalibrationListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('1층 상담실');
  const [lastCalibratedAt, setLastCalibratedAt] = useState('2026-04-01');
  const [cycleMonths, setCycleMonths] = useState(12);
  const [measuredError, setMeasuredError] = useState(0.5);
  const [maxTolerance, setMaxTolerance] = useState(2.0);
  const [certNumber, setCertNumber] = useState('');

  const { query } = useList<CalibrationDeviceRecord>({
    resource: 'calibration_devices',
    sorters: [{ field: 'next_calibration_due', order: 'asc' }],
    pagination: { pageSize: 20 },
  });

  const devices = (query?.data?.data as CalibrationDeviceRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createDevice } = useCreate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateDeviceInput(deviceName, serialNumber);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    const evalRes = evaluateDeviceCalibration(
      lastCalibratedAt,
      cycleMonths,
      measuredError,
      maxTolerance,
      new Date()
    );

    createDevice(
      {
        resource: 'calibration_devices',
        values: {
          device_name: deviceName.trim(),
          serial_number: serialNumber.trim(),
          location: location.trim(),
          last_calibrated_at: lastCalibratedAt,
          next_calibration_due: evalRes.nextDue,
          measured_error_percent: measuredError,
          tolerance_max_percent: maxTolerance,
          certificate_number: certNumber.trim() || undefined,
          status: evalRes.status,
          calibrated_by: '한국산업기술시험원',
        },
      },
      {
        onSuccess: () => {
          showToast(`[${deviceName}] 계측기 교정 대장 등록 완료`, 'success');
          setIsModalOpen(false);
          setDeviceName('');
          setSerialNumber('');
          setCertNumber('');
          refetch();
        },
        onError: (err) => {
          showToast.error(err, '장비 등록 실패');
        },
      }
    );
  };

  const columns: StandardColumn<CalibrationDeviceRecord>[] = [
    {
      key: 'device_name',
      header: '장비명',
      render: (d) => <span className="font-semibold text-emerald-700 dark:text-emerald-400">{d.device_name}</span>,
    },
    {
      key: 'serial_number',
      header: '제조번호(S/N)',
      render: (d) => <span className="font-mono text-xs text-slate-500">{d.serial_number}</span>,
    },
    {
      key: 'location',
      header: '설치 위치',
      render: (d) => <span className="text-slate-600 dark:text-slate-300">{d.location}</span>,
    },
    {
      key: 'measured_error_percent',
      header: '오차율 / 허용한도',
      align: 'center',
      render: (d) => (
        <span className="font-mono">
          <span className="font-bold text-slate-700 dark:text-slate-200">{d.measured_error_percent}%</span>
          <span className="text-xs text-slate-400"> (한도: ±{d.tolerance_max_percent}%)</span>
        </span>
      ),
    },
    {
      key: 'last_calibrated_at',
      header: '최근 교정일',
      render: (d) => <span className="text-xs font-mono text-slate-400">{d.last_calibrated_at}</span>,
    },
    {
      key: 'next_calibration_due',
      header: '차기 교정 만료일',
      render: (d) => <span className="font-semibold font-mono text-slate-800 dark:text-slate-100">{d.next_calibration_due}</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (d) => (
        <>
          {d.status === 'CALIBRATED_VALID' && (
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">교정 유효</span>
          )}
          {d.status === 'WARNING_EXPIRING_SOON' && (
            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-bold animate-pulse">만료 임박</span>
          )}
          {d.status === 'EXPIRED_OVERDUE' && (
            <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-bold">기한 경과</span>
          )}
          {d.status === 'OUT_OF_TOLERANCE' && (
            <span className="px-2 py-0.5 rounded text-xs bg-red-200 text-red-900 font-bold">오차 불합격</span>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Gauge className="w-7 h-7 text-emerald-600" />
            정밀 계측기·의료장비 정기 검교정 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            체성분분석기, 정밀 저울, 레이저 기기의 허용 오차 검증 및 정기 교정 유효 기한을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 계측 장비 등록
        </button>
      </div>

      <StandardDataTable
        data={devices}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="등록된 정밀 계측기가 없습니다"
        emptyDescription="새로운 계측기 및 교정 주기 정보를 등록하여 관리하세요."
        keyExtractor={(d) => d.id}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="신규 정밀 계측기 교정 대장 등록"
        maxWidth="md"
      >
        <div className="p-1">
          <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">장비명 *</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="예: 인바디 770 체성분분석기"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">제조번호 (S/N) *</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="예: IB-88120"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">설치 위치</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">최근 교정일 *</label>
                  <input
                    type="date"
                    value={lastCalibratedAt}
                    onChange={(e) => setLastCalibratedAt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">교정 주기 (개월)</label>
                  <input
                    type="number"
                    value={cycleMonths}
                    onChange={(e) => setCycleMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">실측 오차율 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measuredError}
                    onChange={(e) => setMeasuredError(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">허용 최대오차 (±%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={maxTolerance}
                    onChange={(e) => setMaxTolerance(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">교정성적서 번호 (선택)</label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="예: KTL-2026-CAL-1044"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                />
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  장비 등록
                </button>
              </div>
            </form>
        </div>
      </Modal>
    </div>
  );
};
