import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LoaderCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MOTIVO_MIN } from '../../data/mockStore';
import { useToast } from './Toast';

/**
 * Diálogo para acciones sensibles: el motivo escrito es obligatorio y está
 * visible antes de confirmar. `config` = {
 *   title, description, tone('danger'|'default'), confirmLabel,
 *   motivoLabel, motivoPlaceholder, fields: [{name,label,type,options,defaultValue,help,min,max}],
 *   preview (ReactNode), run({motivo, values}) => Promise, successMsg(string|fn)
 * }
 */
export default function ActionDialog({ config, onClose }) {
  const open = Boolean(config);
  return createPortal(
    <AnimatePresence>{open && <DialogBody key={config.title} config={config} onClose={onClose} />}</AnimatePresence>,
    document.body
  );
}

function DialogBody({ config, onClose }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState('');
  const [values, setValues] = useState(() =>
    Object.fromEntries((config.fields || []).map((f) => [f.name, f.defaultValue ?? '']))
  );
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  const danger = config.tone === 'danger';
  const valid = motivo.trim().length >= MOTIVO_MIN;

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const result = await config.run({ motivo: motivo.trim(), values });
      const msg = typeof config.successMsg === 'function' ? config.successMsg(result) : config.successMsg;
      toast(msg || 'Acción registrada.', { detail: result?.notificacion && `WhatsApp a la persona: «${result.notificacion}»` });
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo completar la acción.');
      setBusy(false);
    }
  };

  const Icon = danger ? ShieldAlert : ShieldCheck;

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <motion.form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, transition: { duration: 0.15, ease: 'easeIn' } }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="modal-head">
          <span className={`modal-icon ${danger ? 'is-danger' : ''}`}>
            <Icon size={20} />
          </span>
          <div>
            <h2 id="dlg-title">{config.title}</h2>
            {config.description && <p>{config.description}</p>}
          </div>
        </div>

        <div className="modal-body">
          {config.preview}
          {(config.fields || []).map((f, i) => (
            <div className="field" key={f.name}>
              <label id={`f-${f.name}`} htmlFor={`f-${f.name}`}>{f.label}</label>
              {f.type === 'checkboxes' ? (
                <div role="group" aria-labelledby={`f-${f.name}`} style={{ display: 'grid', gap: 8 }}>
                  {f.options.map((o) => (
                    <label key={o.value} style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={(values[f.name] || []).includes(o.value)}
                        onChange={(e) => {
                          const cur = values[f.name] || [];
                          setValues({
                            ...values,
                            [f.name]: e.target.checked ? [...cur, o.value] : cur.filter((v) => v !== o.value),
                          });
                        }}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              ) : f.type === 'select' ? (
                <select
                  id={`f-${f.name}`}
                  className="select"
                  value={values[f.name]}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`f-${f.name}`}
                  ref={i === 0 ? first : undefined}
                  className="input"
                  type={f.type || 'text'}
                  min={f.min}
                  max={f.max}
                  value={values[f.name]}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                />
              )}
              {f.help && <span className="help">{f.help}</span>}
            </div>
          ))}

          <div className="field">
            <label htmlFor="f-motivo">{config.motivoLabel || 'Motivo (obligatorio)'}</label>
            <textarea
              id="f-motivo"
              ref={(config.fields || []).length ? undefined : first}
              className={`textarea ${touched && !valid ? 'is-error' : ''}`}
              placeholder={config.motivoPlaceholder || 'Explica por qué tomas esta decisión. Queda en auditoría.'}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={touched && !valid}
              aria-describedby="motivo-help"
            />
            <span id="motivo-help" className={touched && !valid ? 'form-error' : 'help'}>
              {touched && !valid
                ? `Escribe al menos ${MOTIVO_MIN} caracteres para continuar.`
                : `Mínimo ${MOTIVO_MIN} caracteres. Se registra con tu usuario, fecha e IP.`}
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} disabled={busy}>
            {busy && <LoaderCircle size={16} className="spin" />}
            {config.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
