export type ActividadEstado = 'en_progreso' | 'completada' | 'cancelada';

export interface TipoActividad {
  id: number;
  nombre: string;
  color_hex: string;
}

export interface Actividad {
  id: number;
  jornada_id: number;
  tipo_actividad_id: number | null;
  tipo_nombre?: string;
  color_hex?: string;
  nombre: string;
  descripcion: string | null;
  hora_inicio: string;
  hora_fin: string | null;
  tiempo_min: number | null;
  estado: ActividadEstado;
  aprobada: boolean;
  usuario_nombre?: string;
  usuario_apellido?: string;
  fecha?: string;
}
