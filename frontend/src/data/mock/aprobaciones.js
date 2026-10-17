import { minutesAgo } from './time';

export const TIPO_APROBACION = {
  desbloqueo_persona: 'Desbloqueo de persona',
  desbloqueo_tienda: 'Reactivación de tienda bloqueada',
  nivel_aliado_tienda: 'Subir tienda a nivel Aliado',
};

// Regla de los cuatro ojos: dos usuarios distintos con rol de cumplimiento o superior.
export const APROBACIONES = [
  {
    id: 'AP-007',
    tipo: 'desbloqueo_persona',
    entidad: { tipo: 'persona', id: 'p-008', nombre: 'Hernán Cuartas Mejía' },
    solicitada_en: minutesAgo(300),
    motivo: 'Se verificó el origen de los fondos con el titular; se solicita desbloqueo.',
    estado: 'pendiente',
    firmas: [
      {
        usuario: 'cumplimiento',
        nombre: 'Valentina Ríos',
        ts: minutesAgo(300),
        decision: 'aprobar',
        motivo: 'Se verificó el origen de los fondos con el titular; se solicita desbloqueo.',
      },
    ],
  },
];
