import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface TipoActividad {
  id: number;
  nombre: string;
  color_hex: string;
  activo: number;
  departamentos?: { id: number; nombre: string }[];
}

@Injectable({ providedIn: 'root' })
export class TipoActividadService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/tipos-actividad`;

  getAll()                    { return this.http.get<ApiResponse<TipoActividad[]>>(this.api); }
  create(data: Partial<TipoActividad>) { return this.http.post<ApiResponse<TipoActividad>>(this.api, data); }
  update(id: number, data: Partial<TipoActividad>) { return this.http.put<ApiResponse<TipoActividad>>(`${this.api}/${id}`, data); }
  toggleActivo(id: number)    { return this.http.patch<ApiResponse<TipoActividad>>(`${this.api}/${id}/activo`, {}); }
  getDepartamentos(id: number) { return this.http.get<ApiResponse<{ id: number; nombre: string }[]>>(`${this.api}/${id}/departamentos`); }
  setDepartamentos(id: number, departamento_ids: number[]) {
    return this.http.put<ApiResponse<{ id: number; nombre: string }[]>>(`${this.api}/${id}/departamentos`, { departamento_ids });
  }
}
