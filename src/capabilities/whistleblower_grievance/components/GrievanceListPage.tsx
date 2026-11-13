import React, { useEffect, useMemo, useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { HelpCircle, Plus, ShieldCheck, MessageSquare } from 'lucide-react';
import {
  generateTicketCode,
  hashAccessPin,
  verifyAccessPin,
  validateGrievanceSubmission,
  generateBlindReceiptToken,
  sanitizeGrievanceSubmission,
  getMaskedGrievanceAuthor,
  type AnonymousGrievanceRecord,
  type GrievanceCategory,
  type GrievanceVisibility,
} from '../domain/grievanceEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { canReadAllFeedbacks, type AccessMember } from '@/domain/permissions';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';


function resolveAccessMember(): AccessMember {
  const active = useActiveUser();
  return {
    role: active?.role === 'owner' ? 'owner' : 'staff',
    customRole: { permissions: active?.customRole?.permissions ?? null },
  };
}

function useCanManageGrievances(): boolean {
  try {
    return canReadAllFeedbacks(resolveAccessMember());
  } catch {
    return false;
  }
}

function resolveDefaultGrievanceVisibility(
  settings: Record<string, unknown> | null,
  industryType: string | null | undefined,
): GrievanceVisibility {
  if (settings?.grievances_named_default === true) return 'named';
  if (settings?.grievances_named_default === false) return 'anonymous';


  return 'named';
}

export const GrievanceListPage: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const defaultVisibility = useMemo(
    () => resolveDefaultGrievanceVisibility(settings, currentOrganization?.industry_type),
    [settings, currentOrganization?.industry_type],
  );
  const isHandler = useCanManageGrievances();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibility, setVisibility] = useState<GrievanceVisibility>(defaultVisibility);

  useEffect(() => {
    if (!isModalOpen) setVisibility(defaultVisibility);
  }, [defaultVisibility, isModalOpen]);
  const [category, setCategory] = useState<GrievanceCategory>('GENERAL_GRIEVANCE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pin, setPin] = useState('');

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<AnonymousGrievanceRecord | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const [issuedReceipt, setIssuedReceipt] = useState<{ ticketCode: string; token: string } | null>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryTicketCode, setInquiryTicketCode] = useState('');
  const [inquiryPin, setInquiryPin] = useState('');
  const [inquiryResult, setInquiryResult] = useState<AnonymousGrievanceRecord | null>(null);
  const [inquiryError, setInquiryError] = useState('');


  const { query } = useList<AnonymousGrievanceRecord>({
    resource: 'anonymous_grievances',
    meta: { schema: 'core' },
    sorters: [{ field: 'submitted_at', order: 'desc' }],
    pagination: { pageSize: 50 },
  });

  const records = (query?.data?.data as AnonymousGrievanceRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const visibleRecords = useMemo(() => {
    if (isHandler) return records;
    const uid = user?.id;
    return records.filter(
      (r) => r.visibility !== 'anonymous' && r.author_user_id && uid && r.author_user_id === uid
    );
  }, [records, isHandler, user?.id]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateGrievanceSubmission(title, content, pin, visibility);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    const ticketCode = generateTicketCode(records.length + 1);
    const values: Record<string, unknown> = {
      ticket_code: ticketCode,
      category,
      subject_title: title.trim(),
      incident_content: content.trim(),
      evidence_attached: false,
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      visibility,
    };

    if (visibility === 'named') {
      values.author_user_id = user?.id ?? null;
      values.access_pin_hash = null;
    } else {
      values.author_user_id = null;
      values.access_pin_hash = hashAccessPin(pin.trim());
    }

    const sanitizedValues = sanitizeGrievanceSubmission(values);
    const receiptToken = visibility === 'anonymous' ? generateBlindReceiptToken(ticketCode, pin.trim()) : '';

    createRecord(
      { resource: 'anonymous_grievances', values: sanitizedValues, meta: { schema: 'core' } },
      {
        onSuccess: () => {
          showToast(
            visibility === 'named'
              ? `건의가 접수되었습니다. (접수코드: ${ticketCode})`
              : `익명 제보가 접수되었습니다. (접수코드: ${ticketCode})`,
            'success'
          );
          setIsModalOpen(false);
          if (visibility === 'anonymous') {
            setIssuedReceipt({ ticketCode, token: receiptToken });
          }
          setTitle('');
          setContent('');
          setPin('');
          setVisibility(defaultVisibility);
          refetch();
        },
        onError: (err) => {
          showToast.error(err, '접수 실패');
        },
      }
    );
  };

  
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError('');
    setInquiryResult(null);

    const found = records.find((r) => r.ticket_code === inquiryTicketCode.trim());
    if (!found) {
      setInquiryError('해당 접수코드의 제보를 찾을 수 없습니다.');
      return;
    }

    if (found.visibility === 'named') {
      setInquiryResult(found);
      return;
    }

    if (!found.access_pin_hash || !verifyAccessPin(inquiryPin.trim(), found.access_pin_hash)) {
      setInquiryError('비밀 PIN 번호가 일치하지 않습니다.');
      return;
    }

    setInquiryResult(found);
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !feedbackText.trim() || !isHandler) return;

    updateRecord(
      {
        resource: 'anonymous_grievances',
        id: selectedTicket.id,
        values: {
          status: 'RESOLVED',
          investigation_feedback: feedbackText.trim(),
          resolved_at: new Date().toISOString(),
        },
        meta: { schema: 'core' },
      },
      {
        onSuccess: () => {
          showToast(`[${selectedTicket.ticket_code}] 조치 회신이 등록되었습니다.`, 'success');
          setReplyModalOpen(false);
          setSelectedTicket(null);
          setFeedbackText('');
          refetch();
        },
      }
    );
  };

  const getCategoryLabel = (cat: GrievanceCategory) => {
    switch (cat) {
      case 'WORKPLACE_HARASSMENT':
        return '직장 내 괴롭힘';
      case 'SEXUAL_HARASSMENT':
        return '성희롱/성추행';
      case 'FRAUD_EMBEZZLEMENT':
        return '횡령 및 부정회계';
      case 'SAFETY_VIOLATION':
        return '안전 보건 위반';
      case 'GENERAL_GRIEVANCE':
        return '일반 인사 고충';
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6" data-testid="grievance-list-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <HelpCircle className="h-7 w-7 text-rose-600" aria-hidden />
            {isHandler ? '노경 건의 접수함' : '내 건의함'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isHandler
              ? '기명·익명 건의를 조회하고 조치 회신을 등록합니다. 급여·승진과 연결되지 않습니다.'
              : '본인이 접수한 기명 건의를 확인하고, 새 건의를 작성할 수 있습니다.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          새 건의
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 font-semibold text-slate-600">
            <tr>
              <th className="p-3">접수 번호</th>
              <th className="p-3">유형</th>
              <th className="p-3">분류</th>
              <th className="p-3">제목</th>
              <th className="p-3">접수일</th>
              <th className="p-3">상태</th>
              {isHandler ? <th className="p-3 text-right">조사 / 회신</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={isHandler ? 7 : 6} className="p-8 text-center text-slate-400">
                  불러오는 중...
                </td>
              </tr>
            ) : visibleRecords.length === 0 ? (
              <tr>
                <td colSpan={isHandler ? 7 : 6} className="p-8 text-center text-slate-400">
                  접수된 건의가 없습니다.
                </td>
              </tr>
            ) : (
              visibleRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-rose-600">{r.ticket_code}</td>
                  <td className="p-3 text-xs">{r.visibility === 'anonymous' ? '익명' : '기명'}</td>
                  <td className="p-3">
                    <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                      {getCategoryLabel(r.category)}
                    </span>
                  </td>
                  <td className="max-w-sm truncate p-3 font-medium">{r.subject_title}</td>
                  <td className="p-3 text-slate-500">
                    {new Date(r.submitted_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="p-3">
                    {r.status === 'SUBMITTED' && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        접수 대기
                      </span>
                    )}
                    {r.status === 'UNDER_INVESTIGATION' && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        조사 진행중
                      </span>
                    )}
                    {r.status === 'RESOLVED' && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        조치 완료
                      </span>
                    )}
                    {r.investigation_feedback && !isHandler ? (
                      <p className="mt-1 text-xs text-slate-500">{r.investigation_feedback}</p>
                    ) : null}
                  </td>
                  {isHandler ? (
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicket(r);
                          setFeedbackText(r.investigation_feedback || '');
                          setReplyModalOpen(true);
                        }}
                        className="inline-flex min-h-11 items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden /> 회신
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {replyModalOpen && selectedTicket && isHandler ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-rose-700">
              <MessageSquare className="h-5 w-5" aria-hidden />
              [{selectedTicket.ticket_code}] 조치 회신
            </h2>
            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
              <p className="font-semibold text-slate-800">제목: {selectedTicket.subject_title}</p>
              <p className="whitespace-pre-wrap text-slate-600">{selectedTicket.incident_content}</p>
            </div>
            <form onSubmit={handleReply} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                조치 회신문 *
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  rows={4}
                  required
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReplyModalOpen(false)} className="min-h-11 rounded-lg border px-4 text-sm">
                  취소
                </button>
                <button type="submit" className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white">
                  조치 완료 회신
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-rose-600">
              <ShieldCheck className="h-5 w-5" aria-hidden />
              새 건의 작성
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <fieldset>
                <legend className="mb-1 text-xs font-semibold text-slate-600">접수 방식 *</legend>
                <div className="flex gap-3">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'named'}
                      onChange={() => setVisibility('named')}
                    />
                    기명 (본인만·담당자 조회)
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'anonymous'}
                      onChange={() => setVisibility('anonymous')}
                    />
                    익명 (PIN)
                  </label>
                </div>
              </fieldset>
              <label className="block text-xs font-semibold text-slate-600">
                분류 *
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GrievanceCategory)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="WORKPLACE_HARASSMENT">직장 내 괴롭힘</option>
                  <option value="SEXUAL_HARASSMENT">성희롱/성추행</option>
                  <option value="FRAUD_EMBEZZLEMENT">횡령 및 부정회계</option>
                  <option value="SAFETY_VIOLATION">안전 보건 위반</option>
                  <option value="GENERAL_GRIEVANCE">일반 근무조건 고충</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                제목 *
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                내용 (10자 이상) *
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  rows={4}
                  required
                />
              </label>
              {visibility === 'anonymous' ? (
                <label className="block text-xs font-semibold text-slate-600">
                  사후 조회용 PIN (4자리 이상) *
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm tracking-widest"
                    required
                  />
                </label>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="min-h-11 rounded-lg border px-4 text-sm">
                  취소
                </button>
                <button type="submit" className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white">
                  접수
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
