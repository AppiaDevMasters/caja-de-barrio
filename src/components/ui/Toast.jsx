import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((message, { detail, tone = 'success', ms = 5200 } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setItems((cur) => [...cur, { id, message, detail, tone }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), ms);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.tone === 'error' ? 'is-error' : ''}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {t.tone === 'error' ? <TriangleAlert size={18} /> : <CircleCheck size={18} />}
              <div>
                {t.message}
                {t.detail && <small>{t.detail}</small>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx.push;
};
