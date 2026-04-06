import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/dashboard`;

  getResumen()  { return this.http.get<any>(`${this.api}/resumen`); }
  getSemana()   { return this.http.get<any>(`${this.api}/semana`); }
  getEstado()   { return this.http.get<any>(`${this.api}/estado`); }
  getRanking(params: any) { return this.http.get<any>(`${this.api}/ranking`, { params }); }
}
