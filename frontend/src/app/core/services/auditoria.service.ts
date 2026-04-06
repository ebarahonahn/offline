import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface RegistroAuditoria {
  id:            number;
  accion:        string;
  accion_label:  string;
  entidad:       string | null;
  entidad_id:    number | null;
  datos_ant:     any;
  datos_nue:     any;
  ip:            string | null;
  created_at:    string;
  usuario_id:    number | null;
  usuario_nombre: string | null;
  usuario_email:  string | null;
  usuario_rol:    string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/auditoria`;

  getAll(params: any = {}) {
    return this.http.get<any>(this.api, { params });
  }

  getOpciones() {
    return this.http.get<any>(`${this.api}/opciones`);
  }

  exportExcel(params: any = {}) {
    return this.http.get(`${this.api}/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportPDF(params: any = {}) {
    return this.http.get(`${this.api}/export/pdf`, {
      params,
      responseType: 'blob',
    });
  }
}
