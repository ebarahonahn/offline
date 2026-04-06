import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/reportes`;

  getJornadas(params: any) {
    return this.http.get<any>(`${this.api}/jornadas`, { params });
  }

  getProductividad(params: any) {
    return this.http.get<any>(`${this.api}/productividad`, { params });
  }

  exportExcel(params: any) {
    return this.http.get(`${this.api}/export/excel`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  exportPDF(params: any) {
    return this.http.get(`${this.api}/export/pdf`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  exportProductividadExcel(params: any) {
    return this.http.get(`${this.api}/export/productividad/excel`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  exportProductividadPDF(params: any) {
    return this.http.get(`${this.api}/export/productividad/pdf`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  downloadBlob(response: any, filename: string) {
    const blob = new Blob([response.body], { type: response.headers.get('content-type') });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
