import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  PlusCircle,
  Clock,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  Scissors,
  Palette,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateStyleQuotation,
  filterPortfolio,
  type PortfolioStyleItem,
  type StyleCategory,
  type UpsellOption,
} from '../domain/treatmentPortfolioEngine';

const STORAGE_KEY_PORTFOLIO = 'moa_treatment_portfolio_items_data';

const DEFAULT_STYLES: PortfolioStyleItem[] = [
  {
    id: 'style-1',
    title: '시그니처 빌드펌 & 페이스라인 컷',
    category: 'hair_perm',
    designerName: '차홍 실장',
    basePrice: 190000,
    estimatedMinutes: 120,
    description: '얼굴형을 갸름하게 감싸주는 사이드뱅과 자연스러운 S컬 볼륨감',
    upsellOptions: [
      {
        id: 'opt-1',
        name: '시세이도 서브리믹 수분 단백질 영양',
        price: 50000,
        additionalMinutes: 20,
      },
      {
        id: 'opt-2',
        name: '두피 진정 아로마 쿨링 스파',
        price: 30000,
        additionalMinutes: 15,
      },
    ],
  },
  {
    id: 'style-2',
    title: '애쉬 베이지 & 옴브레 발레아쥬',
    category: 'hair_color',
    designerName: '태풍 부원장',
    basePrice: 240000,
    estimatedMinutes: 150,
    description: '탈색 1회 후 붉은기를 완벽히 잡은 프리미엄 애쉬 베이지 그라데이션',
    upsellOptions: [
      {
        id: 'opt-3',
        name: '올라플렉스 본드 빌더 결합 케어',
        price: 60000,
        additionalMinutes: 25,
      },
      {
        id: 'opt-4',
        name: '보색 샴푸 & 홈케어 트리트먼트 증정',
        price: 35000,
        additionalMinutes: 0,
      },
    ],
  },
  {
    id: 'style-3',
    title: '은하수 자석 젤 & 스와로브스키 풀스톤',
    category: 'nail_art',
    designerName: '유리 마스터',
    basePrice: 85000,
    estimatedMinutes: 70,
    description: '각도에 따라 다르게 반짝이는 오묘한 자석 펄과 고급스러운 V컷 스톤',
    upsellOptions: [
      {
        id: 'opt-5',
        name: '오버레이 두께 보강 & 유지력 강화 코팅',
        price: 15000,
        additionalMinutes: 10,
      },
      {
        id: 'opt-6',
        name: '프리미엄 큐티클 스파 영양 오일',
        price: 10000,
        additionalMinutes: 5,
      },
    ],
  },
];

export const TreatmentPortfolioView: React.FC = () => {
  const [styles, setStyles] = useState<PortfolioStyleItem[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_PORTFOLIO));
      return saved ? JSON.parse(saved) : DEFAULT_STYLES;
    } catch {
      return DEFAULT_STYLES;
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState<string>(DEFAULT_STYLES[0].id);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_PORTFOLIO), JSON.stringify(styles));
    } catch {}
  }, [styles]);

  const selectedStyle = styles.find((s) => s.id === selectedStyleId) || styles[0];

  // 스타일 변경 시 옵션 초기화
  useEffect(() => {
    setSelectedOptionIds([]);
  }, [selectedStyleId]);

  const quotation = useMemo(() => {
    return calculateStyleQuotation(selectedStyle, selectedOptionIds);
  }, [selectedStyle, selectedOptionIds]);

  const filteredStyles = useMemo(() => {
    return filterPortfolio(styles, selectedCategory, searchQuery);
  }, [styles, selectedCategory, searchQuery]);

  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleApplyQuotation = () => {
    showToast(
      `[${selectedStyle.title}] 견적 확정: 총 ${quotation.finalEstimatedPrice.toLocaleString()}원 (예상 ${quotation.totalEstimatedMinutes}분)`,
      'success'
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-pink-100 text-pink-700 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              시술 스타일북 & 객단가 업셀링 갤러리
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            태블릿 화면으로 최신 룩북을 제시하고, 영양·파츠 등 프리미엄 옵션 추가를 유도하여 매장 객단가를 높입니다.
          </p>
        </div>
      </div>

      {/* 카테고리 필터 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: '전체 스타일' },
            { id: 'hair_perm', label: '헤어 펌' },
            { id: 'hair_color', label: '헤어 염색' },
            { id: 'nail_art', label: '네일 아트' },
            { id: 'skin_care', label: '스킨 케어' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="스타일명, 디자이너 검색..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* 스타일 룩북 카드 그리드 & 업셀링 견적 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측 2칸: 스타일북 카드 리스트 */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredStyles.map((item) => {
            const isSelected = item.id === selectedStyle.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedStyleId(item.id)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition shadow-sm flex flex-col justify-between ${
                  isSelected
                    ? 'border-pink-500 ring-2 ring-pink-200 bg-pink-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-full h-36 bg-gradient-to-br from-pink-100 to-indigo-50 rounded-lg flex items-center justify-center text-slate-400 mb-3">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-pink-600 font-semibold">{item.designerName}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      약 {item.estimatedMinutes}분
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <div className="pt-3 border-t mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">기본 시술가</span>
                  <span className="text-sm font-bold text-slate-900">
                    {item.basePrice.toLocaleString()}원
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 우측 1칸: 고객 상담 & 객단가 업셀링 견적 패널 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="border-b pb-3">
            <span className="text-xs font-semibold text-pink-600">현장 실시간 상담 견적</span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{selectedStyle.title}</h2>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span>기본 시술가</span>
              <span className="font-semibold text-slate-900">
                {selectedStyle.basePrice.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 추천 업셀링 옵션 체크박스 */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>추천 프리미엄 케어 (객단가 UP)</span>
            </h4>

            {selectedStyle.upsellOptions.length === 0 ? (
              <p className="text-xs text-slate-400">등록된 추가 옵션이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {selectedStyle.upsellOptions.map((opt) => {
                  const isChecked = selectedOptionIds.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'border-pink-500 bg-pink-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOption(opt.id)}
                        className="mt-0.5 text-pink-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{opt.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          +{opt.additionalMinutes}분 소요
                        </div>
                      </div>
                      <span className="font-bold text-pink-600">
                        +{opt.price.toLocaleString()}원
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 최종 견적 총액 & 업셀링 마진 요약 */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>추가 옵션 합계</span>
              <span className="font-semibold text-pink-600">
                +{quotation.totalUpsellAmount.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>총 소요 예상 시간</span>
              <span className="font-semibold text-slate-900">
                {quotation.totalEstimatedMinutes}분
              </span>
            </div>
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">최종 상담 견적액</span>
              <span className="text-xl font-black text-pink-600">
                {quotation.finalEstimatedPrice.toLocaleString()}원
              </span>
            </div>
          </div>

          <button
            onClick={handleApplyQuotation}
            className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            시술 예약 및 결제 견적 확정
          </button>
        </div>
      </div>
    </div>
  );
};
