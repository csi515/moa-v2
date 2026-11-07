import React, { useMemo, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  User,
  ArrowRightLeft,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useOpsTable } from '@/hooks/useOpsTable';
import {
  transitionRentalStatus,
  type EquipmentItem,
  type RentalStatus,
  type RentalAction,
} from '../domain/rentalEquipmentEngine';

type RentalRow = {
  id: string;
  name: string;
  asset_tag: string;
  status: RentalStatus;
  current_renter_id?: string | null;
  rented_at?: string | null;
  due_at?: string | null;
  damage_note?: string | null;
  department_id?: string | null;
};

function toItem(row: RentalRow): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    assetTag: row.asset_tag,
    status: row.status,
    currentRenterId: row.current_renter_id ?? undefined,
    rentedAt: row.rented_at ?? undefined,
    dueAt: row.due_at ?? undefined,
    damageNote: row.damage_note ?? undefined,
  };
}

function toRow(item: EquipmentItem): Omit<RentalRow, 'id'> & { id?: string } {
  return {
    id: item.id,
    name: item.name,
    asset_tag: item.assetTag,
    status: item.status,
    current_renter_id: item.currentRenterId ?? null,
    rented_at: item.rentedAt ?? null,
    due_at: item.dueAt ?? null,
    damage_note: item.damageNote ?? null,
    department_id: null,
  };
}

export const RentalEquipmentManagementView: React.FC = () => {
  const { rows, loading, error, create, update } = useOpsTable<RentalRow>('rental_equipments');
  const items = useMemo(() => rows.map(toItem), [rows]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [rentModalItem, setRentModalItem] = useState<EquipmentItem | null>(null);

  const handleAction = (item: EquipmentItem, action: RentalAction, payload?: { note?: string }) => {
    const res = transitionRentalStatus(item, action, payload);
    if (!res.success) {
      showToast(res.error || '상태 변경에 실패했습니다.', 'warning');
      return;
    }
    void update(item.id, toRow(res.nextItem)).then(() => {
      showToast(`'${item.name}' 상태가 변경되었습니다.`, 'success');
    }).catch((cause) => {
      showToast(cause instanceof Error ? cause.message : '저장 실패', 'error');
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchSearch =
        !searchTerm.trim() ||
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.currentRenterId && i.currentRenterId.includes(searchTerm));
      const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, searchTerm, statusFilter]);

  const countByStatus = useMemo(() => {
    return {
      AVAILABLE: items.filter((i) => i.status === 'AVAILABLE').length,
      RENTED: items.filter((i) => i.status === 'RENTED').length,
      DAMAGED: items.filter((i) => i.status === 'DAMAGED').length,
    };
  }, [items]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-semibold mb-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>비품·장비 대여 관리</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">장비·물품 대여함</h1>
          <p className="text-xs text-slate-500 mt-1">
            골프채, 촬영 장비, 볼링화, 보드게임, 렌탈 물품의 대여/반납 및 파손을 실시간 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>신규 대여 비품 등록</span>
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-slate-400">대여 가능</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{countByStatus.AVAILABLE}개</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-slate-400">현재 대여 중</p>
          <p className="text-2xl font-black text-cyan-600 mt-1">{countByStatus.RENTED}개</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-slate-400">수리·점검 필요</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{countByStatus.DAMAGED}개</p>
        </div>
      </div>

      {/* 필터 및 검색 바 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="비품명, 관리번호(바코드), 대여자 검색"
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'AVAILABLE', 'RENTED', 'DAMAGED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL'
                ? '전체'
                : st === 'AVAILABLE'
                ? '대여가능'
                : st === 'RENTED'
                ? '대여중'
                : '파손/점검'}
            </button>
          ))}
        </div>
      </div>

      {/* 비품 목록 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-5 py-3.5">관리 번호</th>
                <th className="px-5 py-3.5">비품 / 장비명</th>
                <th className="px-5 py-3.5">상태</th>
                <th className="px-5 py-3.5">대여자 / 반납 예정</th>
                <th className="px-5 py-3.5 text-right">대여 관리 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                    {item.assetTag}
                  </td>
                  <td className="px-5 py-4 font-extrabold text-slate-900">
                    {item.name}
                    {item.damageNote && (
                      <p className="text-[11px] font-normal text-rose-500 mt-0.5">
                        ⚠️ {item.damageNote}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.status === 'AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'RENTED'
                          ? 'bg-cyan-50 text-cyan-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {item.status === 'AVAILABLE'
                        ? '대여 가능'
                        : item.status === 'RENTED'
                        ? '대여 중'
                        : item.status === 'DAMAGED'
                        ? '파손 / 수리 중'
                        : '분실'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {item.status === 'RENTED' ? (
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 block">{item.currentRenterId}</span>
                        {item.dueAt && (
                          <span className="text-[11px] text-slate-400">
                            반납 예정: {new Date(item.dueAt).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {item.status === 'AVAILABLE' && (
                        <button
                          type="button"
                          onClick={() => setRentModalItem(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold transition-colors"
                        >
                          대여 등록
                        </button>
                      )}

                      {item.status === 'RENTED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAction(item, 'RETURN')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors"
                          >
                            반납 완료
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAction(item, 'REPORT_DAMAGE', { note: '장비 파손 접수' });
                              showToast('장비 파손이 접수되었습니다.', 'warning');
                            }}
                            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-colors"
                          >
                            파손
                          </button>
                        </>
                      )}

                      {item.status === 'DAMAGED' && (
                        <button
                          type="button"
                          onClick={() => handleAction(item, 'REPAIR_OR_RESTOCK')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors flex items-center gap-1"
                        >
                          <Wrench className="w-3 h-3" />
                          수리 완료 (입고)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 대여 모달 */}
      {rentModalItem && (
        <RentActionModal
          item={rentModalItem}
          onClose={() => setRentModalItem(null)}
          onConfirm={(renterId, dueDays) => {
            const dueAt = new Date(Date.now() + dueDays * 24 * 3600 * 1000).toISOString();
            const res = transitionRentalStatus(rentModalItem, 'RENT', {
              renterId,
              dueAt,
            });
            if (res.success) {
              void update(rentModalItem.id, toRow(res.nextItem)).then(() => {
              showToast(`'${rentModalItem.name}' 대여가 완료되었습니다.`, 'success');
              });
            }
            setRentModalItem(null);
          }}
        />
      )}

      {/* 신규 등록 모달 */}
      {isNewModalOpen && (
        <NewEquipmentModal
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(newItem) => {
            void create(toRow(newItem)).then(() => {
              setIsNewModalOpen(false);
            showToast(`'${newItem.name}' 비품이 등록되었습니다.`, 'success');
            }).catch((cause) => {
              showToast(cause instanceof Error ? cause.message : '등록 실패', 'error');
            });
          }}
        />
      )}
    </div>
  );
};

const RentActionModal: React.FC<{
  item: EquipmentItem;
  onClose: () => void;
  onConfirm: (renterId: string, dueDays: number) => void;
}> = ({ item, onClose, onConfirm }) => {
  const [renterName, setRenterName] = useState('');
  const [dueDays, setDueDays] = useState('1');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
        <h3 className="text-base font-extrabold text-slate-900">비품 대여 처리</h3>
        <p className="text-xs text-slate-500 font-medium">대여 품목: {item.name}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">대여자 성명 / 회원명</label>
            <input
              type="text"
              value={renterName}
              onChange={(e) => setRenterName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">대여 기간 (일)</label>
            <select
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="1">당일 / 1일</option>
              <option value="2">2일</option>
              <option value="3">3일</option>
              <option value="7">1주일 (7일)</option>
              <option value="14">2주일 (14일)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-500">
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (!renterName.trim()) {
                showToast('대여자 이름을 입력하세요.', 'warning');
                return;
              }
              onConfirm(renterName.trim(), Number(dueDays) || 1);
            }}
            className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl text-xs hover:bg-cyan-700"
          >
            대여 확정
          </button>
        </div>
      </div>
    </div>
  );
};

const NewEquipmentModal: React.FC<{
  onClose: () => void;
  onCreated: (item: EquipmentItem) => void;
}> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [assetTag, setAssetTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: EquipmentItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      assetTag: assetTag.trim() || `EQ-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'AVAILABLE',
    };
    onCreated(newItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
        <h3 className="text-base font-extrabold text-slate-900">신규 대여 비품 등록</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">비품 / 장비명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 니콘 D850 바디 단품"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">관리번호 (자산태그)</label>
            <input
              type="text"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              placeholder="예: CAM-BODY-01 (비워두면 자동 생성)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-500">
              취소
            </button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl text-xs hover:bg-cyan-700">
              비품 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
