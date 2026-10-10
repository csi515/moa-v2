import React, { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Unlock,
  Plus,
  User,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Filter,
  Sparkles,
} from "lucide-react";
import { getCoreClient, isSupabaseConfigured } from "@/lib/supabase";
import { useOrganization } from "@/core/organizations/OrganizationProvider";

export type LockerStatus = "AVAILABLE" | "OCCUPIED" | "EXPIRING_SOON" | "OVERDUE";

export interface LockerRecord {
  id: string;
  tenant_id: string;
  locker_number: string;
  section: string;
  status: string;
  assigned_customer_id: string | null;
  assigned_customer_name?: string;
  assigned_customer_phone?: string;
  deposit_amount: number | null;
  monthly_fee: number | null;
  start_date: string | null;
  expires_at: string | null;
  created_at: string;
}

export const LockersGridPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [lockers, setLockers] = useState<LockerRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 모달 상태: 배정 모달
  const [assignTargetLocker, setAssignTargetLocker] = useState<LockerRecord | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [assignDurationDays, setAssignDurationDays] = useState(30);
  const [depositAmount, setDepositAmount] = useState(10000);
  const [monthlyFee, setMonthlyFee] = useState(10000);
  const [isAssigning, setIsAssigning] = useState(false);

  // 모달 상태: 점유 관리 모달 (연장/반납)
  const [manageTargetLocker, setManageTargetLocker] = useState<LockerRecord | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [isManaging, setIsManaging] = useState(false);

  // 신규 사물함 추가 모달
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLockerNumber, setNewLockerNumber] = useState("");
  const [newSection, setNewSection] = useState("공용");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchLockers = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured() || !currentOrganization) {
        // 데모 목업
        const today = new Date();
        const dateAdd = (days: number) => {
          const d = new Date(today);
          d.setDate(d.getDate() + days);
          return d.toISOString().split("T")[0];
        };

        setLockers([
          {
            id: "l-1",
            tenant_id: "demo",
            locker_number: "101",
            section: "공용",
            status: "AVAILABLE",
            assigned_customer_id: null,
            deposit_amount: 10000,
            monthly_fee: 10000,
            start_date: null,
            expires_at: null,
            created_at: new Date().toISOString(),
          },
          {
            id: "l-2",
            tenant_id: "demo",
            locker_number: "102",
            section: "공용",
            status: "OCCUPIED",
            assigned_customer_id: "c-1",
            assigned_customer_name: "이민준",
            assigned_customer_phone: "010-1234-5678",
            deposit_amount: 10000,
            monthly_fee: 10000,
            start_date: dateAdd(-15),
            expires_at: dateAdd(15),
            created_at: new Date().toISOString(),
          },
          {
            id: "l-3",
            tenant_id: "demo",
            locker_number: "103",
            section: "공용",
            status: "EXPIRING_SOON",
            assigned_customer_id: "c-2",
            assigned_customer_name: "박서연",
            assigned_customer_phone: "010-4444-5555",
            deposit_amount: 10000,
            monthly_fee: 10000,
            start_date: dateAdd(-27),
            expires_at: dateAdd(3),
            created_at: new Date().toISOString(),
          },
          {
            id: "l-4",
            tenant_id: "demo",
            locker_number: "104",
            section: "공용",
            status: "OVERDUE",
            assigned_customer_id: "c-3",
            assigned_customer_name: "정우진",
            assigned_customer_phone: "010-8888-9999",
            deposit_amount: 10000,
            monthly_fee: 10000,
            start_date: dateAdd(-35),
            expires_at: dateAdd(-5),
            created_at: new Date().toISOString(),
          },
          {
            id: "l-5",
            tenant_id: "demo",
            locker_number: "201",
            section: "VIP 룸",
            status: "AVAILABLE",
            assigned_customer_id: null,
            deposit_amount: 20000,
            monthly_fee: 30000,
            start_date: null,
            expires_at: null,
            created_at: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        return;
      }

      const client = getCoreClient();
      const { data, error } = await (client as any)
        .from("lockers")
        .select(`
          id, tenant_id, locker_number, section, status, assigned_customer_id,
          deposit_amount, monthly_fee, start_date, expires_at, created_at,
          customer:customers(name, phone)
        `)
        .eq("tenant_id", currentOrganization.id)
        .order("locker_number", { ascending: true });

      if (error) throw error;

      const formatted: LockerRecord[] = (data || []).map((l: any) => ({
        id: l.id,
        tenant_id: l.tenant_id,
        locker_number: l.locker_number,
        section: l.section || "공용",
        status: l.status,
        assigned_customer_id: l.assigned_customer_id,
        assigned_customer_name: l.customer?.name,
        assigned_customer_phone: l.customer?.phone,
        deposit_amount: l.deposit_amount,
        monthly_fee: l.monthly_fee,
        start_date: l.start_date,
        expires_at: l.expires_at,
        created_at: l.created_at,
      }));

      setLockers(formatted);
    } catch {
      // 오류 시 안전 폴백
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockers();
  }, [currentOrganization]);

  // 계산된 실시간 사물함 상태 판별
  const resolveLockerStatus = (locker: LockerRecord): LockerStatus => {
    if (!locker.assigned_customer_id && locker.status === "AVAILABLE") {
      return "AVAILABLE";
    }

    if (!locker.expires_at) {
      return "OCCUPIED";
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (locker.expires_at < todayStr) {
      return "OVERDUE";
    }

    const todayMs = new Date(todayStr).getTime();
    const expiryMs = new Date(locker.expires_at).getTime();
    const diffDays = Math.ceil((expiryMs - todayMs) / 86400000);

    if (diffDays <= 7) {
      return "EXPIRING_SOON";
    }

    return "OCCUPIED";
  };

  // 섹션 목록
  const sections = useMemo(() => {
    const set = new Set(lockers.map((l) => l.section));
    return ["ALL", ...Array.from(set)];
  }, [lockers]);

  // 필터링된 사물함
  const filteredLockers = useMemo(() => {
    if (selectedSection === "ALL") return lockers;
    return lockers.filter((l) => l.section === selectedSection);
  }, [lockers, selectedSection]);

  // 회원 배정 제출
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetLocker || !customerName.trim()) return;

    setIsAssigning(true);
    try {
      const startDate = new Date().toISOString().split("T")[0];
      const expiry = new Date(Date.now() + assignDurationDays * 86400000).toISOString().split("T")[0];

      if (isSupabaseConfigured() && currentOrganization) {
        const client = getCoreClient();

        // 1. 고객 조회/생성
        let custId: string | null = null;
        const { data: custData } = await client
          .from("customers")
          .select("id")
          .eq("organization_id", currentOrganization.id)
          .eq("name", customerName.trim())
          .maybeSingle();

        if (custData) {
          custId = custData.id;
        } else {
          const { data: newCust } = await client
            .from("customers")
            .insert({
              organization_id: currentOrganization.id,
              name: customerName.trim(),
              phone: customerPhone.trim(),
              status: "active",
            })
            .select("id")
            .single();
          custId = newCust?.id || null;
        }

        // 2. 락커 업데이트
        await client
          .from("lockers")
          .update({
            status: "OCCUPIED",
            assigned_customer_id: custId,
            deposit_amount: depositAmount,
            monthly_fee: monthlyFee,
            start_date: startDate,
            expires_at: expiry,
            updated_at: new Date().toISOString(),
          })
          .eq("id", assignTargetLocker.id);
      }

      showToast(`사물함 ${assignTargetLocker.locker_number}번이 ${customerName} 회원에게 배정되었습니다.`);
      setAssignTargetLocker(null);
      fetchLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "배정 실패");
    } finally {
      setIsAssigning(false);
    }
  };

  // 기간 연장 처리
  const handleExtend = async () => {
    if (!manageTargetLocker) return;

    setIsManaging(true);
    try {
      const currentExpiry = manageTargetLocker.expires_at || new Date().toISOString().split("T")[0];
      const baseMs = Math.max(Date.now(), new Date(currentExpiry).getTime());
      const newExpiry = new Date(baseMs + extendDays * 86400000).toISOString().split("T")[0];

      if (isSupabaseConfigured()) {
        const client = getCoreClient();
        await client
          .from("lockers")
          .update({
            expires_at: newExpiry,
            status: "OCCUPIED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", manageTargetLocker.id);
      }

      showToast(`사물함 ${manageTargetLocker.locker_number}번이 ${extendDays}일 연장되었습니다.`);
      setManageTargetLocker(null);
      fetchLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "연장 실패");
    } finally {
      setIsManaging(false);
    }
  };

  // 반납 처리
  const handleRelease = async () => {
    if (!manageTargetLocker) return;

    setIsManaging(true);
    try {
      if (isSupabaseConfigured()) {
        const client = getCoreClient();
        await client
          .from("lockers")
          .update({
            status: "AVAILABLE",
            assigned_customer_id: null,
            start_date: null,
            expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", manageTargetLocker.id);
      }

      showToast(`사물함 ${manageTargetLocker.locker_number}번이 정상 반납되었습니다.`);
      setManageTargetLocker(null);
      fetchLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "반납 실패");
    } finally {
      setIsManaging(false);
    }
  };

  // 신규 사물함 등록
  const handleAddLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLockerNumber.trim()) return;

    try {
      if (isSupabaseConfigured() && currentOrganization) {
        const client = getCoreClient();
        await client.from("lockers").insert({
          tenant_id: currentOrganization.id,
          locker_number: newLockerNumber.trim(),
          section: newSection.trim() || "공용",
          status: "AVAILABLE",
        });
      }

      showToast(`사물함 ${newLockerNumber}번이 추가되었습니다.`);
      setIsAddModalOpen(false);
      setNewLockerNumber("");
      fetchLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "등록 실패");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <Lock className="h-6 w-6" />
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">사물함·락커 그리드</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            타일을 탭하여 빈 사물함에 회원을 즉시 배정하거나 이용 기간을 연장/반납합니다.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          사물함 등록
        </button>
      </div>

      {/* Status Legend & Section Filter */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Status Badges Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            빈 사물함
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            사용 중
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            만료 임박 (7일 내)
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 font-bold text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            기간 초과
          </span>
        </div>

        {/* Section Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "ALL" ? "전체 구역" : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Tiles */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-2 text-xs text-slate-500">사물함 목록을 불러오는 중...</p>
        </div>
      ) : filteredLockers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Lock className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">등록된 사물함이 없습니다</p>
          <p className="mt-1 text-xs text-slate-400">우측 상단 버튼을 눌러 첫 사물함을 등록하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredLockers.map((locker) => {
            const status = resolveLockerStatus(locker);

            let cardClass = "border-slate-300 bg-slate-100 hover:border-slate-400";
            let statusText = "비어 있음";
            let badgeClass = "text-slate-600 bg-white/80";

            if (status === "OCCUPIED") {
              cardClass = "border-emerald-300 bg-emerald-50 hover:border-emerald-400";
              statusText = "사용 중";
              badgeClass = "text-emerald-700 bg-emerald-100";
            } else if (status === "EXPIRING_SOON") {
              cardClass = "border-amber-300 bg-amber-50 hover:border-amber-400";
              statusText = "만료 임박";
              badgeClass = "text-amber-700 bg-amber-100";
            } else if (status === "OVERDUE") {
              cardClass = "border-rose-300 bg-rose-50 hover:border-rose-400";
              statusText = "기간 초과";
              badgeClass = "text-rose-700 bg-rose-100";
            }

            return (
              <div
                key={locker.id}
                onClick={() => {
                  if (status === "AVAILABLE") {
                    setAssignTargetLocker(locker);
                    setCustomerName("");
                    setCustomerPhone("");
                  } else {
                    setManageTargetLocker(locker);
                  }
                }}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 shadow-sm transition active:scale-[0.98] ${cardClass}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{locker.section}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="mt-2 text-2xl font-black text-slate-900">
                    #{locker.locker_number}
                  </div>
                </div>

                <div className="mt-4 border-t border-black/5 pt-2 text-xs">
                  {status === "AVAILABLE" ? (
                    <div className="flex items-center gap-1 font-medium text-slate-500">
                      <Unlock className="h-3.5 w-3.5" />
                      탭하여 회원 배정
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-slate-800">
                        {locker.assigned_customer_name || "회원"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ~{locker.expires_at || "기간 없음"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 회원 배정 모달 */}
      {assignTargetLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                사물함 #{assignTargetLocker.locker_number} 회원 배정
              </h3>
              <button
                onClick={() => setAssignTargetLocker(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">회원 이름 *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">휴대폰 번호</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">이용 기간 (일)</label>
                  <input
                    type="number"
                    min="1"
                    value={assignDurationDays}
                    onChange={(e) => setAssignDurationDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">보증금 (원)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAssignTargetLocker(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAssigning ? "배정 중..." : "배정 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 점유 관리 모달 (연장/반납) */}
      {manageTargetLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  사물함 #{manageTargetLocker.locker_number} 관리
                </h3>
                <p className="text-xs text-slate-500">
                  배정 회원: {manageTargetLocker.assigned_customer_name || "회원"} (~{manageTargetLocker.expires_at})
                </p>
              </div>
              <button
                onClick={() => setManageTargetLocker(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* 기간 연장 */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-2 font-bold text-indigo-900 text-xs">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  기간 연장
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
                  >
                    <option value={7}>7일 연장</option>
                    <option value={15}>15일 연장</option>
                    <option value={30}>30일 연장</option>
                    <option value={60}>60일 연장</option>
                    <option value={90}>90일 연장</option>
                  </select>
                  <button
                    onClick={handleExtend}
                    disabled={isManaging}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    연장 적용
                  </button>
                </div>
              </div>

              {/* 반납 처리 */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                <div className="flex items-center gap-2 font-bold text-rose-900 text-xs">
                  <RotateCcw className="h-4 w-4 text-rose-600" />
                  사물함 반납 및 비우기
                </div>
                <p className="mt-1 text-[11px] text-rose-700">
                  보증금 정산 완료 후 사물함을 즉시 비어있는 상태로 전환합니다.
                </p>
                <button
                  onClick={handleRelease}
                  disabled={isManaging}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  반납 확인 및 비우기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 신규 사물함 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">새 사물함 등록</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddLocker} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">사물함 번호 *</label>
                <input
                  type="text"
                  required
                  value={newLockerNumber}
                  onChange={(e) => setNewLockerNumber(e.target.value)}
                  placeholder="예: 105, A-1"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">구역(Section)</label>
                <input
                  type="text"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  placeholder="예: 공용, 남성, 여성, VIP"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700"
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
