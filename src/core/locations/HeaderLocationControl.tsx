import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { handleListboxKeydown } from '@/shared/components/ui/modalFocus';
import { LOCATION_SCOPE_LABELS } from './locationLabels';

type LocationOption = { id: string | null; label: string };

/**
 * Header용 현재 지점 표시/전환. 기존 organization location 상태를 연결한다.
 */
export const HeaderLocationControl: React.FC = () => {
  const org = useOptionalOrganization();
  const [open, setOpen] = useState(false);
  const [activeOptionId, setActiveOptionId] = useState<string | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const closeListbox = useCallback((restoreTrigger: boolean) => {
    setOpen(false);
    if (restoreTrigger) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }, []);

  const options = useMemo<LocationOption[]>(() => {
    if (!org) return [];
    const rows: LocationOption[] = [];
    if (org.canClearLocation) {
      rows.push({ id: null, label: LOCATION_SCOPE_LABELS.all });
    }
    for (const row of org.locations) {
      rows.push({ id: row.id, label: row.name });
    }
    return rows;
  }, [org]);

  const selectedIndex = useMemo(() => {
    if (!org) return 0;
    const index = options.findIndex((row) =>
      org.currentLocation ? row.id === org.currentLocation.id : row.id === null
    );
    return index >= 0 ? index : 0;
  }, [options, org]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const items = list.querySelectorAll<HTMLElement>('[role="option"]');
    const current = items[selectedIndex] ?? items[0];
    current?.focus();
    setActiveOptionId(current?.id);
  }, [open, selectedIndex]);

  if (!org?.currentOrganization) return null;

  const {
    locations,
    currentLocation,
    selectLocation,
    locationLabel,
    canChangeLocation,
    canClearLocation,
  } = org;

  if (!canChangeLocation) {
    return (
      <p className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-medium min-w-0">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
        <span className="truncate">{locationLabel}</span>
      </p>
    );
  }

  const choose = (locationId: string | null) => {
    selectLocation(locationId);
    closeListbox(true);
  };

  return (
    <div className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (open) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={`${LOCATION_SCOPE_LABELS.change}: ${locationLabel}`}
        className="flex items-center gap-1 min-h-[32px] max-w-full rounded-lg px-1 -ml-1 text-[11px] sm:text-xs text-slate-600 font-semibold hover:bg-slate-100"
      >
        <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-600" aria-hidden />
        <span className="truncate">{locationLabel}</span>
        <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => closeListbox(true)} aria-hidden />
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label={LOCATION_SCOPE_LABELS.change}
            aria-activedescendant={activeOptionId}
            onKeyDown={(event) => {
              if (!listRef.current) return;
              handleListboxKeydown(event.nativeEvent, listRef.current, closeListbox);
            }}
            className="absolute left-0 top-full mt-1 z-50 min-w-[11rem] max-w-[16rem] rounded-xl border border-slate-200 bg-white shadow-lg p-1"
          >
            {canClearLocation && (
              <li>
                <button
                  id={`${listboxId}-all`}
                  type="button"
                  role="option"
                  aria-selected={!currentLocation}
                  tabIndex={!currentLocation ? 0 : -1}
                  onClick={() => choose(null)}
                  onFocus={() => setActiveOptionId(`${listboxId}-all`)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {LOCATION_SCOPE_LABELS.all}
                  {!currentLocation && <Check className="w-4 h-4 text-teal-600" />}
                </button>
              </li>
            )}
            {locations.map((row) => {
              const selected = currentLocation?.id === row.id;
              return (
                <li key={row.id}>
                  <button
                    id={`${listboxId}-${row.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => choose(row.id)}
                    onFocus={() => setActiveOptionId(`${listboxId}-${row.id}`)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span className="truncate">{row.name}</span>
                    {selected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
