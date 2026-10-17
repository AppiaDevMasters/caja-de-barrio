import { Map } from 'lucide-react';
import { EmptyState, PageHeader } from '../components/ui/primitives';

export default function MapaStub() {
  return (
    <>
      <PageHeader title="Mapa de liquidez" subtitle="Efectivo disponible por zona de Medellín, agrupado en hexágonos H3." />
      <div className="card">
        <EmptyState icon={Map} title="Disponible en una fase posterior">
          El mapa usará H3 y PostGIS para mostrar dónde falta y dónde sobra efectivo. Las tiendas semilla de Aranjuez ya
          tienen coordenadas listas para este módulo.
        </EmptyState>
      </div>
    </>
  );
}
