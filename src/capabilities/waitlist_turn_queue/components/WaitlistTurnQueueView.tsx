import React, { useState } from 'react';
import {
  Users,
  Clock,
  Volume2,
  Tv,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Baby,
  UtensilsCrossed,
  ArrowRight,
} from 'lucide-react';
import {
  WaitlistEntry,
  WaitlistSeatPreference,
  registerWaitlistEntry,
  callWaitlistEntry,
  seatWaitlistEntry,
  changeWaitlistStatus,
  calculateBoardMetrics,
  estimateWaitTimeMinutes,
} from '../domain/waitlistTurnQueueEngine';

export function WaitlistTurnQueueView() {
  const [viewMode, setViewMode] = useState<'counter' | 'kiosk' | 'did'>('counter');
  const [entries, setEntries] = useState<WaitlistEntry[]>([
    {
      id: 'wait_sample_1',
      ticketNumber: 31,
      customerName: '이서진',
      phoneLastDigits: '8812',
      partySize: 2,
      hasInfant: false,
      seatPreference: 'table',
      status: 'called',
      registeredAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      calledAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: 'wait_sample_2',
      ticketNumber: 32,
      customerName: '박준영',
      phoneLastDigits: '3491',
      partySize: 4,
      hasInfant: true,
      seatPreference: 'room',
      status: 'waiting',
      registeredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'wait_sample_3',
      ticketNumber: 33,
      customerName: '최민지',
      phoneLastDigits: '9021',
      partySize: 1,
      hasInfant: false,
      seatPreference: 'bar',
      status: 'waiting',
      registeredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ]);

  // 입구 키오스크 등록용 상태
  const [kioskName, setKioskName] = useState('');
  const [kioskPhone, setKioskPhone] = useState('');
  const [kioskParty, setKioskParty] = useState(2);
  const [kioskInfant, setKioskInfant] = useState(false);
  const [kioskPref, setKioskPref] = useState<WaitlistSeatPreference>('any');
  const [issuedTicket, setIssuedTicket] = useState<WaitlistEntry | null>(null);

  const metrics = calculateBoardMetrics(entries);

  const handleRegisterKiosk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskPhone) return;
    const { newEntry, updatedEntries } = registerWaitlistEntry(entries, {
      customerName: kioskName || `고객 ${entries.length + 1}`,
      phoneLastDigits: kioskPhone,
      partySize: kioskParty,
      hasInfant: kioskInfant,
      seatPreference: kioskPref,
    });
    setEntries(updatedEntries);
    setIssuedTicket(newEntry);
    setKioskName('');
    setKioskPhone('');
    setKioskParty(2);
    setKioskInfant(false);
    setKioskPref('any');
  };

  const handleCall = (id: string) => {
    setEntries((prev) => callWaitlistEntry(prev, id));
  };

  const handleSeat = (id: string) => {
    setEntries((prev) => seatWaitlistEntry(prev, id));
  };

  const handleCancel = (id: string, status: 'cancelled' | 'no_show') => {
    setEntries((prev) => changeWaitlistStatus(prev, id, status));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 상단 탭 전환 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-600" />
            현장 순번 대기 & 매장 모니터 호출 보드
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            알림톡 발송 없이 입구 터치패드 발권과 매장 TV/모니터 호출을 실시간 연동합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => { setViewMode('counter'); setIssuedTicket(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'counter'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            카운터 호출 관리
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('kiosk'); setIssuedTicket(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'kiosk'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            입구 태블릿 발권
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('did'); setIssuedTicket(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'did'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            매장 TV 전광판
          </button>
        </div>
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">현재 대기 팀수</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {metrics.totalWaitingCount} <span className="text-xs font-semibold text-slate-400">팀</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">예상 대기 시간</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            약 {metrics.estimatedWaitMinutes} <span className="text-xs font-semibold text-slate-400">분</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">호출 중인 번호</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {metrics.currentlyCalledTickets.length > 0 ? (
              metrics.currentlyCalledTickets.map((t) => `${t}번`).join(', ')
            ) : (
              <span className="text-sm font-semibold text-slate-400">대기 없음</span>
            )}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">오늘 입장 완료</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {metrics.seatedTodayCount} <span className="text-xs font-semibold text-slate-400">팀</span>
          </div>
        </div>
      </div>

      {/* 1. 카운터 호출 관리 화면 */}
      {viewMode === 'counter' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">실시간 현장 대기열 목록</h2>
            <span className="text-xs text-slate-400">총 {entries.length}건 등록</span>
          </div>

          <div className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">현재 대기열이 비어 있습니다.</div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    entry.status === 'called'
                      ? 'bg-rose-50/50'
                      : entry.status === 'seated'
                      ? 'bg-slate-50 opacity-60'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                        entry.status === 'called'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : entry.status === 'seated'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {entry.ticketNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm">{entry.customerName}</span>
                        <span className="text-xs font-mono text-slate-400">({entry.phoneLastDigits})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            entry.status === 'called'
                              ? 'bg-rose-100 text-rose-700'
                              : entry.status === 'seated'
                              ? 'bg-emerald-100 text-emerald-700'
                              : entry.status === 'cancelled'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {entry.status === 'called'
                            ? '호출 중'
                            : entry.status === 'seated'
                            ? '착석 완료'
                            : entry.status === 'cancelled'
                            ? '취소됨'
                            : '대기 중'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span>인원: <strong>{entry.partySize}명</strong></span>
                        {entry.hasInfant && (
                          <span className="text-amber-600 flex items-center gap-0.5 font-semibold">
                            <Baby className="w-3.5 h-3.5" /> 유아동반
                          </span>
                        )}
                        <span>
                          희망좌석:{' '}
                          <strong>
                            {entry.seatPreference === 'table'
                              ? '일반 테이블'
                              : entry.seatPreference === 'bar'
                              ? '바(Bar) 좌석'
                              : entry.seatPreference === 'room'
                              ? '프라이빗 룸'
                              : '무관'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.status === 'waiting' && (
                      <button
                        type="button"
                        onClick={() => handleCall(entry.id)}
                        className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-xs flex items-center gap-1.5"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> 입장 호출
                      </button>
                    )}
                    {entry.status === 'called' && (
                      <button
                        type="button"
                        onClick={() => handleSeat(entry.id)}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> 착석 완료
                      </button>
                    )}
                    {entry.status !== 'seated' && entry.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleCancel(entry.id, 'cancelled')}
                        className="px-2.5 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
                        title="취소"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. 입구 태블릿 발권 모드 (키오스크 터치형) */}
      {viewMode === 'kiosk' && (
        <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg">
          {issuedTicket ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800">대기 등록이 완료되었습니다!</h3>
              <div className="bg-indigo-50/70 p-6 rounded-2xl border border-indigo-100">
                <div className="text-xs text-indigo-700 font-bold">고객님의 대기 번호</div>
                <div className="text-5xl font-black text-indigo-600 mt-2">{issuedTicket.ticketNumber}번</div>
                <div className="text-xs text-slate-500 mt-2">
                  예상 대기 시간: 약 {estimateWaitTimeMinutes(entries, issuedTicket.seatPreference)}분
                </div>
              </div>
              <p className="text-xs text-slate-500">
                매장 안쪽 모니터에 번호가 표시되면 카운터로 입장해 주세요.
              </p>
              <button
                type="button"
                onClick={() => setIssuedTicket(null)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 shadow-xs mt-4"
              >
                처음 화면으로 돌아가기
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegisterKiosk} className="space-y-5">
              <div className="text-center pb-2">
                <h3 className="text-lg font-black text-slate-800">현장 대기 등록</h3>
                <p className="text-xs text-slate-500 mt-1">방문 인원과 전화번호 뒷자리를 입력해 주세요.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">방문 인원수</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setKioskParty(num)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        kioskParty === num
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {num}명
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">휴대폰 뒷자리 (4자리)</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="예: 1234"
                  value={kioskPhone}
                  onChange={(e) => setKioskPhone(e.target.value)}
                  className="w-full text-center text-xl font-bold tracking-widest px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">선호 좌석</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['any', 'table', 'bar', 'room'] as const).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setKioskPref(pref)}
                      className={`py-2 rounded-xl text-xs font-semibold border ${
                        kioskPref === pref
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {pref === 'any' ? '상관없음' : pref === 'table' ? '테이블' : pref === 'bar' ? '바' : '룸'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="infantCheck"
                  checked={kioskInfant}
                  onChange={(e) => setKioskInfant(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <label htmlFor="infantCheck" className="text-xs text-slate-700 font-medium">
                  유아 의자 / 유아 동반이 필요합니다.
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-md transition-all mt-4"
              >
                대기 번호표 발권하기
              </button>
            </form>
          )}
        </div>
      )}

      {/* 3. 매장 TV 전광판 (DID) 모드 */}
      {viewMode === 'did' && (
        <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800 text-center">
          <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
            <div className="text-left">
              <span className="text-xs tracking-wider uppercase text-slate-400 font-semibold">WAITLIST BOARD</span>
              <h2 className="text-2xl font-black text-white mt-1">현재 입장 순번 안내</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">대기 중인 팀</div>
              <div className="text-2xl font-black text-amber-400">{metrics.totalWaitingCount}팀</div>
            </div>
          </div>

          <div className="py-8">
            <div className="text-sm font-semibold text-rose-400 uppercase tracking-widest mb-3 animate-pulse">
              NOW CALLING · 지금 입장해 주세요
            </div>
            <div className="text-7xl sm:text-9xl font-black text-white tracking-tight drop-shadow-lg">
              {metrics.lastCalledTicket ? `${metrics.lastCalledTicket}번` : '준비 중'}
            </div>
            {metrics.currentlyCalledTickets.length > 1 && (
              <div className="mt-4 text-slate-400 text-sm">
                호출 중: {metrics.currentlyCalledTickets.map((t) => `${t}번`).join(', ')}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-around text-slate-400 text-xs">
            <div>예상 대기: 약 <strong className="text-white">{metrics.estimatedWaitMinutes}분</strong></div>
            <div>•</div>
            <div>번호가 호명되면 카운터 앞으로 오시기 바랍니다.</div>
          </div>
        </div>
      )}
    </div>
  );
}
