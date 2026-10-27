import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageSearch,
  Search,
  Filter,
  PlusCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Gift,
  MapPin,
  Calendar,
  ShieldCheck,
  User,
  Phone,
  Tag,
  Archive,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateExpiryDate,
  calculateDaysRemaining,
  evaluateLostItemEffectiveStatus,
  filterItemsExpiringSoon,
  summarizeLostAndFound,
  type LostItem,
  type LostItemCategory,
  type LostItemStatus,
} from '../domain/lostFoundEngine';

const STORAGE_KEY_LOST_ITEMS = 'moa_lost_found_items';

const DEFAULT_LOST_ITEMS: LostItem[] = [
  {
    id: 'item-1',
    itemCode: 'LF-202610-001',
    title: '애플워치 시리즈 8 (미드나이트 45mm)',
    category: 'electronics',
    foundLocation: '남자 락커룸 42번 앞 벤치',
    foundAt: '2026-10-10',
    storageLocation: '안내데스크 1번 금고',
    retentionDays: 30,
    status: 'STORED',
    notes: '검정 스포츠 루프 스트랩 착용 상태',
  },
  {
    id: 'item-2',
    itemCode: 'LF-202610-002',
    title: '나이키 메트콘 9 트레이닝화 (275mm)',
    category: 'clothing',
    foundLocation: '웨이트 프리웨이트존 벤치 밑',
    foundAt: '2026-09-18', // 30일 보관 시 2026-10-18 만료 예정 (임박)
    storageLocation: '분실물 보관대 B구역 2단',
    retentionDays: 30,
    status: 'STORED',
    notes: '형광 녹색 포인트 컬러',
  },
  {
    id: 'item-3',
    itemCode: 'LF-202610-003',
    title: '보테가 베네타 카드 지갑 (블랙 카세트)',
    category: 'card_wallet',
    foundLocation: '인포데스크 정산 단말기 앞',
    foundAt: '2026-10-12',
    storageLocation: '사무실 내 금고',
    retentionDays: 30,
    status: 'STORED',
    notes: '신분증 및 체크카드 2장 동봉 확인',
  },
  {
    id: 'item-4',
    itemCode: 'LF-202609-015',
    title: '하이드로 플라스크 텀블러 (화이트 946ml)',
    category: 'other',
    foundLocation: '필라테스 리포머 3번 룸',
    foundAt: '2026-09-01', // 30일 경과하여 만료
    storageLocation: '분실물 보관대 A구역',
    retentionDays: 30,
    status: 'STORED', // 엔진에서 EXPIRED로 평가됨
    notes: '고양이 스티커 부착',
  },
  {
    id: 'item-5',
    itemCode: 'LF-202610-005',
    title: '소니 WH-1000XM5 무선 헤드폰',
    category: 'electronics',
    foundLocation: '유산소 트레드밀 12번 거치대',
    foundAt: '2026-10-05',
    storageLocation: '안내데스크 1번 금고',
    retentionDays: 30,
    status: 'CLAIMED',
    claimant: {
      name: '이수민',
      phone: '010-3491-9921',
      claimedAt: '2026-10-06T15:30:00Z',
      verificationMethod: 'id_check',
      note: '스마트폰 블루투스 기기 페어링 확인 후 인계 완료',
    },
  },
];

const CATEGORY_LABELS: Record<LostItemCategory, string> = {
  electronics: '전자기기',
  clothing: '의류/신발',
  card_wallet: '지갑/카드',
  accessory: '귀금속/잡화',
  sports_equipment: '운동용품',
  other: '기타',
};

export const LostFoundManagementView: React.FC = () => {
  const [items, setItems] = useState<LostItem[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_LOST_ITEMS));
      return saved ? JSON.parse(saved) : DEFAULT_LOST_ITEMS;
    } catch {
      return DEFAULT_LOST_ITEMS;
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 신규 등록 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<LostItemCategory>('electronics');
  const [newFoundLocation, setNewFoundLocation] = useState('');
  const [newStorageLocation, setNewStorageLocation] = useState('안내데스크 1번 보관함');
  const [newNotes, setNewNotes] = useState('');

  // 수령 처리 모달 상태
  const [claimingItem, setClaimingItem] = useState<LostItem | null>(null);
  const [claimantName, setClaimantName] = useState('');
  const [claimantPhone, setClaimantPhone] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'id_check' | 'security_code' | 'photo_proof'>('id_check');
  const [claimantNote, setClaimantNote] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_LOST_ITEMS), JSON.stringify(items));
    } catch {}
  }, [items]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const summary = useMemo(() => {
    return summarizeLostAndFound(items, todayStr);
  }, [items, todayStr]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const effectiveStatus = evaluateLostItemEffectiveStatus(item, todayStr);

      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      if (selectedStatusFilter === 'EXPIRING_SOON') {
        const expiry = calculateExpiryDate(item.foundAt, item.retentionDays);
        const rem = calculateDaysRemaining(expiry, todayStr);
        if (effectiveStatus !== 'STORED' && effectiveStatus !== 'EXPIRED') return false;
        if (rem > 7) return false;
      } else if (selectedStatusFilter === 'STORED' && effectiveStatus !== 'STORED') {
        return false;
      } else if (selectedStatusFilter === 'CLAIMED' && effectiveStatus !== 'CLAIMED') {
        return false;
      } else if (selectedStatusFilter === 'EXPIRED' && effectiveStatus !== 'EXPIRED') {
        return false;
      } else if (
        selectedStatusFilter === 'DISPOSED_DONATED' &&
        effectiveStatus !== 'DISPOSED' &&
        effectiveStatus !== 'DONATED'
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.itemCode.toLowerCase().includes(q) ||
          item.foundLocation.toLowerCase().includes(q) ||
          (item.claimant?.name && item.claimant.name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [items, selectedCategory, selectedStatusFilter, searchQuery, todayStr]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newFoundLocation.trim()) {
      showToast('품목명과 습득 장소를 입력해주세요.', 'error');
      return;
    }

    const newItem: LostItem = {
      id: `item-${Date.now()}`,
      itemCode: `LF-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(
        items.length + 1
      ).padStart(3, '0')}`,
      title: newTitle.trim(),
      category: newCategory,
      foundLocation: newFoundLocation.trim(),
      foundAt: todayStr,
      storageLocation: newStorageLocation.trim() || '안내데스크 보관함',
      retentionDays: 30,
      status: 'STORED',
      notes: newNotes.trim() || undefined,
    };

    setItems((prev) => [newItem, ...prev]);
    setShowAddModal(false);
    setNewTitle('');
    setNewFoundLocation('');
    setNewNotes('');
    showToast(`분실물 [${newItem.itemCode}]이 등록되었습니다. (30일 보관)`, 'success');
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingItem || !claimantName.trim() || !claimantPhone.trim()) {
      showToast('수령인 성함과 연락처를 입력해주세요.', 'error');
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === claimingItem.id) {
          return {
            ...item,
            status: 'CLAIMED',
            claimant: {
              name: claimantName.trim(),
              phone: claimantPhone.trim(),
              claimedAt: new Date().toISOString(),
              verificationMethod,
              note: claimantNote.trim() || undefined,
            },
          };
        }
        return item;
      })
    );

    showToast(`[${claimingItem.title}] 본인 인계 및 수령 처리가 완료되었습니다.`, 'success');
    setClaimingItem(null);
    setClaimantName('');
    setClaimantPhone('');
    setClaimantNote('');
  };

  const handleDisposeItem = (item: LostItem, action: 'disposed' | 'donated') => {
    const label = action === 'disposed' ? '폐기' : '기부';
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === item.id) {
          return {
            ...it,
            status: action === 'disposed' ? 'DISPOSED' : 'DONATED',
            disposition: {
              action,
              disposedAt: new Date().toISOString(),
              note: `보관 기한 30일 경과에 따른 규정 ${label} 처리`,
            },
          };
        }
        return it;
      })
    );
    showToast(`[${item.title}] ${label} 처리가 완료되었습니다.`, 'success');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <PackageSearch className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">시설 분실물·습득물 보관 관리</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            락커룸·샤워실·타석 등 시설 내 습득물의 30일 법적 보관 기한 추적 및 반환/폐기를 체계화합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            습득물 등록
          </button>
        </div>
      </div>

      {/* 종합 메트릭 카드 4종 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">총 등록 습득물</span>
            <Archive className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{summary.totalCount}건</div>
          <p className="text-xs text-slate-400 mt-1">누적 관리 대장</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">현재 시설 보관 중</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{summary.storedCount}건</div>
          <p className="text-xs text-slate-400 mt-1">데스크 및 보관실 보관</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-sm font-medium">보관 기한 임박 (7일 내)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{summary.expiringSoonCount}건</div>
          <p className="text-xs text-amber-600 mt-1">30일 경과 전 안내/폐기 대기</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">수령 반환 완료</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {summary.claimedCount}건
            <span className="text-sm font-normal text-slate-500 ml-1.5">
              ({summary.claimRate}%)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">본인 인계 완료율</p>
        </div>
      </div>

      {/* 필터 및 검색 바 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* 상태 필터 */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">전체 상태</option>
            <option value="STORED">보관 중</option>
            <option value="EXPIRING_SOON">⚠️ 만료 임박 (7일 이하)</option>
            <option value="EXPIRED">만료됨 (기한 초과)</option>
            <option value="CLAIMED">수령 반환 완료</option>
            <option value="DISPOSED_DONATED">폐기/기부 처리됨</option>
          </select>

          {/* 카테고리 필터 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">전체 카테고리</option>
            <option value="electronics">전자기기</option>
            <option value="clothing">의류/신발</option>
            <option value="card_wallet">지갑/카드</option>
            <option value="accessory">귀금속/잡화</option>
            <option value="sports_equipment">운동용품</option>
            <option value="other">기타</option>
          </select>
        </div>

        {/* 검색 인풋 */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="품목명, 습득장소, 관리코드 검색..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* 분실물 리스트 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <PackageSearch className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">해당 조건의 분실물이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase bg-slate-50">
                  <th className="py-3 px-4">관리코드 / 품목</th>
                  <th className="py-3 px-4">카테고리</th>
                  <th className="py-3 px-4">습득 장소 & 일시</th>
                  <th className="py-3 px-4">보관 위치</th>
                  <th className="py-3 px-4">보관 기한 (D-Day)</th>
                  <th className="py-3 px-4">상태</th>
                  <th className="py-3 px-4 text-center">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const effectiveStatus = evaluateLostItemEffectiveStatus(item, todayStr);
                  const expiryDate = calculateExpiryDate(item.foundAt, item.retentionDays);
                  const daysRemaining = calculateDaysRemaining(expiryDate, todayStr);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      {/* 관리코드 및 품목명 */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {item.itemCode}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-slate-500 mt-1 italic">
                            특징: {item.notes}
                          </div>
                        )}
                      </td>

                      {/* 카테고리 */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </td>

                      {/* 습득 장소 & 일시 */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.foundLocation}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{item.foundAt} 습득</span>
                        </div>
                      </td>

                      {/* 보관 위치 */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        {item.storageLocation}
                      </td>

                      {/* 보관 기한 D-Day */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {effectiveStatus === 'CLAIMED' ? (
                          <span className="text-xs text-slate-400">수령 완료</span>
                        ) : effectiveStatus === 'DISPOSED' || effectiveStatus === 'DONATED' ? (
                          <span className="text-xs text-slate-400">처리 종결</span>
                        ) : daysRemaining <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            만료됨 (D+{Math.abs(daysRemaining)})
                          </span>
                        ) : daysRemaining <= 7 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            D-{daysRemaining} (임박)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                            D-{daysRemaining} ({expiryDate} 만료)
                          </span>
                        )}
                      </td>

                      {/* 상태 배지 */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {effectiveStatus === 'STORED' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            보관 중
                          </span>
                        )}
                        {effectiveStatus === 'EXPIRED' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            보관 만료
                          </span>
                        )}
                        {effectiveStatus === 'CLAIMED' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            본인 수령
                          </span>
                        )}
                        {effectiveStatus === 'DISPOSED' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                            폐기 완료
                          </span>
                        )}
                        {effectiveStatus === 'DONATED' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            기부 완료
                          </span>
                        )}
                      </td>

                      {/* 액션 버튼 */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {effectiveStatus === 'STORED' || effectiveStatus === 'EXPIRED' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setClaimingItem(item);
                                setClaimantName('');
                                setClaimantPhone('');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition"
                            >
                              수령 확인
                            </button>
                            {effectiveStatus === 'EXPIRED' && (
                              <button
                                onClick={() => handleDisposeItem(item, 'disposed')}
                                className="px-2 py-1 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50 transition"
                                title="규정 폐기"
                              >
                                폐기
                              </button>
                            )}
                          </div>
                        ) : effectiveStatus === 'CLAIMED' && item.claimant ? (
                          <div className="text-xs text-slate-500">
                            {item.claimant.name} ({item.claimant.phone.slice(-4)})
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 신규 습득물 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">신규 분실물·습득물 등록</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">품목명</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 애플워치 시리즈 8, 나이키 운동화 등"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">카테고리</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as LostItemCategory)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="electronics">전자기기</option>
                    <option value="clothing">의류/신발</option>
                    <option value="card_wallet">지갑/카드</option>
                    <option value="accessory">귀금속/잡화</option>
                    <option value="sports_equipment">운동용품</option>
                    <option value="other">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    보관 장소
                  </label>
                  <input
                    type="text"
                    value={newStorageLocation}
                    onChange={(e) => setNewStorageLocation(e.target.value)}
                    placeholder="예: 안내데스크 1번 금고"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">습득 장소</label>
                <input
                  type="text"
                  required
                  value={newFoundLocation}
                  onChange={(e) => setNewFoundLocation(e.target.value)}
                  placeholder="예: 남자 락커룸 42번 앞, 샤워실 선반, 타석 5번 등"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  특이사항 및 외관 특징
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="색상, 흠집, 케이스 착용 여부 등 식별 특징"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  등록 즉시 법적 기본 보관 기한 30일이 카운트다운되며, 만료 7일 전 안내 알림이 활성화됩니다.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 본인 수령 확인 모달 */}
      {claimingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">본인 수령 및 인계 처리</h3>
              <button
                onClick={() => setClaimingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <div className="font-semibold text-slate-900">{claimingItem.title}</div>
              <div className="text-xs text-slate-500 mt-1">
                관리코드: {claimingItem.itemCode} | 습득장소: {claimingItem.foundLocation}
              </div>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  수령인 성함
                </label>
                <input
                  type="text"
                  required
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">연락처</label>
                <input
                  type="tel"
                  required
                  value={claimantPhone}
                  onChange={(e) => setClaimantPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  본인 확인 방법
                </label>
                <select
                  value={verificationMethod}
                  onChange={(e) =>
                    setVerificationMethod(e.target.value as 'id_check' | 'security_code' | 'photo_proof')
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="id_check">신분증 및 회원 대조 확인</option>
                  <option value="security_code">비밀번호 / 화면 잠금 해제 확인</option>
                  <option value="photo_proof">보유 사진 및 특징 일치 확인</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  인계 비고 (선택)
                </label>
                <input
                  type="text"
                  value={claimantNote}
                  onChange={(e) => setClaimantNote(e.target.value)}
                  placeholder="예: 락커 카드키 지참 확인"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setClaimingItem(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  인계 확인 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
