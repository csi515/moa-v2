import React, { useCallback, useMemo, useState } from 'react';
import { Baby, CheckCircle2, Circle, Plus, Users } from 'lucide-react';
import { ActionableEmptyState } from '@/components/common/ActionableEmptyState';
import { WeekStripBar } from '@/components/common/WeekStripBar';
import { Button } from '@/shared/components/ui/Button';
import type { WeaningStageGuide } from '@/domain/babyFood/babyFoodLogic';
import { BabyProfileCard, type BabyProfile } from './BabyProfileCard';
import { BabyRegisterModal } from './BabyRegisterModal';
import { BabySettlementWidget } from './BabySettlementWidget';
import { BABY_FOOD_COOP_COPY } from './babyFoodCoopCopy';
import { WeaningGuideModal } from './WeaningGuideModal';

export const BabyFoodCoopManagementView: React.FC = () => {
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [selectedBabyIds, setSelectedBabyIds] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [dateManuallySelected, setDateManuallySelected] = useState(false);
  const [expenseEntered, setExpenseEntered] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGuideModal, setSelectedGuideModal] = useState<{
    guide: WeaningStageGuide;
    babyName: string;
  } | null>(null);

  const handleExpenseChange = useCallback((amount: number) => {
    setExpenseEntered(amount > 0);
  }, []);

  const checklist = useMemo(
    () => [
      {
        id: 'baby',
        label: BABY_FOOD_COOP_COPY.checklistBaby,
        done: babies.length > 0,
      },
      {
        id: 'date',
        label: BABY_FOOD_COOP_COPY.checklistDate,
        done: dateManuallySelected,
      },
      {
        id: 'expense',
        label: BABY_FOOD_COOP_COPY.checklistExpense,
        done: expenseEntered,
      },
    ],
    [babies.length, dateManuallySelected, expenseEntered]
  );
  const checklistDone = checklist.filter((c) => c.done).length;

  const toggleBabySelection = (id: string) => {
    setSelectedBabyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const participatingBabies = babies.filter((b) => selectedBabyIds.has(b.id));

  const handleAddNewBaby = (input: Omit<BabyProfile, 'id'>) => {
    const newBaby: BabyProfile = {
      ...input,
      id: `baby-${Date.now()}`,
    };
    setBabies((prev) => [newBaby, ...prev]);
    setSelectedBabyIds((prev) => new Set([...prev, newBaby.id]));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
              <Baby className="h-4 w-4" />
              {BABY_FOOD_COOP_COPY.heroBadge}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {BABY_FOOD_COOP_COPY.heroTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{BABY_FOOD_COOP_COPY.heroDescription}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            {BABY_FOOD_COOP_COPY.addBabyButton}
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">{BABY_FOOD_COOP_COPY.weekStripHint}</p>
        <WeekStripBar
          selectedDate={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            setDateManuallySelected(true);
          }}
        />
      </section>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
        <h2 className="text-sm font-black text-indigo-950">
          {BABY_FOOD_COOP_COPY.checklistTitle} ({checklistDone}/{checklist.length})
        </h2>
        <ul className="mt-3 space-y-2">
          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-slate-800"
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300" />
              )}
              <span className={item.done ? 'text-slate-500 line-through' : ''}>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                {BABY_FOOD_COOP_COPY.babiesHeading} ({babies.length}명)
              </h2>
            </div>
            {babies.length > 0 ? (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedBabyIds(new Set(babies.map((b) => b.id)))}
                  className="min-h-11 font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {BABY_FOOD_COOP_COPY.selectAll}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedBabyIds(new Set())}
                  className="min-h-11 text-slate-600 hover:text-slate-800"
                >
                  {BABY_FOOD_COOP_COPY.deselectAll}
                </button>
              </div>
            ) : null}
          </div>

          {babies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white">
              <ActionableEmptyState
                title={BABY_FOOD_COOP_COPY.emptyTitle}
                description={BABY_FOOD_COOP_COPY.emptyDescription}
                iconName="users"
                actionButton={{
                  label: BABY_FOOD_COOP_COPY.emptyAction,
                  onClick: () => setIsAddModalOpen(true),
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {babies.map((baby) => (
                <BabyProfileCard
                  key={baby.id}
                  baby={baby}
                  isSelected={selectedBabyIds.has(baby.id)}
                  onToggleSelect={toggleBabySelection}
                  showWeaningGuideModal={(guide, name) =>
                    setSelectedGuideModal({ guide, babyName: name })
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="sticky top-4 space-y-3 lg:col-span-5">
          <h2 className="text-base font-bold text-slate-900">
            {BABY_FOOD_COOP_COPY.settlementHeading}
          </h2>
          <BabySettlementWidget
            participatingBabies={participatingBabies}
            initialExpense={0}
            onExpenseChange={handleExpenseChange}
          />
        </div>
      </div>

      {selectedGuideModal ? (
        <WeaningGuideModal
          babyName={selectedGuideModal.babyName}
          guide={selectedGuideModal.guide}
          onClose={() => setSelectedGuideModal(null)}
        />
      ) : null}

      <BabyRegisterModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddNewBaby}
      />
    </div>
  );
};
