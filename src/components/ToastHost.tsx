import { Toast } from '../types';

interface ToastHostProps {
  toasts: Toast[];
}

export function ToastHost({ toasts }: ToastHostProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-24 inset-x-0 z-[70] flex flex-col items-center gap-2 pointer-events-none px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => {
        let bg = 'bg-slate-900 text-white border-slate-700';
        if (t.type === 'err') {
          bg = 'bg-rose-600 text-white border-rose-700 shadow-rose-900/20';
        } else if (t.type === 'success') {
          bg = 'bg-emerald-700 text-white border-emerald-800 shadow-emerald-950/20';
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${bg}`}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
