import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { Plus, Save, Utensils } from 'lucide-react';
import { mealDisposeAt } from './complianceUtils';
import { MEAL_SAMPLE_HOLD_HOURS } from './types';

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export const MealSampleView: FC = () => {
  const { showToast, currentUser } = useApp();
  const refreshKey = useStorageRefresh();
  const logs = useMemo(
    () => StorageService.getMealSampleLogs().sort((a, b) => b.storedAt.localeCompare(a.storedAt)),
    [refreshKey]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuName, setMenuName] = useState('');

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!menuName.trim()) {
      showToast('식단 이름을 입력해 주세요.', 'error');
      return;
    }
    const storedAt = new Date().toISOString();
    StorageService.saveMealSampleLog({
      menuName: menuName.trim(),
      storedAt,
      disposeAt: mealDisposeAt(storedAt),
      teacherId: currentUser.staffId || undefined,
      teacherName: currentUser.name,
    });
    showToast('보존식 시각이 저장되었습니다.', 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setMenuName('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          보존식 기록
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState
            icon={<Utensils className="w-10 h-10" />}
            title="보존식 기록이 없습니다"
            description={`저장 시각부터 ${MEAL_SAMPLE_HOLD_HOURS}시간 뒤 폐기 시각을 표시합니다.`}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => {
              const remainingMs = new Date(log.disposeAt).getTime() - Date.now();
              const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
              return (
                <li key={log.id} className="px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{log.menuName}</p>
                  <p className="text-[11px] text-slate-500 mt-1">저장 {formatWhen(log.storedAt)}</p>
                  <p className="text-[11px] text-slate-500">폐기 {formatWhen(log.disposeAt)}</p>
                  <p className={`text-[11px] font-bold mt-1 ${remainingHours > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                    {remainingHours > 0 ? `${remainingHours}시간 남음` : '폐기 시각 지남'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="보존식">
        <form onSubmit={handleSave} className="space-y-3">
          <FormField label="식단">
            <input
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <p className="text-[11px] text-slate-500">저장하면 지금 시각과 {MEAL_SAMPLE_HOLD_HOURS}시간 뒤 폐기 시각이 남습니다.</p>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </form>
      </Modal>
    </div>
  );
};
