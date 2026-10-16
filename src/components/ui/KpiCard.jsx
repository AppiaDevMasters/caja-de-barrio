import { Link } from 'react-router-dom';
import {
  Banknote,
  Check,
  Flag,
  ShieldAlert,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { cop, num } from '../../utils/format';

const ICONS = {
  check: Check,
  wallet: Wallet,
  users: Users,
  alert: ShieldAlert,
  store: Store,
  banknote: Banknote,
  flag: Flag,
};

export default function KpiCard({ kpi, linkable = true }) {
  const Icon = ICONS[kpi.icon] || Check;
  const money = kpi.format === 'cop';
  const body = (
    <>
      <div className="kpi-top">
        <span>{kpi.label}</span>
        <span className={`kpi-icon ${kpi.tone === 'danger' ? 'is-danger' : kpi.icon === 'store' || kpi.icon === 'check' ? 'is-teal' : ''}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <div className={`kpi-value ${money ? 'is-money' : ''}`}>{money ? cop(kpi.value) : num(kpi.value)}</div>
      {kpi.hint && <div className="kpi-hint">{kpi.hint}</div>}
    </>
  );
  return kpi.to && linkable ? (
    <Link to={kpi.to} className="kpi" aria-label={`${kpi.label}: ${money ? cop(kpi.value) : kpi.value}. Ver lista`}>
      {body}
    </Link>
  ) : (
    <div className="kpi">{body}</div>
  );
}
