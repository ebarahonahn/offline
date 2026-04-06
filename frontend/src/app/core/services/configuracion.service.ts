import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/configuraciones`;

  getAll()               { return this.http.get<any>(this.api); }
  getByGrupo(grupo: string) { return this.http.get<any>(`${this.api}/${grupo}`); }
  getPublico()           { return this.http.get<any>(`${this.api}/publico`); }
  updateBulk(data: any)  { return this.http.put<any>(this.api, data); }
  updateOne(clave: string, valor: any) {
    return this.http.put<any>(`${this.api}/${clave}`, { valor });
  }
  uploadLogo(imagen: string) {
    return this.http.post<any>(`${this.api}/logo`, { imagen });
  }
}
