import React, { useState, useEffect, useMemo } from "react";
import {
  Ticket,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Phone,
  Sparkles,
  X,
  ChevronRight,
  Filter,
} from "lucide-react";
import { getCoreClient, isSupabaseConfigured } from "@/lib/supabase";
import { useOrganization } from "@/core/organizations/OrganizationProvider";

export interface PassRecord {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer_name?: string;
  customer_phone?: string;
  pass_name: string;
  pass_type: "COUNT_BASED" | "PERIOD_BASED" | "HYBRID";
  total_count: number;
  remaining_count: number;
  status: "ACTIVE" | "EXPIRED" | "EXHAUSTED" | "PAUSED";
  is_active: boolean;
  start_date: string;
  expires_at: string;
  created_at: string;
}

export const PassesListPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [passes, setPasses] = useState<PassRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 신규 발급 모달 상태
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [newPassName, setNewPassName] = useState("10회 수강권");
  const [newPassType, setNewPassType] = useState<"COUNT_BASED" | "PERIOD_BASED" | "HYBRID">("COUNT_BASED");
  const [newTotalCount, setNewTotalCount] = useState(10);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newValidityDays, setNewValidityDays] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchPasses = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured() || !currentOrganization) {
        // 데모 목업
        setPasses([
          {
            id: "pass-demo-1",
            tenant_id: "demo",
            customer_id: "c1",
            customer_name: "김민준",
            customer_phone: "010-1234-5678",
            pass_name: "필라테스 10회권",
            pass_type: "COUNT_BASED",
            total_count: 10,
            remaining_count: 8,
            status: "ACTIVE",
            is_active: true,
            start_date: "2026-10-01",
            expires_at: "2026-12-31",
            created_at: new Date().toISOString(),
          },
          {
            id: "pass-demo-2",
            tenant_id: "demo",
            customer_id: "c2",
            customer_name: "이서연",
            customer_phone: "010-9876-5432",
            pass_name: "골프 레슨 20회권",
            pass_type: "COUNT_BASED",
            total_count: 20,
            remaining_count: 1,
            status: "ACTIVE",
            is_active: true,
            start_date: "2026-08-01",
            expires_at: "2026-11-01",
            created_at: new Date().toISOString(),
          },
          {
            id: "pass-demo-3",
            tenant_id: "demo",
            customer_id: "c3",
            customer_name: "박지호",
            customer_phone: "010-5555-4321",
            pass_name: "스터디카페 30일권",
            pass_type: "PERIOD_BASED",
            total_count: 30,
            remaining_count: 15,
            status: "ACTIVE",
            is_active: true,
            start_date: "2026-10-01",
            expires_at: "2026-10-31",
            created_at: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        return;
      }

      const client = getCoreClient();
      const { data: passesData, error } = await (client as any)
        .from("passes")
        .select(`
          id, tenant_id, customer_id, pass_name, pass_type, total_count,
          remaining_count, status, is_active, start_date, expires_at, created_at,
          customer:customers(name, phone)
        `)
        .eq("tenant_id", currentOrganization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: PassRecord[] = (passesData || []).map((p: any) => ({
        id: p.id,
        tenant_id: p.tenant_id,
        customer_id: p.customer_id,
        customer_name: p.customer?.name || "무명 회원",
        customer_phone: p.customer?.phone || "",
        pass_name: p.pass_name,
        pass_type: p.pass_type,
        total_count: p.total_count,
        remaining_count: p.remaining_count,
        status: p.status,
        is_active: p.is_active,
        start_date: p.start_date,
        expires_at: p.expires_at,
        created_at: p.created_at,
      }));

      setPasses(formatted);
    } catch {
      // 오류 발생 시에도 크래시 방지
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, [currentOrganization]);

  // 원터치 48px 입장 -1 차감 액션
  const handleDeductPass = async (pass: PassRecord) => {
    if (pass.status !== "ACTIVE" || pass.remaining_count <= 0) {
      showToast("차감할 수 없는 이용권입니다.");
      return;
    }

    // 햅틱 진동 피드백
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }

    // Optimistic UI 반영
    const nextCount = Math.max(0, pass.remaining_count - 1);
    const nextStatus = nextCount === 0 && pass.pass_type !== "PERIOD_BASED" ? "EXHAUSTED" : "ACTIVE";

    setPasses((prev) =>
      prev.map((item) =>
        item.id === pass.id ? { ...item, remaining_count: nextCount, status: nextStatus } : item
      )
    );

    try {
      if (isSupabaseConfigured()) {
        const client = getCoreClient();
        const { data, error } = await (client as any).rpc("deduct_pass_atomic", {
          p_pass_id: pass.id,
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      showToast(`[${pass.customer_name || "회원"}] 입장 완료! (잔여 ${nextCount}회)`);
    } catch (err) {
      // 롤백
      setPasses((prev) =>
        prev.map((item) =>
          item.id === pass.id ? { ...item, remaining_count: pass.remaining_count, status: pass.status } : item
        )
      );
      showToast(err instanceof Error ? err.message : "이용권 차감에 실패했습니다.");
    }
  };

  // 신규 발급 제출
  const handleIssuePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      showToast("회원 이름을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDate = new Date().toISOString().split("T")[0];
      const expiry = new Date(Date.now() + newValidityDays * 86400000).toISOString().split("T")[0];

      if (isSupabaseConfigured() && currentOrganization) {
        const client = getCoreClient();

        // 1. 고객 확인 또는 생성
        let customerId: string | null = null;
        const { data: customerData } = await client
          .from("customers")
          .select("id")
          .eq("organization_id", currentOrganization.id)
          .eq("name", newCustomerName.trim())
          .maybeSingle();

        if (customerData) {
          customerId = customerData.id;
        } else {
          const { data: newCust } = await client
            .from("customers")
            .insert({
              organization_id: currentOrganization.id,
              name: newCustomerName.trim(),
              phone: newCustomerPhone.trim(),
              status: "active",
            })
            .select("id")
            .single();
          customerId = newCust?.id || null;
        }

        // 2. 이용권 생성
        await (client as any).from("passes").insert({
          tenant_id: currentOrganization.id,
          customer_id: customerId,
          pass_name: newPassName.trim(),
          pass_type: newPassType,
          total_count: newTotalCount,
          remaining_count: newTotalCount,
          status: "ACTIVE",
          is_active: true,
          start_date: startDate,
          expires_at: expiry,
        });
      }

      showToast("이용권이 정상 발급되었습니다!");
      setIsIssueModalOpen(false);
      fetchPasses();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "발급 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 필터링 및 검색
  const filteredPasses = useMemo(() => {
    return passes.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchName = (p.customer_name || "").toLowerCase().includes(q);
      const matchPass = p.pass_name.toLowerCase().includes(q);
      const matchPhone = (p.customer_phone || "").replace(/-/g, "").includes(q);
      return matchName || matchPass || matchPhone;
    });
  }, [passes, searchQuery, statusFilter]);

  const getStatusBadge = (status: PassRecord["status"]) => {
    switch (status) {
      case "ACTIVE":
        return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">이용 가능</span>;
      case "EXHAUSTED":
        return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">소진됨</span>;
      case "EXPIRED":
        return <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">기간 만료</span>;
      case "PAUSED":
        return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">일시 정지</span>;
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
            <Ticket className="h-6 w-6" />
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">이용권·회원권 관리</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            회원별 잔여 횟수를 실시간으로 확인하고 터치 한 번으로 입장을 처리합니다.
          </p>
        </div>

        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          신규 이용권 발급
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="회원명, 이용권 이름, 전화번호 4자리 검색..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">이용 가능</option>
            <option value="EXHAUSTED">소진됨</option>
            <option value="EXPIRED">기간 만료</option>
            <option value="PAUSED">일시 정지</option>
          </select>
        </div>
      </div>

      {/* Passes List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">이용권 목록을 불러오는 중...</p>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">발급된 이용권이 없습니다</p>
            <p className="mt-1 text-xs text-slate-400">우측 상단 버튼을 눌러 새 이용권을 발급하세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPasses.map((pass) => (
              <div
                key={pass.id}
                className="flex flex-col gap-4 p-4 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left Info */}
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">
                        {pass.customer_name || "회원"}
                      </span>
                      {pass.customer_phone && (
                        <span className="text-xs font-medium text-slate-400">
                          ({pass.customer_phone.slice(-4)})
                        </span>
                      )}
                      {getStatusBadge(pass.status)}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-700">
                      {pass.pass_name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                      <span>만료일: {pass.expires_at}</span>
                      <span>전체 {pass.total_count}회</span>
                    </div>
                  </div>
                </div>

                {/* Right Action: 48px Touch Button */}
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">잔여 횟수</div>
                    <div className="text-xl font-black text-indigo-600">
                      {pass.remaining_count} <span className="text-xs font-normal text-slate-500">/ {pass.total_count}회</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeductPass(pass)}
                    disabled={pass.status !== "ACTIVE" || pass.remaining_count <= 0}
                    className="inline-flex h-12 min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    입장 -1
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 신규 발급 모달 */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">신규 이용권 발급</h3>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIssuePass} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">회원 이름 *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">휴대폰 번호</label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">이용권 명칭 *</label>
                <input
                  type="text"
                  required
                  value={newPassName}
                  onChange={(e) => setNewPassName(e.target.value)}
                  placeholder="예: 필라테스 10회권, 1개월 자유권"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">제공 횟수</label>
                  <input
                    type="number"
                    min="1"
                    value={newTotalCount}
                    onChange={(e) => setNewTotalCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">유효기간 (일)</label>
                  <input
                    type="number"
                    min="1"
                    value={newValidityDays}
                    onChange={(e) => setNewValidityDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? "발급 중..." : "발급 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
