import { Injectable, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private auth   = inject(AuthService);
  private socket?: Socket;

  jornadaUpdate$     = new Subject<any>();
  jornadaAvisoFin$   = new Subject<{ jornadaId: number; horaFinProgramada: string; horaAutoFin: string; minutosRestantes: number }>();
  inactividadAlerta$ = new Subject<any>();
  empleadoJornada$   = new Subject<any>();
  notificacion$      = new Subject<{ id: number; mensaje: string; leida: boolean; created_at: string }>();

  connect() {
    const token = this.auth.getToken();
    if (!token || this.socket?.connected) return;

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('jornada:update',     data => this.jornadaUpdate$.next(data));
    this.socket.on('jornada:aviso_fin',  data => this.jornadaAvisoFin$.next(data));
    this.socket.on('inactividad:alerta', data => this.inactividadAlerta$.next(data));
    this.socket.on('empleado:jornada',   data => this.empleadoJornada$.next(data));
    this.socket.on('notificacion:nueva', data => this.notificacion$.next(data));

    this.socket.on('connect_error', err => {
      console.warn('[Socket] Error de conexión:', err.message);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  ngOnDestroy() { this.disconnect(); }
}
