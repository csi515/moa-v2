import { useCallback, useEffect, useState, type FC } from 'react';
import { MapPin } from 'lucide-react';
import {
  Button,
  FORM_CONTROL_CLASS,
  FormField,
  SettingsCard,
} from '@/shared/components/ui';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import * as orgService from '@/core/organizations/services/organizationService';
import {
  deactivateAuthorizationGrant,
  listOrganizationGrants,
  upsertAuthorizationGrant,
} from '@/core/authorization/authorizationGrantService';
import { PERMISSION_DEFINITIONS } from '@/core/authorization/registry';
import type { AuthorizationGrant, AuthScopeType, Permission } from '@/core/authorization/types';
import { AUTHORIZATION_GRANTS_COPY as COPY } from './authorizationGrantsCopy';

export type GrantMemberOption = {
  user_id: string;
  name?: string | null;
  email?: string | null;
};

const SCOPE_OPTIONS: { value: AuthScopeType; label: string }[] = [
  { value: 'organization', label: COPY.orgWide },
  { value: 'location', label: COPY.location },
  { value: 'customer', label: COPY.customer },
  { value: 'resource', label: COPY.resource },
];

type Props = {
  members: GrantMemberOption[];
};

function memberLabel(m: GrantMemberOption): string {
  return m.name || m.email || `${m.user_id.slice(0, 8)}…`;
}

function readScopeFailClosed(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object') return false;
  const rbac = (settings as Record<string, unknown>).rbac;
  if (!rbac || typeof rbac !== 'object') return false;
  return (rbac as Record<string, unknown>).scope_fail_closed === true;
}

export const AuthorizationGrantsCard: FC<Props> = ({ members }) => {
  const { showToast } = useApp();
  const org = useOrganization();
  const organizationId = org.currentOrganization?.id;
  const [grants, setGrants] = useState<AuthorizationGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState('');
  const [permission, setPermission] = useState<Permission>('locations.read');
  const [scopeType, setScopeType] = useState<AuthScopeType>('organization');
  const [scopeId, setScopeId] = useState('');
  const [failClosed, setFailClosed] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId) {
      setGrants([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await listOrganizationGrants(organizationId);
      setGrants(rows);
      setFailClosed(readScopeFailClosed(org.currentOrganization?.settings));
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, org.currentOrganization?.settings, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!organizationId || !userId || busy) return;
    setBusy(true);
    try {
      await upsertAuthorizationGrant({
        organizationId,
        userId,
        permission,
        scopeType,
        scopeId: scopeType === 'organization' ? null : scopeId.trim(),
      });
      showToast(COPY.saved, 'success');
      setScopeId('');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (grant: AuthorizationGrant) => {
    if (!organizationId || !grant.userId || busy) return;
    setBusy(true);
    try {
      await deactivateAuthorizationGrant({
        organizationId,
        userId: grant.userId,
        permission: String(grant.permission),
        scopeType: grant.scopeType,
        scopeId: grant.scopeId,
      });
      showToast(COPY.removed, 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFailClosedToggle = async (next: boolean) => {
    if (!organizationId || busy) return;
    setBusy(true);
    setFailClosed(next);
    try {
      const current = (org.currentOrganization?.settings ?? {}) as Record<string, unknown>;
      const prevRbac =
        current.rbac && typeof current.rbac === 'object'
          ? (current.rbac as Record<string, unknown>)
          : {};
      await orgService.updateOrganization(organizationId, {
        settings: {
          ...current,
          rbac: { ...prevRbac, scope_fail_closed: next },
        } as Parameters<typeof orgService.updateOrganization>[1]['settings'],
      });
    } catch (err) {
      setFailClosed(!next);
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!organizationId) return null;

  return (
    <SettingsCard
      title={COPY.title}
      icon={<MapPin className="h-4 w-4 text-slate-500" aria-hidden />}
    >
      <p className="text-sm text-slate-500">{COPY.description}</p>

      <label className="flex min-h-11 items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300"
          checked={failClosed}
          disabled={busy}
          onChange={(e) => void handleFailClosedToggle(e.target.checked)}
        />
        <span>
          <span className="text-sm font-semibold text-slate-900">{COPY.scopeFailClosedLabel}</span>
          <span className="block text-xs text-slate-500">{COPY.scopeFailClosedHint}</span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={COPY.member}>
          <select
            className={FORM_CONTROL_CLASS}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">{COPY.selectMember}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {memberLabel(m)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={COPY.permission}>
          <select
            className={FORM_CONTROL_CLASS}
            value={permission}
            onChange={(e) => setPermission(e.target.value as Permission)}
          >
            {PERMISSION_DEFINITIONS.map((row) => (
              <option key={row.key} value={row.key}>
                {row.description} ({row.key})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={COPY.scopeType}>
          <select
            className={FORM_CONTROL_CLASS}
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as AuthScopeType)}
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
        {scopeType !== 'organization' ? (
          <FormField label={COPY.scopeId}>
            <input
              className={FORM_CONTROL_CLASS}
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              placeholder="uuid"
            />
          </FormField>
        ) : null}
      </div>

      <Button
        type="button"
        variant="primary"
        disabled={busy || !userId || (scopeType !== 'organization' && !scopeId.trim())}
        onClick={() => void handleAdd()}
      >
        {COPY.add}
      </Button>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : grants.length === 0 ? (
        <p className="text-sm text-slate-500">{COPY.empty}</p>
      ) : (
        <ul className="space-y-2">
          {grants.map((grant) => {
            const label =
              members.find((m) => m.user_id === grant.userId)?.name ||
              grant.userId?.slice(0, 8) ||
              '—';
            return (
              <li
                key={`${grant.userId}-${grant.permission}-${grant.scopeType}-${grant.scopeId ?? ''}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-900 truncate">{label}</p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {String(grant.permission)} · {grant.scopeType}
                    {grant.scopeId ? ` · ${grant.scopeId}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => void handleRemove(grant)}
                >
                  {COPY.remove}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsCard>
  );
};

export default AuthorizationGrantsCard;
