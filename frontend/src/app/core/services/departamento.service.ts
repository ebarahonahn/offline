import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface Departamento {
  id: number;
  nombre: string;
  activo: number;
  total_usuarios: number;
}

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/departamentos`;

  getAll()                         { return this.http.get<ApiResponse<Departamento[]>>(this.api); }
  create(data: { nombre: string }) { return this.http.post<ApiResponse<Departamento>>(this.api, data); }
  update(id: number, data: { nombre: string }) { return this.http.put<ApiResponse<Departamento>>(`${this.api}/${id}`, data); }
  toggleActivo(id: number)         { return this.http.patch<ApiResponse<Departamento>>(`${this.api}/${id}/activo`, {}); }
}
