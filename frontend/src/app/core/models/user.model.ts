export type UserRole = 'admin' | 'supervisor' | 'empleado' | 'jefe_departamento';
export type UserEstado = 'activo' | 'inactivo' | 'suspendido';

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: UserRole;
  rol_id: number;
  departamento_id: number | null;
  departamento?: string;
  supervisor_id?: number | null;
  avatar_url: string | null;
  estado: UserEstado;
  ultimo_acceso?: string;
  debe_cambiar_password?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  jornada?: any;
}
