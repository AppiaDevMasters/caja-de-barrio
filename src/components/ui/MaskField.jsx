import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { admin } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { useToast } from './Toast';

/**
 * Dato sensible enmascarado por defecto. Revelarlo es una acción explícita
 * (solo cumplimiento o superior) que queda en auditoría y se vuelve a ocultar sola.
 */
export default function MaskField({ masked, entity, entityId, field }) {
  const { user } = useAuth();
  const toast = useToast();
  const [full, setFull] = useState(null);
  const allowed = can(user.rol, 'persona.revelar');

  useEffect(() => {
    if (!full) return undefined;
    const t = setTimeout(() => setFull(null), 20000);
    return () => clearTimeout(t);
  }, [full]);

  const toggle = async () => {
    if (full) {
      setFull(null);
      return;
    }
    try {
      // Mock: síncrono. Real: POST /admin/{entidad}/{id}/revelar (queda en auditoría).
      setFull(await admin.revelarDato(entity, entityId, field));
      toast('Dato revelado y registrado en auditoría.', { detail: 'Se ocultará de nuevo en 20 segundos.' });
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  };

  return (
    <span className={`mask ${full ? 'is-revealed' : ''}`}>
      <span className="mono">{full || masked}</span>
      {allowed && (
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--icon"
          onClick={toggle}
          aria-label={full ? 'Ocultar dato' : 'Revelar dato (queda en auditoría)'}
          title={full ? 'Ocultar' : 'Revelar (queda en auditoría)'}
        >
          {full ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </span>
  );
}
