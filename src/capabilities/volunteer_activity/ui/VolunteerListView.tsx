import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  cancelVolunteerSignup,
  joinVolunteerActivity,
  listVolunteerActivities,
  listVolunteerSignups,
  type VolunteerActivityRow,
  type VolunteerSignupRow,
} from '../volunteerActivityService';
import {
  isVolunteerJoinAllowed,
  remainingVolunteerSlots,
} from '../domain/volunteerActivityEngine';
import { useVolunteerManageAccess } from './VolunteerAccessGate';

export const VolunteerListView: React.FC = () => {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const memberId = selectedMembership?.id ?? null;
  const canManage = useVolunteerManageAccess();

  const [activities, setActivities] = useState<VolunteerActivityRow[]>([]);
  const [signups, setSignups] = useState<VolunteerSignupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const signupCountByActivity = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of signups) {
      map.set(s.activity_id, (map.get(s.activity_id) ?? 0) + 1);
    }
    return map;
  }, [signups]);

  const mySignupActivityIds = useMemo(() => {
    const set = new Set<string>();
    if (!memberId) return set;
    for (const s of signups) {
      if (s.member_id === memberId) set.add(s.activity_id);
    }
    return set;
  }, [signups, memberId]);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [acts, signs] = await Promise.all([
        listVolunteerActivities(orgId),
        listVolunteerSignups(orgId),
      ]);
      setActivities(acts.filter((a) => a.status !== 'cancelled'));
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

  async function handleJoin(activityId: string) {
    setBusyId(activityId);
    try {
      await joinVolunteerActivity(activityId);
      showToast('참여 신청이 완료되었습니다.', 'success');
      await reload();
    } catch (cause) {
      showToast.error(cause, '참여에 실패했습니다.');
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(activityId: string) {
    setBusyId(activityId);
    try {
      await cancelVolunteerSignup(activityId);
      showToast('참여가 취소되었습니다.', 'success');
      await reload();
    } catch (cause) {
      showToast.error(cause, '취소에 실패했습니다.');
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4" data-testid="volunteer-list-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">사내 봉사활동</h1>
          <p className="text-sm text-slate-500">
            참여 버튼을 눌러 의사를 표시하세요. 모집 인원이 차면 더 이상 신청할 수 없습니다.
          </p>
        </div>
        {canManage ? (
          <Link
            to="/workspace/volunteer/manage"
            className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
          >
            게시·관리
          </Link>
        ) : null}
      </header>

      {loading ? <p className="text-sm text-slate-400">불러오는 중…</p> : null}

      <ul className="space-y-3">
        {activities.length === 0 && !loading ? (
          <li className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            진행 중인 봉사활동이 없습니다.
          </li>
        ) : null}
        {activities.map((act) => {
          const count = signupCountByActivity.get(act.id) ?? 0;
          const joined = mySignupActivityIds.has(act.id);
          const canJoin = isVolunteerJoinAllowed({
            status: act.status,
            capacity: act.capacity,
            signupCount: count,
          });
          const remaining = remainingVolunteerSlots(act.capacity, count);
          return (
            <li key={act.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{act.title}</p>
                  <p className="text-xs text-slate-500">
                    {act.activity_type}
                    {act.event_date ? ` · ${act.event_date}` : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    act.status === 'open'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {act.status === 'open' ? `모집중 · ${remaining}자리` : '모집마감'}
                </span>
              </div>
              {act.description ? (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{act.description}</p>
              ) : null}
              <p className="text-xs font-medium text-slate-500">
                참가 {count}/{act.capacity}명
              </p>
              <div className="flex flex-wrap gap-2">
                {joined ? (
                  <button
                    type="button"
                    disabled={busyId === act.id || act.status === 'cancelled'}
                    className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    onClick={() => void handleCancel(act.id)}
                  >
                    {busyId === act.id ? '처리 중…' : '참여 취소'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canJoin || !memberId || busyId === act.id}
                    className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={() => void handleJoin(act.id)}
                  >
                    {!canJoin
                      ? '모집 마감'
                      : busyId === act.id
                        ? '신청 중…'
                        : '참여하기'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
