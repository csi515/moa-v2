import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  QrCode,
  Share2,
  Copy,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Shield,
} from "lucide-react";
import { supabase, getCoreClient, isSupabaseConfigured } from "@/lib/supabase";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { shareLink } from "@/core/utils/shareLink";
import type { TenantRoleRecord } from "@/pages/settings/RolesPage";

export interface StaffInviteQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: TenantRoleRecord[];
}

export const StaffInviteQrModal: React.FC<StaffInviteQrModalProps> = ({
  isOpen,
  onClose,
  roles,
}) => {
  const { currentOrganization } = useOrganization();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [tokenRecord, setTokenRecord] = useState<{
    id: string;
    claim_token: string;
    expires_at: string;
  } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300); // 5분
  const [isUsed, setIsUsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 모달 오픈 시 기본 선택
  useEffect(() => {
    if (isOpen) {
      if (roles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(roles[0].id);
      }
    } else {
      // 모달 닫힐 때 리셋
      setTokenRecord(null);
      setIsUsed(false);
      setErrorMsg(null);
      setToastMsg(null);
      setRemainingSeconds(300);
    }
  }, [isOpen, roles]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1회용 초대 QR 생성
  const handleGenerateInvite = async () => {
    if (!currentOrganization?.id) {
      setErrorMsg("사업장 정보가 확인되지 않습니다.");
      return;
    }
    if (!selectedRoleId) {
      setErrorMsg("부여할 직급(역할)을 선택해주세요.");
      return;
    }

    const targetRole = roles.find((r) => r.id === selectedRoleId);
    if (!targetRole) {
      setErrorMsg("유효한 직급을 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const rawToken =
        "STF-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { data, error } = await getCoreClient()
        .from("onboarding_tokens")
        .insert({
          tenant_id: currentOrganization.id,
          issuer_type: "STORE_STAFF_INVITE",
          claim_token: rawToken,
          payload: {
            role_id: targetRole.id,
            role_name: targetRole.name,
            organization_name: currentOrganization.name,
          } as any,
          expires_at: expiresAt,
          is_used: false,
        })
        .select("id, claim_token, expires_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setTokenRecord(data);
      setRemainingSeconds(300);
      setIsUsed(false);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "초대 QR 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // 5분 카운트다운 타이머
  useEffect(() => {
    if (!tokenRecord || isUsed || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenRecord, isUsed, remainingSeconds]);

  // Supabase Realtime 리스너 (직원 수락 시 is_used 감지)
  useEffect(() => {
    if (!tokenRecord || isUsed || !supabase) return;

    const channel = supabase
      .channel(`staff-invite-${tokenRecord.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "core",
          table: "onboarding_tokens",
          filter: `id=eq.${tokenRecord.id}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.is_used) {
            setIsUsed(true);
            showToast("직원 초대가 완료되었습니다!");
            setTimeout(() => {
              onClose();
            }, 2500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenRecord, isUsed, onClose]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = tokenRecord
    ? `${origin}/invite/staff/${tokenRecord.claim_token}`
    : "";

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleShareOrCopy = async () => {
    if (!inviteUrl) return;
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    const result = await shareLink({
      title: `[${currentOrganization?.name || "매장"}] 직원 초대`,
      text: `${currentOrganization?.name || "매장"}의 ${selectedRole?.name || "직원"}으로 초대합니다. 링크를 열어 바로 합류하세요.`,
      url: inviteUrl,
      onFeedback: (msg) => showToast(msg),
    });
    if (result.shared && result.method === "clipboard") {
      showToast("초대 링크가 클립보드에 복사되었습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">현장 직원 초대 QR</h2>
              <p className="text-xs text-slate-500">
                {currentOrganization?.name || "매장"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 피드백 토스트 */}
        {toastMsg && (
          <div className="mx-6 mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl text-center shadow-lg animate-fade-in">
            {toastMsg}
          </div>
        )}

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-5">
          {/* 직급 선택 영역 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              부여할 직급 선택
            </label>
            {roles.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                등록된 커스텀 직급이 없습니다. 먼저 직급을 생성해주세요.
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedRoleId}
                  onChange={(e) => {
                    setSelectedRoleId(e.target.value);
                    setTokenRecord(null); // 직급 변경 시 QR 재발급 유도
                  }}
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (권한 {r.permissions?.length || 0}개)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  직원이 QR을 스캔하고 가입/수락하면 위 직급의 권한이 즉시 부여됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 초대 QR 발급 전 */}
          {!tokenRecord && roles.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={loading || !selectedRoleId}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>5분 유효 1회용 초대 QR 생성</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 초대 완료 상태 */}
          {isUsed && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-bold text-emerald-950">
                직원 가입이 완료되었습니다!
              </h3>
              <p className="text-xs text-emerald-700 max-w-xs">
                초대 토큰이 성공적으로 사용되었습니다. 잠시 후 창이 닫힙니다.
              </p>
            </div>
          )}

          {/* 초대 QR 활성화 상태 */}
          {tokenRecord && !isUsed && (
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              {/* QR 코드 디스플레이 */}
              <div className="relative p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
                {remainingSeconds > 0 ? (
                  <QRCodeSVG
                    value={inviteUrl}
                    size={200}
                    level="H"
                    includeMargin
                    imageSettings={{
                      src: "/favicon.ico",
                      x: undefined,
                      y: undefined,
                      height: 28,
                      width: 28,
                      excavate: true,
                    }}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl space-y-2">
                    <Clock className="w-8 h-8 text-rose-400" />
                    <span className="text-xs font-semibold text-rose-500">
                      유효시간 만료
                    </span>
                  </div>
                )}
              </div>

              {/* 카운트다운 타이머 & 상태 배지 */}
              <div className="flex items-center space-x-2">
                {remainingSeconds > 0 ? (
                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>남은 시간: {formatTimer(remainingSeconds)}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">
                    <span>초대 링크 만료됨</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-center text-slate-500 max-w-xs leading-relaxed">
                신규 직원의 스마트폰 카메라로 QR 코드를 스캔하도록 안내해주세요. (스캔 즉시 가입 및 권한 배정)
              </p>

              {/* 하단 공유 / 복사 버튼군 */}
              <div className="w-full grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleShareOrCopy}
                  disabled={remainingSeconds <= 0}
                  className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-40"
                >
                  <Share2 className="w-4 h-4" />
                  <span>링크 공유 / 복사</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateInvite}
                  disabled={loading}
                  className="h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-40"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>QR 새로고침</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 모달 풋터 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>1회용 단회성 토큰 (W3C 표준)</span>
          </div>
          <span>비용 0원 P2P 방식</span>
        </div>
      </div>
    </div>
  );
};
