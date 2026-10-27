import React from 'react';

export const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, children, action }) => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-sm text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
};

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
