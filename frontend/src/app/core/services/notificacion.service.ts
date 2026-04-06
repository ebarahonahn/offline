import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notificacion {
  id: number;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/notificaciones`;

  pendientes = signal<Notificacion[]>([]);

  loadPendientes() {
    return this.http.get<{ success: boolean; data: Notificacion[] }>(this.api).pipe(
      tap(res => { if (res.success) this.pendientes.set(res.data); })
    );
  }

  agregarDesdeSocket(notif: Notificacion) {
    this.pendientes.update(list => [notif, ...list]);
  }

  marcarLeida(id: number) {
    return this.http.patch<{ success: boolean }>(`${this.api}/${id}/leer`, {}).pipe(
      tap(res => {
        if (res.success) {
          this.pendientes.update(list => list.filter(n => n.id !== id));
        }
      })
    );
  }

  marcarTodasLeidas() {
    return this.http.patch<{ success: boolean }>(`${this.api}/leer-todas`, {}).pipe(
      tap(res => { if (res.success) this.pendientes.set([]); })
    );
  }
}
