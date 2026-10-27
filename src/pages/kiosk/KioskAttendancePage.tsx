import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { KioskPinExitModal } from '@/components/kiosk/KioskPinExitModal';
import { QuickNumberInput } from '@/components/ui/quick-number-input';
import { CounterSearchPanel } from '@/components/counter/CounterSearchPanel';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { enqueueAttendance, flushAttendanceQueue, watchAttendanceOnline } from '@/core/attendance/offlineAttendanceQueue';
import { showToast } from '@/shared/feedback/uiFeedback';
import { commitOptimistic } from '@/core/feedback/optimisticStatus';
import { celebrateSuccess, pulseError } from '@/core/feedback/sensoryFeedback';

export function KioskAttendancePage() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const settings = (currentOrganization?.settings ?? {}) as { master_pin_hash?: string };
  const [buffer, setBuffer] = useState('');
  const [logoTaps, setLogoTaps] = useState(0);
  const [pinOpen, setPinOpen] = useState(false);
  const [present, setPresent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return watchAttendanceOnline(() => {
      void flushAttendanceQueue(async () => undefined).then((count) => {
        if (count > 0) showToast(`오프라인 출결 ${count}건을 전송했습니다.`, 'success');
      });
    });
  }, []);

  async function acceptPin(pin: string) {
    setBuffer(pin);
    await enqueueAttendance({
      id: crypto.randomUUID(),
      organizationId: currentOrganization?.id ?? 'none',
      pin,
      createdAt: new Date().toISOString(),
    });
    celebrateSuccess();
    showToast('접수 완료', 'success');
  }

  function toggleAttendance(id: string) {
    const previous = present[id] ?? false;
    void commitOptimistic({
      apply: () => setPresent((current) => ({ ...current, [id]: !previous })),
      rollback: () => setPresent((current) => ({ ...current, [id]: previous })),
      persist: () => enqueueAttendance({
        id: crypto.randomUUID(),
        organizationId: currentOrganization?.id ?? 'none',
        pin: id,
        createdAt: new Date().toISOString(),
      }).then(() => undefined),
      onSuccess: () => celebrateSuccess(),
      onError: (message) => {
        pulseError();
        showToast(message, 'error');
      },
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBuffer('');
      setLogoTaps(0);
      setPinOpen(false);
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [buffer, logoTaps, pinOpen]);

  function tapLogo() {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 5) setPinOpen(true);
  }

  return (
    <main className="flex h-dvh min-h-[100svh] flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <button type="button" className="min-h-11 min-w-11 text-left text-sm font-bold" onClick={tapLogo}>
          {currentOrganization?.name ?? '사업장'}
        </button>
        <button type="button" aria-label="잠금 해제" className="flex min-h-11 min-w-11 items-center justify-center" onClick={() => setPinOpen(true)}>
          <Lock className="h-5 w-5" />
        </button>
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <p className="text-sm text-slate-300">출결 번호</p>
        <p className="text-4xl font-black tracking-[0.3em]">{buffer || '----'}</p>
        <div className="w-full max-w-xs">
          <QuickNumberInput length={4} onComplete={(next) => void acceptPin(next)} />
        </div>
        <CounterSearchPanel
          visitors={[
            { id: '1', name: '김민수', chosung: 'ㄱㅁㅅ' },
            { id: '2', name: '이서연', chosung: 'ㅇㅅㅇ' },
            { id: '3', name: '박도현', chosung: 'ㅂㄷㅎ' },
          ]}
          directory={[
            { id: '1', name: '김민수', chosung: 'ㄱㅁㅅ' },
            { id: '2', name: '이서연', chosung: 'ㅇㅅㅇ' },
            { id: '3', name: '박도현', chosung: 'ㅂㄷㅎ' },
          ]}
          onToggle={(id) => toggleAttendance(id)}
        />
      </section>
      <KioskPinExitModal
        open={pinOpen}
        masterPinHash={settings.master_pin_hash ?? ''}
        onClose={() => { setPinOpen(false); setLogoTaps(0); }}
        onUnlocked={() => navigate('/workspace')}
      />
    </main>
  );
}
