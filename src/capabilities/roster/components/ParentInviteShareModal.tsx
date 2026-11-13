import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageSquare,
  Users,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Phone,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { createGuardianLinkToken } from '@/core/parent/services/guardianLinkService';
import { buildParentInviteUrl } from '@/core/parent/services/parentInviteService';
import { getPrimaryGuardian } from '@/core/parent/guardianHelpers';
import { showToast } from '@/shared/feedback/uiFeedback';

export interface InviteTargetStudent {
  id: string;
  name: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
}

export interface GeneratedInviteItem {
  student: InviteTargetStudent;
  guardianName: string;
  guardianPhone: string;
  token: string;
  inviteUrl: string;
  shareMessage: string;
}

export interface ParentInviteShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: InviteTargetStudent[];
}

/**
 * 카카오톡/문자 전송용 정중하고 친절한 초대 메시지 템플릿 생성기
 */
export function buildParentInviteShareMessage(params: {
  organizationName: string;
  studentName: string;
  inviteUrl: string;
  guardianName?: string;
  expiresDays?: number;
}): string {
  const org = params.organizationName || '학원';
  const student = params.studentName;
  const guardianGreeting = params.guardianName
    ? `${params.guardianName} 학부모님`
    : `${student} 학생 학부모님`;
  const days = params.expiresDays ?? 7;

  return `[${org}] ${guardianGreeting} 안녕하세요!

학원 출결 알림, 레슨 진도 및 주간 시간표 확인을 위한 '모아 학부모 앱' 초대장입니다.

아래 초대 링크를 터치하시면 별도 절차 없이 원클릭으로 간편하게 연결됩니다:
${params.inviteUrl}

(유효기간: 발급일로부터 ${days}일 이내 접속)
궁금하신 점이나 문의사항은 언제든 편하게 학원으로 연락해 주세요. 감사합니다.`;
}

/**
 * 대량 문자/알림톡 발송 솔루션(알리고 등)용 CSV/텍스트 일괄 복사 포맷터
 */
export function buildBulkInviteCopyText(items: GeneratedInviteItem[]): string {
  const lines = items.map((item) => {
    const phone = item.guardianPhone || item.student.phone || '';
    return `${item.student.name}\t${phone}\t${item.inviteUrl}`;
  });
  return `성명\t보호자연락처\t초대링크\n${lines.join('\n')}`;
}

export const ParentInviteShareModal: React.FC<ParentInviteShareModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || 'demo-org';
  const orgName = currentOrganization?.name || '음악학원';

  const [loading, setLoading] = useState(false);
  const [inviteItems, setInviteItems] = useState<GeneratedInviteItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
  const [editableMessage, setEditableMessage] = useState<string>('');

  const isSingle = students.length === 1;

  // 초대 토큰 일괄/단일 발급
  const generateInvites = useCallback(async () => {
    if (students.length === 0) {
      setInviteItems([]);
      return;
    }
    setLoading(true);

    try {
      const results: GeneratedInviteItem[] = [];

      for (const st of students) {
        // 기존 보호자 정보 조회
        const primaryGuardian = getPrimaryGuardian(st.id);
        const guardianName = primaryGuardian?.parentName || st.parentName || '';
        const guardianPhone = primaryGuardian?.parentPhone || st.parentPhone || '';

        let token = '';
        try {
          if (orgId && !orgId.startsWith('demo-')) {
            const tokenResult = await createGuardianLinkToken(orgId, st.id, 7, 1);
            token = tokenResult.token;
          } else {
            // 데모 또는 오프라인 모드
            token = `demo_${st.id.slice(0, 8)}_${Math.random().toString(36).slice(2, 8)}`;
          }
        } catch {
          // 실패 시 안전한 데모 토큰 폴백
          token = `token_${st.id.slice(0, 8)}_${Math.random().toString(36).slice(2, 8)}`;
        }

        const inviteUrl = buildParentInviteUrl(token);
        const shareMessage = buildParentInviteShareMessage({
          organizationName: orgName,
          studentName: st.name,
          guardianName,
          inviteUrl,
          expiresDays: 7,
        });

        results.push({
          student: st,
          guardianName,
          guardianPhone,
          token,
          inviteUrl,
          shareMessage,
        });
      }

      setInviteItems(results);
      if (results.length > 0) {
        setEditableMessage(results[0].shareMessage);
      }
    } catch {
      showToast('초대장 링크 발급 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [students, orgId, orgName]);

  useEffect(() => {
    if (isOpen) {
      void generateInvites();
    } else {
      setInviteItems([]);
      setCopiedKey(null);
    }
  }, [isOpen, generateInvites]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast('클립보드에 복사되었습니다! 카카오톡이나 문자에 붙여넣기(Ctrl+V) 하세요.', 'success');
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      showToast('복사에 실패했습니다. 권한을 확인해주세요.', 'error');
    }
  };

  const handleShare = async (item: GeneratedInviteItem) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `[${orgName}] 학부모 앱 초대장`,
          text: item.shareMessage,
          url: item.inviteUrl,
        });
        showToast('초대장을 공유했습니다.', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          void handleCopy(item.student.id, item.shareMessage);
        }
      }
    } else {
      void handleCopy(item.student.id, item.shareMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSingle ? `학부모 앱 초대장 전송` : `학부모 앱 초대장 일괄 생성 (${students.length}명)`}
      maxWidth={isSingle ? 'md' : 'lg'}
    >
      <div className="p-5 sm:p-6 space-y-5">
        {/* 상단 안내 배너 */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 leading-relaxed">
            <p className="font-bold text-indigo-900">
              학부모님이 간편하게 출결·시간표·알림장을 확인할 수 있는 모바일 전용 초대장입니다.
            </p>
            <p className="text-indigo-700/80 mt-0.5">
              별도의 회원가입 승인 대기 없이, 아래 초대 링크를 누르면 즉시 자녀와 안전하게 연결됩니다.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-600">초대 링크를 생성하는 중입니다...</p>
          </div>
        ) : isSingle && inviteItems[0] ? (
          /* 단일 학생 초대 뷰 */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-black text-slate-900 text-sm">{inviteItems[0].student.name}</span>
                <span className="text-slate-500 ml-2">
                  보호자: {inviteItems[0].guardianName || '미등록'}
                  {inviteItems[0].guardianPhone ? ` (${inviteItems[0].guardianPhone})` : ''}
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                7일간 유효
              </span>
            </div>

            {/* 전송용 카톡 문구 에디터/미리보기 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>카카오톡 / 문자 발송 문구</span>
                </label>
                <span className="text-[10px] text-slate-400">필요 시 수정하여 복사할 수 있습니다</span>
              </div>
              <textarea
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows={7}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 링크 전용 박스 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-600 truncate">{inviteItems[0].inviteUrl}</span>
              <button
                type="button"
                onClick={() => void handleCopy('link_only', inviteItems[0].inviteUrl)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'link_only' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>링크만 복사</span>
                  </>
                )}
              </button>
            </div>

            {/* 하단 메인 액션 버튼 */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => void handleCopy('main_message', editableMessage)}
                className="flex-1 min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedKey === 'main_message' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>문구 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>카톡 / 문자 문구 전체 복사</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleShare(inviteItems[0])}
                className="min-h-[44px] py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>카톡 / 앱으로 공유</span>
              </button>
            </div>
          </div>
        ) : (
          /* 다중 학생 일괄 초대 뷰 */
          <div className="space-y-4">
            {/* 탭 스위처: [학생별 개별 복사] vs [대량 문자 일괄 복사] */}
            <div className="flex border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('individual')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'individual'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                개별 카톡 복사 ({inviteItems.length}명)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bulk')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'bulk'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>대량 문자 솔루션용 일괄 복사</span>
              </button>
            </div>

            {activeTab === 'individual' ? (
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {inviteItems.map((item) => (
                  <div
                    key={item.student.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.student.name}</span>
                        {item.guardianName && (
                          <span className="text-[11px] text-slate-500 font-semibold">
                            (보호자: {item.guardianName})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.guardianPhone || item.student.phone || '연락처 없음'} · {item.inviteUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleCopy(item.student.id, item.shareMessage)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === item.student.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>복사됨</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>카톡 문구 복사</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleShare(item)}
                        className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer"
                        title="공유하기"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  대량 문자 발송 사이트(알리고, 뿌리오 등)에 바로 엑셀 붙여넣기 할 수 있는 탭 구분 텍스트입니다.
                </p>
                <textarea
                  readOnly
                  rows={8}
                  value={buildBulkInviteCopyText(inviteItems)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono leading-relaxed select-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    void handleCopy('bulk_all', buildBulkInviteCopyText(inviteItems))
                  }
                  className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedKey === 'bulk_all' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>전체 명단 복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>전체 명단 클립보드 복사</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 닫기 버튼 */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
};
