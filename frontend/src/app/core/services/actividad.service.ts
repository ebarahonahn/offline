import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Actividad, TipoActividad } from '../models/actividad.model';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api  = `${environment.apiUrl}/actividades`;
  private uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  getTipos() {
    return this.http.get<ApiResponse<TipoActividad[]>>(`${this.api}/tipos`);
  }

  getAll(params: any = {}) {
    return this.http.get<PagedResponse<Actividad>>(this.api, { params });
  }

  create(data: Partial<Actividad>) {
    return this.http.post<ApiResponse<Actividad>>(this.api, data);
  }

  update(id: number, data: Partial<Actividad>) {
    return this.http.put<ApiResponse<Actividad>>(`${this.api}/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }

  aprobar(id: number) {
    return this.http.patch<ApiResponse<Actividad>>(`${this.api}/${id}/aprobar`, {});
  }

  getEvidencias(id: number) {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/${id}/evidencias`);
  }

  addEvidencia(id: number, imagen: string, nombre: string, descripcion: string) {
    return this.http.post<ApiResponse<any>>(`${this.api}/${id}/evidencias`, { imagen, nombre, descripcion });
  }

  deleteEvidencia(actividadId: number, eid: number) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${actividadId}/evidencias/${eid}`);
  }

  urlEvidencia(ruta: string) {
    return `${this.uploadsBase}${ruta}?token=${this.auth.getToken()}`;
  }
}
