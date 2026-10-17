import { cop, dateTime } from '../../utils/format';
import { Card, DefList } from './primitives';

const TIPO_MOVIMIENTO = {
  carga_inicial: 'Carga inicial',
  debito: 'Débito',
  credito: 'Crédito',
  comision: 'Comisión',
};

/**
 * Billetera virtual (tabla `movimientos` del backend): dirección de Open Payments, saldo y movimientos.
 * Solo lectura: el panel nunca mueve saldo.
 */
export default function BilleteraCard({ billetera, titulo = 'Billetera' }) {
  const b = billetera || { wallet_address: null, saldo_cop: 0, movimientos: [] };
  const movimientos = b.movimientos || [];
  return (
    <Card title={titulo} hint="Billetera virtual · solo lectura">
      <DefList
        items={[
          [
            'Wallet address',
            b.wallet_address ? (
              <span key="w" className="mono" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{b.wallet_address}</span>
            ) : (
              <span key="w" className="muted">Sin billetera todavía</span>
            ),
          ],
          ['Saldo', <strong key="s" className="mono">{cop(b.saldo_cop || 0)}</strong>],
        ]}
      />
      <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Movimientos ({movimientos.length})</h3>
      {movimientos.length === 0 ? (
        <p className="muted">Sin movimientos.</p>
      ) : (
        <ul className="list">
          {movimientos.map((m, i) => (
            <li key={m.referencia || i}>
              <div className="grow">
                <span className="title" style={{ fontSize: 14 }}>{TIPO_MOVIMIENTO[m.tipo] || m.tipo}</span>
                <span className="sub">
                  {dateTime(m.ts)}
                  {m.referencia && <span className="mono"> · {m.referencia}</span>}
                </span>
              </div>
              <span className="mono">{cop(m.monto_cop ?? m.monto ?? 0)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
