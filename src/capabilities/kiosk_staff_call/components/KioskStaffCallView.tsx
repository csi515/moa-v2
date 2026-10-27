import React, { useState } from 'react';
import {
  BellRing,
  VolumeX,
  Thermometer,
  Wrench,
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Clock,
  Tablet,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  StaffCallRequest,
  StaffCallRequestType,
  createStaffCallRequest,
  updateStaffCallStatus,
  calculateStaffCallMetrics,
  CALL_TYPE_LABELS,
} from '../domain/kioskStaffCallEngine';

export function KioskStaffCallView() {
  const [viewMode, setViewMode] = useState<'board' | 'pad'>('board');
  const [requests, setRequests] = useState<StaffCallRequest[]>([
    {
      id: 'call_sample_1',
      roomOrSeatNumber: '룸 3번',
      requestType: 'temperature',
      message: '에어컨 온도 좀 낮춰주세요 (덥습니다)',
      isSilent: false,
      status: 'pending',
      createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    },
    {
      id: 'call_sample_2',
      roomOrSeatNumber: '자유석 18번',
      requestType: 'silent_report',
      message: '옆자리 연속적인 볼펜 딸깍거림 소음 신고',
      isSilent: true,
      status: 'pending',
      createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    },
    {
      id: 'call_sample_3',
      roomOrSeatNumber: '스크린 2번 타석',
      requestType: 'equipment_issue',
      message: '스윙 모션 카메라 센서 인식 오류',
      isSilent: false,
      status: 'in_progress',
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      resolvedByStaffName: '이프로',
    },
    {
      id: 'call_sample_4',
      roomOrSeatNumber: '테이블 5번',
      requestType: 'water_dishes',
      message: '물티슈 및 추가 식기 요청',
      isSilent: false,
      status: 'resolved',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      resolvedByStaffName: '박매니저',
    },
  ]);

  // 좌석/룸 패드 입력 상태
  const [mySeat, setMySeat] = useState('룸 3번');
  const [callSuccessMsg, setCallSuccessMsg] = useState('');

  const metrics = calculateStaffCallMetrics(requests);

  const handleSendCall = (type: StaffCallRequestType, customMsg?: string) => {
    const newReq = createStaffCallRequest({
      roomOrSeatNumber: mySeat,
      requestType: type,
      customMessage: customMsg,
    });
    setRequests((prev) => [newReq, ...prev]);
    setCallSuccessMsg(`${CALL_TYPE_LABELS[type]} 요청이 직원 화면으로 전송되었습니다.`);
    setTimeout(() => setCallSuccessMsg(''), 3000);
  };

  const handleStatusChange = (id: string, status: 'in_progress' | 'resolved') => {
    setRequests((prev) => updateStaffCallStatus(prev, id, status, '카운터 근무자'));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 상단 헤더 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-indigo-600" />
            좌석/룸 스마트 직원 호출 & 디지털 벨보드
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            유선 호출벨 공사비 없이 좌석 태블릿 원터치 호출과 무음 민원을 카운터로 즉각 접수합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'board'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            카운터 벨보드 화면
          </button>
          <button
            type="button"
            onClick={() => setViewMode('pad')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'pad'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            좌석/룸 고객 터치패드
          </button>
        </div>
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">대기 중인 호출</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {metrics.totalPendingCount} <span className="text-xs font-semibold text-slate-400">건</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">즉각 응대 필요</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">정숙 무음 민원</div>
          <div className="text-2xl font-black text-violet-600 mt-1">
            {metrics.silentReportCount} <span className="text-xs font-semibold text-slate-400">건</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">조용한 확인 요망</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">처리 진행 중</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {metrics.inProgressCount} <span className="text-xs font-semibold text-slate-400">건</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">직원 이동 중</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">오늘 완료된 호출</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {metrics.resolvedTodayCount} <span className="text-xs font-semibold text-slate-400">건</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">처리 완료 누적</div>
        </div>
      </div>

      {/* 1. 카운터 벨보드 화면 */}
      {viewMode === 'board' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">실시간 좌석/룸 호출 대기열</h2>
            <span className="text-xs text-slate-400">총 {requests.length}건</span>
          </div>

          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  req.status === 'pending'
                    ? req.isSilent
                      ? 'bg-violet-50/60 border-l-4 border-violet-500'
                      : 'bg-rose-50/60 border-l-4 border-rose-500 animate-pulse'
                    : req.status === 'in_progress'
                    ? 'bg-amber-50/40 border-l-4 border-amber-500'
                    : 'bg-slate-50/30 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-3 rounded-2xl ${
                      req.isSilent
                        ? 'bg-violet-100 text-violet-700'
                        : req.requestType === 'temperature'
                        ? 'bg-blue-100 text-blue-700'
                        : req.requestType === 'equipment_issue'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {req.isSilent ? (
                      <VolumeX className="w-5 h-5" />
                    ) : req.requestType === 'temperature' ? (
                      <Thermometer className="w-5 h-5" />
                    ) : req.requestType === 'equipment_issue' ? (
                      <Wrench className="w-5 h-5" />
                    ) : (
                      <BellRing className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 text-base">{req.roomOrSeatNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          req.isSilent
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {CALL_TYPE_LABELS[req.requestType]}
                      </span>
                      {req.isSilent && (
                        <span className="text-[11px] font-bold text-violet-600 flex items-center gap-1">
                          <VolumeX className="w-3.5 h-3.5" /> 무음 접수
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-semibold mt-1">{req.message}</p>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>접수: {req.createdAt.slice(11, 16)}</span>
                      {req.resolvedByStaffName && (
                        <span>· 담당: <strong>{req.resolvedByStaffName}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(req.id, 'in_progress')}
                      className="px-3.5 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 shadow-xs"
                    >
                      접수 이동
                    </button>
                  )}
                  {req.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(req.id, 'resolved')}
                      className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> 완료 처리
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. 고객 좌석/룸 원터치 터치패드 모드 */}
      {viewMode === 'pad' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center border-b border-slate-100 pb-4">
            <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">SMART CALL PAD</span>
            <h2 className="text-xl font-black text-slate-800 mt-0.5">직원 호출 서비스</h2>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs text-slate-500 font-medium">현재 위치:</span>
              <select
                value={mySeat}
                onChange={(e) => setMySeat(e.target.value)}
                className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 border-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="룸 1번">룸 1번</option>
                <option value="룸 2번">룸 2번</option>
                <option value="룸 3번">룸 3번</option>
                <option value="타석 7번">타석 7번</option>
                <option value="자유석 18번">자유석 18번</option>
                <option value="테이블 5번">테이블 5번</option>
              </select>
            </div>
          </div>

          {callSuccessMsg && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{callSuccessMsg}</span>
            </div>
          )}

          {/* 원터치 요청 버튼 그리드 */}
          <div className="grid grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => handleSendCall('temperature', '에어컨/난방 온도를 조절해 주세요')}
              className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 text-left transition-all space-y-2 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-extrabold text-slate-800">온도 조절 요청</strong>
                <span className="text-[11px] text-slate-500">실내 냉난방 온도 조절</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSendCall('water_dishes', '추가 물/식기/냅킨을 가져다 주세요')}
              className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 text-left transition-all space-y-2 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-extrabold text-slate-800">물 / 비품 추가</strong>
                <span className="text-[11px] text-slate-500">식기, 냅킨, 물품 요청</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSendCall('equipment_issue', '기기/센서가 작동하지 않습니다')}
              className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 text-left transition-all space-y-2 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-extrabold text-slate-800">장비 / 기기 오류</strong>
                <span className="text-[11px] text-slate-500">스크린 센서/PC 점검</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSendCall('cleaning', '좌석/룸 청소 및 정리가 필요합니다')}
              className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 text-left transition-all space-y-2 group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-extrabold text-slate-800">청소 / 정리 요청</strong>
                <span className="text-[11px] text-slate-500">테이블/바닥 청소</span>
              </div>
            </button>
          </div>

          {/* 스터디카페 무음 소음 민원 전용 버튼 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleSendCall('silent_report', '주변 소음/정숙 유지 민원 접수')}
              className="w-full p-4 rounded-2xl border-2 border-violet-200 bg-violet-50/50 hover:bg-violet-100/50 text-left transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                  <VolumeX className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block text-sm font-extrabold text-violet-950">정숙 구역 무음 소음 신고</strong>
                  <span className="text-[11px] text-violet-600">소리 없이 직원 화면으로만 조용히 전달됩니다.</span>
                </div>
              </div>
              <span className="text-xs font-bold text-violet-700 px-3 py-1 bg-white rounded-xl shadow-2xs">신고하기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
