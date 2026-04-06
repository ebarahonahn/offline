import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { JornadaService } from '../../../core/services/jornada.service';
import { ActividadService } from '../../../core/services/actividad.service';

@Component({
  selector: 'app-jornada-reporte',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    @media print {
      :host { display: block; }
      .no-print { display: none !important; }
      .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
      body { background: white !important; }
      .print-break { page-break-before: always; }
      img { max-height: 120px; object-fit: cover; }
    }
  `],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between no-print">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reporte de Jornada</h1>
          @if (reporte()) {
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ reporte()!.jornada.nombre }} {{ reporte()!.jornada.apellido }}
              · {{ formatFecha(reporte()!.jornada.fecha) }}
            </p>
          }
        </div>
        <div class="flex gap-2">
          @if (reporte()) {
            <button (click)="exportarPDF()" [disabled]="exportando()"
                    class="btn-primary flex items-center gap-2 disabled:opacity-60">
              @if (exportando()) {
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Generando...
              } @else {
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Exportar PDF
              }
            </button>
          }
          <a routerLink="/jornadas" class="btn-secondary">Volver</a>
        </div>
      </div>

      @if (!reporte() && !error()) {
        <div class="text-center py-12">
          <svg class="animate-spin h-8 w-8 mx-auto text-primary-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-500 dark:text-gray-400">Cargando reporte...</p>
        </div>
      }

      @if (error()) {
        <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      @if (reporte()) {
        <!-- Encabezado impreso (solo visible al imprimir) -->
        <div class="hidden print:block mb-6">
          <h1 class="text-xl font-bold">Reporte de Jornada</h1>
          <p class="text-sm text-gray-600">
            {{ reporte()!.jornada.nombre }} {{ reporte()!.jornada.apellido }}
            · {{ formatFecha(reporte()!.jornada.fecha) }}
          </p>
        </div>

        <!-- Resumen -->
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="card p-4">
            <p class="text-xs text-gray-500 mb-1">Hora inicio</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatHora(reporte()!.jornada.hora_inicio) }}
            </p>
          </div>
          <div class="card p-4">
            <p class="text-xs text-gray-500 mb-1">Hora fin</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ reporte()!.jornada.hora_fin ? formatHora(reporte()!.jornada.hora_fin) : '-' }}
            </p>
          </div>
          <div class="card p-4">
            <p class="text-xs text-gray-500 mb-1">Estado</p>
            <span [class]="estadoClass(reporte()!.jornada.estado)">{{ reporte()!.jornada.estado }}</span>
          </div>
          <div class="card p-4">
            <p class="text-xs text-gray-500 mb-1">Duración</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatDuration(reporte()!.jornada.duracion_total_min) }}
            </p>
          </div>
        </div>

        <!-- Actividades -->
        @if (reporte()!.actividades?.length > 0) {
          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Actividades ({{ reporte()!.actividades.length }})
            </h2>
            <div class="space-y-3">
              @for (act of reporte()!.actividades; track act.id) {
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div class="flex items-start justify-between mb-1">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">{{ act.nombre }}</p>
                      @if (act.tipo_nombre) {
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white mt-1"
                              [style.background-color]="act.color_hex">
                          {{ act.tipo_nombre }}
                        </span>
                      }
                    </div>
                    <span [class]="estadoClass(act.estado)">{{ act.estado }}</span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {{ formatHora(act.hora_inicio) }} - {{ act.hora_fin ? formatHora(act.hora_fin) : '-' }}
                    · {{ formatDuration(act.tiempo_min) }}
                  </p>
                  @if (act.descripcion) {
                    <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ act.descripcion }}</p>
                  }
                  @if (act.evidencias?.length > 0) {
                    <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-3">
                      <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Evidencias ({{ act.evidencias.length }})
                      </p>
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        @for (ev of act.evidencias; track ev.id) {
                          <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer"
                               (click)="abrirEvidencia(ev)">
                            @if (isImage(ev.archivo_url)) {
                              <img [src]="urlEvidencia(ev.archivo_url)" [alt]="ev.nombre"
                                   class="w-full h-20 object-cover">
                            } @else {
                              <div class="w-full h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                <span class="text-xs font-bold uppercase text-gray-500">{{ fileExt(ev.archivo_url) }}</span>
                              </div>
                            }
                            <p class="text-xs text-gray-500 px-2 py-1 truncate">{{ ev.nombre }}</p>
                            @if (ev.descripcion) {
                              <p class="text-xs text-gray-400 px-2 pb-1 truncate">{{ ev.descripcion }}</p>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Capturas de pantalla -->
        @if (reporte()!.capturas?.length > 0) {
          <div class="card p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Capturas de Pantalla ({{ reporte()!.capturas.length }})
            </h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              @for (cap of reporte()!.capturas; track cap.id) {
                <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                     (click)="abrirCaptura(cap)">
                  <img [src]="urlCaptura(cap.ruta_archivo)" alt="Captura"
                       class="w-full h-32 object-cover">
                  <div class="p-2">
                    <p class="text-xs text-gray-600 dark:text-gray-400">{{ formatHora(cap.capturado_en) }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Pausas e inactividades en grid -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          @if (reporte()!.pausas?.length > 0) {
            <div class="card p-6">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Pausas ({{ reporte()!.pausas.length }})
              </h2>
              <div class="space-y-2">
                @for (pausa of reporte()!.pausas; track pausa.id) {
                  <div class="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div>
                      <p class="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {{ pausa.tipo }} · {{ formatDuration(pausa.duracion_min) }}
                      </p>
                      @if (pausa.motivo) {
                        <p class="text-xs text-amber-600 dark:text-amber-500">{{ pausa.motivo }}</p>
                      }
                    </div>
                    <p class="text-xs text-amber-600 dark:text-amber-500 font-mono">
                      {{ formatHora(pausa.hora_inicio) }}-{{ pausa.hora_fin ? formatHora(pausa.hora_fin) : '...' }}
                    </p>
                  </div>
                }
              </div>
            </div>
          }

          @if (reporte()!.inactividades?.length > 0) {
            <div class="card p-6">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Inactividades ({{ reporte()!.inactividades.length }})
              </h2>
              <div class="space-y-2">
                @for (inac of reporte()!.inactividades; track inac.id) {
                  <div class="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p class="text-sm font-medium text-red-700 dark:text-red-400">
                      {{ formatDuration(inac.tiempo_min) }}
                    </p>
                    <p class="text-xs text-red-600 dark:text-red-500 font-mono">
                      {{ formatHora(inac.hora_inicio) }}-{{ inac.hora_fin ? formatHora(inac.hora_fin) : '...' }}
                    </p>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class JornadaReporteComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private jornadaService = inject(JornadaService);
  private http           = inject(HttpClient);
  actividadService       = inject(ActividadService);

  reporte      = signal<any>(null);
  error        = signal('');
  exportando   = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.jornadaService.getReporte(parseInt(id, 10)).subscribe({
        next: (r) => { if (r.success) this.reporte.set(r.data); },
        error: (err) => this.error.set(err.error?.message ?? 'Error al cargar el reporte'),
      });
    }
  }

  exportarPDF() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.exportando.set(true);
    this.http.get(this.jornadaService.getReportePDFUrl(parseInt(id, 10)), { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const j    = this.reporte()?.jornada;
          link.href     = url;
          link.download = j ? `${j.apellido}_${j.nombre}_${String(j.fecha).slice(0,10)}.pdf` : 'reporte.pdf';
          link.click();
          URL.revokeObjectURL(url);
          this.exportando.set(false);
        },
        error: () => { this.error.set('Error al generar el PDF'); this.exportando.set(false); },
      });
  }

  urlCaptura(ruta: string): string {
    return this.actividadService.urlEvidencia(ruta);
  }

  urlEvidencia(ruta: string): string {
    return this.actividadService.urlEvidencia(ruta);
  }

  abrirCaptura(cap: any) {
    window.open(this.urlCaptura(cap.ruta_archivo), '_blank');
  }

  abrirEvidencia(ev: any) {
    window.open(this.urlEvidencia(ev.archivo_url), '_blank');
  }

  isImage(url: string): boolean {
    return /\.(png|jpe?g|webp)$/i.test(url);
  }

  fileExt(url: string): string {
    return url.split('.').pop()?.toUpperCase() ?? 'FILE';
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      activa: 'badge-activo', pausada: 'badge-pausado',
      completada: 'badge-activo', en_progreso: 'badge-pausado',
      cancelada: 'badge-inactivo', finalizada: 'badge-finalizado',
    };
    return map[estado] ?? 'badge-finalizado';
  }

  formatDuration(minutes?: number): string {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '-';
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatHora(hora: any): string {
    if (!hora) return '-';
    const d = typeof hora === 'string' ? new Date(hora) : hora;
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }
}
