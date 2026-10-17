import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, LoaderCircle, MapPin, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { admin } from '../api';
import { MOTIVO_MIN } from '../data/mockStore';
import { useToast } from '../components/ui/Toast';
import { BackLink, Card, Forbidden, Notice, PageHeader } from '../components/ui/primitives';

const VACIO = {
  nombre_tienda: '',
  direccion: '',
  lat: '',
  lon: '',
  nivel: 'basico',
  whatsapp_tendero: '',
  nombre_tendero: '',
  motivo: '',
};

export default function RegistrarTendero() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState(VACIO);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!can(user.rol, 'tienda.alta')) return <Forbidden />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const lat = Number(f.lat);
  const lon = Number(f.lon);
  const coordsOk = f.lat !== '' && f.lon !== '' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const faltan = {
    nombre_tienda: !f.nombre_tienda.trim(),
    direccion: !f.direccion.trim(),
    coords: !coordsOk,
    nombre_tendero: !f.nombre_tendero.trim(),
    whatsapp_tendero: f.whatsapp_tendero.replace(/\D/g, '').length < 10,
    motivo: f.motivo.trim().length < MOTIVO_MIN,
  };
  const valido = !Object.values(faltan).some(Boolean);
  const err = (k) => touched && faltan[k];

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valido) return;
    setBusy(true);
    setError('');
    try {
      const r = await admin.registrarTendero({
        nombre_tienda: f.nombre_tienda.trim(),
        direccion: f.direccion.trim(),
        lat,
        lon,
        nivel: f.nivel,
        whatsapp_tendero: f.whatsapp_tendero.replace(/\D/g, ''),
        nombre_tendero: f.nombre_tendero.trim(),
        motivo: f.motivo.trim(),
      });
      toast('Tienda registrada. Queda pendiente de verificación.', {
        detail: r.notificacion && `WhatsApp al tendero: «${r.notificacion}»`,
      });
      navigate(`/tiendas/${r.id}`);
    } catch (ex) {
      setError(ex.message || 'No se pudo registrar al tendero.');
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink to="/tiendas">Tiendas</BackLink>
      <PageHeader
        title="Registrar tendero"
        subtitle="Crea la tienda en «pendiente de verificación» con su billetera. El tendero la activa verificando su identidad con el agente."
      />
      <div style={{ marginBottom: 16 }}>
        <Notice>
          Al guardar, el agente le escribe al tendero por WhatsApp. Si Verifik no confirma su cédula después, podrás activar la tienda a
          mano desde su ficha.
        </Notice>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="grid-2">
          <div className="stack">
            <Card title="Tienda">
              <div className="field">
                <label htmlFor="nombre_tienda">Nombre de la tienda</label>
                <input id="nombre_tienda" className={`input ${err('nombre_tienda') ? 'is-error' : ''}`} value={f.nombre_tienda} onChange={set('nombre_tienda')} autoFocus />
              </div>
              <div className="field">
                <label htmlFor="direccion">Dirección</label>
                <input id="direccion" className={`input ${err('direccion') ? 'is-error' : ''}`} value={f.direccion} onChange={set('direccion')} placeholder="Cra 52 #92-14, Aranjuez" />
              </div>
              <div className="split">
                <div className="field">
                  <label htmlFor="lat">Latitud</label>
                  <input id="lat" className={`input ${err('coords') ? 'is-error' : ''}`} inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="6.2764" />
                </div>
                <div className="field">
                  <label htmlFor="lon">Longitud</label>
                  <input id="lon" className={`input ${err('coords') ? 'is-error' : ''}`} inputMode="decimal" value={f.lon} onChange={set('lon')} placeholder="-75.5602" />
                </div>
              </div>
              {err('coords') && <span className="form-error">Ingresa latitud y longitud válidas (el pin de la tienda).</span>}
              {coordsOk && (
                <p style={{ fontSize: 14 }}>
                  <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`} target="_blank" rel="noopener noreferrer">
                    <MapPin size={14} style={{ verticalAlign: '-2px' }} /> Comprobar el pin en OpenStreetMap{' '}
                    <ExternalLink size={13} style={{ verticalAlign: '-2px' }} />
                  </a>
                </p>
              )}
              <div className="field">
                <label htmlFor="nivel">Nivel</label>
                <select id="nivel" className="select" value={f.nivel} onChange={set('nivel')}>
                  <option value="basico">Básico</option>
                  <option value="comercio">Comercio</option>
                  <option value="aliado">Aliado</option>
                </select>
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card title="Tendero">
              <div className="field">
                <label htmlFor="nombre_tendero">Nombre del tendero</label>
                <input id="nombre_tendero" className={`input ${err('nombre_tendero') ? 'is-error' : ''}`} value={f.nombre_tendero} onChange={set('nombre_tendero')} />
                <span className="help">Debe coincidir con la cédula que lea Didit; si no, la tienda queda para aprobación manual.</span>
              </div>
              <div className="field">
                <label htmlFor="whatsapp_tendero">WhatsApp del tendero</label>
                <input
                  id="whatsapp_tendero"
                  className={`input ${err('whatsapp_tendero') ? 'is-error' : ''}`}
                  inputMode="numeric"
                  value={f.whatsapp_tendero}
                  onChange={set('whatsapp_tendero')}
                  placeholder="573009990001"
                />
                <span className="help">Con indicativo, solo números.</span>
              </div>
            </Card>

            <Card title="Motivo del alta">
              <div className="field">
                <label htmlFor="motivo">Motivo (obligatorio)</label>
                <textarea
                  id="motivo"
                  className={`textarea ${err('motivo') ? 'is-error' : ''}`}
                  value={f.motivo}
                  onChange={set('motivo')}
                  placeholder="Por qué se registra esta tienda. Queda en auditoría."
                />
                <span className={err('motivo') ? 'form-error' : 'help'}>
                  {err('motivo') ? `Escribe al menos ${MOTIVO_MIN} caracteres para continuar.` : `Mínimo ${MOTIVO_MIN} caracteres. Se registra con tu usuario, fecha e IP.`}
                </span>
              </div>
            </Card>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => navigate('/tiendas')} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? <LoaderCircle size={16} className="spin" /> : <UserPlus size={16} />} Registrar tendero
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
