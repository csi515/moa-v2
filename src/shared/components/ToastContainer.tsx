import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkStatusBanner } from './WorkStatusBanner';
import { MAX_VISIBLE_TOASTS } from '@/shared/feedback/feedbackPolicy';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, workStatus, clearWorkStatus } = useApp();
  const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS);

  return (
    <div className="fixed mobile-overlay-bottom left-4 right-20 md:left-auto md:right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {workStatus && (
        <div className="pointer-events-auto">
          <WorkStatusBanner status={workStatus} onDismiss={clearWorkStatus} />
        </div>
      )}
      <AnimatePresence>
        {visibleToasts.map((toast) => {
          let bg = 'bg-slate-900 text-white';
          let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;

          if (toast.type === 'success') {
            bg = 'bg-emerald-900/90 border border-emerald-700 text-emerald-50';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (toast.type === 'error') {
            bg = 'bg-rose-900/90 border border-rose-700 text-rose-50';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-900/90 border border-amber-700 text-amber-50';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`${bg} p-3.5 rounded-xl shadow-xl backdrop-blur-md flex items-start gap-3 pointer-events-auto w-full`}
            >
              {icon}
              <div className="flex-1 text-sm min-w-0">
                {toast.title && <p className="font-semibold text-xs opacity-90">{toast.title}</p>}
                <p className="font-medium leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="알림 닫기"
                className="text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
