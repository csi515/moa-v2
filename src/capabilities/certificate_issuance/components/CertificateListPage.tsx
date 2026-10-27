import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { Award, Plus, Printer, Check, Search, ShieldCheck } from 'lucide-react';
import {
  formatCertificateNumber,
  generateVerificationHash,
  verifyCertificateIntegrity,
  getCertificateTypeLabel,
  type IssuedCertificateRecord,
  type CertificateType,
} from '../domain/certificateEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const CertificateListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certType, setCertType] = useState<CertificateType>('COURSE_COMPLETION');
  const [recipientName, setRecipientName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [tuitionAmount, setTuitionAmount] = useState<number>(0);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  const { query } = useList<IssuedCertificateRecord>({
    resource: 'issued_certificates',
    sorters: [{ field: 'issued_date', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const certificates = (query?.data?.data as IssuedCertificateRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createCert } = useCreate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      showToast('발급 대상자 성명을 입력해 주세요.', 'error');
      return;
    }

    const year = new Date().getFullYear();
    const seq = certificates.length + 1;
    const certNumber = formatCertificateNumber('CERT', year, seq);
    const today = new Date().toISOString().split('T')[0];
    const hash = generateVerificationHash(certNumber, recipientName.trim(), today);

    createCert(
      {
        resource: 'issued_certificates',
        values: {
          cert_number: certNumber,
          cert_type: certType,
          recipient_name: recipientName.trim(),
          course_name: courseName.trim() || undefined,
          issued_amount: certType === 'TUITION_RECEIPT' ? tuitionAmount : undefined,
          issued_date: today,
          verification_hash: hash,
          issuer_name: '모아 아카데미 대표',
        },
      },
      {
        onSuccess: () => {
          showToast(`증명서 [${certNumber}] 발급 완료 (검증코드: ${hash})`, 'success');
          setIsModalOpen(false);
          setRecipientName('');
          setCourseName('');
          setTuitionAmount(0);
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '증명서 발급 실패', 'error');
        },
      }
    );
  };

  const handlePrint = (cert: IssuedCertificateRecord) => {
    window.print();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const found = certificates.find((c) => c.verification_hash === verifyCode.trim().toUpperCase());
    if (found) {
      setVerifyResult(true);
      showToast(`[진본 확인] ${found.recipient_name}님의 ${getCertificateTypeLabel(found.cert_type)}입니다.`, 'success');
    } else {
      setVerifyResult(false);
      showToast('일치하는 정품 발급 이력이 없습니다 (위변조 의심).', 'error');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Award className="w-7 h-7 text-amber-500" />
            증명서·수료증 채번 및 위변조 검증 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            재원증명서, 교육 수료증, 교육비납입증명서 고유 번호 채번 및 사후 검증 해시를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setVerifyModalOpen(true);
              setVerifyResult(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            위변조 검증 조회
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
          >
            <Plus className="w-4 h-4" />
            신규 증명서 발급
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">발급 번호</th>
              <th className="p-3">문서 종류</th>
              <th className="p-3">발급 대상자</th>
              <th className="p-3">과정명 / 비고</th>
              <th className="p-3">발급일</th>
              <th className="p-3 font-mono">검증 해시</th>
              <th className="p-3 text-right">출력</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">발급된 증명서가 없습니다.</td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-bold text-amber-600">{cert.cert_number}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-800 font-medium border border-amber-200">
                      {getCertificateTypeLabel(cert.cert_type)}
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{cert.recipient_name}</td>
                  <td className="p-3 text-slate-500">
                    {cert.course_name || (cert.issued_amount ? `${cert.issued_amount.toLocaleString()}원` : '-')}
                  </td>
                  <td className="p-3 text-slate-400">{cert.issued_date}</td>
                  <td className="p-3 font-mono text-xs font-bold text-slate-600">
                    {cert.verification_hash}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handlePrint(cert)}
                      className="px-2.5 py-1 text-xs border rounded hover:bg-slate-100 font-medium inline-flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> 인쇄
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 발급 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              신규 증명서 채번 및 발급
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">문서 종류 선택 *</label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as CertificateType)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="COURSE_COMPLETION">교육 수료증</option>
                  <option value="ENROLLMENT_VERIFICATION">재원/수강 증명서</option>
                  <option value="TUITION_RECEIPT">교육비 납입증명서</option>
                  <option value="ATTENDANCE_CONFIRMATION">출석 확인서</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">발급 대상자 성명 *</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">과정명 / 수료 과정</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="예: 필라테스 지도자 레벨 1 과정"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              {certType === 'TUITION_RECEIPT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">연간 납입 총액(원)</label>
                  <input
                    type="number"
                    value={tuitionAmount}
                    onChange={(e) => setTuitionAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
              )}
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
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  발급 및 채번
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 진본 검증 모달 */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              증명서 위변조 진본 확인
            </h2>
            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">검증 해시코드 (6자리)</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="예: 7F2B1A"
                  className="w-full px-3 py-2 border rounded-lg font-mono text-center tracking-widest text-lg font-bold"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
              >
                진본 대조 확인
              </button>
              {verifyResult === true && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium text-center">
                  정상 등록된 원본 증명서입니다.
                </div>
              )}
              {verifyResult === false && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-medium text-center">
                  검증 실패: 등록되지 않은 위조 코드입니다.
                </div>
              )}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  닫기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
