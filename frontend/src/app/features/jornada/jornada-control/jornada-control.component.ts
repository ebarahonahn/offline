import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JornadaService } from '../../../core/services/jornada.service';
import { InactividadService } from '../../../core/services/inactividad.service';

@Component({
  selector: 'app-jornada-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-lg mx-auto space-y-5">

      <!-- Encabezado -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mi Jornada</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ today }}</p>
        </div>
        <!-- Badge de estado -->
        <span class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold border"
              [class]="badgeClass()">
          @if (jornada.estadoActual() === 'activa') {
            <span class="h-2 w-2 rounded-full bg-current animate-pulse"></span>
          } @else {
            <span class="h-2 w-2 rounded-full bg-current opacity-60"></span>
          }
          {{ estadoLabel() }}
        </span>
      </div>

      <!-- Card principal -->
      <div class="card overflow-hidden">
        <!-- Franja de color superior según estado -->
        <div class="h-1 w-full" [class]="accentBarClass()"></div>

        <div class="p-8 flex flex-col items-center">
          <!-- Anillo SVG de progreso -->
          <div class="mb-8" style="display:grid; width:280px; height:280px;">
            <svg width="280" height="280" viewBox="0 0 280 280"
                 style="grid-area:1/1; transform:rotate(-90deg);" class="drop-shadow-lg">
              <circle cx="140" cy="140" r="120"
                fill="none" stroke-width="12"
                class="text-gray-200 dark:text-gray-700"
                stroke="currentColor"/>
              <circle cx="140" cy="140" r="120"
                fill="none" stroke-width="12"
                stroke="currentColor"
                stroke-linecap="round"
                [class]="ringColorClass()"
                [style.stroke-dasharray]="RING_C"
                [style.stroke-dashoffset]="ringOffset()"
                style="transition: stroke-dashoffset 1s linear, stroke 0.4s ease"/>
            </svg>

            <!-- Contenido central: misma celda del grid, centrado -->
            <div style="grid-area:1/1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <span class="text-4xl font-bold font-mono tracking-widest leading-none"
                    [class]="timeClass()">
                {{ formatTime(jornada.tiempoTrabajado()) }}
              </span>
              <span class="mt-3 text-xs font-medium tracking-widest uppercase"
                    [class]="subTimeClass()">
                {{ progressLabel() }}
              </span>
            </div>
          </div>

          <!-- Botones de control -->
          <div class="flex flex-wrap justify-center gap-3 w-full">
            @if (jornada.estadoActual() === 'sin_jornada') {
              @if (jornada.esDiaLaboral()) {
                <button class="btn-success px-10 py-3 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
                        (click)="iniciar()" [disabled]="loading()">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Iniciar Jornada
                </button>
              } @else {
                <p class="text-gray-400 dark:text-gray-500 text-sm py-2 text-center">
                  Hoy no es un día laboral.
                </p>
              }
            }

            @if (jornada.estadoActual() === 'activa') {
              <button class="btn-warning px-7 py-3 shadow-md hover:shadow-lg transition-shadow"
                      (click)="pausar()" [disabled]="loading()">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Pausar
              </button>
              <button class="btn-danger px-7 py-3 shadow-md hover:shadow-lg transition-shadow"
                      (click)="showFinalizar.set(true)" [disabled]="loading()">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
                </svg>
                Finalizar
              </button>
            }

            @if (jornada.estadoActual() === 'pausada') {
              <button class="btn-success px-7 py-3 shadow-md hover:shadow-lg transition-shadow"
                      (click)="reanudar()" [disabled]="loading()">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Reanudar
              </button>
              <button class="btn-danger px-7 py-3 shadow-md hover:shadow-lg transition-shadow"
                      (click)="showFinalizar.set(true)" [disabled]="loading()">
                Finalizar Jornada
              </button>
            }

            @if (jornada.estadoActual() === 'finalizada') {
              <p class="text-gray-400 dark:text-gray-500 text-sm py-2">Jornada finalizada. Hasta mañana.</p>
            }
          </div>
        </div>
      </div>

      <!-- Tarjetas de estadísticas -->
      @if (jornada.jornadaActiva()) {
        <div class="grid grid-cols-3 gap-3">
          <!-- Tiempo total -->
          <div class="card p-4 text-center group hover:shadow-md transition-shadow">
            <div class="flex justify-center mb-2">
              <div class="rounded-full p-2 bg-blue-50 dark:bg-blue-900/20">
                <svg class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <p class="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
              {{ formatDuration(duracionTotalMin()) }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium uppercase tracking-wide">Tiempo total</p>
          </div>

          <!-- En pausa -->
          <div class="card p-4 text-center group hover:shadow-md transition-shadow">
            <div class="flex justify-center mb-2">
              <div class="rounded-full p-2 bg-amber-50 dark:bg-amber-900/20">
                <svg class="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <p class="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {{ formatDuration(pausasMin()) }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium uppercase tracking-wide">En pausa</p>
          </div>

          <!-- Actividades -->
          <div class="card p-4 text-center group hover:shadow-md transition-shadow">
            <div class="flex justify-center mb-2">
              <div class="rounded-full p-2 bg-emerald-50 dark:bg-emerald-900/20">
                <svg class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
            </div>
            <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {{ actividadesCount() }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium uppercase tracking-wide">Actividades</p>
          </div>
        </div>
      }

      <!-- Error -->
      @if (errorMsg()) {
        <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {{ errorMsg() }}
        </div>
      }
    </div>

    <!-- Modal Finalizar -->
    @if (showFinalizar()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3 mb-4">
            <div class="rounded-full p-2 bg-red-100 dark:bg-red-900/30">
              <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Finalizar Jornada</h3>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">¿Estás seguro de que deseas finalizar tu jornada laboral?</p>
          <div class="mb-5">
            <label class="form-label">Observaciones (opcional)</label>
            <textarea [(ngModel)]="observaciones" rows="3" class="form-input resize-none"
                      placeholder="Ej: Terminé las tareas asignadas..."></textarea>
          </div>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" (click)="showFinalizar.set(false)">Cancelar</button>
            <button class="btn-danger flex-1" (click)="finalizar()">Finalizar</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class JornadaControlComponent {
  jornada       = inject(JornadaService);
  private inact = inject(InactividadService);

  loading       = signal(false);
  errorMsg      = signal('');
  showFinalizar = signal(false);
  observaciones = '';

  today = new Date().toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  duracionTotalMin = computed(() => Math.floor(this.jornada.segundosDesdeInicio() / 60));
  pausasMin        = computed(() => Math.floor(Math.max(0, this.jornada.segundosDesdeInicio() - this.jornada.tiempoTrabajado()) / 60));
  actividadesCount = computed(() => (this.jornada.jornadaActiva()?.actividades as any[])?.length ?? 0);

  // Anillo SVG: radio=120, circunferencia=2π*120≈753.98
  readonly RING_C = 2 * Math.PI * 120;
  private readonly WORKDAY_S = 8 * 3600; // 8 h en segundos

  ringOffset = computed(() => {
    const estado = this.jornada.estadoActual();
    if (estado === 'sin_jornada') return this.RING_C;
    const pct = Math.min(this.jornada.tiempoTrabajado() / this.WORKDAY_S, 1);
    return this.RING_C * (1 - pct);
  });

  ringColorClass() {
    const classes: Record<string, string> = {
      activa:      'text-emerald-500',
      pausada:     'text-amber-400',
      finalizada:  'text-gray-400 dark:text-gray-600',
      anulada:     'text-gray-400 dark:text-gray-600',
      sin_jornada: 'text-gray-300 dark:text-gray-700',
    };
    return classes[this.jornada.estadoActual()] ?? 'text-gray-300';
  }

  accentBarClass() {
    const classes: Record<string, string> = {
      activa:      'bg-emerald-500',
      pausada:     'bg-amber-400',
      finalizada:  'bg-gray-300 dark:bg-gray-600',
      anulada:     'bg-gray-300 dark:bg-gray-600',
      sin_jornada: 'bg-gray-200 dark:bg-gray-700',
    };
    return classes[this.jornada.estadoActual()] ?? 'bg-gray-200';
  }

  badgeClass() {
    const classes: Record<string, string> = {
      activa:      'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800',
      pausada:     'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800',
      finalizada:  'text-gray-500 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
      anulada:     'text-gray-500 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
      sin_jornada: 'text-gray-500 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
    };
    return classes[this.jornada.estadoActual()] ?? 'text-gray-500 bg-gray-100 border-gray-200';
  }

  timeClass() {
    const classes: Record<string, string> = {
      activa:      'text-emerald-600 dark:text-emerald-400',
      pausada:     'text-amber-500 dark:text-amber-400',
      finalizada:  'text-gray-400 dark:text-gray-500',
      anulada:     'text-gray-400 dark:text-gray-500',
      sin_jornada: 'text-gray-300 dark:text-gray-600',
    };
    return classes[this.jornada.estadoActual()] ?? 'text-gray-300';
  }

  subTimeClass() {
    const classes: Record<string, string> = {
      activa:      'text-emerald-500/70 dark:text-emerald-500/50',
      pausada:     'text-amber-400/70 dark:text-amber-400/50',
      finalizada:  'text-gray-400',
      anulada:     'text-gray-400',
      sin_jornada: 'text-gray-300 dark:text-gray-600',
    };
    return classes[this.jornada.estadoActual()] ?? 'text-gray-300';
  }

  estadoLabel() {
    const estado = this.jornada.estadoActual();
    if (estado === 'sin_jornada' && !this.jornada.esDiaLaboral()) return 'Día no laboral';
    const labels: Record<string, string> = {
      activa: 'Trabajando', pausada: 'En pausa', finalizada: 'Finalizada',
      anulada: 'Anulada', sin_jornada: 'Sin jornada',
    };
    return labels[estado] ?? '';
  }

  progressLabel() {
    const estado = this.jornada.estadoActual();
    if (estado === 'sin_jornada' && !this.jornada.esDiaLaboral()) return 'Día no laboral';
    if (estado === 'sin_jornada') return 'Sin jornada activa';
    const pct = Math.min(Math.round(this.jornada.tiempoTrabajado() / this.WORKDAY_S * 100), 100);
    return `${pct}% de la jornada`;
  }

  formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  formatDuration(minutes: number) {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  iniciar() {
    this.loading.set(true);
    this.jornada.iniciar().subscribe({
      next: (res) => {
        this.inact.setJornada(res.data?.id ?? null);
        this.loading.set(false);
      },
      error: (err: any) => { this.errorMsg.set(err.userMessage); this.loading.set(false); },
    });
  }

  pausar() {
    this.loading.set(true);
    this.jornada.pausar().subscribe({
      next: () => this.loading.set(false),
      error: (err: any) => { this.errorMsg.set(err.userMessage); this.loading.set(false); },
    });
  }

  reanudar() {
    this.loading.set(true);
    this.jornada.reanudar().subscribe({
      next: () => this.loading.set(false),
      error: (err: any) => { this.errorMsg.set(err.userMessage); this.loading.set(false); },
    });
  }

  finalizar() {
    this.loading.set(true);
    this.showFinalizar.set(false);
    this.jornada.finalizar(this.observaciones || undefined).subscribe({
      next: () => { this.loading.set(false); this.inact.stop(); },
      error: (err: any) => { this.errorMsg.set(err.userMessage); this.loading.set(false); },
    });
  }
}
