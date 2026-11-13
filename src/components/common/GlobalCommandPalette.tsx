import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import {
  COMMAND_CATALOG,
  filterCommands,
  type CommandItem,
} from './commandPalette';
import { AppDrawer } from './AppDrawer';
import { useMoaHotkeys, useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

export function requestCommandPalette(): void {
  window.dispatchEvent(new Event('moa:command-palette'));
}

export function GlobalCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [member, setMember] = useState<CommandItem | null>(null);

  // 1. 선언적 단축키 바인딩 (Ctrl+K, Cmd+K)
  useMoaHotkeys(
    ['mod+k', 'ctrl+k'],
    (e) => {
      e.preventDefault();
      setOpen((prev) => !prev);
    },
    { enableOnFormTags: true }
  );

  // 2. 모달 열림 시 ESC 닫기
  useEscapeKey(() => {
    if (open) {
      setOpen(false);
      setMember(null);
    }
  }, open);

  // 3. 커스텀 이벤트 리스너 연동
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('moa:command-palette', onOpen);
    return () => {
      window.removeEventListener('moa:command-palette', onOpen);
    };
  }, []);

  function choose(item: CommandItem) {
    if (item.group === 'member') {
      setMember(item);
      setOpen(false);
      return;
    }
    setOpen(false);
    navigate(item.href);
  }

  // 한국어 초성 검색 호환을 위해 기존 filterCommands 활용
  const filteredItems = filterCommands(query, COMMAND_CATALOG);

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="통합 커맨드 팔레트"
        className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center bg-black/40 p-0 sm:p-4"
      >
        <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center border-b border-slate-100 px-3.5 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="회원, 시간표, 출결 패드..."
              className="h-11 w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="hidden sm:inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 scroll-py-2">
            <Command.Empty className="py-6 text-center text-xs text-slate-400">
              일치하는 메뉴나 회원이 없습니다.
            </Command.Empty>

            <Command.Group heading="바로가기" className="text-[11px] font-bold text-slate-400 px-2 py-1">
              {filteredItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => choose(item)}
                  className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors aria-selected:bg-slate-900 aria-selected:text-white"
                >
                  <span>{item.label}</span>
                  <span className="text-[11px] opacity-60 font-mono">
                    {item.group === 'member' ? '회원' : '이동'}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </div>
      </Command.Dialog>

      <AppDrawer
        open={Boolean(member)}
        title={member?.label ?? '회원'}
        onClose={() => setMember(null)}
      >
        <p className="text-sm text-slate-600">
          목록 스크롤과 필터는 그대로 두고, 이 시트에서 회원 정보를 확인합니다.
        </p>
      </AppDrawer>
    </>
  );
}
