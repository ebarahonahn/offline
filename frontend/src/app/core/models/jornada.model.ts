export type JornadaEstado = 'activa' | 'pausada' | 'finalizada' | 'anulada' | 'sin_jornada';

export interface Pausa {
  id: number;
  hora_inicio: string;
  hora_fin: string | null;
  tipo: 'manual' | 'inactividad' | 'sistema';
  motivo: string | null;
  duracion_min: number | null;
}

export interface Jornada {
  id: number;
  usuario_id: number;
  usuario_nombre?: string;
  usuario_apellido?: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  estado: JornadaEstado;
  duracion_total_min: number;
  total_pausas_min: number;
  pausas?: Pausa[];
  actividades?: any[];
  observaciones?: string | null;
}
