import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Sparkles,
  AlertCircle,
  Clock,
  Palette,
  X,
  User,
  CheckCircle2,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  normalizeTreatmentEntry,
  predictNextVisitDate,
  type NormalizedTreatmentEntry,
  type RawTreatmentInput,
} from '../domain/treatmentChartEngine';

const STORAGE_KEY_CHARTS = 'moa_treatment_chart_entries';

const SAMPLE_ENTRIES: NormalizedTreatmentEntry[] = [
  {
    id: 'tc-001',
    customerId: 'cust-김서연',
    practitionerId: '헤어 디자이너 민지',
    category: '헤어 염색 & 케어',
    formulaSummary: '밀본 올디브 7-45(체리레드) + 6% 산화제 1:1, 단백질 앰플 5ml 혼합',
    colorCodes: ['#991b1b', '7-45'],
    photoUrls: { before: [], after: [] },
    price: 130000,
    performedDate: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    performedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'tc-002',
    customerId: 'cust-박지민',
    practitionerId: '네일 아티스트 수진',
    category: '젤네일 아트',
    formulaSummary: '시럽 핑크 베이스 2콧 + 글리터 그라데이션 포인트 + 논와이프 탑젤',
    colorCodes: ['#fbcfe8', 'Syrup-04'],
    photoUrls: { before: [], after: [] },
    price: 65000,
    performedDate: new Date(Date.now() - 32 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    performedAt: new Date(Date.now() - 32 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'tc-003',
    customerId: 'cust-이지은',
    practitionerId: '원장 은영',
    category: '피부 재생 케어',
    formulaSummary: '물광 LDM 리프팅 + 아줄렌 진정 마스크팩 15분 + 재생 크림 도포',
    colorCodes: [],
    photoUrls: { before: [], after: [] },
    price: 90000,
    performedDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    performedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
];

export const TreatmentChartManagementView: React.FC = () => {
  const [entries, setEntries] = useState<NormalizedTreatmentEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_CHARTS));
      if (saved) {
        setEntries(JSON.parse(saved));
      } else {
        setEntries(SAMPLE_ENTRIES);
        localStorage.setItem(getTenantStorageKey(STORAGE_KEY_CHARTS), JSON.stringify(SAMPLE_ENTRIES));
      }
    } catch {
      setEntries(SAMPLE_ENTRIES);
    }
  }, []);

  const saveEntries = (next: NormalizedTreatmentEntry[]) => {
    setEntries(next);
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_CHARTS), JSON.stringify(next));
    } catch {
      // 무시
    }
  };

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const term = searchTerm.toLowerCase();
    return entries.filter(
      (e) =>
        e.customerId.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term) ||
        e.formulaSummary.toLowerCase().includes(term) ||
        e.practitionerId.toLowerCase().includes(term)
    );
  }, [entries, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-xs font-semibold mb-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>고객 맞춤 시술 이력</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">시술·관리 차트</h1>
          <p className="text-xs text-slate-500 mt-1">
            헤어 약재 배합, 네일 컬러 번호, 피부 케어 로그 및 재방문 주기를 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>신규 시술 차트 기록</span>
        </button>
      </div>

      {/* 검색 & 통계 바 */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="고객명, 시술 카테고리, 약재 배합 검색"
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold">
          누적 차트 <span className="text-pink-600 font-bold">{entries.length}</span>건
        </div>
      </div>

      {/* 차트 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map((entry) => {
          // 재방문 예측 (기본 4주 주기)
          const prediction = predictNextVisitDate({
            lastPerformedDate: entry.performedDate,
            cycleWeeks: 4,
            currentDate: new Date().toISOString().slice(0, 10),
          });

          return (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* 상단: 고객명 & 카테고리 & 재방문 상태 */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {entry.customerId.replace('cust-', '')} 고객님
                    </span>
                    <span className="text-[11px] text-slate-400">{entry.practitionerId}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 text-[10px] font-bold">
                    {entry.category}
                  </span>
                </div>

                {/* 약재 배합 & 시술 레시피 */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    시술 레시피 / 배합 특이사항
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {entry.formulaSummary}
                  </p>
                </div>

                {/* 컬러 코드 배지 (있을 경우) */}
                {entry.colorCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">사용 컬러:</span>
                    {entry.colorCodes.map((code, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold"
                      >
                        {code.startsWith('#') && (
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block"
                            style={{ backgroundColor: code }}
                          />
                        )}
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 하단: 시술일 & 재방문 주기 & 금액 */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>시술 일자</span>
                  <span className="font-semibold text-slate-700">{entry.performedDate}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">재방문 예정</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      prediction.isOverdue
                        ? 'bg-rose-50 text-rose-600'
                        : prediction.isDue
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {prediction.isOverdue
                      ? `방문 시기 초과 (${Math.abs(prediction.daysRemaining)}일 지남)`
                      : prediction.isDue
                      ? `방문 도래 (${prediction.daysRemaining}일 남음)`
                      : `${prediction.targetVisitDate} (${prediction.daysRemaining}일 후)`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 text-[11px]">결제 금액</span>
                  <span className="font-bold text-slate-900">{entry.price.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 신규 시술 차트 모달 */}
      {isModalOpen && (
        <NewTreatmentModal
          onClose={() => setIsModalOpen(false)}
          onCreated={(newEntry) => {
            saveEntries([newEntry, ...entries]);
            setIsModalOpen(false);
            showToast('시술 차트가 성공적으로 등록되었습니다.', 'success');
          }}
        />
      )}
    </div>
  );
};

interface NewModalProps {
  onClose: () => void;
  onCreated: (entry: NormalizedTreatmentEntry) => void;
}

const NewTreatmentModal: React.FC<NewModalProps> = ({ onClose, onCreated }) => {
  const [customerName, setCustomerName] = useState('');
  const [practitionerName, setPractitionerName] = useState('');
  const [category, setCategory] = useState('헤어 염색 & 케어');
  const [formulaNotes, setFormulaNotes] = useState('');
  const [colorCodes, setColorCodes] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !formulaNotes.trim()) {
      showToast('고객명과 시술 내용을 입력해주세요.', 'warning');
      return;
    }

    const raw: RawTreatmentInput = {
      customerId: `cust-${customerName.trim()}`,
      practitionerId: practitionerName.trim() || '담당자',
      category: category.trim(),
      formulaNotes: formulaNotes.trim(),
      colorCodes: colorCodes
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      price: Number(price) || 0,
      performedAt: new Date().toISOString(),
    };

    const normalized = normalizeTreatmentEntry(`tc-${Date.now()}`, raw);
    onCreated(normalized);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-600" />
            <h3 className="text-base font-extrabold text-slate-900">신규 시술 차트 기록</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">고객명</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="예: 김서연"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">담당 시술자</label>
              <input
                type="text"
                value={practitionerName}
                onChange={(e) => setPractitionerName(e.target.value)}
                placeholder="예: 민지 디자이너"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">시술 카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="헤어 염색 & 케어">헤어 염색 & 케어</option>
              <option value="헤어 펌 & 커트">헤어 펌 & 커트</option>
              <option value="젤네일 아트">젤네일 아트</option>
              <option value="피부 재생 케어">피부 재생 케어</option>
              <option value="속눈썹 & 왁싱">속눈썹 & 왁싱</option>
              <option value="타투 & 반영구">타투 & 반영구</option>
              <option value="반려동물 위생 미용">반려동물 위생 미용</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">약재 배합 / 레시피 메모</label>
            <textarea
              rows={3}
              value={formulaNotes}
              onChange={(e) => setFormulaNotes(e.target.value)}
              placeholder="예: 밀본 올디브 7-45 + 산화제 6% (1:1), 앰플 5ml 혼합"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">컬러 번호 (쉼표 구분)</label>
              <input
                type="text"
                value={colorCodes}
                onChange={(e) => setColorCodes(e.target.value)}
                placeholder="#991b1b, 7-45"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">시술 금액</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="130000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-xs transition-colors"
            >
              차트 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
