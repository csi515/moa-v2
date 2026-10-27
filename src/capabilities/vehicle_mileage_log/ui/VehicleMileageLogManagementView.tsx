import React, { useState, useMemo } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  Car,
  Plus,
  Download,
  Printer,
  Calendar,
  Gauge,
  MapPin,
  Fuel,
  Receipt,
  CheckCircle2,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { showToast } from '@/shared/feedback/uiFeedback';
import { generateNtsMileageCsv, downloadCsvFile } from '../domain/vehicleMileageLogExport';
import {
  calculateTripDistance,
  validateMileageLogEntry,
  summarizeVehicleFleet,
  type VehicleMileageLog,
  type TripPurpose,
} from '../domain/vehicleMileageLogEngine';

const INITIAL_LOGS: VehicleMileageLog[] = [
  {
    id: 'mileage-sample-1',
    vehicleId: 'veh-1',
    vehiclePlateNumber: '12가 3456 (업무용 1호기)',
    driverId: 'u-kim',
    driverName: '김수석',
    drivingDate: '2026-04-10',
    departureTime: '09:30',
    arrivalTime: '11:45',
    startOdometerKm: 42150,
    endOdometerKm: 42235,
    distanceKm: 85,
    tripPurpose: 'business',
    departurePlace: '본사 사업장',
    destination: '화성 파일럿 플랜트 현장 점검',
    fuelCost: 45000,
    tollFee: 6200,
    status: 'confirmed',
    createdAt: '2026-04-10T12:00:00Z',
  },
  {
    id: 'mileage-sample-2',
    vehicleId: 'veh-1',
    vehiclePlateNumber: '12가 3456 (업무용 1호기)',
    driverId: 'u-lee',
    driverName: '이선임',
    drivingDate: '2026-04-12',
    departureTime: '13:00',
    arrivalTime: '15:20',
    startOdometerKm: 42235,
    endOdometerKm: 42290,
    distanceKm: 55,
    tripPurpose: 'business',
    departurePlace: '본사 사업장',
    destination: '기술표준원 시험 시편 제출',
    tollFee: 3300,
    status: 'confirmed',
    createdAt: '2026-04-12T16:00:00Z',
  },
  {
    id: 'mileage-sample-3',
    vehicleId: 'veh-2',
    vehiclePlateNumber: '56나 7890 (공용 승합차)',
    driverId: 'u-park',
    driverName: '박책임',
    drivingDate: '2026-04-15',
    departureTime: '08:00',
    arrivalTime: '08:45',
    startOdometerKm: 18400,
    endOdometerKm: 18430,
    distanceKm: 30,
    tripPurpose: 'commute',
    departurePlace: '기숙사',
    destination: '연구단지 본관',
    status: 'confirmed',
    createdAt: '2026-04-15T09:00:00Z',
  },
];

export const VehicleMileageLogManagementView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const activeUser = useActiveUser();

  const [localLogs, setLocalLogs] = useState<VehicleMileageLog[]>(INITIAL_LOGS);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 모달 폼 필드
  const [vehiclePlate, setVehiclePlate] = useState('12가 3456 (업무용 1호기)');
  const [drivingDate, setDrivingDate] = useState('2026-04-24');
  const [departurePlace, setDeparturePlace] = useState('본사');
  const [destination, setDestination] = useState('');
  const [tripPurpose, setTripPurpose] = useState<TripPurpose>('business');
  const [startKm, setStartKm] = useState<number>(42290);
  const [endKm, setEndKm] = useState<number>(42350);
  const [fuelCost, setFuelCost] = useState<number>(0);
  const [tollFee, setTollFee] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Refine 쿼리
  const { query: logsQuery } = useList<any>({
    resource: 'vehicle_mileage_logs',
    meta: { schema: 'core' },
    sorters: [{ field: 'driving_date', order: 'desc' }],
    queryOptions: { enabled: Boolean(orgId) },
  });
  const { mutate: createLogMutation } = useCreate();

  const logs: VehicleMileageLog[] = useMemo(() => {
    const raw = logsQuery?.data?.data;
    if (raw && raw.length > 0) {
      return raw.map((r: any) => ({
        id: r.id,
        vehicleId: r.vehicle_id || 'veh-1',
        vehiclePlateNumber: r.vehicle_plate_number || '업무용 차량',
        driverId: r.driver_id || '',
        driverName: r.driver_name || '운전자',
        drivingDate: r.driving_date,
        departureTime: r.departure_time,
        arrivalTime: r.arrival_time,
        startOdometerKm: Number(r.start_odometer_km || 0),
        endOdometerKm: Number(r.end_odometer_km || 0),
        distanceKm: Number(r.distance_km || 0),
        tripPurpose: (r.trip_purpose || 'business') as TripPurpose,
        departurePlace: r.departure_place || '본사',
        destination: r.destination,
        fuelCost: Number(r.fuel_cost || 0),
        tollFee: Number(r.toll_fee || 0),
        notes: r.notes,
        status: r.status || 'confirmed',
        createdAt: r.created_at || new Date().toISOString(),
      }));
    }
    return localLogs;
  }, [logsQuery?.data?.data, localLogs]);

  // 차량별 통계 집계
  const fleetSummary = useMemo(() => summarizeVehicleFleet(logs), [logs]);
  const totalFleetKm = useMemo(() => {
    return Object.values(fleetSummary).reduce((acc, cur) => acc + cur.totalDistanceKm, 0);
  }, [fleetSummary]);
  const totalFleetFuel = useMemo(() => {
    return Object.values(fleetSummary).reduce((acc, cur) => acc + cur.totalFuelCost, 0);
  }, [fleetSummary]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateMileageLogEntry({
      startOdometerKm: startKm,
      endOdometerKm: endKm,
      destination,
      tripPurpose,
    });

    if (!validation.valid) {
      showToast(validation.error || '입력값을 확인해주세요.', 'error');
      return;
    }

    const distance = calculateTripDistance(startKm, endKm);
    const newEntry: VehicleMileageLog = {
      id: `mileage-${Date.now()}`,
      vehicleId: 'veh-custom',
      vehiclePlateNumber: vehiclePlate,
      driverId: activeUser?.id || 'me',
      driverName: activeUser?.name || '운전자',
      drivingDate,
      startOdometerKm: startKm,
      endOdometerKm: endKm,
      distanceKm: distance,
      tripPurpose,
      departurePlace,
      destination,
      fuelCost: fuelCost > 0 ? fuelCost : undefined,
      tollFee: tollFee > 0 ? tollFee : undefined,
      notes,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    if (orgId) {
      createLogMutation({
        resource: 'vehicle_mileage_logs',
        values: {
          organization_id: orgId,
          vehicle_plate_number: vehiclePlate,
          driver_id: activeUser?.id,
          driver_name: activeUser?.name,
          driving_date: drivingDate,
          start_odometer_km: startKm,
          end_odometer_km: endKm,
          distance_km: distance,
          trip_purpose: tripPurpose,
          departure_place: departurePlace,
          destination,
          fuel_cost: fuelCost,
          toll_fee: tollFee,
          notes,
          status: 'confirmed',
        },
      });
    }

    setLocalLogs((prev) => [newEntry, ...prev]);
    showToast('차량 운행일지가 등록되었습니다.', 'success');
    setShowCreateModal(false);
    setDestination('');
    setNotes('');
  };


  const handleExportNtsCsv = () => {
    const csv = generateNtsMileageCsv(logs, currentOrganization?.name || '사업장', new Date().getFullYear());
    downloadCsvFile(`업무용승용차운행기록부_${currentOrganization?.name || '사업장'}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('국세청 표준 서식(5년 법적 보존용) 운행기록부가 다운로드되었습니다.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 통계 카드 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Car className="h-3.5 w-3.5" />
            <span>국세청 고시 법인차량 손금인정 기준 서식</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            업무용 승용차 운행기록부
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            출발·도착 계기판 누적거리(km), 업무용·출퇴근 구분, 유류비 및 통행료 증빙을 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportNtsCsv}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="국세청 별지 제29호의2 서식 5년 보존용 CSV 내보내기"
          >
            <Download className="h-4 w-4 text-indigo-600" />
            <span>국세청 서식 엑셀/CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="감사 증빙용 인쇄 / PDF 저장"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>법적 인쇄/PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>운행일지 작성</span>
          </button>
        </div>
      </div>

      {/* 차량별 국세청 업무사용비율 대시보드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>총 누적 주행거리</span>
            <Gauge className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {totalFleetKm.toLocaleString()} <span className="text-sm font-semibold text-slate-500">km</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">등록 운행 {logs.length}건 합산</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>법인 업무 사용 비율</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600">
            100 <span className="text-sm font-semibold">%</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">국세청 법인세 손금 산입 100% 충족</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>총 유류비 지출</span>
            <Fuel className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {totalFleetFuel.toLocaleString()} <span className="text-sm font-semibold text-slate-500">원</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">영수증 첨부 및 경비 정산 연계</p>
        </div>
      </div>

      {/* 운행기록부 목록 표 */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">운행 기록 내역 ({logs.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">운행일자</th>
                <th className="py-3 px-4">차량번호</th>
                <th className="py-3 px-4">운전자</th>
                <th className="py-3 px-4">출발지 / 목적지</th>
                <th className="py-3 px-4 text-right">계기판 (출발 → 도착)</th>
                <th className="py-3 px-4 text-right">주행거리</th>
                <th className="py-3 px-4 text-center">구분</th>
                <th className="py-3 px-4 text-right">유류비/통행료</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {row.drivingDate}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {row.vehiclePlateNumber}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {row.driverName}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{row.destination}</div>
                    <div className="text-[11px] text-slate-400">출발: {row.departurePlace}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                    {row.startOdometerKm.toLocaleString()} → {row.endOdometerKm.toLocaleString()} km
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                    +{row.distanceKm} km
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        row.tripPurpose === 'business'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                          : row.tripPurpose === 'commute'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {row.tripPurpose === 'business'
                        ? '일반업무'
                        : row.tripPurpose === 'commute'
                        ? '출퇴근'
                        : '기타'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                    {row.fuelCost || row.tollFee ? (
                      <span>
                        {((row.fuelCost || 0) + (row.tollFee || 0)).toLocaleString()}원
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 작성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">운행기록부 신규 등록</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">차량 선택</label>
                <select
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 font-medium"
                >
                  <option value="12가 3456 (업무용 1호기)">12가 3456 (업무용 1호기)</option>
                  <option value="56나 7890 (공용 승합차)">56나 7890 (공용 승합차)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">운행 일자</label>
                  <input
                    type="date"
                    value={drivingDate}
                    onChange={(e) => setDrivingDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">운행 목적 구분</label>
                  <select
                    value={tripPurpose}
                    onChange={(e) => setTripPurpose(e.target.value as TripPurpose)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                  >
                    <option value="business">일반 업무용 (미팅/납품/점검)</option>
                    <option value="commute">출퇴근용</option>
                    <option value="general">기타 사적용무</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">출발지</label>
                  <input
                    type="text"
                    value={departurePlace}
                    onChange={(e) => setDeparturePlace(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">목적지 (상세)</label>
                  <input
                    type="text"
                    placeholder="예: 화성 협력사 공장"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">출발 계기판 (km)</label>
                  <input
                    type="number"
                    value={startKm}
                    onChange={(e) => setStartKm(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">도착 계기판 (km)</label>
                  <input
                    type="number"
                    value={endKm}
                    onChange={(e) => setEndKm(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 font-mono"
                    required
                  />
                </div>
                <div className="col-span-2 text-right text-xs font-bold text-indigo-700">
                  주행 거리: {endKm >= startKm ? `${endKm - startKm} km` : '계기판 역전 오류'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">주유비 (원, 선택)</label>
                  <input
                    type="number"
                    value={fuelCost || ''}
                    placeholder="0"
                    onChange={(e) => setFuelCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">통행료 (원, 선택)</label>
                  <input
                    type="number"
                    value={tollFee || ''}
                    placeholder="0"
                    onChange={(e) => setTollFee(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  기록 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
