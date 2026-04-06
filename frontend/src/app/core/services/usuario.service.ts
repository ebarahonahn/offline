import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/usuarios`;

  getAll(params: any = {}) {
    return this.http.get<PagedResponse<User>>(this.api, { params });
  }

  getById(id: number) {
    return this.http.get<ApiResponse<User>>(`${this.api}/${id}`);
  }

  create(data: Partial<User> & { password: string }) {
    return this.http.post<ApiResponse<User>>(this.api, data);
  }

  update(id: number, data: Partial<User>) {
    return this.http.put<ApiResponse<User>>(`${this.api}/${id}`, data);
  }

  updateEstado(id: number, estado: string) {
    return this.http.patch<ApiResponse<User>>(`${this.api}/${id}/estado`, { estado });
  }

  delete(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }

  uploadAvatar(id: number, imagen: string) {
    return this.http.post<ApiResponse<{ url: string }>>(`${this.api}/${id}/avatar`, { imagen });
  }

  deleteAvatar(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}/avatar`);
  }

  getRoles()        { return this.http.get<ApiResponse<any[]>>(`${this.api}/roles`); }
  getDepartamentos(){ return this.http.get<ApiResponse<any[]>>(`${this.api}/departamentos`); }
}
