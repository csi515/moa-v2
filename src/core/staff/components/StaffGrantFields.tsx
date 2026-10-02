import {
  EMPTY_STAFF_GRANTS,
  STAFF_GRANT_FIELDS,
  type StaffGrants,
} from '@/core/staff/staffGrants';

export function StaffGrantFields({
  value,
  onChange,
}: {
  value: StaffGrants;
  onChange: (next: StaffGrants) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3 space-y-2">
      <legend className="px-1 text-xs font-semibold text-slate-700">이 강사에게 허용</legend>
      <p className="text-[11px] text-slate-500">
        기본은 꺼져 있습니다. 담당 수업·출결·보강·연습은 허용과 상관없이 보입니다.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {STAFF_GRANT_FIELDS.map((field) => (
          <label
            key={field.key}
            className="flex items-center gap-2 min-h-[44px] px-2 rounded-lg text-xs font-medium text-slate-800"
          >
            <input
              type="checkbox"
              checked={!!value[field.key]}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.checked })}
              className="w-4 h-4"
            />
            {field.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function emptyStaffGrants(): StaffGrants {
  return { ...EMPTY_STAFF_GRANTS };
}
