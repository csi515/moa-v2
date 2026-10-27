import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  COMMAND_CATALOG,
  filterCommands,
  isPaletteShortcut,
  moveCommandIndex,
  type CommandItem,
} from './commandPalette';
import { AppDrawer } from './AppDrawer';

export function requestCommandPalette(): void {
  window.dispatchEvent(new Event('moa:command-palette'));
}

export function GlobalCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [member, setMember] = useState<CommandItem | null>(null);
  const results = useMemo(() => filterCommands(query, COMMAND_CATALOG), [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isPaletteShortcut(event)) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === 'Escape') {
        setOpen(false);
        setMember(null);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('moa:command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('moa:command-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [query, open]);

  function choose(item: CommandItem) {
    if (item.group === 'member') {
      setMember(item);
      setOpen(false);
      return;
    }
    setOpen(false);
    navigate(item.href);
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40 sm:items-center sm:justify-center" role="dialog">
          <div className="max-h-[80dvh] w-full max-w-lg rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
            <input
              autoFocus
              value={query}
              placeholder="회원, 시간표, 출결 패드"
              className="min-h-12 w-full rounded-xl border px-3"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setIndex((current) => moveCommandIndex(current, results.length, 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setIndex((current) => moveCommandIndex(current, results.length, -1));
                } else if (event.key === 'Enter' && results[index]) {
                  event.preventDefault();
                  choose(results[index]);
                }
              }}
            />
            <ul className="mt-3 max-h-80 overflow-auto">
              {results.map((item, itemIndex) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`min-h-12 w-full rounded-xl px-3 text-left text-sm ${itemIndex === index ? 'bg-slate-900 text-white' : ''}`}
                    onClick={() => choose(item)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <AppDrawer open={Boolean(member)} title={member?.label ?? '회원'} onClose={() => setMember(null)}>
        <p className="text-sm text-slate-600">목록 스크롤과 필터는 그대로 두고, 이 시트에서 회원 정보를 확인합니다.</p>
      </AppDrawer>
    </>
  );
}
