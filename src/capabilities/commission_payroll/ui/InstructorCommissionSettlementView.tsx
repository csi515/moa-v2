import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Calendar,
  Search,
  DollarSign,
  Users,
  FileCheck2,
  FileSignature,
  Printer,
  ChevronDown,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
} from 'lucide-react';
import {
  calculateCourseRevenueShare,
  formatKoreanWon,
  type CourseRevenueShareItem,
} from '../domain/commissionPayrollEngine';
import {
  InstructorContractModal,
  type InstructorContractData,
} from './InstructorContractModal';
import { showToast } from '@/shared/feedback/uiFeedback';

interface CourseSettlementRecord {
  id: string;
  courseId: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  instructorPhone: string;
  totalEnrolled: number;
  tuitionFeePerPerson: number;
  instructorShareRate: number; // e.g. 0.50
  materialCostPerPerson: number;
  status: 'PENDING' | 'COMPLETED';
}

const DEFAULT_SETTLEMENT_RECORDS: CourseSettlementRecord[] = [
  {
    id: 'cset-1',
    courseId: 'crs-101',
    courseName: '정통 이탈리안 파스타 마스터 클래스',
    instructorId: 'inst-01',
    instructorName: '김민지',
    instructorPhone: '010-8832-1920',
    totalEnrolled: 12,
    tuitionFeePerPerson: 180000,
    instructorShareRate: 0.50, // 50%
    materialCostPerPerson: 30000,
    status: 'COMPLETED',
  },
  {
    id: 'cset-2',
    courseId: 'crs-102',
    courseName: '주말 성인 클래식 발레 & 스트레칭',
    instructorId: 'inst-02',
    instructorName: '이지은',
    instructorPhone: '010-3321-4411',
    totalEnrolled: 15,
    tuitionFeePerPerson: 150000,
    instructorShareRate: 0.60, // 60%
    materialCostPerPerson: 0,
    status: 'COMPLETED',
  },
  {
    id: 'cset-3',
    courseId: 'crs-103',
    courseName: '아크릴 풍경화 & 보태니컬 아트',
    instructorId: 'inst-03',
    instructorName: '박준영',
    instructorPhone: '010-5541-9921',
    totalEnrolled: 10,
    tuitionFeePerPerson: 140000,
    instructorShareRate: 0.55, // 55%
    materialCostPerPerson: 25000,
    status: 'PENDING',
  },
  {
    id: 'cset-4',
    courseId: 'crs-104',
    courseName: '실전 디지털 사진 & 포토샵 리터칭',
    instructorId: 'inst-04',
    instructorName: '최도현',
    instructorPhone: '010-7711-2288',
    totalEnrolled: 8,
    tuitionFeePerPerson: 160000,
    instructorShareRate: 0.50, // 50%
    materialCostPerPerson: 0,
    status: 'PENDING',
  },
];

export const InstructorCommissionSettlementView: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [records, setRecords] = useState<CourseSettlementRecord[]>(DEFAULT_SETTLEMENT_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // 위탁계약서 모달 상태
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [targetInstructorForContract, setTargetInstructorForContract] = useState<{
    instructorName: string;
    instructorPhone: string;
    courseName: string;
  } | null>(null);

  // 정산 엔진을 통해 각 레코드별 정밀 계산값 매핑
  const calculatedItems = useMemo(() => {
    return records.map((rec) => {
      const shareResult = calculateCourseRevenueShare({
        courseId: rec.courseId,
        courseName: rec.courseName,
        instructorId: rec.instructorId,
        instructorName: rec.instructorName,
        totalEnrolled: rec.totalEnrolled,
        tuitionFeePerPerson: rec.tuitionFeePerPerson,
        instructorShareRate: rec.instructorShareRate,
        materialCostPerPerson: rec.materialCostPerPerson,
        cardFeeRate: 0.03, // 카드 수수료 3%
        withholdingTax: true, // 3.3% 사업소득세
      });

      return {
        ...rec,
        shareResult,
      };
    });
  }, [records]);

  // 필터링 적용
  const filteredItems = useMemo(() => {
    return calculatedItems.filter((item) => {
      const matchSearch =
        item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.instructorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [calculatedItems, searchQuery, statusFilter]);

  // 전사 월간 정산 합계 KPI
  const summaryKPI = useMemo(() => {
    let totalEnrolled = 0;
    let totalGrossSales = 0;
    let totalMaterialCost = 0;
    let totalCardFee = 0;
    let totalInstructorNetPayout = 0;
    let totalCenterShare = 0;
    let totalWithholdingTax = 0;

    for (const item of calculatedItems) {
      const r = item.shareResult;
      totalEnrolled += r.totalEnrolled;
      totalGrossSales += r.totalGrossSales;
      totalMaterialCost += r.totalMaterialCostDeduction;
      totalCardFee += r.totalCardFeeDeduction;
      totalInstructorNetPayout += r.instructorNetPayout;
      totalCenterShare += r.centerGrossShare;
      totalWithholdingTax += r.totalWithholdingTax;
    }

    return {
      courseCount: calculatedItems.length,
      totalEnrolled,
      totalGrossSales,
      totalMaterialCost,
      totalCardFee,
      totalInstructorNetPayout,
      totalCenterShare,
      totalWithholdingTax,
    };
  }, [calculatedItems]);

  const handleToggleStatus = (id: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' } : r
      )
    );
    showToast('정산 상태가 변경되었습니다.', 'info');
  };

  const handleOpenContractModal = (rec?: CourseSettlementRecord) => {
    if (rec) {
      setTargetInstructorForContract({
        instructorName: rec.instructorName,
        instructorPhone: rec.instructorPhone,
        courseName: rec.courseName,
      });
    } else {
      setTargetInstructorForContract(null);
    }
    setContractModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 및 액션 바 (화면 출력용) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">문화센터 강사료 수강매출 정산 대장</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
              RS % & 3.3% 원천징수
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            강좌별 수강료 매출 총액, 재료비/카드수수료 차감, 강사 배분율(RS %) 및 사업소득세 자동 산출
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 정산 월 선택 */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border-none p-0 text-xs font-medium focus:ring-0 cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleOpenContractModal()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <FileSignature className="w-4 h-4" />
            강사 위탁계약 체결
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            정산서 인쇄
          </button>
        </div>
      </div>

      {/* KPI 통계 카드 4종 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">총 수강 인원</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900">{summaryKPI.totalEnrolled}</span>
            <span className="text-xs text-slate-500">명 ({summaryKPI.courseCount}개 강좌)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">수강료 총 매출액</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summaryKPI.totalGrossSales.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 ml-0.5">원</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-800 font-medium">강사 실지급 총액 (세후)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-blue-700">
              {summaryKPI.totalInstructorNetPayout.toLocaleString()}
            </span>
            <span className="text-xs text-blue-600 ml-0.5">원</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            원천징수(3.3%): {summaryKPI.totalWithholdingTax.toLocaleString()}원
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm bg-indigo-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-800 font-medium">센터 귀속 순이익</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-indigo-700">
              {summaryKPI.totalCenterShare.toLocaleString()}
            </span>
            <span className="text-xs text-indigo-600 ml-0.5">원</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            재료비 공제: {summaryKPI.totalMaterialCost.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* 검색 및 필터 바 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 print:hidden">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="강좌명, 강사명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              }`}
            >
              전체 ({calculatedItems.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'PENDING' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500'
              }`}
            >
              지급대기
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'COMPLETED' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'
              }`}
            >
              정산완료
            </button>
          </div>
        </div>
      </div>

      {/* 인쇄 전용 헤더 */}
      <div className="hidden print:block text-center pb-4 border-b">
        <h2 className="text-2xl font-bold text-slate-900">{selectedMonth} 문화센터 강사료 정산 명세서</h2>
        <p className="text-xs text-slate-600 mt-1">
          작성일시: {new Date().toLocaleDateString('ko-KR')} | 총 강좌: {filteredItems.length}건
        </p>
      </div>

      {/* 강좌별 정산 대장 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 font-semibold">강좌명 / 강사</th>
                <th className="py-3 px-3 font-semibold text-center">수강생</th>
                <th className="py-3 px-3 font-semibold text-right">총 매출</th>
                <th className="py-3 px-3 font-semibold text-right">공제(재료+카드)</th>
                <th className="py-3 px-3 font-semibold text-right">순배분 대상</th>
                <th className="py-3 px-3 font-semibold text-center">RS 요율</th>
                <th className="py-3 px-3 font-semibold text-right">강사 배분(세전)</th>
                <th className="py-3 px-3 font-semibold text-right">원천징수(3.3%)</th>
                <th className="py-3 px-3.5 font-semibold text-right text-blue-700">강사 실수령액</th>
                <th className="py-3 px-3 font-semibold text-right text-indigo-700">센터 귀속</th>
                <th className="py-3 px-3 font-semibold text-center print:hidden">상태</th>
                <th className="py-3 px-3.5 font-semibold text-center print:hidden">계약/조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const r = item.shareResult;
                const isCompleted = item.status === 'COMPLETED';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{item.courseName}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <span>강사: {item.instructorName}</span>
                        <span className="text-slate-300">|</span>
                        <span>{item.instructorPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-slate-800">{r.totalEnrolled}명</span>
                      <div className="text-[10px] text-slate-400">
                        {r.tuitionFeePerPerson.toLocaleString()}원
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      {r.totalGrossSales.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3 text-right text-red-500 text-[11px]">
                      -{(r.totalMaterialCostDeduction + r.totalCardFeeDeduction).toLocaleString()}원
                      <div className="text-[10px] text-slate-400">
                        (재료 {r.totalMaterialCostDeduction.toLocaleString()} + 카드 {r.totalCardFeeDeduction.toLocaleString()})
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {r.netRevenueToShare.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[11px]">
                        {Math.round(r.instructorShareRate * 100)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {r.instructorGrossPay.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 text-[11px]">
                      -{r.totalWithholdingTax.toLocaleString()}원
                      <div className="text-[10px] text-slate-400">
                        (소득 {r.incomeTax.toLocaleString()} / 지방 {r.localIncomeTax.toLocaleString()})
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-extrabold text-blue-600 bg-blue-50/30">
                      {r.instructorNetPayout.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-indigo-700">
                      {r.centerGrossShare.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3 text-center print:hidden">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {isCompleted ? '정산완료' : '지급대기'}
                      </button>
                    </td>
                    <td className="py-3 px-3.5 text-center print:hidden">
                      <button
                        onClick={() => handleOpenContractModal(item)}
                        className="px-2 py-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                      >
                        위탁계약서
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 위탁 계약 체결 모달 연동 */}
      {contractModalOpen && (
        <InstructorContractModal
          isOpen={contractModalOpen}
          onClose={() => setContractModalOpen(false)}
          initialInstructorName={targetInstructorForContract?.instructorName}
          initialInstructorPhone={targetInstructorForContract?.instructorPhone}
          initialCourseName={targetInstructorForContract?.courseName}
        />
      )}
    </div>
  );
};
