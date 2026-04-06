import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, EMPTY, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Jornada } from '../models/jornada.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class JornadaService implements OnDestroy {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/jornadas`;

  jornadaActiva         = signal<Jornada | null>(null);
  /** Emite cuando una jornada de un día distinto a hoy cambia (p. ej. reactivación por admin). */
  jornadaHistorialUpdate$ = new Subject<Jornada>();
  estadoActual         = computed(() => this.jornadaActiva()?.estado ?? 'sin_jornada');
  tiempoTrabajado      = signal<number>(0); // segundos trabajados (se pausa con la jornada)
  segundosDesdeInicio  = signal<number>(0); // segundos totales desde hora_inicio (siempre avanza)
  // Días laborales (0=Dom…6=Sáb). Se actualiza desde MainLayoutComponent al cargar la config.
  diasLaborales        = signal<number[]>([1, 2, 3, 4, 5]);
  esDiaLaboral         = computed(() => this.diasLaborales().includes(new Date().getDay()));

  private timerInterval: any;

  loadActiva() {
    return this.http.get<ApiResponse<Jornada>>(`${this.api}/activa`).pipe(
      tap(res => {
        this.jornadaActiva.set(res.data);
        if (res.data && ['activa', 'pausada'].includes(res.data.estado)) {
          this.startTimer(res.data);
        }
      })
    );
  }

  iniciar() {
    return this.http.post<ApiResponse<Jornada>>(`${this.api}/iniciar`, {}).pipe(
      tap(res => {
        if (res.success) {
          this.jornadaActiva.set(res.data);
          this.startTimer(res.data);
        }
      })
    );
  }

  pausar(motivo?: string) {
    const id = this.jornadaActiva()?.id;
    if (!id) return this.noopObs();
    return this.http.post<ApiResponse<Jornada>>(`${this.api}/${id}/pausar`, { motivo }).pipe(
      tap(res => { if (res.success) { this.jornadaActiva.set(res.data); this.stopTimer(); } })
    );
  }

  reanudar() {
    const id = this.jornadaActiva()?.id;
    if (!id) return this.noopObs();
    return this.http.post<ApiResponse<Jornada>>(`${this.api}/${id}/reanudar`, {}).pipe(
      tap(res => { if (res.success) { this.jornadaActiva.set(res.data); this.startTimer(res.data); } })
    );
  }

  finalizar(observaciones?: string) {
    const id = this.jornadaActiva()?.id;
    if (!id) return this.noopObs();
    return this.http.post<ApiResponse<Jornada>>(`${this.api}/${id}/finalizar`, { observaciones }).pipe(
      tap(res => { if (res.success) { this.jornadaActiva.set(null); this.stopTimer(); } })
    );
  }

  getHistorial(params: any = {}) {
    return this.http.get<any>(`${this.api}`, { params });
  }

  getReporte(id: number) {
    return this.http.get<ApiResponse<any>>(`${this.api}/${id}/reporte`);
  }

  getReportePDFUrl(id: number): string {
    return `${this.api}/${id}/reporte/pdf`;
  }

  reactivar(id: number) {
    return this.http.post<ApiResponse<Jornada>>(`${this.api}/${id}/reactivar`, {});
  }

  startTimer(jornada: Jornada) {
    this.stopTimer();
    const inicio        = new Date(jornada.hora_inicio).getTime();
    const totalPausasMs = (jornada.total_pausas_min || 0) * 60 * 1000;

    this.tiempoTrabajado.set(Math.floor((Date.now() - inicio - totalPausasMs) / 1000));
    this.segundosDesdeInicio.set(Math.floor((Date.now() - inicio) / 1000));

    this.timerInterval = setInterval(() => {
      // segundosDesdeInicio siempre avanza (activa o pausada)
      this.segundosDesdeInicio.update(v => v + 1);
      // tiempoTrabajado solo avanza cuando la jornada está activa
      if (this.estadoActual() === 'activa') {
        this.tiempoTrabajado.update(v => v + 1);
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  ngOnDestroy() { this.stopTimer(); }

  private noopObs() {
    return EMPTY;
  }
}
