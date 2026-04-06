import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { JornadaService } from '../../core/services/jornada.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Bienvenido, {{ auth.currentUser()?.nombre }} 👋
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ today }}</p>
        </div>
        <a routerLink="/jornada" class="btn-primary">
          Ir a mi jornada
        </a>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <!-- Tiempo trabajado hoy -->
        <div class="card p-5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Tiempo trabajado hoy</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {{ tiempoTrabajadoHoy() }}
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
              <svg class="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-1">
            <span [class]="estadoBadgeClass()">{{ estadoLabel() }}</span>
          </div>
        </div>

        <!-- Tiempo en pausa -->
        <div class="card p-5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Tiempo en pausa</p>
              <p class="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {{ formatDuration(resumen()?.jornada?.total_pausas_min) }}
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Inactividad -->
        <div class="card p-5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Inactividad detectada</p>
              <p class="mt-1 text-2xl font-bold text-red-500 dark:text-red-400">
                {{ formatDuration(resumen()?.total_inactividad_min) }}
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
              <svg class="h-5 w-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Actividades -->
        <div class="card p-5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Actividades hoy</p>
              <p class="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
                {{ resumen()?.jornada?.total_actividades ?? 0 }}
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/20">
              <svg class="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
          </div>
          <a routerLink="/actividades" class="mt-3 text-xs text-primary-600 dark:text-primary-400 hover:underline block">
            Registrar actividad →
          </a>
        </div>
      </div>

      <!-- Semana actual -->
      <div class="card p-6">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Últimos 7 días</h2>
        <!-- Leyenda -->
        <div class="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
          <span class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-sm bg-primary-500"></span>Trabajado
          </span>
          <span class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-sm bg-amber-400"></span>Pausa
          </span>
          <span class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-sm bg-red-400"></span>Inactividad
          </span>
        </div>

        <!-- Referencia máxima de escala -->
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">Escala: {{ formatDuration(barMaxRef()) }}</p>

        <div class="grid grid-cols-7 gap-2">
          @for (dia of semanaEnVivo; track dia.fecha) {
            <div class="text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">{{ formatDia(dia.fecha) }}</p>

              <!-- Barra apilada: espacio gris = tiempo libre hasta la escala máxima ({{ formatDuration(barMaxRef()) }}) -->
              <div class="relative h-24 rounded-lg bg-gray-100 dark:bg-gray-800 flex flex-col-reverse overflow-hidden"
                   [title]="diaTooltip(dia)">
                <!-- Trabajado -->
                <div class="w-full bg-primary-500 transition-all duration-500 shrink-0"
                     [style.height.%]="barHeight(dia.trabajado_min)">
                </div>
                <!-- Pausa -->
                <div class="w-full bg-amber-400 transition-all duration-500 shrink-0"
                     [style.height.%]="barHeight(dia.pausas_min)">
                </div>
                <!-- Inactividad -->
                <div class="w-full bg-red-400 transition-all duration-500 shrink-0"
                     [style.height.%]="barHeight(dia.inactividad_min)">
                </div>
              </div>

              <!-- Valores con mini-barras -->
              <div class="mt-2 space-y-1">
                <!-- Trabajado -->
                <div>
                  <div class="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div class="h-full bg-primary-500 rounded-full transition-all duration-500"
                         [style.width.%]="miniBarWidth(dia.trabajado_min)"></div>
                  </div>
                  <p class="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                    {{ dia.trabajado_min > 0 ? formatDuration(dia.trabajado_min) : '-' }}
                  </p>
                </div>
                <!-- Pausa -->
                <div>
                  <div class="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div class="h-full bg-amber-400 rounded-full transition-all duration-500"
                         [style.width.%]="miniBarWidth(dia.pausas_min)"></div>
                  </div>
                  <p class="text-xs text-amber-500 mt-0.5">
                    {{ dia.pausas_min > 0 ? formatDuration(dia.pausas_min) : '-' }}
                  </p>
                </div>
                <!-- Inactividad -->
                <div>
                  <div class="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div class="h-full bg-red-400 rounded-full transition-all duration-500"
                         [style.width.%]="miniBarWidth(dia.inactividad_min)"></div>
                  </div>
                  <p class="text-xs text-red-400 mt-0.5">
                    {{ dia.inactividad_min > 0 ? formatDuration(dia.inactividad_min) : '-' }}
                  </p>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Estado en tiempo real (solo admin/supervisor) -->
      @if (auth.hasRole('admin', 'supervisor') && estadoRT()) {
        <div class="card p-6">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Estado en tiempo real</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            <div>
              <p class="text-3xl font-bold text-emerald-600">{{ estadoRT()?.empleados_activos ?? 0 }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Activos</p>
            </div>
            <div>
              <p class="text-3xl font-bold text-amber-600">{{ estadoRT()?.empleados_en_pausa ?? 0 }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">En pausa</p>
            </div>
            <div>
              <p class="text-3xl font-bold text-primary-600 dark:text-primary-400">{{ estadoRT()?.jornadas_finalizadas ?? 0 }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Finalizadas</p>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-600 dark:text-gray-400">{{ estadoRT()?.total_jornadas_hoy ?? 0 }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Total hoy</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  auth       = inject(AuthService);
  jornada    = inject(JornadaService);
  private ds = inject(DashboardService);

  resumen  = signal<any>(null);
  semana   = signal<any[]>([]);
  estadoRT = signal<any>(null);

  today = new Date().toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  private refreshInterval: any;

  ngOnInit() {
    this.loadResumen();
    this.loadSemana();
    if (this.auth.hasRole('admin', 'supervisor')) {
      this.ds.getEstado().subscribe(r => { if (r.success) this.estadoRT.set(r.data); });
    }
    // Refrescar resumen y semana cada 60s
    this.refreshInterval = setInterval(() => { this.loadResumen(); this.loadSemana(); }, 60000);
  }

  ngOnDestroy() {
    clearInterval(this.refreshInterval);
  }

  private loadResumen() {
    this.ds.getResumen().subscribe(r => { if (r.success) this.resumen.set(r.data); });
  }

  private loadSemana() {
    this.ds.getSemana().subscribe(r => { if (r.success) this.semana.set(this.fillWeek(r.data)); });
  }

  // Semana con el día de hoy usando el timer en vivo si la jornada está activa/pausada
  get semanaEnVivo(): any[] {
    const hoy = new Date().toISOString().slice(0, 10);
    const estado = this.jornada.estadoActual();
    return this.semana().map(dia => {
      const key = dia.fecha instanceof Date
        ? dia.fecha.toISOString().slice(0, 10)
        : String(dia.fecha).slice(0, 10);
      if (key === hoy && (estado === 'activa' || estado === 'pausada')) {
        return {
          ...dia,
          trabajado_min: Math.floor(this.jornada.tiempoTrabajado() / 60),
          pausas_min: this.resumen()?.jornada?.total_pausas_min ?? dia.pausas_min,
        };
      }
      return dia;
    });
  }

  // Tiempo trabajado en vivo: usa el timer del servicio de jornada si está activa
  tiempoTrabajadoHoy(): string {
    const estado = this.jornada.estadoActual();
    if (estado === 'activa' || estado === 'pausada') {
      return this.formatDuration(Math.floor(this.jornada.tiempoTrabajado() / 60));
    }
    // Jornada finalizada o sin jornada: usar dato de la API
    const min = (this.resumen()?.jornada?.duracion_total_min ?? 0) - (this.resumen()?.jornada?.total_pausas_min ?? 0);
    return this.formatDuration(Math.max(0, min));
  }

  estadoLabel() {
    const labels: Record<string, string> = { activa: 'Activa', pausada: 'En pausa', finalizada: 'Finalizada', anulada: 'Anulada' };
    return labels[this.jornada.estadoActual()] ?? 'Sin jornada';
  }

  estadoBadgeClass() {
    const classes: Record<string, string> = {
      activa: 'badge-activo',
      pausada: 'badge-pausado',
      finalizada: 'badge-finalizado',
      anulada: 'badge-finalizado',
    };
    return classes[this.jornada.estadoActual()] ?? 'badge-finalizado';
  }

  formatDuration(minutes?: number) {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // Genera los 7 días y rellena con datos de la API donde existan
  private fillWeek(apiData: any[]): any[] {
    const map = new Map<string, any>();
    for (const d of apiData) {
      const key = d.fecha instanceof Date
        ? d.fecha.toISOString().slice(0, 10)
        : String(d.fecha).slice(0, 10);
      map.set(key, d);
    }
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      days.push(map.get(key) ?? { fecha: key, trabajado_min: 0, pausas_min: 0, inactividad_min: 0, actividades: 0 });
    }
    return days;
  }

  formatDia(fecha: any) {
    // fecha puede ser Date (de mysql2) o string 'YYYY-MM-DD'
    const str = fecha instanceof Date
      ? fecha.toISOString().slice(0, 10)
      : String(fecha).slice(0, 10);
    return new Date(str + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' });
  }

  diaTooltip(dia: any): string {
    const nombre = this.formatDia(dia.fecha);
    const t = dia.trabajado_min > 0 ? this.formatDuration(dia.trabajado_min) : '0m';
    const p = dia.pausas_min   > 0 ? this.formatDuration(dia.pausas_min)   : '0m';
    const i = dia.inactividad_min > 0 ? this.formatDuration(dia.inactividad_min) : '0m';
    return `${nombre}  ·  Trabajado: ${t}  |  Pausa: ${p}  |  Inactividad: ${i}`;
  }

  barMaxRef(): number {
    return 480; // escala fija de 8h — días que superen 8h llenan la barra al 100%
  }

  barHeight(min: number) {
    return Math.min(100, Math.round(((min ?? 0) / 480) * 100));
  }

  miniBarWidth(min: number) {
    const max = Math.max(
      ...this.semanaEnVivo.map(d => Math.max(d.trabajado_min ?? 0, d.pausas_min ?? 0, d.inactividad_min ?? 0)),
      1
    );
    return Math.round(((min ?? 0) / max) * 100);
  }
}
