import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fromEvent, merge, Subscription } from 'rxjs';
import { throttleTime, debounceTime } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InactividadService implements OnDestroy {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/inactividad`;

  mostrarAlerta  = signal(false);
  tiempoAlerta   = signal(0); // segundos restantes antes de inactividad
  enInactividad  = signal(false);

  private umbralMs    = 90 * 60 * 1000; // 90 minutos (se actualiza desde config)
  private alertaMs    = 60 * 60 * 1000; // alerta a los 60 minutos
  private lastActivity = Date.now();
  private checkInterval: any;
  private actividadSub?: Subscription;
  private inactividadId: number | null = null;
  private jornadaId: number | null = null;

  init(umbralMin: number, alertaMin: number) {
    this.umbralMs = umbralMin * 60 * 1000;
    this.alertaMs = alertaMin * 60 * 1000;
    this.startDetection();
  }

  setJornada(jornadaId: number | null) {
    this.jornadaId = jornadaId;
  }

  private startDetection() {
    // Escuchar eventos del usuario
    const eventos$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll'),
    );

    this.actividadSub = eventos$.pipe(throttleTime(1000)).subscribe(() => {
      this.lastActivity = Date.now();
      if (this.enInactividad()) {
        this.cerrarInactividad();
      }
      if (this.mostrarAlerta()) {
        this.mostrarAlerta.set(false);
      }
    });

    // Verificar cada 30 segundos
    this.checkInterval = setInterval(() => this.check(), 30000);
  }

  private check() {
    const inactivo = Date.now() - this.lastActivity;

    if (inactivo >= this.umbralMs && !this.enInactividad()) {
      this.mostrarAlerta.set(false);
      this.iniciarInactividad();
    } else if (inactivo >= this.alertaMs && !this.enInactividad()) {
      const restante = Math.ceil((this.umbralMs - inactivo) / 1000);
      this.tiempoAlerta.set(restante);
      this.mostrarAlerta.set(true);
    }
  }

  private iniciarInactividad() {
    if (!this.jornadaId) return; // Solo registrar si hay jornada activa
    this.enInactividad.set(true);
    this.http.post<any>(`${this.api}/iniciar`, { jornada_id: this.jornadaId }).subscribe(res => {
      if (res.success) this.inactividadId = res.data.id;
    });
  }

  cerrarInactividad() {
    if (!this.inactividadId) return;
    this.http.post(`${this.api}/${this.inactividadId}/cerrar`, {}).subscribe();
    this.inactividadId = null;
    this.enInactividad.set(false);
    this.mostrarAlerta.set(false);
    this.lastActivity = Date.now();
  }

  confirmarPresencia() {
    this.cerrarInactividad();
  }

  stop() {
    this.actividadSub?.unsubscribe();
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.mostrarAlerta.set(false);
  }

  ngOnDestroy() { this.stop(); }
}
