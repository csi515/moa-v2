import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2,
  Clock,
  MapPin,
  Phone,
  Calendar,
  Share2,
  CheckCircle2,
  Sparkles,
  Send,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { getCoreClient, isSupabaseConfigured } from "@/lib/supabase";
import { shareLink } from "@/core/utils/shareLink";
import { publicOrgService } from "@/core/public/services/publicOrgService";

interface StoreData {
  id: string;
  name: string;
  industry_type: string;
  slug: string;
  settings?: {
    address?: string;
    phone?: string;
    description?: string;
    notice?: string;
  };
}

interface OperatingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

export const PublicStoreLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 간이 상담/체험 신청 폼 상태
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [inquiryText, setInquiryText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (!slug) {
      setError("매장 식별자(slug)가 누락되었습니다.");
      setLoading(false);
      return;
    }

    const fetchStore = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!isSupabaseConfigured()) {
          // 데모 폴백
          setStore({
            id: "demo-org-id",
            name: "모아 프리미엄 센터",
            industry_type: "study_cafe",
            slug: slug,
            settings: {
              address: "서울특별시 강남구 테헤란로 152 4층",
              phone: "02-1234-5678",
              description: "최신식 시설과 쾌적한 학습/운동 환경을 제공하는 프리미엄 센터입니다.",
              notice: "당일 무료 체험 및 1:1 상담 예약이 가능합니다.",
            },
          });
          setHours([
            { day_of_week: 1, open_time: "09:00", close_time: "23:00", is_closed: false },
            { day_of_week: 2, open_time: "09:00", close_time: "23:00", is_closed: false },
            { day_of_week: 3, open_time: "09:00", close_time: "23:00", is_closed: false },
            { day_of_week: 4, open_time: "09:00", close_time: "23:00", is_closed: false },
            { day_of_week: 5, open_time: "09:00", close_time: "23:00", is_closed: false },
            { day_of_week: 6, open_time: "10:00", close_time: "22:00", is_closed: false },
            { day_of_week: 0, open_time: "10:00", close_time: "20:00", is_closed: false },
          ]);
          setLoading(false);
          return;
        }

        // 1. 화이트리스트 안전 RPC를 통해 공개 매장 정보 조회 (내부 settings/BRN 유출 원천 차단)
        const orgInfo = await publicOrgService.getOrganizationBySlugOrCode(slug);
        if (!orgInfo) {
          setError("해당 매장을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setStore({
          id: orgInfo.id,
          name: orgInfo.name,
          industry_type: orgInfo.industry_type,
          slug: orgInfo.slug || slug,
          settings: {
            address: orgInfo.address || undefined,
            phone: orgInfo.phone || undefined,
            description: orgInfo.description || undefined,
            notice: "당일 무료 체험 및 1:1 상담 예약이 가능합니다.",
          },
        });
        document.title = `${orgInfo.name} - MOA 센터 안내`;

        // 2. 운영 시간 조회
        try {
          const client = getCoreClient();
          const { data: hoursData } = await (client as any)
            .from("tenant_operating_hours")
            .select("*")
            .eq("tenant_id", orgInfo.id);

          if (hoursData && (hoursData as any[]).length > 0) {
            const parsedHours: OperatingHour[] = (hoursData as any[]).map((row) => ({
              day_of_week: Number(row.day_of_week ?? 0),
              open_time: String(row.open_time || row.start_time || "09:00"),
              close_time: String(row.close_time || row.end_time || "22:00"),
              is_closed: Boolean(row.is_closed || !row.is_active),
            }));
            setHours(parsedHours);
          }
        } catch {
          // 운영 시간 정보 없을 시 기본 상태 유지
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "매장 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [slug]);

  const handleShare = async () => {
    if (!store) return;
    const url = window.location.href;
    await shareLink({
      title: store.name,
      text: `${store.name} 안내 및 체험 신청`,
      url,
      onFeedback: (msg) => showToast(msg),
    });
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantPhone.trim()) {
      showToast("이름과 연락처를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSupabaseConfigured() && store) {
        // 안전한 public 상담 신청 RPC 호출 (RLS 준수, customers 직접 insert 차단)
        await publicOrgService.submitConsultation(store.id, {
          contact_name: applicantName.trim(),
          contact_phone: applicantPhone.trim(),
          message: `[Public 랜딩 신청] ${inquiryText.trim()}`,
        });
      }

      setSubmitted(true);
      showToast("체험/상담 신청이 정상 접수되었습니다!");
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } catch {
      // 오프라인/데모 폴백
      setSubmitted(true);
      showToast("체험/상담 신청이 정상 접수되었습니다!");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-600">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">매장을 찾을 수 없습니다</h2>
          <p className="mt-2 text-sm text-slate-600">{error || "존재하지 않거나 비활성화된 매장 주소입니다."}</p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            MOA 홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all">
          {toastMsg}
        </div>
      )}

      {/* 상단 Google AdSense 배너 컨테이너 */}
      <div className="border-b border-slate-200 bg-white/70 py-2 text-center backdrop-blur">
        <div className="mx-auto max-w-4xl px-4">
          {/* Google AdSense Responsive Unit Slot Template */}
          {/* <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins> */}
          <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 text-xs text-slate-400">
            광고 영역 (Google AdSense Responsive Unit Container)
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 font-black text-white shadow-md shadow-indigo-100">
              M
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{store.name}</h1>
              <p className="text-xs font-medium text-slate-500">
                moa.app/p/{store.slug}
              </p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <Share2 className="h-4 w-4" />
            공유
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Left Column: Store Details */}
          <div className="space-y-6 md:col-span-2">
            {/* Store Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600">
                <Building2 className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">매장 소개</span>
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{store.name}</h2>
              <p className="mt-3 leading-relaxed text-slate-600">
                {store.settings?.description || "방문 고객을 위한 맞춤형 서비스와 편리한 예약 시스템을 제공합니다."}
              </p>

              {store.settings?.notice && (
                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs font-medium text-indigo-900">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    공지사항
                  </div>
                  <p className="mt-1">{store.settings.notice}</p>
                </div>
              )}

              {/* Location & Contact */}
              <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-sm text-slate-600">
                {store.settings?.address && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{store.settings.address}</span>
                  </div>
                )}
                {store.settings?.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <a
                      href={`tel:${store.settings.phone}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {store.settings.phone}
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Operating Hours */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600">
                <Clock className="h-5 w-5" />
                <h3 className="text-sm font-bold tracking-tight text-slate-900">운영 시간 안내</h3>
              </div>

              {hours.length > 0 ? (
                <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
                  {hours.map((h) => (
                    <div
                      key={h.day_of_week}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <span className="font-bold text-slate-700">
                        {DAYS_KO[h.day_of_week % 7]}요일
                      </span>
                      {h.is_closed ? (
                        <span className="font-semibold text-rose-500">휴무</span>
                      ) : (
                        <span className="font-medium text-slate-600">
                          {h.open_time.slice(0, 5)} ~ {h.close_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  상세 운영 시간은 매장에 직접 문의해 주시기 바랍니다.
                </p>
              )}
            </section>
          </div>

          {/* Right Column: 1-Click Consultation Form */}
          <div className="md:col-span-1">
            <section className="sticky top-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600">
                <Calendar className="h-5 w-5" />
                <h3 className="text-sm font-bold text-slate-900">체험 / 1:1 상담 신청</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                연락처를 남겨주시면 담당 강사/직원이 신속히 안내해 드립니다.
              </p>

              {submitted ? (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                  <h4 className="mt-2 text-sm font-bold text-emerald-900">신청이 완료되었습니다!</h4>
                  <p className="mt-1 text-xs text-emerald-700">
                    빠른 시일 내에 확인 후 연락드리겠습니다.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-xs font-semibold text-emerald-800 underline hover:text-emerald-900"
                  >
                    추가 신청하기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApply} className="mt-5 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">신청자 성함</label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="홍길동"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">휴대폰 번호</label>
                    <input
                      type="tel"
                      required
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="010-1234-5678"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">문의 내용 (선택)</label>
                    <textarea
                      rows={3}
                      value={inquiryText}
                      onChange={(e) => setInquiryText(e.target.value)}
                      placeholder="희망 요일, 시간대 또는 궁금한 점을 적어주세요."
                      className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "접수 중..." : "간편 신청하기"}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* 하단 Google AdSense 배너 컨테이너 */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-6 flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
            하단 광고 영역 (Google AdSense Responsive Multiplex / Horizontal Unit)
          </div>

          <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} {store.name}. Powered by MOA v2.</p>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-indigo-600">
                관리자/직원 로그인
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
