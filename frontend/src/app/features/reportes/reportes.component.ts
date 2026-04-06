import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReporteService } from '../../core/services/reporte.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { JornadaService } from '../../core/services/jornada.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reportes</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Genera y exporta reportes de productividad</p>
      </div>

      <!-- Filtros -->
      <div class="card p-5">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Filtros</h2>
        <form [formGroup]="filterForm" (ngSubmit)="buscar()" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="form-label">Fecha inicio *</label>
            <input type="date" formControlName="fecha_inicio" class="form-input">
          </div>
          <div>
            <label class="form-label">Fecha fin *</label>
            <input type="date" formControlName="fecha_fin" class="form-input">
          </div>
          <div>
            <label class="form-label">Departamento</label>
            <select formControlName="departamento_id" class="form-input">
              <option value="">Todos</option>
              @for (dep of departamentos(); track dep.id) {
                <option [value]="dep.id">{{ dep.nombre }}</option>
              }
            </select>
          </div>
          <div class="sm:col-span-3 flex gap-3">
            <button type="submit" class="btn-primary" [disabled]="loading()">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {{ loading() ? 'Buscando...' : 'Buscar' }}
            </button>
            <button type="button" class="btn-secondary" (click)="exportExcel()" [disabled]="!data().length">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Excel
            </button>
            <button type="button" class="btn-secondary" (click)="exportPDF()" [disabled]="!data().length">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              PDF
            </button>
          </div>
        </form>
      </div>

      <!-- Resultados -->
      @if (data().length > 0) {
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Resultados</h2>
            <span class="text-sm text-gray-500">{{ data().length }} registros</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trabajado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pausas</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actividades</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  @if (isAdmin()) {
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (row of data(); track $index) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ row.empleado }}</td>
                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ row.departamento || 'N/A' }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ row.fecha }}</td>
                    <td class="px-4 py-3 font-medium text-emerald-600">{{ formatDuration(row.duracion_min) }}</td>
                    <td class="px-4 py-3 text-amber-600">{{ formatDuration(row.pausas_min) }}</td>
                    <td class="px-4 py-3 text-gray-600">{{ row.total_actividades }}</td>
                    <td class="px-4 py-3">
                      <span [class]="estadoClass(row.estado)">{{ row.estado }}</span>
                    </td>
                    @if (isAdmin()) {
                      <td class="px-4 py-3">
                        @if (row.estado === 'finalizada') {
                          <button
                            class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 disabled:opacity-40"
                            [disabled]="reactivando() === row.id"
                            (click)="pedirConfirmacion(row)"
                            title="Reactivar jornada finalizada incorrectamente">
                            @if (reactivando() === row.id) {
                              <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                              </svg>
                            } @else {
                              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                              </svg>
                            }
                            Reactivar
                          </button>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else if (searched()) {
        <div class="card p-12 text-center text-gray-400">
          <p class="text-lg">Sin resultados para el período seleccionado</p>
        </div>
      }

      <!-- Error reactivar -->
      @if (errorReactivar()) {
        <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {{ errorReactivar() }}
        </div>
      }
    </div>

    <!-- Modal confirmación reactivar -->
    @if (jornadaAReactivar()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="card p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3 mb-4">
            <div class="rounded-full p-2 bg-amber-100 dark:bg-amber-900/30">
              <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Reactivar Jornada</h3>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            ¿Estás seguro de que deseas reactivar la jornada de:
          </p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {{ jornadaAReactivar()!.empleado }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Fecha: {{ jornadaAReactivar()!.fecha }}
          </p>
          <p class="text-xs text-amber-600 dark:text-amber-400 mb-5">
            El empleado podrá continuar registrando tiempo en esta jornada.
          </p>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" (click)="jornadaAReactivar.set(null)">Cancelar</button>
            <button class="btn-primary flex-1" (click)="confirmarReactivar()">Reactivar</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ReportesComponent implements OnInit {
  private rs      = inject(ReporteService);
  private us      = inject(UsuarioService);
  private fb      = inject(FormBuilder);
  private js      = inject(JornadaService);
  private auth    = inject(AuthService);

  data          = signal<any[]>([]);
  departamentos = signal<any[]>([]);
  loading       = signal(false);
  searched      = signal(false);
  reactivando        = signal<number | null>(null);
  isAdmin            = computed(() => this.auth.hasRole('admin'));
  jornadaAReactivar  = signal<any | null>(null);
  errorReactivar     = signal('');

  filterForm = this.fb.group({
    fecha_inicio:    [this.firstDayOfMonth()],
    fecha_fin:       [this.today()],
    departamento_id: [''],
  });

  ngOnInit() {
    this.us.getDepartamentos().subscribe(r => { if (r.success) this.departamentos.set(r.data); });
  }

  buscar() {
    this.loading.set(true);
    this.searched.set(true);
    const params = this.filterForm.value;
    this.rs.getJornadas(params).subscribe(r => {
      if (r.success) this.data.set(r.data);
      this.loading.set(false);
    });
  }

  exportExcel() {
    const params = this.filterForm.value;
    const fi = params.fecha_inicio!, ff = params.fecha_fin!;
    this.rs.exportExcel(params).subscribe(r => this.rs.downloadBlob(r, `jornadas_${fi}_${ff}.xlsx`));
  }

  exportPDF() {
    const params = this.filterForm.value;
    const fi = params.fecha_inicio!, ff = params.fecha_fin!;
    this.rs.exportPDF(params).subscribe(r => this.rs.downloadBlob(r, `jornadas_${fi}_${ff}.pdf`));
  }

  pedirConfirmacion(row: any) {
    this.errorReactivar.set('');
    this.jornadaAReactivar.set(row);
  }

  confirmarReactivar() {
    const row = this.jornadaAReactivar();
    if (!row) return;
    this.jornadaAReactivar.set(null);
    this.reactivando.set(row.id);
    this.js.reactivar(row.id).subscribe({
      next: () => {
        this.data.update(list => list.map(r => r.id === row.id ? { ...r, estado: 'activa', hora_fin: null } : r));
        this.reactivando.set(null);
      },
      error: (err: any) => {
        this.reactivando.set(null);
        this.errorReactivar.set(err?.error?.message ?? 'Error al reactivar la jornada');
      },
    });
  }

  formatDuration(min?: number) {
    if (!min) return '-';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  estadoClass(estado: string) {
    return { finalizada: 'badge-activo', activa: 'badge-pausado', pausada: 'badge-pausado' }[estado] ?? 'badge-finalizado';
  }

  private today() { return new Date().toISOString().slice(0, 10); }
  private firstDayOfMonth() {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  }
}
