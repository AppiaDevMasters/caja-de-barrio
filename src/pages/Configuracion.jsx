import { useMemo, useState } from 'react';
import { OctagonAlert, Power, RotateCcw, Save } from 'lucide-react';
import { admin } from '../api/admin';
import { useStoreState } from '../data/mockStore';
import { CONFIG_LABELS } from '../data/mock/config';
import { cop, dateTime } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import { Card, Notice, PageHeader } from '../components/ui/primitives';

const NIVELES = [
  ['basico', 'Básico'],
  ['comercio', 'Comercio'],
  ['aliado', 'Aliado'],
];

const toDraft = (c) => ({
  topes: Object.fromEntries(Object.entries(c.topes).map(([n, v]) => [n, { ...v }])),
  umbrales: { ...c.umbrales },
  reglas: { ...c.reglas },
});

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));

function NumberField({ id, label, value, onChange, prev, step = 1, suffix, money }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input mono"
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {(suffix || prev !== undefined) && (
        <span className="was">
          {prev !== undefined ? `Antes: ${money ? cop(prev) : prev}` : suffix}
        </span>
      )}
    </div>
  );
}

export default function Configuracion() {
  const state = useStoreState();
  const { config } = state;
  const [draft, setDraft] = useState(() => toDraft(config));
  const [dlg, setDlg] = useState(null);

  const saved = useMemo(() => Object.fromEntries(flat(toDraft(config))), [config]);
  const current = Object.fromEntries(flat(draft));
  const changes = Object.keys(current).filter((k) => Number(current[k]) !== Number(saved[k]));
  const dirty = changes.length > 0;

  const setIn = (group, path, value) =>
    setDraft((d) => {
      const next = toDraft(d);
      if (path.length === 2) next[group][path[0]][path[1]] = value;
      else next[group][path[0]] = value;
      return next;
    });

  const guardar = () =>
    setDlg({
      title: `Guardar ${changes.length} ${changes.length === 1 ? 'cambio' : 'cambios'}`,
      description: 'Se aplican de inmediato y quedan en auditoría con el valor anterior.',
      confirmLabel: 'Guardar configuración',
      successMsg: (r) => `Configuración guardada (${r.cambios} ${r.cambios === 1 ? 'cambio' : 'cambios'}).`,
      preview: (
        <div className="diff" aria-label="Resumen de cambios">
          {changes.map((k) => `${CONFIG_LABELS[k]}\n  ${saved[k]} → ${current[k]}`).join('\n')}
        </div>
      ),
      run: ({ motivo }) => admin.guardarConfig(draft, motivo),
    });

  const emergencia = config.emergencia;
  const alternarEmergencia = () =>
    setDlg(
      emergencia.activa
        ? {
            title: 'Reanudar retiros',
            description: 'El agente volverá a atender retiros nuevos.',
            confirmLabel: 'Reanudar retiros',
            successMsg: 'Retiros reanudados.',
            run: ({ motivo }) => admin.setEmergencia(false, motivo),
          }
        : {
            title: 'Activar interruptor de emergencia',
            description: 'Pausa de inmediato todos los retiros nuevos. El agente responderá «el servicio está en mantenimiento».',
            tone: 'danger',
            confirmLabel: 'Pausar todos los retiros',
            successMsg: 'Retiros pausados. Servicio en mantenimiento.',
            run: ({ motivo }) => admin.setEmergencia(true, motivo),
          }
    );

  return (
    <>
      <PageHeader title="Configuración" subtitle="Topes, umbrales, reglas de riesgo e interruptor de emergencia." />

      <div className="stack">
        <Card className="emergency-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span className={`modal-icon ${emergencia.activa ? 'is-danger' : ''}`}>
              <OctagonAlert size={20} />
            </span>
            <div>
              <h2 style={{ fontSize: 16 }}>Interruptor de emergencia</h2>
              <p className="muted" style={{ maxWidth: 560 }}>
                {emergencia.activa
                  ? `Retiros pausados desde ${dateTime(emergencia.desde)} por ${emergencia.por}. Motivo: «${emergencia.motivo}»`
                  : 'Servicio operativo. Úsalo solo ante un incidente: detiene todos los retiros nuevos.'}
              </p>
            </div>
          </div>
          <button className={`btn ${emergencia.activa ? 'btn--primary' : 'btn--danger'}`} onClick={alternarEmergencia}>
            {emergencia.activa ? <RotateCcw size={16} /> : <Power size={16} />}
            {emergencia.activa ? 'Reanudar retiros' : 'Pausar todos los retiros'}
          </button>
        </Card>

        <Card title="Topes por nivel" hint="Por retiro, por día y por mes (COP)">
          <div className="split" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {NIVELES.map(([key, label]) => (
              <div className="tier" key={key}>
                <h3>{label}</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    ['retiro', 'Por retiro'],
                    ['dia', 'Por día'],
                    ['mes', 'Por mes'],
                  ].map(([k, l]) => (
                    <NumberField
                      key={k}
                      id={`tope-${key}-${k}`}
                      label={l}
                      money
                      value={draft.topes[key][k]}
                      prev={config.anterior[`topes.${key}.${k}`]}
                      onChange={(v) => setIn('topes', [key, k], v)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="split">
          <Card title="Umbrales de aprobación automática">
            <div style={{ display: 'grid', gap: 14 }}>
              <NumberField
                id="u-didit"
                label="Score mínimo de Didit (0 a 1)"
                step={0.01}
                value={draft.umbrales.diditScore}
                prev={config.anterior['umbrales.diditScore']}
                onChange={(v) => setIn('umbrales', ['diditScore'], v)}
                suffix="Por debajo, el registro pasa a revisión manual."
              />
              <NumberField
                id="u-radio"
                label="Radio de búsqueda (metros)"
                value={draft.umbrales.radioBusquedaM}
                prev={config.anterior['umbrales.radioBusquedaM']}
                onChange={(v) => setIn('umbrales', ['radioBusquedaM'], v)}
                suffix="Distancia máxima para ofrecer una tienda."
              />
              <NumberField
                id="u-venc"
                label="Vencimiento de reserva (minutos)"
                value={draft.umbrales.vencimientoReservaMin}
                prev={config.anterior['umbrales.vencimientoReservaMin']}
                onChange={(v) => setIn('umbrales', ['vencimientoReservaMin'], v)}
                suffix="Después se libera el efectivo reservado."
              />
            </div>
          </Card>

          <Card title="Reglas de riesgo" hint="Cuántos eventos en cuánto tiempo disparan alerta">
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                ['pitufeoRetiros', 'Pitufeo: retiros que disparan alerta'],
                ['pitufeoVentanaMin', 'Pitufeo: ventana (minutos)'],
                ['dispositivoCuentas', 'Dispositivo compartido: cuentas máximas'],
                ['cercaTopePct', 'Cerca del tope: porcentaje'],
                ['reclamosTienda', 'Reclamos contra tienda: cantidad'],
                ['reclamosDias', 'Reclamos contra tienda: días'],
              ].map(([k, l]) => (
                <NumberField
                  key={k}
                  id={`r-${k}`}
                  label={l}
                  value={draft.reglas[k]}
                  prev={config.anterior[`reglas.${k}`]}
                  onChange={(v) => setIn('reglas', [k], v)}
                />
              ))}
            </div>
          </Card>
        </div>

        <Notice>
          Los valores aquí se aplican en los servidores MCP; el panel no reimplementa las reglas. Cada cambio muestra el valor
          anterior y queda en auditoría.
        </Notice>

        {dirty && (
          <div className="save-bar" role="region" aria-label="Cambios sin guardar">
            <span>
              <strong>{changes.length}</strong> {changes.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setDraft(toDraft(config))}>
                Descartar
              </button>
              <button className="btn btn--primary" onClick={guardar}>
                <Save size={16} /> Guardar con motivo
              </button>
            </span>
          </div>
        )}
      </div>

      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
