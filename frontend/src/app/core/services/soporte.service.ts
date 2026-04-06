import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export type TicketEstado    = 'abierto' | 'en_proceso' | 'pendiente_usuario' | 'resuelto' | 'cerrado';
export type TicketPrioridad = 'baja' | 'media' | 'alta' | 'urgente';
export type TicketCategoria = 'funcionalidad' | 'error' | 'solicitud' | 'consulta' | 'otro';

export interface TicketRespuesta {
  id: number;
  ticket_id: number;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_rol: string;
  mensaje: string;
  es_nota_interna: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  numero: string;
  titulo: string;
  descripcion: string;
  categoria: TicketCategoria;
  prioridad: TicketPrioridad;
  estado: TicketEstado;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_email: string;
  asignado_a: number | null;
  asignado_nombre: string | null;
  asignado_apellido: string | null;
  total_respuestas?: number;
  respuestas?: TicketRespuesta[];
  resuelto_en: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class SoporteService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/soporte`;

  getAll(params: any = {}) {
    return this.http.get<PagedResponse<Ticket>>(this.api, { params });
  }

  getById(id: number) {
    return this.http.get<ApiResponse<Ticket>>(`${this.api}/${id}`);
  }

  crear(data: { titulo: string; descripcion: string; categoria: TicketCategoria; prioridad: TicketPrioridad }) {
    return this.http.post<ApiResponse<Ticket>>(this.api, data);
  }

  responder(id: number, mensaje: string, esNotaInterna = false) {
    return this.http.post<ApiResponse<Ticket>>(`${this.api}/${id}/responder`, { mensaje, es_nota_interna: esNotaInterna });
  }

  cambiarEstado(id: number, estado: TicketEstado) {
    return this.http.patch<ApiResponse<Ticket>>(`${this.api}/${id}/estado`, { estado });
  }

  asignar(id: number, asignadoA: number | null) {
    return this.http.patch<ApiResponse<Ticket>>(`${this.api}/${id}/asignar`, { asignado_a: asignadoA });
  }
}
