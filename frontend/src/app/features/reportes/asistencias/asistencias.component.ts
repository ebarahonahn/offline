import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import { UsuarioService } from '../../../core/services/usuario.service';

interface DiaDetalle {
  fecha: string;           // 'YYYY-MM-DD'
  fechaLabel: string;      // 'Lun 01 Ene'
  tipo: 'presente' | 'ausente' | 'finde';
  estado?: string;
  hora_inicio?: string;
  hora_fin?: string;
  duracion_min?: number;
  tiempo_extra_min?: number;
}

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Asistencias</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Reporte de asistencia por empleado en un período</p>
      </div>

      <!-- Filtros -->
      <div class="card p-5">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Filtros</h2>
        <form [formGroup]="filterForm" (ngSubmit)="buscar()" class="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
          <div>
            <label class="form-label">Empleado</label>
            <select formControlName="usuario_id" class="form-input">
              <option value="">Todos</option>
              @for (emp of empleadosFiltro(); track emp.id) {
                <option [value]="emp.id">{{ emp.nombre }} {{ emp.apellido }}</option>
              }
            </select>
          </div>
          <div class="sm:col-span-4 flex gap-3 flex-wrap">
            <button type="submit" class="btn-primary" [disabled]="loading()">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {{ loading() ? 'Buscando...' : 'Buscar' }}
            </button>
            <button type="button" class="btn-secondary" (click)="exportExcel()" [disabled]="!empleados().length">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Excel
            </button>
            <button type="button" class="btn-secondary" (click)="exportPDF()" [disabled]="!empleados().length">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              PDF
            </button>
          </div>
        </form>
      </div>

      <!-- Resumen global -->
      @if (empleados().length > 0) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="card p-4 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ empleados().length }}</p>
            <p class="text-xs text-gray-500 mt-1">Empleados</p>
          </div>
          <div class="card p-4 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ diasHabiles() }}</p>
            <p class="text-xs text-gray-500 mt-1">Días hábiles</p>
          </div>
          <div class="card p-4 text-center">
            <p class="text-2xl font-bold text-emerald-600">{{ totalPresentes() }}</p>
            <p class="text-xs text-gray-500 mt-1">Total asistencias</p>
          </div>
          <div class="card p-4 text-center">
            <p class="text-2xl font-bold" [class]="totalAusentes() > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'">{{ totalAusentes() }}</p>
            <p class="text-xs text-gray-500 mt-1">Total ausencias</p>
          </div>
        </div>

        <!-- Tabla -->
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Detalle por empleado</h2>
            <span class="text-sm text-gray-500">{{ empleados().length }} empleados</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Presentes</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ausentes</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Días hábiles</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-44">% Asistencia</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total horas</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-amber-500 uppercase">Tiempo extra</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Detalle</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (emp of empleados(); track emp.email) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ emp.empleado }}</td>
                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ emp.departamento || 'N/A' }}</td>
                    <td class="px-4 py-3 text-center font-semibold text-emerald-600">{{ emp.dias_presentes }}</td>
                    <td class="px-4 py-3 text-center font-semibold" [class]="emp.dias_ausentes > 0 ? 'text-red-500' : 'text-gray-400'">
                      {{ emp.dias_ausentes }}
                    </td>
                    <td class="px-4 py-3 text-center text-gray-500">{{ emp.dias_habiles }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                               [style.width.%]="emp.porcentaje"
                               [class]="barColor(emp.porcentaje)">
                          </div>
                        </div>
                        <span class="text-xs font-semibold w-10 text-right" [class]="pctColor(emp.porcentaje)">
                          {{ emp.porcentaje }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{{ formatHoras(emp.total_min) }}</td>
                    <td class="px-4 py-3 text-center font-semibold"
                        [class]="emp.total_extra_min > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'">
                      {{ emp.total_extra_min > 0 ? formatHoras(emp.total_extra_min) : '—' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <button (click)="verDetalle(emp)"
                              class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40 transition-colors">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Ver días
                      </button>
                    </td>
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
    </div>

    <!-- Modal detalle de empleado -->
    @if (empDetalle()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
           (click)="empDetalle.set(null)">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
             (click)="$event.stopPropagation()">

          <!-- Cabecera modal -->
          <div class="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ empDetalle()!.empleado }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {{ empDetalle()!.departamento || 'Sin departamento' }}
                &nbsp;·&nbsp;
                {{ filterForm.value.fecha_inicio }} al {{ filterForm.value.fecha_fin }}
              </p>
            </div>
            <button (click)="empDetalle.set(null)"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Badges resumen -->
          <div class="flex gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex-wrap">
            <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {{ empDetalle()!.dias_presentes }} días presentes
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  [class]="empDetalle()!.dias_ausentes > 0
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
              <span class="h-1.5 w-1.5 rounded-full"
                    [class]="empDetalle()!.dias_ausentes > 0 ? 'bg-red-500' : 'bg-gray-400'"></span>
              {{ empDetalle()!.dias_ausentes }} días ausentes
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {{ empDetalle()!.porcentaje }}% asistencia
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              {{ formatHoras(empDetalle()!.total_min) }} trabajadas
            </span>
            @if (empDetalle()!.total_extra_min > 0) {
              <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                +{{ formatHoras(empDetalle()!.total_extra_min) }} extra
              </span>
            }
          </div>

          <!-- Lista de días -->
          <div class="overflow-y-auto flex-1">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th class="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th class="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th class="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Hora inicio</th>
                  <th class="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Hora fin</th>
                  <th class="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Duración</th>
                  <th class="px-4 py-2.5 text-center text-xs font-medium text-amber-500 uppercase">Tiempo extra</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                @for (dia of diasDetalle(); track dia.fecha) {
                  <tr [class]="dia.tipo === 'finde' ? 'bg-gray-50/60 dark:bg-gray-800/30' : ''">
                    <td class="px-5 py-2.5 font-medium"
                        [class]="dia.tipo === 'finde' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'">
                      {{ dia.fechaLabel }}
                    </td>
                    <td class="px-4 py-2.5 text-center">
                      @if (dia.tipo === 'presente') {
                        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                              [class]="estadoBadge(dia.estado!)">
                          {{ dia.estado }}
                        </span>
                      } @else if (dia.tipo === 'ausente') {
                        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                          Ausente
                        </span>
                      } @else {
                        <span class="text-xs text-gray-400 dark:text-gray-600">Fin de semana</span>
                      }
                    </td>
                    <td class="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300 font-mono text-xs">
                      {{ dia.hora_inicio ? fmtHora(dia.hora_inicio) : '—' }}
                    </td>
                    <td class="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300 font-mono text-xs">
                      {{ dia.hora_fin ? fmtHora(dia.hora_fin) : '—' }}
                    </td>
                    <td class="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300 text-xs">
                      {{ dia.duracion_min ? formatHoras(dia.duracion_min) : '—' }}
                    </td>
                    <td class="px-4 py-2.5 text-center text-xs font-semibold"
                        [class]="dia.tiempo_extra_min && dia.tiempo_extra_min > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ dia.tiempo_extra_min && dia.tiempo_extra_min > 0 ? '+' + formatHoras(dia.tiempo_extra_min) : '—' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0 flex items-center justify-between gap-3">
            <div class="flex gap-2">
              <button (click)="exportDetalleExcel()" [disabled]="exportandoDetalle()"
                      class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 transition-colors disabled:opacity-50">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Excel
              </button>
              <button (click)="exportDetallePDF()" [disabled]="exportandoDetalle()"
                      class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors disabled:opacity-50">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                PDF
              </button>
            </div>
            <button (click)="empDetalle.set(null)" class="btn-secondary text-sm">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AsistenciasComponent implements OnInit {
  private rs = inject(ReporteService);
  private us = inject(UsuarioService);
  private fb = inject(FormBuilder);

  empleados       = signal<any[]>([]);
  diasHabiles     = signal(0);
  departamentos   = signal<any[]>([]);
  empleadosFiltro = signal<any[]>([]);
  loading         = signal(false);
  searched        = signal(false);
  empDetalle        = signal<any | null>(null);
  diasDetalle       = signal<DiaDetalle[]>([]);
  exportandoDetalle = signal(false);

  totalPresentes = () => this.empleados().reduce((s, e) => s + e.dias_presentes, 0);
  totalAusentes  = () => this.empleados().reduce((s, e) => s + e.dias_ausentes, 0);

  filterForm = this.fb.group({
    fecha_inicio:    [this.firstDayOfMonth()],
    fecha_fin:       [this.today()],
    departamento_id: [''],
    usuario_id:      [''],
  });

  ngOnInit() {
    this.us.getDepartamentos().subscribe(r => { if (r.success) this.departamentos.set(r.data); });
    this.us.getAll({ limit: 500, estado: 'activo' }).subscribe(r => {
      if (r.success) this.empleadosFiltro.set(r.data);
    });
  }

  buscar() {
    this.loading.set(true);
    this.searched.set(true);
    const params = this.filterForm.value;
    this.rs.getAsistencias(params).subscribe({
      next: r => {
        if (r.success) {
          this.empleados.set(r.data.empleados);
          this.diasHabiles.set(r.data.dias_habiles);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  verDetalle(emp: any) {
    this.empDetalle.set(emp);
    const fi = this.filterForm.value.fecha_inicio!;
    const ff = this.filterForm.value.fecha_fin!;

    // Índice de jornadas por fecha (YYYY-MM-DD) — normalizar sin depender de UTC
    const jornadasIdx: Record<string, any> = {};
    for (const j of emp.jornadas) {
      const raw = j.fecha;
      let key: string;
      if (raw instanceof Date) {
        const yy = raw.getFullYear(), mm = String(raw.getMonth()+1).padStart(2,'0'), dd = String(raw.getDate()).padStart(2,'0');
        key = `${yy}-${mm}-${dd}`;
      } else {
        key = String(raw).slice(0, 10);
      }
      jornadasIdx[key] = j;
    }

    const dias: DiaDetalle[] = [];
    // Parsear con T12:00:00 para evitar que el ajuste UTC cambie el día
    const start = new Date(fi + 'T12:00:00');
    const end   = new Date(ff + 'T12:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const yy  = d.getFullYear();
      const mm  = String(d.getMonth() + 1).padStart(2, '0');
      const dd  = String(d.getDate()).padStart(2, '0');
      const key  = `${yy}-${mm}-${dd}`;
      const dow  = d.getDay(); // 0=Dom, 6=Sáb
      const label = `${DIAS_ES[dow]} ${dd} ${MESES_ES[d.getMonth()]}`;

      if (jornadasIdx[key]) {
        const j = jornadasIdx[key];
        dias.push({
          fecha: key, fechaLabel: label, tipo: 'presente',
          estado: j.estado,
          hora_inicio: j.hora_inicio,
          hora_fin: j.hora_fin,
          duracion_min: j.duracion_min,
          tiempo_extra_min: j.tiempo_extra_min || 0,
        });
      } else if (dow === 0 || dow === 6) {
        dias.push({ fecha: key, fechaLabel: label, tipo: 'finde' });
      } else {
        dias.push({ fecha: key, fechaLabel: label, tipo: 'ausente' });
      }
    }

    this.diasDetalle.set(dias);
  }

  exportDetalleExcel() {
    const emp = this.empDetalle();
    if (!emp) return;
    const fi = this.filterForm.value.fecha_inicio!;
    const ff = this.filterForm.value.fecha_fin!;
    this.exportandoDetalle.set(true);
    this.rs.exportDetalleExcel({ usuario_id: emp.id, fecha_inicio: fi, fecha_fin: ff }).subscribe({
      next: r => { this.rs.downloadBlob(r, `detalle_${emp.empleado}_${fi}_${ff}.xlsx`); this.exportandoDetalle.set(false); },
      error: () => this.exportandoDetalle.set(false),
    });
  }

  exportDetallePDF() {
    const emp = this.empDetalle();
    if (!emp) return;
    const fi = this.filterForm.value.fecha_inicio!;
    const ff = this.filterForm.value.fecha_fin!;
    this.exportandoDetalle.set(true);
    this.rs.exportDetallePDF({ usuario_id: emp.id, fecha_inicio: fi, fecha_fin: ff }).subscribe({
      next: r => { this.rs.downloadBlob(r, `detalle_${emp.empleado}_${fi}_${ff}.pdf`); this.exportandoDetalle.set(false); },
      error: () => this.exportandoDetalle.set(false),
    });
  }

  exportExcel() {
    const params = this.filterForm.value;
    const fi = params.fecha_inicio!, ff = params.fecha_fin!;
    this.rs.exportAsistenciasExcel(params).subscribe(r => this.rs.downloadBlob(r, `asistencias_${fi}_${ff}.xlsx`));
  }

  exportPDF() {
    const params = this.filterForm.value;
    const fi = params.fecha_inicio!, ff = params.fecha_fin!;
    this.rs.exportAsistenciasPDF(params).subscribe(r => this.rs.downloadBlob(r, `asistencias_${fi}_${ff}.pdf`));
  }

  estadoBadge(estado: string) {
    return {
      finalizada: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
      activa:     'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      pausada:    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    }[estado] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }

  fmtHora(dt: string) {
    return new Date(dt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  barColor(pct: number) {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 70) return 'bg-amber-400';
    return 'bg-red-500';
  }

  pctColor(pct: number) {
    if (pct >= 90) return 'text-emerald-600';
    if (pct >= 70) return 'text-amber-500';
    return 'text-red-500';
  }

  formatHoras(min: number) {
    if (!min) return '-';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private today() { return new Date().toISOString().slice(0, 10); }
  private firstDayOfMonth() {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  }
}
