import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  createVolunteerActivity,
  listVolunteerActivities,
  listVolunteerSignups,
  setVolunteerSignupCheckin,
  updateVolunteerActivityStatus,
  type VolunteerActivityRow,
  type VolunteerSignupRow,
} from '../volunteerActivityService';
import { validateVolunteerActivityDraft } from '../domain/volunteerActivityEngine';
import { downloadCsv } from '@/shared/utils/csvDownload';
import { VolunteerManageGate } from './VolunteerAccessGate';

function VolunteerManageInner() {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const memberId = selectedMembership?.id ?? null;

  const [activities, setActivities] = useState<VolunteerActivityRow[]>([]);
  const [signups, setSignups] = useState<VolunteerSignupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('환경정화');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const signupCountByActivity = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of signups) {
      map.set(s.activity_id, (map.get(s.activity_id) ?? 0) + 1);
    }
    return map;
  }, [signups]);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [acts, signs] = await Promise.all([
        listVolunteerActivities(orgId),
        listVolunteerSignups(orgId),
      ]);
      setActivities(acts);
      setSignups(signs);
    } catch (cause) {
      showToast.error(cause, '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate() {
    const draft = {
      title,
      activityType,
      description,
      capacity: Number(capacity),
      eventDate: eventDate || null,
    };
    const check = validateVolunteerActivityDraft(draft);
    if (!check.isValid) {
      showToast(check.error ?? '입력을 확인하세요.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createVolunteerActivity({
        organizationId: orgId,
        title: draft.title,
        activityType: draft.activityType,
        description: draft.description,
        capacity: draft.capacity,
        eventDate: draft.eventDate,
        createdByMemberId: memberId,
      });
      setTitle('');
      setDescription('');
      setCapacity(10);
      setEventDate('');
      showToast('봉사활동이 게시되었습니다.', 'success');
      await reload();
    } catch (cause) {
      showToast.error(cause, '게시에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(id: string, status: 'open' | 'closed' | 'cancelled') {
    try {
      await updateVolunteerActivityStatus(id, status);
      showToast(
        status === 'closed' ? '모집이 마감되었습니다.' : '상태가 변경되었습니다.',
        'success'
      );
      await reload();
    } catch (cause) {
      showToast.error(cause, '상태 변경에 실패했습니다.');
    }
  }

  const selected = activities.find((a) => a.id === selectedId) ?? null;
  const selectedSignups = useMemo(
    () => signups.filter((s) => s.activity_id === selectedId),
    [signups, selectedId]
  );

  function exportSelectedCsv() {
    if (!selected) return;
    const header = ['member_id', 'checked_in', 'signed_up_at'];
    const rows = selectedSignups.map((s) => [
      s.member_id,
      s.checked_in_at ? 'Y' : 'N',
      s.created_at,
    ]);
    downloadCsv(`volunteer-${selected.title.replace(/\s+/g, '_')}.csv`, [header, ...rows]);
  }

  async function toggleCheckin(row: VolunteerSignupRow) {
    if (!orgId) return;
    try {
      await setVolunteerSignupCheckin({
        organizationId: orgId,
        activityId: row.activity_id,
        memberId: row.member_id,
        checkedIn: !row.checked_in_at,
      });
      await reload();
    } catch (cause) {
      showToast.error(cause, '체크인 변경 실패');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4" data-testid="volunteer-manage-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">봉사활동 게시·관리</h1>
          <p className="text-sm text-slate-500">종류와 모집 인원을 게시하고 마감할 수 있습니다.</p>
        </div>
        <Link
          to="/workspace/volunteer"
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
        >
          참여 목록 보기
        </Link>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-base font-bold">새 봉사활동 게시</h2>
        <label className="block text-sm">
          제목
          <input
            className="mt-1 min-h-11 w-full rounded-xl border px-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 지역 환경 정화 봉사"
          />
        </label>
        <label className="block text-sm">
          종류
          <input
            className="mt-1 min-h-11 w-full rounded-xl border px-3"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          설명
          <textarea
            className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            모집 인원
            <input
              type="number"
              min={1}
              className="mt-1 min-h-11 w-full rounded-xl border px-3"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            활동일
            <input
              type="date"
              className="mt-1 min-h-11 w-full rounded-xl border px-3"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={submitting}
          className="min-h-11 w-full rounded-xl bg-slate-900 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => void handleCreate()}
        >
          {submitting ? '게시 중…' : '게시하기'}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">게시된 활동 {loading ? '(불러오는 중…)' : ''}</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-400">게시된 봉사활동이 없습니다.</p>
        ) : (
          activities.map((act) => {
            const count = signupCountByActivity.get(act.id) ?? 0;
            return (
              <article
                key={act.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"
              >
                {act.status === 'closed' ? (
                  <div
                    role="status"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                  >
                    마감됨 — 신규 신청이 불가합니다.
                  </div>
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setSelectedId(act.id)}
                  >
                    <p className="font-bold text-slate-900">{act.title}</p>
                    <p className="text-xs text-slate-500">
                      {act.activity_type}
                      {act.event_date ? ` · ${act.event_date}` : ''}
                    </p>
                  </button>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                    {act.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  참가 {count}/{act.capacity}명
                </p>
                {act.description ? (
                  <p className="text-xs text-slate-500 whitespace-pre-wrap">{act.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {act.status !== 'open' && act.status !== 'cancelled' ? (
                    <button
                      type="button"
                      className="min-h-10 rounded-xl border px-3 text-xs font-semibold"
                      onClick={() => void handleStatus(act.id, 'open')}
                    >
                      모집 재개
                    </button>
                  ) : null}
                  {act.status === 'open' ? (
                    <button
                      type="button"
                      className="min-h-10 rounded-xl border px-3 text-xs font-semibold"
                      onClick={() => void handleStatus(act.id, 'closed')}
                    >
                      모집 마감
                    </button>
                  ) : null}
                  {act.status !== 'cancelled' ? (
                    <button
                      type="button"
                      className="min-h-10 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-700"
                      onClick={() => void handleStatus(act.id, 'cancelled')}
                    >
                      취소
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </section>

      {selected ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">참가자 · {selected.title}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-10 rounded-xl border px-3 text-xs font-semibold"
                onClick={() => exportSelectedCsv()}
              >
                CSV
              </button>
              <button
                type="button"
                className="min-h-10 rounded-xl border px-3 text-xs font-semibold"
                onClick={() => window.print()}
              >
                인쇄
              </button>
            </div>
          </div>
          {selectedSignups.length === 0 ? (
            <p className="text-sm text-slate-400">신청자가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedSignups.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-mono text-xs text-slate-600">{s.member_id.slice(0, 8)}…</span>
                  <button
                    type="button"
                    className={`min-h-10 rounded-xl px-3 text-xs font-semibold ${
                      s.checked_in_at
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'border border-slate-200 text-slate-700'
                    }`}
                    onClick={() => void toggleCheckin(s)}
                  >
                    {s.checked_in_at ? '체크인됨' : '체크인'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export const VolunteerManagePage: React.FC = () => (
  <VolunteerManageGate>
    <VolunteerManageInner />
  </VolunteerManageGate>
);
